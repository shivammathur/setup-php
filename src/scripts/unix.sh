# Variables
export tick="✓"
export cross="✗"
export curl_opts=(-sL)
export old_versions="5.[3-5]"
export jit_versions="8.[0-9]"
export nightly_versions="8.[3-9]"
export xdebug3_versions="7.[2-4]|8.[0-9]"
export latest="releases/latest/download"
export github="https://github.com/shivammathur"
export jsdeliver="https://cdn.jsdelivr.net/gh/shivammathur"
export setup_php="https://setup-php.com"

if [ -n "${GITHUB_ACTIONS}" ]; then
  export GROUP='::group::'
  export END_GROUP='::endgroup::'
else
  export GROUP=''
  export END_GROUP=''
fi

# Function to log start of a operation.
step_log() {
  local message=$1
  printf "\n\033[90;1m==> \033[0m\033[37;1m%s\033[0m\n" "$message"
}

# Function to log result of a operation.
add_log() {
  local mark=$1
  local subject=$2
  local message=$3
  if [ "$mark" = "$tick" ]; then
    printf "\033[32;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s\033[0m\n" "$mark" "$subject" "$message"
  else
    printf "\033[31;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s\033[0m\n" "$mark" "$subject" "$message"
    [ "$fail_fast" = "true" ] && exit 1
  fi
}

# Function to set output on GitHub Actions.
set_output() {
  name=$1
  value=$2
  if [ "${GITHUB_ACTIONS}" = "true" ]; then
    echo "${name}=${value}" | tee -a "$GITHUB_OUTPUT" 
  fi
}

# Function to read env inputs.
read_env() {
  update="${update:-${UPDATE:-false}}"
  [ "${debug:-${DEBUG:-false}}" = "true" ] && debug=debug && update=true || debug=release
  [[ "${phpts:-${PHPTS:-nts}}" = "ts" || "${phpts:-${PHPTS:-nts}}" = "zts" ]] && ts=zts && update=true || ts=nts
  fail_fast="${fail_fast:-${FAIL_FAST:-false}}"
  [[ -z "${ImageOS}" && -z "${ImageVersion}" || -n ${ACT} ]] && _runner=self-hosted || _runner=github
  runner="${runner:-${RUNNER:-$_runner}}"

  if [[ "$runner" = "github" && $_runner = "self-hosted" ]]; then
    fail_fast=true
    add_log "$cross" "Runner" "Runner set as github in self-hosted environment"
  fi

  # Set Update to true if the ubuntu github image does not have PHP PPA.
  if [[ "$runner" = "github" && "${ImageOS}" =~ ubuntu.* ]]; then
    check_ppa ondrej/php || update=true
  fi

  export fail_fast
  export runner
  export update
  export ts
}

# Function to download a file using cURL.
# mode: -s pipe to stdout, -v save file and return status code
# execute: -e save file as executable
get() {
  mode=$1
  execute=$2
  file_path=$3
  shift 3
  links=("$@")
  if [ "$mode" = "-s" ]; then
    sudo curl "${curl_opts[@]}" "${links[0]}"
  else
    for link in "${links[@]}"; do
      status_code=$(sudo curl -w "%{http_code}" -o "$file_path" "${curl_opts[@]}" "$link")
      [ "$status_code" = "200" ] && break
    done
    [ "$execute" = "-e" ] && sudo chmod a+x "$file_path"
    [ "$mode" = "-v" ] && echo "$status_code"
  fi
}

# Function to get shell profile.
get_shell_profile() {
  case "$SHELL" in
  *bash*)
    echo "${HOME}/.bashrc"
    ;;
  *zsh*)
    echo "${HOME}/.zshrc"
    ;;
  *)
    echo "${HOME}/.profile"
    ;;
  esac
}

# Function to add a path to the PATH variable.
add_path() {
  path_to_add=$1
  [[ ":$PATH:" == *":$path_to_add:"* ]] && return
  if [[ -n "$GITHUB_PATH" ]]; then
    echo "$path_to_add" | tee -a "$GITHUB_PATH" 
  else
    profile=$(get_shell_profile)
    ([ -e "$profile" ] && grep -q ":$path_to_add\"" "$profile" 2>/dev/null) || echo "export PATH=\"\${PATH:+\${PATH}:}\"$path_to_add" | sudo tee -a "$profile" 
  fi
  export PATH="${PATH:+${PATH}:}$path_to_add"
}

# Function to add environment variables using a PATH.
add_env_path() {
  env_path=$1
  [ -e "$env_path" ] || return
  if [[ -n "$GITHUB_ENV" ]]; then
    cat "$env_path" >> "$GITHUB_ENV"
  else
    profile=$(get_shell_profile)
    cat "$env_path" >> "$profile"
  fi
}

# Function to add an environment variable.
add_env() {
  env_name=$1
  env_value=$2
  if [[ -n "$GITHUB_ENV" ]]; then
    echo "$env_name=$env_value" | tee -a "$GITHUB_ENV" 
  else
    profile=$(get_shell_profile)
    echo "export $env_name=\"$env_value\"" | sudo tee -a "$profile" 
  fi
  export "$env_name"="$env_value"
}

# Function to download and run scripts from GitHub releases with jsdeliver fallback.
run_script() {
  repo=$1
  shift
  args=("$@")
  get -q -e /tmp/install.sh "$github/$repo/$latest/install.sh" "$jsdeliver/$repo@main/scripts/install.sh" "$setup_php/$repo/install.sh"
  bash /tmp/install.sh "${args[@]}"
}

# Function to install required packages on self-hosted runners.
self_hosted_setup() {
  if [ "$runner" = "self-hosted" ]; then
    if [[ "${version:?}" =~ $old_versions ]]; then
      add_log "$cross" "PHP" "PHP $version is not supported on self-hosted runner"
      exit 1
    else
      self_hosted_helper 
      add_env RUNNER_TOOL_CACHE /tmp
    fi
  fi
}

# Function to configure PHP
configure_php() {
  add_php_config
  ini_config_dir="${src:?}"/configs/ini
  ini_config_files=("$ini_config_dir"/php.ini)
  jit_config_files=("$ini_config_dir"/jit.ini)
  [[ "$version" =~ $xdebug3_versions ]] && ini_config_files+=("$ini_config_dir"/xdebug.ini)
  cat "${ini_config_files[@]}" | sudo tee -a "${ini_file[@]:?}" 
  [[ "$version" =~ $jit_versions ]] && cat "${jit_config_files[@]}" | sudo tee -a "${pecl_file:-${ini_file[@]}}" 
}

# Function to get PHP version in semver format.
php_semver() {
  grep -Eo 'version="[0-9]+(\.[0-9]+){2}((-?[a-zA-Z]+([0-9]+)?)?){2}' "${php_config:?}" | cut -d '"' -f 2
}

# Function to get ini_path.
php_ini_path() {
  cut -d '"' -f 2 < <(grep "ini_path=" "$php_config" || php --ini | grep '(php.ini)' | sed -e "s|.*: s*||")
}

# Function to get the tag for a php version.
php_src_tag() {
  commit=$(php_extra_version | grep -Eo "[0-9a-zA-Z]+")
  if [[ -n "${commit}" ]]; then
    echo "$commit"
  else
    echo "php-${semver:?}"
  fi
}
