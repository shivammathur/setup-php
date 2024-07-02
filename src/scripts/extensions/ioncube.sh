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
    arch="$(uname -m)"
    if [ "$(uname -s)" = "Darwin" ]; then
      [ "$arch" = "arm64" ] && os_suffix="dar_arm64" || os_suffix="mac_x86-64"
    else
      [[ "$arch" = "i386" || "$arch" = "i686" ]] && arch=x86
      [[ "$arch" = "x86_64" ]] && arch=x86-64
      os_suffix="lin_$arch"
    fi
    ts_part="" && [ "${ts:?}" = "zts" ] && ts_part="_ts"
    get -s -n "" https://downloads.ioncube.com/loader_downloads/ioncube_loaders_"$os_suffix".tar.gz | tar -xzf - -C /tmp
    loader_file=/tmp/ioncube/ioncube_loader_"${os_suffix%%_*}_${version:?}$ts_part".so
    if [ -e "$loader_file" ]; then
      sudo mv /tmp/ioncube/ioncube_loader_"${os_suffix%%_*}_${version:?}$ts_part".so "${ext_dir:?}/ioncube.so"
      sudo cp /tmp/ioncube/LICENSE.txt "$ext_dir"/IONCUBE_LICENSE.txt
      echo "zend_extension=$ext_dir/ioncube.so" | sudo tee "${scan_dir:?}/00-ioncube.ini" >/dev/null 2>&1
    fi
  else
    echo "zend_extension=$ext_dir/ioncube.so" | sudo tee "${scan_dir:?}/00-ioncube.ini" >/dev/null 2>&1
  fi
  add_extension_log "ioncube" "$status"
  check_extension "ioncube" && add_license_log
}
