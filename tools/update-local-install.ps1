# Quick update script - copies newly built binaries to install location
# Usage: .\tools\update-local-install.ps1

$InstallDir = "$env:LOCALAPPDATA\Harbor"

Write-Host "Updating Harbor installation..." -ForegroundColor Cyan

# Check if binaries exist
if (-not (Test-Path ".\target\release\harbor-cli.exe")) {
    Write-Host "ERROR: harbor-cli.exe not found. Run 'cargo build --release' first." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path ".\target\release\harbor-tray.exe")) {
    Write-Host "ERROR: harbor-tray.exe not found. Run 'cargo build --release' first." -ForegroundColor Red
    exit 1
}

# Create install directory if it doesn't exist
if (-not (Test-Path $InstallDir)) {
    Write-Host "Creating install directory: $InstallDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Stop the tray app if running
Write-Host "Stopping Harbor tray (if running)..." -ForegroundColor Yellow
$processes = Get-Process -Name "harbor-tray" -ErrorAction SilentlyContinue
if ($processes) {
    $processes | Stop-Process -Force
    Start-Sleep -Seconds 1
    Write-Host "  Stopped Harbor tray" -ForegroundColor Green
}

# Copy binaries
Write-Host "Copying binaries..." -ForegroundColor Yellow
Copy-Item ".\target\release\harbor-cli.exe" "$InstallDir\harbor-cli.exe" -Force
Write-Host "  Copied harbor-cli.exe" -ForegroundColor Green

Copy-Item ".\target\release\harbor-tray.exe" "$InstallDir\harbor-tray.exe" -Force
Write-Host "  Copied harbor-tray.exe" -ForegroundColor Green

# Copy icons if they exist
$icons = @("icon_h.ico", "harbor.ico", "harbor-tray.ico")
foreach ($icon in $icons) {
    $sourcePath = ".\assets\$icon"
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath "$InstallDir\$icon" -Force
        Write-Host "  Copied $icon" -ForegroundColor Green
    }
}

# Verify versions
Write-Host ""
Write-Host "Verifying versions..." -ForegroundColor Cyan
$cliVersion = & "$InstallDir\harbor-cli.exe" --version 2>&1
Write-Host "  CLI version: $cliVersion" -ForegroundColor White

Write-Host ""
Write-Host "Update complete!" -ForegroundColor Green
Write-Host "  Install location: $InstallDir" -ForegroundColor Gray
Write-Host ""
Write-Host "To start the tray app, run:" -ForegroundColor Cyan
Write-Host "  Start-Process '$InstallDir\harbor-tray.exe'" -ForegroundColor White
