# Function to get sqlsrv and pdo_sqlsrv version.
get_sqlsrv_version() {
  if [[ "${version:?}" =~ 7.[0-3] ]]; then
    echo '5.9.0'
  elif [[ "${version:?}" =~ 7.4 ]]; then
    echo '5.10.1'
  elif [[ "${version:?}" =~ 8.0 ]]; then
    echo '5.11.1'
  else
    # Return an empty string so that pecl will install the latest version.
    echo ''
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
