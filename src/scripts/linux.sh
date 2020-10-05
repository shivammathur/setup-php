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

# Function to backup and cleanup package lists
cleanup_lists() {
  if [ ! -e /etc/apt/sources.list.d.save ]; then
    sudo mv /etc/apt/sources.list.d /etc/apt/sources.list.d.save || true
    sudo mkdir /etc/apt/sources.list.d
    sudo mv /etc/apt/sources.list.d.save/*ondrej*.list /etc/apt/sources.list.d/ || true
    trap "sudo mv /etc/apt/sources.list.d.save/*.list /etc/apt/sources.list.d/" exit
  fi
}

# Function to update php ppa
update_lists() {
  if [ "$lists_updated" = "false" ]; then
    cleanup_lists >/dev/null 2>&1
    sudo "$debconf_fix" apt-get update >/dev/null 2>&1
  fi
}

# Function to configure PECL
configure_pecl() {
  if [ "$pecl_config" = "false" ] && [ -e /usr/bin/pecl ]; then
    for tool in pear pecl; do
      sudo "$tool" config-set php_ini "$pecl_file" >/dev/null 2>&1
      sudo "$tool" config-set auto_discover 1 >/dev/null 2>&1
      sudo "$tool" channel-update "$tool".php.net >/dev/null 2>&1
    done
    pecl_config="true"
  fi
}

# Fuction to get the PECL version
get_pecl_version() {
  extension=$1
  stability="$(echo "$2" | grep -m 1 -Eio "(alpha|beta|rc|snapshot)")"
  pecl_rest='https://pecl.php.net/rest/r/'
  response=$(curl "${curl_opts[@]}" "$pecl_rest$extension"/allreleases.xml)
  pecl_version=$(echo "$response" | grep -m 1 -Pio "(\d*\.\d*\.\d*$stability\d*)")
  if [ ! "$pecl_version" ]; then
    pecl_version=$(echo "$response" | grep -m 1 -Po "(\d*\.\d*\.\d*)")
  fi
  echo "$pecl_version"
}

# Function to install PECL extensions and accept default options
pecl_install() {
  local extension=$1
  yes '' | sudo pecl install -f "$extension" >/dev/null 2>&1
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
  sudo sed -i "/$extension/d" "$ini_file"
  sudo sed -i "/$extension/d" "$pecl_file"
  sudo rm -rf "$scan_dir"/*"$extension"* >/dev/null 2>&1
  sudo rm -rf "$ext_dir"/"$extension".so >/dev/null 2>&1
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
  if ! check_extension "$extension" && [ -e "$ext_dir/$extension.so" ]; then
    echo "$prefix=$extension.so" >>"$ini_file" && add_log "$tick" "$extension" "Enabled"
  elif check_extension "$extension"; then
    add_log "$tick" "$extension" "Enabled"
  elif ! check_extension "$extension"; then
    eval "$install_command" >/dev/null 2>&1 ||
    (update_lists && eval "$install_command" >/dev/null 2>&1) ||
    sudo pecl install -f "$extension" >/dev/null 2>&1
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
  if [[ $pecl_version =~ .*(alpha|beta|rc|snapshot).* ]]; then
    pecl_version=$(get_pecl_version "$extension" "$pecl_version")
  fi
  if ! check_extension "$extension" && [ -e "$ext_dir/$extension.so" ]; then
    echo "$prefix=$ext_dir/$extension.so" >>"$pecl_file"
  fi
  ext_version=$(php -r "echo phpversion('$extension');")
  if [ "$ext_version" = "$pecl_version" ]; then
    add_log "$tick" "$extension" "Enabled"
  else
    delete_extension "$extension"
    (
      sudo pecl install -f "$extension-$pecl_version" >/dev/null 2>&1 &&
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
  composer -q global config process-timeout 0
  echo "/home/$USER/.composer/vendor/bin" >> "$GITHUB_PATH"
  if [ -n "$COMPOSER_TOKEN" ]; then
    composer -q global config github-oauth.github.com "$COMPOSER_TOKEN"
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
  if [ "$status_code" = "200" ]; then
    sudo chmod a+x "$tool_path"
    if [ "$tool" = "composer" ]; then
      configure_composer "$tool_path"
    elif [ "$tool" = "cs2pr" ]; then
      sudo sed -i 's/\r$//; s/exit(9)/exit(0)/' "$tool_path"
    elif [ "$tool" = "phive" ]; then
      add_extension curl "$apt_install php$version-curl" extension >/dev/null 2>&1
      add_extension mbstring "$apt_install php$version-mbstring" extension >/dev/null 2>&1
      add_extension xml "$apt_install php$version-xml" extension >/dev/null 2>&1
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
    composer global require "$prefix$release" >/dev/null 2>&1 &&
    add_log "$tick" "$tool" "Added"
  ) || add_log "$cross" "$tool" "Could not setup $tool"
}

# Function to setup phpize and php-config
add_devtools() {
  if ! [ -e "/usr/bin/phpize$version" ] || ! [ -e "/usr/bin/php-config$version" ]; then
    update_lists && $apt_install php"$version"-dev php"$version"-xml >/dev/null 2>&1
  fi
  sudo update-alternatives --set php-config /usr/bin/php-config"$version" >/dev/null 2>&1
  sudo update-alternatives --set phpize /usr/bin/phpize"$version" >/dev/null 2>&1
  configure_pecl
}

# Function to setup the nightly build from master branch
setup_master() {
  curl "${curl_opts[@]}" https://github.com/shivammathur/php-builder/releases/latest/download/install.sh | bash -s "github"
}

# Function to setup PECL
add_pecl() {
  add_devtools
  if [ ! -e /usr/bin/pecl ]; then
    $apt_install php-pear >/dev/null 2>&1
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

# Variables
tick="✓"
cross="✗"
lists_updated="false"
pecl_config="false"
version=$1
debconf_fix="DEBIAN_FRONTEND=noninteractive"
apt_install="sudo $debconf_fix apt-fast install -y"
tool_path_dir="/usr/local/bin"
curl_opts=(-sL)
existing_version=$(php-config --version 2>/dev/null | cut -c 1-3)

# Setup PHP
step_log "Setup PHP"
sudo mkdir -p /var/run /run/php
. /etc/lsb-release
if [ "$DISTRIB_RELEASE" = "20.04" ]; then
  if ! apt-cache policy | grep -q ondrej/php; then
    cleanup_lists >/dev/null 2>&1
    LC_ALL=C.UTF-8 sudo apt-add-repository ppa:ondrej/php -y >/dev/null 2>&1
  fi
fi

if [ "$existing_version" != "$version" ]; then
  if [ ! -e "/usr/bin/php$version" ]; then
    if [ "$version" = "8.0" ]; then
      setup_master >/dev/null 2>&1
    else
      update_lists
      IFS=' ' read -r -a packages <<< "$(echo "cli curl mbstring xml intl" | sed "s/[^ ]*/php$version-&/g")"
      $apt_install "${packages[@]}" >/dev/null 2>&1
    fi
    status="Installed"
  else
    status="Switched to"
  fi

  switch_version >/dev/null 2>&1
else
  status="Found"
fi

semver=$(php_semver)
scan_dir=$(php --ini | grep additional | sed -e "s|.*: s*||")
ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
ext_dir=$(php -i | grep "extension_dir => /" | sed -e "s|.*=> s*||")
pecl_file="$scan_dir"/99-pecl.ini
echo '' | sudo tee "$pecl_file" >/dev/null 2>&1
sudo rm -rf /usr/local/bin/phpunit >/dev/null 2>&1
sudo chmod 777 "$ini_file" "$pecl_file" "$tool_path_dir"
add_log "$tick" "PHP" "$status PHP $semver"
