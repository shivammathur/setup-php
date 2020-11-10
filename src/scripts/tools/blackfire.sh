add_blackfire_linux() {
  sudo mkdir -p /var/run/blackfire
  get -s -n "" https://packages.blackfire.io/gpg.key | sudo apt-key add -
  echo "deb http://packages.blackfire.io/debian any main" | sudo tee /etc/apt/sources.list.d/blackfire.list
  sudo "${debconf_fix:?}" apt-get update
  ${apt_install:?} blackfire-agent
}

add_blackfire_darwin() {
  sudo mkdir -p /usr/local/var/run
  brew tap --shallow blackfireio/homebrew-blackfire
  brew install blackfire-agent
}

blackfire_config() {
  if [[ -n $BLACKFIRE_SERVER_ID ]] && [[ -n $BLACKFIRE_SERVER_TOKEN ]]; then
    sudo blackfire-agent --register --server-id="$BLACKFIRE_SERVER_ID" --server-token="$BLACKFIRE_SERVER_TOKEN"
    [ "$os" = "Linux" ] && sudo /etc/init.d/blackfire-agent restart
    [ "$os" = "Darwin" ] && brew services start blackfire-agent
  fi
  if [[ -n $BLACKFIRE_CLIENT_ID ]] && [[ -n $BLACKFIRE_CLIENT_TOKEN ]]; then
    blackfire config --client-id="$BLACKFIRE_CLIENT_ID" --client-token="$BLACKFIRE_CLIENT_TOKEN"
  fi
}

# Function to add blackfire and blackfire-agent.
add_blackfire() {
  os="$(uname -s)"
  [ "$os" = "Linux" ] && add_blackfire_linux >/dev/null 2>&1
  [ "$os" = "Darwin" ] && add_blackfire_darwin >/dev/null 2>&1
  blackfire_config >/dev/null 2>&1
  tool_version=$(get_tool_version "blackfire" "version")
  add_log "${tick:?}" "blackfire" "Added blackfire $tool_version"
  add_log "${tick:?}" "blackfire-agent" "Added blackfire-agent $tool_version"
}
