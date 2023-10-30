# Function to log result of installing extension.
add_extension_log() {
  (
    check_extension "$(echo "$1" | cut -d '-' -f 1)" && add_log "${tick:?}" "$1" "$2"
  ) || add_log "${cross:?}" "$1" "Could not install $1 on PHP ${semver:?}"
}

# Function to test if extension is loaded.
check_extension() {
  local extension=$1
  local extension_list=/tmp/php${version:?}_extensions
  if [ ! -e "$extension_list" ]; then
    php -m > "$extension_list"
  fi
  if [ "$extension" != "mysql" ]; then
    grep -i -q -w "$extension" "$extension_list" || php -m | grep -i -q -w "$extension"
  else
    grep -i -q "$extension" "$extension_list" || php -m | grep -i -q "$extension"
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
      IFS="#" read -r -a deps_enable <<<"$(printf -- "-d ${2}=%s.so#" "${deps[@]}")"
      if [[ -n "${deps[*]}" ]] && php "${deps_enable[@]}" -d "${2}=$1.so" -m 2>/dev/null | grep -i -q "$1"; then
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
  if ! check_extension "$1" && shared_extension "$1"; then
    modules_dir="/var/lib/php/modules/${version:?}"
    [ -d "$modules_dir" ] && sudo find "$modules_dir" -path "*disabled*$1" -delete
    enable_extension_dependencies "$1" "$2"
    enable_cache_extension_dependencies "$1" "$2"
    if ! [[ "${version:?}" =~ ${old_versions:?} ]] && command -v phpenmod ; then
      sudo sed -Ei "/=(.*\/)?\"?$extension(.so)?\"?$/d" "$pecl_file"
      mod="${ini_dir:?}"/../mods-available/"$1".ini
      if ! [ -e "$mod" ]; then
        priority="${3:-20}";
        mod_priority_line="$(grep -E "^$1=" "${src:?}/configs/mod_priority")";
        [ -n "$mod_priority_line" ] && priority=$(echo "$mod_priority_line" | cut -d'=' -f 2)
        (echo "; priority=$priority"; echo "$2=${ext_dir:?}/$1.so") | sudo tee "$mod" >/dev/null
      fi
      sudo phpenmod -v "$version" "$1" 
    else
      echo "$2=${ext_dir:?}/$1.so" | sudo tee -a "${pecl_file:-${ini_file[@]}}" >/dev/null
    fi
  fi
}

# Function to enable array of extensions
enable_extensions() {
  local extensions=("$@")
  to_wait=()
  for ext in "${extensions[@]}"; do
    enable_extension "$ext" extension  &
    to_wait+=($!)
  done
  wait "${to_wait[@]}"
}

# Function to get a map of extensions and their dependent shared extensions.
get_extension_map() {
  php -d'error_reporting=0' "${src:?}"/scripts/extensions/extension_map.php /tmp/map"$version".orig 
}

# Function to enable extension dependencies which are also extensions.
enable_extension_dependencies() {
  local extension=$1
  local prefix=$2
  [ -e /tmp/extdisabled/"$version"/"$extension" ] || return;
  get_extension_map
  for dependency in $(grep "$extension:" /tmp/map"$version".orig | cut -d ':' -f 2 | tr '\n' ' '); do
    enable_extension "$dependency" "$prefix"
  done
  rm /tmp/extdisabled/"$version"/"$extension"
}

# Function to disable dependent extensions.
disable_extension_dependents() {
  local extension=$1
  for dependent in $(grep -E ".*:.*\s$extension(\s|$)" /tmp/map"$version".orig | cut -d ':' -f 1 | tr '\n' ' '); do
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
  get_extension_map
  sudo sed -i.orig -E -e "/^(zend_)?extension\s*=/d" "${ini_file[@]}" "$pecl_file" 2>/dev/null || true
  sudo find "${ini_dir:-$scan_dir}"/.. -name "*.ini" -not -path "*php.ini" -not -path "*phar.ini" -not -path "*pecl.ini" -not -path "*mods-available*" -delete  || true
  mkdir -p /tmp/extdisabled/"$version"
  sudo rm -f /tmp/php"$version"_extensions
  sudo find "$ext_dir" -name '*.so' -print0 | xargs -0 -n 1 basename -s .so | xargs -I{} touch /tmp/extdisabled/"$version"/{}
  add_log "${tick:?}" "none" "Disabled all shared extensions"
}

