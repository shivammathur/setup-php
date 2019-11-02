ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
if [ ! "$(apt-cache search php"$2"-psr)" ]; then
  sudo DEBIAN_FRONTEND=noninteractive add-apt-repository ppa:ondrej/php -y >/dev/null 2>&1
fi
sudo DEBIAN_FRONTEND=noninteractive apt-fast install -y php"$2"-dev php"$2"-psr
for tool in php-config phpize; do
  if [ -e "/usr/bin/$tool$2" ]; then
    sudo update-alternatives --set $tool /usr/bin/"$tool$2"
  fi
done

if [ ! "$(apt-cache search php"$2"-psr)" ]; then
  cd ~ && git clone --depth=1 https://github.com/jbboehr/php-psr.git
  cd php-psr && sudo /usr/bin/phpize"$2"
  ./configure --with-php-config=/usr/bin/php-config"$2"
  make -j2 && sudo make -j2 install
  echo "extension=psr.so" >> "$ini_file"
fi

if [ "$1" = "master" ]; then
  sudo DEBIAN_FRONTEND=noninteractive apt-fast install -y php"$2"-phalcon
else
  cd ~ && git clone --depth=1 -v https://github.com/phalcon/cphalcon.git -b "$1"
  cd cphalcon/build && sudo ./install --phpize /usr/bin/phpize"$2" --php-config /usr/bin/php-config"$2"
  echo "extension=phalcon.so" >> "$ini_file"
fi