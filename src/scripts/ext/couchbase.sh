# Function to install libraries required by couchbase
add_couchbase_libs() {
  if [ "$(uname -s)" = "Linux" ]; then
    if [[ ${version:?} =~ 5.6|7.[0-1] ]]; then
      trunk="http://packages.couchbase.com/ubuntu"
      list="deb $trunk ${DISTRIB_CODENAME:?} ${DISTRIB_CODENAME:?}/main"
    else
      trunk="http://packages.couchbase.com/clients/c/repos/deb"
      list="deb $trunk/ubuntu${DISTRIB_RELEASE/./} ${DISTRIB_CODENAME:?} ${DISTRIB_CODENAME:?}/main"
    fi
    add_pecl
    get -s -n "" "$trunk/couchbase.key" | sudo apt-key add
    echo "$list" | sudo tee /etc/apt/sources.list.d/couchbase.list
    sudo apt-get update
    ${apt_install:?} libcouchbase-dev
  else
    if [[ ${version:?} =~ 5.6|7.[0-1] ]]; then
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
    if [[ ${version:?} =~ 5.6|7.[0-1] ]]; then
      pecl_install couchbase-2.6.2 >/dev/null 2>&1
    else
      pecl_install couchbase >/dev/null 2>&1
    fi
    add_extension_log "couchbase" "Installed and enabled"
  fi
}
