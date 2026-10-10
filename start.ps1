Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Starting Novel Reader on port 3000..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Start-Process "http://localhost:3000"
node server/index.js
