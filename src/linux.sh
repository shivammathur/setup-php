sudo add-apt-repository ppa:ondrej/php -y
sudo apt update -y
sudo mkdir -p /run/php
sudo apt install -y php$1 curl
sudo apt autoremove -y
sudo update-alternatives --set php /usr/bin/php$1
sudo curl -s https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
php -v
composer -V