# Helper function to compile and install geos
add_geos_helper() {
  export GEOS_LINUX_LIBS='libgeos-dev'
  export GEOS_DARWIN_LIBS='geos'
  add_extension_from_source geos https://github.com libgeos php-geos 1.0.0 extension get
}

# Function to add geos
add_geos() {
  enable_extension "geos" "extension"
  if check_extension "geos"; then
    add_log "${tick:?}" "geos" "Enabled"
  else
    add_geos_helper 
    add_extension_log "geos" "Installed and enabled"
  fi
}
