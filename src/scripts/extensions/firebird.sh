add_firebird_helper() {
  firebird_dir=$1
  tag="$(php_src_tag)"
  export PDO_FIREBIRD_CONFIGURE_PREFIX_OPTS="CFLAGS=-Wno-incompatible-function-pointer-types EXTRA_CFLAGS=-Wno-int-conversion"
  export PDO_FIREBIRD_CONFIGURE_OPTS="--with-pdo-firebird=$firebird_dir"
  export PDO_FIREBIRD_LINUX_LIBS="firebird-dev"
  export PDO_FIREBIRD_PATH="ext/pdo_firebird"
  add_extension_from_source pdo_firebird https://github.com php php-src "$tag" extension get
}

add_firebird() {
  enable_extension pdo_firebird extension
  if check_extension pdo_firebird; then
    add_log "${tick:?}" pdo_firebird Enabled
  else
    if [ "$(uname -s)" = "Linux" ]; then
      if [[ "${version:?}" =~ 5.3|${php_builder_versions:?} ]]; then
        add_firebird_helper /usr 
      else
        add_pdo_extension firebird 
      fi
    else
      add_brew_extension pdo_firebird extension 
    fi
    add_extension_log pdo_firebird "Installed and enabled"
  fi
}
