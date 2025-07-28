patch_gearman() {
  if [[ "${version:?}" =~ ${nightly_versions:?} ]]; then
    sed -i~ -e "s/zend_exception_get_default()/zend_ce_exception/" php_gearman.c
  fi
}
