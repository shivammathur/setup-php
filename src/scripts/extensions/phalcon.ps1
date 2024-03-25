# Function to get the url of the phalcon release asset.
Function Get-PhalconReleaseAssetUrl() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [string]
    $Semver
  )
  $domain = 'https://api.github.com/repos'
  $releases = 'phalcon/cphalcon/releases'
  $match = $null
  if($extension_version -match '[3-4]') {
    $nts = if (!$installed.ThreadSafe) { "_nts" } else { "" }
    try {
      $match = (Invoke-RestMethod -Uri "$domain/$releases/tags/v$Semver").assets | Select-String -Pattern "browser_download_url=.*(phalcon_${arch}_.*_php${version}_${extension_version}.*[0-9]${nts}.zip)"
    } catch { }
    if($null -eq $match) {
      try {
        $match = (Get-File -Url "$github/$releases/expanded_assets/v$Semver").Links.href | Select-String -Pattern "(phalcon_${arch}_.*_php${version}_${extension_version}.*[0-9]${nts}.zip)"
      } catch { }
    }
  } else {
    $nts = if (!$installed.ThreadSafe) { "-nts" } else { "-ts" }
    try {
      $match = (Invoke-RestMethod -Uri "$domain/$releases/tags/v$Semver").assets | Select-String -Pattern "browser_download_url=.*(php_phalcon-php${version}${nts}-windows.*-x64.zip)"
    } catch { }
    if($null -eq $match) {
      try {
        $match = (Get-File -Url "$github/$releases/expanded_assets/v$Semver").Links.href | Select-String -Pattern "(php_phalcon-php${version}${nts}-windows.*-x64.zip)"
      } catch { }
    }
    if($null -eq $match) {
      try {
        $match = (Invoke-RestMethod -Uri "$domain/$releases/tags/v$Semver").assets | Select-String -Pattern "browser_download_url=.*(phalcon-php${version}${nts}-windows.*-x64.zip)"
      } catch { }
    }
    if($null -eq $match) {
      try {
        $match = (Get-File -Url "$github/$releases/expanded_assets/v$Semver").Links.href | Select-String -Pattern "(phalcon-php${version}${nts}-windows.*-x64.zip)"
      } catch { }
    }
  }
  if($NULL -ne $match) {
    return "$github/$releases/download/v$Semver/$($match.Matches[0].Groups[1].Value)"
  }
  return false;
}

# Function to add phalcon using GitHub releases.
Function Add-PhalconFromGitHub() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [string]
    $Semver
  )
  $zip_url = Get-PhalconReleaseAssetUrl $Semver
  if($zip_url) {
    Get-File -Url $zip_url -OutFile $ENV:RUNNER_TOOL_CACHE\phalcon.zip > $null 2>&1
    Expand-Archive -Path $ENV:RUNNER_TOOL_CACHE\phalcon.zip -DestinationPath $ENV:RUNNER_TOOL_CACHE\phalcon -Force > $null 2>&1
    Copy-Item -Path "$ENV:RUNNER_TOOL_CACHE\phalcon\php_phalcon.dll" -Destination "$ext_dir\php_phalcon.dll"
    Enable-PhpExtension -Extension phalcon -Path $php_dir
  } else {
    throw "Unable to get Phalcon release from the GitHub release"
  }
}

# Function to get phalcon semver.
Function Get-PhalconSemver() {
  if($extension_version -eq '3') {
    return '3.4.5'
  } elseif (($extension_version -eq '4') -and ($version -eq '7.2')) {
    return '4.1.0'
  } elseif (($extension_version -eq '5') -and ($version -eq '7.4')) {
    return '5.4.0'
  }
  return Get-PeclPackageVersion phalcon $extension_version stable stable | Select-Object -First 1
}

# Function to install phalcon
Function Add-PhalconHelper() {
  $semver = Get-PhalconSemver
  if (($extension_version -eq '3') -or ($extension_version -eq '5')) {
    Add-PhalconFromGitHub $semver
  } elseif ($extension_version -eq '4') {
    Add-Extension -Extension phalcon -Stability stable -Extension_version $semver
  }
}

# Function to add phalcon
Function Add-Phalcon() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateSet('phalcon3', 'phalcon4', 'phalcon5')]
    [string]
    $extension
  )
  try {
    $status = 'Enabled'
    $extension_version = $extension.substring($extension.Length - 1)

    if($extension_version -eq '4') {
      if (Test-Path $ext_dir\php_psr.dll) {
        Enable-PhpExtension -Extension psr -Path $php_dir
      } else {
        Install-Phpextension -Extension psr -MinimumStability stable -Path $php_dir
      }
    }

    if(Test-Path $ext_dir\php_phalcon.dll) {
      $phalcon = Get-PhpExtension $ext_dir\php_phalcon.dll
      if($phalcon.Version[0] -eq $extension_version) {
        Enable-PhpExtension -Extension phalcon -Path $php_dir
      } else {
        $status = 'Installed and enabled'
        Remove-Item $ext_dir\php_phalcon.dll
        Add-PhalconHelper
      }
    } else {
      $status = 'Installed and enabled'
      Add-PhalconHelper
    }
    Add-Log $tick $extension $status
  } catch [Exception] {
    Add-Log $cross $extension "Could not install $extension on PHP $($installed.FullVersion)"
  }
}
