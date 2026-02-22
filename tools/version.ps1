# Version management script for Harbor
# Usage: .\tools\version.ps1 [show|bump-patch|bump-minor|bump-major]

param(
    [Parameter(Position = 0)]
    [ValidateSet("show", "refresh", "bump-patch", "bump-minor", "bump-major", "git-release")]
    [string]$Action = "show"
)

$RootDir = Split-Path -Parent $PSScriptRoot
$CargoToml = Join-Path $RootDir "Cargo.toml"
$PyProjectToml = Join-Path $RootDir "pyproject.toml"

function Get-Version {
    $content = Get-Content $CargoToml -Raw
    if ($content -match 'version\s*=\s*"([^"]+)"') {
        return $Matches[1]
    }
    throw "Version not found in Cargo.toml"
}


function Update-Poe-Help {
    param([string]$CurrentVersion)
    
    $parts = $CurrentVersion -split '\.'
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    $patch = [int]$parts[2]
    
    $nextPatch = "$major.$minor.$($patch + 1)"
    $nextMinor = "$major.$($minor + 1).0"
    $nextMajor = "$($major + 1).0.0"
    
    $content = Get-Content $PyProjectToml -Raw
    
    # Update bump-patch help
    $content = $content -replace 'help = "Bump patch version \(.*?\)"', "help = `"Bump patch version ($CurrentVersion -> $nextPatch)`""
    # Update bump-minor help
    $content = $content -replace 'help = "Bump minor version \(.*?\)"', "help = `"Bump minor version ($CurrentVersion -> $nextMinor)`""
    # Update bump-major help
    $content = $content -replace 'help = "Bump major version \(.*?\)"', "help = `"Bump major version ($CurrentVersion -> $nextMajor)`""
    
    Set-Content $PyProjectToml $content -NoNewline
    Write-Host "  - pyproject.toml (updated help strings)" -ForegroundColor Gray
}

function Set-Version {
    param([string]$NewVersion)
    
    # Update Cargo.toml
    $cargoContent = Get-Content $CargoToml -Raw
    $cargoContent = $cargoContent -replace '(version\s*=\s*")[^"]+(")', "`${1}$NewVersion`$2"
    Set-Content $CargoToml $cargoContent -NoNewline
    
    # Update pyproject.toml (version field)
    $pyContent = Get-Content $PyProjectToml -Raw
    $pyContent = $pyContent -replace '(version\s*=\s*")[^"]+(")', "`${1}$NewVersion`$2"
    Set-Content $PyProjectToml $pyContent -NoNewline
    
    Write-Host "Updated version to $NewVersion" -ForegroundColor Green
    Write-Host "  - Cargo.toml (workspace)" -ForegroundColor Gray
    Write-Host "  - pyproject.toml (version)" -ForegroundColor Gray

    # Update InfoPage.tsx
    $InfoPage = Join-Path $RootDir "packages\ui\src\pages\InfoPage.tsx"
    if (Test-Path $InfoPage) {
        $infoContent = Get-Content $InfoPage -Raw
        # Replace "Version X.Y.Z" with "Version $NewVersion"
        if ($infoContent -match 'Version \d+\.\d+\.\d+') {
            $infoContent = $infoContent -replace 'Version \d+\.\d+\.\d+', "Version $NewVersion"
            Set-Content $InfoPage $infoContent -NoNewline
            Write-Host "  - packages\ui\src\pages\InfoPage.tsx" -ForegroundColor Gray
        }
        else {
            Write-Host "  ! Version string not found in InfoPage.tsx" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "  ! InfoPage.tsx not found" -ForegroundColor Yellow
    }

    # Update tauri.conf.json
    $TauriConf = Join-Path $RootDir "crates\tauri-app\tauri.conf.json"
    if (Test-Path $TauriConf) {
        $tauriContent = Get-Content $TauriConf -Raw
        # Replace "version": "X.Y.Z" with "version": "$NewVersion"
        if ($tauriContent -match '"version":\s*"[^"]+"') {
            $tauriContent = $tauriContent -replace '"version":\s*"[^"]+"', "`"version`": `"$NewVersion`""
            Set-Content $TauriConf $tauriContent -NoNewline
            Write-Host "  - crates\tauri-app\tauri.conf.json" -ForegroundColor Gray
        }
        else {
            Write-Host "  ! Version string not found in tauri.conf.json" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "  ! tauri.conf.json not found" -ForegroundColor Yellow
    }

    # Update packages/ui/package.json
    $UiPackageJson = Join-Path $RootDir "packages\ui\package.json"
    if (Test-Path $UiPackageJson) {
        $uiContent = Get-Content $UiPackageJson -Raw
        # Replace "version": "X.Y.Z" with "version": "$NewVersion"
        if ($uiContent -match '"version":\s*"[^"]+"') {
            $uiContent = $uiContent -replace '"version":\s*"[^"]+"', "`"version`": `"$NewVersion`""
            Set-Content $UiPackageJson $uiContent -NoNewline
            Write-Host "  - packages\ui\package.json" -ForegroundColor Gray
        }
        else {
            Write-Host "  ! Version string not found in packages/ui/package.json" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "  ! packages/ui/package.json not found" -ForegroundColor Yellow
    }

    # Update Poe help strings
    Update-Poe-Help $NewVersion
}

function Bump-Version {
    param([string]$BumpType)
    
    $current = Get-Version
    $parts = $current -split '\.'
    
    if ($parts.Count -ne 3) {
        throw "Invalid version format: $current"
    }
    
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    $patch = [int]$parts[2]
    
    switch ($BumpType) {
        "major" { $newVersion = "$($major + 1).0.0" }
        "minor" { $newVersion = "$major.$($minor + 1).0" }
        "patch" { $newVersion = "$major.$minor.$($patch + 1)" }
    }
    
    Set-Version $newVersion
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Review changes: git diff" -ForegroundColor White
    Write-Host "  2. Commit: git commit -am 'chore: bump version to $newVersion'" -ForegroundColor White
    Write-Host "  3. Release: poe git-release" -ForegroundColor White
}

function Git-Release {
    $version = Get-Version
    $tagName = "v$version"
    
    Write-Host "Creating git tag: $tagName" -ForegroundColor Cyan
    git tag $tagName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Pushing tag to origin..." -ForegroundColor Cyan
        git push origin $tagName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully pushed tag $tagName" -ForegroundColor Green
        }
        else {
            Write-Host "Failed to push tag" -ForegroundColor Red
        }
    }
    else {
        Write-Host "Failed to create tag (it might already exist)" -ForegroundColor Red
    }
}

# Main execution
switch ($Action) {
    "show" {
        $version = Get-Version
        Write-Host "Current version: $version" -ForegroundColor Cyan
    }
    "refresh" {
        $version = Get-Version
        Write-Host "Refreshing version info for: $version" -ForegroundColor Cyan
        Set-Version $version # Re-run set version to ensure all files are synced
    }
    "bump-patch" {
        Bump-Version "patch"
    }
    "bump-minor" {
        Bump-Version "minor"
    }
    "bump-major" {
        Bump-Version "major"
    }
    "git-release" {
        Git-Release
    }
}
