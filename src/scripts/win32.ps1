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

# Function to add a line to a powershell profile safely.
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

# Function to fetch PATH from the registry.
Function Get-PathFromRegistry {
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","User") + ";" +
          [System.Environment]::GetEnvironmentVariable("Path","Machine")
  Add-ToProfile $current_profile 'Get-PathFromRegistry' 'Function Get-PathFromRegistry { $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "User") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "Machine") }; Get-PathFromRegistry'
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
  Add-ToProfile $profile $current_profile.replace('\', '\\') ". $current_profile"
}

# Function to install PhpManager.
Function Install-PhpManager() {
  $repo = "mlocati/powershell-phpmanager"
  $tag = (Invoke-RestMethod https://api.github.com/repos/$repo/tags)[0].Name
  $module_path = "$bin_dir\PhpManager\powershell-phpmanager-$tag\PhpManager"
  if(-not (Test-Path $module_path\PhpManager.psm1 -PathType Leaf)) {
    $zip_file = "$bin_dir\PhpManager.zip"
    Invoke-WebRequest -UseBasicParsing -Uri https://github.com/$repo/archive/$tag.zip -OutFile $zip_file
    Expand-Archive -Path $zip_file -DestinationPath $bin_dir\PhpManager -Force
  }
  Import-Module $module_path
  Add-ToProfile $current_profile 'powershell-phpmanager' "Import-Module $module_path"
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
    $stability = 'stable',
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
        Install-PhpExtension -Extension $extension -Version $extension_version -MinimumStability $stability -MaximumStability $stability -Path $php_dir
      } else {
        Install-PhpExtension -Extension $extension -MinimumStability $stability -MaximumStability $stability -Path $php_dir
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

Function Edit-ComposerConfig() {
  Param(
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $tool_path
  )
  Copy-Item $tool_path -Destination "$tool_path.phar"
  php -r "try {`$p=new Phar('$tool_path.phar', 0);exit(0);} catch(Exception `$e) {exit(1);}"
  if ($? -eq $False) {
    Add-Log "$cross" "composer" "Could not download composer"
    exit 1;
  }
  composer -q global config process-timeout 0
  Write-Output "::add-path::$env:APPDATA\Composer\vendor\bin"
  if (Test-Path env:COMPOSER_TOKEN) {
    composer -q global config github-oauth.github.com $env:COMPOSER_TOKEN
  }
  # TODO: Remove after composer 2.0 update, fixes peer fingerprint error
  if ($version -lt 5.6) {
    composer -q global config repos.packagist composer https://repo-ca-bhs-1.packagist.org
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
  if (Test-Path $bin_dir\$tool) {
    Remove-Item $bin_dir\$tool
  }
  if ($tool -eq "symfony") {
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $bin_dir\$tool.exe
    Add-ToProfile $current_profile $tool "New-Alias $tool $bin_dir\$tool.exe" >$null 2>&1
  } else {
    try {
      Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $bin_dir\$tool
      $bat_content = @()
      $bat_content += "@ECHO off"
      $bat_content += "setlocal DISABLEDELAYEDEXPANSION"
      $bat_content += "SET BIN_TARGET=%~dp0/" + $tool
      $bat_content += "php %BIN_TARGET% %*"
      Set-Content -Path $bin_dir\$tool.bat -Value $bat_content
      Add-ToProfile $current_profile $tool "New-Alias $tool $bin_dir\$tool.bat" >$null 2>&1
    } catch { }
  }
  if($tool -eq "phan") {
    Add-Extension fileinfo >$null 2>&1
    Add-Extension ast >$null 2>&1
  } elseif($tool -eq "phive") {
    Add-Extension xml >$null 2>&1
  } elseif($tool -eq "cs2pr") {
    (Get-Content $bin_dir/cs2pr).replace('exit(9)', 'exit(0)') | Set-Content $bin_dir/cs2pr
  } elseif($tool -eq "composer") {
    Edit-ComposerConfig $bin_dir\$tool
  } elseif($tool -eq "wp-cli") {
    Copy-Item $bin_dir\wp-cli.bat -Destination $bin_dir\wp.bat
  }
  if (((Get-ChildItem -Path $bin_dir/* | Where-Object Name -Match "^$tool(.exe|.phar)*$").Count -gt 0)) {
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
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $bin_dir\blackfire.zip >$null 2>&1
  Expand-Archive -Path $bin_dir\blackfire.zip -DestinationPath $bin_dir -Force >$null 2>&1
  Add-ToProfile $current_profile 'blackfire' "New-Alias blackfire $bin_dir\blackfire.exe"
  Add-ToProfile $current_profile 'blackfire-agent' "New-Alias blackfire-agent $bin_dir\blackfire-agent.exe"
  if ((Test-Path env:BLACKFIRE_SERVER_ID) -and (Test-Path env:BLACKFIRE_SERVER_TOKEN)) {
    blackfire-agent --register --server-id=$env:BLACKFIRE_SERVER_ID --server-token=$env:BLACKFIRE_SERVER_TOKEN >$null 2>&1
  }
  if ((Test-Path env:BLACKFIRE_CLIENT_ID) -and (Test-Path env:BLACKFIRE_CLIENT_TOKEN)) {
    blackfire config --client-id=$env:BLACKFIRE_CLIENT_ID --client-token=$env:BLACKFIRE_CLIENT_TOKEN --ca-cert=$php_dir\ssl\cacert.pem >$null 2>&1
  }
  Add-Log $tick "blackfire" "Added"
  Add-Log $tick "blackfire-agent" "Added"
}

# Variables
$tick = ([char]8730)
$cross = ([char]10007)
$php_dir = 'C:\tools\php'
$ext_dir = "$php_dir\ext"
$bin_dir = $php_dir
$current_profile = "$env:TEMP\setup-php.ps1"
$ProgressPreference = 'SilentlyContinue'
$master_version = '8.0'
$cert_source='CurrentUser'

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
  $cert_source='Curl'
  Get-CleanPSProfile >$null 2>&1
  New-Item $bin_dir -Type Directory 2>&1 | Out-Null
  Add-Path -PathItem $bin_dir
  if(-not(Test-Path $bin_dir\printf.exe)) {
    Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/shivammathur/printf/releases/latest/download/printf-$arch.zip" -OutFile "$bin_dir\printf.zip" >$null 2>&1
    Expand-Archive -Path $bin_dir\printf.zip -DestinationPath $bin_dir -Force >$null 2>&1
  }
  if($version -lt 5.6) {
    Add-Log $cross "PHP" "PHP $version is not supported on self-hosted runner"
    Start-Sleep 1
    exit 1
  }
  if ((Get-InstalledModule).Name -notcontains 'VcRedist') {
    Install-Module -Name VcRedist -Force
  }
  New-Item $php_dir -Type Directory 2>&1 | Out-Null
  Add-Path -PathItem $php_dir
  setx PHPROOT $php_dir >$null 2>&1
} else {
  $current_profile = "$PSHOME\Profile.ps1"
  if(-not(Test-Path -LiteralPath $current_profile)) {
    New-Item -Path $current_profile -ItemType "file" -Force >$null 2>&1
  }
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
  ForEach($lib in "libeay32.dll", "ssleay32.dll") {
    Invoke-WebRequest -UseBasicParsing -Uri https://dl.bintray.com/shivammathur/php/$lib -OutFile $php_dir\$lib >$null 2>&1
  }
  Enable-PhpExtension -Extension openssl, curl, mbstring -Path $php_dir
} else {
  Enable-PhpExtension -Extension openssl, curl, opcache, mbstring -Path $php_dir
}
Update-PhpCAInfo -Path $php_dir -Source $cert_source
if ($version -eq 'master') {
  Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/shivammathur/php-extensions-windows/releases/latest/download/php_$env:phpts`_$arch`_pcov.dll" -OutFile $ext_dir"\php_pcov.dll" >$null 2>&1
  Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/shivammathur/php-extensions-windows/releases/latest/download/php_$env:phpts`_$arch`_xdebug.dll" -OutFile $ext_dir"\php_xdebug.dll" >$null 2>&1
  Set-PhpIniKey -Key 'opcache.jit_buffer_size' -Value '256M' -Path $php_dir
  Set-PhpIniKey -Key 'opcache.jit' -Value '1235' -Path $php_dir
}
Add-Log $tick "PHP" "$status PHP $($installed.FullVersion)"
