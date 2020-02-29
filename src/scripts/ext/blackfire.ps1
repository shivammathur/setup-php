Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [string]
    $version,
    [Parameter(Position = 2, Mandatory = $false)]
    [ValidateNotNull()]
    [string]
    $extension_version
)

$tick = ([char]8730)
$php_dir = 'C:\tools\php'
$ext_dir = $php_dir + '\ext'
$arch='x64'
if ($version -lt '7.0') { $arch='x86' }
$version = $version.replace('.', '')

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

