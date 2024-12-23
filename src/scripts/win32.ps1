param (
  [Parameter(Position = 0, Mandatory = $true)]
  [ValidateNotNull()]
  [ValidateLength(1, [int]::MaxValue)]
  [string]
  $version = '8.4',
  [Parameter(Position = 1, Mandatory = $true)]
  [ValidateNotNull()]
  [ValidateLength(1, [int]::MaxValue)]
  [string]
  $ini = 'production'
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
      Write-Error $message -ErrorAction Stop
    }
  }
}

# Function to set output on GitHub Actions.
Function Set-Output() {
  param(
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $output,
    [Parameter(Position = 1, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $value
  )
  if ($env:GITHUB_ACTIONS -eq 'true') {
    Add-Content "$output=$value" -Path $env:GITHUB_OUTPUT -Encoding utf8
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
  if("$env:PATH;".contains("$PathItem;")) {
    return
  }
  if ($env:GITHUB_PATH) {
    Add-Content $PathItem -Path $env:GITHUB_PATH -Encoding utf8
    $env:PATH += "$PathItem;"
  } else {
    $newPath = (Get-ItemProperty -Path 'hkcu:\Environment' -Name PATH).Path.replace("$PathItem;", '')
    $newPath = $PathItem + ';' + $newPath
    Set-ItemProperty -Path 'hkcu:\Environment' -Name Path -Value $newPath
    Get-PathFromRegistry
  }
}

# Function to add an environment variable.
Function Add-Env {
  param(
    [string]$EnvName,
    [string]$EnvValue
  )
  if ($env:GITHUB_ENV) {
    Add-Content "$EnvName=$EnvValue" -Path $env:GITHUB_ENV -Encoding utf8
  } else {
    Set-ItemProperty -Path 'hkcu:\Environment' -Name $EnvName -Value $EnvValue
    Add-ToProfile $current_profile $EnvName "`$env:$EnvName=`"$EnvValue`""
  }
}

# Function to add environment variables using a PATH.
Function Add-EnvPATH {
  param(
    [string]$EnvPATH
  )
  if(-not(Test-Path $EnvPATH)) {
    return
  }
  $env_file = $env:GITHUB_ENV
  $env_data = Get-Content -Path $EnvPATH
  if (-not($env:GITHUB_ENV)) {
    $env_file = $current_profile
    $env_data = $env_data | ForEach-Object { '$env:' + $_ }
  }
  $env_data | Add-Content -Path $env_file -Encoding utf8
}

# Function to fetch a file from a URL.
Function Get-File {
  param (
    [string]$Url,
    [string]$FallbackUrl,
    [string]$OutFile = '',
    [int]$Retries = 3,
    [int]$TimeoutSec = 0
  )

  for ($i = 0; $i -lt $Retries; $i++) {
    try {
      if($OutFile -ne '') {
        Invoke-WebRequest -Uri $Url -OutFile $OutFile -TimeoutSec $TimeoutSec
      } else {
        Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSec
      }
      break;
    } catch {
      if ($i -eq ($Retries - 1)) {
        if($FallbackUrl) {
          try {
            if($OutFile -ne '') {
              Invoke-WebRequest -Uri $FallbackUrl -OutFile $OutFile -TimeoutSec $TimeoutSec
            } else {
              Invoke-WebRequest -Uri $FallbackUrl -TimeoutSec $TimeoutSec
            }
          } catch {
            throw "Failed to download the assets from $Url and $FallbackUrl"
          }
        } else {
          throw "Failed to download the assets from $Url"
        }
      }
    }
  }
}

# Function to make sure printf is in PATH.
Function Add-Printf {
  if (-not(Test-Path "C:\Program Files\Git\usr\bin\printf.exe")) {
    if(Test-Path "C:\msys64\usr\bin\printf.exe") {
      New-Item -Path $bin_dir\printf.exe -ItemType SymbolicLink -Value C:\msys64\usr\bin\printf.exe -Force > $null 2>&1
    } else {
      Get-File -Url "$github/shivammathur/printf/releases/latest/download/printf-x64.zip" -OutFile "$bin_dir\printf.zip"
      Expand-Archive -Path $bin_dir\printf.zip -DestinationPath $bin_dir -Force
    }
  } else {
    New-Item -Path $bin_dir\printf.exe -ItemType SymbolicLink -Value "C:\Program Files\Git\usr\bin\printf.exe" -Force > $null 2>&1
  }
}

# Function to get a clean Powershell profile.
Function Get-CleanPSProfile {
  if(-not(Test-Path -LiteralPath $profile)) {
    New-Item -Path $profile -ItemType "file" -Force > $null 2>&1
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
    Get-File -Url $url -OutFile $zip_file
    Expand-Archive -Path $zip_file -DestinationPath $bin_dir -Force
  }
  Import-Module $module_path
  if($null -eq (Get-Command $cmdlet -ErrorAction SilentlyContinue)) {
    Install-Module -Name $package -Force
  } else {
    Add-ToProfile $current_profile "$package-search" "Import-Module $module_path"
  }
}

# Function to add CA certificates to PHP.
Function Add-PhpCAInfo {
  try {
    Update-PhpCAInfo -Path $php_dir -Source Curl
  } catch {
    Add-Log $cross PHP "Could not fetch CA certificate bundle from Curl"
    Update-PhpCAInfo -Path $php_dir -Source CurrentUser
  }
}

# Function to set OpenSSL config.
Function Add-OpenSSLConf {
  try {
    Set-OpenSSLConf -Target User
  } catch {
    New-Item $php_dir\extras\openssl.cnf -Type File -Force > $null 2>&1
    Set-OpenSSLConf -Path $php_dir\extras\openssl.cnf -Target User
  }
  Add-Env -EnvName OPENSSL_CONF -EnvValue $env:OPENSSL_CONF
}

# Function to set PHP config.
Function Add-PhpConfig {
  $current = Get-Content -Path $php_dir\php.ini-current -ErrorAction SilentlyContinue
  if($ini -eq 'development' -or ($ini -eq 'production' -and $current -and $current -ne 'production')) {
    Copy-Item -Path $php_dir\php.ini-$ini -Destination $php_dir\php.ini -Force
  } elseif ($ini -eq 'none') {
    Set-Content -Path $php_dir\php.ini -Value ''
  }
  Set-Content -Path $php_dir\php.ini-current -Value $ini
  $ini_config_dir = "$src\configs\ini"
  $ini_files = @("$ini_config_dir\php.ini")
  $version -match $jit_versions -and ($ini_files += ("$ini_config_dir\jit.ini")) > $null 2>&1
  $version -match $xdebug3_versions -and ($ini_files += ("$ini_config_dir\xdebug.ini")) > $null 2>&1
  Add-Content -Path $ini_config_dir\php.ini -Value extension_dir=$ext_dir
  Get-Content -Path $ini_files | Add-Content -Path $php_dir\php.ini
}

# Function to get PHP from GitHub releases cache
Function Set-PhpCache {
  try {
    try {
      $release = Invoke-RestMethod https://api.github.com/repos/shivammathur/php-builder-windows/releases/tags/php$version
      $asset = $release.assets | ForEach-Object {
        if($_.name -match "php-$version.[0-9]+$env:PHPTS-Win32-.*-$arch.zip") {
          return $_.name
        }
      } | Select-Object -Last 1
      if($null -eq $asset) {
        throw "Asset not found"
      }
    } catch {
      $release = Get-File -Url $php_builder/releases/expanded_assets/php$version
      $asset = $release.links.href | ForEach-Object {
        if($_ -match "php-$version.[0-9]+$env:PHPTS-Win32-.*-$arch.zip") {
          return $_.split('/')[-1]
        }
      } | Select-Object -Last 1
    }
    Get-File -Url $php_builder/releases/download/php$version/$asset -OutFile $php_dir\$asset
    Set-PhpDownloadCache -Path $php_dir CurrentUser
  } catch { }
}

# Function to add debug symbols to PHP.
Function Add-DebugSymbols {
  $dev = if ($version -match $nightly_versions) { '-dev' } else { '' }
  try {
    $release = Invoke-RestMethod https://api.github.com/repos/shivammathur/php-builder-windows/releases/tags/php$version
    $asset = $release.assets | ForEach-Object {
      if($_.name -match "php-debug-pack-$version.[0-9]+$dev$env:PHPTS-Win32-.*-$arch.zip") {
        return $_.name
      }
    } | Select-Object -Last 1
  } catch {
    $release = Get-File -Url $php_builder/releases/expanded_assets/php$version
    $asset = $release.links.href | ForEach-Object {
      if($_ -match "php-debug-pack-$version.[0-9]+$dev$env:PHPTS-Win32-.*-$arch.zip") {
        return $_.split('/')[-1]
      }
    } | Select-Object -Last 1
  }
  Get-File -Url $php_builder/releases/download/php$version/$asset -OutFile $php_dir\$asset
  Expand-Archive -Path $php_dir\$asset -DestinationPath $php_dir -Force
  Get-ChildItem -Path $php_dir -Filter php_*.pdb | Move-Item -Destination $ext_dir
}

# Function to install nightly version of PHP
Function Install-PhpNightly {
  Get-File -Url $php_builder/releases/latest/download/Get-PhpNightly.ps1 -FallbackUrl https://dl.cloudsmith.io/public/shivammathur/php-builder-windows/raw/files/Get-PhpNightly.ps1 -OutFile $php_dir\Get-PhpNightly.ps1 > $null 2>&1
  & $php_dir\Get-PhpNightly.ps1 -Architecture $arch -ThreadSafe $ts -Path $php_dir -Version $version > $null 2>&1
  if(Test-Path $php_dir\COMMIT) {
    return " ($( Get-Content $php_dir\COMMIT ))"
  }
  return;
}

# Variables
$tick = ([char]8730)
$cross = ([char]10007)
$php_dir = 'C:\tools\php'
$ext_dir = "$php_dir\ext"
$bin_dir = $php_dir
$github = 'https://github.com'
$php_builder = "$github/shivammathur/php-builder-windows"
$current_profile = "$env:TEMP\setup-php.ps1"
$ProgressPreference = 'SilentlyContinue'
$jit_versions = '8.[0-9]'
$nightly_versions = '8.[2-9]'
$xdebug3_versions = "7.[2-4]|8.[0-9]"
$enable_extensions = ('openssl', 'curl', 'mbstring')

$arch = 'x64'
if(-not([Environment]::Is64BitOperatingSystem) -or $version -lt '7.0') {
  $arch = 'x86'
}

$ts = ($env:PHPTS -match '^z?ts$')
if(-not($ts)) {
  $env:PHPTS = '-nts'
} else {
  $env:PHPTS = ''
}

if ( $env:GITHUB_ACTIONS -eq 'true') {
  $env:GROUP = '::group::'
  $env:END_GROUP = '::endgroup::'
} else {
  $env:GROUP = ''
  $env:END_GROUP = ''
}

if(-not($env:ImageOS) -and -not($env:ImageVersion)) {
  if($env:RUNNER -eq 'github') {
    Add-Log $cross "Runner" "Runner set as github in self-hosted environment"
    Write-Error "Runner set as github in self-hosted environment" -ErrorAction Stop
  }
  $bin_dir = 'C:\tools\bin'
  $php_dir = "$php_dir$version"
  $ext_dir = "$php_dir\ext"
  Get-CleanPSProfile >$null 2>&1
  New-Item $bin_dir -Type Directory -Force > $null 2>&1
  Add-Path -PathItem $bin_dir
  if($version -lt 5.6) {
    Add-Log $cross "PHP" "PHP $version is not supported on self-hosted runner"
    Start-Sleep 1
    Write-Error "PHP $version is not supported on self-hosted runner" -ErrorAction Stop
  }
  if ($null -eq (Get-Module -ListAvailable -Name VcRedist)) {
    Install-Module -Name VcRedist -Force
  }
  New-Item $php_dir -Type Directory -Force > $null 2>&1
  Add-Path -PathItem $php_dir
  setx PHPROOT $php_dir >$null 2>&1
  Add-Env -EnvName RUNNER_TOOL_CACHE -EnvValue $env:TEMP
} else {
  $current_profile = "$PSHOME\Profile.ps1"
  if(-not(Test-Path -LiteralPath $current_profile)) {
    New-Item -Path $current_profile -ItemType "file" -Force >$null 2>&1
  }
}

$src = Join-Path -Path $PSScriptRoot -ChildPath \..
. $src\scripts\tools\add_tools.ps1
. $src\scripts\extensions\add_extensions.ps1

Add-Printf >$null 2>&1
Step-Log "Setup PhpManager"
Install-PSPackage PhpManager PhpManager\PhpManager "$github/mlocati/powershell-phpmanager/releases/latest/download/PhpManager.zip" Get-Php >$null 2>&1
Add-Log $tick "PhpManager" "Installed"

Step-Log "Setup PHP"
$installed = $null
if (Test-Path -LiteralPath $php_dir -PathType Container) {
  try {
    if(Test-Path $php_dir\php.ini) {
      Rename-Item -Path $php_dir\php.ini -NewName 'php.ini.bak'
    }
    $installed = Get-Php -Path $php_dir -ErrorAction SilentlyContinue 2>$null 3>$null
    if(Test-Path $php_dir\php.ini.bak) {
      Rename-Item -Path $php_dir\php.ini.bak -NewName 'php.ini'
    }
  } catch { }
}
$status = "Installed"
$extra_version = ""
if($version -eq 'pre') {
  if($null -ne $installed) {
    $version = $installed.MajorMinorVersion
    $env:update = 'false'
  } else {
    Add-Log $cross "PHP" "No pre-installed PHP version found"
    Write-Error "No pre-installed PHP version found" -ErrorAction Stop
  }
}
if ($null -eq $installed -or -not("$($installed.Version).".StartsWith(($version -replace '^(\d+(\.\d+)*).*', '$1.'))) -or $ts -ne $installed.ThreadSafe) {
  if ($version -lt '7.0' -and ($null -eq (Get-Module -ListAvailable -Name VcRedist))) {
    Install-PSPackage VcRedist VcRedist-main\VcRedist\VcRedist "$github/aaronparker/VcRedist/archive/main.zip" Get-VcList >$null 2>&1
  }
  try {
    if ($version -match $nightly_versions) {
      $extra_version = Install-PhpNightly
    } else {
      Set-PhpCache
      Install-Php -Version $version -Architecture $arch -ThreadSafe $ts -InstallVC -Path $php_dir -TimeZone UTC -InitialPhpIni production -Force > $null 2>&1
    }
    Add-PhpConfig
  } catch { }
} else {
  if($env:update -eq 'true') {
    Update-Php $php_dir >$null 2>&1
    $status = "Updated to"
  } else {
    $status = "Found"
  }
  Add-PhpConfig
}

if($env:DEBUG -eq 'true') {
  Add-DebugSymbols
}

$installed = Get-Php -Path $php_dir
if($installed.MajorMinorVersion -ne $version) {
  Add-Log $cross "PHP" "Could not setup PHP $version"
  Write-Error "Could not setup PHP $version" -ErrorAction Stop
}
if($version -lt "5.5") {
  ('libeay32.dll', 'ssleay32.dll') | ForEach-Object -Parallel { Invoke-WebRequest -Uri "$using:php_builder/releases/download/openssl-1.0.2u/$_" -OutFile $using:php_dir\$_ >$null 2>&1 }
} else {
  $enable_extensions += ('opcache')
}
Enable-PhpExtension -Extension $enable_extensions -Path $php_dir
Add-PhpCAInfo
Add-OpenSSLConf
Copy-Item -Path $src\configs\pm\*.json -Destination $env:RUNNER_TOOL_CACHE
Set-Output php-version $($installed.FullVersion)
Add-Log $tick "PHP" "$status PHP $($installed.FullVersion)$extra_version"
