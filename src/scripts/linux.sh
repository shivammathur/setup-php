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
    find /etc/apt/sources.list.d -type f -name 'ondrej-ubuntu-php*.list' -exec sudo DEBIAN_FRONTEND=noninteractive apt-fast update -o Dir::Etc::sourcelist="{}" ';' >/dev/null 2>&1
    ppa_updated="true"
  fi
}

# Function to setup extension
add_extension() {
  extension=$1
  install_command=$2
  prefix=$3
  if ! php -m | grep -i -q -w "$extension" && [ -e "$ext_dir/$extension.so" ]; then
    echo "$prefix=$extension" >>"$ini_file" && add_log "$tick" "$extension" "Enabled"
  elif php -m | grep -i -q -w "$extension"; then
    add_log "$tick" "$extension" "Enabled"
  elif ! php -m | grep -i -q -w "$extension"; then
    (eval "$install_command" && add_log "$tick" "$extension" "Installed and enabled") ||
    (update_ppa && eval "$install_command" && add_log "$tick" "$extension" "Installed and enabled") ||
    add_log "$cross" "$extension" "Could not install $extension on PHP $semver"
  fi
}

# Function to setup the nightly build from master branch
setup_master() {
  tar_file=php_"$version"%2Bubuntu"$(lsb_release -r -s)".tar.xz
  install_dir=~/php/"$version"
  sudo mkdir -m 777 -p ~/php
  $apt_install libicu-dev >/dev/null 2>&1
  curl -o "$tar_file" -L https://bintray.com/shivammathur/php/download_file?file_path="$tar_file" >/dev/null 2>&1
  sudo tar xf "$tar_file" -C ~/php >/dev/null 2>&1
  rm -rf "$tar_file"
  sudo ln -sf -S "$version" "$install_dir"/bin/* /usr/bin/
  sudo ln -sf "$install_dir"/etc/php.ini /etc/php.ini
}

# Function to setup PECL
setup_pecl() {
  $apt_install php"$version"-dev php"$version"-xml >/dev/null 2>&1
  sudo update-alternatives --set php-config /usr/bin/php-config"$version" >/dev/null 2>&1
  sudo update-alternatives --set phpize /usr/bin/phpize"$version" >/dev/null 2>&1
  wget https://github.com/pear/pearweb_phars/raw/master/install-pear-nozlib.phar >/dev/null 2>&1
  sudo php install-pear-nozlib.phar >/dev/null 2>&1
  sudo pear config-set php_ini "$ini_file" >/dev/null 2>&1
  sudo pear config-set auto_discover 1 >/dev/null 2>&1
  sudo pear channel-update pear.php.net >/dev/null 2>&1
}

# Function to setup composer
setup_composer() {
  if [ ! -e "/usr/bin/composer" ]; then
    curl -s -L https://getcomposer.org/installer >composer-setup.php
    if [ "$(curl -s https://composer.github.io/installer.sig)" != "$(php -r "echo hash_file('sha384', 'composer-setup.php');")" ]; then
      echo >&2 'ERROR: Invalid installer signature'
    else
      export COMPOSER_ALLOW_SUPERUSER=1
      sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer
    fi
    rm composer-setup.php
  fi
  add_log "$tick" "Composer" "Installed"
}

# Function to switch versions of PHP binaries
switch_version() {
  for tool in pear pecl php phar phar.phar php-cgi php-config phpize phpdbg; do
    if [ -e "/usr/bin/$tool$version" ]; then
      sudo update-alternatives --set $tool /usr/bin/"$tool$version" >/dev/null 2>&1
    fi
  done
}

# Variables
tick="✓"
cross="✗"
ppa_updated="false"
version=$1
pecl=$2
apt_install="sudo DEBIAN_FRONTEND=noninteractive apt-fast install -y"
existing_version=$(php-config --version | cut -c 1-3)
semver=$(php -v | head -n 1 | cut -f 2 -d ' ' | cut -f 1 -d '-')

# Setup PHP
step_log "Setup PHP and Composer"
sudo mkdir -p /var/run
sudo mkdir -p /run/php

if [ "$existing_version" != "$version" ]; then
  if [ ! -e "/usr/bin/php$version" ]; then
    update_ppa
    ppa_updated=1
    if [ "$version" = "7.4" ]; then
      $apt_install php"$version" php"$version"-phpdbg php"$version"-xml curl php"$version"-curl >/dev/null 2>&1
    elif [ "$version" = "8.0" ]; then
      setup_master
    else
      $apt_install php"$version" curl php"$version"-curl >/dev/null 2>&1
    fi
    status="installed"
  else
    status="switched"
  fi

  switch_version

  semver=$(php -v | head -n 1 | cut -f 2 -d ' ' | cut -f 1 -d '-')
  if [ "$version" = "8.0" ]; then
    semver=$(php -v | head -n 1 | cut -f 2 -d ' ')
  fi

  if [ "$status" != "switched" ]; then
    status="Installed PHP $semver"
  else
    status="Switched to PHP $semver"
  fi
else
  status="PHP $semver Found"
fi

ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
ext_dir=$(php -i | grep "extension_dir => /usr" | sed -e "s|.*=> s*||")
sudo chmod 777 "$ini_file"
add_log "$tick" "PHP" "$status"

# Setup PECL
if [ "$pecl" = "true" ]; then
  update_ppa
  setup_pecl
  add_log "$tick" "PECL" "Installed"
fi

# Setup composer
setup_composer
