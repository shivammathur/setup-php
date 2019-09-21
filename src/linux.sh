version=$(php-config --version | cut -c 1-3)
if [ "$version" != "$1" ]; then
	if [ ! -e "/usr/bin/php$1" ]; then
		sudo DEBIAN_FRONTEND=noninteractive add-apt-repository ppa:ondrej/php -y > /dev/null 2>&1
		sudo DEBIAN_FRONTEND=noninteractive apt update -y > /dev/null 2>&1
		sudo DEBIAN_FRONTEND=noninteractive apt install -y php"$1" curl php"$1"-curl;		
	fi
	for tool in php phar phar.phar php-cgi php-config phpize; do
		if [ -e "/usr/bin/$tool$1" ]; then
			sudo update-alternatives --set $tool /usr/bin/"$tool$1";
		fi
	done
fi	

if [ ! -e "/usr/bin/composer" ]; then
	sudo curl -s https://getcomposer.org/installer | php;
	sudo mv composer.phar /usr/local/bin/composer;
fi
composer global require hirak/prestissimo > /dev/null 2>&1
ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
ext_dir=$(/usr/bin/php -i | grep "extension_dir => /usr" | sed -e "s|.*=> s*||")
sudo chmod 777 "$ini_file"
sudo mkdir -p /run/php
php -v
composer -V