# Function to get http version for a PHP version.
get_http_version() {
  if [[ ${version:?} =~ 5.[3-6] ]]; then
    echo "pecl_http-2.6.0"
  elif [[ ${version:?} =~ 7.[0-4] ]]; then
    echo "pecl_http-3.2.4"
  else
    echo "pecl_http-$(get_pecl_version "pecl_http" "stable")"
  fi
}

# Function to enable http extension.
enable_http() {
  enable_extension propro extension
  enable_extension raphf extension
  if (! [[ ${version:?} =~ ${jit_versions:?} ]] && check_extension propro && check_extension raphf) ||
     ( [[ ${version:?} =~ ${jit_versions:?} ]] && check_extension raphf); then
    enable_extension http extension
  fi
}

# Function to install linux dependencies.
add_http_dependencies_linux() {
  ! [[ ${version:?} =~ ${nightly_versions:?} ]] && add_devtools phpize
  install_packages zlib1g libbrotli-dev libcurl4-openssl-dev libevent-dev libicu-dev libidn2-dev
  if [[ ${version:?} =~ ${old_versions:?} ]]; then
    add_pecl_extension raphf 1.1.2 extension
    add_pecl_extension propro 1.0.2 extension
  elif [[ ${version:?} =~ 5.6|7.[0-4] ]]; then  
    add_extension propro extension
    add_extension raphf extension
  else
    add_extension raphf extension
  fi
}

# Function to install darwin dependencies.
add_http_dependencies_darwin() {
  brew install brotli curl icu4c libevent libidn2
  if ! [[ ${version:?} =~ ${old_versions:?} ]]; then
    if [[ ${version:?} =~ 5.6|7.[0-4] ]]; then
      add_brew_extension propro extension
    fi
    add_brew_extension raphf extension
  else
    add_pecl_extension raphf 1.1.2 extension
    add_pecl_extension propro 1.0.2 extension
  fi
}

# Function to install the dependencies.
add_http_dependencies() {
  os=$1
  if [ "$os" = 'Linux' ]; then
    add_http_dependencies_linux
  else
    add_http_dependencies_darwin
  fi
}

# Function to get configure options for http.
get_http_configure_opts() {
  os=$1
  if [ "$os" = 'Linux' ]; then
    for lib in zlib libbrotli libcurl libevent libicu libidn2 libidn libidnkit2 libidnkit; do
      http_opts+=( "--with-http-$lib-dir=/usr" )
    done
  else
    http_opts+=( "--with-http-zlib-dir=$(xcrun --show-sdk-path)/usr" )
    http_opts+=( "--with-http-libbrotli-dir=$(brew --prefix brotli)" )
    http_opts+=( "--with-http-libcurl-dir=$(brew --prefix curl)" )
    http_opts+=( "--with-http-libicu-dir=$(brew --prefix icu4c)" )
    http_opts+=( "--with-http-libevent-dir=$(brew --prefix libevent)" )
    http_opts+=( "--with-http-libidn2-dir=$(brew --prefix libidn2)" )
  fi
}

patch_http_source() {
  ext=$1
  os=$2
  if [ "$os" = 'Darwin' ] && ! [[ ${version:?} =~ ${old_versions:?} ]]; then
    if [[ ${version:?} =~ 5.6|7.[0-4] ]]; then
      sed -i '' -e "s|ext/propro|$(brew --prefix propro@"${version:?}")/include/php/ext/propro@${version:?}|" "/tmp/pecl_http-${ext##*-}/src/php_http_api.h"
    fi
    sed -i '' -e "s|ext/raphf|$(brew --prefix raphf@"${version:?}")/include/php/ext/raphf@${version:?}|" "/tmp/pecl_http-${ext##*-}/src/php_http_api.h"
    if [ "${version:?}" = "5.6" ]; then
      sed -i '' -e "s|\$abs_srcdir|\$abs_srcdir ${brew_prefix:?}/include|" -e "s|/ext/propro|/php/ext/propro@5.6|" -e "s|/ext/raphf|/php/ext/raphf@5.6|" "/tmp/pecl_http-${ext##*-}/config9.m4"
    fi
  fi
}

# Helper function to compile and install http.
build_http() {
  ext=$1
  os=$2
  (
    http_opts=() && get_http_configure_opts "$os"
    c_opts="CFLAGS=-Wno-implicit-function-declaration"
    cd /tmp/pecl_http-"${ext##*-}" || exit
    sudo phpize
    sudo "$c_opts" ./configure --with-http --with-php-config="$(command -v php-config)" "${http_opts[@]}"
    sudo make -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu)"
    sudo make install
  )
}

# Compile and install http explicitly.
# This is done as pecl compiles raphf and propro as well.
add_http_helper() {
  ext=$1
  os=$2
  add_http_dependencies "$os"
  get -q -n /tmp/http.tgz https://pecl.php.net/get/pecl_http-"${ext##*-}".tgz
  tar -xzf /tmp/http.tgz -C /tmp
  patch_http_source "$ext" "$os"
  build_http "$ext" "$os"
  enable_extension http extension
}

# Function to setup latest http extension.
add_http_latest() {
  os=$1
  enable_http
  if ! check_extension http; then
    if [ "$os" = "Linux" ]; then
      if ! [[ "${version:?}" =~ ${old_versions:?}|${nightly_versions:?} ]]; then
        if [[ ${version:?} =~ 5.6|7.[0-4] ]]; then
          install_packages "php$version-propro"
        fi
        install_packages "php$version-raphf" "php$version-http"
      else
        add_http_helper "$(get_http_version)" "$os"
      fi
    else
      if ! [[ "${version:?}" =~ ${old_versions:?} ]]; then
        add_brew_extension pecl_http extension
      fi
    fi
    status="Installed and enabled"
  fi
}

# Function to setup http extension given a version.
add_http_version() {
  ext=$1
  os=$2
  enable_http
  if [ "x$(php -r "echo phpversion('http');")" != "x${ext##*-}" ]; then
    remove_extension http >/dev/null
    add_http_helper pecl_http-"${ext##*-}" "$os"
    status="Installed and enabled"
  fi
}

# Function to setup http extension
add_http() {
  ext=$1
  os="$(uname -s)"
  status="Enabled"
  if [[ "$ext" =~ ^(pecl_http|http)$ ]]; then
    add_http_latest "$os" >/dev/null 2>&1
  else
    add_http_version "$ext" "$os" >/dev/null 2>&1
  fi
  add_extension_log "http" "$status"
}
