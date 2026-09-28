# Helper function to compile and install geos
add_geos_helper() {
  if [[ "$os" = "Linux" || "${version:?}" =~ 5.[3-5] ]]; then
    export GEOS_LINUX_LIBS='libgeos-dev'
    export GEOS_DARWIN_LIBS='geos'
    add_extension_from_source geos https://github.com libgeos php-geos 1.0.0 extension get
  else
    add_brew_extension geos extension
  fi
}

# Function to add geos
add_geos() {
  enable_extension "geos" "extension"
  if check_extension "geos"; then
    add_log "${tick:?}" "geos" "Enabled"
  else
    add_geos_helper >/dev/null 2>&1
    add_extension_log "geos" "Installed and enabled"
  fi
}

os="$(uname -s)"
