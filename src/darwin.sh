echo $1
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
brew unlink php
brew tap exolnet/homebrew-deprecated
brew install php@$1
brew link --force --overwrite php@$1
brew install composer
php -v
composer -V