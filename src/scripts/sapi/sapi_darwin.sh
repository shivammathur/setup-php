#!/bin/bash

install_httpd() {
  sudo mkdir -p /var/www/html
  sudo chown -R _www:_www /var/www
  brew services stop nginx 2>/dev/null || true
  if ! command -v httpd >/dev/null; then
    brew install httpd
  fi
  sudo sed -Ei '' 's/Listen.*/Listen 80/' "$httpd_conf"
  sudo sed -Ei '' 's/DirectoryIndex.*/DirectoryIndex index.php index.html/' "$httpd_conf"
}

install_nginx() {
  sudo mkdir -p /var/www/html
  sudo chown -R "$(id -un)":"$(id -gn)" /var/www
  brew services stop httpd 2>/dev/null || true
  if ! command -v nginx >/dev/null; then
    brew install nginx
  fi
  sudo sed -Ei '' 's/listen.*/listen 80;/' "$nginx_conf"
}

setup_sapi() {
  sapi=$1
  conf_dir="${dist:?}"/../src/configs

  case $sapi in
  apache*:apache*)
    install_httpd
    (
      echo "LoadModule proxy_module lib/httpd/modules/mod_proxy.so"
      echo "LoadModule proxy_module lib/httpd/modules/mod_proxy_fcgi.so"
    ) | sudo tee -a "$httpd_conf"
    echo "Include $httpd_extra/httpd-php.conf" | sudo tee -a "$httpd_conf"


    sudo cp "$conf_dir"/default_apache /etc/apache2/sites-available/000-default.conf
    sudo a2dismod mpm_event 2>/dev/null || true
    sudo a2enmod mpm_prefork php"${version:?}"
    sudo service apache2 restart
    ;;
  fpm:apache*)
    install_httpd
    sudo cp "$conf_dir"/default_apache /etc/apache2/sites-available/000-default.conf
    sudo a2dismod php"${version:?}" 2>/dev/null || true
    sudo a2enmod proxy_fcgi
    sudo a2enconf php"${version:?}"-fpm
    sudo service apache2 restart
    ;;
  cgi:apache*)
    install_httpd
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
    sudo cp "$conf_dir"/default_nginx /etc/nginx/sites-available/default
    sudo sed -i "s/PHP_VERSION/${version:?}/" /etc/nginx/sites-available/default
    sudo service nginx restart
    ;;
  apache* | fpm | cgi | phpdbg) ;;

  esac
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
  if [ ${sapi_version%.*} != "${version:?}" ]; then
    return 1
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

httpd_conf=${brew_prefix:?}/etc/httpd/httpd.conf
httpd_extra=${brew_prefix:?}/etc/httpd/extra
nginx_conf=${brew_prefix:?}/etc/nginx/nginx.conf
