# Helper function install geos library and headers
add_geos_libs() {
  if [ "$(uname -s)" = "Darwin" ]; then
    brew install geos
  else
    sudo apt-get install libgeos-dev
    if [ "${runner:?}" = "self-hosted" ]; then
      ${apt_install:?} --no-upgrade --no-install-recommends autoconf automake gcc g++
    fi
  fi
}

# Patch geos for PHP 7
patch_geos() {
  if [ "$(php -r "echo PHP_VERSION_ID;")" -ge 70000 ]; then
    sed -i~ -e "s/, ce->name/, ZSTR_VAL(ce->name)/; s/ulong /zend_ulong /" /tmp/php-geos-"$geos_tag"/geos.c
  fi
}

# Get geos source
get_geos() {
  curl -o /tmp/geos.tar.gz -sL https://github.com/libgeos/php-geos/archive/"$geos_tag".tar.gz
  tar -xzf /tmp/geos.tar.gz -C /tmp
  patch_geos
}

# Helper function to compile and install geos
add_geos_helper() {
  get_geos
  (
    cd /tmp/php-geos-"$geos_tag" || exit
    phpize
    ./configure --enable-geos --with-geos-config="$(command -v geos-config)"
    sudo make -j"$(nproc)"
    sudo make install
    enable_extension geos extension
  )
}

# Function to add geos
add_geos() {
  geos_tag='1.0.0'
  add_geos_libs >/dev/null 2>&1
  enable_extension "geos" "extension"
  if check_extension "geos"; then
    add_log "${tick:?}" "geos" "Enabled"
  else
    add_geos_helper >/dev/null 2>&1
    add_extension_log "geos" "Installed and enabled"
  fi
}
