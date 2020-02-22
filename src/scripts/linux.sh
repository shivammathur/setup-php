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

# Function to update php ppa
update_ppa() {
  if [ "$ppa_updated" = "false" ]; then
    if [[ "$version" =~ $old_versions ]]; then
      ppa="dotdeb-ubuntu-php*.list"
    else
      ppa="ondrej-ubuntu-php*.list"
    fi
    find /etc/apt/sources.list.d -type f -name "$ppa" -exec sudo "$debconf_fix" apt-fast update -o Dir::Etc::sourcelist="{}" ';' >/dev/null 2>&1
    ppa_updated="true"
  fi
}

# Function to configure PECL
configure_pecl() {
  if [ "$pecl_config" = "false" ] && [ -e /usr/bin/pecl ]; then
    for tool in pear pecl; do
      sudo "$tool" config-set php_ini "$ini_file" >/dev/null 2>&1
      sudo "$tool" config-set auto_discover 1 >/dev/null 2>&1
      sudo "$tool" channel-update "$tool".php.net >/dev/null 2>&1
    done
    pecl_config="true"
  fi
}

# Fuction to get the PECL version
get_pecl_version() {
  extension=$1
  stability=$2
  pecl_rest='https://pecl.php.net/rest/r/'
  response=$(curl -q -sSL "$pecl_rest$extension"/allreleases.xml)
  pecl_version=$(echo "$response" | grep -m 1 -Po "(\d*\.\d*\.\d*$stability\d*)")
  if [ ! "$pecl_version" ]; then
    pecl_version=$(echo "$response" | grep -m 1 -Po "(\d*\.\d*\.\d*)")
  fi
  echo "$pecl_version"
}

# Function to setup extensions
add_extension() {
  extension=$1
  install_command=$2
  prefix=$3
  if [[ "$version" =~ $old_versions ]]; then
    install_command="update_ppa && ${install_command/5\.[4-5]-$extension/5-$extension=$release_version}"
  fi
  if ! php -m | grep -i -q -w "$extension" && [ -e "$ext_dir/$extension.so" ]; then
    # shellcheck disable=SC2046
    $apt_install $(apt-cache depends php"$version"-"$extension" 2>/dev/null | awk '/Depends:/{print$2}') >/dev/null 2>&1
    echo "$prefix=$extension.so" >>"$ini_file" && add_log "$tick" "$extension" "Enabled"
  elif php -m | grep -i -q -w "$extension"; then
    add_log "$tick" "$extension" "Enabled"
  elif ! php -m | grep -i -q -w "$extension"; then
    (eval "$install_command" >/dev/null 2>&1 && add_log "$tick" "$extension" "Installed and enabled") ||
    (update_ppa && eval "$install_command" >/dev/null 2>&1 && add_log "$tick" "$extension" "Installed and enabled") ||
    (sudo pecl install -f "$extension" >/dev/null 2>&1 && add_log "$tick" "$extension" "Installed and enabled") ||
    add_log "$cross" "$extension" "Could not install $extension on PHP $semver"
  fi
  sudo chmod 777 "$ini_file"
}

