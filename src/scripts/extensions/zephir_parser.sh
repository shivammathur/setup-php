# Get zephir_parser version
get_zephir_parser_version() {
  local ext=$1
  if [[ "$ext" =~ ^zephir_parser$ ]]; then
    get -s -n "" "${zp_releases:?}"/latest 2<&1 | grep -m 1 -Eo "tag/(v?[0-9]+(\.[0-9]+)?(\.[0-9]+)?)" | head -n 1 | cut -d '/' -f 2
  else
    zp_version="${ext##*-}"
    echo "v${zp_version/v//}"
  fi
}

# Add zephir_parser helper
add_zephir_parser_helper() {
  local ext=$1
  nts="${ts:?}" && nts="${nts/z/}"
  ext_version=$(get_zephir_parser_version "$ext")
  [ "$(uname -s)" = "Linux" ] && os_suffix=ubuntu || os_suffix=macos
  build_name=$(get -s -n "" https://api.github.com/repos/"$repo"/releases/tags/"$ext_version" | grep -Eo "zephir_parser-php-${version:?}-$nts-$os_suffix-.*.zip" | head -n 1)
  [ -z "$build_name" ] && build_name=$(get -s -n "" "$zp_releases"/expanded_assets/"$ext_version" | grep -Eo "zephir_parser-php-${version:?}-$nts-$os_suffix-.*.zip" | head -n 1)
  get -q -e "/tmp/zp.zip" "$zp_releases"/download/"$ext_version"/"$build_name"
  sudo unzip -o "/tmp/zp.zip" -d "${ext_dir:?}"
  enable_extension zephir_parser extension
}

# Add zephir_parser
add_zephir_parser() {
  ext=$1
  repo=zephir-lang/php-zephir-parser
  zp_releases=https://github.com/"$repo"/releases
  if ! shared_extension zephir_parser; then
    message='Installed and enabled'
    add_zephir_parser_helper "$ext" 
  else
    message='Enabled'
    enable_extension zephir_parser extension
  fi
  add_extension_log zephir_parser "$message"
}