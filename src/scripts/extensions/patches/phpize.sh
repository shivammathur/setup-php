# Function to get phpize location on darwin.
get_phpize() {
  if [[ "${version:?}" =~ 5.[3-5] ]]; then
    echo '/opt/local/bin/phpize'
  else
    echo "/usr/local/bin/$(readlink /usr/local/bin/phpize)"
  fi
}

# Function to patch phpize to link to php headers on darwin.
patch_phpize() {
  if [ "$(uname -s)" = "Darwin" ]; then
    sudo cp "$phpize_orig" "$phpize_orig.bck"
    sudo sed -i '' 's~includedir=.*~includedir="$(xcrun --show-sdk-path)/usr/include/php"~g' "$phpize_orig"
  fi
}

# Function to restore phpize.
restore_phpize() {
  if [ "$os" = "Darwin" ]; then
    sudo mv "$phpize_orig.bck" "$phpize_orig" || true
  fi
}

os="$(uname -s)"
phpize_orig="$(get_phpize)"
