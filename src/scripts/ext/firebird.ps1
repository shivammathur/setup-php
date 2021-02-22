Function Add-Choco() {
  try {
    if($null -eq (Get-Command -Name choco.exe -ErrorAction SilentlyContinue)) {
      # Source: https://docs.chocolatey.org/en-us/choco/setup
      Set-ExecutionPolicy Bypass -Scope Process -Force
      [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
      Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
    }
  } catch { }
}

Function Add-Firebird() {
  Add-Choco > $null 2>&1
  choco install firebird -params '/ClientAndDevTools' -y --force > $null 2>&1
  if((Get-ChildItem $env:ProgramFiles\**\**\fbclient.dll | Measure-Object).Count -eq 1) {
    Add-Extension pdo_firebird
  } else {
    Add-Log $cross pdo_firebird "Could not install pdo_firebird on PHP $( $installed.FullVersion )"
  }
}