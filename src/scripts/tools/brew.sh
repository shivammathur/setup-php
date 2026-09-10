# Function to fetch a brew tap.
fetch_brew_tap() {
  tap=$1
  tap_user=$(dirname "$tap")
  tap_name=$(basename "$tap")
  mkdir -p "$tap_dir/$tap_user"
  branch="$(git ls-remote --symref "https://github.com/$tap" HEAD | grep -Eo 'refs/heads/.*' | tr '\t' '\n' | head -1 | cut -d '/' -f 3)"
  get -s -n "" "https://github.com/$tap/archive/$branch.tar.gz" | sudo tar -xzf - -C "$tap_dir/$tap_user"
  sudo mv "$tap_dir/$tap_user/$tap_name-$branch" "$tap_dir/$tap_user/$tap_name"
}

# Function to add a brew tap.
add_brew_tap() {
  tap=$1
  if ! [ -d "$tap_dir/$tap" ]; then
    if [ "${runner:?}" = "self-hosted" ]; then
      brew tap "$tap" >/dev/null 2>&1
    else
      fetch_brew_tap "$tap" >/dev/null 2>&1
      if ! [ -d "$tap_dir/$tap" ]; then
        brew tap "$tap" >/dev/null 2>&1
      fi
    fi
  fi
  brew trust "$tap" >/dev/null 2>&1
}

# Function to get brew prefix.
get_brew_prefix() {
  if [ "$(uname -s)" = "Linux" ]; then
    echo /home/linuxbrew/.linuxbrew
  else
    if [ "$(uname -m)" = "arm64" ]; then
      echo /opt/homebrew
    else
      echo /usr/local
    fi
  fi
}

# Function to add brew's bin directories to the PATH.
add_brew_bins_to_path() {
  local brew_prefix=${1:-$(get_brew_prefix)}
  add_path "$brew_prefix"/bin
  add_path "$brew_prefix"/sbin
}

# Function to get file modification time.
get_file_mtime() {
  local file=$1
  if [ "$(uname -s)" = "Darwin" ]; then
    stat -f "%m" "$file" 2>/dev/null || echo 0
  else
    stat -c "%Y" "$file" 2>/dev/null || echo 0
  fi
}

# Function to list descendants before their parents, including separate sessions.
get_process_tree() {
  local pid=$1
  local children child
  children=$(pgrep -P "$pid" 2>/dev/null || true)
  for child in $children; do
    get_process_tree "$child"
  done
  echo "$pid"
}

# Function to detect Homebrew's source-build worker, even with buffered output.
is_brew_building_from_source() {
  local pid
  for pid in $(get_process_tree "$1"); do
    if ps -ww -p "$pid" -o command= 2>/dev/null | grep -qE '/Homebrew/build[.]rb([[:space:]]|$)'; then
      return 0
    fi
  done
  return 1
}

# Function to terminate the entire tree captured before any parents can exit.
terminate_process_tree() {
  local pids pid
  pids=$(get_process_tree "$1")
  for pid in $pids; do
    kill -TERM "$pid" >/dev/null 2>&1 || true
  done
  sleep 2
  for pid in $pids; do
    kill -KILL "$pid" >/dev/null 2>&1 || true
  done
}

