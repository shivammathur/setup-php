# Function to log result of a operation
add_log() {
  mark=$1
  subject=$2
  message=$3
  if [ "$mark" = "$tick" ]; then
    printf "\033[32;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s\033[0m\n" "$mark" "$subject" "$message"
  else
    printf "\033[31;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s\033[0m\n" "$mark" "$subject" "$message"
  fi
}

# Function to install phalcon
install_phalcon() {
  (
    sed -i '' '/extension.*psr/d' "$ini_file"
    brew tap shivammathur/homebrew-phalcon >/dev/null 2>&1
    brew install phalcon@"$php_version"_"$extension_major" >/dev/null 2>&1
    sudo cp /usr/local/opt/psr@"$php_version"/psr.so "$ext_dir" >/dev/null 2>&1
    sudo cp /usr/local/opt/phalcon@"$php_version"_"$extension_major"/phalcon.so "$ext_dir" >/dev/null 2>&1
    add_log "$tick" "$extension" "Installed and enabled"
  ) || add_log "$cross" "$extension" "Could not install $extension on PHP $semver"
}

tick="✓"
cross="✗"
extension=$1
extension_major=${extension: -1}
php_version=$2
semver=$(php -v | head -n 1 | cut -f 2 -d ' ')
ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
ext_dir=$(php -i | grep "extension_dir => /usr" | sed -e "s|.*=> s*||")
if [ -e "$ext_dir/psr.so" ] && [ -e "$ext_dir/phalcon.so" ]; then
  phalcon_version=$(php -d="extension=psr.so" -d="extension=phalcon.so" -r "echo phpversion('phalcon');" 2>/dev/null | cut -d'.' -f 1)
  if php -m | grep -i -q -w psr; then
    phalcon_version=$(php -d="extension=phalcon.so" -r "echo phpversion('phalcon');" 2>/dev/null | cut -d'.' -f 1)
  fi
  if [ "$phalcon_version" != "$extension_major" ]; then
    install_phalcon
  else
    if ! php -m | grep -i -q -w psr; then echo "extension=psr.so" >>"$ini_file"; fi
    echo "extension=phalcon.so" >>"$ini_file"
    add_log "$tick" "$extension" "Enabled"
  fi
else
  install_phalcon
fi
