# Helper function to add gearman extension.
add_gearman_helper() {
  sudo "${debconf_fix:?}" add-apt-repository ppa:ondrej/pkg-gearman -y
  if [ -e "${ext_dir:?}/gearman.so" ] && [ "$DISTRIB_RELEASE" != "16.04" ]; then
    ${apt_install:?} libgearman-dev
    echo "extension=gearman.so" | sudo tee -a "${scan_dir:?}/20-gearman.ini" >/dev/null 2>&1
  else
    status="Installed and enabled"
    if [ "$DISTRIB_RELEASE" = "16.04" ]; then
      sudo "${debconf_fix:?}" apt-get update -y
      ${apt_install:?} php"${version:?}"-gearman
    else
      ${apt_install:?} libgearman-dev php"${version:?}"-gearman
    fi
  fi
}

# Function to add gearman extension.
add_gearman() {
  status="Enabled"
  add_gearman_helper >/dev/null 2>&1
  add_extension_log "gearman" "$status"
}
