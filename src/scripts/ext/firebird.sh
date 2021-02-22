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
  get -s -n "" https://github.com/php/php-src/archive/"$tag".tar.gz | tar -xzf - -C /tmp
  (
    cd /tmp/php-src-"$tag"/ext/pdo_firebird || exit
    if [[ "${version:?}" =~ ${old_versions:?} ]]; then
      sudo sed -i '' '/PHP_CHECK_PDO_INCLUDES/d' config.m4 2>/dev/null || sudo sed -i '/PHP_CHECK_PDO_INCLUDES/d' config.m4
    fi
    sudo phpize
    sudo ./configure --with-pdo-firebird="$firebird_dir"
    sudo make -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu)"
    sudo make install
    enable_extension pdo_firebird extension
  )
}

add_firebird() {
  enable_extension pdo_firebird
  if ! check_extension pdo_firebird; then
    if [ "$(uname -s)" = "Linux" ]; then
      if [[ "${version:?}" =~ 5.3|${nightly_versions:?} ]]; then
        lib_arch=$(gcc -dumpmachine)
        install_packages firebird-dev >/dev/null 2>&1
        sudo ln -sf /usr/lib/"$lib_arch"/libfbclient.so.2 /usr/lib/libfbclient.so >/dev/null 2>&1
        sudo ln -sf /usr/lib/"$lib_arch"/libib_util.so /usr/lib/ >/dev/null 2>&1
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
