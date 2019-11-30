param (
  [Parameter(Mandatory = $true)][string]$version = "7.3",
  [Parameter(Mandatory = $true)][string]$dir
)

$tick = ([char]8730)
$cross = ([char]10007)
$php_dir = 'C:\tools\php'

Function Step-Log($message) {
  printf "\n\033[90;1m==> \033[0m\033[37;1m%s \033[0m\n" $message
}

Function Add-Log($mark, $subject, $message) {
  $code = if ($mark -eq $cross) { "31" } else { "32" }
  printf "\033[%s;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" $code $mark $subject $message
}

Step-Log "Setup PhpManager"
Install-Module -Name PhpManager -Force -Scope CurrentUser
Add-Log $tick "PhpManager" "Installed"

$installed = $null
if (Test-Path -LiteralPath $php_dir -PathType Container) {
  try {
    $installed = Get-Php -Path $php_dir
  }
  catch {
  }
}
Step-Log "Setup PHP and Composer"
if ($null -eq $installed -or -not("$($installed.Version).".StartsWith(($version -replace '^(\d+(\.\d+)*).*', '$1.')))) {
  if ($version -lt '7.0') {
    Install-Module -Name VcRedist -Force
  }

  Install-Php -Version $version -Architecture x86 -ThreadSafe $true -InstallVC -Path $php_dir -TimeZone UTC -InitialPhpIni Production -Force >$null 2>&1
  $installed = Get-Php -Path $php_dir
  $status = "Installed PHP $($installed.FullVersion)"
}
else {
  $status = "PHP $($installed.FullVersion) Found"
}

Set-PhpIniKey -Key 'date.timezone' -Value 'UTC' -Path $php_dir
Enable-PhpExtension -Extension openssl, curl -Path $php_dir
Update-PhpCAInfo -Path $php_dir -Source CurrentUser
if ([Version]$installed.Version -ge '7.4') {
  Copy-Item "$dir\..\src\ext\php_pcov.dll" -Destination "$($installed.ExtensionsPath)\php_pcov.dll"
}
Add-Log $tick "PHP" $status

Install-Composer -Scope System -Path $php_dir -PhpPath $php_dir
Add-Log $tick "Composer" "Installed"

Function Add-Extension {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $extension,
    [Parameter(Position = 1, Mandatory = $false)]
    [ValidateNotNull()]
    [ValidateSet('stable', 'beta', 'alpha', 'devel', 'snapshot')]
    [string]
    $mininum_stability = 'stable'
  )
  try {
    $extension_info = Get-PhpExtension -Path $php_dir | Where-Object { $_.Name -eq $extension -or $_.Handle -eq $extension }
    if ($null -ne $extension_info) {
      switch ($extension_info.State) {
        'Builtin' {
          Add-Log $tick $extension "Enabled"
        }
        'Enabled' {
          Add-Log $tick $extension "Enabled"
        }
        default {
          Enable-PhpExtension -Extension $extension_info.Handle -Path $php_dir
          Add-Log $tick $extension "Enabled"
        }
      }
    }
    else {
      Install-PhpExtension -Extension $extension -MinimumStability $mininum_stability -Path $php_dir
      Add-Log $tick $extension "Installed and enabled"
    }
  }
  catch {
    Add-Log $cross $extension "Could not enable"
  }
}
