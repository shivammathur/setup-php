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
  sudo rm -rf "$ext_dir"/"$extension".so >/dev/null 2>&1
}

# Function to setup extensions
add_extension() {
  extension=$1
  install_command=$2
  prefix=$3
  if ! php -m | grep -i -q -w "$extension" && [ -e "$ext_dir/$extension.so" ]; then
    echo "$prefix=$ext_dir/$extension.so" >>"$ini_file" && add_log "$tick" "$extension" "Enabled"
  elif php -m | grep -i -q -w "$extension"; then
    add_log "$tick" "$extension" "Enabled"
  elif ! php -m | grep -i -q -w "$extension"; then
    if [[ "$version" =~ $old_versions ]]; then
      (sudo port install php"$nodot_version"-"$extension" >/dev/null 2>&1 && add_log "$tick" "$extension" "Installed and enabled") ||
      (eval "$install_command" >/dev/null 2>&1 && echo "$prefix=$ext_dir/$extension.so" >>"$ini_file" && add_log "$tick" "$extension" "Installed and enabled") ||
      add_log "$cross" "$extension" "Could not install $extension on PHP $semver"
    else
      (eval "$install_command" >/dev/null 2>&1 && add_log "$tick" "$extension" "Installed and enabled") ||
      add_log "$cross" "$extension" "Could not install $extension on PHP $semver"
    fi
  fi
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

# Function to pre-release extensions using PECL
add_unstable_extension() {
  extension=$1
  stability=$2
  prefix=$3
  pecl_version=$(get_pecl_version "$extension" "$stability")
  if ! php -m | grep -i -q -w "$extension" && [ -e "$ext_dir/$extension.so" ]; then
    extension_version=$(php -d="$prefix=$extension" -r "echo phpversion('$extension');")
    if [ "$extension_version" = "$pecl_version" ]; then
      echo "$prefix=$extension" >>"$ini_file" && add_log "$tick" "$extension" "Enabled"
    else
      remove_extension "$extension"
      add_extension "$extension" "sudo pecl install -f $extension-$pecl_version" "$prefix"
    fi
  elif php -m | grep -i -q -w "$extension"; then
    extension_version=$(php -r "echo phpversion('$extension');")
    if [ "$extension_version" = "$pecl_version" ]; then
      add_log "$tick" "$extension" "Enabled"
    else
      remove_extension "$extension"
      add_extension "$extension" "sudo pecl install -f $extension-$pecl_version" "$prefix"
    fi
  else
    add_extension "$extension" "sudo pecl install -f $extension-$pecl_version" "$prefix"
  fi
}

# Function to setup a remote tool
add_tool() {
  url=$1
  tool=$2
  if [ "$tool" = "composer" ]; then
    brew install composer >/dev/null 2>&1
    composer -q global config process-timeout 0
    add_log "$tick" "$tool" "Added"
  else
    tool_path=/usr/local/bin/"$tool"
    if [ ! -e "$tool_path" ]; then
      rm -rf "$tool_path"
    fi

    status_code=$(sudo curl -s -w "%{http_code}" -o "$tool_path" -L "$url")
    if [ "$status_code" = "200" ]; then
      sudo chmod a+x "$tool_path"
      if [ "$tool" = "phive" ]; then
        add_extension curl "sudo pecl install -f curl" extension >/dev/null 2>&1
        add_extension mbstring "sudo pecl install -f mbstring" extension >/dev/null 2>&1
        add_extension xml "sudo pecl install -f xml" extension >/dev/null 2>&1
      elif [ "$tool" = "cs2pr" ]; then
        sudo sed -i '' 's/exit(9)/exit(0)/' "$tool_path"
        tr -d '\r' < "$tool_path" | sudo tee "$tool_path.tmp" >/dev/null 2>&1 && sudo mv "$tool_path.tmp" "$tool_path"
        sudo chmod a+x "$tool_path"
      fi
      add_log "$tick" "$tool" "Added"
    else
      add_log "$cross" "$tool" "Could not setup $tool"
    fi
  fi
}

# Function to add a tool using composer
add_composer_tool() {
  tool=$1
  release=$2
  prefix=$3
  (
    composer global require "$prefix$release" >/dev/null 2>&1 &&
    sudo ln -sf "$(composer -q global config home)"/vendor/bin/"$tool" /usr/local/bin/"$tool" &&
    add_log "$tick" "$tool" "Added"
  ) || add_log "$cross" "$tool" "Could not setup $tool"
}

# Function to configure PECL
configure_pecl() {
  if [[ ! "$version" =~ $old_versions ]]; then
    for tool in pear pecl; do
      sudo "$tool" config-set php_ini "$ini_file" >/dev/null 2>&1
      sudo "$tool" config-set auto_discover 1 >/dev/null 2>&1
      sudo "$tool" channel-update "$tool".php.net >/dev/null 2>&1
    done
  fi
}

# Function to log PECL, it is installed along with PHP
add_pecl() {
  add_log "$tick" "PECL" "Added"
}

# Function to add PECL when macports is used
add_pecl_old() {
  pecl_version='master'
  if [ "$1" = "53" ]; then
    pecl_version='v1.9.5'
  fi
  curl -o pear.phar -sSL https://github.com/pear/pearweb_phars/raw/$pecl_version/install-pear-nozlib.phar
  sudo php pear.phar -d /opt/local/lib/php$1 -b /usr/local/bin && rm -rf pear.phar
}

add_macports() {
  uri=$(curl -sSL https://github.com/macports/macports-base/releases | grep -Eo "(\/.*Catalina.pkg)" | head -n 1)
  curl -o port.pkg -sSL https://github.com"$uri"
  sudo installer -pkg port.pkg -target / && rm -rf port.pkg
}

sync_macports() {
  while true; do
    status=0
    sudo port sync || status=$?
    if [[ "$status" -eq 0 ]]; then
      break
    fi
    sleep 2
  done
}

port_setup_php() {
  sudo port install php$1 php$1-curl php$1-mbstring php$1-xmlrpc php$1-openssl php$1-opcache
  sudo cp /opt/local/etc/php$1/php.ini-development /opt/local/etc/php$1/php.ini
  sudo port select --set php php$1
  sudo ln -sf /opt/local/bin/* /usr/local/bin
  add_pecl_old "$1"
}

# Variables
tick="✓"
cross="✗"
version=$1
nodot_version=${1/./}
old_versions="5.[3-5]"
existing_version=$(php-config --version | cut -c 1-3)
[[ -z "${update}" ]] && update='false' || update="${update}"

# Setup PHP
step_log "Setup PHP"
if [[ "$version" =~ $old_versions ]]; then
  export PATH="/opt/local/bin:/opt/local/sbin:$PATH"
  export TERM=xterm
  step_log "Setup Macports"
  add_macports >/dev/null 2>&1
  add_log "$tick" "Macports" "Installed"
  sync_macports >/dev/null 2>&1
  add_log "$tick" "Macports" "Synced"
  step_log "Setup PHP"
  port_setup_php $nodot_version >/dev/null 2>&1
  status="Installed"
elif [ "$existing_version" != "$version" ] || [ "$update" = "true" ]; then
  export HOMEBREW_NO_INSTALL_CLEANUP=TRUE >/dev/null 2>&1
  brew tap shivammathur/homebrew-php >/dev/null 2>&1
  brew install shivammathur/php/php@"$version" >/dev/null 2>&1
  brew link --force --overwrite php@"$version" >/dev/null 2>&1
  if [ "$update" = "true" ]; then
    status="Updated to"
  else
    status="Installed"
  fi
else
  status="Found"
fi
ini_file=$(php -d "date.timezone=UTC" --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
sudo chmod 777 "$ini_file"
echo "date.timezone=UTC" >>"$ini_file"
ext_dir=$(php -i | grep -Ei "extension_dir => /(usr|opt)" | sed -e "s|.*=> s*||")
sudo mkdir -p "$ext_dir"
semver=$(php -v | head -n 1 | cut -f 2 -d ' ')
configure_pecl
add_log "$tick" "PHP" "$status PHP $semver"