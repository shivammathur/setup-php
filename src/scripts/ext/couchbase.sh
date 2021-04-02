# Function to install libraries required by couchbase
add_couchbase_libs() {
  if [ "$(uname -s)" = "Linux" ]; then
    trunk="https://github.com/couchbase/libcouchbase/releases"
    if [[ ${version:?} =~ 5.[3-6]|7.[0-1] ]]; then
      release="2.10.9"
    else
      release="$(curl -sL $trunk/latest | grep -Eo "libcouchbase-[0-9]+\.[0-9]+\.[0-9]+" | head -n 1 | cut -d'-' -f 2)"
    fi
    deb_url="$trunk/download/$release/libcouchbase-${release}_ubuntu${DISTRIB_RELEASE/./}_${DISTRIB_CODENAME}_amd64.tar"
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

# Function to add couchbase.
add_couchbase() {
  add_couchbase_libs >/dev/null 2>&1
  enable_extension "couchbase" "extension"
  if check_extension "couchbase"; then
    add_log "${tick:?}" "couchbase" "Enabled"
  else
    if [[ "${version:?}" =~ ${old_versions:?} ]]; then
      pecl_install couchbase-2.2.3 >/dev/null 2>&1
    elif [[ "${version:?}" =~ 5.6|7.[0-1] ]]; then
      pecl_install couchbase-2.6.2 >/dev/null 2>&1
    elif [[ "${version:?}" =~ 7.2 ]]; then
      pecl_install couchbase-3.0.4 >/dev/null 2>&1
    else
      pecl_install couchbase >/dev/null 2>&1
    fi
    add_extension_log "couchbase" "Installed and enabled"
  fi
}
