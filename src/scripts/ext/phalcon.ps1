Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateSet('phalcon3', 'phalcon4')]
    [string]
    $extension,
    [Parameter(Position = 1, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $version
)
$tick = ([char]8730)
$domain = 'https://github.com'
$php_dir = 'C:\tools\php'
$ext_dir = $php_dir + '\ext'
if($extension -eq "phalcon4") {
    Install-Phpextension psr -MinimumStability stable -Path $php_dir
    Install-Phpextension phalcon -MinimumStability stable -Path $php_dir
} else {
    $installed = Get-Php -Path $php_dir
    $extension_version = $extension.substring($extension.Length - 1)
    $nts = if(! $installed.ThreadSafe ) { "_nts" } else { "" }
    $match = Invoke-WebRequest -UseBasicParsing -Uri $domain/phalcon/cphalcon/releases | Select-String -Pattern "href=`"(.*phalcon_x64_.*_php${version}_${extension_version}.*[0-9]${nts}.zip)`""
    $zip_file = $match.Matches[0].Groups[1].Value
    Invoke-WebRequest -UseBasicParsing -Uri $domain/$zip_file -OutFile $ENV:RUNNER_TOOL_CACHE\phalcon.zip >$null 2>&1
    Expand-Archive -Path $ENV:RUNNER_TOOL_CACHE\phalcon.zip -DestinationPath $ENV:RUNNER_TOOL_CACHE\phalcon -Force >$null 2>&1
    New-Item -ItemType SymbolicLink -Path $ext_dir\php_phalcon.dll -Target $ENV:RUNNER_TOOL_CACHE\phalcon\php_phalcon.dll >$null 2>&1
    Enable-PhpExtension -Extension phalcon -Path $php_dir
}
printf "\033[%s;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "32" $tick $extension "Installed and enabled"