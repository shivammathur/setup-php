# Function to install blackfire extension.
add_blackfire() {
  local extension=$1
  version=${version:?}
  no_dot_version=${version/./}
  platform=$(uname -s | tr '[:upper:]' '[:lower:]')
  extension_version=$(echo "$extension" | cut -d '-' -f 2)
  status='Enabled'
  if ! shared_extension blackfire; then
    status='Installed and enabled'
    arch="$(uname -m)"
    arch_name="amd64"
    [[ "$arch" = "aarch64" || "$arch" = "arm64" ]] && arch_name="arm64"
    [ "${ts:?}" = 'zts' ] && no_dot_version="${no_dot_version}-zts"
    if [ "$extension_version" = "blackfire" ]; then
      if [[ ${version:?} =~ 5.[3-6] ]]; then
        extension_version='1.50.0'
      else
        extension_version=$(get -s -n "" https://blackfire.io/api/v1/releases | grep -Eo 'php":"([0-9]+.[0-9]+.[0-9]+)' | cut -d '"' -f 3)
      fi
    fi
    get -q -n "${ext_dir:?}/blackfire.so" https://packages.blackfire.io/binaries/blackfire-php/"$extension_version"/blackfire-php-"$platform"_"$arch_name"-php-"$no_dot_version".so >/dev/null 2>&1
  fi
  if [ -e "${ext_dir:?}/blackfire.so" ]; then
    disable_extension xdebug >/dev/null 2>&1
    disable_extension pcov >/dev/null 2>&1
    enable_extension blackfire extension
    add_extension_log blackfire "$status"
  else
    add_extension_log blackfire "Could not install blackfire on PHP ${semver:?}"
  fi
}
