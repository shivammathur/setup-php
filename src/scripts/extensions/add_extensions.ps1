# Function to check if extension is enabled.
Function Test-Extension() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [string]
    $extension
  )
  $extension_info = Get-PhpExtension -Path $php_dir | Where-Object { $_.Name -eq $extension -or $_.Handle -eq $extension }
  return $null -ne $extension_info
}

# Function to add extension log.
Function Add-ExtensionLog() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    $extension,
    [Parameter(Position = 1, Mandatory = $true)]
    [ValidateNotNull()]
    $message
  )
  if (Test-Extension $extension) {
    Add-Log $tick $extension $message
  } else {
    Add-Log $cross $extension "Could not install $extension on PHP $( $installed.FullVersion )"
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
    $extension
  )
  $deps_dir = "$ext_dir\$extension-vc$($installed.VCVersion)-$arch"
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

# Function to enable extension.
Function Enable-Extension() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $extension
  )
  Enable-ExtensionDependencies $extension
  Enable-PhpExtension -Extension $extension -Path $php_dir
  Set-ExtensionPrerequisites $extension
  Add-Log $tick $extension "Enabled"
}

# Function to add custom built PHP extension for nightly builds.
Function Add-ExtensionFromGithub {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $extension
  )
  if($ts) { $ts_part = 'ts' } else { $ts_part = 'nts' }
  $repo = "$github/shivammathur/php-extensions-windows"
  $url = "$repo/releases/download/builds/php$version`_$ts_part`_$arch`_$extension.dll"
  Get-File -Url $url  -OutFile "$ext_dir\php_$extension.dll"
  if(Test-Path "$ext_dir\php_$extension.dll") {
    Enable-Extension $extension > $null
  } else {
    throw "Failed to download the $extension"
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
    [ValidatePattern('^\d+(\.\d+){0,3}$')]
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
          Enable-Extension $extension_info.Handle
        }
      }
    }
    else {
      if(($version -match $nightly_versions) -and (Select-String -Path $src\configs\windows_extensions -Pattern $extension -SimpleMatch -Quiet)) {
        Add-ExtensionFromGithub $extension
      } else {
        # Patch till DLLs for PHP 8.1 and above are released as stable.
        $minimumStability = $stability
        if ($version -match '8.[1-4]' -and $stability -eq 'stable') {
          $minimumStability = 'snapshot'
        }

        $params = @{ Extension = $extension; MinimumStability = $minimumStability; MaximumStability = $stability; Path = $php_dir; AdditionalFilesPath = $deps_dir; NoDependencies = $true }
        if ($extension_version -ne '')
        {
          $params["Version"] = $extension_version
        }
        # If extension for a different version exists
        if(Test-Path $ext_dir\php_$extension.dll) {
          Move-Item $ext_dir\php_$extension.dll $ext_dir\php_$extension.bak.dll -Force
        }
        Install-PhpExtension @params
        Set-ExtensionPrerequisites $extension
      }
      Add-Log $tick $extension "Installed and enabled"
    }
  } catch {
    Add-Log $cross $extension "Could not install $extension on PHP $( $installed.FullVersion )"
  }
}

# Function to get a map of extensions and their dependent shared extensions.
Function Get-ExtensionMap {
  php -d'error_reporting=0' $src\scripts\extensions\extension_map.php $env:TEMP\map$version.orig
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
  if (-not(Test-Path $env:TEMP\extdisabled\$extension)) {
    return
  }
  Get-ExtensionMap
  $entry = findstr /r "$extension`:.*" $env:TEMP\map$version.orig
  if($entry) {
    $entry.split(':')[1].trim().split(' ') | ForEach-Object {
      if (-not(php -m | findstr -i $_)) {
        Enable-PhpExtension -Extension $_ -Path $php_dir
      }
    }
  }
  Remove-Item $env:TEMP\extdisabled\$extension -Force
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
  Select-String -Pattern ".*:.*\s$extension(\s|$)" $env:TEMP\map$version.orig | ForEach-Object {
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
  Get-ExtensionMap
  if($DisableDependents) {
    Disable-DependentExtensions $extension
  }
  Disable-PhpExtension -Extension $extension -Path $php_dir
  New-Item $env:TEMP\extdisabled -Type Directory -Force > $null 2>&1
  New-Item $env:TEMP\extdisabled\$extension -Type File -Force > $null 2>&1
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
  Get-ExtensionMap
  (Get-Content $php_dir\php.ini) | Where-Object {$_ -notmatch '^(zend_)?extension\s*='} | Set-Content $php_dir\php.ini
  New-Item $env:TEMP\extdisabled\$version -Type Directory -Force > $null 2>&1
  Get-Childitem $ext_dir\*.dll | ForEach-Object {
    New-Item ("$env:TEMP\extdisabled\$version\" + ($_.Name.split('.')[0].split('_')[1])) -Type File -Force > $null 2>&1
  }
  Add-Log $tick "none" "Disabled all shared extensions"
}

# Function to handle request to add PECL.
Function Add-Pecl() {
  Add-Log $tick "PECL" "Use extensions input to setup PECL extensions on windows"
}
