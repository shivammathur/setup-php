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

Function Install-PhpManager() {
  $repo = "mlocati/powershell-phpmanager"
  $zip_file = "${php_dir}\PhpManager.zip"
  $tags = Invoke-WebRequest https://api.github.com/repos/$repo/tags | ConvertFrom-Json
  $tag = $tags[0].Name
  Invoke-WebRequest -UseBasicParsing -Uri https://github.com/$repo/archive/$tag.zip -OutFile $zip_file
  Expand-Archive -Path $zip_file -DestinationPath $php_dir\PhpManager
  Import-Module $php_dir\PhpManager\powershell-phpmanager-$tag\PhpManager
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
    $mininum_stability = 'stable',
    [Parameter(Position = 2, Mandatory = $false)]
    [ValidateNotNull()]
    [ValidatePattern('^\d+(\.\d+){0,2}$')]
    [string]
    $extension_version = ''
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
      if($extension_version -ne '') {
        Install-PhpExtension -Extension $extension -Version $extension_version -MinimumStability $mininum_stability -Path $php_dir
      } else {
        Install-PhpExtension -Extension $extension -MinimumStability $mininum_stability -Path $php_dir
      }

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
    Add-Content -Path $PsHome\profile.ps1 -Value "New-Alias $tool $php_dir\$tool.exe" >$null 2>&1
  } else {
    try {
      Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $php_dir\$tool
      $bat_content = @()
      $bat_content += "@ECHO off"
      $bat_content += "setlocal DISABLEDELAYEDEXPANSION"
      $bat_content += "SET BIN_TARGET=%~dp0/" + $tool
      $bat_content += "php %BIN_TARGET% %*"
      Set-Content -Path $php_dir\$tool.bat -Value $bat_content
      Add-Content -Path $PsHome\profile.ps1 -Value "New-Alias $tool $php_dir\$tool.bat" >$null 2>&1
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
  } elseif($tool -eq "wp-cli") {
    Copy-Item $php_dir\wp-cli.bat -Destination $php_dir\wp.bat
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
    $composer_dir = composer -q global config home | ForEach-Object { $_ -replace "/", "\" }
    Add-Content -Path $PsHome\profile.ps1 -Value "New-Alias $tool $composer_dir\vendor\bin\$tool.bat"
    Add-Log $tick $tool "Added"
  } else {
    Add-Log $cross $tool "Could not setup $tool"
  }
}

Function Add-Pecl() {
  Add-Log $tick "PECL" "Use extensions input to setup PECL extensions on windows"
}

Function Add-Blackfire() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $agent_version
  )
  $url = "https://packages.blackfire.io/binaries/blackfire-agent/${agent_version}/blackfire-agent-windows_${arch_name}.zip"
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $php_dir\blackfire.zip >$null 2>&1
  7z e $php_dir\blackfire.zip -o"$php_dir" -y >$null 2>&1
  Add-Content -Path $PsHome\profile.ps1 -Value "New-Alias blackfire $php_dir\blackfire.exe"
  Add-Content -Path $PsHome\profile.ps1 -Value "New-Alias blackfire-agent $php_dir\blackfire-agent.exe"
  if ((Test-Path env:BLACKFIRE_SERVER_ID) -and (Test-Path env:BLACKFIRE_SERVER_TOKEN)) {
    blackfire-agent --register --server-id=$env:BLACKFIRE_SERVER_ID --server-token=$env:BLACKFIRE_SERVER_TOKEN >$null 2>&1
  }
  if ((Test-Path env:BLACKFIRE_CLIENT_ID) -and (Test-Path env:BLACKFIRE_CLIENT_TOKEN)) {
    blackfire --config --client-id=$env:BLACKFIRE_CLIENT_ID --client-token=$env:BLACKFIRE_CLIENT_TOKEN --ca-cert=$php_dir\ssl\cacert.pem >$null 2>&1
  }
  Add-Log $tick "blackfire" "Added"
  Add-Log $tick "blackfire-agent" "Added"
}

# Variables
$tick = ([char]8730)
$cross = ([char]10007)
$php_dir = 'C:\tools\php'
$ext_dir = $php_dir + '\ext'
$ProgressPreference = 'SilentlyContinue'
$master_version = '8.0'
$arch = 'x64'
$arch_name='amd64'
$ts = $false
if((Test-Path env:PHPTS) -and $env:PHPTS -eq 'ts') {
  $ts = $true
}

Step-Log "Setup PhpManager"
Install-PhpManager >$null 2>&1
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
$status = "Installed"
if ($null -eq $installed -or -not("$($installed.Version).".StartsWith(($version -replace '^(\d+(\.\d+)*).*', '$1.'))) -or $ts -ne $installed.ThreadSafe) {
  if ($version -lt '7.0') {
    Install-Module -Name VcRedist -Force
    $arch='x86'
    $arch_name='386'
  }
  if ($version -eq $master_version) {
    $version = 'master'
  }

  Install-Php -Version $version -Architecture $arch -ThreadSafe $ts -InstallVC -Path $php_dir -TimeZone UTC -InitialPhpIni Production -Force >$null 2>&1
} else {
  if((Test-Path env:update) -and $env:update -eq 'true') {
    Update-Php $php_dir >$null 2>&1
    $status = "Updated to"
  } else {
    $status = "Found"
  }
}

$installed = Get-Php -Path $php_dir
Set-PhpIniKey -Key 'date.timezone' -Value 'UTC' -Path $php_dir
if($version -lt "5.5") {
  Add-Extension openssl >$null 2>&1
  Add-Extension curl >$null 2>&1
} else {
  Enable-PhpExtension -Extension openssl, curl, opcache -Path $php_dir
}
Update-PhpCAInfo -Path $php_dir -Source CurrentUser
if ($version -eq 'master') {
  if($installed.ThreadSafe) {
    Copy-Item $dir"\..\src\bin\php_ts_pcov.dll" -Destination $ext_dir"\php_pcov.dll"
  } else {
    Copy-Item $dir"\..\src\bin\php_pcov.dll" -Destination $ext_dir"\php_pcov.dll"
  }
  Set-PhpIniKey -Key 'opcache.jit_buffer_size' -Value '256M' -Path $php_dir
  Set-PhpIniKey -Key 'opcache.jit' -Value '1235' -Path $php_dir
}
Add-Log $tick "PHP" "$status PHP $($installed.FullVersion)"
