# Function to log result of a operation.
add_license_log() {
  printf "::group::\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "ioncube" "Click to read the ioncube loader license information"
  cat /tmp/ioncube/LICENSE.txt
  echo "::endgroup::"
}

# Function to install ioncube.
add_ioncube() {
  if [ ! -e "${ext_dir:?}/ioncube.so" ]; then
    status='Installed and enabled'
    os_name='lin' && [ "$(uname -s)" = "Darwin" ] && os_name='mac'
    get -s -n "" https://downloads.ioncube.com/loader_downloads/ioncube_loaders_"$os_name"_x86-64.tar.gz | tar -xzf - -C /tmp
    sudo mv /tmp/ioncube/ioncube_loader_"$os_name"_"${version:?}".so "$ext_dir/ioncube.so"
  fi
  echo "zend_extension=$ext_dir/ioncube.so" | sudo tee "${scan_dir:?}/00-ioncube.ini" >/dev/null 2>&1
  add_extension_log "ioncube" "$status"
  check_extension "ioncube" && add_license_log
}
