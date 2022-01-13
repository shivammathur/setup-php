# Function to log result of installing extension.
add_extension_log() {
  (
    check_extension "$(echo "$1" | cut -d '-' -f 1)" && add_log "${tick:?}" "$1" "$2"
  ) || add_log "${cross:?}" "$1" "Could not install $1 on PHP ${semver:?}"
}

# Function to test if extension is loaded.
check_extension() {
  local extension=$1
  if [ "$extension" != "mysql" ]; then
    php -m | grep -i -q -w "$extension"
  else
    php -m | grep -i -q "$extension"
  fi
}

# Function to check if extension is shared
shared_extension() {
  [ -e "${ext_dir:?}/$1.so" ]
}

# Function to enable cached extension's dependencies.
enable_cache_extension_dependencies() {
  if [ -d /tmp/extcache ] && shared_extension "$1"; then
    cache_dir=$(find /tmp/extcache -maxdepth 1 -type d -regex ".*$1[0-9]*")
    if [[ -n "$cache_dir" ]]; then
      IFS=" " read -r -a deps <<<"$(find "$cache_dir" -maxdepth 1 -type f -name "*" -exec basename {} \; | tr '\n' ' ')"
      if [[ -n "${deps[*]}" ]] && php "${deps[@]/#/-d ${2}=}" -d "${2}=$1" -m 2>/dev/null | grep -i -q "$1"; then
        for ext in "${deps[@]}"; do
          sudo rm -rf /tmp/extcache/"$ext"
          enable_extension "$ext" "$2"
        done
      fi
    fi
  fi
}

# Function to enable existing extensions.
enable_extension() {
  modules_dir="/var/lib/php/modules/${version:?}"
  [ -d "$modules_dir" ] && sudo find "$modules_dir" -path "*disabled*$1" -delete
  enable_extension_dependencies "$1" "$2"
  enable_cache_extension_dependencies "$1" "$2"
  if ! check_extension "$1" && shared_extension "$1"; then
    echo "$2=${ext_dir:?}/$1.so" | sudo tee -a "${pecl_file:-${ini_file[@]}}" >/dev/null
  fi
}

# Function to get a map of extensions and their dependent shared extensions.
get_extension_map() {
  php -d'error_reporting=0' "${dist:?}"/../src/scripts/extensions/extension_map.php
}

# Function to enable extension dependencies which are also extensions.
enable_extension_dependencies() {
  local extension=$1
  prefix=$2
  if ! [ -e /tmp/map.orig ]; then
    get_extension_map | sudo tee /tmp/map.orig >/dev/null
  fi
  for dependency in $(grep "$extension:" /tmp/map.orig | cut -d ':' -f 2 | tr '\n' ' '); do
    enable_extension "$dependency" "$prefix"
  done
}

# Function to disable dependent extensions.
disable_extension_dependents() {
  local extension=$1
  for dependent in $(get_extension_map | grep -E ".*:.*\s$extension(\s|$)" | cut -d ':' -f 1 | tr '\n' ' '); do
    disable_extension_helper "$dependent" true
    add_log "${tick:?}" ":$extension" "Disabled $dependent as it depends on $extension"
  done
}

# Function to disable an extension.
disable_extension() {
  local extension=$1
  if check_extension "$extension"; then
    if shared_extension "$extension"; then
      disable_extension_helper "$extension" true
      (! check_extension "$extension" && add_log "${tick:?}" ":$extension" "Disabled") ||
        add_log "${cross:?}" ":$extension" "Could not disable $extension on PHP ${semver:?}"
    else
      add_log "${cross:?}" ":$extension" "Could not disable $extension on PHP $semver as it not a shared extension"
    fi
  elif shared_extension "$extension"; then
    add_log "${tick:?}" ":$extension" "Disabled"
  else
    add_log "${tick:?}" ":$extension" "Could not find $extension on PHP $semver"
  fi
}

# Function to disable shared extensions.
disable_all_shared() {
  sudo sed -i.orig -E -e "/^(zend_)?extension\s*=/d" "${ini_file[@]}" "$pecl_file" 2>/dev/null || true
  sudo find "${ini_dir:-$scan_dir}"/.. -name "*.ini" -not -path "*php.ini" -not -path "*mods-available*" -delete >/dev/null 2>&1 || true
  add_log "${tick:?}" "none" "Disabled all shared extensions"
}

# Function to configure PECL.
configure_pecl() {
  if ! [ -e /tmp/pecl_config ]; then
    for script in pear pecl; do
      sudo "$script" config-set php_ini "${pecl_file:-${ini_file[@]}}"
      sudo "$script" channel-update "$script".php.net
    done
    echo '' | sudo tee /tmp/pecl_config >/dev/null 2>&1
  fi
}

# Function to add an extension.
add_extension() {
  local extension=$1
  prefix=$2
  enable_extension "$extension" "$prefix"
  if check_extension "$extension"; then
    add_log "${tick:?}" "$extension" "Enabled"
  else
    add_extension_helper "$extension" "$prefix"
  fi
}

# Function to get the PECL version of an extension.
get_pecl_version() {
  local extension=$1
  stability="$(echo "$2" | grep -m 1 -Eio "(stable|alpha|beta|rc|snapshot|preview)")"
  pecl_rest='https://pecl.php.net/rest/r/'
  response=$(get -s -n "" "$pecl_rest$extension"/allreleases.xml)
  pecl_version=$(echo "$response" | grep -m 1 -Eio "([0-9]+\.[0-9]+\.[0-9]+${stability}[0-9]+)")
  if [ ! "$pecl_version" ]; then
    pecl_version=$(echo "$response" | grep -m 1 -Eo "([0-9]+\.[0-9]+\.[0-9]+)")
  fi
  echo "$pecl_version"
}

# Function to install PECL extensions and accept default options
pecl_install() {
  local extension=$1
  add_pecl >/dev/null 2>&1
  yes '' 2>/dev/null | sudo pecl install -f "$extension" >/dev/null 2>&1
}

# Function to install a specific version of PECL extension.
add_pecl_extension() {
  local extension=$1
  pecl_version=$2
  prefix=$3
  enable_extension "$extension" "$prefix"
  if [[ $pecl_version =~ .*(alpha|beta|rc|snapshot|preview).* ]]; then
    pecl_version=$(get_pecl_version "$extension" "$pecl_version")
  fi
  ext_version=$(php -r "echo phpversion('$extension');")
  if [ "${ext_version/-/}" = "$pecl_version" ]; then
    add_log "${tick:?}" "$extension" "Enabled"
  else
    disable_extension_helper "$extension" >/dev/null 2>&1
    pecl_install "$extension-$pecl_version"
    add_extension_log "$extension-$pecl_version" "Installed and enabled"
  fi
}

# Function to setup pre-release extensions using PECL.
add_unstable_extension() {
  local extension=$1
  stability=$2
  prefix=$3
  pecl_version=$(get_pecl_version "$extension" "$stability")
  add_pecl_extension "$extension" "$pecl_version" "$prefix"
}
