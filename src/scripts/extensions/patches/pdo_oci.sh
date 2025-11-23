patch_pdo_oci() {
  get -q -n config.m4 https://raw.githubusercontent.com/php/php-src/PHP-8.0/ext/pdo_oci/config.m4
  if [[ $(printf '%s\n%s\n' "${version:?}" "8.5" | sort -V | head -n1) == "8.5" ]]; then
    get -q -n pdo_oci.c https://raw.githubusercontent.com/shivammathur/pecl-database-pdo_oci/a9cf2c53b6de46f9e5f523bcd11fd344e3beeb85/pdo_oci.c
  fi
  if [[ ${version:?} =~ 5.[3-6] ]]; then
    sudo sed -i '' "/PHP_CHECK_PDO_INCLUDES/d" config.m4 2>/dev/null || sudo sed -i "/PHP_CHECK_PDO_INCLUDES/d" config.m4
  fi
}
