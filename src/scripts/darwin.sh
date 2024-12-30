# Handle dependency extensions
handle_dependency_extensions() {
  local formula=$1
  local extension=$2
  formula_file="${tap_dir:?}/$ext_tap/Formula/$extension@${version:?}.rb"
  [ -e "$formula_file" ] || formula_file="$tap_dir/$ext_tap/Formula/$formula@$version.rb"
  if [ -e "$formula_file" ]; then
    IFS=" " read -r -a dependency_extensions <<< "$(grep -Eo "shivammathur.*@" "$formula_file" | xargs -I {} -n 1 basename '{}' | cut -d '@' -f 1 | tr '\n' ' ')"
    for dependency_extension in "${dependency_extensions[@]}"; do
      sudo sed -Ei '' "/=(.*\/)?\"?$dependency_extension(.so)?$/d" "${ini_file:?}"
    done
  fi
  suffix="$(get_php_formula_suffix)"
  if [[ -n "$suffix" ]]; then
    brew_opts=(-sf)
    patch_abstract_file >/dev/null 2>&1
    for dependency_extension in "${dependency_extensions[@]}"; do
        brew install "${brew_opts[@]}" "$ext_tap/$dependency_extension@$version" >/dev/null 2>&1 && copy_brew_extensions "$dependency_extension"
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

# Function to get extension name from brew formula.
get_extension_from_formula() {
  local formula=$1
  local extension
  extension=$(grep -E "^$formula=" "$src"/configs/brew_extensions | cut -d '=' -f 2)
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
    extension_file="${brew_prefix:?}/opt/$dependency/$(get_extension_from_formula "${dependency%@*}").so"
    [ -e "$extension_file" ] && sudo cp "$extension_file" "$ext_dir"
  done
  if [ -d "$brew_prefix"/Cellar/"$formula"@"$version" ]; then
    sudo find -- "$brew_prefix"/Cellar/"$formula"@"$version" -name "*.dylib" -exec cp {} "$ext_dir" \;
  fi
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
    sudo mv "$tap_dir"/"$ext_tap"/.github/deps/"$formula"/* "${core_repo:?}/Formula/" 2>/dev/null || true
    update_dependencies >/dev/null 2>&1
    handle_dependency_extensions "$formula" "$extension" >/dev/null 2>&1
    (brew install "${brew_opts[@]}" "$ext_tap/$formula@$version" >/dev/null 2>&1 && copy_brew_extensions "$formula") || pecl_install "$extension" >/dev/null 2>&1
    add_extension_log "$extension" "Installed and enabled"
  fi
}

# Function to patch the abstract file in the extensions tap.
patch_abstract_file() {
    abstract_path="$tap_dir"/"$ext_tap"/Abstract/abstract-php-extension.rb
    if [[ -e "$abstract_path" && ! -e /tmp/abstract_patch ]]; then
        echo '' | sudo tee /tmp/abstract_patch >/dev/null 2>&1
        sudo sed -i '' -e "s|php@#{\(.*\)}|php@#{\1}$suffix|g" -e "s|php_version /|\"#{php_version}$suffix\" /|g" "$abstract_path"
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

# Link opcache extension to extensions directory.
link_opcache() {
  opcache_ini="$brew_prefix"/etc/php/"$version"/conf.d/ext-opcache.ini
  if [ -e "$opcache_ini" ]; then
    opcache_ext=$(grep -Eo "zend_extension.*opcache.*\.so" "$opcache_ini" | cut -d '"' -f 2)
    sudo ln -sf "$opcache_ext" "$ext_dir"
  fi
}

# Patch brew to overwrite packages.
patch_brew() {
  formula_installer="${brew_repo:?}"/Library/Homebrew/formula_installer.rb
  code=" keg.link\(verbose: verbose\?"
  sudo sed -Ei '' "s/$code.*/$code, overwrite: true\)/" "$formula_installer"
  # shellcheck disable=SC2064
  trap "sudo sed -Ei '' 's/$code.*/$code, overwrite: overwrite?\)/' $formula_installer" exit
}

