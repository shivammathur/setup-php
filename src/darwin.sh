version=$(php-config --version | cut -c 1-3)
if [ "$version" != "$1" ]; then
	brew tap exolnet/homebrew-deprecated;
	brew unlink php;
	brew install php@$1;
	brew link --force --overwrite php@$1;
fi

curl -sS https://getcomposer.org/installer | php
chmod +x composer.phar
mv composer.phar /usr/local/bin/composer
php -v
composer -V