# Function to delete extensions
delete_extension() {
  extension=$1
  sudo sed -i "/$extension/d" "$ini_file"
  sudo rm -rf "$scan_dir"/*"$extension"* >/dev/null 2>&1
  sudo rm -rf "$ext_dir"/"$extension".so >/dev/null 2>&1
}

# Function to disable and delete extensions
remove_extension() {
  extension=$1
  if [[ ! "$version" =~ $old_versions ]] && [ -e /etc/php/"$version"/mods-available/"$extension".ini ]; then
    sudo phpdismod -v "$version" "$extension"
  fi
  delete_extension "$extension"
}

# Function to install a PECL version
add_pecl_extension() {
  extension=$1
  pecl_version=$2
  delete_extension "$extension"
  (sudo pecl install -f "$extension-$pecl_version" >/dev/null 2>&1 &&
  add_log "$tick" "$extension" "Installed and enabled") ||
  add_log "$cross" "$extension" "Could not install $extension-$pecl_version on PHP $semver"
}

# Function to pre-release extensions using PECL
add_unstable_extension() {
  extension=$1
  stability=$2
  prefix=$3
  pecl_version=$(get_pecl_version "$extension" "$stability")
  if ! php -m | grep -i -q -w "$extension" && [ -e "$ext_dir/$extension.so" ]; then
    extension_version=$(php -d="$prefix=$extension" -r "echo phpversion('$extension');")
    if [ "$extension_version" = "$pecl_version" ]; then
      echo "$prefix=$extension.so" >>"$ini_file" && add_log "$tick" "$extension" "Enabled"
    else
      delete_extension "$extension"
      add_pecl_extension "$extension" "$pecl_version"
    fi
  elif php -m | grep -i -q -w "$extension"; then
    extension_version=$(php -r "echo phpversion('$extension');")
    if [ "$extension_version" = "$pecl_version" ]; then
      add_log "$tick" "$extension" "Enabled"
    else
      delete_extension "$extension"
      add_pecl_extension "$extension" "$pecl_version"
    fi
  else
    add_pecl_extension "$extension" "$pecl_version"
  fi
}

# Function to update extension
update_extension() {
  extension=$1
  latest_version=$2
  current_version=$(php -r "echo phpversion('$extension');")
  final_version=$(printf "%s\n%s" "$current_version" "$latest_version" | sort | tail -n 1)
  if [ "$final_version" != "$current_version"  ]; then
    version_exists=$(apt-cache policy -- *"$extension" | grep "$final_version")
    if [ -z "$version_exists" ]; then
      update_ppa
    fi
    $apt_install php"$version"-"$extension"
  fi
}

# Function to setup a remote tool
add_tool() {
  url=$1
  tool=$2
  tool_path=/usr/local/bin/"$tool"
  if [ ! -e "$tool_path" ]; then
    rm -rf "$tool_path"
  fi
  status_code=$(sudo curl -s -w "%{http_code}" -o "$tool_path" -L "$url")
  if [ "$status_code" = "200" ]; then
    sudo chmod a+x "$tool_path"
    if [ "$tool" = "composer" ]; then
      composer -q global config process-timeout 0
    elif [ "$tool" = "cs2pr" ]; then
      sudo sed -i 's/\r$//; s/exit(9)/exit(0)/' "$tool_path"
    elif [ "$tool" = "phive" ]; then
      add_extension curl "$apt_install php$version-curl" extension >/dev/null 2>&1
      add_extension mbstring "$apt_install php$version-mbstring" extension >/dev/null 2>&1
      add_extension xml "$apt_install php$version-xml" extension >/dev/null 2>&1
    elif [ "$tool" = "wp-cli" ]; then
      sudo cp "$tool_path" /usr/local/bin/wp
    fi
    add_log "$tick" "$tool" "Added"
  else
    add_log "$cross" "$tool" "Could not setup $tool"
  fi
}

# Function to setup a tool using composer
add_composer_tool() {
  tool=$1
  release=$2
  prefix=$3
  (
    composer global require "$prefix$release" >/dev/null 2>&1 &&
    sudo ln -sf "$(composer -q global config home)"/vendor/bin/"$tool" /usr/local/bin/"$tool" &&
    add_log "$tick" "$tool" "Added"
  ) || add_log "$cross" "$tool" "Could not setup $tool"
}

# Function to setup phpize and php-config
add_devtools() {
  if ! [ -e "/usr/bin/phpize$version" ] || ! [ -e "/usr/bin/php-config$version" ]; then
    $apt_install php"$version"-dev php"$version"-xml >/dev/null 2>&1
  fi
  sudo update-alternatives --set php-config /usr/bin/php-config"$version" >/dev/null 2>&1
  sudo update-alternatives --set phpize /usr/bin/phpize"$version" >/dev/null 2>&1
  configure_pecl
}

# Function to setup the nightly build from master branch
setup_master() {
  tar_file=php_"$version"%2Bubuntu"$(lsb_release -r -s)".tar.xz
  install_dir=~/php/"$version"
  sudo mkdir -m 777 -p ~/php
  update_ppa && $apt_install libicu64 libicu-dev >/dev/null 2>&1
  curl -SLO https://dl.bintray.com/shivammathur/php/"$tar_file" >/dev/null 2>&1
  sudo tar xf "$tar_file" -C ~/php >/dev/null 2>&1
  rm -rf "$tar_file"
  sudo ln -sf -S "$version" "$install_dir"/bin/* /usr/bin/
  sudo ln -sf "$install_dir"/etc/php.ini /etc/php.ini
}

# Function to setup PHP 5.3, PHP 5.4 and PHP 5.5
setup_old_versions() {
  (
    cd /tmp || exit
    curl -SLO https://dl.bintray.com/shivammathur/php/php-"$version".tar.xz >/dev/null 2>&1
    sudo tar xf php-"$version".tar.xz >/dev/null 2>&1
    cd php-"$version" || exit
    sudo chmod a+x ./*.sh
    ./install.sh >/dev/null 2>&1
    ./post-install.sh >/dev/null 2>&1
  )
  sudo rm -rf /tmp/php-"$version"
  configure_pecl
  release_version=$(php -v | head -n 1 | cut -d' ' -f 2)
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
      sudo update-alternatives --set $tool /usr/bin/"$tool$version" >/dev/null 2>&1
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

# Function to update PHP
update_php() {
  update_ppa
  initial_version=$(php_semver)
  $apt_install php"$version" php"$version"-curl php"$version"-mbstring php"$version"-xml >/dev/null 2>&1
  updated_version=$(php_semver)
  if [ "$updated_version" != "$initial_version" ]; then
    status="Updated to"
  else
    status="Switched to"
  fi
}

# Variables
tick="✓"
cross="✗"
ppa_updated="false"
pecl_config="false"
version=$1
old_versions="5.[4-5]"
debconf_fix="DEBIAN_FRONTEND=noninteractive"
apt_install="sudo $debconf_fix apt-fast install -y"
existing_version=$(php-config --version | cut -c 1-3)
[[ -z "${update}" ]] && update='false' || update="${update}"

# Setup PHP
step_log "Setup PHP"
sudo mkdir -p /var/run /run/php

if [ "$existing_version" != "$version" ]; then
  if [ ! -e "/usr/bin/php$version" ]; then
    if [ "$version" = "8.0" ]; then
      setup_master
    elif [[ "$version" =~ $old_versions ]] || [ "$version" = "5.3" ]; then
      setup_old_versions
    else
      update_ppa
      $apt_install php"$version" php"$version"-curl php"$version"-mbstring php"$version"-xml >/dev/null 2>&1
    fi
    status="Installed"
  else
    if [ "$update" = "true" ]; then
      update_php
    else
      status="Switched to"
    fi
  fi

  # PHP 5.3 is switched by install script, for rest switch_version
  if [ "$version" != "5.3" ]; then
    switch_version
  fi

else
  if [ "$update" = "true" ]; then
    update_php
  else
    status="Found"
  fi
fi

semver=$(php_semver)
ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
ext_dir=$(php -i | grep "extension_dir => /" | sed -e "s|.*=> s*||")
scan_dir=$(php --ini | grep additional | sed -e "s|.*: s*||")
sudo chmod 777 "$ini_file"
add_log "$tick" "PHP" "$status PHP $semver"
