param (
  [Parameter(Position = 0, Mandatory = $true)]
  [ValidateNotNull()]
  [ValidateLength(1, [int]::MaxValue)]
  [string]
  $version = '7.4',
  [Parameter(Position = 1, Mandatory = $true)]
  [ValidateNotNull()]
  [ValidateLength(1, [int]::MaxValue)]
  [string]
  $dir
)

Function Step-Log($message) {
  printf "\n\033[90;1m==> \033[0m\033[37;1m%s \033[0m\n" $message
}

Function Add-Log($mark, $subject, $message) {
  $code = if ($mark -eq $cross) { "31" } else { "32" }
  printf "\033[%s;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" $code $mark $subject $message
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

Function Remove-Extension() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $extension
  )
  if(php -m | findstr -i $extension) {
    Disable-PhpExtension $extension $php_dir
  }
  if (Test-Path $ext_dir\php_$extension.dll) {
    Remove-Item $ext_dir\php_$extension.dll
  }
}

# Function to setup a remote tool
Function Add-Tool() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $url,
    [Parameter(Position = 1, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $tool
  )
  if($tool -eq "composer") {
    Install-Composer -Scope System -Path $php_dir -PhpPath $php_dir
    composer -q global config process-timeout 0
    Add-Log $tick $tool "Added"
  } else {
    if (Test-Path $php_dir\$tool) {
      Remove-Item $php_dir\$tool
    }
    try {
      Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $php_dir\$tool
      $bat_content = @()
      $bat_content += "@ECHO off"
      $bat_content += "setlocal DISABLEDELAYEDEXPANSION"
      $bat_content += "SET BIN_TARGET=%~dp0/" + $tool
      $bat_content += "php %BIN_TARGET% %*"
      Set-Content -Path $php_dir\$tool.bat -Value $bat_content
      Add-Content -Path $PsHome\profile.ps1 -Value "New-Alias $tool $php_dir\$tool.bat" > $null 2>&1
      if (Test-Path $php_dir\$tool) {
          Add-Log $tick $tool "Added"
      } else {
          Add-Log $cross $tool "Could not add $tool"
      }
    } catch {
      Add-Log $cross $tool "Could not add $tool"
    }
  }
}

Function Add-Composer-Tool() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $tool,
    [Parameter(Position = 1, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $release,
    [Parameter(Position = 2, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $prefix
  )
  composer -q global require $prefix$release 2>&1 | out-null
  if($?) {
    $composer_dir = composer -q global config home | ForEach-Object { $_ -replace "/", "\" }
    Add-Content -Path $PsHome\profile.ps1 -Value "New-Alias $tool $composer_dir\vendor\bin\$tool.bat"
    Add-Log $tick $tool "Added"
  } else {
    Add-Log $cross $tool "Could not setup $tool"
  }
}

Function Add-PECL() {
  Add-Log $tick "PECL" "Use extensions input or Install-PhpExtension to setup PECL extensions on windows"
}

# Variables
$tick = ([char]8730)
$cross = ([char]10007)
$php_dir = 'C:\tools\php'
$ext_dir = $php_dir + '\ext'
$ProgressPreference = 'SilentlyContinue'
$master_version = '8.0'
$arch='x64'

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
Step-Log "Setup PHP"
if ($null -eq $installed -or -not("$($installed.Version).".StartsWith(($version -replace '^(\d+(\.\d+)*).*', '$1.')))) {
  if ($version -lt '7.0') {
    Install-Module -Name VcRedist -Force
    $arch='x86'
  }
  if ($version -eq $master_version) {
    $version = 'master'
  }

  Install-Php -Version $version -Architecture $arch -ThreadSafe $true -InstallVC -Path $php_dir -TimeZone UTC -InitialPhpIni Production -Force >$null 2>&1
}
else {
  Update-Php $php_dir >$null 2>&1
}

$installed = Get-Php -Path $php_dir
Set-PhpIniKey -Key 'date.timezone' -Value 'UTC' -Path $php_dir
Enable-PhpExtension -Extension openssl, curl, opcache -Path $php_dir
Update-PhpCAInfo -Path $php_dir -Source CurrentUser
if ($version -eq 'master') {
  Copy-Item $dir"\..\src\bin\php_pcov.dll" -Destination $ext_dir"\php_pcov.dll"
  Set-PhpIniKey -Key 'opcache.jit_buffer_size' -Value '256M' -Path $php_dir
  Set-PhpIniKey -Key 'opcache.jit' -Value '1235' -Path $php_dir
}
Add-Log $tick "PHP" "Installed PHP $($installed.FullVersion)"
