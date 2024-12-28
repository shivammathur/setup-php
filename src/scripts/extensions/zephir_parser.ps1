# Function to get the url of the phalcon release asset.
Function Get-ZephirParserReleaseAssetUrl() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [string]
    $extension_version
  )
  $repo = 'zephir-lang/php-zephir-parser'
  $zp_releases = "$github/$repo/releases"
  $nts = if (!$installed.ThreadSafe) { "nts" } else { "ts" }
  try {
    $match = (Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/tags/$extension_version").assets | Select-String -Pattern "browser_download_url=.*(zephir_parser-php-${version}-$nts-windows.*.zip)"
  } catch {
    $match = (Get-File -Url "$zp_releases/expanded_assets/$extension_version").Links.href | Select-String -Pattern "(zephir_parser-php-${version}-$nts-windows.*.zip)"
  }
  if($NULL -ne $match) {
    return "$zp_releases/download/$extension_version/$($match.Matches[0].Groups[1].Value)"
  }
  return false;
}

# Function to get zephir parser version using GitHub releases.
Function Get-ZephirParserVersion() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [string]
    $extension
  )
  $repo = 'zephir-lang/php-zephir-parser'
  $zp_releases = "$github/$repo/releases"
  if($extension -eq 'zephir_parser') {
    return (Get-File -Url $zp_releases/latest).BaseResponse.RequestMessage.RequestUri.Segments[-1]
  } else {
    return 'v' + ($extension.split('-')[1] -replace 'v')
  }
}

# Function to add zephir parser using GitHub releases.
Function Add-ZephirParserFromGitHub() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [string]
    $extension
  )
  $extension_version = Get-ZephirParserVersion $extension
  $zip_url = Get-ZephirParserReleaseAssetUrl $extension_version
  if($zip_url) {
    Get-File -Url $zip_url -OutFile $ENV:RUNNER_TOOL_CACHE\zp.zip > $null 2>&1
    Expand-Archive -Path $ENV:RUNNER_TOOL_CACHE\zp.zip -DestinationPath $ENV:RUNNER_TOOL_CACHE\zp -Force > $null 2>&1
    Copy-Item -Path "$ENV:RUNNER_TOOL_CACHE\zp\php_zephir_parser.dll" -Destination "$ext_dir\php_zephir_parser.dll"
    Enable-PhpExtension -Extension zephir_parser -Path $php_dir
  } else {
    throw "Unable to get zephir_parser release from the GitHub repo"
  }
}

# Function to add zephir parser.
Function Add-ZephirParser() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [string]
    $extension
  )
  try {
    $status = 'Enabled'
    if (Test-Path $ext_dir\php_zephir_parser.dll) {
      Enable-PhpExtension -Extension zephir_parser -Path $php_dir
    } else {
      $status = 'Installed and enabled'
      try {
        Add-ZephirParserFromGitHub $extension
      } catch {
        Add-Extension $extension >$null 2>&1
      }
    }
    Add-ExtensionLog zephir_parser $status
  } catch {
    Add-Log $cross $extension "Could not install $extension on PHP $($installed.FullVersion)"
  }
}