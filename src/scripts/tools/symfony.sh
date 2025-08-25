add_symfony_with_brew() {
  add_brew_tap symfony-cli/homebrew-tap
  brew install symfony-cli/tap/symfony-cli
}

get_symfony_artifact_url() {
    arch=$(dpkg --print-architecture)
    url=$(get -s -n "" https://raw.githubusercontent.com/symfony-cli/homebrew-tap/main/Formula/symfony-cli.rb 2<&1 | grep -m 1 "url.*linux.*${arch}" | cut -d\" -f 2)
    if [ -z "$url" ]; then
      url=$(get -s -n "" https://api.github.com/repos/symfony-cli/symfony-cli/releases 2<&1 | grep -m 1 "url.*linux.*${arch}.*gz\"" | cut -d\" -f 4)
    fi
    echo "$url"
}

add_symfony_helper() {
  if [ "$(uname -s)" = "Linux" ]; then
    url="$(get_symfony_artifact_url)"
    if [ -z "$url" ]; then
      . "${0%/*}"/tools/brew.sh
      configure_brew
      add_symfony_with_brew
    else
      get -s -n "" "$url" | sudo tar -xz -C "${tool_path_dir:?}" 2>/dev/null
      sudo chmod a+x /usr/local/bin/symfony
    fi
  elif [ "$(uname -s)" = "Darwin" ]; then
    add_symfony_with_brew
  fi
}

add_symfony() {
  add_symfony_helper 
  symfony_path="$(command -v symfony)"
  if [[ -n "$symfony_path" ]]; then
    sudo ln -s "$symfony_path" "${tool_path_dir:?}"/symfony-cli
    tool_version=$(get_tool_version "symfony" "-V")
    add_log "${tick:?}" "symfony-cli" "Added symfony-cli $tool_version"
  else
    add_log "${cross:?}" "symfony-cli" "Could not setup symfony-cli"
  fi
}
