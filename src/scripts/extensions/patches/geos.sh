patch_geos() {
  if [[ $(printf '%s\n%s\n' "${version:?}" "7.0" | sort -V | head -n1) == "7.0" ]]; then
    sed -i~ -e "s/, ce->name/, ZSTR_VAL(ce->name)/; s/ulong /zend_ulong /" geos.c
  fi
  get -q -n /tmp/php8.patch https://git.remirepo.net/cgit/rpms/php/php-geos.git/plain/0003-add-all-arginfo-and-fix-build-with-PHP-8.patch
  get -q -n /tmp/toString.patch https://git.remirepo.net/cgit/rpms/php/php-geos.git/plain/0006-fix-__toString-with-8.2.patch
  patch -p1 < /tmp/php8.patch 2>/dev/null || true
  patch -p1 < /tmp/toString.patch 2>/dev/null || true
}
