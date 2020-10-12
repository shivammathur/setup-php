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
  sudo sed -i '' "/$extension/d" "$ini_file"
  sudo rm -rf "$scan_dir"/*"$extension"* >/dev/null 2>&1
  sudo rm -rf "$ext_dir"/"$extension".so >/dev/null 2>&1
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
  yes '' | sudo pecl install -f "$extension" >/dev/null 2>&1
}

# Function to get the PECL version
get_pecl_version() {
  extension=$1
  stability="$(echo "$2" | grep -m 1 -Eio "(alpha|beta|rc|snapshot)")"
  pecl_rest='https://pecl.php.net/rest/r/'
  response=$(curl "${curl_opts[@]}" "$pecl_rest$extension"/allreleases.xml)
  pecl_version=$(echo "$response" | grep -m 1 -Eio "(\d*\.\d*\.\d*$stability\d*)")
  if [ ! "$pecl_version" ]; then
    pecl_version=$(echo "$response" | grep -m 1 -Eo "(\d*\.\d*\.\d*)")
  fi
  echo "$pecl_version"
}

# Function to install a PECL version
add_pecl_extension() {
  extension=$1
  pecl_version=$2
  prefix=$3
  if [[ $pecl_version =~ .*(alpha|beta|rc|snapshot).* ]]; then
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
      pecl_install "$extension-$pecl_version" >/dev/null 2>&1 &&
      check_extension "$extension" &&
      add_log "$tick" "$extension" "Installed and enabled"
    ) || add_log "$cross" "$extension" "Could not install $extension-$pecl_version on PHP $semver"
  fi
}

# Function to install a php extension from shivammathur/extensions tap.
add_brew_extension() {
  extension=$1
  if ! brew tap | grep shivammathur/extensions; then
    brew tap --shallow shivammathur/extensions
  fi
  brew install "$extension@$version"
  sudo cp "$(brew --prefix)/opt/$extension@$version/$extension.so" "$ext_dir"
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
      eval "$install_command" >/dev/null 2>&1 &&
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
  composer -q global config process-timeout 0
  echo "/Users/$USER/.composer/vendor/bin" >> "$GITHUB_PATH"
  if [ -n "$COMPOSER_TOKEN" ]; then
    composer -q global config github-oauth.github.com "$COMPOSER_TOKEN"
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
  if [ "$status_code" = "200" ]; then
    sudo chmod a+x "$tool_path"
    if [ "$tool" = "composer" ]; then
      configure_composer "$tool_path"
    elif [ "$tool" = "phan" ]; then
      add_extension fileinfo "pecl_install fileinfo" extension >/dev/null 2>&1
      add_extension ast "pecl_install ast" extension >/dev/null 2>&1
    elif [ "$tool" = "phive" ]; then
      add_extension curl "pecl_install curl" extension >/dev/null 2>&1
      add_extension mbstring "pecl_install mbstring" extension >/dev/null 2>&1
      add_extension xml "pecl_install xml" extension >/dev/null 2>&1
    elif [ "$tool" = "cs2pr" ]; then
      sudo sed -i '' 's/exit(9)/exit(0)/' "$tool_path"
      tr -d '\r' < "$tool_path" | sudo tee "$tool_path.tmp" >/dev/null 2>&1 && sudo mv "$tool_path.tmp" "$tool_path"
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
    composer global require "$prefix$release" >/dev/null 2>&1 &&
    add_log "$tick" "$tool" "Added"
  ) || add_log "$cross" "$tool" "Could not setup $tool"
}

# Function to configure PECL
configure_pecl() {
  for tool in pear pecl; do
    sudo "$tool" config-set php_ini "$ini_file" >/dev/null 2>&1
    sudo "$tool" config-set auto_discover 1 >/dev/null 2>&1
    sudo "$tool" channel-update "$tool".php.net >/dev/null 2>&1
  done
}

# Function to log PECL, it is installed along with PHP
add_pecl() {
  add_log "$tick" "PECL" "Added"
}

# Function to setup PHP and composer
setup_php() {
  export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
  brew tap --shallow shivammathur/homebrew-php
  brew install shivammathur/php/php@"$version"
  brew link --force --overwrite php@"$version"
}

# Variables
tick="✓"
cross="✗"
version=$1
dist=$2
tool_path_dir="/usr/local/bin"
curl_opts=(-sL)
existing_version=$(php-config --version 2>/dev/null | cut -c 1-3)

# Setup PHP
step_log "Setup PHP"
if [ "$existing_version" != "$version" ]; then
  setup_php >/dev/null 2>&1
  status="Installed"
else
  status="Found"
fi
ini_file=$(php -d "date.timezone=UTC" --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
sudo chmod 777 "$ini_file" "$tool_path_dir"
echo -e "date.timezone=UTC\nmemory_limit=-1" >>"$ini_file"
ext_dir=$(php -i | grep -Ei "extension_dir => /" | sed -e "s|.*=> s*||")
scan_dir=$(php --ini | grep additional | sed -e "s|.*: s*||")
sudo mkdir -p "$ext_dir"
semver=$(php -v | head -n 1 | cut -f 2 -d ' ')
configure_pecl
sudo mv "$dist"/../src/configs/*.json "$RUNNER_TOOL_CACHE/"
add_log "$tick" "PHP" "$status PHP $semver"
