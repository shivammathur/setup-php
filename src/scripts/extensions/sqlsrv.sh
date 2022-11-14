# Function to get sqlsrv and pdo_sqlsrv version.
get_sqlsrv_version() {
  if [[ "${version:?}" =~ 7.[0-3] ]]; then
    echo '5.9.0'
  else
    echo '5.10.1'
  fi
}

# Function to install sqlsrv and pdo_sqlsrv.
add_sqlsrv() {
  ext=$1
  ext_version=$(get_sqlsrv_version)
  if [ "$(uname -s)" = 'Linux' ]; then
    install_packages unixodbc-dev
    add_pecl_extension "$ext" "$ext_version" extension
  else
    add_brew_extension "$ext" extension
  fi
}
