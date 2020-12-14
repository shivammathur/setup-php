#!/bin/bash

install_apache2() {
  sudo mkdir -p /var/www/html
  sudo service nginx stop 2>/dev/null || true
  if ! command -v apache2 >/dev/null; then
    install_packages apache2-bin apache2 -y;
  else
    if ! [[ "$(apache2 -v 2>/dev/null | grep -Eo "([0-9]+\.[0-9]+)")" =~ 2.[4-9] ]]; then
      sudo "${debconf_fix:?}" apt-get purge apache* apache-* >/dev/null
      install_packages apache2-bin apache2 -y;
    fi
  fi
}

install_nginx() {
  sudo mkdir -p /var/www/html
  sudo service apache2 stop 2>/dev/null || true
  if ! command -v nginx >/dev/null; then
    install_packages nginx -y
  fi
}

setup_sapi() {
  sapi=$1
  conf_dir="${dist:?}"/../src/configs

  if [[ "${version:?}" =~ ${old_versions:?}|${nightly_versions:?} ]]; then
    switch_sapi "$sapi"
  else
    case $sapi in
      apache*:apache*)
        install_apache2
        sudo cp "$conf_dir"/default_apache /etc/apache2/sites-available/000-default.conf
        install_packages libapache2-mod-php"${version:?}" -y
        sudo a2dismod mpm_event 2>/dev/null || true
        sudo a2enmod mpm_prefork php"${version:?}"
        sudo service apache2 restart
        ;;
      fpm:apache*)
        install_apache2
        sudo cp "$conf_dir"/default_apache /etc/apache2/sites-available/000-default.conf
        install_packages libapache2-mod-fcgid php"${version:?}"-fpm -y
        sudo a2dismod php"${version:?}" 2>/dev/null || true
        sudo a2enmod proxy_fcgi
        sudo a2enconf php"${version:?}"-fpm
        sudo service apache2 restart
        ;;
      cgi:apache*)
        install_apache2
        install_packages php"${version:?}"-cgi -y
        sudo cp "$conf_dir"/default_apache /etc/apache2/sites-available/000-default.conf
        echo "Action application/x-httpd-php /cgi-bin/php${version:?}" | sudo tee -a /etc/apache2/conf-available/php"${version:?}"-cgi.conf
        sudo a2dismod php"${version:?}" mpm_event 2>/dev/null || true
        sudo a2enmod mpm_prefork actions cgi
        sudo a2disconf php"${version:?}"-fpm 2>/dev/null || true
        sudo a2enconf php"${version:?}"-cgi
        sudo service apache2 restart
        ;;
      fpm:nginx)
        install_nginx
        install_packages php"${version:?}"-fpm -y
        sudo cp "$conf_dir"/default_nginx /etc/nginx/sites-available/default
        sudo sed -i "s/PHP_VERSION/${version:?}/" /etc/nginx/sites-available/default
        sudo service nginx restart
        ;;
      apache*)
        install_packages libapache2-mod-php"${version:?}" -y
        ;;
      fpm|embed|cgi|phpdbg)
        install_packages php"${version:?}"-"$sapi" -y
        ;;
    esac
  fi
}

check_service() {
  service=$1
  if ! pidof "$service"; then
    return 1
  fi
  (
    printf "::group::\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "$service" "Click to check $service status"
    sudo service "$service" status
    echo "::endgroup::"
  ) | sudo tee -a /tmp/sapi.log >/dev/null 2>&1
  return 0
}

check_version() {
  sapi=$1
  sapi_version=$(php_semver "$sapi")
  if [ "${sapi_version%.*}" != "${version:?}" ]; then
    return 1;
  fi
  add_log "${tick:?}" "$sapi" "Added $sapi $sapi_version" | sudo tee -a /tmp/sapi.log >/dev/null 2>&1
  return 0
}

check_sapi() {
  sapi=$1
  sudo rm /tmp/sapi.log
  if [[ "$sapi" =~ fpm|cgi ]]; then status=$(check_version php-"$sapi"); fi
  if [[ "$sapi" =~ ^phpdbg$ ]]; then status=$(check_version phpdbg); fi
  if [[ "$sapi" =~ .*fpm.* ]]; then status=$(check_service php"${version:?}"-fpm); fi
  if [[ "$sapi" =~ .*:apache.* ]]; then status=$(check_service apache2); fi
  if [[ "$sapi" =~ .*:nginx.* ]]; then status=$(check_service nginx); fi

  if [ "$status" = "0" ]; then
    if [[ "$sapi" =~ .*:.* ]]; then
      add_log "${tick:?}" "$sapi" "Added $sapi"
    fi
    cat /tmp/sapi.log && sudo rm /tmp/sapi.log
  else
    add_log "${cross:?}" "$sapi" "Could not setup $sapi"
  fi
}