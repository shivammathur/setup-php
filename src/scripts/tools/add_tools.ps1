Function Add-ToolsHelper() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    $tool
  )
  if($tool -eq "codeception") {
    Copy-Item $composer_bin\codecept.bat -Destination $composer_bin\codeception.bat
  } elseif($tool -eq "composer") {
    Edit-ComposerConfig $bin_dir\$tool
  } elseif($tool -eq "cs2pr") {
    (Get-Content $bin_dir/cs2pr).replace('exit(9)', 'exit(0)') | Set-Content $bin_dir/cs2pr
  } elseif($tool -eq "phan") {
    Add-Extension fileinfo >$null 2>&1
    Add-Extension ast >$null 2>&1
  } elseif($tool -eq "phive") {
    Add-Extension xml >$null 2>&1
  } elseif($tool -eq "symfony-cli") {
    Add-ToProfile $current_profile "symfony" "New-Alias symfony $bin_dir\symfony-cli.exe"
    Add-ToProfile $current_profile "symfony_cli" "New-Alias symfony-cli $bin_dir\symfony-cli.exe"
  } elseif($tool -match "vapor-cli") {
    Copy-Item $composer_bin\vapor.bat -Destination $composer_bin\vapor-cli.bat
  } elseif($tool -eq "wp-cli") {
    Copy-Item $bin_dir\wp-cli.bat -Destination $bin_dir\wp.bat
  }
}