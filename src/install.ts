import * as core from '@actions/core';
import {exec} from '@actions/exec/lib/exec';
const fs = require('fs');

let darwin = `echo $1
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
brew unlink php
brew tap exolnet/homebrew-deprecated
brew tap homebrew/homebrew-php
brew install php@$1
brew link --force --overwrite php@$1
curl -sS https://getcomposer.org/installer | php
chmod +x composer.phar
mv composer.phar /usr/local/bin/composer
php -v
composer -V`;

let linux = `sudo add-apt-repository ppa:ondrej/php -y
sudo apt update -y
sudo apt install -y php$1 curl
sudo update-alternatives --set php /usr/bin/php$1
sudo curl -s https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
php -v
composer -V`;

let windows = `param (
    [Parameter(Mandatory=$true)][string]$version = "7.3"  
)

echo "Installing NuGet"
Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force
if($version -lt '7.0') {
  echo "Installing Visual C++"
  Install-Module -Name VcRedist -Force
  New-Item -Path C:\\Temp\\VcRedist -ItemType Directory
  Get-VcList | Save-VcRedist -Path C:\\Temp\\VcRedist
  $VcList = Get-VcList
  Install-VcRedist -Path C:\\Temp\\VcRedist -VcList $VcList -Silent
}
echo "Installing PhpManager"
Install-Module -Name PhpManager -Force -Scope CurrentUser
echo "Installing PHP"
Uninstall-Php C:\\tools\\php
Install-Php -Version $version -Architecture x86 -ThreadSafe $true -Path C:\\tools\\php$version -TimeZone UTC
echo "Switch PHP"
(Get-PhpSwitcher).targets
Initialize-PhpSwitcher -Alias C:\\tools\\php -Scope CurrentUser -Force
Add-PhpToSwitcher -Name $version -Path C:\\tools\\php$version -Force
Switch-Php $version -Force
echo "Housekeeping in PHP.ini, enabling openssl"
Move-item -Path C:\\tools\\php$version\\php.ini-development -Destination C:\\tools\\php$version\\php.ini -Force
Add-Content C:\\tools\\php$version\\php.ini "extension=C:\\tools\\php$version\\ext\\php_openssl.dll"
Add-Content C:\\tools\\php$version\\php.ini "date.timezone = 'UTC'"
echo "Installing Composer"
Install-Composer -Scope System -Path C:\\tools\\php
php -v
composer -V`;

async function createScript(filename: string, version: string) {
  let script = '';
  if (filename == 'linux.sh') {
    script = linux;
  } else if (filename == 'darwin.sh') {
    script = darwin;
  } else if (filename == 'windows.ps1') {
    script = windows;
  }
  fs.writeFile(version + filename, script, function(error: any) {
    if (error) {
      return console.log(error);
    }

    console.log('The file was saved!');
  });
}

async function run() {
  try {
    let version = process.env['php-version'];
    if (!version) {
      version = core.getInput('php-version', {required: true});
    }
    console.log('Input: ' + version);

    let os_version = process.platform;
    if (os_version == 'darwin') {
      await createScript('darwin.sh', version);
      await exec('sudo chmod a+x ' + version + 'darwin.sh');
      await exec('sh -x ./' + version + 'darwin.sh ' + version);
    } else if (os_version == 'win32') {
      await createScript('windows.ps1', version);
      await exec(
        'powershell .\\' + version + 'windows.ps1 -version ' + version
      );
    } else if (os_version == 'linux') {
      await createScript('linux.sh', version);
      await exec('sudo chmod a+x ' + version + 'linux.sh');
      await exec('./' + version + 'linux.sh ' + version);
    }
  } catch (err) {
    core.setFailed(err.message);
  }
}

run().then(() => {
  console.log('done');
});
