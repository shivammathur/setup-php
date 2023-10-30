add_blackfire_linux() {
  sudo mkdir -p /var/run/blackfire /etc/blackfire
  add_list debian/blackfire http://packages.blackfire.io/debian https://packages.blackfire.io/gpg.key any main
  install_packages blackfire
  sudo chmod 777 /etc/blackfire/agent
}

add_blackfire_darwin() {
  sudo mkdir -p /usr/local/var/run
  add_brew_tap blackfireio/homebrew-blackfire
  brew install blackfire
}

blackfire_config() {
  if [[ -n $BLACKFIRE_SERVER_ID ]] && [[ -n $BLACKFIRE_SERVER_TOKEN ]]; then
    blackfire agent:config --server-id="$BLACKFIRE_SERVER_ID" --server-token="$BLACKFIRE_SERVER_TOKEN"
    if [ "$os" = "Linux" ]; then
      if [ -d /run/systemd/system ]; then
        sudo systemctl start blackfire-agent
      else
        sudo service blackfire-agent start
      fi
    elif [ "$os" = "Darwin" ]; then
      brew services start blackfire
    fi
  fi
  if [[ -n $BLACKFIRE_CLIENT_ID ]] && [[ -n $BLACKFIRE_CLIENT_TOKEN ]]; then
    blackfire client:config --client-id="$BLACKFIRE_CLIENT_ID" --client-token="$BLACKFIRE_CLIENT_TOKEN"
  fi
}

# Function to add blackfire cli.
add_blackfire() {
  os="$(uname -s)"
  [ "$os" = "Linux" ] && add_blackfire_linux 
  [ "$os" = "Darwin" ] && add_blackfire_darwin 
  blackfire_config 
  tool_version=$(get_tool_version "blackfire" "version")
  add_log "${tick:?}" "blackfire" "Added blackfire $tool_version"
}
