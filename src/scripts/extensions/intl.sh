# Function to install ICU
install_icu() {
  icu=$1
  if [ "$(php -i | grep "ICU version =>" | sed -e "s|.*=> s*||")" != "$icu" ]; then
    get -q -n /tmp/icu.tar.zst "https://github.com/shivammathur/icu-intl/releases/download/icu4c/icu4c-$icu.tar.zst"
    sudo tar -I zstd -xf /tmp/icu.tar.zst -C /usr/local
    sudo cp -r /usr/local/icu/lib/* /usr/lib/x86_64-linux-gnu/
  fi
}

# Function to add ext-intl with the given version of ICU
add_intl() {
  icu=$(echo "$1" | cut -d'-' -f 2)
  supported_version=$(get -s -n "" https://api.github.com/repos/shivammathur/icu-intl/releases | grep -Po "${icu//./\\.}" | head -n 1)
  if [ "$icu" != "$supported_version" ]; then
    add_log "${cross:?}" "intl" "ICU $icu is not supported"
  else
    [ "${ts:?}" = 'zts' ] && suffix='-zts'
    install_icu "$icu" 
    get -q -n "${ext_dir:?}/intl.so" "https://github.com/shivammathur/icu-intl/releases/download/intl/php${version:?}-intl-$icu$suffix.so"
    enable_extension intl extension
    add_extension_log intl "Installed and enabled with ICU $icu"
  fi
}
