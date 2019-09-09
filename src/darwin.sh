echo $1
brew unlink php
brew tap exolnet/homebrew-deprecated
brew install php@$1
brew link --force --overwrite php@$1
curl -sS https://getcomposer.org/installer | php
chmod +x composer.phar
mv composer.phar /usr/local/bin/composer
php -v
composer -V