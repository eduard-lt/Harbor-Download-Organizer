@echo off
setlocal
echo Installing Harbor...
echo.
if exist harbor-cli.exe (
  harbor-cli.exe tray-install --source "%~dp0harbor-tray.exe"
  if %ERRORLEVEL% NEQ 0 (
    echo tray-install failed with code %ERRORLEVEL%
  ) else (
    echo Harbor tray installed. You can run "%LOCALAPPDATA%\Harbor\harbor-tray.exe".
  )
) else (
  echo harbor-cli.exe not found in extracted folder.
)
echo.
echo Installation finished.
endlocal
