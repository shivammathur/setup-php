# Function to setup environment for self-hosted runners.
self_hosted_helper() {
  if ! command -v brew >/dev/null; then
    step_log "Set up Brew"
    get -q -e "/tmp/install.sh" "https://raw.githubusercontent.com/Homebrew/install/master/install.sh" && /tmp/install.sh >/dev/null 2>&1
    add_log "${tick:?}" "Brew" "Installed Homebrew"
  fi
}

# Disable dependency extensions
disable_dependency_extensions() {
  local extension=$1
  formula_file="$tap_dir/$ext_tap/Formula/$extension@${version:?}.rb"
  if [ -e "$formula_file" ]; then
    IFS=" " read -r -a dependency_extensions <<< "$(grep -Eo "shivammathur.*@" "$formula_file" | xargs -I {} -n 1 basename '{}' | cut -d '@' -f 1 | tr '\n' ' ')"
    for dependency_extension in "${dependency_extensions[@]}"; do
      sudo sed -Ei '' "/=(.*\/)?\"?$dependency_extension(.so)?$/d" "${ini_file:?}"
    done
  fi
}

# Helper function to disable an extension.
disable_extension_helper() {
  local extension=$1
  local disable_dependents=${2:-false}
  get_extension_map
  if [ "$disable_dependents" = "true" ]; then
    disable_extension_dependents "$extension"
  fi
  sudo sed -Ei '' "/=(.*\/)?\"?$extension(.so)?$/d" "${ini_file:?}"
  sudo rm -rf "$scan_dir"/*"$extension"* /tmp/php"$version"_extensions
  mkdir -p /tmp/extdisabled/"$version"
  echo '' | sudo tee /tmp/extdisabled/"$version"/"$extension" >/dev/null 2>&1
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
      brew tap "$tap" >/dev/null 2>&1
    else
      fetch_brew_tap "$tap" >/dev/null 2>&1
      if ! [ -d "$tap_dir/$tap" ]; then
        brew tap "$tap" >/dev/null 2>&1
      fi
    fi
  fi
}

# Function to get extension name from brew formula.
get_extension_from_formula() {
  local formula=$1
  local extension
  extension=$(grep "$formula=" "$src"/configs/brew_extensions | cut -d '=' -f 2)
  [[ -z "$extension" ]] && extension="$(echo "$formula" | sed -E "s/pecl_|[0-9]//g")"
  echo "$extension"
}

# Function to copy extension binaries to the extension directory.
copy_brew_extensions() {
  local formula=$1
  formula_file="$tap_dir/$ext_tap/Formula/$formula@$version.rb"
  deps="$(grep -Eo 'depends_on "shivammathur[^"]+' "$formula_file" | cut -d '/' -f 3 | tr '\n' ' ')"
  IFS=' ' read -r -a deps <<< "$formula@$version $deps"
  for dependency in "${deps[@]}"; do
    extension_file="$brew_prefix/opt/$dependency/$(get_extension_from_formula "${dependency%@*}").so"
    [ -e "$extension_file" ] && sudo cp "$extension_file" "$ext_dir"
  done
  sudo find -- "$brew_prefix"/Cellar/"$formula"@"$version" -name "*.dylib" -exec cp {} "$ext_dir" \;
}

# Function to install a php extension from shivammathur/extensions tap.
add_brew_extension() {
  formula=$1
  prefix=$2
  extension="$(get_extension_from_formula "$formula")"
  enable_extension "$extension" "$prefix"
  if check_extension "$extension"; then
    add_log "${tick:?}" "$extension" "Enabled"
  else
    add_brew_tap "$php_tap"
    add_brew_tap "$ext_tap"
    sudo mv "$tap_dir"/"$ext_tap"/.github/deps/"$formula"/* "$core_repo/Formula/" 2>/dev/null || true
    update_dependencies >/dev/null 2>&1
    disable_dependency_extensions "$extension" >/dev/null 2>&1
    brew install -f "$ext_tap/$formula@$version" >/dev/null 2>&1
    copy_brew_extensions "$formula"
    add_extension_log "$extension" "Installed and enabled"
  fi
}

# Helper function to add an extension.
add_extension_helper() {
  local extension=$1
  prefix=$2
  if [[ "$version" =~ ${old_versions:?} ]] && [ "$extension" = "imagick" ]; then
    run_script "php5-darwin" "${version/./}" "$extension" >/dev/null 2>&1
  else
    pecl_install "$extension" >/dev/null 2>&1 &&
    if [[ "$version" =~ ${old_versions:?} ]]; then echo "$prefix=$ext_dir/$extension.so" >>"$ini_file"; fi
  fi
  add_extension_log "$extension" "Installed and enabled"
}

# Function to handle request to add phpize and php-config.
add_devtools() {
  tool=$1
  add_log "${tick:?}" "$tool" "Added $tool $semver"
}

# Function to handle request to add PECL.
add_pecl() {
  enable_extension xml extension >/dev/null 2>&1
  configure_pecl >/dev/null 2>&1
  pear_version=$(get_tool_version "pecl" "version")
  add_log "${tick:?}" "PECL" "Found PECL $pear_version"
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
  code=" keg.link\(verbose: verbose\?"
  sudo sed -Ei '' "s/$code.*/$code, overwrite: true\)/" "$formula_installer"
  # shellcheck disable=SC2064
  trap "sudo sed -Ei '' 's/$code.*/$code, overwrite: overwrite?\)/' $formula_installer" exit
}

