# Function to log start of a operation
step_log() {
  message=$1
  printf "\n\033[90;1m==> \033[0m\033[37;1m%s\033[0m\n" "$message"
}

# Function to log result of a operation
add_log() {
  mark=$1
  subject=$2
  message=$3
  if [ "$mark" = "$tick" ]; then
    printf "\033[32;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s\033[0m\n" "$mark" "$subject" "$message"
  else
    printf "\033[31;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s\033[0m\n" "$mark" "$subject" "$message"
  fi
}

# Function to backup and cleanup package lists.
cleanup_lists() {
  ppa_prefix=${1-ondrej}
  if [ ! -e /etc/apt/sources.list.d.save ]; then
    sudo mv /etc/apt/sources.list.d /etc/apt/sources.list.d.save
    sudo mkdir /etc/apt/sources.list.d
    sudo mv /etc/apt/sources.list.d.save/*"${ppa_prefix}"*.list /etc/apt/sources.list.d/
    trap "sudo mv /etc/apt/sources.list.d.save/*.list /etc/apt/sources.list.d/ 2>/dev/null" exit
  fi
}

# Function to add ppa:ondrej/php.
add_ppa() {
  ppa=${1:-ondrej/php}
  if [ "$DISTRIB_RELEASE" = "16.04" ] && [ "$ppa" = "ondrej/php" ]; then
    LC_ALL=C.UTF-8 sudo apt-add-repository --remove ppa:"$ppa" -y || true
    LC_ALL=C.UTF-8 sudo apt-add-repository http://setup-php.com/ondrej/php/ubuntu -y
    sudo apt-key adv --keyserver keyserver.ubuntu.com --recv 4f4ea0aae5267a6c
  elif ! apt-cache policy | grep -q "$ppa"; then
    cleanup_lists "$(dirname "$ppa")"
    LC_ALL=C.UTF-8 sudo apt-add-repository ppa:"$ppa" -y
  fi

  if [ "$DISTRIB_RELEASE" = "16.04" ]; then
    sudo "$debconf_fix" apt-get update
  fi
}

# Function to update the package lists.
update_lists() {
  if [ ! -e /tmp/setup_php ]; then
    add_ppa ondrej/php 
    cleanup_lists
    sudo "$debconf_fix" apt-get update 
    echo '' | sudo tee /tmp/setup_php 
  fi
}

# Function to configure PECL
configure_pecl() {
  if ! [ -e /tmp/pecl_config ]; then
    if ! command -v pecl >/dev/null || ! command -v pear >/dev/null; then
      add_pecl 
    fi
    for script in pear pecl; do
      sudo "$script" config-set php_ini "${pecl_file:-$ini_file}" 
      sudo "$script" channel-update "$script".php.net 
    done
    echo '' | sudo tee /tmp/pecl_config 
  fi
}

# Function to get the PECL version
get_pecl_version() {
  extension=$1
  stability="$(echo "$2" | grep -m 1 -Eio "(alpha|beta|rc|snapshot|preview)")"
  pecl_rest='https://pecl.php.net/rest/r/'
  response=$(curl "${curl_opts[@]}" "$pecl_rest$extension"/allreleases.xml)
  pecl_version=$(echo "$response" | grep -m 1 -Eio "([0-9]+\.[0-9]+\.[0-9]+${stability}[0-9]+)")
  if [ ! "$pecl_version" ]; then
    pecl_version=$(echo "$response" | grep -m 1 -Eo "([0-9]+\.[0-9]+\.[0-9]+)")
  fi
  echo "$pecl_version"
}

# Function to install PECL extensions and accept default options
pecl_install() {
  local extension=$1
  yes '' | sudo pecl install -f "$extension" 
}

# Function to enable existing extensions.
enable_extension() {
  sudo find /var/lib/php/modules/"$version" -path "*disabled*$1" -delete
  if ! check_extension "$1" && [ -e "$ext_dir/$1.so" ]; then
    echo "$2=$ext_dir/$1.so" | sudo tee -a "$pecl_file" >/dev/null
  fi
}

# Function to test if extension is loaded
check_extension() {
  extension=$1
  if [ "$extension" != "mysql" ]; then
    php -m | grep -i -q -w "$extension"
  else
    php -m | grep -i -q "$extension"
  fi
}

# Function to delete extensions
delete_extension() {
  extension=$1
  sudo sed -Ei "/=(.*\/)?\"?$extension/d" "$ini_file"
  sudo sed -Ei "/=(.*\/)?\"?$extension/d" "$pecl_file"
  sudo rm -rf "$scan_dir"/*"$extension"* 
  sudo rm -rf "$ext_dir"/"$extension".so 
  sudo sed -i "/Package: php$version-$extension/,/^$/d" /var/lib/dpkg/status
}

# Function to disable and delete extensions
remove_extension() {
  extension=$1
  if [ -e /etc/php/"$version"/mods-available/"$extension".ini ]; then
    sudo phpdismod -v "$version" "$extension"
  fi
  delete_extension "$extension"
}

# Function to setup extensions
add_extension() {
  extension=$1
  install_command=$2
  prefix=$3
  enable_extension "$extension" "$prefix"
  if check_extension "$extension"; then
    add_log "$tick" "$extension" "Enabled"
  elif ! check_extension "$extension"; then
    eval "$install_command"  ||
    (update_lists && eval "$install_command" ) || pecl_install "$extension"
    (check_extension "$extension" && add_log "$tick" "$extension" "Installed and enabled") ||
    add_log "$cross" "$extension" "Could not install $extension on PHP $semver"
  fi
  sudo chmod 777 "$ini_file"
}

# Function to install a PECL version
add_pecl_extension() {
  extension=$1
  pecl_version=$2
  prefix=$3
  configure_pecl
  if [[ $pecl_version =~ .*(alpha|beta|rc|snapshot|preview).* ]]; then
    pecl_version=$(get_pecl_version "$extension" "$pecl_version")
  fi
  enable_extension "$extension" "$prefix"
  ext_version=$(php -r "echo phpversion('$extension');")
  if [ "$ext_version" = "$pecl_version" ]; then
    add_log "$tick" "$extension" "Enabled"
  else
    delete_extension "$extension"
    (
      sudo pecl install -f "$extension-$pecl_version"  &&
      check_extension "$extension" &&
      add_log "$tick" "$extension" "Installed and enabled"
    ) || add_log "$cross" "$extension" "Could not install $extension-$pecl_version on PHP $semver"
  fi
}

# Function to pre-release extensions using PECL
add_unstable_extension() {
  extension=$1
  stability=$2
  prefix=$3
  pecl_version=$(get_pecl_version "$extension" "$stability")
  add_pecl_extension "$extension" "$pecl_version" "$prefix"
}

# Function to configure composer
configure_composer() {
  tool_path=$1
  sudo ln -sf "$tool_path" "$tool_path.phar"
  php -r "try {\$p=new Phar('$tool_path.phar', 0);exit(0);} catch(Exception \$e) {exit(1);}"
  if [ $? -eq 1 ]; then
    add_log "$cross" "composer" "Could not download composer"
    exit 1;
  fi
  if ! [ -e "$composer_json" ]; then
    sudo mkdir -p "$(dirname "$composer_json")"
    echo '{}' | tee "$composer_json" 
    sudo chmod 644 "$composer_json"
  fi
  composer -q config -g process-timeout 0
  echo "$composer_bin" >> "$GITHUB_PATH"
  if [ -n "$COMPOSER_TOKEN" ]; then
    composer -q config -g github-oauth.github.com "$COMPOSER_TOKEN"
  fi
}

# Function to setup a remote tool.
add_tool() {
  url=$1
  tool=$2
  tool_path="$tool_path_dir/$tool"
  if [ ! -e "$tool_path" ]; then
    rm -rf "$tool_path"
  fi
  if [ "$tool" = "composer" ]; then
    IFS="," read -r -a urls <<< "$url"
    status_code=$(sudo curl -f -w "%{http_code}" -o "$tool_path" "${curl_opts[@]}" "${urls[0]}") ||
    status_code=$(sudo curl -w "%{http_code}" -o "$tool_path" "${curl_opts[@]}" "${urls[1]}")
  else
    status_code=$(sudo curl -w "%{http_code}" -o "$tool_path" "${curl_opts[@]}" "$url")
  fi
  if [ "$status_code" != "200" ] && [[ "$url" =~ .*github.com.*releases.*latest.* ]]; then
    url="${url//releases\/latest\/download/releases/download/$(curl "${curl_opts[@]}" "$(echo "$url" | cut -d '/' -f '1-5')/releases" | grep -Eo -m 1 "([0-9]+\.[0-9]+\.[0-9]+)/$(echo "$url" | sed -e "s/.*\///")" | cut -d '/' -f 1)}"
    status_code=$(sudo curl -w "%{http_code}" -o "$tool_path" "${curl_opts[@]}" "$url")
  fi
  if [ "$status_code" = "200" ]; then
    sudo chmod a+x "$tool_path"
    if [ "$tool" = "composer" ]; then
      configure_composer "$tool_path"
    elif [ "$tool" = "cs2pr" ]; then
      sudo sed -i 's/\r$//; s/exit(9)/exit(0)/' "$tool_path"
    elif [ "$tool" = "phive" ]; then
      add_extension curl "$apt_install php$version-curl" extension 
      add_extension mbstring "$apt_install php$version-mbstring" extension 
      add_extension xml "$apt_install php$version-xml" extension 
    fi
    add_log "$tick" "$tool" "Added"
  else
    add_log "$cross" "$tool" "Could not setup $tool"
    [ "$tool" = "composer" ] && exit 1
  fi
}

# Function to setup a tool using composer
add_composertool() {
  tool=$1
  release=$2
  prefix=$3
  (
    sudo rm -f "$composer_lock"  || true
    composer global require "$prefix$release"  &&
    add_log "$tick" "$tool" "Added"
  ) || add_log "$cross" "$tool" "Could not setup $tool"
  if [ -e "$composer_bin/composer" ]; then
    sudo cp -p "$tool_path_dir/composer" "$composer_bin"
  fi
  if [ "$tool" = "codeception" ]; then
    sudo ln -s "$composer_bin"/codecept "$composer_bin"/codeception
  fi
}

# Function to setup phpize and php-config
add_devtools() {
  if ! [ -e "/usr/bin/phpize$version" ] || ! [ -e "/usr/bin/php-config$version" ]; then
    update_lists && $apt_install php"$version"-dev php"$version"-xml 
  fi
  sudo update-alternatives --set php-config /usr/bin/php-config"$version" 
  sudo update-alternatives --set phpize /usr/bin/phpize"$version" 
  configure_pecl
}

# Function to setup the nightly build from master branch
setup_master() {
  curl "${curl_opts[@]}" https://github.com/shivammathur/php-builder/releases/latest/download/install.sh | bash -s "github"
}

add_packaged_php() {
  if [ "${use_package_cache:-true}" = "false" ]; then
    update_lists
    IFS=' ' read -r -a packages <<<"$(echo "cli curl mbstring xml intl" | sed "s/[^ ]*/php$version-&/g")"
    $apt_install "${packages[@]}"
  else
    curl "${curl_opts[@]}" https://github.com/shivammathur/php-ubuntu/releases/latest/download/install.sh | bash -s "$version"
  fi
}

