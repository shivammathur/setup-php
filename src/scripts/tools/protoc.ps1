Function Get-ProtobufTag() {
  if("$protobuf_tag" -eq "latest") {
    $protobuf_tag = (Invoke-RestMethod https://api.github.com/repos/protocolbuffers/protobuf/tags).Name | Where-Object { $_ -match "v\d+.\d+.\d+$" } | Select-Object -First 1
  } else {
    try {
      [net.httpWebRequest] $request = [net.webRequest]::create("https://github.com/protocolbuffers/protobuf/releases/tag/v$protobuf_tag")
      $req.Method = "HEAD"
      [net.httpWebResponse] $response = $request.getResponse()
      $response.Close()
      $protobuf_tag = "v$protobuf_tag"
    } catch {
      $protobuf_tag = (Invoke-RestMethod https://api.github.com/repos/protocolbuffers/protobuf/tags).Name | Where-Object { $_ -match "v\d+.\d+.\d+$" } | Select-Object -First 1
    }
  }
  return $protobuf_tag
}

Function Add-Protoc() {
  param(
    [Parameter(Mandatory = $true, Position = 0, HelpMessage = 'The PHP version to be installed')]
    [ValidatePattern('^latest$|^(v?)\d+\.\d+\.\d+$')]
    [string] $protobuf_tag
  )
  $protobuf_tag = Get-ProtobufTag
  $arch_num = '64'
  if(-not([Environment]::Is64BitOperatingSystem)) {
    $arch_num = '32'
  }
  $url = "https://github.com/protocolbuffers/protobuf/releases/download/$protobuf_tag/protoc-$($protobuf_tag -replace 'v', '')-win$arch_num.zip"
  Invoke-WebRequest -Uri $url -OutFile $bin_dir\protoc.zip >$null 2>&1
  Expand-Archive -Path $bin_dir\protoc.zip -DestinationPath $bin_dir\protoc -Force >$null 2>&1
  Move-Item -Path $bin_dir\protoc\bin\protoc.exe -Destination $bin_dir\protoc.exe
  Add-ToProfile $current_profile 'protoc' "New-Alias protoc $bin_dir\protoc.exe"
  Add-Log $tick "protoc" "Added protoc $($protobuf_tag -replace 'v', '')"
  printf "::group::\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "protoc" "Click to read the protoc related license information"
  Write-Output (Invoke-WebRequest https://raw.githubusercontent.com/protocolbuffers/protobuf/master/LICENSE).Content
  Write-Output "::endgroup::"
}
