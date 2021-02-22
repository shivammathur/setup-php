# Function to log license information.
Function Add-LicenseLog() {
    printf "::group::\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" $extension "Click to read the $extension related license information"
    printf "Oracle Instant Client package is required for %s extension.\n" $extension
    printf "It is provided under the Oracle Technology Network Development and Distribution License.\n"
    printf "Refer to: \033[35;1m%s \033[0m\n" "https://www.oracle.com/downloads/licenses/instant-client-lic.html"
    Write-Output "::endgroup::"
}

# Function to get instantclinet.
Function Add-InstantClient() {
  if (-not(Test-Path $php_dir\oci.dll)) {
    $suffix = 'windows'
    if ($arch -eq 'x86') {
      $suffix = 'nt'
    }
    Invoke-WebRequest -Uri https://download.oracle.com/otn_software/nt/instantclient/instantclient-basiclite-$suffix.zip -OutFile $php_dir\instantclient.zip
    Expand-Archive -Path $php_dir\instantclient.zip -DestinationPath $php_dir -Force
    Copy-Item $php_dir\instantclient*\* $php_dir
  }
}

# Function to install oci8 and pdo_oci.
Function Add-Oci() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateSet('oci8', 'pdo_oci')]
    [string]
    $extension
  )
  try {
    $status = 'Enabled'
    Add-InstantClient
    if ($extension -eq "pdo_oci") {
      Enable-PhpExtension pdo_oci -Path $php_dir
    } else {
      if(-not(Test-Path $ext_dir\php_oci8.dll)) {
        $status = 'Installed and enabled'
        $ociVersion = Get-PeclPackageVersion oci8 -MinimumStability stable -MaximumStability stable | Select-Object -First 1
        if ($version -eq '7.0') {
          $ociVersion = '2.1.8'
        } elseif ($version -lt '7.0') {
          $ociVersion = '2.0.12'
        } elseif ($version -lt '8.0') {
          $ociVersion = '2.2.0'
        }
        $ociUrl = Get-PeclArchiveUrl oci8 $ociVersion $installed
        Invoke-WebRequest -Uri $ociUrl -OutFile $php_dir\oci8.zip
        Expand-Archive -Path $php_dir\oci8.zip -DestinationPath $ext_dir -Force

      }
      Add-Content -Value "`r`nextension=php_oci8.dll" -Path $php_dir\php.ini
    }
    Add-Log $tick $extension $status
    Add-LicenseLog
  } catch {
    Add-Log $cross $extension "Could not install $extension on PHP $( $installed.FullVersion )"
  }
}
