ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
sudo DEBIAN_FRONTEND=noninteractive apt install php"$2"-dev -y
for tool in php-config phpize; do
  if [ -e "/usr/bin/$tool$2" ]; then
    sudo update-alternatives --set $tool /usr/bin/"$tool$2"
  fi
done

cd ~ && git clone --depth=1 https://github.com/jbboehr/php-psr.git
cd php-psr && sudo /usr/bin/phpize"$2"
./configure --with-php-config=/usr/bin/php-config"$2"
make -j2 && sudo make -j2 install
echo "extension=psr.so" >> "$ini_file"

if [ "$1" = "master" ]; then
  sudo DEBIAN_FRONTEND=noninteractive apt install php"$2"-phalcon -y
else
  cd ~ && git clone --depth=1 -v https://github.com/phalcon/cphalcon.git -b "$1"
  cd cphalcon/build && sudo ./install --phpize /usr/bin/phpize"$2" --php-config /usr/bin/php-config"$2"
  echo "extension=phalcon.so" >> "$ini_file"
fi