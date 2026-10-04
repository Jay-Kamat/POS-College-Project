# =====================================================================
# POS & Billing System - Multi-Process Local Runner
# Starts Backend API (:5000), OpenWA Gateway (:2785/:2886), and POSUI (:3000)
# =====================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting POS & Billing System (Backend + OpenWA + POSUI)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Backend REST API in background job
Write-Host "`n[1/3] Launching Node.js Backend REST API (Port 5000)..." -ForegroundColor Magenta
$backendJob = Start-Job -ScriptBlock {
    Set-Location "d:\Pos Clg Project\Backend"
    node server.js
}

Start-Sleep -Seconds 1

# 2. Start OpenWA Gateway in background job
Write-Host "`n[2/3] Launching OpenWA WhatsApp Gateway (Ports 2785 / 2886)..." -ForegroundColor Yellow
$openWaJob = Start-Job -ScriptBlock {
    Set-Location "d:\Pos Clg Project\OpenWA"
    node src\main.js
}

Start-Sleep -Seconds 2

# 3. Start POSUI React App
Write-Host "`n[3/3] Launching POSUI Frontend (Port 3000)..." -ForegroundColor Green
Set-Location "d:\Pos Clg Project\POSUI"
npm run dev