# Function to configure PECL.
configure_pecl() {
  [ -z "${pecl_file:-${ini_file[@]}}" ] && return
  if ! [ -e /tmp/pecl_config ]; then
    for script in pear pecl; do
      sudo "$script" channel-update "$script".php.net
    done
    echo '' | sudo tee /tmp/pecl_config 
  fi
}

# Function to add an extension.
add_extension() {
  local extension=$1
  local prefix=$2
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
  states=("stable" "rc" "preview" "beta" "alpha" "snapshot")
  stability="$(echo "$2" | grep -m 1 -Eio "($(IFS='|' ; echo "${states[*]}"))")"
  IFS=' ' read -r -a states <<< "$(echo "${states[@]}" | grep -Eo "$stability.*")"
  major_version=${3:-'[0-9]+'}
  pecl_rest='https://pecl.php.net/rest/r/'
  response=$(get -s -n "" "$pecl_rest$extension"/allreleases.xml)
  for state in "${states[@]}"; do
    pecl_version=$(echo "$response" | grep -m 1 -Eio "($major_version\.[0-9]+\.[0-9]+${state}[0-9]+<)" | cut -d '<' -f 1)
    [ -z "$pecl_version" ] && pecl_version=$(echo "$response" | grep -m 1 -Eio "v>(.*)<\/v>.*$state<" | grep -m 1 -Eo "($major_version\.[0-9]+\.[0-9]+.*)<" | cut -d '<' -f 1)
    [ -n "$pecl_version" ] && break;
  done
  [ -z "$pecl_version" ] && pecl_version=$(echo "$response" | grep -m 1 -Eo "($major_version\.[0-9]+\.[0-9]+)<" | cut -d '<' -f 1)
  echo "$pecl_version"
}

# Function to install PECL extensions and accept default options
pecl_install() {
  local extension=$1
  local prefix=${2:-extension}
  add_pecl 
  cpu_count="$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo '1')"
  prefix_opts="$(parse_args "$extension" CONFIGURE_PREFIX_OPTS) MAKEFLAGS='-j $cpu_count'"
  suffix_opts="$(parse_args "$extension" CONFIGURE_OPTS) $(parse_args "$extension" CONFIGURE_SUFFIX_OPTS)"
  IFS=' ' read -r -a libraries <<<"$(parse_args "$extension" LIBS) $(parse_args "$extension" "$(uname -s)"_LIBS)"
  (( ${#libraries[@]} )) && add_libs "${libraries[@]}" 
  disable_extension_helper "${extension%-*}" 
  if [ "$version" = "5.3" ]; then
    yes '' 2>/dev/null | sudo "$prefix_opts" pecl install -f "$extension" 
  else
    yes '' 2>/dev/null | sudo "$prefix_opts" pecl install -f -D "$(parse_pecl_configure_options "$suffix_opts")" "$extension" 
  fi
  local exit_code=$?
  sudo pecl info "$extension" | grep -iq 'zend extension' && prefix=zend_extension
  enable_extension "${extension%-*}" "$prefix"
  return "$exit_code"
}

# Function to install a specific version of PECL extension.
add_pecl_extension() {
  local extension=$1
  local pecl_version=$2
  local prefix=$3
  enable_extension "$extension" "$prefix"
  if [[ $pecl_version =~ .*(alpha|beta|rc|snapshot|preview).* ]]; then
    pecl_version=$(get_pecl_version "$extension" "$pecl_version")
  fi
  ext_version=$(php -r "echo phpversion('$extension');")
  if check_extension "$extension" && [[ -z "$pecl_version" || (-n "$pecl_version" && "${ext_version/-/}" == "$pecl_version") ]]; then
    add_log "${tick:?}" "$extension" "Enabled"
  else
    [ -n "$pecl_version" ] && pecl_version="-$pecl_version"
    pecl_install "$extension$pecl_version" || add_extension "$extension" "$(get_extension_prefix "$extension")" 
    extension_version="$(php -r "echo phpversion('$extension');")"
    [ -n "$extension_version" ] && extension_version="-$extension_version"
    add_extension_log "$extension$extension_version" "Installed and enabled"
  fi
}

# Function to setup pre-release extensions using PECL.
add_unstable_extension() {
  local extension=$1
  local stability=$2
  local prefix=$3
  pecl_version=$(get_pecl_version "$extension" "$stability")
  add_pecl_extension "$extension" "$pecl_version" "$prefix"
}

# Function to get extension prefix
get_extension_prefix() {
  echo "$1" | grep -Eq "xdebug([2-3])?$|opcache|ioncube|eaccelerator" && echo zend_extension || echo extension
}
