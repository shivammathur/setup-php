param (
    [Parameter(Mandatory=$true)][string]$version = "7.3"  
)

if($version -eq '7.4') {
	$version = '7.4RC'
}

Write-Host "Installing PhpManager" -ForegroundColor Blue
Install-Module -Name PhpManager -Force -Scope CurrentUser

$installed = $($(php -v)[0] -join '')[4..6] -join ''
if($installed -ne $version) {
  if($version -lt '7.0') {
      Write-Host "Installing VcRedist"
    Install-Module -Name VcRedist -Force
  }
  Write-Host "Installing PHP" -ForegroundColor Blue
  Uninstall-Php C:\tools\php
  Install-Php -Version $version -Architecture x86 -ThreadSafe $true -InstallVC -Path C:\tools\php$version -TimeZone UTC -InitialPhpIni Production -Force
  Write-Host "Switch PHP" -ForegroundColor Blue
  (Get-PhpSwitcher).targets
  Initialize-PhpSwitcher -Alias C:\tools\php -Scope CurrentUser -Force
  Add-PhpToSwitcher -Name $version -Path C:\tools\php$version -Force
  Switch-Php $version -Force
}

Write-Host "Housekeeping in PHP.ini, enabling openssl" -ForegroundColor Blue
$ext_dir = "C:\tools\php\ext"
Add-Content C:\tools\php\php.ini "date.timezone = 'UTC'"
Set-PhpIniKey extension_dir $ext_dir

if($version -lt '7.4') {
  Enable-PhpExtension openssl
} else {
  Add-Content C:\tools\php\php.ini "extension=php_openssl.dll"
  Copy-Item "php_pcov.dll" -Destination $ext_dir"\php_pcov.dll"
}

Write-Host "Installing Composer" -ForegroundColor Blue
Install-Composer -Scope System -Path C:\tools\php
php -v
composer -V