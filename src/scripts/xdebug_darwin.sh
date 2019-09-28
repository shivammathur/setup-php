git clone --depth=1 https://github.com/xdebug/xdebug.git
(
  cd xdebug || echo "cd failed"
  sudo phpize
  sudo ./configure
  sudo make
  sudo cp modules/xdebug.so "$(php -i | grep "extension_dir => /opt" | sed -e "s|.*=> s*||")"
)
