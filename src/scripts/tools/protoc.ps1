Function Get-ProtobufTag() {
  $releases = 'https://github.com/protocolbuffers/protobuf/releases'
  if("$protobuf_tag" -eq "latest") {
    $protobuf_tag = (Get-File -Url $releases/latest).BaseResponse.RequestMessage.RequestUri.Segments[-1]
  } else {
    try {
      $protobuf_tag = $protobuf_tag -replace '^v', ''
      [net.httpWebRequest] $request = [net.webRequest]::create("$releases/tag/v$protobuf_tag")
      $request.Method = "HEAD"
      [net.httpWebResponse] $response = $request.getResponse()
      $response.Close()
      $protobuf_tag = "v$protobuf_tag"
    } catch {
      $protobuf_tag = (Get-File -Url $releases/latest).BaseResponse.RequestMessage.RequestUri.Segments[-1]
    }
  }
  return $protobuf_tag
}

Function Add-Protoc() {
  param(
    [Parameter(Mandatory = $true, Position = 0, HelpMessage = 'The PHP version to be installed')]
    [ValidatePattern('^latest$|^(v?)\d+\.\d+(\.\d+)?$')]
    [string] $protobuf_tag
  )
  $protobuf_tag = Get-ProtobufTag
  $arch_num = '64'
  if(-not([Environment]::Is64BitOperatingSystem)) {
    $arch_num = '32'
  }
  $url = "https://github.com/protocolbuffers/protobuf/releases/download/$protobuf_tag/protoc-$($protobuf_tag -replace 'v', '')-win$arch_num.zip"
  Get-File -Url $url -OutFile $bin_dir\protoc.zip 
  Expand-Archive -Path $bin_dir\protoc.zip -DestinationPath $bin_dir\protoc -Force 
  Move-Item -Path $bin_dir\protoc\bin\protoc.exe -Destination $bin_dir\protoc.exe
  Add-ToProfile $current_profile 'protoc' "New-Alias protoc $bin_dir\protoc.exe"
  Add-Log $tick "protoc" "Added protoc $($protobuf_tag -replace 'v', '')"
  printf "$env:GROUP\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "protoc" "Click to read the protoc related license information"
  Write-Output (Invoke-WebRequest https://raw.githubusercontent.com/protocolbuffers/protobuf/master/LICENSE).Content
  Write-Output "$env:END_GROUP"
}
