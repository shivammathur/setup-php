echo $1
brew unlink php

if [ $1 = '7.4' ]; then
	chmod a+x ./src/7.4.sh
	./src/7.4.sh;
else	
	brew tap exolnet/homebrew-deprecated
	brew install php@$1 composer
	brew link --force --overwrite php@$1
fi
php -v
composer -V	