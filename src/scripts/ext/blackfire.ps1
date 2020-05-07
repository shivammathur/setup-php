Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [string]
    $version,
    [Parameter(Position = 1, Mandatory = $true)]
    [ValidateNotNull()]
    [string]
    $extension
)

$tick = ([char]8730)
$php_dir = 'C:\tools\php'
$ext_dir = $php_dir + '\ext'
$arch='x64'
if ($version -lt '7.0') { $arch='x86' }
$version = $version.replace('.', '')
$extension_version = $extension.split('-')[1]
if ($extension_version -notmatch "\S") {
    $ext_data = Invoke-WebRequest https://blackfire.io/docs/up-and-running/update | ForEach-Object { $_.tostring() -split "[`r`n]" | Select-String '<td class="version">' | Select-Object -Index 2 }
    $extension_version = [regex]::Matches($ext_data, '<td.*?>(.+)</td>') | ForEach-Object { $_.Captures[0].Groups[1].value }
}
if (Test-Path $ext_dir\blackfire.dll) {
    Enable-PhpExtension -Extension blackfire -Path $php_dir
    $status="Enabled"
} else {
    $installed = Get-Php -Path $php_dir
    $nts = if (!$installed.ThreadSafe) { "_nts" } else { "" }
    Invoke-WebRequest -UseBasicParsing -Uri "https://packages.blackfire.io/binaries/blackfire-php/${extension_version}/blackfire-php-windows_${arch}-php-${version}${nts}.dll" -OutFile $ext_dir\blackfire.dll > $null 2>&1
    Enable-PhpExtension -Extension blackfire -Path $php_dir
    $status="Installed and enabled"
}
printf "\033[%s;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "32" $tick "blackfire" "$status"

