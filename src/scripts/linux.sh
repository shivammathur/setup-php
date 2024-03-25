# Function to add sudo
add_sudo() {
  if ! command -v sudo >/dev/null; then
    check_package sudo || apt-get update
    apt-get install -y sudo || (apt-get update && apt-get install -y sudo)
  fi
}

# Function to setup environment for self-hosted runners.
self_hosted_helper() {
  if ! command -v apt-fast >/dev/null; then
    sudo ln -sf /usr/bin/apt-get /usr/bin/apt-fast
    trap "sudo rm -f /usr/bin/apt-fast 2>/dev/null" exit
  fi
  install_packages apt-transport-https ca-certificates curl file make jq unzip autoconf automake gcc g++ gnupg
}

# Function to fix broken packages.
fix_broken_packages() {
  sudo apt --fix-broken install 
}

# Function to install a package
install_packages() {
  packages=("$@")
  $apt_install "${packages[@]}"  || (update_lists && fix_broken_packages && $apt_install "${packages[@]}" )
}

# Function to disable an extension.
disable_extension_helper() {
  local extension=$1
  local disable_dependents=${2:-false}
  get_extension_map
  if [ "$disable_dependents" = "true" ]; then
    disable_extension_dependents "$extension"
  fi
  sudo sed -Ei "/=(.*\/)?\"?$extension(.so)?\"?$/d" "${ini_file[@]}" "$pecl_file"
  sudo find "$ini_dir"/.. -name "*-$extension.ini" -not -path "*phar.ini" -not -path "*pecl.ini" -not -path "*mods-available*" -delete  || true
  sudo rm -f /tmp/php"$version"_extensions
  mkdir -p /tmp/extdisabled/"$version"
  echo '' | sudo tee /tmp/extdisabled/"$version"/"$extension" 
}

# Function to add PDO extension.
add_pdo_extension() {
  pdo_ext="pdo_$1"
  if check_extension "$pdo_ext"; then
    add_log "${tick:?}" "$pdo_ext" "Enabled"
  else
    ext=$1
    ext_name=$1
    if shared_extension pdo; then
      disable_extension_helper pdo
      echo "extension=pdo.so" | sudo tee "${ini_file[@]/php.ini/conf.d/10-pdo.ini}" 
    fi
    if [ "$ext" = "mysql" ]; then
      enable_extension "mysqlnd" "extension"
      ext_name='mysqli'
    elif [ "$ext" = "dblib" ]; then
      ext_name="sybase"
    elif [ "$ext" = "firebird" ]; then
      install_packages libfbclient2 
      enable_extension "pdo_firebird" "extension"
      ext_name="interbase"
    elif [ "$ext" = "sqlite" ]; then
      ext="sqlite3"
      ext_name="sqlite3"
    fi
    add_extension "$ext_name" "extension" 
    add_extension "$pdo_ext" "extension" 
    add_extension_log "$pdo_ext" "Enabled"
  fi
}

# Function to check if a package exists
check_package() {
  apt-cache policy "$1" 2>/dev/null | grep -q 'Candidate'
}

# Helper function to add an extension.
add_extension_helper() {
  local extension=$1
  packages=(php"$version"-"$extension")
  add_ppa ondrej/php  || update_ppa ondrej/php
  [ "${debug:?}" = "debug" ] && check_package php"$version"-"$extension"-dbgsym && packages+=(php"$version"-"$extension"-dbgsym)
  (check_package "${packages[0]}" && install_packages "${packages[@]}") || pecl_install "$extension"
  add_extension_log "$extension" "Installed and enabled"
  sudo chmod 777 "${ini_file[@]}"
}

# Function to setup phpize and php-config.
add_devtools() {
  tool=$1
  if ! command -v "$tool$version" >/dev/null; then
    install_packages "php$version-dev"
  fi
  switch_version "phpize" "php-config"
  add_extension xml extension 
  add_log "${tick:?}" "$tool" "Added $tool $semver"
}

