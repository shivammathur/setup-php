# Function to setup environment for self-hosted runners.
self_hosted_helper() {
  if ! command -v apt-fast >/dev/null; then
    sudo ln -sf /usr/bin/apt-get /usr/bin/apt-fast
  fi
  install_packages curl make software-properties-common unzip
  add_ppa
}

# Function to backup and cleanup package lists.
cleanup_lists() {
  if [ ! -e /etc/apt/sources.list.d.save ]; then
    sudo mv /etc/apt/sources.list.d /etc/apt/sources.list.d.save
    sudo mkdir /etc/apt/sources.list.d
    sudo mv /etc/apt/sources.list.d.save/*ondrej*.list /etc/apt/sources.list.d/
    sudo mv /etc/apt/sources.list.d.save/*dotdeb*.list /etc/apt/sources.list.d/ 2>/dev/null || true
    trap "sudo mv /etc/apt/sources.list.d.save/*.list /etc/apt/sources.list.d/ 2>/dev/null" exit
  fi
}

# Function to add ppa:ondrej/php.
add_ppa() {
  if ! apt-cache policy | grep -q ondrej/php; then
    cleanup_lists
    LC_ALL=C.UTF-8 sudo apt-add-repository ppa:ondrej/php -y
    if [ "$DISTRIB_RELEASE" = "16.04" ]; then
      sudo "$debconf_fix" apt-get update
    fi
  fi
}

# Function to update the package lists.
update_lists() {
  if [ ! -e /tmp/setup_php ]; then
    [ "$DISTRIB_RELEASE" = "20.04" ] && add_ppa >/dev/null 2>&1
    cleanup_lists
    sudo "$debconf_fix" apt-get update >/dev/null 2>&1
    echo '' | sudo tee /tmp/setup_php >/dev/null 2>&1
  fi
}

# Function to install a package
install_packages() {
  packages=("$@")
  $apt_install "${packages[@]}" >/dev/null 2>&1 || update_lists && $apt_install "${packages[@]}" >/dev/null 2>&1
}

# Function to delete extensions.
delete_extension() {
  extension=$1
  sudo sed -i "/$extension/d" "${ini_file:?}"
  sudo sed -i "/$extension/d" "${pecl_file:?}"
  sudo rm -rf "${scan_dir:?}"/*"$extension"* "${ext_dir:?}"/"$extension".so >/dev/null 2>&1
  if [ "${runner:?}" = "self-hosted" ]; then
    $apt_remove "php-$extension" "php$version-$extension" >/dev/null 2>&1 || true
  fi
}

# Function to disable and delete extensions.
remove_extension() {
  extension=$1
  if check_extension "$extension"; then
    if [[ ! "$version" =~ ${old_versions:?} ]] && [ -e /etc/php/"$version"/mods-available/"$extension".ini ]; then
      sudo phpdismod -v "$version" "$extension" >/dev/null 2>&1
    fi
    delete_extension "$extension"
    (! check_extension "$extension" && add_log "${tick:?}" ":$extension" "Removed") ||
      add_log "${cross:?}" ":$extension" "Could not remove $extension on PHP ${semver:?}"
  else
    add_log "${tick:?}" ":$extension" "Could not find $extension on PHP $semver"
  fi
}

# Function to add PDO extension.
add_pdo_extension() {
  pdo_ext="pdo_$1"
  if check_extension "$pdo_ext"; then
    add_log "${tick:?}" "$pdo_ext" "Enabled"
  else
    ext=$1; ext_name=$1;
    sudo rm -rf "$scan_dir"/*pdo.ini >/dev/null 2>&1
    if ! check_extension "pdo" 2>/dev/null; then echo "extension=pdo.so" >>"$ini_file"; fi
    if [ "$ext" = "mysql" ]; then
      enable_extension "mysqlnd" "extension"
      ext_name="mysqli"
    elif [ "$ext" = "sqlite" ]; then
      ext="sqlite3"; ext_name="sqlite3";
    fi
    add_extension "$ext_name" "extension" >/dev/null 2>&1
    add_extension "$pdo_ext" "extension" >/dev/null 2>&1
    add_extension_log "$pdo_ext" "Enabled"
  fi
}

# Function to add extensions.
add_extension() {
  extension=$1
  prefix=$2
  enable_extension "$extension" "$prefix"
  if check_extension "$extension"; then
    add_log "${tick:?}" "$extension" "Enabled"
  else
    if [[ "$version" =~ 5.[4-5] ]]; then
      install_packages "php5-$extension=$release_version"
    elif [[ "$version" =~ ${nightly_versions:?} ]]; then
      pecl_install "$extension"
    else
      install_packages "php$version-$extension" || pecl_install "$extension"
    fi
    add_extension_log "$extension" "Installed and enabled"
  fi
  sudo chmod 777 "$ini_file"
}

# Function to install a PECL version.
add_pecl_extension() {
  extension=$1
  pecl_version=$2
  prefix=$3
  if [[ $pecl_version =~ .*(alpha|beta|rc|snapshot|preview).* ]]; then
    pecl_version=$(get_pecl_version "$extension" "$pecl_version")
  fi
  enable_extension "$extension" "$prefix"
  ext_version=$(php -r "echo phpversion('$extension');")
  if [ "$ext_version" = "$pecl_version" ]; then
    add_log "${tick:?}" "$extension" "Enabled"
  else
    delete_extension "$extension"
    pecl_install "$extension-$pecl_version"
    add_extension_log "$extension-$pecl_version" "Installed and enabled"
  fi
}

# Function to install extension from source
add_extension_from_source() {
  extension=$1
  repo=$2
  release=$3
  args=$4
  prefix=$5
  (
    add_devtools phpize
    delete_extension "$extension"
    curl -o /tmp/"$extension".tar.gz "${curl_opts[@]:?}" https://github.com/"$repo"/archive/"$release".tar.gz
    tar xf /tmp/"$extension".tar.gz -C /tmp
    cd /tmp/"$extension-$release" || exit 1
    phpize && ./configure "$args" && make -j"$(nproc)" && sudo make install
    enable_extension "$extension" "$prefix"
  ) >/dev/null 2>&1
  add_extension_log "$extension-$release" "Installed and enabled"
}

# Function to setup phpize and php-config.
add_devtools() {
  tool=$1
  if ! command -v "$tool$version" >/dev/null; then
    install_packages "php$version-dev" "php$version-xml"
  fi
  sudo update-alternatives --set php-config /usr/bin/php-config"$version" >/dev/null 2>&1
  sudo update-alternatives --set phpize /usr/bin/phpize"$version" >/dev/null 2>&1
  if command -v pecl >/dev/null; then
    configure_pecl >/dev/null 2>&1
  fi
  add_log "${tick:?}" "$tool" "Added $tool $semver"
}

# Function to setup the nightly build from shivammathur/php-builder
setup_nightly() {
  curl "${curl_opts[@]:?}" "${github:?}"/php-builder/releases/latest/download/install.sh | bash -s "$runner" "$version"
}

# Function to setup PHP 5.3, PHP 5.4 and PHP 5.5.
setup_old_versions() {
  curl "${curl_opts[@]:?}" "${github:?}"/php5-ubuntu/releases/latest/download/install.sh | bash -s "$version"
  configure_pecl
  release_version=$(php -v | head -n 1 | cut -d' ' -f 2)
}

# Function to add PECL.
add_pecl() {
  add_devtools phpize >/dev/null 2>&1
  if ! command -v pecl >/dev/null; then
    install_packages php-pear
  fi
  configure_pecl >/dev/null 2>&1
  pecl_version=$(get_tool_version "pecl" "version")
  add_log "${tick:?}" "PECL" "Added PECL $pecl_version"
}

# Function to switch versions of PHP binaries.
switch_version() {
  for tool in pear pecl php phar phar.phar php-cgi php-config phpize phpdbg; do
    if [ -e "/usr/bin/$tool$version" ]; then
      sudo update-alternatives --set $tool /usr/bin/"$tool$version" &
      to_wait+=( $! )
    fi
  done
  wait "${to_wait[@]}"
}

# Function to install packaged PHP
add_packaged_php() {
  if [ "$runner" = "self-hosted" ] || [ "${use_package_cache:-true}" = "false" ]; then
    update_lists
    IFS=' ' read -r -a packages <<<"$(echo "cli curl mbstring xml intl" | sed "s/[^ ]*/php$version-&/g")"
    $apt_install "${packages[@]}"
  else
    curl "${curl_opts[@]:?}" "${github:?}"/php-ubuntu/releases/latest/download/install.sh | bash -s "$version"
  fi
}

