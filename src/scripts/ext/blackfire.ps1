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
        $ext_data = Invoke-WebRequest https://blackfire.io/docs/up-and-running/update | ForEach-Object { $_.tostring() -split "[`r`n]" | Select-String '<td class="version">' | Select-Object -Index 2 }
        $extension_version = [regex]::Matches($ext_data, '<td.*?>(.+)</td>') | ForEach-Object { $_.Captures[0].Groups[1].value }
    }
    if (Test-Path $ext_dir\blackfire.dll) {
        Enable-PhpExtension -Extension blackfire -Path $php_dir
        $status="Enabled"
    } else {
        $nts = if (!$installed.ThreadSafe) { "_nts" } else { "" }
        Invoke-WebRequest -UseBasicParsing -Uri "https://packages.blackfire.io/binaries/blackfire-php/${extension_version}/blackfire-php-windows_${arch}-php-${no_dot_version}${nts}.dll" -OutFile $ext_dir\blackfire.dll > $null 2>&1
        Enable-PhpExtension -Extension blackfire -Path $php_dir
        $status="Installed and enabled"
    }
    Add-Log $tick $extension $status
  } catch {
    Add-Log $cross $extension "Could not install $extension on PHP $($installed.FullVersion)"
  }
}
