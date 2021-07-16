# Function to setup environment for self-hosted runners.
self_hosted_helper() {
  if ! command -v brew >/dev/null; then
    step_log "Setup Brew"
    get -q -e "/tmp/install.sh" "https://raw.githubusercontent.com/Homebrew/install/master/install.sh" && /tmp/install.sh >/dev/null 2>&1
    add_log "${tick:?}" "Brew" "Installed Homebrew"
  fi
}

# Function to delete extension.
delete_extension() {
  extension=$1
  sudo rm -rf "${scan_dir:?}"/*"$extension"* "${ext_dir:?}"/"$extension".so >/dev/null 2>&1
}

# Function to disable extension.
disable_extension() {
  extension=$1
  sudo sed -Ei '' "/=(.*\/)?\"?$extension(.so)?$/d" "${ini_file:?}"
}

# Function to remove extensions.
remove_extension() {
  extension=$1
  if check_extension "$extension"; then
    disable_extension "$extension"
    delete_extension "$extension"
    (! check_extension "$extension" && add_log "${tick:?}" ":$extension" "Removed") ||
      add_log "${cross:?}" ":$extension" "Could not remove $extension on PHP ${semver:?}"
  else
    add_log "${tick:?}" ":$extension" "Could not find $extension on PHP $semver"
  fi
}

# Function to fetch a brew tap.
fetch_brew_tap() {
  tap=$1
  tap_user=$(dirname "$tap")
  tap_name=$(basename "$tap")
  mkdir -p "$tap_dir/$tap_user"
  get -s -n "" "https://github.com/$tap/archive/master.tar.gz" | sudo tar -xzf - -C "$tap_dir/$tap_user"
  if [ -d "$tap_dir/$tap_user/$tap_name-master" ]; then
    sudo mv "$tap_dir/$tap_user/$tap_name-master" "$tap_dir/$tap_user/$tap_name"
  fi
}

# Function to add a brew tap.
add_brew_tap() {
  tap=$1
  if ! [ -d "$tap_dir/$tap" ]; then
    if [ "${runner:?}" = "self-hosted" ]; then
      brew tap --shallow "$tap" >/dev/null 2>&1
    else
      fetch_brew_tap "$tap" >/dev/null 2>&1
      if ! [ -d "$tap_dir/$tap" ]; then
        brew tap --shallow "$tap" >/dev/null 2>&1
      fi
    fi
  fi
}

# Function to install a php extension from shivammathur/extensions tap.
add_brew_extension() {
  formula=$1
  prefix=$2
  extension="$(echo "$formula" | sed -E "s/pecl_|[0-9]//g")"
  enable_extension "$extension" "$prefix"
  if check_extension "$extension"; then
    add_log "${tick:?}" "$extension" "Enabled"
  else
    add_brew_tap shivammathur/homebrew-php
    add_brew_tap shivammathur/homebrew-extensions
    sudo mv "$tap_dir"/shivammathur/homebrew-extensions/.github/deps/"$formula"/* "$tap_dir/homebrew/homebrew-core/Formula/" 2>/dev/null || true
    update_dependencies >/dev/null 2>&1
    brew install -f "$formula@$version" >/dev/null 2>&1
    sudo cp "$brew_prefix/opt/$formula@$version/$extension.so" "$ext_dir"
    add_extension_log "$extension" "Installed and enabled"
  fi
}

# Function to setup extensions.
add_extension() {
  extension=$1
  prefix=$2
  enable_extension "$extension" "$prefix"
  if check_extension "$extension"; then
    add_log "${tick:?}" "$extension" "Enabled"
  else
    if [[ "$version" =~ ${old_versions:?} ]] && [ "$extension" = "imagick" ]; then
      run_script "php5-darwin" "${version/./}" "$extension" >/dev/null 2>&1
    else
      pecl_install "$extension" >/dev/null 2>&1 &&
      if [[ "$version" =~ ${old_versions:?} ]]; then echo "$prefix=$ext_dir/$extension.so" >>"$ini_file"; fi
    fi
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
  configure_pecl >/dev/null 2>&1
  pecl_version=$(get_tool_version "pecl" "version")
  add_log "${tick:?}" "PECL" "Found PECL $pecl_version"
}

# Function to link all libraries of a formula.
link_libraries() {
  formula=$1
  formula_prefix="$(brew --prefix "$formula")"
  sudo mkdir -p "$formula_prefix"/lib
  for lib in "$formula_prefix"/lib/*.dylib; do
    lib_name=$(basename "$lib")
    sudo cp -a "$lib" "$brew_prefix/lib/$lib_name" 2>/dev/null || true
  done
}

# Patch brew to overwrite packages.
patch_brew() {
  formula_installer="$brew_repo"/Library/Homebrew/formula_installer.rb
  code=" keg.link(verbose: verbose?"
  sudo sed -i '' "s/$code)/$code, overwrite: true)/" "$formula_installer"
  # shellcheck disable=SC2064
  trap "sudo sed -i '' 's/$code, overwrite: true)/$code)/' $formula_installer" exit
}

# Helper function to update the dependencies.
update_dependencies_helper() {
  dependency=$1
  get -q -n "$tap_dir/homebrew/homebrew-core/Formula/$dependency.rb" "https://raw.githubusercontent.com/Homebrew/homebrew-core/master/Formula/$dependency.rb"
  link_libraries "$dependency"
}

# Function to update dependencies.
update_dependencies() {
  if ! [ -e /tmp/update_dependencies ] && [ "${runner:?}" != "self-hosted" ] && [ "${ImageOS:-}" != "" ] && [ "${ImageVersion:-}" != "" ]; then
    patch_brew
    while read -r dependency; do
      update_dependencies_helper "$dependency" &
      to_wait+=($!)
    done <"$tap_dir/shivammathur/homebrew-php/.github/deps/${ImageOS:?}_${ImageVersion:?}"
    wait "${to_wait[@]}"
    echo '' | sudo tee /tmp/update_dependencies >/dev/null 2>&1
  fi
}

# Function to fix dependencies on install PHP version.
fix_dependencies() {
  broken_deps_paths=$(php -v 2>&1 | grep -Eo '/opt/[a-zA-Z0-9@\.]+')
  if [ "x$broken_deps_paths" != "x" ]; then
    update_dependencies
    IFS=" " read -r -a formulae <<< "$(echo "$broken_deps_paths" | tr '\n' ' ' | sed 's|/opt/||g' 2>&1)$php_formula"
    brew reinstall "${formulae[@]}"
    brew link --force --overwrite "$php_formula" || true
  fi
}

# Function to get PHP version if it is already installed using Homebrew.
get_brewed_php() {
  php_cellar="$brew_prefix"/Cellar/php
  if [ -d "$php_cellar" ] && ! [[ "$(find "$php_cellar" -maxdepth 1 -name "$version*" | wc -l 2>/dev/null)" -eq 0 ]]; then
    php-config --version 2>/dev/null | cut -c 1-3
  else
    echo 'false';
  fi
}

# Function to setup PHP 5.6 and newer using Homebrew.
add_php() {
  action=$1
  existing_version=$2
  add_brew_tap shivammathur/homebrew-php
  update_dependencies
  if [ "$existing_version" != "false" ]; then
    ([ "$action" = "upgrade" ] && brew upgrade -f "$php_formula") || brew unlink "$php_formula"
  else
    brew install -f "$php_formula"
  fi
  brew link --force --overwrite "$php_formula"
}

# Function to get extra version.
php_extra_version() {
  if [[ ${version:?} =~ ${nightly_versions:?} ]]; then
    echo " ($(brew cat "$php_formula" | grep -Eo "commit=[0-9a-zA-Z]+" | cut -d'=' -f 2))"
  fi
}

# Function to Setup PHP.
setup_php() {
  step_log "Setup PHP"
  existing_version=$(get_brewed_php)
  if [[ "$version" =~ ${old_versions:?} ]]; then
    run_script "php5-darwin" "${version/./}" >/dev/null 2>&1
    status="Installed"
  elif [ "$existing_version" != "$version" ]; then
    add_php "install" "$existing_version" >/dev/null 2>&1
    status="Installed"
  elif [ "$existing_version" = "$version" ] && [ "${update:?}" = "true" ]; then
    add_php "upgrade" "$existing_version" >/dev/null 2>&1
    status="Updated to"
  else
    status="Found"
    fix_dependencies >/dev/null 2>&1
  fi
  ini_file=$(php -d "date.timezone=UTC" --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
  sudo chmod 777 "$ini_file" "${tool_path_dir:?}"
  configure_php
  ext_dir=$(php -i | grep -Ei "extension_dir => /" | sed -e "s|.*=> s*||")
  scan_dir=$(php --ini | grep additional | sed -e "s|.*: s*||")
  sudo mkdir -m 777 -p "$ext_dir" "$HOME/.composer"
  semver=$(php_semver)
  extra_version=$(php_extra_version)
  if [ "${semver%.*}" != "$version" ]; then
    add_log "$cross" "PHP" "Could not setup PHP $version"
    exit 1
  fi

  sudo cp "$dist"/../src/configs/*.json "$RUNNER_TOOL_CACHE/"
  echo "::set-output name=php-version::$semver"
  add_log "$tick" "PHP" "$status PHP $semver$extra_version"
}

# Variables
version=$1
dist=$2
php_formula=shivammathur/php/php@"$version"
brew_prefix="$(brew --prefix)"
brew_repo="$(brew --repository)"
tap_dir="$brew_repo"/Library/Taps
scripts="${dist}"/../src/scripts
export HOMEBREW_CHANGE_ARCH_TO_ARM=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALLED_DEPENDENTS_CHECK=1

# shellcheck source=.
. "${scripts:?}"/ext/source.sh
. "${scripts:?}"/tools/add_tools.sh
. "${scripts:?}"/common.sh
read_env
self_hosted_setup
setup_php
