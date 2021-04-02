patch_pdo_oci() {
  get -q -n config.m4 https://raw.githubusercontent.com/php/php-src/PHP-8.0/ext/pdo_oci/config.m4
  if [[ ${version:?} =~ 5.[3-6] ]]; then
    sudo sed -i '' "/PHP_CHECK_PDO_INCLUDES/d" config.m4 2>/dev/null || sudo sed -i "/PHP_CHECK_PDO_INCLUDES/d" config.m4
  fi
}
