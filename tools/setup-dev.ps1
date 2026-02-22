# Harbor Development Setup Script
# Run this script once after cloning to configure git settings

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Harbor Development Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Set git commit template
Write-Host "Setting up git commit message template..." -ForegroundColor Yellow
git config commit.template .gitmessage
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Git commit template configured" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to configure git commit template" -ForegroundColor Red
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Install Rust: winget install Rustlang.Rustup"
Write-Host "2. Install Python: winget install Python.Python.3.12"
Write-Host "3. Install Poe: pip install poethepoet"
Write-Host "4. Build Harbor: poe build"
Write-Host "5. Run tests: poe test"
Write-Host ""
Write-Host "See docs/QUICK_START.md for detailed setup instructions" -ForegroundColor Cyan
Write-Host ""
