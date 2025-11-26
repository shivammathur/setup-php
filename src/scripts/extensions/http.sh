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
  enable_extension iconv extension
  enable_extension propro extension
  enable_extension raphf extension
  if (! [[ ${version:?} =~ ${jit_versions:?} ]] && check_extension iconv && check_extension propro && check_extension raphf) ||
     ( [[ ${version:?} =~ ${jit_versions:?} ]] && check_extension iconv && check_extension raphf); then
    enable_extension http extension
  fi
}

# Function to install http dependencies.
add_http_dependencies() {
  if [[ ${version:?} =~ ${old_versions:?} ]]; then
    add_pecl_extension raphf 1.1.2 extension
    add_pecl_extension propro 1.0.2 extension
  elif [[ ${version:?} =~ 5.6|7.[0-4] ]]; then
    add_extension iconv extension
    add_extension propro extension
    add_extension raphf extension
  else
    add_extension iconv extension
    add_extension raphf extension
  fi
}

# Function to get configure options for http.
get_http_configure_opts() {
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

# Compile and install http explicitly.
# This is done as pecl compiles raphf and propro as well.
add_http_helper() {
  ext=$1
  http_opts=() && get_http_configure_opts
  export HTTP_PREFIX_CONFIGURE_OPTS="CFLAGS=-Wno-implicit-function-declaration"
  http_configure_opts="--with-http --with-php-config=$(command -v php-config) ${http_opts[*]}"
  export HTTP_CONFIGURE_OPTS="$http_configure_opts"
  export HTTP_LINUX_LIBS="zlib1g libbrotli-dev libcurl4-openssl-dev libevent-dev libicu-dev libidn2-dev"
  export HTTP_DARWIN_LIBS="brotli curl icu4c libevent libidn2"
  if [[ "${version:?}" =~ ${nightly_versions:?} ]]; then
    add_extension_from_source http https://github.com m6w6 ext-http master extension
  else
    add_extension_from_source pecl_http https://pecl.php.net http http "${ext##*-}" extension pecl
  fi
}

# Function to setup latest http extension.
add_http_latest() {
  enable_http
  if ! check_extension http; then
    if [ "$os" = "Linux" ]; then
      add_http_dependencies
      package="php$version-http"
      add_ppa ondrej/php  || update_ppa ondrej/php
      (check_package "$package" && install_packages "$package") || add_http_helper "$(get_http_version)" "$os"
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
  enable_http
  if [ "x$(php -r "echo phpversion('http');")" != "x${ext##*-}" ]; then
    add_http_dependencies
    disable_extension_helper http >/dev/null
    add_http_helper pecl_http-"${ext##*-}" "$os"
    status="Installed and enabled"
  fi
}

# Function to setup http extension
add_http() {
  ext=$1
  status="Enabled"
  if [[ "$ext" =~ ^(pecl_http|http)$ ]]; then
    add_http_latest 
  else
    add_http_version "$ext" 
  fi
  add_extension_log "http" "$status"
}

os="$(uname -s)"
