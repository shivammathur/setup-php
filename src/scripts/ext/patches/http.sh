patch_pecl_http() {
  if [ "$(uname -s)" = 'Darwin' ] && ! [[ ${version:?} =~ ${old_versions:?} ]]; then
    if [[ ${version:?} =~ 5.6|7.[0-4] ]]; then
      sed -i '' -e "s|ext/propro|$(brew --prefix propro@"${version:?}")/include/php/ext/propro@${version:?}|" "./src/php_http_api.h"
    fi
    sed -i '' -e "s|ext/raphf|$(brew --prefix raphf@"${version:?}")/include/php/ext/raphf@${version:?}|" "./src/php_http_api.h"
    if [ "${version:?}" = "5.6" ]; then
      sed -i '' -e "s|\$abs_srcdir|\$abs_srcdir ${brew_prefix:?}/include|" -e "s|/ext/propro|/php/ext/propro@5.6|" -e "s|/ext/raphf|/php/ext/raphf@5.6|" "./config9.m4"
    fi
  fi
}