# Function to setup the nightly build from shivammathur/php-builder
setup_nightly() {
  run_script "php-builder" "${runner:?}" "$version" "${debug:?}" "${ts:?}"
}

# Function to setup PHP 5.3, PHP 5.4 and PHP 5.5.
setup_old_versions() {
  run_script "php5-ubuntu" "$version"
}

# Function to setup PHP from the cached builds.
setup_cached_versions() {
  run_script "php-ubuntu" "$version" "${debug:?}" "${ts:?}"
}

# Function to add PECL.
add_pecl() {
  add_devtools phpize 
  if ! command -v pecl >/dev/null; then
    install_packages php-pear
  fi
  configure_pecl 
  pear_version=$(get_tool_version "pecl" "version")
  add_log "${tick:?}" "PECL" "Added PECL $pear_version"
}

# Function to switch versions of PHP binaries.
switch_version() {
  tools=("$@")
  to_wait=()
  if ! (( ${#tools[@]} )); then
    tools+=(pear pecl php phar phar.phar php-cgi php-config phpize phpdbg)
    [ -e /usr/lib/cgi-bin/php"$version" ] && sudo update-alternatives --set php-cgi-bin /usr/lib/cgi-bin/php"$version" & to_wait+=($!)
    [ -e /usr/sbin/php-fpm"$version" ] && sudo update-alternatives --set php-fpm /usr/sbin/php-fpm"$version" & to_wait+=($!)
    [ -e /run/php/php"$version"-fpm.sock ] && sudo update-alternatives --set php-fpm.sock /run/php/php"$version"-fpm.sock & to_wait+=($!)
  fi
  for tool in "${tools[@]}"; do
    if [ -e "/usr/bin/$tool$version" ]; then
      sudo update-alternatives --set "$tool" /usr/bin/"$tool$version" &
      to_wait+=($!)
    fi
  done
  wait "${to_wait[@]}"
}

# Function to get packages to install
get_php_packages() {
  sed "s/[^ ]*/php$version-&/g" "$src"/configs/php_packages | tr '\n' ' '
  if [ "${debug:?}" = "debug" ]; then
    sed "s/[^ ]*/php$version-&-dbgsym/g" "$src"/configs/php_debug_packages | tr '\n' ' '
  fi
}

# Function to install packaged PHP
add_packaged_php() {
  add_ppa ondrej/php  || update_ppa ondrej/php
  IFS=' ' read -r -a packages <<<"$(get_php_packages)"
  install_packages "${packages[@]}"
}

# Function to update PHP.
update_php() {
  initial_version="$(php_semver)$(php_extra_version)"
  add_php
  updated_version="$(php_semver)$(php_extra_version)"
  if [ "$updated_version" != "$initial_version" ]; then
    status="Updated to"
  else
    status="Found"
  fi
}

# Function to install PHP.
add_php() {
  if [ "${runner:?}" = "self-hosted" ] || [ "${use_package_cache:-true}" = "false" ]; then
    if [[ "$version" =~ ${nightly_versions:?} ]]; then
        setup_nightly
    else
      add_packaged_php
      switch_version 
      add_pecl
    fi
  elif [[ "$version" =~ ${old_versions:?} ]]; then
    setup_old_versions
  else
    setup_cached_versions
  fi
  status="Installed"
}

# Function to ini file for pear and link it to each SAPI.
link_pecl_file() {
  echo '' | sudo tee "$pecl_file" 
  for file in "${ini_file[@]}"; do
    sapi_scan_dir="$(realpath -m "$(dirname "$file")")/conf.d"
    if [ "$sapi_scan_dir" != "$scan_dir" ] && ! [ -h "$sapi_scan_dir" ]; then
      sudo mkdir -p "$sapi_scan_dir"
      sudo ln -sf "$pecl_file" "$sapi_scan_dir/99-pecl.ini"
    fi
  done
}

# Function to get extra version.
php_extra_version() {
  if [ -e /etc/php/"$version"/COMMIT ]; then
    echo " ($(cat "/etc/php/$version/COMMIT"))"
  fi
}

# Function to set php.ini
add_php_config() {
  php_lib_dir=/usr/lib/php/"$version"
  current_ini="$php_lib_dir"/php.ini-current
  current=$(cat "$current_ini" 2>/dev/null)
  if [ "$current" = "$ini" ]; then
    return;
  fi
  if [[ "$ini" = "production" && "x$current" != "xproduction" ]]; then
    echo "${ini_file[@]}" | xargs -n 1 -P 6 sudo cp "$php_lib_dir"/php.ini-production
    if [ -e "$php_lib_dir"/php.ini-production.cli ]; then
      sudo cp "$php_lib_dir"/php.ini-production.cli "$ini_dir"/php.ini
    fi
  elif [ "$ini" = "development" ]; then
    echo "${ini_file[@]}" | xargs -n 1 -P 6 sudo cp "$php_lib_dir"/php.ini-development
  elif [ "$ini" = "none" ]; then
    echo '' | sudo tee "${ini_file[@]}" 
  fi
  echo "$ini" | sudo tee "$current_ini" 
}

# Function to Setup PHP
setup_php() {
  step_log "Setup PHP"
  sudo mkdir -m 777 -p /var/run /run/php
  php_config="$(command -v php-config)"
  if [[ -z "$php_config" ]] || [ "$(php_semver | cut -c 1-3)" != "$version" ]; then
    if [ ! -e "/usr/bin/php$version" ] || [ ! -e "/usr/bin/php-config$version" ]; then
      add_php 
    else
      if ! [[ "$version" =~ ${old_versions:?} ]]; then
        switch_version 
      fi
      if [ "${update:?}" = "true" ]; then
        update_php 
      else
        status="Switched to"
      fi
    fi
    php_config="$(command -v php-config)"
  else
    if [ "$update" = "true" ]; then
      update_php 
    else
      status="Found"
    fi
  fi
  if ! command -v php"$version" >/dev/null; then
    add_log "${cross:?}" "PHP" "Could not setup PHP $version"
    exit 1
  fi
  ext_dir="/usr/$(grep -Po "extension_dir=..[^/]*/\K[^'\"]*" "$php_config")"
  ini_dir="$(php_ini_path)"
  scan_dir="$ini_dir"/conf.d
  pecl_file="$scan_dir"/99-pecl.ini
  semver="$(php_semver)"
  extra_version="$(php_extra_version)"
  export ext_dir
  mapfile -t ini_file < <(sudo find "$ini_dir/.." -name "php.ini" -exec readlink -m {} +)
  link_pecl_file
  configure_php
  set_output "php-version" "$semver"
  sudo rm -rf /usr/local/bin/phpunit 
  sudo chmod 777 "${ini_file[@]}" "$pecl_file" "${tool_path_dir:?}"
  sudo cp "$src"/configs/pm/*.json "$RUNNER_TOOL_CACHE/"
  add_log "${tick:?}" "PHP" "$status PHP $semver$extra_version"
}

# Variables
version=${1:-'8.3'}
ini=${2:-'production'}
src=${0%/*}/..
debconf_fix="DEBIAN_FRONTEND=noninteractive"
apt_install="sudo $debconf_fix apt-fast install -y --no-install-recommends"
scripts="$src"/scripts

add_sudo 

. /etc/os-release
# shellcheck source=.
. "${scripts:?}"/unix.sh
. "${scripts:?}"/tools/ppa.sh
. "${scripts:?}"/tools/add_tools.sh
. "${scripts:?}"/extensions/source.sh
. "${scripts:?}"/extensions/add_extensions.sh
read_env
self_hosted_setup
setup_php
