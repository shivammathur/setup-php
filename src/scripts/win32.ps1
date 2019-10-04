param (
    [Parameter(Mandatory=$true)][string]$version = "7.3"  
)

if($version -eq '7.4') {
	$version = '7.4RC'
}

echo "Installing PhpManager"
Install-Module -Name PhpManager -Force -Scope CurrentUser

$installed = $($(php -v)[0] -join '')[4..6] -join ''
if($installed -ne $version) {
  if($version -lt '7.0') {
    echo "Installing VcRedist"
    Install-Module -Name VcRedist -Force
  }
  echo "Installing PHP"
  Uninstall-Php C:\tools\php
  Install-Php -Version $version -Architecture x86 -ThreadSafe $true -InstallVC -Path C:\tools\php$version -TimeZone UTC -InitialPhpIni Production -Force
  echo "Switch PHP"
  (Get-PhpSwitcher).targets
  Initialize-PhpSwitcher -Alias C:\tools\php -Scope CurrentUser -Force
  Add-PhpToSwitcher -Name $version -Path C:\tools\php$version -Force
  Switch-Php $version -Force
}

echo "Housekeeping in PHP.ini, enabling openssl"
$ext_dir = "C:\tools\php\ext"
Add-Content C:\tools\php\php.ini "date.timezone = 'UTC'"
Set-PhpIniKey extension_dir $ext_dir

if($version -lt '7.4') {
  Enable-PhpExtension openssl
} else {
  Add-Content C:\tools\php\php.ini "extension=php_openssl.dll"
  Copy-Item "php_pcov.dll" -Destination $ext_dir"\php_pcov.dll"
}

echo "Installing Composer"
Install-Composer -Scope System -Path C:\tools\php
php -v
composer -V