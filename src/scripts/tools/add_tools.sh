# Variables
export tool_path_dir="/usr/local/bin"
export composer_home="$HOME/.composer"
export composer_bin="$composer_home/vendor/bin"
export composer_json="$composer_home/composer.json"
export composer_lock="$composer_home/composer.lock"

# Function to extract tool version.
get_tool_version() {
  tool=$1
  param=$2
  alp="[a-zA-Z0-9]"
  version_regex="[0-9]+((\.{1}$alp+)+)(\.{0})(-$alp+){0,1}"
  if [ "$tool" = "composer" ]; then
    composer_alias_version="$(grep -Ea "const\sBRANCH_ALIAS_VERSION" "$tool_path_dir/composer" | grep -Eo "$version_regex")"
    if [[ -n "$composer_alias_version" ]]; then
      composer_version="$composer_alias_version+$(grep -Ea "const\sVERSION" "$tool_path_dir/composer" | grep -Eo "$alp+" | tail -n 1)"
    else
      composer_version="$(grep -Ea "const\sVERSION" "$tool_path_dir/composer" | grep -Eo "$version_regex")"
    fi
    echo "$composer_version" | sudo tee /tmp/composer_version
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
    add_log "${cross:?}" "composer" "Could not download composer"
    exit 1
  fi
  if ! [ -d "$composer_home" ]; then
    sudo -u "$(id -un)" -g "$(id -gn)" mkdir -p -m=00755 "$composer_home"
  else
    sudo chown -R "$(id -un)":"$(id -gn)" "$composer_home"
  fi
  if ! [ -e "$composer_json" ]; then
    echo '{}' | tee "$composer_json" >/dev/null
    chmod 644 "$composer_json"
  fi
  add_env_path "${dist:?}"/../src/configs/composer.env
  add_path "$composer_bin"
  if [ -n "$COMPOSER_TOKEN" ]; then
    add_env COMPOSER_AUTH '{"github-oauth": {"github.com": "'"$COMPOSER_TOKEN"'"}}'
  fi
}

# Helper function to configure tools.
add_tools_helper() {
  tool=$1
  if [ "$tool" = "codeception" ]; then
    sudo ln -s "$scoped_dir"/vendor/bin/codecept "$scoped_dir"/vendor/bin/codeception
  elif [ "$tool" = "composer" ]; then
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
  elif [ "$tool" = "phpDocumentor" ]; then
    add_extension fileinfo extension >/dev/null 2>&1
    sudo ln -s "$tool_path" "$tool_path_dir"/phpdocumentor 2>/dev/null || true
    sudo ln -s "$tool_path" "$tool_path_dir"/phpdoc
  elif [[ "$tool" =~ phpunit(-polyfills)?$ ]]; then
    if [ -e "$tool_path_dir"/phpunit ] && [ -d "$composer_bin" ]; then
      sudo cp "$tool_path_dir"/phpunit "$composer_bin"
    fi
  elif [[ "$tool" =~ vapor-cli ]]; then
    sudo ln -s "$scoped_dir"/vendor/bin/vapor "$scoped_dir"/vendor/bin/vapor-cli
  elif [ "$tool" = wp-cli ]; then
    sudo ln -s "$tool_path" "$tool_path_dir"/"${tool%-*}"
  fi
}

# Function to setup a remote tool.
add_tool() {
  url=$1
  tool=$2
  ver_param=$3
  tool_path="$tool_path_dir/$tool"
  add_path "$tool_path_dir"
  if [ -e "$tool_path" ]; then
    sudo cp -aL "$tool_path" /tmp/"$tool"
  fi
  IFS="," read -r -a url <<<"$url"
  status_code=$(get -v -e "$tool_path" "${url[@]}")
  if [ "$status_code" != "200" ] && [[ "${url[0]}" =~ .*github.com.*releases.*latest.* ]]; then
    url[0]="${url[0]//releases\/latest\/download/releases/download/$(get -s -n "" "$(echo "${url[0]}" | cut -d '/' -f '1-5')/releases" | grep -Eo -m 1 "([0-9]+\.[0-9]+\.[0-9]+)/$(echo "${url[0]}" | sed -e "s/.*\///")" | cut -d '/' -f 1)}"
    status_code=$(get -v -e "$tool_path" "${url[0]}")
  fi
  if [ "$status_code" = "200" ]; then
    add_tools_helper "$tool"
    tool_version=$(get_tool_version "$tool" "$ver_param")
    add_log "${tick:?}" "$tool" "Added $tool $tool_version"
  else
    if [ "$tool" = "composer" ]; then
      export fail_fast=true
    elif [ -e /tmp/"$tool" ]; then
      sudo cp -a /tmp/"$tool" "$tool_path"
    fi
    add_log "$cross" "$tool" "Could not setup $tool"
  fi
}

# Function to setup a tool using composer in a different scope.
add_composertool_helper() {
  tool=$1
  release=$2
  prefix=$3
  scope=$4
  if [ "$scope" = "global" ]; then
    sudo rm -f "$composer_lock" >/dev/null 2>&1 || true
    composer global require "$prefix$release" >/dev/null 2>&1
    composer global show "$prefix$tool" 2>&1 | grep -E ^versions | sudo tee /tmp/composer.log >/dev/null 2>&1
  else
    scoped_dir="$composer_bin/_tools/$tool-$(echo -n "$release" | shasum -a 256 | cut -d ' ' -f 1)"
    if ! [ -d "$scoped_dir" ]; then
      mkdir -p "$scoped_dir"
      composer require "$prefix$release" -d "$scoped_dir" >/dev/null 2>&1
      composer show "$prefix$tool" -d "$scoped_dir" 2>&1 | grep -E ^versions | sudo tee /tmp/composer.log >/dev/null 2>&1
    fi
    add_path "$scoped_dir"/vendor/bin
  fi
}

# Function to setup a tool using composer.
add_composertool() {
  tool=$1
  release=$2
  prefix=$3
  scope=$4
  if [[ "$tool" =~ prestissimo|composer-prefetcher ]]; then
    composer_version=$(cat /tmp/composer_version)
    if [ "$(echo "$composer_version" | cut -d'.' -f 1)" != "1" ]; then
      echo "::warning:: Skipping $tool, as it does not support Composer $composer_version. Specify composer:v1 in tools to use $tool"
      add_log "$cross" "$tool" "Skipped"
      return
    fi
  fi
  add_composertool_helper "$tool" "$release" "$prefix" "$scope"
  tool_version=$(get_tool_version cat /tmp/composer.log)
  ([ -s /tmp/composer.log ] && add_log "$tick" "$tool" "Added $tool $tool_version"
  ) || add_log "$cross" "$tool" "Could not setup $tool"
  add_tools_helper "$tool"
  if [ -e "$composer_bin/composer" ]; then
    sudo cp -a "$tool_path_dir/composer" "$composer_bin"
  fi
}
