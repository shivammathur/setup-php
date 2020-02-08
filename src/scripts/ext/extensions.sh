linux_extension_dir() {
  apiv=$1
  if [ "$version" = "5.3" ]; then
    echo "/home/runner/php/5.3.29/lib/php/extensions/no-debug-non-zts-$apiv"
  elif [[ "$version" =~ $old_versions_linux ]]; then
    echo "/usr/lib/php5/$apiv"
  elif [ "$version" = "8.0" ]; then
    echo "/home/runner/php/8.0/lib/php/extensions/no-debug-non-zts-$apiv"
  else
    echo "/usr/lib/php/$apiv"
  fi
}

darwin_extension_dir() {
  apiv=$1
  if [[ "$version" =~ $old_versions_darwin ]]; then
    echo "/opt/local/lib/php${version/./}/extensions/no-debug-non-zts-$apiv"
  else
    echo "/usr/local/lib/php/pecl/$apiv"
  fi
}

get_apiv() {
  case $version in
    5.3)
      echo "20090626"
      ;;
    5.4)
      echo "20100525"
      ;;
    5.5)
      echo "20121212"
      ;;
    5.6)
      echo "20131226"
      ;;
    7.0)
      echo "20151012"
      ;;
    7.1)
      echo "20160303"
      ;;
    7.2)
      echo "20170718"
      ;;
    7.3)
      echo "20180731"
      ;;
    *)
      if [ "$version" = "8.0" ]; then
        php_h="https://raw.githubusercontent.com/php/php-src/master/main/php.h"
      else
        semver=$(curl -sSL --retry 5 https://github.com/php/php-src/releases | grep "$flags" "(php-$version.[0-9]+)".zip | head -n 1 | grep "$flags" '[0-9]+\.[0-9]+\.[0-9]+')
        php_h="https://raw.githubusercontent.com/php/php-src/PHP-$semver/main/php.h"
      fi
      curl -sSL --retry 5 "$php_h" | grep "PHP_API_VERSION" | cut -d' ' -f 3
      ;;
  esac
}

version=$2
old_versions_linux="5.[4-5]"
old_versions_darwin="5.[3-5]"
os=$(uname -s)
if [ "$os" = "Linux" ]; then
  flags='-Po'
  apiv=$(get_apiv)
  dir=$(linux_extension_dir "$apiv")
  sudo mkdir -p "$dir" && sudo chown -R "$USER":"$(id -g -n)" $(dirname "$dir")
elif [ "$os" = "Darwin" ]; then
  flags='-Eo'
  apiv=$(get_apiv)
  dir=$(darwin_extension_dir "$apiv")
else
  dir='C:\\tools\\php\\ext'
fi
hash=$(echo -n "$1" | openssl dgst -sha256 | cut -d ' ' -f 2)
echo "::set-output name=ext_dir::$dir"
echo "::set-output name=ext_hash::$hash"