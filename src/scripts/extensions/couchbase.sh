# Function to install libraries required by couchbase
add_couchbase_clibs() {
  if [ "$(uname -s)" = "Linux" ]; then
    trunk="https://github.com/couchbase/libcouchbase/releases"
    if [[ ${version:?} =~ 5.[3-6]|7.[0-1] ]]; then
      release="2.10.9"
    else
      release="$(curl -sL $trunk/latest | grep -Eo "libcouchbase-[0-9]+\.[0-9]+\.[0-9]+" | head -n 1 | cut -d'-' -f 2)"
    fi
    [ "$VERSION_ID" = "22.04" ] && vid=20.04 || vid="$VERSION_ID"
    [ "$VERSION_CODENAME" = "jammy" ] && vcn=focal || vcn="$VERSION_CODENAME"
    deb_url="$trunk/download/$release/libcouchbase-${release}_ubuntu${vid/./}_${vcn}_amd64.tar"
    get -q -n /tmp/libcouchbase.tar "$deb_url"
    sudo tar -xf /tmp/libcouchbase.tar -C /tmp
    install_packages libev4 libevent-dev
    sudo dpkg -i /tmp/libcouchbase-*/*.deb
  else
    if [[ ${version:?} =~ 5.[3-6]|7.[0-1] ]]; then
      brew install libcouchbase@2
      brew link --overwrite --force libcouchbase@2
    else
      brew install libcouchbase
    fi
  fi
}

add_couchbase_cxxlibs() {
  if [ "$(uname -s)" = "Linux" ]; then
    if [ "$VERSION_ID" = "18.04" ]; then
      if ! command -v gcc-8 >/dev/null || ! command -v g++-8 >/dev/null; then
        install_packages gcc-8 g++-8 -y
      fi
      printf "gcc g++" | xargs -d ' ' -I {} sudo update-alternatives --install /usr/bin/{} {} /usr/bin/{}-8 8
    fi
    if [ "${runner:?}" = "self-hosted" ]; then
      add_list cmake https://apt.kitware.com/ubuntu/ https://apt.kitware.com/keys/kitware-archive-latest.asc "$VERSION_CODENAME" main
    fi
    install_packages cmake ccache
  else
    brew install cmake ccache gcc
    OPENSSL_ROOT_DIR="$(brew --prefix openssl@1.1)"
    export OPENSSL_ROOT_DIR
    export CC=gcc
    export CXX=g++
  fi
}

get_couchbase_version() {
    if [[ "${version:?}" =~ ${old_versions:?} ]]; then
      echo couchbase-2.2.3
    elif [[ "${version:?}" =~ 5.6|7.[0-1] ]]; then
      echo couchbase-2.6.2
    elif [ "${version:?}" = '7.2' ]; then
      echo couchbase-3.0.4
    else
      echo couchbase-3.2.2
    fi
#    elif [ "${version:?}" = '7.3' ]; then
#      echo couchbase-3.2.2
#    else
#      echo couchbase
#    fi
}

# Function to add couchbase.
add_couchbase() {
  couchbase_version=$(get_couchbase_version)
  if [ "$couchbase_version" != 'couchbase' ]; then
    add_couchbase_clibs >/dev/null 2>&1
  else
    add_couchbase_cxxlibs >/dev/null 2>&1
  fi
  enable_extension "couchbase" "extension"
  if check_extension "couchbase"; then
    add_log "${tick:?}" "couchbase" "Enabled"
  else
    pecl_install "${couchbase_version}" >/dev/null 2>&1
    add_extension_log "couchbase" "Installed and enabled"
  fi
}
