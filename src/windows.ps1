param (
    [Parameter(Mandatory=$true)][string]$version = "7.3"  
)

if($version -eq '7.4') {
	$version = '7.4RC'
}
echo "Installing NuGet"
Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force
echo "Installing PhpManager"
Install-Module -Name PhpManager -Force -Scope CurrentUser

$installed = php -v | grep ^PHP | cut -c 5-7
echo $installed
echo $version
if($installed -ne $version) {
  if($version -lt '7.0') {
    echo "Installing Visual C++"
    Install-Module -Name VcRedist -Force
    New-Item -Path C:\Temp\VcRedist -ItemType Directory
    Get-VcList | Save-VcRedist -Path C:\Temp\VcRedist
    $VcList = Get-VcList
    Install-VcRedist -Path C:\Temp\VcRedist -VcList $VcList -Silent
  }

  echo "Installing PHP"
  Uninstall-Php C:\tools\php
  Install-Php -Version $version -Architecture x86 -ThreadSafe $true -Path C:\tools\php$version -TimeZone UTC -InitialPhpIni Production
  echo "Switch PHP"
  (Get-PhpSwitcher).targets
  Initialize-PhpSwitcher -Alias C:\tools\php -Scope CurrentUser -Force
  Add-PhpToSwitcher -Name $version -Path C:\tools\php$version -Force
  Switch-Php $version -Force
  echo "Housekeeping in PHP.ini, enabling openssl"
  Add-Content C:\tools\php$version\php.ini "date.timezone = 'UTC'"
  Set-PhpIniKey extension_dir C:\tools\php$version\ext
  if($version -lt '7.4') {
  	Enable-PhpExtension openssl
  } else {
  	Add-Content C:\tools\php$version\php.ini "extension=php_openssl.dll"
  }
}

echo "Installing Composer"
Install-Composer -Scope System -Path C:\tools\php
php -v
composer -V