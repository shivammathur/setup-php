tick="✓"
cross="✗"

step_log() {
  message=$1
  printf "\n\033[90;1m==> \033[0m\033[37;1m%s\033[0m\n" "$message"
}

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
version='7.4.0RC4'
step_log "Setup dependencies"
for package in pkg-config autoconf bison re2c openssl@1.1 krb5 enchant libffi freetype intltool icu4c libiconv t1lib gd libzip gmp tidyp libxml2 libxslt postgresql curl;
do
  brew install "$package" >/dev/null 2>&1
  add_log "$tick" "$package" "Installed"
done
brew link icu4c gettext --force >/dev/null 2>&1

for package in gettext gmp krb5 icu4c bison openssl@1.1 libxml2 libffi libxslt libiconv pkgconfig enchant krb5 readline libedit freetype;
do
  caps_package=$(echo "$package" | tr '[:lower:]' '[:upper:]')
  {
  echo 'export PATH="/usr/local/opt/'"$package"'/bin:$PATH"'
  echo 'export PKG_CONFIG_PATH="/usr/local/opt/'$package'/lib/pkgconfig:$PKG_CONFIG_PATH"'
  echo 'export '"$caps_package"'_LIBS="-L/usr/local/opt/'$package'/lib"'
  echo 'export '"$caps_package"'_CFLAGS="-I/usr/local/opt/'$package'/include"'
  } >> ~/.bash_profile;
done
{
echo 'export ICONV_LIBS="-L/usr/local/opt/libiconv/lib"'
echo 'export ICONV_CFLAGS="-I/usr/local/opt/libiconv/include"'
echo 'export LIBXML_LIBS="-L/usr/local/opt/libxml2/lib"'
echo 'export LIBXML_CFLAGS="-I/usr/local/opt/libxml2/include"'
echo 'export ICU_LIBS="-L/usr/local/opt/icu4c/lib"'
echo 'export ICU_CFLAGS="-I/usr/local/opt/icu4c/include"'
echo 'export OPENSSL_LIBS="-L/usr/local/opt/openssl@1.1/lib -lcrypto"'
echo 'export OPENSSL_CFLAGS="-I/usr/local/opt/openssl@1.1/include"'
echo 'export OPENSSL_ROOT_DIR="/usr/local/opt/openssl@1.1/"'
echo 'export OPENSSL_LIB_DIR="/usr/local/opt/openssl@1.1/lib"'
echo 'export OPENSSL_INCLUDE_DIR="/usr/local/opt/openssl@1.1/include"'
echo 'export PKG_CONFIG="/usr/local/opt/pkgconfig/bin/pkg-config"'
echo 'export EXTRA_LIBS="/usr/local/opt/readline/lib/libhistory.dylib
/usr/local/opt/readline/lib/libreadline.dylib
/usr/local/opt/openssl@1.1/lib/libssl.dylib
/usr/local/opt/openssl@1.1/lib/libcrypto.dylib
/usr/local/opt/icu4c/lib/libicudata.dylib
/usr/local/opt/icu4c/lib/libicui18n.dylib
/usr/local/opt/icu4c/lib/libicuio.dylib
/usr/local/opt/icu4c/lib/libicutu.dylib
/usr/local/opt/icu4c/lib/libicuuc.dylib"'
} >> ~/.bash_profile
config_file=$2/../src/configs/config.yaml

step_log "Setup PHPBrew"
curl -L -O https://github.com/phpbrew/phpbrew/raw/master/phpbrew >/dev/null 2>&1
chmod +x ./phpbrew
sudo mv phpbrew /usr/local/bin/phpbrew
sudo mkdir -p /opt/phpbrew
sudo mkdir -p /usr/local/lib
sudo mkdir -p /usr/local/bin
sudo phpbrew init --root=/opt/phpbrew --config="$config_file" >/dev/null 2>&1
sudo chmod -R 777 /opt/phpbrew
export PHPBREW_ROOT=/opt/phpbrew
export PHPBREW_HOME=/opt/phpbrew
echo "[[ -e ~/.phpbrew/bashrc ]] && source ~/.phpbrew/bashrc" >> ~/.bashrc
add_log "$tick" "PHPBrew" "Installed"

source ~/.bash_profile >/dev/null 2>&1
source ~/.bashrc >/dev/null 2>&1

step_log "Setup PHP and Composer"
phpbrew install -j 6 $version +dev >/dev/null 2>&1
phpbrew switch $version
sudo ln -sf /opt/phpbrew/php/php-$version/bin/* /usr/local/bin/
sudo ln -sf /opt/phpbrew/php/php-$version/etc/php.ini /etc/php.ini
ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
ext_dir=$(php -i | grep "extension_dir => /opt" | sed -e "s|.*=> s*||")
pecl config-set php_ini "$ini_file" >/dev/null 2>&1
sudo chmod 777 "$ini_file"
brew install composer >/dev/null 2>&1

add_log "$tick" "PHP" "Installed PHP$version"
add_log "$tick" "Composer" "Installed"

add_extension() {
  extension=$1
  install_command=$2
  prefix=$3
  if ! php -m | grep -i -q "$extension" && [ -e "$ext_dir/$extension.so" ]; then
    echo "$prefix=$extension" >>"$ini_file" && add_log "$tick" "$extension" "Enabled"
  elif php -m | grep -i -q "$extension"; then
    add_log "$tick" "$extension" "Enabled"
  elif ! php -m | grep -i -q "$extension"; then
    exists=$(curl -sL https://pecl.php.net/json.php?package="$extension" -w "%{http_code}" -o /dev/null)
    if [ "$exists" = "200" ]; then
      (
        eval "$install_command" && \
        add_log "$tick" "$extension" "Installed and enabled"
      ) || add_log "$cross" "$extension" "Could not install $extension on PHP$version"
    else
      if ! php -m | grep -i -q "$extension"; then
        add_log "$cross" "$extension" "Could not find $extension for PHP$version on PECL"
      fi
    fi
  fi
}