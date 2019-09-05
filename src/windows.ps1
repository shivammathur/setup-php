param (
    [Parameter(Mandatory=$true)][string]$version = "7.3"  
)

echo "Installing NuGet"
Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force

if($version -lt '7.0') {
	echo "Installing Visual C++"
	Install-Module -Name VcRedist -Force
	New-Item -Path C:\Temp\VcRedist -ItemType Directory
	Get-VcList | Save-VcRedist -Path C:\Temp\VcRedist
	$VcList = Get-VcList
	Install-VcRedist -Path C:\Temp\VcRedist -VcList $VcList -Silent
}

echo "Installing PhpManager"
Install-Module -Name PhpManager -Force -Scope CurrentUser

echo "Installing PHP"
Uninstall-Php C:\tools\php
Install-Php -Version $version -Architecture x86 -ThreadSafe $true -Path C:\tools\php$version -TimeZone UTC

echo "Switch PHP"
(Get-PhpSwitcher).targets
Initialize-PhpSwitcher -Alias C:\tools\php -Scope CurrentUser -Force
Add-PhpToSwitcher -Name $version -Path C:\tools\php$version -Force
Switch-Php $version -Force

echo "Housekeeping in PHP.ini, enabling openssl"
Move-item -Path C:\tools\php$version\php.ini-development -Destination C:\tools\php$version\php.ini -Force
Add-Content C:\tools\php$version\php.ini "extension=C:\tools\php$version\ext\php_openssl.dll"
Add-Content C:\tools\php$version\php.ini "date.timezone = 'UTC'"

echo "Installing Composer"
Install-Composer -Scope User

php -v
composer -V