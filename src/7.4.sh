brew install pkg-config autoconf bison re2c openssl krb5 bzip2 enchant libffi libpng webp freetype intltool icu4c libiconv zlib t1lib gd libzip gmp tidyp libxml2 libxslt postgresql >/dev/null 2>&1
brew link icu4c gettext --force >/dev/null 2>&1

for package in gettext gmp bzip2 krb5 icu4c bison openssl libxml2 libffi libxslt libiconv pkgconfig enchant krb5 readline libedit freetype;
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
echo 'export OPENSSL_LIBS="-L/usr/local/Cellar/openssl/1.0.2s/lib -lcrypto"'
echo 'export OPENSSL_CFLAGS="-I/usr/local/Cellar/openssl/1.0.2s/include"'
echo 'export OPENSSL_ROOT_DIR="/usr/local/opt/openssl"'
echo 'export OPENSSL_LIB_DIR="/usr/local/opt/openssl/lib"'
echo 'export OPENSSL_INCLUDE_DIR="/usr/local/opt/openssl/include"'
echo 'export PKG_CONFIG_PATH="/usr/local/Cellar/openssl/1.0.2s/lib/pkgconfig:$PKG_CONFIG_PATH"'
echo 'export PKG_CONFIG="/usr/local/opt/pkgconfig/bin/pkg-config"'
echo 'export EXTRA_LIBS="/usr/local/opt/readline/lib/libhistory.dylib
/usr/local/opt/readline/lib/libreadline.dylib
/usr/local/opt/openssl/lib/libssl.dylib
/usr/local/opt/openssl/lib/libcrypto.dylib
/usr/local/opt/icu4c/lib/libicudata.dylib
/usr/local/opt/icu4c/lib/libicui18n.dylib
/usr/local/opt/icu4c/lib/libicuio.dylib
/usr/local/opt/icu4c/lib/libicutu.dylib
/usr/local/opt/icu4c/lib/libicuuc.dylib"'
} >> ~/.bash_profile
config_file=$(pwd)/config.yaml
cd ~ || echo "could not move to ~"
curl -L -O https://github.com/phpbrew/phpbrew/raw/master/phpbrew >/dev/null 2>&1
chmod +x ./phpbrew
sudo mv phpbrew /usr/local/bin/phpbrew
sudo mkdir -p /opt/phpbrew
sudo phpbrew init --root=/opt/phpbrew --config="$config_file" >/dev/null 2>&1
sudo chmod -R 777 /opt/phpbrew
export PHPBREW_ROOT=/opt/phpbrew
export PHPBREW_HOME=/opt/phpbrew
echo "[[ -e ~/.phpbrew/bash_profile ]] && source ~/.phpbrew/bash_profile" >> ~/.bash_profile
source ~/.bash_profile >/dev/null 2>&1
sudo mkdir -p /usr/local/lib
phpbrew install -j 4 7.4.0RC2 +dev
phpbrew switch php-7.4.0RC2
phpbrew ext install +dev >/dev/null 2>&1
sudo mkdir -p /usr/local/bin
sudo ln -sf /opt/phpbrew/php/php-7.4.0RC2/bin/* /usr/local/bin/
ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
pecl config-set php_ini $ini_file
ext_dir=$(php -i | grep "extension_dir => /usr" | sed -e "s|.*=> s*||")
sudo chmod 777 "$ini_file"
brew install composer