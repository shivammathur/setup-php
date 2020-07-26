# Function to log result of a operation.
add_license_log() {
  printf "::group::\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "$ext" "Click to read the $ext related license information"
  printf "Oracle Instant Client package is required for %s extension.\n" "$ext"
  printf "It is provided under the Oracle Technology Network Development and Distribution License.\n"
  printf "Refer to: \033[35;1m%s \033[0m\n" "https://www.oracle.com/downloads/licenses/instant-client-lic.html"
  echo "::endgroup::"
}

# Function to get the tag for a php version.
get_tag() {
  master_version='8.0'
  tag='master'
  if [ ! "${version:?}" = "$master_version" ]; then
    tag="php-$(php -v | head -n 1 | cut -f 2 -d ' ' | cut -f 1 -d '-')"
  fi
  echo "$tag"
}

# Function to install instantclient and SDK.
add_client() {
  sudo mkdir -p -m 777 "$oracle_home"
  if [ ! -e "$oracle_client" ]; then
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
      curl -o "/opt/oracle/$package.zip" "${curl_opts[@]:?}" "https://download.oracle.com/otn_software/$os_name/instantclient/instantclient-$package-$arch.zip"
      unzip "/opt/oracle/$package.zip" -d "$oracle_home"
    done
    sudo ln -sf /opt/oracle/instantclient*/*.$lib_ext* $libs
    sudo ln -sf /opt/oracle/instantclient* "$oracle_client"
  fi
}

# Function to get PHP source.
get_php() {
  [ ! -d "/opt/oracle/php-src-$tag" ] && curl "${curl_opts[@]}" "https://github.com/php/php-src/archive/$tag.tar.gz" | tar xzf - -C "$oracle_home/"
}

# Function to get phpize location on darwin.
get_phpize() {
  if [[ "$version" =~ 5.[3-5] ]]; then
    echo '/opt/local/bin/phpize'
  else
    echo "/usr/local/bin/$(readlink /usr/local/bin/phpize)"
  fi
}

# Function to patch phpize to link to php headers on darwin.
patch_phpize() {
  if [ "$os" = "Darwin" ]; then
    sudo cp "$phpize_orig" "$phpize_orig.bck"
    sudo sed -i '' 's~includedir=.*~includedir="$(xcrun --show-sdk-path)/usr/include/php"~g' "$phpize_orig"
  fi
}

# Function to restore phpize.
restore_phpize() {
  if [ "$os" = "Darwin" ]; then
    sudo mv "$phpize_orig.bck" "$phpize_orig" || true
  fi
}

# Function to patch pdo_oci.
patch_pdo_oci_config() {
  curl -O "${curl_opts[@]}" https://raw.githubusercontent.com/php/php-src/master/ext/pdo_oci/config.m4
  sudo sed -i '' "/PHP_CHECK_PDO_INCLUDES/d" config.m4 || sudo sed -i "/PHP_CHECK_PDO_INCLUDES/d" config.m4
}

# Function to install the dependencies.
add_dependencies() {
  if [ "$os" = 'Linux' ]; then
    if [ "${runner:?}" = "self-hosted" ]; then
      ${apt_install:?} autoconf automake libaio-dev gcc g++ php"$version"-dev
    else
      update_lists
      ${apt_install:?} php"$version"-dev
    fi
    sudo update-alternatives --set php-config /usr/bin/php-config"$version"
    sudo update-alternatives --set phpize /usr/bin/phpize"$version"
  fi
}

# Function to install oci8 and pdo_oci.
add_oci_helper() {
  if ! [ -e "${ext_dir:?}/$ext.so" ]; then
    status='Installed and enabled'
    phpize_orig=$(get_phpize)
    tag=$(get_tag)
    get_php
    patch_phpize
    (
      cd "/opt/oracle/php-src-$tag/ext/$ext" || exit 1
      [ "$ext" = "pdo_oci" ] && patch_pdo_oci_config
      sudo phpize && ./configure --with-php-config="$(command -v php-config)" --with-"${ext/_/-}"=instantclient,"$oracle_client"
      sudo make -j"$(nproc)"
      sudo cp ./modules/* "$ext_dir/"
    )
    restore_phpize
  fi
  echo "extension=$ext.so" | sudo tee "${scan_dir:?}/99-$ext.ini"
}

# Function to add oci extension oci8 and pdo_oci.
add_oci() {
  ext=$1
  status='Enabled'
  oracle_home='/opt/oracle'
  oracle_client=$oracle_home/instantclient
  os=$(uname -s)
  add_client >/dev/null 2>&1
  add_dependencies >/dev/null 2>&1
  add_oci_helper >/dev/null 2>&1
  add_extension_log "$ext" "$status"
  check_extension "$ext" && add_license_log
}
