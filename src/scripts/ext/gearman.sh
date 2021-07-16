# Helper function to add gearman extension.
add_gearman_helper() {
  add_ppa ondrej/pkg-gearman
  sudo DEBIAN_FRONTEND=noninteractive apt-fast install -y libgearman-dev
  enable_extension gearman extension
  if ! check_extension gearman; then
    status="Installed and enabled"
    sudo DEBIAN_FRONTEND=noninteractive apt-fast install -y php"${version:?}"-gearman || pecl_install gearman
    enable_extension gearman extension
  fi
}

# Function to add gearman extension.
add_gearman() {
  status="Enabled"
  add_gearman_helper 
  if check_extension gearman; then
    add_log "${tick:?}" "gearman" "$status"
  fi
}

add_gearman
