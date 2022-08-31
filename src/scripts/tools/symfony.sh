add_symfony_helper() {
  if command -v brew >/dev/null; then
    add_brew_tap symfony-cli/homebrew-tap
    brew install symfony-cli/tap/symfony-cli
  else
    arch=$(dpkg --print-architecture)
    get -s -n "" "https://github.com/symfony-cli/symfony-cli/releases/latest/download/symfony-cli_linux_$arch.tar.gz" | sudo tar -xz -C "${tool_path_dir:?}"
    sudo chmod a+x /usr/local/bin/symfony
  fi
}

add_symfony() {
  add_symfony_helper >/dev/null 2>&1
  symfony_path="$(command -v symfony)"
  if [[ -n "$symfony_path" ]]; then
    sudo ln -s "$symfony_path" "${tool_path_dir:?}"/symfony-cli
    tool_version=$(get_tool_version "symfony" "-V")
    add_log "${tick:?}" "symfony-cli" "Added symfony-cli $tool_version"
  else
    add_log "${cross:?}" "symfony-cli" "Could not setup symfony-cli"
  fi
}
