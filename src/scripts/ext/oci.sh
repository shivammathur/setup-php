# Function to log result of a operation.
add_license_log() {
  printf "::group::\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "$ext" "Click to read the $ext related license information"
  printf "Oracle Instant Client package is required for %s extension.\n" "$ext"
  printf "It is provided under the Oracle Technology Network Development and Distribution License.\n"
  printf "Refer to: \033[35;1m%s \033[0m\n" "https://www.oracle.com/downloads/licenses/instant-client-lic.html"
  echo "::endgroup::"
}

# Function to install instantclient and SDK.
add_client() {
  if [ ! -e "$oracle_client" ]; then
    sudo mkdir -p -m 777 "$oracle_home" "$oracle_client"
    for package in basiclite sdk; do
      if [ "$os" = 'Linux' ]; then
        libs='/usr/lib/'
        os_name='linux'
        arch='linuxx64'
        lib_ext='so'
      elif [ "$os" = 'Darwin' ]; then
        libs='/usr/local/lib/'
        os_name='mac'
        arch='macos'
        lib_ext='dylib'
      fi
      get -q -n "/opt/oracle/$package.zip" "https://download.oracle.com/otn_software/$os_name/instantclient/instantclient-$package-$arch.zip"
      unzip -o "/opt/oracle/$package.zip" -d "$oracle_home"
    done
    for icdir in /opt/oracle/instantclient_*; do
      sudo mv "$icdir"/* "$oracle_client"/
    done
    sudo ln -sf /opt/oracle/instantclient/*.$lib_ext* $libs
  fi
}

# Function to install oci8 and pdo_oci.
add_oci_helper() {
  if ! [ -e "${ext_dir:?}/$ext.so" ]; then
    status='Installed and enabled'
    read -r "${ext}_LINUX_LIBS" <<< "libaio-dev"
    read -r "${ext}_CONFIGURE_OPTS" <<< "--with-php-config=$(command -v php-config) --with-${ext/_/-}=instantclient,$oracle_client"
    read -r "${ext}_PATH" <<< "ext/$ext"
    patch_phpize
    add_extension_from_source "$ext" https://github.com php php-src "$(php_src_tag)" extension get
    restore_phpize
  fi
}

# Function to add oci extension oci8 and pdo_oci.
add_oci() {
  ext=$1
  status='Enabled'
  oracle_home='/opt/oracle'
  oracle_client=$oracle_home/instantclient
  os=$(uname -s)
  add_client >/dev/null 2>&1
  add_oci_helper >/dev/null 2>&1
  add_extension_log "$ext" "$status"
  check_extension "$ext" && add_license_log
}

# shellcheck source=.
. "${scripts:?}"/ext/patches/phpize.sh
