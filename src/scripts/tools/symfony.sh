add_symfony() {
  if [ "$(uname -s)" = "Linux" ]; then
    echo 'deb [trusted=yes] https://repo.symfony.com/apt/ /' | sudo tee /etc/apt/sources.list.d/symfony-cli.list >/dev/null 2>&1
    update_lists symfony repo.symfony.com
    install_packages symfony-cli
  elif [ "$(uname -s)" = "Darwin" ]; then
    add_brew_tap symfony-cli/homebrew-tap
    brew install symfony-cli/tap/symfony-cli >/dev/null 2>&1
  fi
  sudo ln -s "$(command -v symfony)" "${tool_path_dir:?}"/symfony-cli
  tool_version=$(get_tool_version "symfony" "-V")
  add_log "${tick:?}" "symfony-cli" "Added symfony-cli $tool_version"
}
