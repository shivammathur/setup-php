# Function to log license details for ibm extensions.
add_license_log() {
  printf "$GROUP\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "$ext" "Click to read the $ext related license information"
  printf "IBM Db2 ODBC and CLI Driver is required for %s extension.\n" "$ext"
  printf "Refer to: \033[35;1m%s \033[0m\n" "https://www.ibm.com/support/pages/db2-odbc-cli-driver-download-and-installation-information"
  local license_file="$ibm_cli/license/odbc_notices.txt"
  if [ -f "$license_file" ]; then
    cat "$license_file"
  fi
  echo "$END_GROUP"
}

# Function to determine the driver archive for the current platform.
get_cli_archive() {
  local os=$1
  local arch=$2
  case $os in
    Linux)
      case $arch in
        x86_64|amd64) echo "linuxx64_odbc_cli.tar.gz";;
        i?86) echo "linuxia32_odbc_cli.tar.gz";;
        *) return 1;;
      esac
      ;;
    Darwin)
      case $arch in
        x86_64) echo "macos64_odbc_cli.tar.gz";;
        arm64|aarch64) echo "macarm64_odbc_cli.tar.gz";;
        *) return 1;;
      esac
      ;;
    *)
      return 1
      ;;
  esac
}

# Function to install IBM Db2 CLI driver.
add_cli_driver() {
  local os arch archive url tmp libs
  if [ -d "$ibm_cli" ]; then
    return 0
  fi
  os=$(uname -s)
  arch=$(uname -m)
  archive=$(get_cli_archive "$os" "$arch") || return 1
  url="https://public.dhe.ibm.com/ibmdl/export/pub/software/data/db2/drivers/odbc_cli/$archive"
  tmp=/tmp/$archive
  get -q -n "$tmp" "$url"
  sudo mkdir -p "$ibm_home"
  sudo tar -xzf "$tmp" -C "$ibm_home"
  sudo rm -f "$tmp"
  if [ ! -d "$ibm_cli" ]; then
    local extracted
    extracted=$(find "$ibm_home" -maxdepth 1 -type d -name 'clidriver*' | head -n 1)
    [ -n "$extracted" ] && sudo mv "$extracted" "$ibm_cli"
  fi
  if [ "$os" = "Linux" ]; then
    echo "$ibm_cli/lib" | sudo tee /etc/ld.so.conf.d/ibm_db2.conf >/dev/null
    sudo ldconfig
  else
    libs='/usr/local/lib'
    sudo mkdir -p "$libs"
    sudo ln -sf "$ibm_cli"/lib/*.dylib "$libs" >/dev/null 2>&1 || true
  fi
}

# Function to install ibm_db2 and pdo_ibm.
add_ibm_helper() {
  if ! shared_extension "$ext"; then
    status='Installed and enabled'
    export IBM_DB_HOME="$ibm_cli"
    export LD_LIBRARY_PATH="$IBM_DB_HOME/lib"
    add_env DYLD_LIBRARY_PATH "$IBM_DB_HOME/lib"
    local configure_flag
    if [ "$ext" = 'ibm_db2' ]; then
      configure_flag="--with-IBM_DB2=$IBM_DB_HOME"
    else
      configure_flag="--with-pdo-ibm=$IBM_DB_HOME"
    fi
    read -r "${ext}_CONFIGURE_OPTS" <<< "--with-php-config=$(command -v php-config) $configure_flag"
    patch_phpize
    add_extension_from_source "$ext" https://github.com php "pecl-database-$ext" master extension get
    restore_phpize
  else
    enable_extension "$ext" extension
  fi
}

# Function to add ibm_db2 and pdo_ibm.
add_ibm() {
  ext=$1
  status='Enabled'
  ibm_home='/opt/ibm'
  ibm_cli=$ibm_home/clidriver
  if ! add_cli_driver >/dev/null 2>&1; then
    add_log "${cross:?}" "$ext" "IBM Db2 CLI driver is not available on $(uname -s)/$(uname -m)"
    return 1
  fi
  add_ibm_helper >/dev/null 2>&1
  add_extension_log "$ext" "$status"
  check_extension "$ext" && add_license_log
}

# shellcheck source=.
. "${scripts:?}"/extensions/patches/phpize.sh
