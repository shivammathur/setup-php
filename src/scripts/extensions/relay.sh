# Get relay version
get_relay_version() {
 local ext=$1
  if [[ "$ext" =~ ^relay$ ]]; then
    get -s -n "" "${relay_releases:?}"/latest 2<&1 | grep -m 1 -Eo "tag/(v[0-9]+(\.[0-9]+)?(\.[0-9]+)?)" | head -n 1 | cut -d '/' -f 2
  else
    relay_version="${ext##*-}"
    echo "v${relay_version/v//}"
  fi
}

# Get OS suffix in relay artifact URL.
get_os_suffix() {
  if [ "$os" = "Linux" ]; then
    if [[ "$ID" =~ ubuntu|debian ]]; then
      echo debian
    elif [ "$ID" = "centos" ]; then
      echo centos"$VERSION_ID"
    else
      echo "$ID"
    fi
  else
    echo darwin
  fi
}

# Get openssl suffix in relay artifact URL.
get_openssl_suffix() {
  openssl_3=$(php -r "echo strpos(OPENSSL_VERSION_TEXT, 'SSL 3') !== false;")
  [ "$openssl_3" = "1" ] && echo '+libssl3' || echo ''
}

# Change library paths in relay binary.
change_library_paths() {
  if [ "$os" = "Darwin" ]; then
    otool -L "${ext_dir:?}"/relay.so | grep -q 'ssl.1' && openssl_version='1.1' || openssl_version='3'
    [ -e "${brew_prefix:?}"/opt/openssl@"$openssl_version" ] || brew install openssl@"$openssl_version"
    dylibs="$(otool -L "${ext_dir:?}"/relay.so | grep -Eo '.*\.dylib' | cut -f1 -d ' ')"
    install_name_tool -change "$(echo "${dylibs}" | grep -E "libzstd.*dylib" | xargs)" "$brew_prefix"/opt/zstd/lib/libzstd.dylib "$ext_dir"/relay.so
    install_name_tool -change "$(echo "${dylibs}" | grep -E "liblz4.*dylib" | xargs)" "$brew_prefix"/opt/lz4/lib/liblz4.dylib "$ext_dir"/relay.so
    install_name_tool -change "$(echo "${dylibs}" | grep -E "libssl.*dylib" | xargs)" "$brew_prefix"/opt/openssl@"$openssl_version"/lib/libssl.dylib "$ext_dir"/relay.so
    install_name_tool -change "$(echo "${dylibs}" | grep -E "libcrypto.*dylib" | xargs)" "$brew_prefix"/opt/openssl@"$openssl_version"/lib/libcrypto.dylib "$ext_dir"/relay.so
  fi
}

# Add relay dependencies
add_relay_dependencies() {
  add_extension json
  add_extension msgpack
  add_extension igbinary
  if [ "$os" = "Darwin" ]; then
    . "${0%/*}"/tools/brew.sh
    configure_brew
    brew install hiredis lz4 zstd
  fi
}

# Initialize relay extension ini configuration
init_relay_ini() {
  relay_ini=$1
  if [ -e "$relay_ini" ]; then
    if [[ -n "$RELAY_KEY" ]]; then
      sudo sed -i.bak "s/^; relay.key =.*/relay.key = $RELAY_KEY/" "$relay_ini"
    fi
    if [[ -n "$RELAY_ENVIRONMENT" ]]; then
      sudo sed -i.bak "s/^; relay.environment =.*/relay.environment = $RELAY_ENVIRONMENT/" "$relay_ini"
    fi
    if [[ -n "$RELAY_EVICTION_POLICY" ]]; then
      sudo sed -i.bak "s/^; relay.eviction_policy =.*/relay.eviction_policy = $RELAY_EVICTION_POLICY/" "$relay_ini"
    fi
    if [[ -n "$RELAY_MAX_MEMORY" ]]; then
      sudo sed -i.bak "s/^; relay.maxmemory =.*/relay.maxmemory = $RELAY_MAX_MEMORY/" "$relay_ini"
    fi
    sudo rm -rf "$relay_ini".bak
  fi
}

# Enable relay extension
enable_relay() {
  relay_ini=$1
  if [ -e "$relay_ini" ]; then
    init_relay_ini "$relay_ini"
    if [ "$os" = "Linux" ]; then
      sudo cp "$relay_ini" "${ini_dir:?}"/../mods-available/relay.ini
      sudo phpenmod -v "${version:?}" relay
    else
      sudo cp "${relay_ini}" "${scan_dir:?}"/60-relay.ini
    fi
  fi
}

# Patch binary id in relay extension
init_relay_binary_id() {
  if [ -e "${ext_dir:?}"/relay.so ]; then
    grep -aq 00000000 "${ext_dir:?}"/relay.so && \
      sudo LC_ALL=C sed -i.bak "s/00000000-0000-0000-0000-000000000000/$(uuidgen)/" "$ext_dir"/relay.so
  fi
}

# Configure relay extension
configure_relay() {
  change_library_paths
  init_relay_binary_id
  enable_relay "${ext_dir}"/relay.ini
}

# Helper function to add relay extension
add_relay_helper() {
  arch="$(uname -m | sed 's/_/-/')"
  os_suffix="$(get_os_suffix)"
  openssl_suffix="$(get_openssl_suffix)"
  artifact_file_name="relay-$relay_version-php${version:?}-$os_suffix-$arch$openssl_suffix.tar.gz"
  url="$relay_trunk"/"$relay_version"/"$artifact_file_name"
  get -q -n /tmp/relay.tar.gz "$url"
  if (! [ -e /tmp/relay.tar.gz ] || ! file /tmp/relay.tar.gz | grep -q 'gzip'); then
    if [ "$openssl_suffix" = '+libssl3' ]; then
      get -q -n /tmp/relay.tar.gz "${url/+libssl3/}"
    else
      get -q -n /tmp/relay.tar.gz "${url/.tar/+libssl3.tar}"
    fi
  fi
  if [ -e /tmp/relay.tar.gz ] && file /tmp/relay.tar.gz | grep -q 'gzip'; then
    sudo tar --strip-components=1 -xzf /tmp/relay.tar.gz -C "${ext_dir:?}"
    sudo mv "${ext_dir:?}"/relay-pkg.so "${ext_dir:?}"/relay.so
  fi
}

# Add relay extension
add_relay() {
  local ext=$1
  local arch
  local url
  os=$(uname -s)
  relay_releases=https://github.com/cachewerk/relay/releases
  relay_trunk=https://builds.r2.relay.so
  relay_version=$(get_relay_version "$ext")
  add_relay_dependencies 
  if shared_extension relay; then
    message="Enabled"
  else
    add_relay_helper 
    message="Installed and enabled"
  fi
  configure_relay 
  add_extension_log relay "$message"
}
