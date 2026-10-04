; Startup migration belongs to installation, not the optional first GUI launch.
!ifndef HARBOR_RUN_KEY
  !define HARBOR_RUN_KEY "Software\Microsoft\Windows\CurrentVersion\Run"
!endif
Var HarborPreviousStartup
!macro HARBOR_CAPTURE_STARTUP
  StrCpy $HarborPreviousStartup "none"
  ReadRegStr $0 HKCU "${HARBOR_RUN_KEY}" "Harbor"
  ${If} $0 != ""
    StrCpy $HarborPreviousStartup "Harbor"
  ${Else}
    ReadRegStr $0 HKCU "${HARBOR_RUN_KEY}" "HarborTray"
    ${If} $0 != ""
      StrCpy $HarborPreviousStartup "HarborTray"
    ${EndIf}
  ${EndIf}
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ExecWait '"$INSTDIR\${MAINBINARYNAME}.exe" --repair-startup $HarborPreviousStartup' $0
  ${If} $0 != 0
    DetailPrint "Harbor startup migration failed (exit $0). Re-enable login startup in Harbor Settings."
    MessageBox MB_OK|MB_ICONEXCLAMATION "Harbor was installed, but its login startup could not be migrated. Open Harbor Settings and re-enable startup." /SD IDOK
    SetErrorLevel 1
  ${EndIf}
!macroend
