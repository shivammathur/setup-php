@IF EXIST "%~dp0\bash.exe" (
  "%~dp0\bash.exe"  "%~dp0\..\run-node\run-node" %*
) ELSE (
  @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  bash  "%~dp0\..\run-node\run-node" %*
)