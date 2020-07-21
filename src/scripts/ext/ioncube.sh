# Function to log result of a operation.
add_log() {
  mark=$1
  subject=$2
  message=$3
  if [ "$mark" = "$tick" ]; then
    printf "\033[32;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s\033[0m\n" "$mark" "$subject" "$message"
    printf "::group::\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "ioncube" "Click to read the ioncube loader license information"
    cat /tmp/ioncube/LICENSE.txt
    echo "::endgroup::"
  else
    printf "\033[31;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s\033[0m\n" "$mark" "$subject" "$message"
  fi
}

# Function to test if extension is loaded.
check_extension() {
  extension=$1
  php -m | grep -i -q -w "$extension"
}

# Function to install ioncube.
install_ioncube() {
  if [ ! -e "$ext_dir/ioncube.so" ]; then
    os_name='lin'
    status='Installed and enabled'
    [ "$(uname -s)" = "Darwin" ] && os_name='mac'
    curl -sSL https://downloads.ioncube.com/loader_downloads/ioncube_loaders_"$os_name"_x86-64.tar.gz | tar -xzf - -C /tmp
    sudo mv /tmp/ioncube/ioncube_loader_"$os_name"_"$version".so "$ext_dir/ioncube.so"
  fi
  echo "zend_extension=$ext_dir/ioncube.so" | sudo tee "$scan_dir/00-ioncube.ini"
}

version=$1
tick='✓'
cross='✗'
scan_dir=$(php --ini | grep additional | sed -e "s|.*: s*||")
ext_dir=$(php -i | grep "extension_dir => /" | sed -e "s|.*=> s*||")
status='Enabled'
install_ioncube >/dev/null 2>&1
(check_extension "ioncube" && add_log "$tick" "ioncube" "$status") || add_log "$cross" "ioncube" "Could not install ioncube"
