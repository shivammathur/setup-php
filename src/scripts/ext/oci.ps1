Param (
  [Parameter(Position = 0, Mandatory = $true)]
  [ValidateNotNull()]
  [ValidateSet('oci8', 'pdo_oci')]
  [string]
  $extension,
  [Parameter(Position = 1, Mandatory = $true)]
  [ValidateNotNull()]
  [ValidateLength(1, [int]::MaxValue)]
  [string]
  $version
)

# Function to log result of a operation.
Function Add-Log($mark, $subject, $message) {
  if ($mark -eq $tick) {
    printf "\033[%s;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "32" $mark $subject $message
    printf "::group::\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" $extension "Click to read the $extension related license information"
    printf "Oracle Instant Client package is required for %s extension.\n" $extension
    printf "It is provided under the Oracle Technology Network Development and Distribution License.\n"
    printf "Refer to: \033[35;1m%s \033[0m\n" "https://www.oracle.com/downloads/licenses/instant-client-lic.html"
    Write-Output "::endgroup::"
  } else {
    printf "\033[%s;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "31" $mark $subject $message
  }
}

$tick = ([char]8730)
$cross = ([char]10007)
$php_dir = 'C:\tools\php'
$status = 'Enabled'
if($env:RUNNER -eq 'self-hosted') { $php_dir = "$php_dir$version" }
$ext_dir = "$php_dir\ext"
$installed = Get-Php -Path $php_dir
try
{
  if (-not(Test-Path $php_dir\oci.dll)) {
    $suffix = 'windows'
    if (-not([Environment]::Is64BitOperatingSystem) -or $version -lt '7.0')
    {
      $suffix = 'nt'
    }
    Invoke-WebRequest -UseBasicParsing -Uri https://download.oracle.com/otn_software/nt/instantclient/instantclient-basiclite-$suffix.zip -OutFile $php_dir\instantclient.zip
    Expand-Archive -Path $php_dir\instantclient.zip -DestinationPath $php_dir -Force
    Copy-Item $php_dir\instantclient*\* $php_dir
  }
  if ($extension -eq "pdo_oci") {
    Enable-PhpExtension pdo_oci -Path $php_dir
  } else {
    $status = 'Installed and enabled'
    $ociVersion = '2.2.0'
    if ($version -eq '7.0')
    {
      $ociVersion = '2.1.8'
    }
    elseif ($version -lt '7.0')
    {
      $ociVersion = '2.0.12'
    }
    $ociUrl = Get-PeclArchiveUrl oci8 $ociVersion $installed
    Invoke-WebRequest -UseBasicParsing -Uri $ociUrl -OutFile $php_dir\oci8.zip
    Expand-Archive -Path $php_dir\oci8.zip -DestinationPath $ext_dir -Force
    Add-Content -Value "`r`nextension=php_oci8.dll" -Path $php_dir\php.ini
  }
  Add-Log $tick $extension $status
} catch {
  Add-Log $cross $extension "Could not install $extension on PHP $($installed.FullVersion)"
}
