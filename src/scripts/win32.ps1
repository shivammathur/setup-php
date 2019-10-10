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

Function Add-Extension($extension, $install_command, $prefix, $log_prefix)
{
  try {
    $exist = Test-Path -Path C:\tools\php\ext\php_$extension.dll
    if(!(php -m | findstr -i ${extension}) -and $exist) {
      Add-Content C:\tools\php\php.ini "$prefix=php_$extension.dll"
      Write-Host "$log_prefix`: Enabled $extension" -ForegroundColor green
    } elseif(php -m | findstr -i $extension) {
      Write-Host "$log_prefix`: $extension was already enabled" -ForegroundColor yellow
    }
  } catch [Exception] {
    Write-Host "$log_prefix`: $extension could not be enabled" -ForegroundColor red
  }

  $status = 404
  try  {
    $status = (Invoke-WebRequest -Uri "https://pecl.php.net/json.php?package=$extension" -UseBasicParsing -DisableKeepAlive).StatusCode
  } catch [Exception] {
    $status = 500
  }

  if($status -eq 200) {
    if(!(php -m | findstr -i $extension)) {
      try {
        Invoke-Expression $install_command
        Write-Host "$log_prefix`: Installed and enabled $extension" -ForegroundColor green
      } catch [Exception] {
        Write-Host "$log_prefix`: Could not install $extension on PHP $version" -ForegroundColor red
      }
    }
  } else {
    if(!(php -m | findstr -i $extension)) {
      Write-Host "$log_prefix`: Could not find $extension for PHP$version on PECL" -ForegroundColor red
    }
  }
}