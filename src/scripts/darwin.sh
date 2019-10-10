export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
if [ "$1" = "5.6" ] || [ "$1" = "7.0" ]; then
  brew tap exolnet/homebrew-deprecated >/dev/null 2>&1
fi
brew install php@"$1" composer >/dev/null 2>&1
brew link --force --overwrite php@"$1" >/dev/null 2>&1
ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
ext_dir=$(/usr/bin/php -i | grep "extension_dir => /usr" | sed -e "s|.*=> s*||")
sudo chmod 777 "$ini_file"
mkdir -p "$(pecl config-get ext_dir)"
composer global require hirak/prestissimo >/dev/null 2>&1
php -v
composer -V