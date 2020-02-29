version=${1/./}
extension_version=$2
ext_dir=$(php -i | grep "extension_dir => /" | sed -e "s|.*=> s*||")
scan_dir=$(php --ini | grep additional | sed -e "s|.*: s*||")
ini_file="$scan_dir/50-blackfire.ini"
sudo curl -o $ext_dir/blackfire.so -SL https://packages.blackfire.io/binaries/blackfire-php/$extension_version/blackfire-php-linux_amd64-php-$version.so
echo "extension=blackfire.so" | sudo tee -a "$ini_file"