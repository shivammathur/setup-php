# Function to log start of a operation
step_log() {
  message=$1
  printf "\n\033[90;1m==> \033[0m\033[37;1m%s\033[0m\n" "$message"
}

# Function to log result of a operation
add_log() {
  mark=$1
  subject=$2
  message=$3
  if [ "$mark" = "$tick" ]; then
    printf "\033[32;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s\033[0m\n" "$mark" "$subject" "$message"
  else
    printf "\033[31;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s\033[0m\n" "$mark" "$subject" "$message"
  fi
}

# Function to remove extensions
remove_extension() {
  extension=$1
  sudo sed -Ei '' "/=(.*\/)?\"?$extension/d" "$ini_file"
  sudo rm -rf "$scan_dir"/*"$extension"* 
  sudo rm -rf "$ext_dir"/"$extension".so 
}

# Function to test if extension is loaded
check_extension() {
  extension=$1
  if [ "$extension" != "mysql" ]; then
    php -m | grep -i -q -w "$extension"
  else
    php -m | grep -i -q "$extension"
  fi
}

# Function to install PECL extensions and accept default options
pecl_install() {
  local extension=$1
  yes '' | sudo pecl install -f "$extension" 
}

# Function to get the PECL version
get_pecl_version() {
  extension=$1
  stability="$(echo "$2" | grep -m 1 -Eio "(alpha|beta|rc|snapshot|preview)")"
  pecl_rest='https://pecl.php.net/rest/r/'
  response=$(curl "${curl_opts[@]}" "$pecl_rest$extension"/allreleases.xml)
  pecl_version=$(echo "$response" | grep -m 1 -Eio "([0-9]+\.[0-9]+\.[0-9]+${stability}[0-9]+)")
  if [ ! "$pecl_version" ]; then
    pecl_version=$(echo "$response" | grep -m 1 -Eo "([0-9]+\.[0-9]+\.[0-9]+)")
  fi
  echo "$pecl_version"
}

# Function to install a PECL version
add_pecl_extension() {
  extension=$1
  pecl_version=$2
  prefix=$3
  if [[ $pecl_version =~ .*(alpha|beta|rc|snapshot|preview).* ]]; then
    pecl_version=$(get_pecl_version "$extension" "$pecl_version")
  fi
  if ! check_extension "$extension" && [ -e "$ext_dir/$extension.so" ]; then
    echo "$prefix=$ext_dir/$extension.so" >>"$ini_file"
  fi
  ext_version=$(php -r "echo phpversion('$extension');")
  if [ "$ext_version" = "$pecl_version" ]; then
    add_log "$tick" "$extension" "Enabled"
  else
    remove_extension "$extension"
    (
      pecl_install "$extension-$pecl_version"  &&
      check_extension "$extension" &&
      add_log "$tick" "$extension" "Installed and enabled"
    ) || add_log "$cross" "$extension" "Could not install $extension-$pecl_version on PHP $semver"
  fi
}

# Function to fetch a brew tap
fetch_brew_tap() {
  tap=$1
  tap_user=$(dirname "$tap")
  tap_name=$(basename "$tap")
  mkdir -p "$tap_dir/$tap_user"
  sudo curl "${curl_opts[@]}" "https://github.com/$tap/archive/master.tar.gz" | sudo tar -xzf - -C "$tap_dir/$tap_user"
  if [ -d "$tap_dir/$tap_user/$tap_name-master" ]; then
    sudo mv "$tap_dir/$tap_user/$tap_name-master" "$tap_dir/$tap_user/$tap_name"
  fi
}

# Function to add a brew tap.
add_brew_tap() {
  tap=$1
  if ! [ -d "$tap_dir/$tap" ]; then
    fetch_brew_tap "$tap" 
    if ! [ -d "$tap_dir/$tap" ]; then
      brew tap --shallow "$tap" 
    fi
  fi
}

# Function to install a php extension from shivammathur/extensions tap.
add_brew_extension() {
  formula=$1
  extension=${formula//[0-9]/}
  add_brew_tap shivammathur/homebrew-php
  add_brew_tap shivammathur/homebrew-extensions
  sudo mv "$tap_dir"/shivammathur/homebrew-extensions/.github/deps/"$formula"/* "$tap_dir/homebrew/homebrew-core/Formula/" 2>/dev/null || true
  brew install "$formula@$version"
  sudo cp "$brew_prefix/opt/$formula@$version/$extension.so" "$ext_dir"
}

# Function to setup extensions
add_extension() {
  extension=$1
  install_command=$2
  prefix=$3
  if ! check_extension "$extension" && [ -e "$ext_dir/$extension.so" ]; then
    echo "$prefix=$ext_dir/$extension.so" >>"$ini_file" && add_log "$tick" "$extension" "Enabled"
  elif check_extension "$extension"; then
    add_log "$tick" "$extension" "Enabled"
  elif ! check_extension "$extension"; then
    (
      eval "$install_command"  &&
      check_extension "$extension" &&
      add_log "$tick" "$extension" "Installed and enabled"
    ) || add_log "$cross" "$extension" "Could not install $extension on PHP $semver"
  fi
}

# Function to pre-release extensions using PECL
add_unstable_extension() {
  extension=$1
  stability=$2
  prefix=$3
  pecl_version=$(get_pecl_version "$extension" "$stability")
  add_pecl_extension "$extension" "$pecl_version" "$prefix"
}

# Function to configure composer
configure_composer() {
  tool_path=$1
  sudo ln -sf "$tool_path" "$tool_path.phar"
  php -r "try {\$p=new Phar('$tool_path.phar', 0);exit(0);} catch(Exception \$e) {exit(1);}"
  if [ $? -eq 1 ]; then
    add_log "$cross" "composer" "Could not download composer"
    exit 1;
  fi
  if ! [ -e "$composer_json" ]; then
    echo '{}' | tee "$composer_json" 
    sudo chmod 644 "$composer_json"
  fi
  composer -q config -g process-timeout 0
  echo "$composer_bin" >> "$GITHUB_PATH"
  if [ -n "$COMPOSER_TOKEN" ]; then
    composer -q config -g github-oauth.github.com "$COMPOSER_TOKEN"
  fi
}

# Function to setup a remote tool.
add_tool() {
  url=$1
  tool=$2
  tool_path="$tool_path_dir/$tool"
  if [ ! -e "$tool_path" ]; then
    rm -rf "$tool_path"
  fi
  if [ "$tool" = "composer" ]; then
    IFS="," read -r -a urls <<< "$url"
    status_code=$(sudo curl -f -w "%{http_code}" -o "$tool_path" "${curl_opts[@]}" "${urls[0]}") ||
    status_code=$(sudo curl -w "%{http_code}" -o "$tool_path" "${curl_opts[@]}" "${urls[1]}")
  else
    status_code=$(sudo curl -w "%{http_code}" -o "$tool_path" "${curl_opts[@]}" "$url")
  fi
  if [ "$status_code" != "200" ] && [[ "$url" =~ .*github.com.*releases.*latest.* ]]; then
    url="${url//releases\/latest\/download/releases/download/$(curl "${curl_opts[@]}" "$(echo "$url" | cut -d '/' -f '1-5')/releases" | grep -Eo -m 1 "([0-9]+\.[0-9]+\.[0-9]+)/$(echo "$url" | sed -e "s/.*\///")" | cut -d '/' -f 1)}"
    status_code=$(sudo curl -w "%{http_code}" -o "$tool_path" "${curl_opts[@]}" "$url")
  fi
  if [ "$status_code" = "200" ]; then
    sudo chmod a+x "$tool_path"
    if [ "$tool" = "composer" ]; then
      configure_composer "$tool_path"
    elif [ "$tool" = "phan" ]; then
      add_extension fileinfo "pecl_install fileinfo" extension 
      add_extension ast "pecl_install ast" extension 
    elif [ "$tool" = "phive" ]; then
      add_extension curl "pecl_install curl" extension 
      add_extension mbstring "pecl_install mbstring" extension 
      add_extension xml "pecl_install xml" extension 
    elif [ "$tool" = "cs2pr" ]; then
      sudo sed -i '' 's/exit(9)/exit(0)/' "$tool_path"
      tr -d '\r' < "$tool_path" | sudo tee "$tool_path.tmp"  && sudo mv "$tool_path.tmp" "$tool_path"
      sudo chmod a+x "$tool_path"
    fi
    add_log "$tick" "$tool" "Added"
  else
    add_log "$cross" "$tool" "Could not setup $tool"
  fi
}

# Function to add a tool using composer
add_composertool() {
  tool=$1
  release=$2
  prefix=$3
  (
    sudo rm -f "$composer_lock"  || true
    composer global require "$prefix$release"  &&
    add_log "$tick" "$tool" "Added"
  ) || add_log "$cross" "$tool" "Could not setup $tool"
  if [ -e "$composer_bin/composer" ]; then
    sudo cp -p "$tool_path_dir/composer" "$composer_bin"
  fi
  if [ "$tool" = "codeception" ]; then
    sudo ln -s "$composer_bin"/codecept "$composer_bin"/codeception
  fi
}

# Function to configure PECL
configure_pecl() {
  for tool in pear pecl; do
    sudo "$tool" config-set php_ini "$ini_file" 
    sudo "$tool" channel-update "$tool".php.net 
  done
}

# Function to log PECL, it is installed along with PHP
add_pecl() {
  add_log "$tick" "PECL" "Added"
}

# Function to backup all libraries of a formula
link_libraries() {
  formula=$1
  formula_prefix="$(brew --prefix "$formula")"
  sudo mkdir -p "$formula_prefix"/lib
  for lib in "$formula_prefix"/lib/*.dylib; do
    [ -f "$lib" ] || break
    lib_name=$(basename "$lib")
    sudo cp -a "$lib" "$brew_prefix/lib/$lib_name" 2>/dev/null || true
  done
}

patch_brew() {
  sudo sed -i '' "s/ keg.link(verbose: verbose?)/ keg.link(verbose: verbose?, overwrite: true)/" "$brew_repo"/Library/Homebrew/formula_installer.rb
  # shellcheck disable=SC2064
  trap "git -C $brew_repo stash " exit
}

# Function to update dependencies
update_dependencies() {
  if [ "${ImageOS:-}" != "" ] && [ "${ImageVersion:-}" != "" ]; then
    patch_brew
    while read -r formula; do
      (
        curl -o "$tap_dir/homebrew/homebrew-core/Formula/$formula.rb" "${curl_opts[@]}" "https://raw.githubusercontent.com/Homebrew/homebrew-core/master/Formula/$formula.rb"
        link_libraries "$formula"
      ) &
      to_wait+=( $! )
    done < "$tap_dir/shivammathur/homebrew-php/.github/deps/${ImageOS:?}_${ImageVersion:?}"
    wait "${to_wait[@]}"
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

# Function to setup PHP and composer
setup_php() {
  add_brew_tap shivammathur/homebrew-php
  update_dependencies
  brew upgrade shivammathur/php/php@"$version" 2>/dev/null || brew install shivammathur/php/php@"$version"
  brew link --force --overwrite php@"$version"
}

# Function to configure PHP
configure_php() {
  (
    echo -e "date.timezone=UTC\nmemory_limit=-1"
    [[ "$version" =~ 8.0 ]] && echo -e "opcache.enable=1\nopcache.jit_buffer_size=256M\nopcache.jit=1235"
    [[ "$version" =~ 7.[2-4]|8.0 ]] && echo -e "xdebug.mode=coverage"
  ) | sudo tee -a "$ini_file" >/dev/null
}

# Variables
tick="✓"
cross="✗"
version=$1
dist=$2
tool_path_dir="/usr/local/bin"
curl_opts=(-sL)
composer_bin="$HOME/.composer/vendor/bin"
composer_json="$HOME/.composer/composer.json"
composer_lock="$HOME/.composer/composer.lock"
brew_prefix="$(brew --prefix)"
brew_repo="$(brew --repository)"
tap_dir="$brew_repo"/Library/Taps
existing_version=$(get_brewed_php)
export HOMEBREW_CHANGE_ARCH_TO_ARM=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALLED_DEPENDENTS_CHECK=1

# Setup PHP
step_log "Setup PHP"
if [ "$existing_version" != "$version" ]; then
  setup_php 
  status="Installed"
else
  status="Found"
fi
ini_file=$(php -d "date.timezone=UTC" --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
sudo chmod 777 "$ini_file" "$tool_path_dir"
configure_php
ext_dir=$(php -i | grep -Ei "extension_dir => /" | sed -e "s|.*=> s*||")
scan_dir=$(php --ini | grep additional | sed -e "s|.*: s*||")
sudo mkdir -m 777 -p "$ext_dir" "$HOME/.composer"
semver=$(php -v | head -n 1 | cut -f 2 -d ' ')
if [ "${semver%.*}" != "$version" ]; then
  add_log "$cross" "PHP" "Could not setup PHP $version"
  exit 1
fi
configure_pecl
sudo cp "$dist"/../src/configs/*.json "$RUNNER_TOOL_CACHE/"
add_log "$tick" "PHP" "$status PHP $semver"
