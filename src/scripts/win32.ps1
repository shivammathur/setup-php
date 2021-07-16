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

Function Add-Printf {
  if (-not(Test-Path "C:\Program Files\Git\usr\bin\printf.exe")) {
    if(Test-Path "C:\msys64\usr\bin\printf.exe") {
      New-Item -Path $php_dir\printf.exe -ItemType SymbolicLink -Value C:\msys64\usr\bin\printf.exe
    } else {
      Invoke-WebRequest -UseBasicParsing -Uri "$github/shivammathur/printf/releases/latest/download/printf-x64.zip" -OutFile "$php_dir\printf.zip"
      Expand-Archive -Path $php_dir\printf.zip -DestinationPath $php_dir -Force
    }
  } else {
    New-Item -Path $php_dir\printf.exe -ItemType SymbolicLink -Value "C:\Program Files\Git\usr\bin\printf.exe"
  }
}

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
  $module_path = "$php_dir\$psm1_path.psm1"
  if(-not (Test-Path $module_path -PathType Leaf)) {
    $zip_file = "$php_dir\$package.zip"
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $zip_file
    Expand-Archive -Path $zip_file -DestinationPath $php_dir -Force
  }
  Import-Module $module_path
  Add-ToProfile $current_profile "$package-search" "Import-Module $module_path"

  if($null -eq (Get-Command $cmdlet -ErrorAction SilentlyContinue)) {
    Install-Module -Name $cmdlet -Force
  }
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

Function Add-Tool() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
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
  if($url.Count -gt 1) { $url = $url[0] }
  if ($tool -eq "symfony") {
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $php_dir\$tool.exe
    Add-ToProfile $current_profile $tool "New-Alias $tool $php_dir\$tool.exe" 
  } else {
    try {
      Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $php_dir\$tool
    } catch {
      if($url -match '.*github.com.*releases.*latest.*') {
        try {
          $url = $url.replace("releases/latest/download", "releases/download/" + ([regex]::match((Invoke-WebRequest -UseBasicParsing -Uri ($url.split('/release')[0] + "/releases")).Content, "([0-9]+\.[0-9]+\.[0-9]+)/" + ($url.Substring($url.LastIndexOf("/") + 1))).Groups[0].Value).split('/')[0])
          Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $php_dir\$tool
        } catch { }
      }
    }
  }
  if (((Get-ChildItem -Path $php_dir/* | Where-Object Name -Match "^$tool(.exe|.phar)*$").Count -gt 0)) {
    $bat_content = @()
    $bat_content += "@ECHO off"
    $bat_content += "setlocal DISABLEDELAYEDEXPANSION"
    $bat_content += "SET BIN_TARGET=%~dp0/" + $tool
    $bat_content += "php %BIN_TARGET% %*"
    Set-Content -Path $php_dir\$tool.bat -Value $bat_content
    Add-ToProfile $current_profile $tool "New-Alias $tool $php_dir\$tool.bat" 
    if($tool -eq "composer") {
      Edit-ComposerConfig $php_dir\$tool
    } elseif($tool -eq "cs2pr") {
      (Get-Content $php_dir/cs2pr).replace('exit(9)', 'exit(0)') | Set-Content $php_dir/cs2pr
    } elseif($tool -eq "phan") {
      Add-Extension fileinfo 
      Add-Extension ast 
    } elseif($tool -eq "phive") {
      Add-Extension xml 
    } elseif($tool -eq "wp-cli") {
      Copy-Item $php_dir\wp-cli.bat -Destination $php_dir\wp.bat
    }
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
  if(Test-Path $composer_lock) {
    Remove-Item -Path $composer_lock -Force
  }
  composer -q global require $prefix$release 2>&1 | out-null
  if($tool -eq "codeception") {
    Copy-Item $composer_bin\codecept.bat -Destination $composer_bin\codeception.bat
  }
  if($?) {
    Add-Log $tick $tool "Added"
  } else {
    Add-Log $cross $tool "Could not setup $tool"
  }
  if(Test-Path $composer_bin\composer) {
    Copy-Item -Path "$php_dir\composer" -Destination "$composer_bin\composer" -Force
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
$github = 'https://github.com'
$composer_bin = "$env:APPDATA\Composer\vendor\bin"
$composer_json = "$env:APPDATA\Composer\composer.json"
$composer_lock = "$env:APPDATA\Composer\composer.lock"
$master_version = '8.0'
$arch = 'x64'
if(-not([Environment]::Is64BitOperatingSystem) -or $version -lt '7.0') {
  $arch = 'x86'
}
$ts = $env:PHPTS -eq 'ts'
if($env:PHPTS -ne 'ts') {
  $env:PHPTS = 'nts'
}
if(-not(Test-Path -LiteralPath $current_profile)) {
  New-Item -Path $current_profile -ItemType "file" -Force 
}

Add-Printf 
Step-Log "Setup PhpManager"
Install-PSPackage PhpManager PhpManager\PhpManager "$github/mlocati/powershell-phpmanager/releases/latest/download/PhpManager.zip" Get-Php 
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
    Install-PSPackage VcRedist VcRedist-main\VcRedist\VcRedist "$github/aaronparker/VcRedist/archive/main.zip" Get-VcList 
  }
  try {
    if ($version -eq $master_version) {
      $version = 'master'
      Invoke-WebRequest -UseBasicParsing -Uri https://github.com/shivammathur/php-builder-windows/releases/latest/download/Get-Php.ps1 -OutFile $php_dir\Get-Php.ps1 > $null 2>&1
      & $php_dir\Get-Php.ps1 -Architecture $arch -ThreadSafe $ts -Path $php_dir
    } else {
      Install-Php -Version $version -Architecture $arch -ThreadSafe $ts -InstallVC -Path $php_dir -TimeZone UTC -InitialPhpIni Production -Force > $null 2>&1
    }
  } catch { }
} else {
  $status = "Found"
}

$installed = Get-Php -Path $php_dir
if($installed.MajorMinorVersion -ne $version) {
  Add-Log $cross "PHP" "Could not setup PHP $version"
  exit 1
}
('date.timezone=UTC', 'memory_limit=-1', 'xdebug.mode=coverage') | ForEach-Object { $p=$_.split('='); Set-PhpIniKey -Key $p[0] -Value $p[1] -Path $php_dir }
Enable-PhpExtension -Extension openssl, curl, opcache, mbstring -Path $php_dir
Update-PhpCAInfo -Path $php_dir -Source CurrentUser
Copy-Item -Path $dist\..\src\configs\*.json -Destination $env:RUNNER_TOOL_CACHE
New-Item -ItemType Directory -Path $composer_bin -Force 2>&1 | Out-Null
Add-Log $tick "PHP" "$status PHP $($installed.FullVersion)"
