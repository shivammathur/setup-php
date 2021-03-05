# Helper function to add phalcon.
add_phalcon_helper() {
  status='Installed and enabled'
  if [ "$os_name" = "Linux" ]; then
    update_lists
    if [ "$extension" = "phalcon4" ]; then
      ${apt_install:?} "php${version:?}-psr" "php${version:?}-$extension"
    else
      ${apt_install:?} "php${version:?}-$extension"
    fi
  else
    sed -i '' '/extension.*psr/d' "${ini_file:?}"
    add_brew_tap shivammathur/homebrew-phalcon
    brew install phalcon@"${version:?}"_"$extension_major_version"
    sudo cp "${brew_prefix:?}"/opt/psr@"${version:?}"/psr.so "${ext_dir:?}"
    sudo cp "${brew_prefix:?}"/opt/phalcon@"${version:?}"_"$extension_major_version"/phalcon.so "${ext_dir:?}"
  fi
}

# Function to add phalcon3.
add_phalcon3() {
  if [ -e "${ext_dir:?}/phalcon.so" ]; then
    phalcon_version=$(php -d="extension=phalcon.so" -r "echo phpversion('phalcon');" | cut -d'.' -f 1)
    if [ "$phalcon_version" != "$extension_major_version" ]; then
      add_phalcon_helper
    else
      echo "extension=phalcon.so" | sudo tee -a "$phalcon_ini_file"
    fi
  else
    add_phalcon_helper
  fi
}

# Function to add phalcon4.
add_phalcon4() {
  if [ -e "${ext_dir:?}/psr.so" ] && ! php -m | grep -i -q -w psr; then
    echo "extension=psr.so" | sudo tee -a "${ini_file:?}"
  fi
  if [ -e "$ext_dir/phalcon.so" ]; then
    if php -m | grep -i -q -w psr; then
      phalcon_version=$(php -d="extension=phalcon" -r "echo phpversion('phalcon');" | cut -d'.' -f 1)
      if [ "$phalcon_version" != "$extension_major_version" ]; then
        add_phalcon_helper
      else
        echo "extension=phalcon.so" | sudo tee -a "$phalcon_ini_file"
      fi
    else
      add_phalcon_helper
    fi
  else
    add_phalcon_helper
  fi
}

# Function to add phalcon.
add_phalcon() {
  extension=$1
  status='Enabled'
  os_name=$(uname -s)
  phalcon_ini_file="${pecl_file:-${ini_file[@]}}"
  extension_major_version=${extension: -1}
  if [ "$extension_major_version" = "4" ]; then
    add_phalcon4 >/dev/null 2>&1
  elif [ "$extension_major_version" = "3" ]; then
    add_phalcon3 >/dev/null 2>&1
  fi
  add_extension_log "phalcon" "$status"
}
