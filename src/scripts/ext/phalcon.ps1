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

# Function to install phalcon
Function Install-Phalcon() {
    if ($extension_version -eq '4') {
        Install-Phpextension phalcon -MinimumStability stable -Path $php_dir
    } else {
        $installed = Get-Php -Path $php_dir
        $nts = if (!$installed.ThreadSafe) { "_nts" } else { "" }
        $match = Invoke-WebRequest -UseBasicParsing -Uri $domain/phalcon/cphalcon/releases | Select-String -Pattern "href=`"(.*phalcon_x64_.*_php${version}_${extension_version}.*[0-9]${nts}.zip)`""
        $zip_file = $match.Matches[0].Groups[1].Value
        Invoke-WebRequest -UseBasicParsing -Uri $domain/$zip_file -OutFile $ENV:RUNNER_TOOL_CACHE\phalcon.zip > $null 2>&1
        Expand-Archive -Path $ENV:RUNNER_TOOL_CACHE\phalcon.zip -DestinationPath $ENV:RUNNER_TOOL_CACHE\phalcon -Force > $null 2>&1
        Copy-Item -Path "$ENV:RUNNER_TOOL_CACHE\phalcon\php_phalcon.dll" -Destination "$ext_dir\php_phalcon.dll"
        Enable-PhpExtension -Extension phalcon -Path $php_dir
    }
    printf "\033[%s;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "32" $tick $extension "Installed and enabled"
}

$tick = ([char]8730)
$domain = 'https://github.com'
$php_dir = 'C:\tools\php'
if($env:RUNNER -eq 'self-hosted') { $php_dir = "$php_dir$version" }
$ext_dir = "$php_dir\ext"
$extension_version = $extension.substring($extension.Length - 1)

if($extension_version -eq '4') {
    if (Test-Path $ext_dir\php_psr.dll) {
        Enable-PhpExtension -Extension psr -Path $php_dir
    } else {
        Install-Phpextension psr -MinimumStability stable -Path $php_dir
    }
}

if(Test-Path $ext_dir\php_phalcon.dll) {
    $phalcon = Get-PhpExtension $ext_dir\php_phalcon.dll
    if($phalcon.Version[0] -eq $extension_version) {
        Enable-PhpExtension -Extension phalcon -Path $php_dir
        printf "\033[%s;1m%s \033[0m\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "32" $tick $extension "Enabled"
    } else {
        Remove-Item $ext_dir\php_phalcon.dll
        Install-Phalcon
    }
} else {
    Install-Phalcon
}