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
  $dist
)

# Function to log start of a operation.
Function Step-Log($message) {
  printf "\n\033[90;1m==> \033[0m\033[37;1m%s \033[0m\n" $message
}

# Function to log result of a operation.
Function Add-Log($mark, $subject, $message) {
  if ($mark -eq $tick) {
    printf "\033[32;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" $mark $subject $message
  } else {
    printf "\033[31;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" $mark $subject $message
    if($env:fail_fast -eq 'true') {
      exit 1;
    }
  }
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

# Function to make sure printf is in PATH.
Function Add-Printf {
  if (-not(Test-Path "C:\Program Files\Git\usr\bin\printf.exe")) {
    if(Test-Path "C:\msys64\usr\bin\printf.exe") {
      New-Item -Path $bin_dir\printf.exe -ItemType SymbolicLink -Value C:\msys64\usr\bin\printf.exe
    } else {
      Invoke-WebRequest -Uri "$github/shivammathur/printf/releases/latest/download/printf-x64.zip" -OutFile "$bin_dir\printf.zip"
      Expand-Archive -Path $bin_dir\printf.zip -DestinationPath $bin_dir -Force
    }
  } else {
    New-Item -Path $bin_dir\printf.exe -ItemType SymbolicLink -Value "C:\Program Files\Git\usr\bin\printf.exe"
  }
}

# Function to get a clean Powershell profile.
Function Get-CleanPSProfile {
  if(-not(Test-Path -LiteralPath $profile)) {
    New-Item -Path $profile -ItemType "file" -Force
  }
  Set-Content $current_profile -Value ''
  Add-ToProfile $profile $current_profile.replace('\', '\\') ". $current_profile"
}

# Function to install a powershell package from GitHub.
Function Install-PSPackage() {
  param(
    [Parameter(Position = 0, Mandatory = $true)]
    $package,
    [Parameter(Position = 1, Mandatory = $true)]
    $psm1_path,
    [Parameter(Position = 2, Mandatory = $true)]
    $url,
    [Parameter(Position = 3, Mandatory = $true)]
    $cmdlet
  )
  $module_path = "$bin_dir\$psm1_path.psm1"
  if(-not (Test-Path $module_path -PathType Leaf)) {
    $zip_file = "$bin_dir\$package.zip"
    Invoke-WebRequest -Uri $url -OutFile $zip_file
    Expand-Archive -Path $zip_file -DestinationPath $bin_dir -Force
  }
  Import-Module $module_path
  Add-ToProfile $current_profile "$package-search" "Import-Module $module_path"

  if($null -eq (Get-Command $cmdlet -ErrorAction SilentlyContinue)) {
    Install-Module -Name $cmdlet -Force
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
  if (-not(Test-Path $composer_json)) {
    Set-Content -Path $composer_json -Value "{}"
  }
  composer -q config -g process-timeout 0
  Write-Output $composer_bin | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8
  if (Test-Path env:COMPOSER_TOKEN) {
    composer -q config -g github-oauth.github.com $env:COMPOSER_TOKEN
  }
}

# Function to extract tool version.
Function Get-ToolVersion() {
  Param (
      [Parameter(Position = 0, Mandatory = $true)]
      $tool,
      [Parameter(Position = 1, Mandatory = $true)]
      $param
  )
  $alp = "[a-zA-Z0-9]"
  $version_regex = "[0-9]+((\.{1}$alp+)+)(\.{0})(-$alp+){0,1}"
  if($tool -eq 'composer') {
    if ($param -eq 'snapshot') {
      $composer_version = (Select-String -Pattern "const\sBRANCH_ALIAS_VERSION" -Path $bin_dir\composer -Raw | Select-String -Pattern $version_regex | ForEach-Object { $_.matches.Value }) + '+' + (Select-String -Pattern "const\sVERSION" -Path $bin_dir\composer -Raw | Select-String -Pattern "[a-zA-Z0-9]+" -AllMatches | ForEach-Object { $_.matches[2].Value })
    } else {
      $composer_version = Select-String -Pattern "const\sVERSION" -Path $bin_dir\composer -Raw | Select-String -Pattern $version_regex | ForEach-Object { $_.matches.Value }
    }
    Set-Variable -Name 'composer_version' -Value $composer_version -Scope Global
    return "$composer_version"
  }
  return . $tool $param 2> $null | ForEach-Object { $_ -replace "composer $version_regex", '' } | Select-String -Pattern $version_regex | Select-Object -First 1 | ForEach-Object { $_.matches.Value }
}

# Function to add tools.
Function Add-Tool() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    $url,
    [Parameter(Position = 1, Mandatory = $true)]
    [ValidateNotNull()]
    $tool,
    [Parameter(Position = 2, Mandatory = $true)]
    [ValidateNotNull()]
    $ver_param
  )
  if (Test-Path $bin_dir\$tool) {
    Remove-Item $bin_dir\$tool
  }
  if($url.Count -gt 1) {
    $url = $url[0]
  }
  $tool_path = "$bin_dir\$tool"
  if (($url | Split-Path -Extension) -eq ".exe") {
    $tool_path = "$tool_path.exe"
  }
  try {
    Invoke-WebRequest -Uri $url -OutFile $tool_path
  } catch {
    if($url -match '.*github.com.*releases.*latest.*') {
      try {
        $url = $url.replace("releases/latest/download", "releases/download/" + ([regex]::match((Invoke-WebRequest -Uri ($url.split('/release')[0] + "/releases")).Content, "([0-9]+\.[0-9]+\.[0-9]+)/" + ($url.Substring($url.LastIndexOf("/") + 1))).Groups[0].Value).split('/')[0])
        Invoke-WebRequest -Uri $url -OutFile $tool_path
      } catch { }
    }
  }
  if (((Get-ChildItem -Path $bin_dir/* | Where-Object Name -Match "^$tool(.exe|.phar)*$").Count -gt 0)) {
    $bat_content = @()
    $bat_content += "@ECHO off"
    $bat_content += "setlocal DISABLEDELAYEDEXPANSION"
    $bat_content += "SET BIN_TARGET=%~dp0/" + $tool
    $bat_content += "php %BIN_TARGET% %*"
    Set-Content -Path $bin_dir\$tool.bat -Value $bat_content
    Add-ToProfile $current_profile $tool "New-Alias $tool $bin_dir\$tool.bat" >$null 2>&1
    Add-ToolsHelper $tool
    $tool_version = Get-ToolVersion $tool $ver_param
    Add-Log $tick $tool "Added $tool $tool_version"
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
  if($tool -match "prestissimo|composer-prefetcher" -and $composer_version.split('.')[0] -ne "1") {
    Write-Output "::warning:: Skipping $tool, as it does not support Composer $composer_version. Specify composer:v1 in tools to use $tool"
    Add-Log $cross $tool "Skipped"
    Return
  }
  if(Test-Path $composer_lock) {
    Remove-Item -Path $composer_lock -Force
  }
  (composer global require $prefix$release 2>&1 | Tee-Object -FilePath $env:APPDATA\Composer\composer.log) >$null 2>&1
  $json = findstr $prefix$tool $env:APPDATA\Composer\composer.json
  $log = findstr $prefix$tool $env:APPDATA\Composer\composer.log
  if(Test-Path $composer_bin\composer) {
    Copy-Item -Path "$bin_dir\composer" -Destination "$composer_bin\composer" -Force
  }
  Add-ToolsHelper $tool
  if($json) {
    $tool_version = Get-ToolVersion "Write-Output" "$log"
    Add-Log $tick $tool "Added $tool $tool_version"
  } else {
    Add-Log $cross $tool "Could not setup $tool"
  }
}

# Function to handle request to add PECL.
Function Add-Pecl() {
  Add-Log $tick "PECL" "Use extensions input to setup PECL extensions on windows"
}

# Variables
$tick = ([char]8730)
$cross = ([char]10007)
$php_dir = 'C:\tools\php'
$ext_dir = "$php_dir\ext"
$bin_dir = $php_dir
$github = 'https://github.com'
$php_builder = "$github/shivammathur/php-builder-windows"
$composer_bin = "$env:APPDATA\Composer\vendor\bin"
$composer_json = "$env:APPDATA\Composer\composer.json"
$composer_lock = "$env:APPDATA\Composer\composer.lock"
$current_profile = "$env:TEMP\setup-php.ps1"
$ProgressPreference = 'SilentlyContinue'
$jit_versions = '8.[0-9]'
$nightly_versions = '8.[1-9]'
$cert_source='CurrentUser'
$enable_extensions = ('openssl', 'curl', 'mbstring')

$arch = 'x64'
if(-not([Environment]::Is64BitOperatingSystem) -or $version -lt '7.0') {
  $arch = 'x86'
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

. $dist\..\src\scripts\tools\add_tools.ps1

Add-Printf >$null 2>&1
Step-Log "Setup PhpManager"
Install-PSPackage PhpManager PhpManager\PhpManager "$github/mlocati/powershell-phpmanager/releases/latest/download/PhpManager.zip" Get-Php >$null 2>&1
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
    Install-PSPackage VcRedist VcRedist-main\VcRedist\VcRedist "$github/aaronparker/VcRedist/archive/main.zip" Get-VcList >$null 2>&1
  }
  try {
    if ($version -match $nightly_versions) {
      Invoke-WebRequest -UseBasicParsing -Uri $php_builder/releases/latest/download/Get-PhpNightly.ps1 -OutFile $php_dir\Get-PhpNightly.ps1 > $null 2>&1
      & $php_dir\Get-PhpNightly.ps1 -Architecture $arch -ThreadSafe $ts -Path $php_dir > $null 2>&1
    } else {
      Install-Php -Version $version -Architecture $arch -ThreadSafe $ts -InstallVC -Path $php_dir -TimeZone UTC -InitialPhpIni Production -Force > $null 2>&1
    }
  } catch { }
} else {
  if($version -match $jit_versions) {
    ('opcache.enable=1', 'opcache.jit_buffer_size=256M', 'opcache.jit=1235') | ForEach-Object { $p=$_.split('='); Set-PhpIniKey -Key $p[0] -Value $p[1] -Path $php_dir }
  }
  if($env:update -eq 'true') {
    Update-Php $php_dir >$null 2>&1
    $status = "Updated to"
  } else {
    $status = "Found"
  }
}

$installed = Get-Php -Path $php_dir
if($installed.MajorMinorVersion -ne $version) {
  Add-Log $cross "PHP" "Could not setup PHP $version"
  exit 1
}
('date.timezone=UTC', 'memory_limit=-1', 'xdebug.mode=coverage') | ForEach-Object { $p=$_.split('='); Set-PhpIniKey -Key $p[0] -Value $p[1] -Path $php_dir }
if($version -lt "5.5") {
  ('libeay32.dll', 'ssleay32.dll') | ForEach-Object { Invoke-WebRequest -Uri "$php_builder/releases/download/openssl-1.0.2u/$_" -OutFile $php_dir\$_ >$null 2>&1 }
} else {
  $enable_extensions += ('opcache')
}
Enable-PhpExtension -Extension $enable_extensions -Path $php_dir
Update-PhpCAInfo -Path $php_dir -Source $cert_source
Copy-Item -Path $dist\..\src\configs\*.json -Destination $env:RUNNER_TOOL_CACHE
New-Item -ItemType Directory -Path $composer_bin -Force 2>&1 | Out-Null
Add-Log $tick "PHP" "$status PHP $($installed.FullVersion)"
