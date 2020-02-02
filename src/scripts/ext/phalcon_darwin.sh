extension=$1
extension_major=${extension: -1}
php_version=$2
ini_file=$(php -d "date.timezone=UTC" --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
ext_dir=$(php -i | grep "extension_dir => /usr" | sed -e "s|.*=> s*||")
if [ -e "$ext_dir/psr.so" ] && [ -e "$ext_dir/phalcon.so" ]; then
  echo "extension=psr" >>"$ini_file"
  echo "extension=phalcon" >>"$ini_file"
  phalcon_version=$(php -d="extension=phalcon" -r "echo phpversion('phalcon');" | cut -d'.' -f 1)
  if [ "$phalcon_version" != "$extension_major" ]; then
    brew tap shivammathur/homebrew-phalcon
    brew install phalcon@"$php_version"_"$extension_major"
  fi
else
  brew tap shivammathur/homebrew-phalcon
  brew install phalcon@"$php_version"_"$extension_major"
fi