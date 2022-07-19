# Function to add phalcon using GitHub releases.
Function Add-PhalconFromGitHub() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [string]
    $Semver
  )
  $domain = 'https://github.com'
  $nts = if (!$installed.ThreadSafe) { "_nts" } else { "" }
  $match = Invoke-WebRequest -Uri "$domain/phalcon/cphalcon/releases/v$Semver" | Select-String -Pattern "href=`"(.*phalcon_x64_.*_php${version}_${extension_version}.*[0-9]${nts}.zip)`""
  if($NULL -eq $match) {
    $nts = if (!$installed.ThreadSafe) { "-nts" } else { "-ts" }
    $match = Invoke-WebRequest -Uri "$domain/phalcon/cphalcon/releases/v$Semver" | Select-String -Pattern "href=`"(.*phalcon-php${version}${nts}-windows.*-x64.zip)`""
  }
  if($NULL -ne $match) {
    $zip_file = $match.Matches[0].Groups[1].Value
    Invoke-WebRequest -Uri $domain/$zip_file -OutFile $ENV:RUNNER_TOOL_CACHE\phalcon.zip > $null 2>&1
    Expand-Archive -Path $ENV:RUNNER_TOOL_CACHE\phalcon.zip -DestinationPath $ENV:RUNNER_TOOL_CACHE\phalcon -Force > $null 2>&1
    Copy-Item -Path "$ENV:RUNNER_TOOL_CACHE\phalcon\php_phalcon.dll" -Destination "$ext_dir\php_phalcon.dll"
    Enable-PhpExtension -Extension phalcon -Path $php_dir
  } else {
    throw "Unable to get Phalcon release from the GitHub release"
  }
}
# Function to install phalcon
Function Add-PhalconHelper() {
  if ($extension_version -eq '5') {
    Add-PhalconFromGitHub -Semver (Get-PeclPackageVersion phalcon 5 snapshot stable | Select-Object -First 1)
  } elseif ($extension_version -eq '4') {
    Install-Phpextension -Extension phalcon -MinimumStability stable -Path $php_dir
  } elseif ($extension_version -eq '3') {
    Add-PhalconFromGitHub -Semver 3.4.5
  }
}

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
