# Function to log start of a operation.
step_log() {
  message=$1
  printf "\n\033[90;1m==> \033[0m\033[37;1m%s\033[0m\n" "$message"
}

# Function to log result of a operation.
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

# Function to log result of installing extension.
add_extension_log() {
  extension=$1
  status=$2
  extension_name=$(echo "$extension" | cut -d '-' -f 1)
  (
    check_extension "$extension_name" && add_log "$tick" "$extension_name" "$status"
  ) || add_log "$cross" "$extension_name" "Could not install $extension on PHP $semver"
}

# Function to read env inputs.
read_env() {
  . /etc/lsb-release
  [[ -z "${update}" ]] && update='false' && UPDATE='false' || update="${update}"
  [ "$update" = false ] && [[ -n ${UPDATE} ]] && update="${UPDATE}"
  [[ -z "${runner}" ]] && runner='github' && RUNNER='github' || runner="${runner}"
  [ "$runner" = false ] && [[ -n ${RUNNER} ]] && runner="${RUNNER}"
}

# Function to backup and cleanup package lists.
cleanup_lists() {
  if [ ! -e /etc/apt/sources.list.d.save ]; then
    sudo mv /etc/apt/sources.list.d /etc/apt/sources.list.d.save
    sudo mkdir /etc/apt/sources.list.d
    sudo mv /etc/apt/sources.list.d.save/*ondrej*.list /etc/apt/sources.list.d/
    trap "sudo mv /etc/apt/sources.list.d.save/*.list /etc/apt/sources.list.d/" exit
  fi
}

# Function to add ppa:ondrej/php.
add_ppa() {
  if ! apt-cache policy | grep -q ondrej/php; then
    cleanup_lists
    LC_ALL=C.UTF-8 sudo apt-add-repository ppa:ondrej/php -y
    if [ "$DISTRIB_RELEASE" = "16.04" ]; then
      sudo "$debconf_fix" apt-get update
    fi
  fi
}

# Function to update the package lists.
update_lists() {
  if [ ! -e /tmp/setup_php ]; then
    [ "$DISTRIB_RELEASE" = "20.04" ] && add_ppa >/dev/null 2>&1
    cleanup_lists
    sudo "$debconf_fix" apt-get update >/dev/null 2>&1
    echo '' | sudo tee "/tmp/setup_php" >/dev/null 2>&1
  fi
}

# Function to setup environment for self-hosted runners.
self_hosted_setup() {
  echo "Set disable_coredump false" | sudo tee -a /etc/sudo.conf
  if ! command -v apt-fast >/dev/null; then
    sudo ln -sf /usr/bin/apt-get /usr/bin/apt-fast
  fi
  update_lists && $apt_install curl make software-properties-common unzip
  add_ppa
}

# Function to configure PECL.
configure_pecl() {
  if [ "$pecl_config" = "false" ] && [ -e /usr/bin/pecl ]; then

    for tool in pear pecl; do
      sudo "$tool" config-set php_ini "$scan_dir"/99-pecl.ini
      sudo "$tool" channel-update "$tool".php.net
    done
    pecl_config="true"
  fi
}

# Fuction to get the PECL version of an extension.
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

# Function to check if an extension is loaded.
check_extension() {
  extension=$1
  if [ "$extension" != "mysql" ]; then
    php -m | grep -i -q -w "$extension"
  else
    php -m | grep -i -q "$extension"
  fi
}

# Function to delete extensions.
delete_extension() {
  extension=$1
  sudo sed -i "/$extension/d" "$ini_file"
  sudo sed -i "/$extension/d" "$pecl_file"
  sudo rm -rf "$scan_dir"/*"$extension"* >/dev/null 2>&1
  sudo rm -rf "$ext_dir"/"$extension".so >/dev/null 2>&1
}

# Function to disable and delete extensions.
remove_extension() {
  extension=$1
  if check_extension "$extension"; then
    if [[ ! "$version" =~ $old_versions ]] && [ -e /etc/php/"$version"/mods-available/"$extension".ini ]; then
      sudo phpdismod -v "$version" "$extension" >/dev/null 2>&1
    fi
    delete_extension "$extension"
    (! check_extension "$extension" && add_log "$tick" ":$extension" "Removed") ||
    add_log "$cross" ":$extension" "Could not remove $extension on PHP $semver"
  else
    add_log "$tick" ":$extension" "Could not find $extension on PHP $semver"
  fi
}

# Function to enable existing extensions.
enable_extension() {
  if ! check_extension "$1" && [ -e "$ext_dir/$1.so" ]; then
    echo "$2=$1.so" >>"$pecl_file"
  fi
}

# Funcion to add PDO extension.
add_pdo_extension() {
  pdo_ext="pdo_$1"
  if check_extension "$pdo_ext"; then
    add_log "$tick" "$pdo_ext" "Enabled"
  else
    read -r ext ext_name <<< "$1 $1"
    sudo rm -rf "$scan_dir"/*pdo.ini >/dev/null 2>&1
    if ! check_extension "pdo" 2>/dev/null; then echo "extension=pdo.so" >> "$ini_file"; fi
    if [ "$ext" = "mysql" ]; then
      enable_extension "mysqlnd" "extension"
      ext_name="mysqli"
    elif [ "$ext" = "sqlite" ]; then
      read -r ext ext_name <<< "sqlite3 sqlite3"
    fi
    add_extension "$ext_name" "$apt_install php$version-$ext" "extension" >/dev/null 2>&1
    enable_extension "$pdo_ext" "extension"
    add_extension_log "$pdo_ext" "Enabled"
  fi
}

# Function to add extensions.
add_extension() {
  extension=$1
  install_command=$2
  prefix=$3
  enable_extension "$extension" "$prefix"
  if check_extension "$extension"; then
    add_log "$tick" "$extension" "Enabled"
  else
    if [[ "$version" =~ 5.[4-5] ]]; then
      install_command="update_lists && ${install_command/5\.[4-5]-$extension/5-$extension=$release_version}"
    fi
    eval "$install_command" >/dev/null 2>&1 ||
    (update_lists && eval "$install_command" >/dev/null 2>&1) || pecl_install "$extension"
    add_extension_log "$extension" "Installed and enabled"
  fi
  sudo chmod 777 "$ini_file"
}

# Function to install a PECL version.
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
    pecl_install "$extension-$pecl_version"
    add_extension_log "$extension-$pecl_version" "Installed and enabled"
  fi
}

# Function to pre-release extensions using PECL.
add_unstable_extension() {
  extension=$1
  stability=$2
  prefix=$3
  pecl_version=$(get_pecl_version "$extension" "$stability")
  add_pecl_extension "$extension" "$pecl_version" "$prefix"
}

# Function to install extension from source
add_extension_from_source() {
  extension=$1
  repo=$2
  release=$3
  args=$4
  prefix=$5
  (
    add_devtools
    delete_extension "$extension"
    curl -o /tmp/"$extension".tar.gz "${curl_opts[@]}" https://github.com/"$repo"/archive/"$release".tar.gz
    tar xf /tmp/"$extension".tar.gz -C /tmp
    cd /tmp/"$extension-$release" || exit 1
    phpize  && ./configure "$args" && make && sudo make install
    enable_extension "$extension" "$prefix"
  ) >/dev/null 2>&1
  add_extension_log "$extension-$release" "Installed and enabled"
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
  echo "::add-path::/home/$USER/.composer/vendor/bin"
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
  status_code=$(sudo curl -s -w "%{http_code}" -o "$tool_path" "${curl_opts[@]}" "$url")
  if [ "$status_code" = "200" ]; then
    sudo chmod a+x "$tool_path"
    if [ "$tool" = "composer" ]; then
      configure_composer "$tool_path"
    elif [ "$tool" = "cs2pr" ]; then
      sudo sed -i 's/\r$//; s/exit(9)/exit(0)/' "$tool_path"
    elif [ "$tool" = "phan" ]; then
      add_extension fileinfo "$apt_install php$version-fileinfo" extension >/dev/null 2>&1
      add_extension ast "$apt_install php-ast" extension >/dev/null 2>&1
    elif [ "$tool" = "phive" ]; then
      add_extension curl "$apt_install php$version-curl" extension >/dev/null 2>&1
      add_extension mbstring "$apt_install php$version-mbstring" extension >/dev/null 2>&1
      add_extension xml "$apt_install php$version-xml" extension >/dev/null 2>&1
    elif [ "$tool" = "wp-cli" ]; then
      sudo cp -p "$tool_path" "$tool_path_dir"/wp
    fi
    add_log "$tick" "$tool" "Added"
  else
    add_log "$cross" "$tool" "Could not setup $tool"
  fi
}

# Function to setup a tool using composer.
add_composertool() {
  tool=$1
  release=$2
  prefix=$3
  (
    composer global require "$prefix$release" >/dev/null 2>&1 &&
    add_log "$tick" "$tool" "Added"
  ) || add_log "$cross" "$tool" "Could not setup $tool"
}

# Function to setup phpize and php-config.
add_devtools() {
  if ! [ -e "/usr/bin/phpize$version" ] || ! [ -e "/usr/bin/php-config$version" ]; then
    update_lists && $apt_install php"$version"-dev php"$version"-xml >/dev/null 2>&1
  fi
  sudo update-alternatives --set php-config /usr/bin/php-config"$version" >/dev/null 2>&1
  sudo update-alternatives --set phpize /usr/bin/phpize"$version" >/dev/null 2>&1
  configure_pecl >/dev/null 2>&1
}

# Function to setup the nightly build from master branch.
setup_master() {
  curl "${curl_opts[@]}" "$github"/php-builder/releases/latest/download/install.sh | bash -s "$runner"
}

# Function to setup PHP 5.3, PHP 5.4 and PHP 5.5.
setup_old_versions() {
  curl "${curl_opts[@]}" "$github"/php5-ubuntu/releases/latest/download/install.sh | bash -s "$version"
  configure_pecl
  release_version=$(php -v | head -n 1 | cut -d' ' -f 2)
}

# Function to add PECL.
add_pecl() {
  add_devtools >/dev/null 2>&1
  if [ ! -e /usr/bin/pecl ]; then
    $apt_install php-pear >/dev/null 2>&1 || update_lists && $apt_install php-pear >/dev/null 2>&1
  fi
  configure_pecl >/dev/null 2>&1
  add_log "$tick" "PECL" "Added"
}

# Function to switch versions of PHP binaries.
switch_version() {
  for tool in pear pecl php phar phar.phar php-cgi php-config phpize phpdbg; do
    if [ -e "/usr/bin/$tool$version" ]; then
      sudo update-alternatives --set $tool /usr/bin/"$tool$version"
    fi
  done
}

# Function to get PHP version in semver format.
php_semver() {
  if [ ! "$version" = "$master_version" ]; then
    php"$version" -v | head -n 1 | cut -f 2 -d ' ' | cut -f 1 -d '-'
  else
    php -v | head -n 1 | cut -f 2 -d ' '
  fi
}

# Function to install packaged PHP
add_packaged_php() {
  if [ "$runner" = "self-hosted" ] || [ "${use_package_cache:-true}" = "false" ]; then
    update_lists
    IFS=' ' read -r -a packages <<< "$(echo "cli curl mbstring xml intl" | sed "s/[^ ]*/php$version-&/g")"
    $apt_install "${packages[@]}"
  else
    curl "${curl_opts[@]}" "$github"/php-ubuntu/releases/latest/download/install.sh | bash -s "$version"
  fi
}

