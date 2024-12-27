# Function to log license information.
Function Add-LicenseLog() {
    printf "$env:GROUP\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" $extension "Click to read the $extension related license information"
    printf "Oracle Instant Client package is required for %s extension.\n" $extension
    printf "It is provided under the Oracle Technology Network Development and Distribution License.\n"
    printf "Refer to: \033[35;1m%s \033[0m\n" "https://www.oracle.com/downloads/licenses/instant-client-lic.html"
    Write-Output "$env:END_GROUP"
}

# Function to get instantclinet.
Function Add-InstantClient() {
  if (-not(Test-Path $php_dir\oci.dll)) {
    $suffix = 'windows'
    if ($arch -eq 'x86') {
      $suffix = 'nt'
    }
    Get-File -Url https://download.oracle.com/otn_software/nt/instantclient/instantclient-basiclite-$suffix.zip -OutFile $php_dir\instantclient.zip
    Expand-Archive -Path $php_dir\instantclient.zip -DestinationPath $php_dir -Force
    Copy-Item $php_dir\instantclient*\* $php_dir
  }
}

# Function to oci8 extension URL.
Function Get-Oci8Url() {
  if($version -lt '8.0') {
    $ociVersion = '2.2.0'
    if ($version -eq '7.0') {
      $ociVersion = '2.1.8'
    } elseif ($version -lt '7.0') {
      $ociVersion = '2.0.12'
    }
    return Get-PeclArchiveUrl oci8 $ociVersion $installed
  } else {
    $ociUrl = '';
    Get-PeclPackageVersion oci8 -MinimumStability stable -MaximumStability stable | ForEach-Object {
      $ociUrl = Get-PeclArchiveUrl oci8 $_ $installed
      if($ociUrl) {
        return $ociUrl
      }
    }
  }
}

# Function to get OCI8 DLL.
Function Get-Oci8DLL() {
  Get-ChildItem $ext_dir\php_oci8*.dll | ForEach-Object {
    if((Get-PhpExtension -Path $_).PhpVersion -eq $version) {
      return $_
    }
  }
  return $null
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
    if($version -lt '8.4') {
      if($version -lt '5.6' -and $extension -eq 'oci8') {
        Add-Content -Value "`r`nextension=php_oci8.dll" -Path $php_dir\php.ini
      } else {
        Enable-PhpExtension $extension -Path $php_dir
      }
    } else {
      $status = 'Installed and enabled'
      Add-Extension $extension >$null 2>&1
    }
    Add-ExtensionLog $extension $status
    Add-LicenseLog
  } catch {
    Add-Log $cross $extension "Could not install $extension on PHP $( $installed.FullVersion )"
  }
}
