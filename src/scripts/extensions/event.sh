# Function to get event configure options
get_event_configure_opts() {
  event_opts=(
      --with-event-core
      --with-event-extra
      --with-event-openssl
      --enable-event-sockets
  )
  if [ "$os" = 'Linux' ]; then
    event_opts+=(
        --with-openssl-dir=yes
        --with-event-libevent-dir=/usr
    )
  else
    event_opts+=(
        --with-openssl-dir="$(brew --prefix openssl@3)"
        --with-event-libevent-dir="$(brew --prefix libevent)"
    )
  fi
}

# Helper function to compile and install event
add_event_helper() {
  local ext=$1
  [[ "$ext" =~ ^event$ ]] && ext="event-$(get_pecl_version "event" "stable")"
  event_opts=() && get_event_configure_opts
  export EVENT_LINUX_LIBS='libevent-dev'
  export EVENT_DARWIN_LIBS='libevent'
  event_configure_opts="--with-php-config=$(command -v php-config) ${event_opts[*]}"
  export EVENT_CONFIGURE_OPTS="$event_configure_opts"
  add_extension_from_source event https://pecl.php.net event event "${ext##*-}" extension pecl
}

# Function to add event
add_event() {
  local ext=$1
  enable_extension "event" "extension"
  if check_extension "event"; then
    add_log "${tick:?}" "event" "Enabled"
  else
    if ! [[ "${version:?}" =~ ${old_versions:?} ]] && [ "$os" = "Darwin" ]; then
      add_brew_extension event extension 
    else
      add_event_helper "$ext" 
    fi
    add_extension_log "event" "Installed and enabled"
  fi
}

os="$(uname -s)"
