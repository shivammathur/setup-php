ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
sudo DEBIAN_FRONTEND=noninteractive apt install php"$2"-dev php-pear -y
for tool in php-config phpize; do
  if [ -e "/usr/bin/$tool$2" ]; then
    sudo update-alternatives --set $tool /usr/bin/"$tool$2" &
  fi
done
sudo pecl config-set php_ini "$ini_file"
sudo pear config-set php_ini "$ini_file"
sudo pecl install psr
if [ "$1" = "master" ]; then
  sudo DEBIAN_FRONTEND=noninteractive apt install php"$2"-phalcon -y
else
  git clone --depth=1 -v https://github.com/phalcon/cphalcon.git -b "$1"
  (
    cd cphalcon/build && sudo ./install --phpize /usr/bin/phpize"$2" --php-config /usr/bin/php-config"$2"
    echo "extension=phalcon.so" >> "$ini_file"
  )
fi