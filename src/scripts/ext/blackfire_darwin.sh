# Function to log result of a operation
add_log() {
  mark=$1
  subject=$2
  message=$3
  if [ "$mark" = "$tick" ]; then
    printf "\033[32;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s\033[0m\n" "$mark" "$subject" "$message"
  else
    printf "\033[31;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s\033[0m\n" "$mark" "$subject" "$message"
  fi
}

tick="✓"
cross="✗"
phpversion=$2
blackfireVersion=${3:-1.31.0}
ini_file=$(php -d "date.timezone=UTC" --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")

(curl -A "Github action" -o /tmp/blackfire.so -L -s https://packages.blackfire.io/binaries/blackfire-php/$blackfireVersion/blackfire-php-darwin_amd64-php-$phpversion.so && \
sudo mv /tmp/blackfire.so $(php -r "echo ini_get ('extension_dir');")/blackfire.so && \
echo "extension=blackfire.so" >>"$ini_file" && \
add_log "$tick" "blackfire" "Installed and enabled") || \
add_log "$cross" "blackfire" "Could not install blackfire"
