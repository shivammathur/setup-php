# Function to get sqlsrv extension version.
Function Get-SqlsrvReleaseVersion() {
  if ($version -le '7.2') {
    # Use the releases from PECL for these versions
    return null;
  } elseif($version -eq '7.3') {
    return '5.9.0'
  } elseif ($version -eq '7.4') {
    return '5.10.1'
  } elseif ($version -eq '8.0') {
    return '5.11.1'
  } else {
    return 'latest'
  }
}

# Function to get sqlsrv extension release URL.
Function Get-SqlsrvReleaseUrl()
{
  $extensionVersion = Get-SqlsrvReleaseVersion
  if($extensionVersion) {
    $repo = "$github/microsoft/msphpsql"
    if($extensionVersion -eq 'latest') {
      return "$repo/releases/latest/download/Windows-$version.zip"
    } else {
      return "$repo/releases/download/v$extensionVersion/Windows-$version.zip"
    }
  }
}

# Function to add sqlsrv extension from GitHub.
Function Add-SqlsrvFromMSGithub()
{
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [string]
    $extension
  )
  try {
    $zipUrl = SqlsrvReleaseUrl
    if($zipUrl) {
      $nts = if (!$installed.ThreadSafe) { "nts" } else { "ts" }
      $noDotVersion = $version.replace('.', '')
      $extensionFilePath = "Windows-$version\$arch\php_${extension}_${noDotVersion}_${nts}.dll"
      Get-File -Url $zipUrl -OutFile $ENV:RUNNER_TOOL_CACHE\sqlsrv.zip > $null 2>&1
      Expand-Archive -Path $ENV:RUNNER_TOOL_CACHE\sqlsrv.zip -DestinationPath $ENV:RUNNER_TOOL_CACHE\sqlsrv -Force > $null 2>&1
      Copy-Item -Path "$ENV:RUNNER_TOOL_CACHE\sqlsrv\$extensionFilePath" -Destination "$ext_dir\php_$extension.dll"
      Enable-PhpExtension -Extension $extension -Path $php_dir
    }
  } catch { }
}

# Function to add sqlsrv extension.
Function Add-Sqlsrv() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [string]
    $extension
  )
  $status = 'Enabled'
  if (Test-Path $ext_dir\php_$extension.dll) {
    Enable-PhpExtension -Extension $extension -Path $php_dir
  } else {
    try {
      Add-ExtensionFromGithub $extension > $null 2>&1
    } catch {}
    if (-not(Test-Extension $extension)) {
      Add-SqlsrvFromMSGithub $extension >$null 2>&1
    }
    if (-not(Test-Extension $extension)) {
      Add-Extension $extension >$null 2>&1
    }
    $status = 'Installed and enabled'
  }
  Add-ExtensionLog $extension $status
}
