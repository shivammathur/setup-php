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
  add_gearman_helper >/dev/null 2>&1
  add_extension_log "gearman" "$status"
}
