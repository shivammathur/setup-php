get_symfony_artifact_url() {
  local symfony_tag=$1
  local os
  local arch
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"
  case "$arch" in
    arm|armv6*|armv7*) arch="armv6" ;;
    aarch64*|armv8*|arm64) arch="arm64" ;;
    i[36]86) arch="386" ;;
    x86_64|amd64) arch="amd64" ;;
  esac
  [ "$os" = "darwin" ] && arch="all"
  symfony_releases="https://github.com/symfony-cli/symfony-cli/releases"
  if [ "$symfony_tag" = "latest" ]; then
    echo "$symfony_releases/latest/download/symfony-cli_${os}_${arch}.tar.gz"
  else
    echo "$symfony_releases/download/v$symfony_tag/symfony-cli_${os}_${arch}.tar.gz"
  fi
}

add_symfony_helper() {
  local install_dir=/usr/local/bin
  [ "$(uname -s)" = "Darwin" ] && install_dir=${brew_prefix:?}/bin
  get -s -n "" "$(get_symfony_artifact_url "$symfony_tag")" | sudo tar -xz -C "$install_dir" 2>/dev/null
  sudo chmod a+x "$install_dir"/symfony
}

add_symfony() {
  local symfony_tag="${1/v/}"
  if ! [[ "$symfony_tag" =~ ^[0-9]+(\.[0-9]+)*$ || "$symfony_tag" == 'latest' ]]; then
      add_log "${cross:?}" "symfony-cli" "Version '$symfony_tag' is not valid for symfony-cli"
  else
    add_symfony_helper "$symfony_tag" >/dev/null 2>&1
    symfony_path="$(command -v symfony)"
    if [[ -n "$symfony_path" ]]; then
      sudo ln -s "$symfony_path" "${tool_path_dir:?}"/symfony-cli
      tool_version=$(get_tool_version "symfony" "-V")
      add_log "${tick:?}" "symfony-cli" "Added symfony-cli $tool_version"
    else
      add_log "${cross:?}" "symfony-cli" "Could not setup symfony-cli"
    fi
  fi
}