# Function to update PHP.
update_php() {
  initial_version=$(php_semver)
  use_package_cache="false"
  add_packaged_php
  updated_version=$(php_semver)
  if [ "$updated_version" != "$initial_version" ]; then
    status="Updated to"
  else
    status="Switched to"
  fi
}

# Function to install PHP.
add_php() {
  if [ "$version" = "$master_version" ]; then
    setup_master
  elif [[ "$version" =~ $old_versions ]]; then
    setup_old_versions
  else
    add_packaged_php
  fi
  status="Installed"
}

# Variables
tick="✓"
cross="✗"
pecl_config="false"
version=$1
master_version="8.0"
old_versions="5.[3-5]"
debconf_fix="DEBIAN_FRONTEND=noninteractive"
github="https://github.com/shivammathur"
apt_install="sudo $debconf_fix apt-fast install -y"
tool_path_dir="/usr/local/bin"
curl_opts=(-sSL --retry 5 --retry-delay 1)
existing_version=$(php-config --version 2>/dev/null | cut -c 1-3)

read_env
if [ "$runner" = "self-hosted" ]; then
  if [[ "$version" =~ $old_versions ]]; then
    add_log "$cross" "PHP" "PHP $version is not supported on self-hosted runner"
    exit 1
  else
    self_hosted_setup >/dev/null 2>&1
  fi
fi

# Setup PHP
step_log "Setup PHP"
sudo mkdir -p /var/run /run/php
if [ "$existing_version" != "$version" ]; then
  if [ ! -e "/usr/bin/php$version" ]; then
    add_php >/dev/null 2>&1
  else
    if [ "$update" = "true" ]; then
      update_php >/dev/null 2>&1
    else
      status="Switched to"
    fi
  fi
  if ! [[ "$version" =~ $old_versions ]]; then
    switch_version >/dev/null 2>&1
  fi
else
  if [ "$update" = "true" ]; then
    update_php >/dev/null 2>&1
  else
    status="Found"
    if [ "$version" = "$master_version" ]; then
      switch_version >/dev/null 2>&1
    fi
  fi
fi

semver=$(php_semver)
ext_dir=$(php -i | grep "extension_dir => /" | sed -e "s|.*=> s*||")
scan_dir=$(php --ini | grep additional | sed -e "s|.*: s*||")
ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
pecl_file="$scan_dir"/99-pecl.ini
echo '' | sudo tee "$pecl_file" >/dev/null 2>&1
sudo chmod 777 "$ini_file" "$pecl_file" "$tool_path_dir"
add_log "$tick" "PHP" "$status PHP $semver"
