param (
  [Parameter(Mandatory = $true)][string]$version = "7.4",
  [Parameter(Mandatory=$true)][string]$dir
)

$tick = ([char]8730)
$cross = ([char]10007)
$php_dir = 'C:\tools\php'
$ext_dir = $php_dir + '\ext'
$ProgressPreference = 'SilentlyContinue'
$master_version = '8.0'
$arch='x64'

Function Step-Log($message) {
  printf "\n\033[90;1m==> \033[0m\033[37;1m%s \033[0m\n" $message
}

Function Add-Log($mark, $subject, $message) {
  $code = if ($mark -eq $cross) { "31" } else { "32" }
  printf "\033[%s;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" $code $mark $subject $message
}

Step-Log "Setup PhpManager"
Install-Module -Name PhpManager -Force -Scope CurrentUser
Add-Log $tick "PhpManager" "Installed"

$installed = $null
if (Test-Path -LiteralPath $php_dir -PathType Container) {
  try {
    $installed = Get-Php -Path $php_dir
  }
  catch {
  }
}
Step-Log "Setup PHP and Composer"
if ($null -eq $installed -or -not("$($installed.Version).".StartsWith(($version -replace '^(\d+(\.\d+)*).*', '$1.')))) {
  if ($version -lt '7.0') {
    Install-Module -Name VcRedist -Force
    $arch='x86'
  }
  if ($version -eq $master_version) {
    $version = 'master'
  }

  Install-Php -Version $version -Architecture $arch -ThreadSafe $true -InstallVC -Path $php_dir -TimeZone UTC -InitialPhpIni Production -Force >$null 2>&1
  $installed = Get-Php -Path $php_dir
  $status = "Installed PHP $($installed.FullVersion)"
}
else {
  $status = "PHP $($installed.FullVersion) Found"
}

Set-PhpIniKey -Key 'date.timezone' -Value 'UTC' -Path $php_dir
Enable-PhpExtension -Extension openssl, curl, opcache -Path $php_dir
Update-PhpCAInfo -Path $php_dir -Source CurrentUser
Add-Log $tick "PHP" $status

Install-Composer -Scope System -Path $php_dir -PhpPath $php_dir
Add-Log $tick "Composer" "Installed"
if ($version -eq 'master') {
  Copy-Item $dir"\..\src\ext\php_pcov.dll" -Destination $ext_dir"\php_pcov.dll"
  Set-PhpIniKey -Key 'opcache.jit_buffer_size' -Value '256M' -Path $php_dir
  Set-PhpIniKey -Key 'opcache.jit' -Value '1235' -Path $php_dir
}

Function Add-Extension {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $extension,
    [Parameter(Position = 1, Mandatory = $false)]
    [ValidateNotNull()]
    [ValidateSet('stable', 'beta', 'alpha', 'devel', 'snapshot')]
    [string]
    $mininum_stability = 'stable'
  )
  try {
    $extension_info = Get-PhpExtension -Path $php_dir | Where-Object { $_.Name -eq $extension -or $_.Handle -eq $extension }
    if ($null -ne $extension_info) {
      switch ($extension_info.State) {
        'Builtin' {
          Add-Log $tick $extension "Enabled"
        }
        'Enabled' {
          Add-Log $tick $extension "Enabled"
        }
        default {
          Enable-PhpExtension -Extension $extension_info.Handle -Path $php_dir
          Add-Log $tick $extension "Enabled"
        }
      }
    }
    else {
      Install-PhpExtension -Extension $extension -MinimumStability $mininum_stability -Path $php_dir
      Add-Log $tick $extension "Installed and enabled"
    }
  }
  catch {
    Add-Log $cross $extension "Could not install $extension on PHP $($installed.FullVersion)"
  }
}

Function Add-Phalcon {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateSet('phalcon3', 'phalcon4')]
    [string]
    $extension
  )
  $extension_version = $extension.substring($extension.Length - 1)
  $nts = if(! $installed.ThreadSafe ) { "_nts" } else { "" }
  $domain = "https://github.com"
  Install-Phpextension psr
  try
  {
    $match = Invoke-WebRequest -UseBasicParsing -Uri $domain/phalcon/cphalcon/releases | Select-String -Pattern "href=`"(.*phalcon_${arch}_.*_php${version}_${extension_version}.*[0-9]${nts}.zip)`""
    $zip_file = $match.Matches[0].Groups[1].Value
    Invoke-WebRequest -UseBasicParsing -Uri $domain/$zip_file -OutFile $PSScriptRoot\phalcon.zip
    Expand-Archive -Path $PSScriptRoot\phalcon.zip -DestinationPath $PSScriptRoot\phalcon -Force > $null 2>&1
    New-Item -ItemType SymbolicLink -Path $ext_dir\php_phalcon.dll -Target $PSScriptRoot\phalcon\php_phalcon.dll > $null 2>&1
    Enable-PhpExtension -Extension phalcon -Path $php_dir
    Add-Log $tick $extension "Installed and enabled"
  } catch {
    Add-Log $cross $extension "Could not install $extension on PHP $($installed.FullVersion)"
  }
}
