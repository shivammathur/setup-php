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

Function Add-ToProfile {
  param(
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $input_profile,
    [Parameter(Position = 1, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $search,
    [Parameter(Position = 2, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $value
  )
  if($null -eq (Get-Content $input_profile | findstr $search)) {
    Add-Content -Path $input_profile -Value $value
  }
}

Function Install-PhpManager() {
  $repo = "mlocati/powershell-phpmanager"
  $zip_file = "$php_dir\PhpManager.zip"
  $tag = (Invoke-RestMethod https://api.github.com/repos/$repo/tags)[0].Name
  $module_path = "$php_dir\PhpManager\powershell-phpmanager-$tag\PhpManager"
  Invoke-WebRequest -UseBasicParsing -Uri https://github.com/$repo/archive/$tag.zip -OutFile $zip_file
  Expand-Archive -Path $zip_file -DestinationPath $php_dir\PhpManager -Force
  Import-Module $module_path
  Add-ToProfile $current_profile "PhpManager" "Import-Module $module_path"
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
  if (Test-Path $php_dir\$tool) {
    Remove-Item $php_dir\$tool
  }
  if ($tool -eq "symfony") {
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $php_dir\$tool.exe
    Add-ToProfile $current_profile $tool "New-Alias $tool $php_dir\$tool.exe" > $null 2>&1
  } else {
    try {
      Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $php_dir\$tool
      $bat_content = @()
      $bat_content += "@ECHO off"
      $bat_content += "setlocal DISABLEDELAYEDEXPANSION"
      $bat_content += "SET BIN_TARGET=%~dp0/" + $tool
      $bat_content += "php %BIN_TARGET% %*"
      Set-Content -Path $php_dir\$tool.bat -Value $bat_content
      Add-ToProfile $current_profile $tool "New-Alias $tool $php_dir\$tool.bat" > $null 2>&1
    } catch { }
  }
  if($tool -eq "phive") {
    Add-Extension curl >$null 2>&1
    Add-Extension mbstring >$null 2>&1
    Add-Extension xml >$null 2>&1
  } elseif($tool -eq "cs2pr") {
    (Get-Content $php_dir/cs2pr).replace('exit(9)', 'exit(0)') | Set-Content $php_dir/cs2pr
  } elseif($tool -eq "composer") {
    composer -q global config process-timeout 0
    Write-Output "::add-path::$env:APPDATA\Composer\vendor\bin"
    if (Test-Path env:COMPOSER_TOKEN) {
      composer -q global config github-oauth.github.com $env:COMPOSER_TOKEN
    }
  }

  if (((Get-ChildItem -Path $php_dir/* | Where-Object Name -Match "^$tool(.exe|.phar)*$").Count -gt 0)) {
    Add-Log $tick $tool "Added"
  } else {
    Add-Log $cross $tool "Could not add $tool"
  }
}

Function Add-Composertool() {
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
    Add-Log $tick $tool "Added"
  } else {
    Add-Log $cross $tool "Could not setup $tool"
  }
}

Function Add-Pecl() {
  Add-Log $tick "PECL" "Use extensions input to setup PECL extensions on windows"
}

# Variables
$tick = ([char]8730)
$cross = ([char]10007)
$php_dir = 'C:\tools\php'
$ext_dir = "$php_dir\ext"
$current_profile = "$PSHOME\Profile.ps1"
$ProgressPreference = 'SilentlyContinue'
$master_version = '8.0'
$arch = 'x64'
$ts = $env:PHPTS -eq 'ts'
if($env:PHPTS -ne 'ts') {
  $env:PHPTS = 'nts'
}
if(-not(Test-Path -LiteralPath $current_profile)) {
  New-Item -Path $current_profile -ItemType "file" -Force >$null 2>&1
}

Step-Log "Setup PhpManager"
Install-PhpManager >$null 2>&1
Add-Log $tick "PhpManager" "Installed"

Step-Log "Setup PHP"
$installed = $null
if (Test-Path -LiteralPath $php_dir -PathType Container) {
  try {
    $installed = Get-Php -Path $php_dir
  } catch { }
}
$status = "Installed"
if ($null -eq $installed -or -not("$($installed.Version).".StartsWith(($version -replace '^(\d+(\.\d+)*).*', '$1.'))) -or $ts -ne $installed.ThreadSafe) {
  if ($version -lt '7.0') {
    Install-Module -Name VcRedist -Force
    $arch='x86'
  }
  if ($version -eq $master_version) {
    $version = 'master'
  }

  Install-Php -Version $version -Architecture $arch -ThreadSafe $ts -InstallVC -Path $php_dir -TimeZone UTC -InitialPhpIni Production -Force >$null 2>&1
} else {
  $status = "Found"
}

$installed = Get-Php -Path $php_dir
Set-PhpIniKey -Key 'date.timezone' -Value 'UTC' -Path $php_dir
Enable-PhpExtension -Extension openssl, curl, opcache, mbstring -Path $php_dir
Update-PhpCAInfo -Path $php_dir -Source CurrentUser
if ($version -eq 'master') {
  Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/shivammathur/php-extensions-windows/releases/latest/download/php_$env:phpts`_$arch`_pcov.dll" -OutFile $ext_dir"\php_pcov.dll" >$null 2>&1
  Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/shivammathur/php-extensions-windows/releases/latest/download/php_$env:phpts`_$arch`_xdebug.dll" -OutFile $ext_dir"\php_xdebug.dll" >$null 2>&1
  Set-PhpIniKey -Key 'opcache.jit_buffer_size' -Value '256M' -Path $php_dir
  Set-PhpIniKey -Key 'opcache.jit' -Value '1235' -Path $php_dir
}
Add-Log $tick "PHP" "$status PHP $($installed.FullVersion)"
