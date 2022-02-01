# Variables
$composer_bin = "$env:APPDATA\Composer\vendor\bin"
$composer_json = "$env:APPDATA\Composer\composer.json"
$composer_lock = "$env:APPDATA\Composer\composer.lock"

# Function to configure composer.
Function Edit-ComposerConfig() {
  Param(
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $tool_path
  )
  Copy-Item $tool_path -Destination "$tool_path.phar"
  php -r "try {`$p=new Phar('$tool_path.phar', 0);exit(0);} catch(Exception `$e) {exit(1);}"
  if ($? -eq $False) {
    Add-Log "$cross" "composer" "Could not download composer"
    exit 1;
  }
  New-Item -ItemType Directory -Path $composer_bin -Force > $null 2>&1
  if (-not(Test-Path $composer_json)) {
    Set-Content -Path $composer_json -Value "{}"
  }
  Add-EnvPATH $src\configs\composer.env
  Add-Path $composer_bin
  if (Test-Path env:COMPOSER_TOKEN) {
    Add-Env COMPOSER_AUTH ('{"github-oauth": {"github.com": "' + $env:COMPOSER_TOKEN + '"}}')
  }
}

# Function to extract tool version.
Function Get-ToolVersion() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    $tool,
    [Parameter(Position = 1, Mandatory = $true)]
    $param
  )
  $alp = "[a-zA-Z0-9]"
  $version_regex = "[0-9]+((\.{1}$alp+)+)(\.{0})(-$alp+){0,1}"
  if($tool -eq 'composer') {
    $composer_branch_alias = Select-String -Pattern "const\sBRANCH_ALIAS_VERSION" -Path $bin_dir\composer -Raw | Select-String -Pattern $version_regex | ForEach-Object { $_.matches.Value }
    if ($composer_branch_alias) {
      $composer_version = $composer_branch_alias + '+' + (Select-String -Pattern "const\sVERSION" -Path $bin_dir\composer -Raw | Select-String -Pattern "[a-zA-Z0-9]+" -AllMatches | ForEach-Object { $_.matches[2].Value })
    } else {
      $composer_version = Select-String -Pattern "const\sVERSION" -Path $bin_dir\composer -Raw | Select-String -Pattern $version_regex | ForEach-Object { $_.matches.Value }
    }
    Set-Variable -Name 'composer_version' -Value $composer_version -Scope Global
    return "$composer_version"
  }
  return . $tool $param 2> $null | ForEach-Object { $_ -replace "composer $version_regex", '' } | Select-String -Pattern $version_regex | Select-Object -First 1 | ForEach-Object { $_.matches.Value }
}

# Helper function to configure tools.
Function Add-ToolsHelper() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    $tool
  )
  $extensions = @();
  if($tool -eq "codeception") {
    $extensions += @('json', 'mbstring')
    Copy-Item $env:codeception_bin\codecept.bat -Destination $env:codeception_bin\codeception.bat
  } elseif($tool -eq "composer") {
    Edit-ComposerConfig $bin_dir\$tool
  } elseif($tool -eq "cs2pr") {
    (Get-Content $bin_dir/cs2pr).replace('exit(9)', 'exit(0)') | Set-Content $bin_dir/cs2pr
  } elseif($tool -eq "phan") {
    $extensions += @('fileinfo', 'ast')
  } elseif($tool -eq "phinx") {
    $extensions += @('mbstring')
  } elseif($tool -eq "phive") {
    $extensions += @('curl', 'mbstring', 'xml')
  } elseif($tool -match "phpc(df|s)") {
    $extensions += @('tokenizer', 'xmlwriter', 'simplexml')
  } elseif($tool -match "php-cs-fixer") {
    $extensions += @('json', 'tokenizer')
  } elseif($tool -eq "phpDocumentor") {
    $extensions+=('ctype', 'hash', 'json', 'fileinfo', 'iconv', 'mbstring', 'simplexml', 'xml')
    Add-Extension fileinfo >$null 2>&1
    Copy-Item $bin_dir\phpDocumentor.bat -Destination $bin_dir\phpdoc.bat
  } elseif($tool -eq "phpunit") {
    $extensions += @('dom', 'json', 'libxml', 'mbstring', 'xml', 'xmlwriter')
  } elseif($tool -eq "phpunit-bridge") {
    $extensions += @('dom', 'pdo', 'tokenizer', 'xmlwriter')
  } elseif($tool -eq "vapor-cli") {
    $extensions += @('fileinfo', 'json', 'mbstring', 'zip', 'simplexml')
    Copy-Item $env:vapor_cli_bin\vapor.bat -Destination $env:vapor_cli_bin\vapor-cli.bat
  } elseif($tool -eq "wp-cli") {
    Copy-Item $bin_dir\wp-cli.bat -Destination $bin_dir\wp.bat
  }
  foreach($extension in $extensions) {
    Add-Extension $extension >$null 2>&1
  }
}

