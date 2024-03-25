Function Add-Msys2() {
  $msys_location = 'C:\msys64'
  if (-not(Test-Path $msys_location)) {
    choco install msys2 -y 
    $msys_location = 'C:\tools\msys64'
  }
  return $msys_location
}

Function Add-GrpcPhpPlugin() {
  $msys_location = Add-Msys2
  $logs = . $msys_location\usr\bin\bash -l -c "pacman -S --noconfirm mingw-w64-x86_64-grpc" 
  $grpc_version = Get-ToolVersion 'Write-Output' "$logs"
  Add-Path $msys_location\mingw64\bin
  Set-Output grpc_php_plugin_path "$msys_location\mingw64\bin\grpc_php_plugin.exe"
  Add-ToProfile $current_profile 'grpc_php_plugin' "New-Alias grpc_php_plugin $msys_location\mingw64\bin\grpc_php_plugin.exe"
  Add-Log $tick "grpc_php_plugin" "Added grpc_php_plugin $grpc_version"
  printf "$env:GROUP\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "grpc_php_plugin" "Click to read the grpc_php_plugin related license information"
  Write-Output (Invoke-WebRequest https://raw.githubusercontent.com/grpc/grpc/master/LICENSE).Content
  Write-Output "$env:END_GROUP"
}
