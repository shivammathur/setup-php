extension=$1
extension_major=${extension: -1}
php_version=$2
brew tap shivammathur/homebrew-phalcon
brew install phalcon@"$php_version"_"$extension_major"