# Function to setup PECL
add_pecl() {
  add_devtools
  if [ ! -e /usr/bin/pecl ]; then
    $apt_install php-pear 
  fi
  configure_pecl
  add_log "$tick" "PECL" "Added"
}

# Function to switch versions of PHP binaries
switch_version() {
  for tool in pear pecl php phar phar.phar php-cgi php-config phpize phpdbg; do
    if [ -e "/usr/bin/$tool$version" ]; then
      sudo update-alternatives --set $tool /usr/bin/"$tool$version"
    fi
  done
}

# Function to get PHP version in semver format
php_semver() {
  if [ ! "$version" = "8.0" ]; then
    php"$version" -v | head -n 1 | cut -f 2 -d ' ' | cut -f 1 -d '-'
  else
    php -v | head -n 1 | cut -f 2 -d ' '
  fi
}

# Function to configure PHP
configure_php() {
  (
    echo -e "date.timezone=UTC\nmemory_limit=-1"
    [[ "$version" =~ 8.0 ]] && echo -e "opcache.enable=1\nopcache.jit_buffer_size=256M\nopcache.jit=1235"
    [[ "$version" =~ 7.[2-4]|8.0 ]] && echo -e "xdebug.mode=coverage"
  ) | sudo tee -a "$pecl_file" >/dev/null
}

