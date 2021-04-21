# Function to install blackfire extension.
Function Add-Blackfire() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [string]
    $extension
  )
  try {
    $no_dot_version = $version.replace('.', '')
    $extension_version = $extension.split('-')[1]
    if ($extension_version -notmatch "\S") {
        if($version -lt '7.0') {
            $extension_version = '1.50.0'
        } else {
            $extension_version = (Invoke-RestMethod https://blackfire.io/api/v1/releases).probe.php
        }
    }
    if (Test-Path $ext_dir\blackfire.dll) {
        Enable-PhpExtension -Extension blackfire -Path $php_dir
        $status="Enabled"
    } else {
        $nts = if (!$installed.ThreadSafe) { "_nts" } else { "" }
        Invoke-WebRequest -Uri "https://packages.blackfire.io/binaries/blackfire-php/${extension_version}/blackfire-php-windows_${arch}-php-${no_dot_version}${nts}.dll" -OutFile $ext_dir\blackfire.dll > $null 2>&1
        Enable-PhpExtension -Extension blackfire -Path $php_dir
        $status="Installed and enabled"
    }
    Add-Log $tick $extension $status
  } catch {
    Add-Log $cross $extension "Could not install $extension on PHP $($installed.FullVersion)"
  }
}
