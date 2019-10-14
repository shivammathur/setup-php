version=$1
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
if [ "$1" = "5.6" ] || [ "$1" = "7.0" ]; then
  brew tap exolnet/homebrew-deprecated >/dev/null 2>&1
fi
brew install php@"$1" composer >/dev/null 2>&1
brew link --force --overwrite php@"$1" >/dev/null 2>&1
ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
ext_dir=$(php -i | grep "extension_dir => /usr" | sed -e "s|.*=> s*||")
sudo chmod 777 "$ini_file"
mkdir -p "$(pecl config-get ext_dir)"
composer global require hirak/prestissimo >/dev/null 2>&1
php -v
composer -V

add_extension()
{
  extension=$1
  install_command=$2
  prefix=$3
  log_prefix=$4
  if ! php -m | grep -i -q "$extension" && [ -e "$ext_dir/$extension.so" ]; then
    echo "$prefix=$extension" >> "$ini_file" && echo "\033[32;1m$log_prefix: Enabled $extension\033[0m";
  elif php -m | grep -i -q "$extension"; then
    echo "\033[33;1m$log_prefix: $extension was already enabled\033[0m";
  elif ! php -m | grep -i -q "$extension"; then
    exists=$(curl -sL https://pecl.php.net/json.php?package="$extension" -w "%{http_code}" -o /dev/null)
    if [ "$exists" = "200" ]; then
      eval "$install_command" && \
      echo "\033[32;1m$log_prefix: Installed and enabled $extension\033[0m" || \
      echo "\033[31;1m$log_prefix: Could not install $extension on PHP$version\033[0m";
    else
      if ! php -m | grep -i -q "$extension"; then
        echo "\033[31;1m$log_prefix: Could not find $extension for PHP$version on PECL\033[0m";
      fi
    fi
  fi
}