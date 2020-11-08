# Variables
export tick="✓"
export cross="✗"
export curl_opts=(-sL)
export nightly_versions="8.[0-1]"
export old_versions="5.[3-5]"
export tool_path_dir="/usr/local/bin"
export composer_bin="$HOME/.composer/vendor/bin"
export composer_json="$HOME/.composer/composer.json"
export github="https://github.com/shivammathur"

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
    [ "$fail_fast" = "true" ] && exit 1;
  fi
}

# Function to log result of installing extension.
add_extension_log() {
  extension=$1
  status=$2
  extension_name=$(echo "$extension" | cut -d '-' -f 1)
  (
    check_extension "$extension_name" && add_log "$tick" "$extension_name" "$status"
  ) || add_log "$cross" "$extension_name" "Could not install $extension on PHP ${semver:?}"
}

# Function to read env inputs.
read_env() {
  [[ -z "${update}" ]] && update='false' && UPDATE='false' || update="${update}"
  [ "$update" = false ] && [[ -n ${UPDATE} ]] && update="${UPDATE}"
  [[ -z "${runner}" ]] && runner='github' && RUNNER='github' || runner="${runner}"
  [ "$runner" = false ] && [[ -n ${RUNNER} ]] && runner="${RUNNER}"
  [[ -z "${fail_fast}" ]] && fail_fast='false' || fail_fast="${fail_fast}"
}