# Function to update PHP.
update_php() {
  initial_version=$(php_semver)
  use_package_cache="false" add_packaged_php
  updated_version=$(php_semver)
  if [ "$updated_version" != "$initial_version" ]; then
    status="Updated to"
  else
    status="Switched to"
  fi
}

# Function to install PHP.
add_php() {
  if [[ "$version" =~ ${nightly_versions:?} ]]; then
    setup_nightly
  elif [[ "$version" =~ ${old_versions:?} ]]; then
    setup_old_versions
  else
    add_packaged_php
  fi
  status="Installed"
}

# Function to Setup PHP
setup_php() {
  step_log "Setup PHP"
  sudo mkdir -m 777 -p /var/run /run/php
  if [ "$(php-config --version 2>/dev/null | cut -c 1-3)" != "$version" ]; then
    if [ ! -e "/usr/bin/php$version" ]; then
      add_php >/dev/null 2>&1
    else
      if [ "${update:?}" = "true" ]; then
        update_php >/dev/null 2>&1
      else
        status="Switched to"
      fi
    fi
    if ! [[ "$version" =~ ${old_versions:?}|${nightly_versions:?} ]]; then
      switch_version >/dev/null 2>&1
    fi
  else
    if [ "$update" = "true" ]; then
      update_php >/dev/null 2>&1
    else
      status="Found"
    fi
  fi
  semver=$(php_semver)
  ext_dir=$(php -i | grep "extension_dir => /" | sed -e "s|.*=> s*||")
  scan_dir=$(php --ini | grep additional | sed -e "s|.*: s*||")
  ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
  pecl_file="$scan_dir"/99-pecl.ini
  echo '' | sudo tee "$pecl_file" >/dev/null 2>&1
  sudo rm -rf /usr/local/bin/phpunit >/dev/null 2>&1
  sudo chmod 777 "$ini_file" "$pecl_file" "${tool_path_dir:?}"
  sudo cp "$dist"/../src/configs/*.json "$RUNNER_TOOL_CACHE/"
  add_log "${tick:?}" "PHP" "$status PHP $semver"
}

# Variables
version=$1
dist=$2
debconf_fix="DEBIAN_FRONTEND=noninteractive"
apt_install="sudo $debconf_fix apt-get install -y"
apt_remove="sudo $debconf_fix apt-get remove -y"

# shellcheck source=.
. "${dist}"/../src/scripts/common.sh
. /etc/lsb-release
read_env
self_hosted_setup
setup_php
