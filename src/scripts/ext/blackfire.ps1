Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [string]
    $phpversion,
    [Parameter(Position = 1, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $version = '1.31.0'
)

Function Install-Blackfire() {
    $installed = Get-Php -Path $php_dir
    $nts = if (!$installed.ThreadSafe) { "_nts" } else { "" }
    Invoke-WebRequest -UseBasicParsing -Uri "https://packages.blackfire.io/binaries/blackfire-php/${version}/blackfire-php-windows_x64-php-${phpversion}${nts}.dll" -OutFile $ENV:RUNNER_TOOL_CACHE\blackfire.dll > $null 2>&1
    Copy-Item -Path "$ENV:RUNNER_TOOL_CACHE\blackfire.dll" -Destination "$ext_dir\blackfire.dll"
    Enable-PhpExtension -Extension blackfire -Path $php_dir
    printf "\033[%s;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "32" $tick "Blackfire" "Installed and enabled"
}

$tick = ([char]8730)
$php_dir = 'C:\tools\php'
$ext_dir = $php_dir + '\ext'

Install-Blackfire

