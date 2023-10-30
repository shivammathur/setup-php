# Helper function to get phalcon version
get_phalcon_version() {
  if [ "$extension" = "phalcon5" ]; then
    get_pecl_version phalcon stable 5
  elif [ "$extension" = "phalcon4" ]; then
    echo '4.1.2'
  elif [ "$extension" = "phalcon3" ]; then
    echo '3.4.5'
  fi
}

# Function to add phalcon from repo.
add_phalcon_from_repo(){
  version=${version:?}
  if [ "$extension" = "phalcon5" ]; then
    PHALCON_PATH=build/phalcon
  else
    PHALCON_PATH=build/php"${version%.*}"/64bits
  fi
  PHALCON_CONFIGURE_OPTS="--enable-phalcon --with-php-config=$(command -v php-config)"
  export PHALCON_PATH
  export PHALCON_CONFIGURE_OPTS
  add_extension_from_source phalcon https://github.com phalcon cphalcon v"$(get_phalcon_version)" extension
}

# Helper function to add phalcon.
add_phalcon_helper() {
  status='Installed and enabled'
  if [ "$(uname -s)" = "Darwin" ]; then
    add_brew_extension "$extension" extension
  else
    package="php${version:?}-$extension"
    add_ppa ondrej/php  || update_ppa ondrej/php
    [ "$extension" = "phalcon4" ] && (install_packages "php${version:?}-psr" || pecl_install psr || pecl_install psr-1.1.0)
    (check_package "$package" && install_packages "$package") || pecl_install phalcon-"$(get_phalcon_version)" || add_phalcon_from_repo
  fi
}

# Function to add phalcon3.
add_phalcon3() {
  if shared_extension phalcon; then
    phalcon_version=$(php -d="extension=phalcon.so" -r "echo phpversion('phalcon');" | cut -d'.' -f 1)
    if [ "$phalcon_version" != "$extension_major_version" ]; then
      add_phalcon_helper
    else
      enable_extension phalcon extension
    fi
  else
    add_phalcon_helper
  fi
}

# Function to add phalcon4.
add_phalcon4() {
  enable_extension psr extension
  if shared_extension phalcon; then
    if check_extension psr; then
      phalcon_version=$(php -d="extension=phalcon" -r "echo phpversion('phalcon');" | cut -d'.' -f 1)
      if [ "$phalcon_version" != "$extension_major_version" ]; then
        add_phalcon_helper
      else
        enable_extension phalcon extension
      fi
    else
      add_phalcon_helper
    fi
  else
    add_phalcon_helper
  fi
}

# Function to add phalcon3.
add_phalcon5() {
  if shared_extension phalcon; then
    phalcon_version=$(php -d="extension=phalcon.so" -r "echo phpversion('phalcon');" | cut -d'.' -f 1)
    if [ "$phalcon_version" != "$extension_major_version" ]; then
      add_phalcon_helper
    else
      enable_extension phalcon extension
    fi
  else
    add_phalcon_helper
  fi
}

# Function to add phalcon.
add_phalcon() {
  local extension=$1
  status='Enabled'
  extension_major_version=${extension: -1}
  if [[ "$extension_major_version" =~ [3-5] ]]; then
    add_phalcon"$extension_major_version" 
  fi
  add_extension_log "phalcon" "$status"
}
