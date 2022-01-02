# Helper function to add phalcon.
add_phalcon_helper() {
  status='Installed and enabled'
  if [ "$(uname -s)" = "Darwin" ]; then
    add_brew_extension "$extension" extension
  else
    packages=("php${version:?}-$extension")
    [ "$extension" = "phalcon4" ] && packages+=("php${version:?}-psr")
    add_ppa ondrej/php >/dev/null 2>&1 || update_ppa ondrej/php
    check_package "${packages[0]}" && install_packages "${packages[@]}"
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

# Function to add phalcon.
add_phalcon() {
  extension=$1
  status='Enabled'
  extension_major_version=${extension: -1}
  if [ "$extension_major_version" = "4" ]; then
    add_phalcon4 >/dev/null 2>&1
  elif [ "$extension_major_version" = "3" ]; then
    add_phalcon3 >/dev/null 2>&1
  fi
  add_extension_log "phalcon" "$status"
}
