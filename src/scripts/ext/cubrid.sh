# Function to log license details.
add_license_log() {
  printf "::group::\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "$ext" "Click to read the $ext related license information"
  printf "Cubrid CCI package is required for %s extension.\n" "$ext"
  printf "The extension %s and Cubrid CCI are provided under the license linked below.\n" "$ext"
  printf "Refer to: \033[35;1m%s \033[0m\n" "https://github.com/CUBRID/cubrid-cci/blob/develop/COPYING"
  echo "::endgroup::"
}

# Function to set cubrid repo for the extension.
set_cubrid_repo() {
  case "${ext:?}" in
    "cubrid") cubrid_repo="cubrid-php";;
    "pdo_cubrid") cubrid_repo="cubrid-pdo";;
  esac
}

# Function to set cubrid branch for a PHP version.
set_cubrid_branch() {
  case "${version:?}" in
    5.[3-6]) cubrid_branch="RB-9.3.0";;
    *) cubrid_branch="develop";;
  esac
}

add_cubrid_helper() {
  if ! [ -e "${ext_dir:?}/$ext.so" ]; then
    status='Installed and enabled'
    set_cubrid_repo
    set_cubrid_branch
    (
      git clone -b "$cubrid_branch" --recursive "https://github.com/CUBRID/$cubrid_repo" "/tmp/$cubrid_repo"
      cd "/tmp/$cubrid_repo" || exit
      ! [[ "$version" =~ ${old_versions:?} ]] && add_devtools
      phpize && ./configure --with-php-config="$(command -v php-config)" --with-"${ext/_/-}"=shared
      make -j"$(nproc)"
      sudo make install
    )
    echo "extension=$ext.so" | sudo tee "${scan_dir:?}/$ext.ini"
  fi
}

# Function to add cubrid and pdo_cubrid.
add_cubrid() {
  ext=$1
  status='Enabled'
  add_cubrid_helper >/dev/null 2>&1
  add_extension_log "$ext" "$status"
  check_extension "$ext" && add_license_log
}