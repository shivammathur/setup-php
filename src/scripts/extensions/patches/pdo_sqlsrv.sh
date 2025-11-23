if [[ $(printf '%s\n%s\n' "${version:?}" "8.5" | sort -V | head -n1) == "8.5" ]]; then
  sed -i.bak -e 's/zval_ptr_dtor( &dbh->query_stmt_zval );/OBJ_RELEASE(dbh->query_stmt_obj);dbh->query_stmt_obj = NULL;/' php_pdo_sqlsrv_int.h
  sed -i.bak -e 's/pdo_error_mode prev_err_mode/uint8_t prev_err_mode/g' pdo_dbh.cpp
  rm -rf *.bak
fi
