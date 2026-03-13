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
  $trunk = "https://downloads.php.net"
  $urls=@("${trunk}/~windows/php-sdk/deps/${vs_version}/${arch}/", "${trunk}/~windows/php-sdk/deps/archives/${vs_version}/${arch}/")
  foreach ($url in $urls) {
    try {
      $web_content = Get-File -Url $url 2>$null
    } catch { continue }
    foreach ($link in $web_content.Links) {
      if ($link.href -match ".*ICU-${icu_version}.*") {
        return $url + $link.HREF
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
  Add-Extension iconv >$null 2>&1
  Add-Extension raphf >$null 2>&1
  if($version -lt '8.0') {
    Add-Extension propro >$null 2>&1
  }
  Add-Extension pecl_http >$null 2>&1
  Repair-ICU
  Add-ExtensionLog http "Installed and enabled"
}