patch_pdo_cubrid() {
  if [[ ${version:?} =~ ^7\.[0-2]$ ]] && [ -f cubrid_driver7.c ]; then
    # Match the PHP 7 PDO callbacks and store zvals with the PHP 7 hash API.
    sed -i.bak \
      -e 's/const char \*sql, long sql_len/const char *sql, size_t sql_len/g' \
      -e 's/static long cubrid_handle_doer/static zend_long cubrid_handle_doer/' \
      -e 's/zend_hash_index_update_ptr(HASH_OF(arg), index, (void \*)\&tmp_zval)/zend_hash_index_update(HASH_OF(arg), index, \&tmp_zval)/' \
      -e 's/(cubrid_retval = zend_hash_update(HASH_OF(arg), key, (void \*) \&tmp_zval)) == FAILURE/zend_hash_str_update(HASH_OF(arg), key, strlen(key), \&tmp_zval) == NULL/' \
      cubrid_driver7.c
  fi
}
