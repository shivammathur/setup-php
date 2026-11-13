Function Add-Upsun() {
  param(
    [Parameter(Mandatory = $true, Position = 0, HelpMessage = 'Upsun CLI version to be installed')]
    [string] $upsun_tag
  )
  $upsun_tag = $upsun_tag.replace('v', '')
  if($upsun_tag -ne 'latest' -and $upsun_tag -notmatch '^\d+(\.\d+)*$') {
    Add-Log $cross "upsun-cli" "Invalid upsun-cli version: $upsun_tag"
  } elseif(-not([Environment]::Is64BitOperatingSystem)) {
    Add-Log $cross "upsun-cli" "upsun-cli is only available for 64-bit Windows"
  } else {
    $upsun_releases = "https://github.com/upsun/cli/releases"
    if ($upsun_tag -eq 'latest') {
      $upsun_tag = (Get-File -Url $upsun_releases/latest).BaseResponse.RequestMessage.RequestUri.Segments[-1].replace('v', '')
    }
    $url = "$upsun_releases/download/v$upsun_tag/upsun_${upsun_tag}_windows_amd64.zip"
    Get-File -Url $url -OutFile $bin_dir\upsun.zip > $null 2>&1
    Expand-Archive -Path $bin_dir\upsun.zip -DestinationPath $bin_dir\upsun -Force > $null 2>&1
    if (Test-Path $bin_dir\upsun\upsun.exe) {
      Move-Item -Path $bin_dir\upsun\upsun.exe -Destination $bin_dir\upsun.exe -Force
      Copy-Item -Path $bin_dir\upsun.exe -Destination $bin_dir\upsun-cli.exe > $null 2>&1
      Add-ToProfile $current_profile 'upsun' "New-Alias upsun $bin_dir\upsun.exe"
      Add-ToProfile $current_profile 'upsun_cli' "New-Alias upsun-cli $bin_dir\upsun-cli.exe"
      $tool_version = Get-ToolVersion upsun "--version"
      Add-Log $tick "upsun-cli" "Added upsun-cli $tool_version"
    } else {
      Add-Log $cross "upsun-cli" "Could not setup upsun-cli"
    }
  }
}
