# Function to log license information for ibm extensions.
Function Add-LicenseLog() {
  printf "$env:GROUP\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" $extension "Click to read the $extension related license information"
  printf "IBM Db2 ODBC and CLI Driver is required for %s extension.\n" $extension
  printf "It is provided under the IBM International Program License Agreement.\n"
  printf "Refer to: \033[35;1m%s \033[0m\n" "https://www.ibm.com/support/pages/db2-odbc-cli-driver-download-and-installation-information"
  $licensePath = "$php_dir\clidriver\license\odbc_notices.rtf"
  if (Test-Path $licensePath) {
    Add-Type -AssemblyName System.Windows.Forms
    $rtBox = New-Object System.Windows.Forms.RichTextBox
    $rtBox.Rtf = [System.IO.File]::ReadAllText($licensePath);
    Write-Host $rtBox.Text;
  }
  Write-Output "$env:END_GROUP"
}

# Function to install IBM Db2 CLI driver.
Function Add-IbmCli() {
  $cliPath = "$php_dir\clidriver"
  if (-not (Test-Path "$cliPath\bin")) {
    $suffix = if ($arch -eq 'x86') { 'nt32' } else { 'ntx64' }
    $archive = "$suffix`_odbc_cli.zip"
    $destination = "$ENV:RUNNER_TOOL_CACHE\ibm_cli.zip"
    Get-File -Url "https://public.dhe.ibm.com/ibmdl/export/pub/software/data/db2/drivers/odbc_cli/$archive" -OutFile $destination > $null 2>&1
    Expand-Archive -Path $destination -DestinationPath $php_dir -Force > $null 2>&1
  }
  $env:IBM_DB_HOME = $cliPath
  $env:LD_LIBRARY_PATH = "$cliPath\bin;$cliPath\lib;$env:LD_LIBRARY_PATH"
  Add-Path "$cliPath\bin"
  $env:PATH = "$cliPath\bin;$env:PATH"
}

# Function to install ibm_db2 and pdo_ibm.
Function Add-Ibm() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateSet('ibm_db2', 'pdo_ibm')]
    [string]
    $extension
  )
  try {
    $status = 'Enabled'
    Add-IbmCli
    if (Test-Path "$ext_dir\php_$extension.dll") {
      Enable-PhpExtension -Extension $extension -Path $php_dir
    } else {
      Add-Extension $extension 
      $status = 'Installed and enabled'
    }
    Add-ExtensionLog $extension $status
    Add-LicenseLog
  } catch {
    Add-Log $cross $extension "Could not install $extension on PHP $( $installed.FullVersion )"
  }
}
