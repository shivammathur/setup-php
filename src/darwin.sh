version=$(php-config --version | cut -c 1-3)
if [ "$version" != "$1" ]; then
	brew tap exolnet/homebrew-deprecated;
	brew unlink php;
	brew install php@$1;
	brew link --force --overwrite php@$1;
else
	sudo cp /etc/php.ini.default /etc/php.ini	
fi
ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
sudo chmod 777 $ini_file
curl -sS https://getcomposer.org/installer | php
chmod +x composer.phar
mv composer.phar /usr/local/bin/composer
composer global require hirak/prestissimo
php -v
composer -V