# Function to add tools.
Function Add-Tool() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    $url,
    [Parameter(Position = 1, Mandatory = $true)]
    [ValidateNotNull()]
    $tool,
    [Parameter(Position = 2, Mandatory = $true)]
    [ValidateNotNull()]
    $ver_param
  )
  if (Test-Path $bin_dir\$tool) {
    Copy-Item $bin_dir\$tool -Destination $bin_dir\$tool.old -Force
  }
  if($url.Count -gt 1) {
    $url = $url[0]
  }
  $tool_path = "$bin_dir\$tool"
  if (($url | Split-Path -Extension) -eq ".exe") {
    $tool_path = "$tool_path.exe"
  }
  try {
    Invoke-WebRequest -Uri $url -OutFile $tool_path
  } catch {
    if($url -match '.*github.com.*releases.*latest.*') {
      try {
        $url = $url.replace("releases/latest/download", "releases/download/" + ([regex]::match((Invoke-WebRequest -Uri ($url.split('/release')[0] + "/releases")).Content, "([0-9]+\.[0-9]+\.[0-9]+)/" + ($url.Substring($url.LastIndexOf("/") + 1))).Groups[0].Value).split('/')[0])
        Invoke-WebRequest -Uri $url -OutFile $tool_path
      } catch { }
    }
  }
  if (((Get-ChildItem -Path $bin_dir/* | Where-Object Name -Match "^$tool(.exe|.phar)*$").Count -gt 0)) {
    $bat_content = @()
    $bat_content += "@ECHO off"
    $bat_content += "setlocal DISABLEDELAYEDEXPANSION"
    $bat_content += "SET BIN_TARGET=%~dp0/" + $tool
    $bat_content += "php %BIN_TARGET% %*"
    Set-Content -Path $bin_dir\$tool.bat -Value $bat_content
    Add-ToolsHelper $tool
    Add-ToProfile $current_profile $tool "New-Alias $tool $bin_dir\$tool.bat" >$null 2>&1
    $tool_version = Get-ToolVersion $tool $ver_param
    Add-Log $tick $tool "Added $tool $tool_version"
  } else {
    if($tool -eq "composer") {
      $env:fail_fast = 'true'
    } elseif (Test-Path $bin_dir\$tool.old) {
      Copy-Item $bin_dir\$tool.old -Destination $bin_dir\$tool -Force
    }
    Add-Log $cross $tool "Could not add $tool"
  }
}

Function Add-ComposertoolHelper() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [string]
    $tool,
    [Parameter(Position = 1, Mandatory = $true)]
    [string]
    $release,
    [Parameter(Position = 2, Mandatory = $true)]
    [string]
    $prefix,
    [Parameter(Position = 3, Mandatory = $true)]
    [string]
    $scope,
    [Parameter(Position = 4, Mandatory = $false)]
    [string]
    $composer_args
  )
  if($scope -eq 'global') {
    if(Test-Path $composer_lock) {
      Remove-Item -Path $composer_lock -Force
    }
    composer global require $prefix$release $composer_args >$null 2>&1
    return composer global show $prefix$tool 2>&1 | findstr '^versions'
  } else {
    $release_stream = [System.IO.MemoryStream]::New([System.Text.Encoding]::ASCII.GetBytes($release))
    $scoped_dir_suffix = (Get-FileHash -InputStream $release_stream -Algorithm sha256).Hash
    $scoped_dir = "$composer_bin\_tools\$tool-$scoped_dir_suffix"
    $unix_scoped_dir = $scoped_dir.replace('\', '/')
    if(-not(Test-Path $scoped_dir)) {
      New-Item -ItemType Directory -Force -Path $scoped_dir > $null 2>&1
      composer require $prefix$release -d $unix_scoped_dir $composer_args >$null 2>&1
    }
    [System.Environment]::SetEnvironmentVariable(($tool.replace('-', '_') + '_bin'), "$scoped_dir\vendor\bin")
    Add-Path $scoped_dir\vendor\bin
    return composer show $prefix$tool -d $unix_scoped_dir 2>&1 | findstr '^versions'
  }
}

# Function to setup a tool using composer.
Function Add-Composertool() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $tool,
    [Parameter(Position = 1, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $release,
    [Parameter(Position = 2, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $prefix,
    [Parameter(Position = 3, Mandatory = $true)]
    [ValidateNotNull()]
    [ValidateLength(1, [int]::MaxValue)]
    [string]
    $scope
  )
  if($composer_version.split('.')[0] -ne "1") {
    $composer_args = "--ignore-platform-req=ext-*"
    if($tool -match "prestissimo|composer-prefetcher") {
      Write-Output "::warning:: Skipping $tool, as it does not support Composer $composer_version. Specify composer:v1 in tools to use $tool"
      Add-Log $cross $tool "Skipped"
      Return
    }
  }
  Enable-PhpExtension -Extension curl, mbstring, openssl -Path $php_dir
  $log = Add-ComposertoolHelper $tool $release $prefix $scope $composer_args
  if(Test-Path $composer_bin\composer) {
    Copy-Item -Path "$bin_dir\composer" -Destination "$composer_bin\composer" -Force
  }
  Add-ToolsHelper $tool
  if($log) {
    $tool_version = Get-ToolVersion "Write-Output" "$log"
    Add-Log $tick $tool "Added $tool $tool_version"
  } else {
    Add-Log $cross $tool "Could not setup $tool"
  }
}
