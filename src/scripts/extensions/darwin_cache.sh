# Optional macOS extension archives. Downloads overlap PHP installation; the
# PHP-only path never sources this file or contacts the extension cache.
start_extension_cache_downloads() {
  extension_cache_dir=$(mktemp -d "${RUNNER_TEMP:-/tmp}/setup-php-extensions.XXXXXX") || return 0
  (
    cache_installer="$extension_cache_dir/install-extensions.cjs"
    cache_primary="https://github.com/shivammathur/php-darwin/releases/download/extensions"
    cache_mirror="https://artifacts.php-darwin.setup-php.com/extensions"
    curl -fsSL --retry 0 --connect-timeout 3 --max-time 3 --max-filesize 2000000 \
      "$cache_primary/install-extensions.cjs" -o "$cache_installer" ||
      curl -fsSL --retry 0 --connect-timeout 3 --max-time 10 --max-filesize 2000000 \
        "$cache_mirror/install-extensions.cjs" -o "$cache_installer" || exit 0
    IFS=' ' read -r -a cache_extensions <<< "$SETUP_PHP_EXTENSION_PACKS"
    "$SETUP_PHP_NODE" "$cache_installer" prefetch "$extension_cache_dir" \
      "$version" "$debug" "$ts" "$(uname -m)" "${cache_extensions[@]}"
  ) > "$extension_cache_dir/download.log" 2>&1 &
  extension_cache_pid=$!
}

finish_extension_cache_downloads() {
  [ -n "${extension_cache_pid:-}" ] || return 0
  wait "$extension_cache_pid" || true
  extension_cache_pid=
  if [[ "${verbose:-${VERBOSE:-}}" =~ ^(true|v{1,3})$ ]]; then
    cat "$extension_cache_dir/download.log"
  fi
  [ -s "$extension_cache_dir/install-extensions.cjs" ] || return 0
  local extension variable value
  for extension in $SETUP_PHP_EXTENSION_PACKS; do
    [ -s "$extension_cache_dir/$extension.json" ] || continue
    if "$SETUP_PHP_NODE" "$extension_cache_dir/install-extensions.cjs" install "$extension_cache_dir" "$extension"; then
      while IFS='=' read -r variable value; do
        case "$variable" in
          MAGICK_CONFIGURE_PATH|MAGICK_CODER_MODULE_PATH|MAGICK_FILTER_MODULE_PATH)
            add_env "$variable" "$value"
            ;;
        esac
      done < "$extension_cache_dir/$extension.env"
      # Store the dependency names in shell variables; the download directory
      # can be removed before the action enables its requested extensions.
      if [ "$extension" = memcached ]; then
        extension_cache_memcached_dependencies='igbinary msgpack'
      fi
    else
      printf 'setup-php: %s cache unavailable for this PHP; using the existing installer\n' "$extension"
    fi
  done
  rm -rf "$extension_cache_dir"
  extension_cache_dir=
}

enable_extension_cache_dependencies() {
  if [ "$1" = memcached ] && [ -n "${extension_cache_memcached_dependencies:-}" ]; then
    local dependency
    for dependency in $extension_cache_memcached_dependencies; do
      enable_extension "$dependency" extension
    done
  fi
}
