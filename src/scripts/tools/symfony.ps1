Function Add-Symfony() {
  $arch_name ='amd64'
  if(-not([Environment]::Is64BitOperatingSystem) -or $version -lt '7.0') {
    $arch_name = '386'
  }
  $url = "https://github.com/symfony-cli/symfony-cli/releases/latest/download/symfony-cli_windows_${arch_name}.zip"
  Get-File -Url $url -OutFile $bin_dir\symfony.zip 
  Expand-Archive -Path $bin_dir\symfony.zip -DestinationPath $bin_dir -Force 
  if(Test-Path $bin_dir\symfony.exe) {
    Copy-Item -Path $bin_dir\symfony.exe -Destination $bin_dir\symfony-cli.exe > $null 2>&1
    Add-ToProfile $current_profile 'symfony' "New-Alias symfony $bin_dir\symfony.exe"
    Add-ToProfile $current_profile 'symfony_cli' "New-Alias symfony-cli $bin_dir\symfony-cli.exe"
    $tool_version = Get-ToolVersion symfony "-V"
    Add-Log $tick "symfony-cli" "Added symfony-cli $tool_version"
  } else {
    Add-Log $cross "symfony-cli" "Could not setup symfony-cli"
  }
}
