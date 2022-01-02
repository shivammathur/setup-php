param (
  [Parameter(Position = 0, Mandatory = $true)]
  [ValidateNotNull()]
  [ValidateLength(1, [int]::MaxValue)]
  [string]
  $version = '8.1',
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
      New-Item -Path $bin_dir\printf.exe -ItemType SymbolicLink -Value C:\msys64\usr\bin\printf.exe -Force > $null 2>&1
    } else {
      Invoke-WebRequest -Uri "$github/shivammathur/printf/releases/latest/download/printf-x64.zip" -OutFile "$bin_dir\printf.zip"
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
    Invoke-WebRequest -Uri $url -OutFile $zip_file
    Expand-Archive -Path $zip_file -DestinationPath $bin_dir -Force
  }
  Import-Module $module_path
  Add-ToProfile $current_profile "$package-search" "Import-Module $module_path"

  if($null -eq (Get-Command $cmdlet -ErrorAction SilentlyContinue)) {
    Install-Module -Name $package -Force
  }
}

# Function to link dependencies to PHP directory.
Function Set-ExtensionPrerequisites
{
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $deps_dir
  )
  $deps = Get-ChildItem -Recurse -Path $deps_dir
  if ($deps.Count -ne 0) {
    # Symlink dependencies instead of adding the directory to PATH ...
    # as other actions change the PATH thus breaking extensions.
    $deps | ForEach-Object {
      New-Item -Itemtype SymbolicLink -Path $php_dir -Name $_.Name -Target $_.FullName -Force > $null 2>&1
    }
  } else {
    Remove-Item $deps_dir -Recurse -Force
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
    $deps_dir = "$ext_dir\$extension-vc$($installed.VCVersion)-$arch"
    New-Item $deps_dir -Type Directory -Force > $null 2>&1
    if ($null -ne $extension_info) {
      switch ($extension_info.State) {
        'Builtin' {
          Add-Log $tick $extension "Enabled"
        }
        'Enabled' {
          Add-Log $tick $extension "Enabled"
        }
        default {
          Enable-ExtensionDependencies $extension
          Enable-PhpExtension -Extension $extension_info.Handle -Path $php_dir
          Set-ExtensionPrerequisites $deps_dir
          Add-Log $tick $extension "Enabled"
        }
      }
    }
    else {
      # Patch till PHP 8.1 DLLs are released as stable.
      $minimumStability = 'stable'
      if($version -eq '8.1' -and $stability -eq 'stable') {
        $minimumStability = 'snapshot'
      }

      $params = @{ Extension = $extension; MinimumStability = $minimumStability; MaximumStability = $stability; Path = $php_dir; AdditionalFilesPath = $deps_dir; NoDependencies = $true }
      if($extension_version -ne '') {
        $params["Version"] = $extension_version
      }
      Install-PhpExtension @params
      Set-ExtensionPrerequisites $deps_dir
      Add-Log $tick $extension "Installed and enabled"
    }
  }
  catch {
    Add-Log $cross $extension "Could not install $extension on PHP $($installed.FullVersion)"
  }
}

# Function to get a map of extensions and their dependent shared extensions.
Function Get-ExtensionMap {
  php -d'error_reporting=0' $dist\..\src\scripts\ext\extension_map.php
}

# Function to enable extension dependencies which are also extensions.
Function Enable-ExtensionDependencies {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $extension
  )
  if (-not(Test-Path $env:TEMP\map.orig)) {
    Get-ExtensionMap | Set-Content -Path $env:TEMP\map.orig
  }
  $entry = findstr /r "$extension`:.*" $env:TEMP\map.orig
  if($entry) {
    $entry.split(':')[1].trim().split(' ') | ForEach-Object {
      if (-not(php -m | findstr -i $_)) {
        Enable-PhpExtension -Extension $_ -Path $php_dir
      }
    }
  }
}

# Function to disable dependent extensions.
Function Disable-DependentExtensions() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $extension
  )
  Get-ExtensionMap | Select-String -Pattern ".*:.*\s$extension(\s|$)" | ForEach-Object {
    $dependent = $_.Matches[0].Value.split(':')[0];
    Disable-ExtensionHelper -Extension $dependent -DisableDependents
    Add-Log $tick ":$extension" "Disabled $dependent as it depends on $extension"
  }
}

