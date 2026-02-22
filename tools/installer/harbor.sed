[Version]
Class=IEXPRESS
SEDVersion=3

[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=0
UseLongFileName=1
InsideCompressed=1
FriendlyName=%FriendlyName%
TargetName=%TargetName%
AppLaunched=%AppLaunched%
SourceFiles=SourceFiles

[Strings]
FriendlyName=Harbor Installer
TargetName=C:\Users\eduard\Documents\github\Harbor\dist\HarborSetup.exe
AppLaunched=cmd.exe /c setup.cmd
FILE0="harbor-tray.exe"
FILE1="harbor-cli.exe"
FILE2="setup.cmd"
FILE3="icon_h.ico"

[SourceFiles]
SourceFiles0=C:\Users\eduard\Documents\github\Harbor\target\release
SourceFiles1=C:\Users\eduard\Documents\github\Harbor\tools\installer
SourceFiles2=C:\Users\eduard\Documents\github\Harbor\assets

[SourceFiles0]
%FILE0%=
%FILE1%=

[SourceFiles1]
%FILE2%=

[SourceFiles2]
%FILE3%=
