Function Get-MagoTag() {
  $releases = 'https://github.com/carthage-software/mago/releases'
  if("$mago_tag" -eq "latest") {
    $mago_tag = (Get-File -Url $releases/latest).BaseResponse.RequestMessage.RequestUri.Segments[-1]
  } else {
    try {
      [net.httpWebRequest] $request = [net.webRequest]::create("$releases/tag/$mago_tag")
      $request.Method = "HEAD"
      [net.httpWebResponse] $response = $request.getResponse()
      $response.Close()
      $mago_tag = "$mago_tag"
    } catch {
      $mago_tag = (Get-File -Url $releases/latest).BaseResponse.RequestMessage.RequestUri.Segments[-1]
    }
  }
  return $mago_tag
}

Function Add-Mago() {
  param(
    [Parameter(Mandatory = $true, Position = 0, HelpMessage = 'The mago version to be installed')]
    [ValidatePattern('^latest$|^\d+\.\d+\.\d+$')]
    [string] $mago_tag
  )
  $mago_tag = Get-MagoTag
  $arch_name = 'x86_64'
  if(-not([Environment]::Is64BitOperatingSystem)) {
    $arch_name = 'i686'
  }
  $url = "https://github.com/carthage-software/mago/releases/download/$mago_tag/mago-$mago_tag-$arch_name-pc-windows-msvc.zip"
  Get-File -Url $url -OutFile $bin_dir\mago.zip >$null 2>&1
  Expand-Archive -Path $bin_dir\mago.zip -DestinationPath $bin_dir\mago -Force >$null 2>&1
  Move-Item -Path $bin_dir\mago\mago-$mago_tag-$arch_name-pc-windows-msvc\mago.exe -Destination $bin_dir\mago.exe -Force
  Add-ToProfile $current_profile 'mago' "New-Alias mago $bin_dir\mago.exe"
  Add-Log $tick "mago" "Added mago $mago_tag"
}