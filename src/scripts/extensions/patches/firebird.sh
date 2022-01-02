patch_firebird() {
  if [[ "${version:?}" =~ ${old_versions:?} ]]; then
    sudo sed -i '' '/PHP_CHECK_PDO_INCLUDES/d' config.m4 2>/dev/null || sudo sed -i '/PHP_CHECK_PDO_INCLUDES/d' config.m4
  fi
  lib_arch=$(gcc -dumpmachine)
  lib_dir=/usr/lib/"$lib_arch"
  if [ -d "$lib_dir" ]; then
    sudo ln -sf "$lib_dir"/libfbclient.so.2 /usr/lib/libfbclient.so
    sudo ln -sf "$lib_dir"/libib_util.so /usr/lib/
  fi
}
