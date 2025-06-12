# Helper function to add gearman extension.
add_gearman_helper() {
  add_ppa ondrej/pkg-gearman
  install_packages libgearman-dev
  enable_extension gearman extension
  if ! check_extension gearman; then
    status="Installed and enabled"
    if [[ "${version:?}" =~ 5.[3-5] ]]; then
      pecl_install gearman-1.1.2
    else
      install_packages php"${version:?}"-gearman || pecl_install gearman
    fi
    enable_extension gearman extension
  fi
}

# Function to add gearman extension.
add_gearman() {
  status="Enabled"
  if [ "$(uname -s)" = 'Linux' ]; then
    add_gearman_helper 
    add_extension_log "gearman" "$status"
  else
    add_brew_extension gearman extension
  fi
}
