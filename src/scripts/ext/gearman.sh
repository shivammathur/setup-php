release_version=$(lsb_release -s -r)
sudo DEBIAN_FRONTEND=noninteractive add-apt-repository ppa:ondrej/pkg-gearman -y
sudo DEBIAN_FRONTEND=noninteractive apt-get update -y

if [ "$release_version" = "18.04" ]; then
  sudo DEBIAN_FRONTEND=noninteractive apt-fast install -y libgearman-dev php"$1"-gearman
elif [ "$release_version" = "16.04" ]; then
  sudo DEBIAN_FRONTEND=noninteractive apt-fast install -y php"$1"-gearman
fi