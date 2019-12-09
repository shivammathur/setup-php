tick="✓"
cross="✗"

step_log() {
  message=$1
  printf "\n\033[90;1m==> \033[0m\033[37;1m%s\033[0m\n" "$message"
}

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
existing_version=$(php-config --version | cut -c 1-3)
semver=$(php -v | head -n 1 | cut -f 2 -d ' ' | cut -f 1 -d '-')
step_log "Setup PHP and Composer"
sudo mkdir -p /var/run
sudo mkdir -p /run/php
find /etc/apt/sources.list.d -type f -name 'ondrej-ubuntu-php*.list' -exec sudo DEBIAN_FRONTEND=noninteractive apt-fast update -o Dir::Etc::sourcelist="{}" ';' >/dev/null 2>&1
if [ "$existing_version" != "$1" ]; then
	if [ ! -e "/usr/bin/php$1" ]; then
		if [ "$1" = "7.4" ]; then
		  sudo DEBIAN_FRONTEND=noninteractive apt-fast install -y php"$1" php"$1"-phpdbg php"$1"-xml curl php"$1"-curl >/dev/null 2>&1
		elif [ "$1" = "8.0" ]; then
      tar_file=php_"$1"%2Bubuntu"$(lsb_release -r -s)".tar.xz
      install_dir=~/php/"$1"
      sudo DEBIAN_FRONTEND=noninteractive apt-get -y install libicu-dev >/dev/null 2>&1
      curl -o "$tar_file" -L https://bintray.com/shivammathur/php/download_file?file_path="$tar_file" >/dev/null 2>&1
      sudo mkdir -m 777 -p ~/php
      sudo tar xf "$tar_file" -C ~/php  >/dev/null 2>&1 && rm -rf "$tar_file"
      sudo ln -sf -S "$1" "$install_dir"/bin/* /usr/bin/ && sudo ln -sf "$install_dir"/etc/php.ini /etc/php.ini
		else
		  sudo DEBIAN_FRONTEND=noninteractive apt-fast install -y php"$1" curl php"$1"-curl >/dev/null 2>&1
		fi
		status="installed"
	else
	  status="switched"
	fi

	for tool in pear pecl php phar phar.phar php-cgi php-config phpize phpdbg; do
		if [ -e "/usr/bin/$tool$1" ]; then
			sudo update-alternatives --set $tool /usr/bin/"$tool$1" >/dev/null 2>&1
		fi
	done

	semver=$(php -v | head -n 1 | cut -f 2 -d ' ' | cut -f 1 -d '-')
	if [ "$1" = "8.0" ]; then
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
if [ "$2" = "true" ]; then
  sudo DEBIAN_FRONTEND=noninteractive apt-fast install -y php"$1"-dev php"$1"-xml >/dev/null 2>&1
  sudo update-alternatives --set php-config /usr/bin/php-config"$1" >/dev/null 2>&1
  sudo update-alternatives --set phpize /usr/bin/phpize"$1" >/dev/null 2>&1
  sudo DEBIAN_FRONTEND=noninteractive apt-fast update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-fast install -y expect
  curl -o install-pear.sh -L https://raw.githubusercontent.com/shivammathur/php-builder/master/.github/scripts/install-pear.sh
  curl -o go-pear.phar -L https://github.com/pear/pearweb_phars/raw/master/go-pear.phar
  sudo chmod a+x ./install-pear.sh
  sudo ./install-pear.sh /usr
  rm -rf install-pear.sh >/dev/null 2>&1 && rm -rf go-pear.phar >/dev/null 2>&1
  sudo pear config-set php_ini "$ini_file" >/dev/null 2>&1
  sudo pear config-set auto_discover 1 >/dev/null 2>&1
  sudo pear channel-update pecl.php.net >/dev/null 2>&1
  add_log "$tick" "PECL" "Installed"
fi

if [ ! -e "/usr/bin/composer" ]; then
	curl -s -L https://getcomposer.org/installer > composer-setup.php
	if [ "$(curl -s https://composer.github.io/installer.sig)" != "$(php -r "echo hash_file('sha384', 'composer-setup.php');")" ]; then
		>&2 echo 'ERROR: Invalid installer signature'		
	else
		export COMPOSER_ALLOW_SUPERUSER=1
		sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer
	fi
	rm composer-setup.php	
fi
composer global require hirak/prestissimo >/dev/null 2>&1
add_log "$tick" "Composer" "Installed"

add_extension()
{
  extension=$1
  install_command=$2
  prefix=$3
  if ! php -m | grep -i -q "$extension" && [ -e "$ext_dir/$extension.so" ]; then
    echo "$prefix=$extension" >> "$ini_file" && add_log "$tick" "$extension" "Enabled"
  elif php -m | grep -i -q "$extension"; then
    add_log "$tick" "$extension" "Enabled"
  elif ! php -m | grep -i -q "$extension"; then
      (
        eval "$install_command" && \
        add_log "$tick" "$extension" "Installed and enabled"
      ) || add_log "$cross" "$extension" "Could not install $extension on PHP $semver"
  fi
}