# Function to run a command with an inactivity watchdog.
run_with_inactivity_watchdog() {
  local timeout_secs="${SETUP_PHP_BREW_INACTIVITY_TIMEOUT:-180}"
  local source_timeout_secs="${SETUP_PHP_BREW_SOURCE_INACTIVITY_TIMEOUT:-1800}"
  local poll_secs="${SETUP_PHP_BREW_WATCHDOG_POLL:-5}"
  local tmp_dir stdout_fifo stderr_fifo stdout_log stderr_log timeout_file
  local command_pid stdout_reader_pid stderr_reader_pid monitor_pid exit_code
  tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/setup-php-brew.XXXXXX")" || return 1
  stdout_fifo="$tmp_dir/stdout.fifo"
  stderr_fifo="$tmp_dir/stderr.fifo"
  stdout_log="$tmp_dir/stdout.log"
  stderr_log="$tmp_dir/stderr.log"
  timeout_file="$tmp_dir/timed_out"
  mkfifo "$stdout_fifo" "$stderr_fifo" || {
    rm -rf "$tmp_dir"
    return 1
  }
  : >"$stdout_log"
  : >"$stderr_log"

  ("$@" >"$stdout_fifo" 2>"$stderr_fifo") &
  command_pid=$!

  tee "$stdout_log" <"$stdout_fifo" &
  stdout_reader_pid=$!

  tee "$stderr_log" <"$stderr_fifo" >&2 &
  stderr_reader_pid=$!

  (
    local last_activity current_activity current_err_activity now
    local building_from_source=false was_building_from_source=false active_timeout_secs
    last_activity=$(get_file_mtime "$stdout_log")
    current_err_activity=$(get_file_mtime "$stderr_log")
    [ "$current_err_activity" -gt "$last_activity" ] && last_activity="$current_err_activity"
    while kill -0 "$command_pid" >/dev/null 2>&1; do
      sleep "$poll_secs"
      kill -0 "$command_pid" >/dev/null 2>&1 || break
      now=$(date +%s)
      active_timeout_secs="$timeout_secs"
      building_from_source=false
      if is_brew_building_from_source "$command_pid"; then
        building_from_source=true
        active_timeout_secs="$source_timeout_secs"
      fi
      if [ "$building_from_source" != "$was_building_from_source" ]; then
        last_activity="$now"
        was_building_from_source="$building_from_source"
      fi
      current_activity=$(get_file_mtime "$stdout_log")
      [ "$current_activity" -gt "$last_activity" ] && last_activity="$current_activity"
      current_err_activity=$(get_file_mtime "$stderr_log")
      [ "$current_err_activity" -gt "$last_activity" ] && last_activity="$current_err_activity"
      now=$(date +%s)
      if [ $((now - last_activity)) -ge "$active_timeout_secs" ]; then
        printf "\nsetup-php: brew produced no output for %ss; terminating...\n" "$active_timeout_secs" >&2
        : >"$timeout_file"
        terminate_process_tree "$command_pid"
        break
      fi
    done
  ) &
  monitor_pid=$!

  exit_code=0
  wait "$command_pid" || exit_code=$?
  # Let timeout cleanup finish killing source-build descendants before retrying.
  if [ ! -e "$timeout_file" ]; then
    kill "$monitor_pid" >/dev/null 2>&1 || true
  fi
  wait "$monitor_pid" 2>/dev/null || true
  wait "$stdout_reader_pid" 2>/dev/null || true
  wait "$stderr_reader_pid" 2>/dev/null || true

  if [ -e "$timeout_file" ]; then
    rm -rf "$tmp_dir"
    return 124
  fi

  rm -rf "$tmp_dir"
  return "$exit_code"
}

# Function to run brew with retries and an inactivity watchdog.
safe_brew() {
  local max_attempts="${SETUP_PHP_BREW_RETRY_ATTEMPTS:-3}"
  local attempt=1
  local exit_code=0

  if [ "${SETUP_PHP_BREW_WATCHDOG:-true}" = "false" ]; then
    brew "$@"
    return $?
  fi

  while [ "$attempt" -le "$max_attempts" ]; do
    run_with_inactivity_watchdog brew "$@" && return 0
    exit_code=$?

    if [ "$attempt" -ge "$max_attempts" ]; then
      return "$exit_code"
    fi

    printf "setup-php: retrying brew command (attempt %s/%s, exit %s)\n" "$((attempt + 1))" "$max_attempts" "$exit_code" >&2
    sleep "$((attempt * 5))"
    attempt=$((attempt + 1))
  done

  return "$exit_code"
}

# Function to add brew.
add_brew() {
  brew_prefix="$(get_brew_prefix)"
  if ! [ -d "$brew_prefix"/bin ]; then
    step_log "Setup Brew"
    get -s "" "/tmp/install.sh" "https://raw.githubusercontent.com/Homebrew/install/main/install.sh" | bash -s >/dev/null 2>&1
    add_log "${tick:?}" "Brew" "Installed Homebrew"
  fi
  add_brew_bins_to_path "$brew_prefix"
}

# Function to configure brew constants.
configure_brew() {
  brew_path="$(command -v brew)"
  if [ -z "$brew_path" ]; then
    add_brew
    brew_path="$(command -v brew)"
  fi
  brew_opts=(-f)
  brew_path_dir="$(dirname "$brew_path")"
  brew_prefix="$brew_path_dir"/..
  brew_repo="$brew_path_dir/$(dirname "$(readlink "$brew_path")")"/..
  tap_dir="$brew_repo"/Library/Taps
  core_repo="$tap_dir"/homebrew/homebrew-core

  export HOMEBREW_CHANGE_ARCH_TO_ARM=1
  export HOMEBREW_NO_AUTO_UPDATE=1
  export HOMEBREW_NO_ENV_HINTS=1
  export HOMEBREW_NO_INSTALL_CLEANUP=1
  export HOMEBREW_NO_INSTALLED_DEPENDENTS_CHECK=1
  export HOMEBREW_DOWNLOAD_CONCURRENCY="${HOMEBREW_DOWNLOAD_CONCURRENCY:-6}"
  export brew_opts
  export brew_path
  export brew_path_dir
  export brew_prefix
  export brew_repo
  export tap_dir
  export core_repo
}
