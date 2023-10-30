Function Get-ICUUrl() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    $icu_version,
    [Parameter(Position = 1, Mandatory = $true)]
    [ValidateNotNull()]
    $arch,
    [Parameter(Position = 2, Mandatory = $true)]
    [ValidateNotNull()]
    $vs_version
  )
  $trunk = "https://windows.php.net"
  $urls=@("${trunk}/downloads/php-sdk/deps/${vs_version}/${arch}", "${trunk}/downloads/php-sdk/deps/archives/${vs_version}/${arch}")
  foreach ($url in $urls) {
    $web_content = Get-File -Url $url
    foreach ($link in $web_content.Links) {
      if ($link -match "/.*ICU-${icu_version}.*/") {
        return $trunk + $link.HREF
      }
    }
  }
}

Function Repair-ICU() {
  $icu = deplister $ext_dir\php_http.dll | Select-String "icu[a-z]+(\d+).dll,([A-Z]+)" | Foreach-Object { $_.Matches }
  if($icu -and $icu.Groups[2].Value -ne 'OK') {
    $vs = "vs" + $installed.VCVersion
    if ($installed.VCVersion -lt 16) {
      $vs = "vc" + $installed.VCVersion
    }
    $zip_url = Get-ICUUrl $icu.Groups[1].Value $installed.Architecture $vs
    if ($zip_url -ne '') {
      New-Item -Path "$php_dir" -Name "icu" -ItemType "directory" -Force > $null 2>&1
      Get-File -Url $zip_url -OutFile "$php_dir\icu\icu.zip"
      Expand-Archive -Path $php_dir\icu\icu.zip -DestinationPath $php_dir\icu -Force
      Get-ChildItem $php_dir\icu\bin -Filter *.dll | Copy-Item -Destination $php_dir -Force
    }
  }
}

Function Add-Http() {
  Add-Extension iconv 
  Add-Extension raphf 
  if($version -lt '8.0') {
    Add-Extension propro 
  }
  Add-Extension pecl_http 
  Repair-ICU
  Add-ExtensionLog http "Installed and enabled"
}