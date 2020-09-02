# Function to install ICU
install_icu() {
  icu=$1
  if [ "$(php -i | grep "ICU version =>" | sed -e "s|.*=> s*||")" != "$icu" ]; then
    sudo curl -o /tmp/icu.tar.zst -sL "https://dl.bintray.com/shivammathur/icu4c/icu4c-$icu.tar.zst"
    sudo tar -I zstd -xf /tmp/icu.tar.zst -C /usr/local
    sudo cp -r /usr/local/icu/lib/* /usr/lib/x86_64-linux-gnu/
  fi
}

# Function to add ext-intl with the given version of ICU
add_intl() {
  icu=$(echo "$1" | cut -d'-' -f 2)
  supported_version=$(curl "${curl_opts[@]:?}" https://api.bintray.com/packages/shivammathur/icu4c/icu4c | grep -Po "$icu" | head -n 1)
  if [ "$icu" != "$supported_version" ]; then
    add_log "${cross:?}" "intl" "ICU $icu is not supported"
  else
    install_icu "$icu" >/dev/null 2>&1
    sudo curl "${curl_opts[@]:?}" -o "${ext_dir:?}/intl.so" "https://dl.bintray.com/shivammathur/icu4c/php${version:?}-intl-$icu.so"
    enable_extension intl extension
    add_extension_log intl "Installed and enabled with ICU $icu"
  fi
}
