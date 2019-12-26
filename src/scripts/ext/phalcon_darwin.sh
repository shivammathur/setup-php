extension=$1
ini_file=$(php -d "date.timezone=UTC" --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
sudo pecl install psr
brew install autoconf automake libtool
git clone https://github.com/phalcon/cphalcon.git
cd cphalcon || echo "could not cd"
git checkout "$(git branch -r | grep -E "origin/${extension: -1}\.\d\.x" | sort -r | head -n 1 | sed "s/ //g")"
sed -i '' 's/zend_ulong/ulong/' build/php7/64bits/phalcon.zep.c
sed -i '' 's/ulong/zend_ulong/' build/php7/64bits/phalcon.zep.c
cd build/php7/64bits && sudo phpize
sudo ./configure --with-php-config=/usr/local/bin/php-config --enable-phalcon
sudo glibtoolize --force
sudo autoreconf
sudo make -i -j6
sudo make install
echo "extension=phalcon.so" >>"$ini_file"