# Function to install required packages on self-hosted runners.
self_hosted_setup() {
  if [ "$runner" = "self-hosted" ]; then
    if [[ "${version:?}" =~ $old_versions ]]; then
      add_log "$cross" "PHP" "PHP $version is not supported on self-hosted runner"
      exit 1
    else
      self_hosted_helper >/dev/null 2>&1
    fi
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

# Function to enable existing extensions.
enable_extension() {
  if ! check_extension "$1" && [ -e "${ext_dir:?}/$1.so" ]; then
    echo "$2=${ext_dir:?}/$1.so" >>"${pecl_file:-$ini_file}"
  fi
}

# Function to configure PECL.
configure_pecl() {
  if ! [ -e /tmp/pecl_config ] && command -v pecl >/dev/null; then
    for script in pear pecl; do
      sudo "$script" config-set php_ini "${pecl_file:-$ini_file}"
      sudo "$script" channel-update "$script".php.net
    done
    echo '' | sudo tee /tmp/pecl_config >/dev/null 2>&1
  fi
}

# Function to get the PECL version of an extension.
get_pecl_version() {
  extension=$1
  stability="$(echo "$2" | grep -m 1 -Eio "(alpha|beta|rc|snapshot|preview)")"
  pecl_rest='https://pecl.php.net/rest/r/'
  response=$(curl "${curl_opts[@]}" "$pecl_rest$extension"/allreleases.xml)
  pecl_version=$(echo "$response" | grep -m 1 -Pio "(\d*\.\d*\.\d*$stability\d*)")
  if [ ! "$pecl_version" ]; then
    pecl_version=$(echo "$response" | grep -m 1 -Po "(\d*\.\d*\.\d*)")
  fi
  echo "$pecl_version"
}

# Function to install PECL extensions and accept default options
pecl_install() {
  local extension=$1
  yes '' 2>/dev/null | sudo pecl install -f "$extension" >/dev/null 2>&1
}

# Function to setup pre-release extensions using PECL.
add_unstable_extension() {
  extension=$1
  stability=$2
  prefix=$3
  pecl_version=$(get_pecl_version "$extension" "$stability")
  add_pecl_extension "$extension" "$pecl_version" "$prefix"
}

# Function to extract tool version.
get_tool_version() {
  tool=$1
  param=$2
  version_regex="[0-9]+((\.{1}[0-9]+)+)(\.{0})(-[a-zA-Z0-9]+){0,1}"
  if [ "$tool" = "composer" ]; then
    if [ "$param" != "snapshot" ]; then
      grep -Ea "const\sVERSION" "$tool_path_dir/composer" | grep -Eo "$version_regex"
    else
      trunk=$(grep -Ea "const\sBRANCH_ALIAS_VERSION" "$tool_path_dir/composer" | grep -Eo "$version_regex")
      commit=$(grep -Ea "const\sVERSION" "$tool_path_dir/composer" | grep -Eo "[a-zA-z0-9]+" | tail -n 1)
      echo "$trunk+$commit"
    fi
  else
    $tool "$param" 2>/dev/null | sed -Ee "s/[Cc]omposer(.)?$version_regex//g" | grep -Eo "$version_regex" | head -n 1
  fi
}

# Function to configure composer
configure_composer() {
  tool_path=$1
  sudo ln -sf "$tool_path" "$tool_path.phar"
  php -r "try {\$p=new Phar('$tool_path.phar', 0);exit(0);} catch(Exception \$e) {exit(1);}"
  if [ $? -eq 1 ]; then
    add_log "$cross" "composer" "Could not download composer"
    exit 1
  fi
  composer -q global config process-timeout 0
  echo "$composer_bin" >> "$GITHUB_PATH"
  if [ -n "$COMPOSER_TOKEN" ]; then
    composer -q global config github-oauth.github.com "$COMPOSER_TOKEN"
  fi
}

# Function to setup a remote tool.
add_tool() {
  url=$1
  tool=$2
  ver_param=$3
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
    if [ "$status_code" != "200" ] && [[ "$url" =~ .*github.com.*releases.*latest.* ]]; then
      url="${url//releases\/latest\/download/releases\/download/$(curl "${curl_opts[@]}" "$(echo "$url" | cut -d '/' -f '1-5')/releases" | grep -Eo -m 1 "([0-9]+\.[0-9]+\.[0-9]+)/$(echo "$url" | sed -e "s/.*\///")" | cut -d '/' -f 1)}"url="${url//releases\/latest\/download/releases\/download/$(curl "${curl_opts[@]}" "$(echo "$url" | cut -d '/' -f '1-5')/releases" | grep -Eo -m 1 "([0-9]+\.[0-9]+\.[0-9]+)/$(echo "$url" | sed -e "s/.*\///")" | cut -d '/' -f 1)}"
      status_code=$(sudo curl -w "%{http_code}" -o "$tool_path" "${curl_opts[@]}" "$url")
    fi
  fi
  if [ "$status_code" = "200" ]; then
    sudo chmod a+x "$tool_path"
    if [ "$tool" = "composer" ]; then
      configure_composer "$tool_path"
    elif [ "$tool" = "cs2pr" ]; then
      sudo sed -i 's/\r$//; s/exit(9)/exit(0)/' "$tool_path" 2>/dev/null ||
      sudo sed -i '' 's/\r$//; s/exit(9)/exit(0)/' "$tool_path"
    elif [ "$tool" = "phan" ]; then
      add_extension fileinfo extension >/dev/null 2>&1
      add_extension ast extension >/dev/null 2>&1
    elif [ "$tool" = "phive" ]; then
      add_extension curl extension >/dev/null 2>&1
      add_extension mbstring extension >/dev/null 2>&1
      add_extension xml extension >/dev/null 2>&1
    elif [ "$tool" = "wp-cli" ]; then
      sudo cp -p "$tool_path" "$tool_path_dir"/wp
    fi
    tool_version=$(get_tool_version "$tool" "$ver_param")
    add_log "$tick" "$tool" "Added $tool $tool_version"
  else
    add_log "$cross" "$tool" "Could not setup $tool"
  fi
}

# Function to setup a tool using composer.
add_composertool() {
  tool=$1
  release=$2
  prefix=$3
  (
    composer global require "$prefix$release" >/dev/null 2>&1 &&
    json=$(grep "$prefix$tool" "$composer_json") &&
    tool_version=$(get_tool_version 'echo' "$json") &&
    add_log "$tick" "$tool" "Added $tool $tool_version"
  ) || add_log "$cross" "$tool" "Could not setup $tool"
  if [ -e "$composer_bin/composer" ]; then
    sudo cp -p "$tool_path_dir/composer" "$composer_bin"
  fi
}

# Function to get PHP version in semver format.
php_semver() {
  php"$version" -v | grep -Eo -m 1 "[0-9]+\.[0-9]+\.[0-9]+" | head -n 1
}
