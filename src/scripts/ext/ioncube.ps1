Param (
  [Parameter(Position = 0, Mandatory = $true)]
  [ValidateNotNull()]
  [ValidateLength(1, [int]::MaxValue)]
  [string]
  $version
)

# Function to log result of a operation.
Function Add-Log($mark, $subject, $message) {
  $code = if ($mark -eq $cross) { "31" } else { "32" }
  printf "\033[%s;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" $code $mark $subject $message
}

$tick = ([char]8730)
$cross = ([char]10007)
$status = 'Enabled'
$php_dir = 'C:\tools\php'
if($env:RUNNER -eq 'self-hosted') { $php_dir = "$php_dir$version" }
$ext_dir = "$php_dir\ext"
$installed = Get-Php $php_dir
try {
  if (-not(Test-Path $ext_dir\php_ioncube.dll)) {
    $status = 'Installed and enabled'
    $arch = 'x86-64'
    if (-not([Environment]::Is64BitOperatingSystem) -or $version -lt '7.0') {
      $arch = 'x86'
    }
    $vc = $installed.VCVersion
    $ts = ""
    if (-not($installed.ThreadSafe)) {
      $ts = "_nonts"
    }
    Invoke-WebRequest -UseBasicParsing -Uri "https://downloads.ioncube.com/loader_downloads/ioncube_loaders_win$ts`_vc$vc`_$arch.zip" -OutFile $ext_dir\ioncube.zip
    Expand-Archive -Path $ext_dir\ioncube.zip -DestinationPath $ext_dir -Force
    Copy-Item $ext_dir\ioncube\ioncube_loader_win_$version.dll $ext_dir\php_ioncube.dll
  }
  "zend_extension=$ext_dir\php_ioncube.dll`r`n" + (Get-Content $php_dir\php.ini -Raw) | Set-Content $php_dir\php.ini
  printf "\033[%s;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "32" $tick "ioncube" $status
} catch {
  Add-Log $cross "ioncube" "Could not install ioncube on PHP $($installed.FullVersion)"
}