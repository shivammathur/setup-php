ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
sudo DEBIAN_FRONTEND=noninteractive apt-fast install -y php"$2"-dev
for tool in php-config phpize; do
  if [ -e "/usr/bin/$tool$2" ]; then
    sudo update-alternatives --set $tool /usr/bin/"$tool$2"
  fi
done

cd ~ && git clone --depth=1 -v https://github.com/wcgallego/pecl-gearman.git -b "$1"
cd pecl-gearman && /usr/bin/phpize"$2" && ./configure && make && sudo make install
echo "extension=gearman.so" >> "$ini_file"