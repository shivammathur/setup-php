# Variables
$composer_home = "$env:APPDATA\Composer"
$composer_bin = "$composer_home\vendor\bin"
$composer_json = "$composer_home\composer.json"
$composer_lock = "$composer_home\composer.lock"

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
    Write-Error "Could not download composer" -ErrorAction Stop
  }
  New-Item -ItemType Directory -Path $composer_bin -Force > $null 2>&1
  if (-not(Test-Path $composer_json)) {
    Set-Content -Path $composer_json -Value "{}"
  }
  Set-ComposerEnv
  Add-Path $composer_bin
  Set-ComposerAuth
}

# Function to setup authentication in composer.
Function Set-ComposerAuth() {
  if(Test-Path env:COMPOSER_AUTH_JSON) {
    if(Test-Json -JSON $env:COMPOSER_AUTH_JSON) {
      Set-Content -Path $composer_home\auth.json -Value $env:COMPOSER_AUTH_JSON
    } else {
      Add-Log "$cross" "composer" "Could not parse COMPOSER_AUTH_JSON as valid JSON"
    }
  }
  $composer_auth = @()
  if(Test-Path env:PACKAGIST_TOKEN) {
    $composer_auth += '"http-basic": {"repo.packagist.com": { "username": "token", "password": "' + $env:PACKAGIST_TOKEN + '"}}'
  }
  if(-not(Test-Path env:GITHUB_TOKEN) -and (Test-Path env:COMPOSER_TOKEN)) {
    $env:GITHUB_TOKEN = $env:COMPOSER_TOKEN
  }
  if (Test-Path env:GITHUB_TOKEN) {
    $composer_auth += '"github-oauth": {"github.com": "' + $env:GITHUB_TOKEN + '"}'
  }
  if($composer_auth.length) {
    Add-Env COMPOSER_AUTH ('{' + ($composer_auth -join ',') + '}')
  }
}

# Function to set composer environment variables.
Function Set-ComposerEnv() {
  if ($env:COMPOSER_PROCESS_TIMEOUT) {
    (Get-Content $src\configs\composer.env -Raw) -replace '(?m)^COMPOSER_PROCESS_TIMEOUT=.*$', "COMPOSER_PROCESS_TIMEOUT=$env:COMPOSER_PROCESS_TIMEOUT" | Set-Content $src\configs\composer.env
  }
  Add-EnvPATH $src\configs\composer.env
}

# Function to extract tool version.
Function Get-ToolVersion() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    $tool,
    [Parameter(Position = 1, Mandatory = $false)]
    $param
  )
  $alp = "[a-zA-Z0-9\.]"
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
  if($null -ne $param) {
    return . $tool $param 2> $null | ForEach-Object { $_ -replace "composer $version_regex", '' } | Select-String -Pattern $version_regex | Select-Object -First 1 | ForEach-Object { $_.matches.Value }
  }
}

# Helper function to configure tools.
Function Add-ToolsHelper() {
  Param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateNotNull()]
    $tool
  )
  $extensions = @();
  if($tool -eq "box") {
    $extensions += @('iconv', 'mbstring', 'phar', 'sodium')
  } elseif($tool -eq "codeception") {
    $extensions += @('json', 'mbstring')
    Copy-Item $env:codeception_bin\codecept.bat -Destination $env:codeception_bin\codeception.bat
  } elseif($tool -eq "composer") {
    Edit-ComposerConfig $bin_dir\$tool
  } elseif($tool -eq "cs2pr") {
    (Get-Content $bin_dir/cs2pr).replace('exit(9)', 'exit(0)') | Set-Content $bin_dir/cs2pr
  } elseif($tool -eq "deployer") {
    if(Test-Path $composer_bin\deployer.phar.bat) {
      Copy-Item $composer_bin\deployer.phar.bat -Destination $composer_bin\dep.bat
    }
    if(Test-Path $composer_bin\dep.bat) {
      Copy-Item $composer_bin\dep.bat -Destination $composer_bin\deployer.bat
    }
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
    $urls,
    [Parameter(Position = 1, Mandatory = $true)]
    [ValidateNotNull()]
    $tool,
    [Parameter(Position = 2, Mandatory = $false)]
    $ver_param
  )
  if (Test-Path $bin_dir\$tool) {
    Copy-Item $bin_dir\$tool -Destination $bin_dir\$tool.old -Force
  }
  $tool_path = "$bin_dir\$tool"
  foreach ($url in $urls){
    if (($url | Split-Path -Extension) -eq ".exe") {
      $tool_path = "$tool_path.exe"
    }
    try {
      $status_code = (Invoke-WebRequest -Passthru -Uri $url -OutFile $tool_path).StatusCode
    } catch {
      if($url -match '.*github.com.*releases.*latest.*') {
        try {
          $url = $url.replace("releases/latest/download", "releases/download/" + ([regex]::match((Get-File -Url ($url.split('/release')[0] + "/releases")).Content, "([0-9]+\.[0-9]+\.[0-9]+)/" + ($url.Substring($url.LastIndexOf("/") + 1))).Groups[0].Value).split('/')[0])
          $status_code = (Invoke-WebRequest -Passthru -Uri $url -OutFile $tool_path).StatusCode
        } catch { }
      }
    }
    if($status_code -eq 200 -and (Test-Path $tool_path)) {
      break
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

Function Add-ComposerToolHelper() {
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
  $tool_version = $release.split(':')[1]
  if($NULL -eq $tool_version) {
    $tool_version = '*'
  }
  if($scope -eq 'global') {
    if(Test-Path $composer_lock) {
      Remove-Item -Path $composer_lock -Force
    }
    if((composer global show $prefix$tool $tool_version -a 2>&1 | findstr '^type *: *composer-plugin') -and ($composer_args -ne '')) {
      composer global config --no-plugins allow-plugins."$prefix$tool" true >$null 2>&1
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
      Set-Content -Path $scoped_dir\composer.json -Value "{}"
      if((composer show $prefix$tool $tool_version -d $unix_scoped_dir -a 2>&1 | findstr '^type *: *composer-plugin') -and ($composer_args -ne '')) {
        composer config -d $unix_scoped_dir --no-plugins allow-plugins."$prefix$tool" true >$null 2>&1
      }
      composer require $prefix$release -d $unix_scoped_dir $composer_args >$null 2>&1
    }
    [System.Environment]::SetEnvironmentVariable(($tool.replace('-', '_') + '_bin'), "$scoped_dir\vendor\bin")
    Add-Path $scoped_dir\vendor\bin
    return composer show $prefix$tool -d $unix_scoped_dir 2>&1 | findstr '^versions'
  }
}

# Function to setup a tool using composer.
Function Add-ComposerTool() {
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
  $composer_args = ""
  if($composer_version.split('.')[0] -ne "1") {
    $composer_args = "--ignore-platform-req=ext-*"
    if($tool -match "prestissimo|composer-prefetcher") {
      Write-Output "::warning:: Skipping $tool, as it does not support Composer $composer_version. Specify composer:v1 in tools to use $tool"
      Add-Log $cross $tool "Skipped"
      Return
    }
  }
  Enable-PhpExtension -Extension curl, mbstring, openssl -Path $php_dir
  $log = Add-ComposerToolHelper $tool $release $prefix $scope $composer_args
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
