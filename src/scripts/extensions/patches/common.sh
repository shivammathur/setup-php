patch_84() {
  sed -i.bak \
    -e '0,/#include.*\(php_lcg.h\|php_mt_rand.h\|php_rand.h\|standard\/php_random\.h\).*/s//#include <ext\/random\/php_random.h>/' \
    -e '/#include.*\(php_lcg.h\|php_mt_rand.h\|php_rand.h\|standard\/php_random\.h\)/d' \
    "$1" && rm -rf *.bak
}

patch_85() {
  sed -i.bak \
    -e 's#ext/standard/php_smart_string.h#Zend/zend_smart_string.h#g' \
    -e 's#ext/standard/php_smart_string_public.h#Zend/zend_smart_string.h#g' \
    -e 's#zend_exception_get_default(TSRMLS_C)#zend_ce_exception#g' \
    -e 's#zend_exception_get_default()#zend_ce_exception#g' \
    "$1" && rm -rf *.bak
}

version_ge() {
  ver=$1
  min=$2
  [[ $(printf '%s\n%s\n' "$ver" "$min" | sort -V | head -n1) == "$min" ]]
}

if version_ge "${version:?}" "8.4"; then
  while IFS= read -r file; do
    patch_84 "$file"
  done < <(grep -rlE 'php_lcg\.h|php_mt_rand\.h|php_rand\.h|standard/php_random\.h' \
           --include='*.c' --include='*.h' . || true)
fi

if version_ge "${version:?}" "8.5"; then
  while IFS= read -r file; do
    patch_85 "$file"
  done < <(grep -rlE 'ext/standard/php_smart_string(_public)?\.h|zend_exception_get_default' \
           --include='*.c' --include='*.h' . || true)
fi
