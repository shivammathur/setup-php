add_firebird_client_darwin() {
  pkg_name=$(get -s -n "" https://github.com/FirebirdSQL/firebird/releases/latest | grep -Eo "Firebird-.*.pkg" | head -n 1)
  get -q -e "/tmp/firebird.pkg" https://github.com/FirebirdSQL/firebird/releases/latest/download/"$pkg_name"
  sudo installer -pkg /tmp/firebird.pkg -target /
  sudo mkdir -p /opt/firebird/include /opt/firebird/lib
  sudo find /Library/Frameworks/Firebird.framework -name '*.h' -exec cp "{}" /opt/firebird/include \;
  sudo find /Library/Frameworks/Firebird.framework -name '*.dylib' -exec cp "{}" /opt/firebird/lib \;
}

add_firebird_helper() {
  firebird_dir=$1
  tag="$(php_src_tag)"
  export PDO_FIREBIRD_CONFIGURE_OPTS="--with-pdo-firebird=$firebird_dir"
  export PDO_FIREBIRD_LINUX_LIBS="firebird-dev"
  export PDO_FIREBIRD_PATH="ext/pdo_firebird"
  add_extension_from_source pdo_firebird https://github.com php php-src "$tag" extension get
}

add_firebird() {
  enable_extension pdo_firebird
  if ! check_extension pdo_firebird; then
    if [ "$(uname -s)" = "Linux" ]; then
      if [[ "${version:?}" =~ 5.3|${nightly_versions:?} ]]; then
        add_firebird_helper /usr >/dev/null 2>&1
      else
        add_pdo_extension firebird >/dev/null 2>&1
      fi
    else
      add_firebird_client_darwin >/dev/null 2>&1
      add_firebird_helper /opt/firebird >/dev/null 2>&1
    fi
    add_extension_log pdo_firebird "Installed and enabled"
  fi
}