# Variables
tick="✓"
cross="✗"
version=$1
dist=$2
debconf_fix="DEBIAN_FRONTEND=noninteractive"
apt_install="sudo $debconf_fix apt-fast install -y"
tool_path_dir="/usr/local/bin"
curl_opts=(-sL)
composer_bin="$HOME/.composer/vendor/bin"
composer_json="$HOME/.composer/composer.json"
composer_lock="$HOME/.composer/composer.lock"
existing_version=$(php-config --version 2>/dev/null | cut -c 1-3)

# Setup PHP
step_log "Setup PHP"
sudo mkdir -m 777 -p "$HOME/.composer" /var/run /run/php
. /etc/lsb-release

if [ "$existing_version" != "$version" ]; then
  if [ ! -e "/usr/bin/php$version" ]; then
    if [ "$version" = "8.0" ]; then
      setup_master 
    else
      add_packaged_php 
    fi
    status="Installed"
  else
    status="Switched to"
  fi

  switch_version 
else
  status="Found"
fi

if ! command -v php"$version" >/dev/null; then
  add_log "$cross" "PHP" "Could not setup PHP $version"
  exit 1
fi
semver=$(php_semver)
scan_dir=$(php --ini | grep additional | sed -e "s|.*: s*||")
ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
ext_dir=$(php -i | grep "extension_dir => /" | sed -e "s|.*=> s*||")
pecl_file="$scan_dir"/99-pecl.ini
echo '' | sudo tee "$pecl_file" 
configure_php
sudo rm -rf /usr/local/bin/phpunit 
sudo chmod 777 "$ini_file" "$pecl_file" "$tool_path_dir"
sudo cp "$dist"/../src/configs/*.json "$RUNNER_TOOL_CACHE/"
add_log "$tick" "PHP" "$status PHP $semver"
