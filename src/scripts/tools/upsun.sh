get_upsun_tag() {
  local upsun_tag=$1
  if [ "$upsun_tag" = "latest" ]; then
    get -s -n "" https://github.com/upsun/cli/releases/latest 2<&1 | grep -m 1 -Eo "tag/v[0-9]+(\.[0-9]+)*" | head -n 1 | cut -d '/' -f 2
  else
    echo "v$upsun_tag"
  fi
}

add_upsun_helper() {
  local upsun_tag=$1
  local install_dir=/usr/local/bin
  local os
  local arch
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"
  case "$arch" in
    aarch64*|armv8*|arm64) arch="arm64" ;;
    x86_64|amd64) arch="amd64" ;;
  esac
  if [ "$os" = "darwin" ]; then
    arch="all"
    install_dir=${brew_prefix:?}/bin
  fi
  get -q -n /tmp/upsun.tar.gz "https://github.com/upsun/cli/releases/download/$upsun_tag/upsun_${upsun_tag#v}_${os}_${arch}.tar.gz"
  mkdir -p /tmp/upsun
  tar -xzf /tmp/upsun.tar.gz -C /tmp/upsun
  sudo mv /tmp/upsun/upsun "$install_dir"/upsun
  sudo chmod a+x "$install_dir"/upsun
  rm -rf /tmp/upsun /tmp/upsun.tar.gz
}

add_upsun() {
  local upsun_tag="${1/v/}"
  if ! [[ "$upsun_tag" =~ ^[0-9]+(\.[0-9]+)*$ || "$upsun_tag" == 'latest' ]]; then
    add_log "${cross:?}" "upsun-cli" "Version '$upsun_tag' is not valid for upsun-cli"
  else
    upsun_tag="$(get_upsun_tag "$upsun_tag")"
    add_upsun_helper "$upsun_tag" >/dev/null 2>&1
    upsun_path="$(command -v upsun)"
    if [[ -n "$upsun_path" ]]; then
      sudo ln -s "$upsun_path" "${tool_path_dir:?}"/upsun-cli
      tool_version=$(get_tool_version "upsun" "--version")
      add_log "${tick:?}" "upsun-cli" "Added upsun-cli $tool_version"
    else
      add_log "${cross:?}" "upsun-cli" "Could not setup upsun-cli"
    fi
  fi
}
