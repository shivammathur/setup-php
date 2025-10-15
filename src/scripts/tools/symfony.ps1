Function Add-Symfony() {
  param(
    [Parameter(Mandatory = $true, Position = 0, HelpMessage = 'Symfony version to be installed')]
    [string] $protobuf_tag
  )
  $protobuf_tag = $protobuf_tag.replace('v', '')
  if($protobuf_tag -ne 'latest' -and $protobuf_tag -notmatch '^\d+(\.\d+)*$') {
    Add-Log $cross "symfony-cli" "Invalid symfony version: $protobuf_tag"
  } else {
    $arch_name = 'amd64'
    if (-not ([Environment]::Is64BitOperatingSystem) -or $version -lt '7.0') {
      $arch_name = '386'
    }
    $symfony_releases = "https://github.com/symfony-cli/symfony-cli/releases"
    if ($protobuf_tag -eq 'latest') {
      $url = "$symfony_releases/latest/download/symfony-cli_windows_${arch_name}.zip"
    } else {
      $url = "$symfony_releases/download/v$protobuf_tag/symfony-cli_windows_${arch_name}.zip"
    }
    Get-File -Url $url -OutFile $bin_dir\symfony.zip > $null 2>&1
    Expand-Archive -Path $bin_dir\symfony.zip -DestinationPath $bin_dir -Force > $null 2>&1
    if (Test-Path $bin_dir\symfony.exe) {
      Copy-Item -Path $bin_dir\symfony.exe -Destination $bin_dir\symfony-cli.exe > $null 2>&1
      Add-ToProfile $current_profile 'symfony' "New-Alias symfony $bin_dir\symfony.exe"
      Add-ToProfile $current_profile 'symfony_cli' "New-Alias symfony-cli $bin_dir\symfony-cli.exe"
      $tool_version = Get-ToolVersion symfony "-V"
      Add-Log $tick "symfony-cli" "Added symfony-cli $tool_version"
    } else {
      Add-Log $cross "symfony-cli" "Could not setup symfony-cli"
    }
  }
}
