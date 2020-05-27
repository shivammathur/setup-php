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

# Function to log start of a operation.
Function Step-Log($message) {
  printf "\n\033[90;1m==> \033[0m\033[37;1m%s \033[0m\n" $message
}

# Function to log result of a operation.
Function Add-Log($mark, $subject, $message) {
  $code = if ($mark -eq $cross) { "31" } else { "32" }
  printf "\033[%s;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" $code $mark $subject $message
}

# Function to fetch PATH from the registry.
Function Get-PathFromRegistry {
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
          [System.Environment]::GetEnvironmentVariable("Path","User")
  if($null -eq (Get-Content $current_profile | findstr 'Get-PathFromRegistry')) {
    Add-Content -Path $current_profile -Value 'Function Get-PathFromRegistry { $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User") }; Get-PathFromRegistry'
  }
}

# Function to add a location to PATH.
Function Add-Path {
  param(
    [string]$PathItem
  )
  $newPath = (Get-ItemProperty -Path 'hkcu:\Environment' -Name PATH).Path.replace("$PathItem;", '')
  $newPath = $PathItem + ';' + $newPath
  Set-ItemProperty -Path 'hkcu:\Environment' -Name Path -Value $newPath
  Get-PathFromRegistry
}

# Function to get a clean Powershell profile.
Function Get-CleanPSProfile {
  if(-not(Test-Path -LiteralPath $profile)) {
    New-Item -Path $profile -ItemType "file" -Force
  }
  Set-Content $current_profile -Value ''
  if ($null -eq (Get-Content $profile | FindStr $current_profile.replace('\', '\\'))) {
    Add-Content $profile -Value ". $current_profile"
  }
}

# Function to install PhpManager.
Function Install-PhpManager() {
  $repo = "mlocati/powershell-phpmanager"
  $zip_file = "$php_dir\PhpManager.zip"
  $tag = (Invoke-RestMethod https://api.github.com/repos/$repo/tags)[0].Name
  $module_path = "$php_dir\PhpManager\powershell-phpmanager-$tag\PhpManager"
  Invoke-WebRequest -UseBasicParsing -Uri https://github.com/$repo/archive/$tag.zip -OutFile $zip_file
  Expand-Archive -Path $zip_file -DestinationPath $php_dir\PhpManager
  Import-Module $module_path
  if($null -eq (Get-Content $current_profile | findstr 'powershell-phpmanager')) {
    Add-Content -Path $current_profile -Value "Import-Module $module_path"
  }
}

# Function to add PHP extensions.
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

# Function to remove PHP extensions.
Function Remove-Extension() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $extension
  )
  if(php -m | findstr -i $extension) {
    try {
      Disable-PhpExtension $extension $php_dir
      if (Test-Path $ext_dir\php_$extension.dll) {
        Remove-Item $ext_dir\php_$extension.dll
      }
      Add-Log $tick ":$extension" "Removed"
    } catch {
      Add-Log $cross ":$extension" "Could not remove $extension on PHP $($installed.FullVersion)"
    }
  } else {
    Add-Log $tick ":$extension" "Could not find $extension on PHP $($installed.FullVersion)"
  }
}

# Function to add tools.
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
    Add-Content -Path $current_profile -Value "New-Alias $tool $php_dir\$tool.exe" >$null 2>&1
  } else {
    try {
      Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $php_dir\$tool
      $bat_content = @()
      $bat_content += "@ECHO off"
      $bat_content += "setlocal DISABLEDELAYEDEXPANSION"
      $bat_content += "SET BIN_TARGET=%~dp0/" + $tool
      $bat_content += "php %BIN_TARGET% %*"
      Set-Content -Path $php_dir\$tool.bat -Value $bat_content
      Add-Content -Path $current_profile -Value "New-Alias $tool $php_dir\$tool.bat" >$null 2>&1
    } catch { }
  }
  if($tool -eq "phan") {
    Add-Extension fileinfo >$null 2>&1
    Add-Extension ast >$null 2>&1
  } elseif($tool -eq "phive") {
    Add-Extension xml >$null 2>&1
  } elseif($tool -eq "cs2pr") {
    (Get-Content $php_dir/cs2pr).replace('exit(9)', 'exit(0)') | Set-Content $php_dir/cs2pr
  } elseif($tool -eq "composer") {
    composer -q global config process-timeout 0
    Write-Output "::add-path::$env:APPDATA\Composer\vendor\bin"
    if (Test-Path env:COMPOSER_TOKEN) {
      composer -q global config github-oauth.github.com $env:COMPOSER_TOKEN
    }
  } elseif($tool -eq "wp-cli") {
    Copy-Item $php_dir\wp-cli.bat -Destination $php_dir\wp.bat
  }
  if (((Get-ChildItem -Path $php_dir/* | Where-Object Name -Match "^$tool(.exe|.phar)*$").Count -gt 0)) {
    Add-Log $tick $tool "Added"
  } else {
    Add-Log $cross $tool "Could not add $tool"
  }
}

# Function to setup a tool using composer.
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

# Function to handle request to add PECL.
Function Add-Pecl() {
  Add-Log $tick "PECL" "Use extensions input to setup PECL extensions on windows"
}

# Function to add blackfire and blackfire-agent.
Function Add-Blackfire() {
  $agent_data = Invoke-WebRequest https://blackfire.io/docs/up-and-running/update | ForEach-Object { $_.tostring() -split "[`r`n]" | Select-String '<td class="version">' | Select-Object -Index 0 }
  $agent_version = [regex]::Matches($agent_data, '<td.*?>(.+)</td>') | ForEach-Object {$_.Captures[0].Groups[1].value }
  $url = "https://packages.blackfire.io/binaries/blackfire-agent/${agent_version}/blackfire-agent-windows_${arch_name}.zip"
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $php_dir\blackfire.zip >$null 2>&1
  Expand-Archive -Path $php_dir\blackfire.zip -DestinationPath $php_dir -Force >$null 2>&1
  Add-Content -Path $current_profile -Value "New-Alias blackfire $php_dir\blackfire.exe"
  Add-Content -Path $current_profile -Value "New-Alias blackfire-agent $php_dir\blackfire-agent.exe"
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
$ext_dir = "$php_dir\ext"
$current_profile = "$env:TEMP\setup-php.ps1"
$ProgressPreference = 'SilentlyContinue'
$master_version = '8.0'

$arch = 'x64'
$arch_name ='amd64'
if(-not([Environment]::Is64BitOperatingSystem) -or $version -lt '7.0') {
  $arch = 'x86'
  $arch_name = '386'
}

$ts = $env:PHPTS -eq 'ts'
if($env:PHPTS -ne 'ts') {
  $env:PHPTS = 'nts'
}

if($env:RUNNER -eq 'self-hosted') {
  $bin_dir = 'C:\tools\bin'
  $php_dir = "$php_dir$version"
  $ext_dir = "$php_dir\ext"
  Get-CleanPSProfile >$null 2>&1
  New-Item $bin_dir -Type Directory 2>&1 | Out-Null
  Add-Path -PathItem $bin_dir
  if(-not(Test-Path $bin_dir\printf.exe)) {
    Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/shivammathur/printf/releases/latest/download/printf-$arch.zip" -OutFile "$bin_dir\printf.zip" >$null 2>&1
    Expand-Archive -Path $bin_dir\printf.zip -DestinationPath $bin_dir -Force >$null 2>&1
  }
  if($version -lt 5.6) {
    Add-Log $cross "PHP" "PHP $version is not supported on self-hosted runner"
    exit 1
  }
  New-Item $php_dir -Type Directory 2>&1 | Out-Null
  Add-Path -PathItem $php_dir
  setx PHPROOT $php_dir >$null 2>&1
} else {
  $current_profile = "$PSHOME\Profile.ps1"
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
  if ($version -lt '7.0' -and (Get-InstalledModule).Name -notcontains 'VcRedist') {
    Install-Module -Name VcRedist -Force
  }
  if ($version -eq $master_version) {
    $version = 'master'
  }

  Install-Php -Version $version -Architecture $arch -ThreadSafe $ts -InstallVC -Path $php_dir -TimeZone UTC -InitialPhpIni Production -Force >$null 2>&1
} else {
  if($env:update -eq 'true') {
    Update-Php $php_dir >$null 2>&1
    $status = "Updated to"
  } else {
    $status = "Found"
  }
}

$installed = Get-Php -Path $php_dir
Set-PhpIniKey -Key 'date.timezone' -Value 'UTC' -Path $php_dir
if($version -lt "5.5") {
  Enable-PhpExtension -Extension openssl, curl, mbstring -Path $php_dir
} else {
  Enable-PhpExtension -Extension openssl, curl, opcache, mbstring -Path $php_dir
}
Update-PhpCAInfo -Path $php_dir -Source CurrentUser
if ($version -eq 'master') {
  Copy-Item $dir"\..\src\bin\php_$env:PHPTS`_pcov.dll" -Destination $ext_dir"\php_pcov.dll"
  Set-PhpIniKey -Key 'opcache.jit_buffer_size' -Value '256M' -Path $php_dir
  Set-PhpIniKey -Key 'opcache.jit' -Value '1235' -Path $php_dir
}
Add-Log $tick "PHP" "$status PHP $($installed.FullVersion)"
