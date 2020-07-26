# Function to install blackfire extension.
add_blackfire() {
  extension=$1
  version=${version:?}
  no_dot_version=${version/./}
  platform=$(uname -s | tr '[:upper:]' '[:lower:]')
  extension_version=$(echo "$extension" | cut -d '-' -f 2)
  blackfire_ini_file="${scan_dir:?}/50-blackfire.ini"
  if [ ! -e "${ext_dir:?}/blackfire.so" ]; then
    if [ "$extension_version" = "blackfire" ]; then
      extension_version=$(curl -sSL https://blackfire.io/api/v1/releases | grep -Eo 'php":"([0-9]+.[0-9]+.[0-9]+)' | cut -d '"' -f 3)
    fi
    sudo curl -o "${ext_dir:?}/blackfire.so" "${curl_opts[@]:?}" https://packages.blackfire.io/binaries/blackfire-php/"$extension_version"/blackfire-php-"$platform"_amd64-php-"$no_dot_version".so >/dev/null 2>&1
  fi
  echo "extension=blackfire.so" | sudo tee -a "$blackfire_ini_file" >/dev/null 2>&1
  add_extension_log "$extension-$extension_version" "Installed and enabled"
}
