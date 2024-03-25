# Function to log license details.
add_license_log() {
  printf "$GROUP\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "$ext" "Click to read the $ext related license information"
  printf "Cubrid CCI package is required for %s extension.\n" "$ext"
  printf "The extension %s and Cubrid CCI are provided under the license linked below.\n" "$ext"
  printf "Refer to: \033[35;1m%s \033[0m\n" "https://github.com/CUBRID/cubrid-cci/blob/develop/COPYING"
  echo "$END_GROUP"
}

# Function to setup gcc-7 and g++-7
setup_compiler() {
  if ! command -v gcc-7 >/dev/null || ! command -v g++-7 >/dev/null; then
    add_ppa ubuntu-toolchain-r/test
    add_packages gcc-7 g++-7 -y
  fi
  printf "gcc g++" | xargs -d ' ' -I {} sudo update-alternatives --install /usr/bin/{} {} /usr/bin/{}-7 7
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
  ext=$1
  enable_extension "$ext" extension
  if ! check_extension "$ext"; then
    status='Installed and enabled'
    set_cubrid_repo
    set_cubrid_branch
    patch_phpize
    read -r "${ext}_PREFIX_CONFIGURE_OPTS" <<< "CFLAGS=-Wno-implicit-function-declaration"
    read -r "${ext}_CONFIGURE_OPTS" <<< "--with-php-config=$(command -v php-config)"
    add_extension_from_source "$ext" https://github.com CUBRID "$cubrid_repo" "$cubrid_branch" extension
    restore_phpize
  fi
}

# Function to add cubrid and pdo_cubrid.
add_cubrid() {
  ext=$1
  status='Enabled'
  add_cubrid_helper "$ext" 
  add_extension_log "$ext" "$status"
  check_extension "$ext" && add_license_log
}

# shellcheck source=.
. "${scripts:?}"/extensions/patches/phpize.sh
