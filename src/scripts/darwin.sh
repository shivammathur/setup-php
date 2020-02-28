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
  php -m | grep -i -q -w "$extension"
}

# Fuction to get the PECL version
get_pecl_version() {
  extension=$1
  stability=$2
  pecl_rest='https://pecl.php.net/rest/r/'
  response=$(curl -q -sSL "$pecl_rest$extension"/allreleases.xml)
  pecl_version=$(echo "$response" | grep -m 1 -Eo "(\d*\.\d*\.\d*$stability\d*)")
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
  if ! check_extension "$extension" && [ -e "$ext_dir/$extension.so" ]; then
    echo "$prefix=$ext_dir/$extension.so" >>"$ini_file"
  fi
  ext_version=$(php -r "echo phpversion('$extension');")
  if [ "$ext_version" = "$pecl_version" ]; then
    add_log "$tick" "$extension" "Enabled"
  else
    remove_extension "$extension"
    (
      sudo pecl install -f "$extension-$pecl_version" >/dev/null 2>&1 &&
      check_extension "$extension" &&
      add_log "$tick" "$extension" "Installed and enabled"
    ) || add_log "$cross" "$extension" "Could not install $extension-$pecl_version on PHP $semver"
  fi
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

# Function to setup a remote tool
add_tool() {
  url=$1
  tool=$2
  tool_path="$tool_path_dir/$tool"
  if [ ! -e "$tool_path" ]; then
    rm -rf "$tool_path"
  fi

  status_code=$(sudo curl -s -w "%{http_code}" -o "$tool_path" -L "$url")
  if [ "$status_code" = "200" ]; then
    sudo chmod a+x "$tool_path"
    if [ "$tool" = "composer" ]; then
      composer -q global config process-timeout 0
    elif [ "$tool" = "phive" ]; then
      add_extension curl "sudo pecl install -f curl" extension >/dev/null 2>&1
      add_extension mbstring "sudo pecl install -f mbstring" extension >/dev/null 2>&1
      add_extension xml "sudo pecl install -f xml" extension >/dev/null 2>&1
    elif [ "$tool" = "cs2pr" ]; then
      sudo sed -i '' 's/exit(9)/exit(0)/' "$tool_path"
      tr -d '\r' <"$tool_path" | sudo tee "$tool_path.tmp" >/dev/null 2>&1 && sudo mv "$tool_path.tmp" "$tool_path"
      sudo chmod a+x "$tool_path"
    elif [ "$tool" = "wp-cli" ]; then
      sudo cp -p "$tool_path" "$tool_path_dir"/wp
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
    sudo ln -sf "$(composer -q global config home)"/vendor/bin/"$tool" /usr/local/bin/"$tool" &&
    add_log "$tick" "$tool" "Added"
  ) || add_log "$cross" "$tool" "Could not setup $tool"
}

add_blackfire() {
  sudo mkdir -p usr/local/var/run
  brew tap blackfireio/homebrew-blackfire >/dev/null 2>&1
  brew install blackfire-agent >/dev/null 2>&1
  sudo blackfire-agent --register --server-id="$BLACKFIRE_SERVER_ID" --server-token="$BLACKFIRE_SERVER_TOKEN" >/dev/null 2>&1
  brew services start blackfire-agent >/dev/null 2>&1
  sudo blackfire --config --client-id="$BLACKFIRE_CLIENT_ID" --client-token="$BLACKFIRE_CLIENT_TOKEN" >/dev/null 2>&1

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

# Function to get api version for PHP 5.3, 5.4 and 5.5
get_old_apiv() {
  case $version in
    5.3) echo "20090626" ;;
    5.4) echo "20100525" ;;
    5.5) echo "20121212" ;;
  esac
}

# Function to setup PHP 5.3, 5.4 and 5.5
setup_php_old() {
  ext_dir_parent="$php5"/lib/php/extensions
  ext_dir_name=no-debug-non-zts-$(get_old_apiv)
  ext_dir="$ext_dir_parent/$ext_dir_name"
  sudo mv "$ext_dir" /tmp >/dev/null 2>&1 && sudo rm -rf "$php5"
  sudo curl -s https://php-osx.liip.ch/install.sh | bash -s "$version" >/dev/null 2>&1
  sudo rsync -a /tmp/"$ext_dir_name"/ "$ext_dir" >/dev/null 2>&1
  sudo rm -rf "$php5"/php.d/*developer.ini "$php5"/php.d/*xdebug.ini /tmp/"$ext_dir_name"
  for tool in pear peardev pecl php php-config phpize; do
    sudo ln -sf "$php5"/bin/"$tool" /usr/local/bin/"$tool"
  done
}

# Function to setup PHP >=5.6
setup_php() {
  action=$1
  export HOMEBREW_NO_INSTALL_CLEANUP=TRUE >/dev/null 2>&1
  brew tap shivammathur/homebrew-php >/dev/null 2>&1
  brew "$action" shivammathur/php/php@"$version" >/dev/null 2>&1
  brew link --force --overwrite php@"$version" >/dev/null 2>&1
}

# Variables
tick="✓"
cross="✗"
version=$1
old_versions="5.[3-5]"
php5="/usr/local/php5"
tool_path_dir="/usr/local/bin"
existing_version=$(php-config --version | cut -c 1-3)
[[ -z "${update}" ]] && update='false' || update="${update}"

# Setup PHP
step_log "Setup PHP"
if [[ "$version" =~ $old_versions ]]; then
  setup_php_old
  status="Installed"
elif [ "$existing_version" != "$version" ]; then
  setup_php "install"
  status="Installed"
elif [ "$existing_version" = "$version" ] && [ "$update" = "true" ]; then
  setup_php "upgrade"
  status="Updated to"
else
  status="Found"
fi
ini_file=$(php -d "date.timezone=UTC" --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
sudo chmod 777 "$ini_file" "$tool_path_dir"
echo "date.timezone=UTC" >>"$ini_file"
echo "detect_unicode=Off" >>"$ini_file"
ext_dir=$(php -i | grep -Ei "extension_dir => /usr" | sed -e "s|.*=> s*||")
scan_dir=$(php --ini | grep additional | sed -e "s|.*: s*||")
sudo mkdir -p "$ext_dir"
semver=$(php -v | head -n 1 | cut -f 2 -d ' ')
configure_pecl
add_log "$tick" "PHP" "$status PHP $semver"
