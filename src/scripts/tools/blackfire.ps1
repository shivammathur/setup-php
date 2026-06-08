# Function to add blackfire cli.
Function Add-Blackfire() {
  $arch_name ='amd64'
  if(-not([Environment]::Is64BitOperatingSystem) -or $version -lt '7.0') {
    $arch_name = '386'
  }
  $cli_version = (Invoke-RestMethod https://blackfire.io/api/v1/releases).cli
  $url = "https://packages.blackfire.io/binaries/blackfire/${cli_version}/blackfire-windows_${arch_name}.zip"
  Get-File -Url $url -OutFile $bin_dir\blackfire.zip 
  Expand-Archive -Path $bin_dir\blackfire.zip -DestinationPath $bin_dir -Force 
  Add-ToProfile $current_profile 'blackfire' "New-Alias blackfire $bin_dir\blackfire.exe"
  if ((Test-Path env:BLACKFIRE_SERVER_ID) -and (Test-Path env:BLACKFIRE_SERVER_TOKEN)) {
    blackfire agent:config --server-id=$env:BLACKFIRE_SERVER_ID --server-token=$env:BLACKFIRE_SERVER_TOKEN 
  }
  if ((Test-Path env:BLACKFIRE_CLIENT_ID) -and (Test-Path env:BLACKFIRE_CLIENT_TOKEN)) {
    blackfire client:config --client-id=$env:BLACKFIRE_CLIENT_ID --client-token=$env:BLACKFIRE_CLIENT_TOKEN --ca-cert=$php_dir\ssl\cacert.pem 
  }
  Add-Log $tick "blackfire" "Added blackfire $cli_version"
}
