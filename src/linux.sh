ua()
{	
	for tool in php phar phar.phar php-cgi php-config phpize; do
		if [ -e "/usr/bin/$tool$version" ]; then
			sudo update-alternatives --set $tool /usr/bin/$tool$1;
		fi
	done
}

version=$(php-config --version | cut -c 1-3)
if [ "$version" != "$1" ]; then
	if [ ! -e "/usr/bin/php$1" ]; then
		sudo add-apt-repository ppa:ondrej/php -y
		sudo apt update -y		
		sudo apt install -y php$1 curl;
		sudo apt autoremove -y;		
	fi
	ua $1;
fi	

if [ ! -e "/usr/bin/composer" ]; then
	sudo curl -s https://getcomposer.org/installer | php;
	sudo mv composer.phar /usr/local/bin/composer;
fi
php -v
composer -V