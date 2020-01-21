extension=$1
extension_major=${extension: -1}
php_version=$2
ini_file=$(php -d "date.timezone=UTC" --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
ext_dir=$(php -i | grep "extension_dir => /usr" | sed -e "s|.*=> s*||")
if [ -e "$ext_dir/psr.so" ] && [ -e "$ext_dir/phalcon.so" ]; then
  echo "extension=psr" >>"$ini_file"
  echo "extension=phalcon" >>"$ini_file"
  phalcon_semver=$(php -r "echo phpversion('phalcon');")
  phalcon_version=$(echo "$phalcon_semver" | cut -d'.' -f 1)
  if [ "$phalcon_version" != "$extension_major" ]; then
    sudo sed -i '' "/psr/d" "$ini_file"
    sudo sed -i '' "/phalcon/d" "$ini_file"
    rm -rf "$ext_dir"/psr.so
    rm -rf "$ext_dir"/phalcon.so
    brew tap shivammathur/homebrew-phalcon
    brew install phalcon@"$php_version"_"$extension_major"
  fi
else
  brew tap shivammathur/homebrew-phalcon
  brew install phalcon@"$php_version"_"$extension_major"
fi