# Function to update dependencies.
update_dependencies() {
  patch_brew
  if ! [ -e /tmp/update_dependencies ]; then
    for repo in "$brew_repo" "$core_repo"; do
      git_retry -C "$repo" fetch origin master && git -C "$repo" reset --hard origin/master
    done
    echo '' | sudo tee /tmp/update_dependencies >/dev/null 2>&1
  fi
}

# Function to get PHP version if it is already installed using Homebrew.
get_brewed_php() {
  cellar="$brew_prefix"/Cellar
  php_cellar="$cellar"/php
  if [ -d "$cellar" ] && ! [[ "$(find "$cellar" -maxdepth 1 -name "php@$version*" | wc -l 2>/dev/null)" -eq 0 ]]; then
    php_semver | cut -c 1-3
  elif [ -d "$php_cellar" ] && ! [[ "$(find "$php_cellar" -maxdepth 1 -name "$version*" | wc -l 2>/dev/null)" -eq 0 ]]; then
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
  suffix="$(get_php_formula_suffix)"
  php_formula="shivammathur/php/php@$version$suffix"
  if [[ "$existing_version" != "false" && -z "$suffix" ]]; then
    ([ "$action" = "upgrade" ] && brew upgrade -f --overwrite "$php_formula") || brew unlink "$php_formula"
  else
    brew install -f --overwrite "$php_formula"
  fi
  sudo chown -R "$(id -un)":"$(id -gn)" "$brew_prefix"
  brew link --force --overwrite "$php_formula"
}

# Function to get formula suffix
get_php_formula_suffix() {
  local suffix
  [ "${debug:?}" = "debug" ] && suffix="-debug"
  [ "${ts:?}" = "zts" ] && suffix="$suffix-zts"
  echo "$suffix"
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

# Function to Setup PHP.
setup_php() {
  step_log "Setup PHP"
  php_config="$(command -v php-config 2>/dev/null)"
  update=true
  check_pre_installed
  existing_version=$(get_brewed_php)
  if [[ "$version" =~ ${old_versions:?} ]]; then
    run_script "php5-darwin" "${version/./}" >/dev/null 2>&1
    status="Installed"
  elif [ "$existing_version" != "$version" ]; then
    add_php "install" "$existing_version" >/dev/null 2>&1
    status="Installed"
  elif [ "$existing_version" = "$version" ]; then
    if [ "${update:?}" = "true" ]; then
      add_php "upgrade" "$existing_version" >/dev/null 2>&1
      status="Updated to"
    else
      status="Found"
    fi
  fi
  php_config="$(command -v php-config)"
  ext_dir="$(sed -n "s/.*extension_dir=['\"]\(.*\)['\"].*/\1/p" "$php_config")"
  ini_dir="$(php_ini_path)"
  scan_dir="$(get_scan_dir)"
  ini_file="$ini_dir"/php.ini
  sudo mkdir -m 777 -p "$ext_dir" "$HOME/.composer"
  sudo chmod 777 "$ini_file" "${tool_path_dir:?}"
  semver="$(php_semver)"
  extra_version="$(php_extra_version)"
  configure_php
  link_opcache
  set_output "php-version" "$semver"
  if [ "${semver%.*}" != "$version" ]; then
    add_log "${cross:?}" "PHP" "Could not setup PHP $version"
    exit 1
  fi

  sudo cp "$src"/configs/pm/*.json "$RUNNER_TOOL_CACHE/"
  add_log "$tick" "PHP" "$status PHP $semver$extra_version"
}

# Variables
version=${1:-'8.4'}
ini=${2:-'production'}
src=${0%/*}/..
php_formula=shivammathur/php/php@"$version"
scripts="$src"/scripts
ext_tap=shivammathur/homebrew-extensions
php_tap=shivammathur/homebrew-php
export HOMEBREW_CHANGE_ARCH_TO_ARM=1
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_ENV_HINTS=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_NO_INSTALLED_DEPENDENTS_CHECK=1
export HOMEBREW_NO_INSTALL_FROM_API=1

# shellcheck source=.
. "${scripts:?}"/unix.sh
. "${scripts:?}"/tools/brew.sh
. "${scripts:?}"/tools/retry.sh
. "${scripts:?}"/tools/add_tools.sh
. "${scripts:?}"/extensions/source.sh
. "${scripts:?}"/extensions/add_extensions.sh
configure_brew
read_env
self_hosted_setup
setup_php
