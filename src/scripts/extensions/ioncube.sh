# Function to log result of a operation.
add_license_log() {
  printf "$GROUP\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "ioncube" "Click to read the ioncube loader license information"
  cat "${ext_dir:?}"/IONCUBE_LICENSE.txt
  echo "$END_GROUP"
}

# Function to install ioncube.
add_ioncube() {
  status='Enabled'
  if ! shared_extension ioncube; then
    status='Installed and enabled'
    os_name='lin' && [ "$(uname -s)" = "Darwin" ] && os_name='mac'
    get -s -n "" https://downloads.ioncube.com/loader_downloads/ioncube_loaders_"$os_name"_x86-64.tar.gz | tar -xzf - -C /tmp
    sudo mv /tmp/ioncube/ioncube_loader_"$os_name"_"${version:?}".so "${ext_dir:?}/ioncube.so"
    sudo cp /tmp/ioncube/LICENSE.txt "$ext_dir"/IONCUBE_LICENSE.txt
  fi
  echo "zend_extension=$ext_dir/ioncube.so" | sudo tee "${scan_dir:?}/00-ioncube.ini" 
  add_extension_log "ioncube" "$status"
  check_extension "ioncube" && add_license_log
}
