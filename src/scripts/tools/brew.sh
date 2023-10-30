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
      brew tap "$tap" 
    else
      fetch_brew_tap "$tap" 
      if ! [ -d "$tap_dir/$tap" ]; then
        brew tap "$tap" 
      fi
    fi
  fi
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

# Function to add brew.
add_brew() {
  brew_prefix="$(get_brew_prefix)"
  if ! [ -d "$brew_prefix"/bin ]; then
    step_log "Setup Brew"
    get -s "" "/tmp/install.sh" "https://raw.githubusercontent.com/Homebrew/install/master/install.sh" | bash -s 
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
  brew_path_dir="$(dirname "$brew_path")"
  brew_prefix="$brew_path_dir"/..
  brew_repo="$brew_path_dir/$(dirname "$(readlink "$brew_path")")"/..
  tap_dir="$brew_repo"/Library/Taps
  core_repo="$tap_dir"/homebrew/homebrew-core

  export HOMEBREW_CHANGE_ARCH_TO_ARM=1
  export HOMEBREW_DEVELOPER=1
  export HOMEBREW_NO_AUTO_UPDATE=1
  export HOMEBREW_NO_ENV_HINTS=1
  export HOMEBREW_NO_INSTALL_CLEANUP=1
  export HOMEBREW_NO_INSTALLED_DEPENDENTS_CHECK=1
  export brew_path
  export brew_path_dir
  export brew_prefix
  export brew_repo
  export tap_dir
  export core_repo
}
