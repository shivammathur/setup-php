# Function to log result of a operation.
Function Add-LicenseLog() {
  printf "::group::\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "ioncube" "Click to read the ioncube loader license information"
  Get-Content $ext_dir\ioncube\LICENSE.txt
  Write-Output "::endgroup::"
}

# Function to add ioncube extension.
Function Add-Ioncube() {
  try {
    if (-not(Test-Path $ext_dir\php_ioncube.dll)) {
      $status = 'Installed and enabled'
      $arch_part = $arch
      if ($arch -eq 'x64') {
        $arch_part = 'x86-64'
      }
      $vc = $installed.VCVersion
      $ts_part = ""
      if (-not($installed.ThreadSafe)) {
        $ts_part = "_nonts"
      }
      Invoke-WebRequest -Uri "https://downloads.ioncube.com/loader_downloads/ioncube_loaders_win$ts_part`_vc$vc`_$arch_part.zip" -OutFile $ext_dir\ioncube.zip
      Expand-Archive -Path $ext_dir\ioncube.zip -DestinationPath $ext_dir -Force
      Copy-Item $ext_dir\ioncube\ioncube_loader_win_$version.dll $ext_dir\php_ioncube.dll
    }
    "zend_extension=$ext_dir\php_ioncube.dll`r`n" + (Get-Content $php_dir\php.ini -Raw) | Set-Content $php_dir\php.ini
    Add-Log $tick "ioncube" $status
    Add-LicenseLog
  } catch {
    Add-Log $cross "ioncube" "Could not install ioncube on PHP $($installed.FullVersion)"
  }
}
