# Function to add blackfire and blackfire-agent.
Function Add-Blackfire() {
  $arch_name ='amd64'
  if(-not([Environment]::Is64BitOperatingSystem) -or $version -lt '7.0') {
    $arch_name = '386'
  }
  $agent_version = (Invoke-RestMethod https://blackfire.io/api/v1/releases).agent
  $url = "https://packages.blackfire.io/binaries/blackfire-agent/${agent_version}/blackfire-agent-windows_${arch_name}.zip"
  Invoke-WebRequest -Uri $url -OutFile $bin_dir\blackfire.zip >$null 2>&1
  Expand-Archive -Path $bin_dir\blackfire.zip -DestinationPath $bin_dir -Force >$null 2>&1
  Add-ToProfile $current_profile 'blackfire' "New-Alias blackfire $bin_dir\blackfire.exe"
  Add-ToProfile $current_profile 'blackfire-agent' "New-Alias blackfire-agent $bin_dir\blackfire-agent.exe"
  if ((Test-Path env:BLACKFIRE_SERVER_ID) -and (Test-Path env:BLACKFIRE_SERVER_TOKEN)) {
    blackfire-agent --register --server-id=$env:BLACKFIRE_SERVER_ID --server-token=$env:BLACKFIRE_SERVER_TOKEN >$null 2>&1
  }
  if ((Test-Path env:BLACKFIRE_CLIENT_ID) -and (Test-Path env:BLACKFIRE_CLIENT_TOKEN)) {
    blackfire config --client-id=$env:BLACKFIRE_CLIENT_ID --client-token=$env:BLACKFIRE_CLIENT_TOKEN --ca-cert=$php_dir\ssl\cacert.pem >$null 2>&1
  }
  Add-Log $tick "blackfire" "Added blackfire $agent_version"
  Add-Log $tick "blackfire-agent" "Added blackfire-agent $agent_version"
}
