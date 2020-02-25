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

phpversion=$2
blackfireVersion=${3:-1.31.0}
ini_file="/etc/php/$1/cli/conf.d/50-blackfire.ini"
tick="✓"
cross="✗"

(curl -A "Github action" -o /tmp/blackfire.so -L -s https://packages.blackfire.io/binaries/blackfire-php/$blackfireVersion/blackfire-php-linux_amd64-php-$phpversion.so >/dev/null 2>&1 && \
sudo mv /tmp/blackfire.so $(php -r "echo ini_get ('extension_dir');")/blackfire.so >/dev/null 2>&1 && \
echo "extension=blackfire.so" | sudo tee -a "$ini_file" >/dev/null 2>&1 && \
add_log "$tick" "blackfire" "Installed and enabled") || \
add_log "$cross" "blackfire" "Could not install blackfire"

