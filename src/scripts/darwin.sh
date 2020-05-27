# Function to log start of a operation.
step_log() {
  message=$1
  printf "\n\033[90;1m==> \033[0m\033[37;1m%s\033[0m\n" "$message"
}

# Function to log result of a operation.
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

# Function to read env inputs.
read_env() {
  [[ -z "${update}" ]] && update='false' && UPDATE='false' || update="${update}"
  [ "$update" = false ] && [[ -n ${UPDATE} ]] && update="${UPDATE}"
  [[ -z "${runner}" ]] && runner='github' && RUNNER='github' || runner="${runner}"
  [ "$runner" = false ] && [[ -n ${RUNNER} ]] && runner="${RUNNER}"
}

# Function to setup environment for self-hosted runners.
self_hosted_setup() {
  if [[ "$version" =~ $old_versions ]]; then
    add_log "$cross" "PHP" "PHP $version is not supported on self-hosted runner"
    exit 1
  fi
  if [[ $(command -v brew) == "" ]]; then
      step_log "Setup Brew"
      curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh | bash -s >/dev/null 2>&1
      add_log "$tick" "Brew" "Installed Homebrew"
  fi
}

# Function to remove extensions.
remove_extension() {
  extension=$1
  if check_extension "$extension"; then
    sudo sed -i '' "/$extension/d" "$ini_file"
    sudo rm -rf "$scan_dir"/*"$extension"* >/dev/null 2>&1
    sudo rm -rf "$ext_dir"/"$extension".so >/dev/null 2>&1
    (! check_extension "$extension" && add_log "$tick" ":$extension" "Removed") ||
    add_log "$cross" ":$extension" "Could not remove $extension on PHP $semver"
  else
    add_log "$tick" ":$extension" "Could not find $extension on PHP $semver"
  fi
}

# Function to test if extension is loaded.
check_extension() {
  extension=$1
  if [ "$extension" != "mysql" ]; then
    php -m | grep -i -q -w "$extension"
  else
    php -m | grep -i -q "$extension"
  fi
}

# Fuction to get the PECL version.
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

# Function to install a specific version of PECL extension.
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
    remove_extension "$extension" >/dev/null 2>&1
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
    eval "$install_command" >/dev/null 2>&1 &&
    if [[ "$version" =~ $old_versions ]]; then echo "$prefix=$ext_dir/$extension.so" >>"$ini_file"; fi
    (check_extension "$extension" && add_log "$tick" "$extension" "Installed and enabled") ||
    add_log "$cross" "$extension" "Could not install $extension on PHP $semver"
  fi
}

# Function to setup pre-release extensions using PECL.
add_unstable_extension() {
  extension=$1
  stability=$2
  prefix=$3
  pecl_version=$(get_pecl_version "$extension" "$stability")
  add_pecl_extension "$extension" "$pecl_version" "$prefix"
}

# Function to setup a remote tool.
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
      echo "::add-path::/Users/$USER/.composer/vendor/bin"
      if [ -n "$COMPOSER_TOKEN" ]; then
        composer -q global config github-oauth.github.com "$COMPOSER_TOKEN"
      fi
    elif [ "$tool" = "phan" ]; then
      add_extension fileinfo "sudo pecl install -f fileinfo" extension >/dev/null 2>&1
      add_extension ast "sudo pecl install -f ast" extension >/dev/null 2>&1
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

# Function to add a tool using composer.
add_composertool() {
  tool=$1
  release=$2
  prefix=$3
  (
    composer global require "$prefix$release" >/dev/null 2>&1 &&
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
  add_log "$tick" "blackfire" "Added"
  add_log "$tick" "blackfire-agent" "Added"
}

# Function to configure PECL
configure_pecl() {
  for tool in pear pecl; do
    sudo "$tool" config-set php_ini "$ini_file"
    sudo "$tool" channel-update "$tool".php.net
  done
}

# Function to handle request to add PECL.
add_pecl() {
  add_log "$tick" "PECL" "Added"
}

# Function to fetch updated formulae.
update_formulae() {
  brew_dir=$(brew --prefix)/Homebrew/Library/Taps/homebrew/homebrew-core/Formula
  for formula in httpd pkg-config apr apr-util argon2 aspell autoconf bison curl-openssl freetds freetype gettext glib gmp icu4c jpeg krb5 libffi libpng libpq libsodium libzip oniguruma openldap openssl@1.1 re2c sqlite tidyp unixodbc webp; do
    sudo curl -o "$brew_dir"/"$formula".rb -sSL https://raw.githubusercontent.com/Homebrew/homebrew-core/master/Formula/"$formula".rb &
    to_wait+=( $! )
  done
  wait "${to_wait[@]}"
}

# Function to setup PHP 5.6 and newer.
setup_php() {
  action=$1
  export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
  brew tap shivammathur/homebrew-php
  if brew list php@"$version" 2>/dev/null | grep -q "Error" && [ "$action" != "upgrade" ]; then
    brew unlink php@"$version"
  else
    if [ "$version" = "$master_version" ]; then update_formulae; fi
    brew "$action" shivammathur/php/php@"$version"
  fi
  brew link --force --overwrite php@"$version"
}

# Variables
tick="✓"
cross="✗"
version=$1
nodot_version=${1/./}
master_version="8.0"
old_versions="5.[3-5]"
tool_path_dir="/usr/local/bin"
existing_version=$(php-config --version 2>/dev/null | cut -c 1-3)

read_env
if [ "$runner" = "self-hosted" ]; then
  self_hosted_setup >/dev/null 2>&1
fi

# Setup PHP
step_log "Setup PHP"
if [[ "$version" =~ $old_versions ]]; then
  curl -sSL https://github.com/shivammathur/php5-darwin/releases/latest/download/install.sh | bash -s "$nodot_version" >/dev/null 2>&1 &&
  status="Installed"
elif [ "$existing_version" != "$version" ]; then
  setup_php "install" >/dev/null 2>&1
  status="Installed"
elif [ "$existing_version" = "$version" ] && [ "$update" = "true" ]; then
  setup_php "upgrade" >/dev/null 2>&1
  status="Updated to"
else
  status="Found"
fi
ini_file=$(php -d "date.timezone=UTC" --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
sudo chmod 777 "$ini_file" "$tool_path_dir"
echo "date.timezone=UTC" >>"$ini_file"
ext_dir=$(php -i | grep -Ei "extension_dir => /" | sed -e "s|.*=> s*||")
scan_dir=$(php --ini | grep additional | sed -e "s|.*: s*||")
sudo mkdir -p "$ext_dir"
semver=$(php -v | head -n 1 | cut -f 2 -d ' ')
if [[ ! "$version" =~ $old_versions ]]; then configure_pecl >/dev/null 2>&1; fi
add_log "$tick" "PHP" "$status PHP $semver"
