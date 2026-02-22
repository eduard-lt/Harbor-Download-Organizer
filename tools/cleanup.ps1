# Cleanup script to remove ghost startup entries
$ErrorActionPreference = "Stop"

$RegPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$DebugPattern = "*target\debug\harbor-tauri-app.exe*"

Write-Host "Scanning for ghost startup entries in $RegPath..." -ForegroundColor Cyan

try {
    $properties = Get-ItemProperty -Path $RegPath
    $found = $false

    foreach ($name in $properties.PSObject.Properties.Name) {
        if ($name -match "^(PSPath|PSParentPath|PSChildName|PSDrive|PSProvider)$") { continue }

        $value = $properties.$name
        if ($value -like $DebugPattern) {
            Write-Host "Found ghost entry: '$name' -> '$value'" -ForegroundColor Yellow
            Remove-ItemProperty -Path $RegPath -Name $name
            Write-Host "  [REMOVED] Successfully deleted registry key." -ForegroundColor Green
            $found = $true
        }
        # Also check for the specific name the user mentioned if it's not caught by the pattern
        elseif ($name -eq "harbor-tauri-app.exe" -or $name -eq "harbor-tauri-app") {
            Write-Host "Found likely ghost entry by name: '$name' -> '$value'" -ForegroundColor Yellow
            Remove-ItemProperty -Path $RegPath -Name $name
            Write-Host "  [REMOVED] Successfully deleted registry key." -ForegroundColor Green
            $found = $true
        }
    }

    if (-not $found) {
        Write-Host "No ghost entries found." -ForegroundColor Green
    }
}
catch {
    Write-Host "Error accessing registry: $_" -ForegroundColor Red
    exit 1
}
