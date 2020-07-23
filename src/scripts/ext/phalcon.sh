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

# Function to add ppa:ondrej/php
add_ppa() {
  if ! apt-cache policy | grep -q ondrej/php; then
    cleanup_lists
    LC_ALL=C.UTF-8 sudo apt-add-repository ppa:ondrej/php -y
    if [ "$DISTRIB_RELEASE" = "16.04" ]; then
      sudo "$debconf_fix" apt-get update
    fi
  fi
}

# Function to update the package lists
update_lists() {
  if [ ! -e /tmp/setup_php ]; then
    [ "$DISTRIB_RELEASE" = "20.04" ] && add_ppa >/dev/null 2>&1
    cleanup_lists
    sudo "$debconf_fix" apt-get update >/dev/null 2>&1
    echo '' | sudo tee "/tmp/setup_php" >/dev/null 2>&1
  fi
}

# Function to install phalcon
install_phalcon() {
  extension=$1
  version=$2
  (update_ppa && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y "php$version-$extension" >/dev/null 2>&1 && add_log "$tick" "$extension" "Installed and enabled") ||
  add_log "$cross" "$extension" "Could not install $extension on PHP $semver"
}

debconf_fix="DEBIAN_FRONTEND=noninteractive"
ini_file="/etc/php/$2/cli/conf.d/50-phalcon.ini"
ext_dir=$(php -i | grep "extension_dir => /usr" | sed -e "s|.*=> s*||")
semver=$(php -v | head -n 1 | cut -f 2 -d ' ' | cut -f 1 -d '-')
extension_major_version=$(echo "$1" | grep -i -Po '\d')
tick="✓"
cross="✗"

if [ "$extension_major_version" = "4" ]; then
  if [ -e "$ext_dir/psr.so" ] && ! php -m | grep -i -q -w psr; then
    echo "extension=psr.so" | sudo tee -a "$ini_file" >/dev/null 2>&1
  fi

  if [ -e "$ext_dir/phalcon.so" ]; then
    if php -m | grep -i -q -w psr; then
      phalcon_version=$(php -d="extension=phalcon" -r "echo phpversion('phalcon');" | cut -d'.' -f 1)
      if [ "$phalcon_version" != "$extension_major_version" ]; then
        install_phalcon "$1" "$2"
      else
        echo "extension=phalcon.so" | sudo tee -a "$ini_file" >/dev/null 2>&1
        add_log "$tick" "$1" "Enabled"
      fi
    else
      install_phalcon "$1" "$2"
    fi
  else
    install_phalcon "$1" "$2"
  fi
fi

if [ "$extension_major_version" = "3" ]; then
  if [ -e "$ext_dir/phalcon.so" ]; then
    phalcon_version=$(php -d="extension=phalcon.so" -r "echo phpversion('phalcon');" | cut -d'.' -f 1)
    if [ "$phalcon_version" != "$extension_major_version" ]; then
      install_phalcon "$1" "$2"
    else
      echo "extension=phalcon.so" | sudo tee -a "$ini_file" >/dev/null 2>&1
      add_log "$tick" "$1" "Enabled"
    fi
  else
    install_phalcon "$1" "$2"
  fi
fi