# Helper function to update the dependencies.
update_dependencies_helper() {
  dependency=$1
  get -q -n "$core_repo/Formula/$dependency.rb" "https://raw.githubusercontent.com/Homebrew/homebrew-core/master/Formula/$dependency.rb"
  link_libraries "$dependency"
}

# Function to update dependencies.
update_dependencies() {
  patch_brew
  if ! [ -e /tmp/update_dependencies ]; then
    if [ "${runner:?}" != "self-hosted" ] && [ "${ImageOS:-}" != "" ] && [ "${ImageVersion:-}" != "" ]; then
      while read -r dependency; do
        update_dependencies_helper "$dependency" &
        to_wait+=($!)
      done <"$tap_dir/$php_tap/.github/deps/${ImageOS:?}_${ImageVersion:?}"
      wait "${to_wait[@]}"
    else
      git -C "$core_repo" fetch origin master && git -C "$core_repo" reset --hard origin/master
    fi
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
    php_semver | cut -c 1-3
  else
    echo 'false';
  fi
}

# Function to setup PHP 5.6 and newer using Homebrew.
add_php() {
  action=$1
  existing_version=$2
  add_brew_tap "$php_tap"
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
  php_formula_file="$tap_dir"/"$php_tap"/Formula/php@"$version".rb
  if [ -e "$php_formula_file" ] && ! grep -q "deprecate!" "$php_formula_file" && grep -Eq "archive/[0-9a-zA-Z]+" "$php_formula_file"; then
    echo " ($(grep -Eo "archive/[0-9a-zA-Z]+" "$php_formula_file" | cut -d'/' -f 2))"
  fi
}

# Function to set php.ini
add_php_config() {
  if ! [ -e "$ini_dir"/php.ini-development ]; then
    sudo cp "$ini_dir"/php.ini "$ini_dir"/php.ini-development
  fi
  if [[ "$ini" = "production" || "$ini" = "development" ]]; then
    sudo cp "$ini_dir"/php.ini-"$ini" "$ini_dir"/php.ini
  elif [ "$ini" = "none" ]; then
    echo '' | sudo tee "${ini_file[@]}" >/dev/null 2>&1
  fi
}

# Function to get scan directory.
get_scan_dir() {
  if [[ "$version" =~ ${old_versions:?} ]]; then
    php --ini | grep additional | sed -e "s|.*: s*||"
  else
    echo "$ini_dir"/conf.d
  fi
}

# Function to set up PHP.
setup_php() {
  step_log "Set up PHP"
  php_config="$(command -v php-config 2>/dev/null)"
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
  php_config="$(command -v php-config)"
  ext_dir="$(grep 'extension_dir=' "$php_config" | cut -d "'" -f 2)"
  ini_dir="$(php_ini_path)"
  scan_dir="$(get_scan_dir)"
  ini_file="$ini_dir"/php.ini
  sudo mkdir -m 777 -p "$ext_dir" "$HOME/.composer"
  sudo chmod 777 "$ini_file" "${tool_path_dir:?}"
  semver="$(php_semver)"
  extra_version="$(php_extra_version)"
  configure_php
  set_output "php-version" "$semver"
  if [ "${semver%.*}" != "$version" ]; then
    add_log "${cross:?}" "PHP" "Could not setup PHP $version"
    exit 1
  fi

  sudo cp "$src"/configs/pm/*.json "$RUNNER_TOOL_CACHE/"
  add_log "$tick" "PHP" "$status PHP $semver$extra_version"
}

# Variables
version=${1:-'8.1'}
ini=${2:-'production'}
src=${0%/*}/..
php_formula=shivammathur/php/php@"$version"
brew_path="$(command -v brew)"
brew_path_dir="$(dirname "$brew_path")"
brew_prefix="$brew_path_dir"/..
brew_repo="$brew_path_dir/$(dirname "$(readlink "$brew_path")")"/..
tap_dir="$brew_repo"/Library/Taps
core_repo="$tap_dir"/homebrew/homebrew-core
scripts="$src"/scripts
ext_tap=shivammathur/homebrew-extensions
php_tap=shivammathur/homebrew-php
export HOMEBREW_CHANGE_ARCH_TO_ARM=1
export HOMEBREW_DEVELOPER=1
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_ENV_HINTS=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_NO_INSTALLED_DEPENDENTS_CHECK=1

# shellcheck source=.
. "${scripts:?}"/unix.sh
. "${scripts:?}"/tools/add_tools.sh
. "${scripts:?}"/extensions/source.sh
. "${scripts:?}"/extensions/add_extensions.sh
read_env
self_hosted_setup
setup_php
