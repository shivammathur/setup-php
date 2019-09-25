export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew tap exolnet/homebrew-deprecated > /dev/null 2>&1;	
brew install php@"$1";
brew link --force --overwrite php@"$1";
ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
ext_dir=$(/usr/bin/php -i | grep "extension_dir => /usr" | sed -e "s|.*=> s*||")
sudo chmod 777 "$ini_file"
mkdir -p "$(pecl config-get ext_dir)"
if [ ! -e "/usr/bin/composer" ]; then
	EXPECTED_SIGNATURE="$(curl -s https://composer.github.io/installer.sig)"
	curl -s -L https://getcomposer.org/installer > composer-setup.php
	ACTUAL_SIGNATURE="$(php -r "echo hash_file('sha384', 'composer-setup.php');")"

	if [ "$EXPECTED_SIGNATURE" != "$ACTUAL_SIGNATURE" ]; then
		>&2 echo 'ERROR: Invalid installer signature'
		rm composer-setup.php
		exit 1
	fi

	COMPOSER_ALLOW_SUPERUSER=1
	sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer
	RESULT=$?
	rm composer-setup.php
	echo $RESULT
fi
sudo composer global require hirak/prestissimo
php -v
composer -V