# Helper function to disable an extension.
Function Disable-ExtensionHelper() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $extension,
    [switch] $DisableDependents
  )
  if($DisableDependents) {
    Disable-DependentExtensions $extension
  }
  Disable-PhpExtension -Extension $extension -Path $php_dir
}

# Function to disable an extension.
Function Disable-Extension() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $extension,
    [Parameter(Position = 1, Mandatory = $false)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $DisableDependents
  )
  if(php -m | findstr -i $extension) {
    if(Test-Path $ext_dir\php_$extension.dll) {
      try {
        $params = @{ Extension = $extension; DisableDependents = ($DisableDependents -ne 'false') }
        Disable-ExtensionHelper @params
        Add-Log $tick ":$extension" "Disabled"
      } catch {
        Add-Log $cross ":$extension" "Could not disable $extension on PHP $($installed.FullVersion)"
      }
    } else {
      Add-Log $cross ":$extension" "Could not disable $extension on PHP $($installed.FullVersion) as it not a shared extension"
    }
  } elseif(Test-Path $ext_dir\php_$extension.dll) {
    Add-Log $tick ":$extension" "Disabled"
  } else {
    Add-Log $tick ":$extension" "Could not find $extension on PHP $($installed.FullVersion)"
  }
}

# Function to disable shared extensions.
Function Disable-AllShared() {
  (Get-Content $php_dir\php.ini) | Where-Object {$_ -notmatch '^(zend_)?extension\s*='} | Set-Content $php_dir\php.ini
  Add-Log $tick "none" "Disabled all shared extensions"
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
$current_profile = "$env:TEMP\setup-php.ps1"
$ProgressPreference = 'SilentlyContinue'
$jit_versions = '8.[0-9]'
$nightly_versions = '8.[2-9]'
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
  Get-CleanPSProfile >$null 2>&1
  New-Item $bin_dir -Type Directory -Force > $null 2>&1
  Add-Path -PathItem $bin_dir
  if($version -lt 5.6) {
    Add-Log $cross "PHP" "PHP $version is not supported on self-hosted runner"
    Start-Sleep 1
    exit 1
  }
  if ((Get-InstalledModule).Name -notcontains 'VcRedist') {
    Install-Module -Name VcRedist -Force
  }
  New-Item $php_dir -Type Directory -Force > $null 2>&1
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
if ($null -eq $installed -or -not("$($installed.Version).".StartsWith(($version -replace '^(\d+(\.\d+)*).*', '$1.'))) -or $ts -ne $installed.ThreadSafe) {
  if ($version -lt '7.0' -and (Get-InstalledModule).Name -notcontains 'VcRedist') {
    Install-PSPackage VcRedist VcRedist-main\VcRedist\VcRedist "$github/aaronparker/VcRedist/archive/main.zip" Get-VcList >$null 2>&1
  }
  try {
    if ($version -match $nightly_versions) {
      Invoke-WebRequest -UseBasicParsing -Uri $php_builder/releases/latest/download/Get-PhpNightly.ps1 -OutFile $php_dir\Get-PhpNightly.ps1 > $null 2>&1
      & $php_dir\Get-PhpNightly.ps1 -Architecture $arch -ThreadSafe $ts -Path $php_dir -Version $version > $null 2>&1
      if(Test-Path $php_dir\COMMIT) {
        $extra_version = " ($( Get-Content $php_dir\COMMIT ))"
      }
    } else {
      Install-Php -Version $version -Architecture $arch -ThreadSafe $ts -InstallVC -Path $php_dir -TimeZone UTC -InitialPhpIni Production -Force > $null 2>&1
    }
  } catch { }
} else {
  Set-PhpIniKey -Key 'extension_dir' -Value $ext_dir -Path $php_dir
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
Add-PhpCAInfo
Copy-Item -Path $dist\..\src\configs\pm\*.json -Destination $env:RUNNER_TOOL_CACHE
Write-Output "::set-output name=php-version::$($installed.FullVersion)"
Add-Log $tick "PHP" "$status PHP $($installed.FullVersion)$extra_version"
