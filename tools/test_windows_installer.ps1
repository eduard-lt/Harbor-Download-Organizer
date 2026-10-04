param([string]$Makensis = "$env:LOCALAPPDATA\tauri\NSIS\makensis.exe")
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$testDir = Join-Path $repo 'target\startup-installer-test'
New-Item -ItemType Directory -Force -Path $testDir | Out-Null
$fixture = 'Software\HarborTests\Installer-' + [guid]::NewGuid().ToString('N')
$hooks = Join-Path $repo 'crates\tauri-app\windows\hooks.nsh'
$testExe = Join-Path $testDir 'capture-test.exe'
$testScript = Join-Path $testDir 'capture-test.nsi'
$script = @'
Unicode true
RequestExecutionLevel user
SilentInstall silent
!include LogicLib.nsh
!define HARBOR_RUN_KEY "__FIXTURE__"
!include "__HOOKS__"
OutFile "__EXE__"
Section
  !insertmacro HARBOR_CAPTURE_STARTUP
  StrCmp $HarborPreviousStartup "none" 0 fail
  WriteRegStr HKCU "${HARBOR_RUN_KEY}" "HarborTray" "C:\Old\harbor-tray.exe"
  !insertmacro HARBOR_CAPTURE_STARTUP
  StrCmp $HarborPreviousStartup "HarborTray" 0 fail
  WriteRegStr HKCU "${HARBOR_RUN_KEY}" "Harbor" '"C:\Old\Harbor.exe" --minimized'
  !insertmacro HARBOR_CAPTURE_STARTUP
  StrCmp $HarborPreviousStartup "Harbor" 0 fail
  DeleteRegValue HKCU "${HARBOR_RUN_KEY}" "Harbor"
  DeleteRegValue HKCU "${HARBOR_RUN_KEY}" "HarborTray"
  StrCmp $HarborPreviousStartup "Harbor" 0 fail
  SetErrorLevel 0
  Quit
fail:
  SetErrorLevel 1
SectionEnd
'@
$script.Replace('__FIXTURE__', $fixture).Replace('__HOOKS__', $hooks).Replace('__EXE__', $testExe) | Set-Content -Encoding utf8 $testScript
try {
    & $Makensis /V2 $testScript
    if ($LASTEXITCODE -ne 0) { throw 'NSIS capture test failed to compile' }
    $process = Start-Process -FilePath $testExe -Wait -PassThru -WindowStyle Hidden
    if ($process.ExitCode -ne 0) { throw 'NSIS startup capture regression failed' }
    $template = Get-Content (Join-Path $repo 'crates\tauri-app\windows\installer.nsi') -Raw
    if ($template -notmatch 'Function \.onInit\s+!insertmacro HARBOR_CAPTURE_STARTUP') { throw 'Startup capture must run at the start of .onInit' }
    if ($template -notmatch 'StrCpy \$R1 "\$R1 /UPDATE" ; Harbor:') { throw 'Replacement must preserve old-install user data' }
    Write-Output 'NSIS startup capture: fresh install, legacy, canonical precedence and uninstall preservation passed.'
} finally {
    if ($fixture -notmatch '^Software\\HarborTests\\Installer-[a-f0-9]{32}$') { throw 'Unsafe fixture cleanup path' }
    [Microsoft.Win32.Registry]::CurrentUser.DeleteSubKeyTree($fixture, $false)
}
