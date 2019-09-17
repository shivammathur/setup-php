brew fetch autoconf& brew fetch automake& brew fetch pcre& brew fetch libtool& brew fetch libpng& brew fetch webp& brew fetch jpeg& brew fetch freetype& brew fetch libxml2& brew fetch pkg-config& brew fetch krb5& brew fetch icu4c& brew fetch re2c& brew fetch bison& brew fetch libzip& brew fetch mcrypt& brew fetch zlib& brew fetch bzip2& brew fetch enchant
brew install autoconf automake pcre libtool libpng webp jpeg freetype libxml2 pkg-config krb5 icu4c re2c bison libzip mcrypt zlib bzip2 enchant >> /dev/null
brew link --force gettext
brew link --force bison
brew link --force openssl
brew link --force libxml2
brew link --force bzip2
echo 'export PATH="/usr/local/opt/bzip2/bin:$PATH"' >> ~/.bash_profile
echo 'export PATH="/usr/local/opt/openssl/bin:$PATH"' >> ~/.bash_profile
echo 'export PATH="/usr/local/opt/krb5/bin:$PATH"' >> ~/.bash_profile
echo 'export PATH="/usr/local/opt/krb5/sbin:$PATH"' >> ~/.bash_profile
echo 'export PATH="/usr/local/opt/icu4c/bin:$PATH"' >> ~/.bash_profile
echo 'export PATH="/usr/local/opt/icu4c/sbin:$PATH"' >> ~/.bash_profile
echo 'export PATH="/usr/local/opt/bzip2/bin:$PATH"' >> ~/.bash_profile
echo 'export PATH="/usr/local/opt/bison/bin:$PATH"' >> ~/.bash_profile
echo 'export PATH="/usr/local/opt/libxml2/bin:$PATH"' >> ~/.bash_profile
echo 'export PATH="/Users/runner/.phpbrew/php/php-7.4.0RC1/bin:$PATH"' >> ~/.bash_profile
source ~/.bash_profile >> /dev/null
export LIBXML_LIBS="-L/usr/local/opt/libxml2/lib"
export LIBXML_CFLAGS="-I/usr/local/opt/libxml2/include"
export ENCHANT_LIBS="-L/usr/local/opt/enchant/lib"
export ENCHANT_CFLAGS="-I/usr/local/opt/enchant/include"
export FFI_LIBS="-L/usr/local/opt/libffi/lib"
export FFI_CFLAGS="-I/usr/local/opt/libffi/include"
export ICU_LIBS="-L/usr/local/opt/icu4c/lib"
export ICU_CFLAGS="-I/usr/local/opt/icu4c/include"
export KERBEROS_LIBS="-L/usr/local/opt/krb5/lib"
export KERBEROS_CFLAGS="-I/usr/local/opt/krb5/include"
export OPENSSL_LIBS="-L/usr/local/opt/openssl/lib"
export OPENSSL_CFLAGS="-I/usr/local/opt/openssl/include"
export READLINE_LIBS="-L/usr/local/opt/readline/lib"
export READLINE_CFLAGS="-I/usr/local/opt/readline/include"
export BZIP2_LIBS="-L/usr/local/opt/bzip2/lib"
export BZIP2_CFLAGS="-I/usr/local/opt/bzip2/include"
export PKG_CONFIG_PATH="/usr/local/opt/krb5/lib/pkgconfig:/usr/local/opt/icu4c/lib/pkgconfig:/usr/local/obzip2pt/libffi/lib/pkgconfig:/usr/local/opt/openssl@1.1/lib/pkgconfig:/usr/local/opt/readline/lib/pkgconfig:/usr/local/opt/libxml2/lib/pkgconfig:/usr/local/opt/krb5/lib/pkgconfig:/usr/local/opt/icu4c/lib/pkgconfig:/usr/local/opt/libffi/lib/pkgconfig:/usr/local/opt/libxml2/lib/pkgconfig"
cd ~
curl -L -O https://github.com/phpbrew/phpbrew/raw/master/phpbrew
chmod +x ./phpbrew
sudo mv phpbrew /usr/local/bin/phpbrew
sudo mkdir -p /opt/phpbrew
phpbrew init --root=/opt/phpbrew
echo "[[ -e ~/.phpbrew/bashrc ]] && source ~/.phpbrew/bashrc" >> ~/.bashrc
source ~/.bashrc
phpbrew install -j 10 7.4.0RC2 +default +bz2="$(brew --prefix bzip2)" +zlib="$(brew --prefix zlib)" -openssl --  --with-libxml
phpbrew switch php-7.4.0RC2 >> /dev/null
sudo mkdir -p /usr/local/bin
sudo ln -sf /Users/runner/.phpbrew/php/php-7.4.0RC2/bin/php /usr/local/bin/php
brew install composer