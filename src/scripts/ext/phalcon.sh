ini_file=$(php --ini | grep "Loaded Configuration" | sed -e "s|.*:s*||" | sed "s/ //g")
find /etc/apt/sources.list.d -type f -name 'ondrej-ubuntu-php*.list' -exec sudo DEBIAN_FRONTEND=noninteractive apt-fast update -o Dir::Etc::sourcelist="{}" ';' >/dev/null 2>&1
curl -s https://packagecloud.io/install/repositories/phalcon/stable/script.deb.sh | sudo bash
sudo DEBIAN_FRONTEND=noninteractive apt-fast install -y php"$2"-psr

if [ ! "$(apt-cache search php"$2"-psr)" ]; then
  sudo DEBIAN_FRONTEND=noninteractive apt-fast install -y php"$2"-dev
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
fi

extension_major_version=$(echo "$1" | grep -i -Po '\d')
extension_version=$(apt-cache policy -- *phalcon | grep -i -Po "$extension_major_version\.\d\.\d.*php$2" | head -n 1)
sudo DEBIAN_FRONTEND=noninteractive apt-fast -o Dpkg::Options::="--force-overwrite" install -y php"$2"-phalcon="$extension_version"