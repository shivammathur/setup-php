version=${1/./}
extension=${2}
extension_version=$(echo "$extension" | cut -d '-' -f 2)
if [ "$extension_version" = "blackfire" ]; then
  extension_version=$(curl -sSL https://blackfire.io/docs/up-and-running/update | grep 'class="version"' | sed -e "s/ //g" | sed -n '3,3p' | cut -d '>' -f 2 | cut -d '<' -f 1)
fi
ext_dir=$(php -i | grep -Ei "extension_dir => /usr" | sed -e "s|.*=> s*||")
scan_dir=$(php --ini | grep additional | sed -e "s|.*: s*||")
ini_file="$scan_dir/50-blackfire.ini"
sudo curl -o $ext_dir/blackfire.so -SL https://packages.blackfire.io/binaries/blackfire-php/$extension_version/blackfire-php-darwin_amd64-php-$version.so
echo "extension=blackfire.so" | sudo tee -a "$ini_file"