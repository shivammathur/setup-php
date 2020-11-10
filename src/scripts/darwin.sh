# Function to setup environment for self-hosted runners.
self_hosted_helper() {
  if ! command -v brew >/dev/null; then
    step_log "Setup Brew"
    get -q -e "/tmp/install.sh" "https://raw.githubusercontent.com/Homebrew/install/master/install.sh" && /tmp/install.sh >/dev/null 2>&1
    add_log "${tick:?}" "Brew" "Installed Homebrew"
  fi
}

# Function to remove extensions.
remove_extension() {
  extension=$1
  if check_extension "$extension"; then
    sudo sed -i '' "/$extension/d" "${ini_file:?}"
    sudo rm -rf "${scan_dir:?}"/*"$extension"* "${ext_dir:?}"/"$extension".so >/dev/null 2>&1
    (! check_extension "$extension" && add_log "${tick:?}" ":$extension" "Removed") ||
      add_log "${cross:?}" ":$extension" "Could not remove $extension on PHP ${semver:?}"
  else
    add_log "${tick:?}" ":$extension" "Could not find $extension on PHP $semver"
  fi
}

# Function to install a specific version of PECL extension.
add_pecl_extension() {
  extension=$1
  pecl_version=$2
  prefix=$3
  enable_extension "$extension" "$prefix"
  if [[ $pecl_version =~ .*(alpha|beta|rc|snapshot|preview).* ]]; then
    pecl_version=$(get_pecl_version "$extension" "$pecl_version")
  fi
  ext_version=$(php -r "echo phpversion('$extension');")
  if [ "$ext_version" = "$pecl_version" ]; then
    add_log "${tick:?}" "$extension" "Enabled"
  else
    remove_extension "$extension" >/dev/null 2>&1
    pecl_install "$extension-$pecl_version"
    add_extension_log "$extension-$pecl_version" "Installed and enabled"
  fi
}

# Function to install a php extension from shivammathur/extensions tap.
add_brew_extension() {
  extension=$1
  prefix=$2
  enable_extension "$extension" "$prefix"
  if check_extension "$extension"; then
    add_log "${tick:?}" "$extension" "Enabled"
  else
    if ! brew tap | grep -q shivammathur/extensions; then
      brew tap --shallow shivammathur/extensions >/dev/null 2>&1
    fi
    brew install "$extension@$version" >/dev/null 2>&1
    sudo cp "$(brew --prefix)/opt/$extension@$version/$extension.so" "$ext_dir"
    add_extension_log "$extension" "Installed and enabled"
  fi
}

# Function to setup extensions
add_extension() {
  extension=$1
  prefix=$2
  enable_extension "$extension" "$prefix"
  if check_extension "$extension"; then
    add_log "${tick:?}" "$extension" "Enabled"
  else
    [[ "$version" =~ 5.[4-5] ]] && [ "$extension" = "imagick" ] && brew install pkg-config imagemagick >/dev/null 2>&1
    pecl_install "$extension" >/dev/null 2>&1 &&
      if [[ "$version" =~ ${old_versions:?} ]]; then echo "$prefix=$ext_dir/$extension.so" >>"$ini_file"; fi
    add_extension_log "$extension" "Installed and enabled"
  fi
}

# Function to handle request to add phpize and php-config.
add_devtools() {
  tool=$1
  add_log "${tick:?}" "$tool" "Added $tool $semver"
}

# Function to handle request to add PECL.
add_pecl() {
  pecl_version=$(get_tool_version "pecl" "version")
  add_log "${tick:?}" "PECL" "Found PECL $pecl_version"
}

# Function to update dependencies.
update_dependencies() {
  if [[ "$version" =~ ${nightly_versions:?} ]] && [ "${runner:?}" != "self-hosted" ]; then
    tap_dir="$(brew --prefix)/Homebrew/Library/Taps"
    while read -r formula; do
      get -q -n "$tap_dir/homebrew/homebrew-core/Formula/$formula.rb" "https://raw.githubusercontent.com/Homebrew/homebrew-core/master/Formula/$formula.rb" &
      to_wait+=($!)
    done <"$tap_dir/shivammathur/homebrew-php/.github/deps/${ImageOS:?}_${ImageVersion:?}"
    wait "${to_wait[@]}"
  fi
}

# Function to setup PHP 5.6 and newer using Homebrew.
add_php() {
  action=$1
  if ! brew tap | grep -q shivammathur/php; then
    brew tap --shallow shivammathur/php
  fi
  update_dependencies
  if brew list php@"$version" 2>/dev/null | grep -q "Error" && [ "$action" != "upgrade" ]; then
    brew unlink php@"$version"
  else
    brew "$action" shivammathur/php/php@"$version"
  fi
  brew link --force --overwrite php@"$version"
}

# Function to Setup PHP
setup_php() {
  step_log "Setup PHP"
  existing_version=$(php-config --version 2>/dev/null | cut -c 1-3)
  if [[ "$version" =~ ${old_versions:?} ]]; then
    run_script "php5-darwin" "${version/./}" >/dev/null 2>&1
    status="Installed"
  elif [ "$existing_version" != "$version" ]; then
    add_php "install" >/dev/null 2>&1
    status="Installed"
  elif [ "$existing_version" = "$version" ] && [ "${update:?}" = "true" ]; then
    add_php "upgrade" >/dev/null 2>&1
    status="Updated to"
  else
    status="Found"
  fi
  ini_file=$(php -d "date.timezone=UTC" --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
  sudo chmod 777 "$ini_file" "${tool_path_dir:?}"
  echo -e "date.timezone=UTC\nmemory_limit=-1" >>"$ini_file"
  ext_dir=$(php -i | grep -Ei "extension_dir => /" | sed -e "s|.*=> s*||")
  scan_dir=$(php --ini | grep additional | sed -e "s|.*: s*||")
  sudo mkdir -m 777 -p "$ext_dir" "$HOME/.composer"
  semver=$(php -v | head -n 1 | cut -f 2 -d ' ')
  if [[ ! "$version" =~ $old_versions ]]; then configure_pecl >/dev/null 2>&1; fi
  sudo cp "$dist"/../src/configs/*.json "$RUNNER_TOOL_CACHE/"
  add_log "$tick" "PHP" "$status PHP $semver"
}

# Variables
version=$1
dist=$2
export HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_NO_AUTO_UPDATE=1

# shellcheck source=.
. "${dist}"/../src/scripts/common.sh
read_env
self_hosted_setup
setup_php
