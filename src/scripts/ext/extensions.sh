php_h="https://raw.githubusercontent.com/php/php-src/PHP-$2/main/php.h"
os=$(uname -s)
if [ "$os" = "Linux" ]; then
  apiv=$(curl -sSL --retry 5 "$php_h" | grep "PHP_API_VERSION" | cut -d' ' -f 3)
  dir="/usr/lib/php/$apiv"
  sudo mkdir -p "$dir" && sudo chown -R "$USER":"$(id -g -n)" /usr/lib/php
elif [ "$os" = "Darwin" ]; then
  apiv=$(curl -sSL --retry 5 "$php_h" | grep "PHP_API_VERSION" | cut -d' ' -f 3)
  dir="/usr/local/lib/php/pecl/$apiv"
else
  dir='C:\\tools\\php\\ext'
fi
hash=$(echo -n "$1" | openssl dgst -sha256 | cut -d ' ' -f 2)
echo "::set-output name=ext_dir::$dir"
echo "::set-output name=ext_hash::$hash"