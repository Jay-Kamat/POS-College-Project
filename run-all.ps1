# =====================================================================
# POS & Billing System - Multi-Process Local Runner
# Starts OpenWA WhatsApp Gateway (:2785/:2886) and POSUI Frontend (:3000)
# =====================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting POS & Billing System (OpenWA + POSUI)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start OpenWA Gateway in background job
Write-Host "`n[1/2] Launching OpenWA WhatsApp Gateway (Ports 2785 / 2886)..." -ForegroundColor Yellow
$openWaJob = Start-Job -ScriptBlock {
    Set-Location "d:\Pos Clg Project\OpenWA"
    node src\main.js
}

Start-Sleep -Seconds 2

# 2. Start POSUI React App
Write-Host "`n[2/2] Launching POSUI Frontend (Port 3000)..." -ForegroundColor Green
Set-Location "d:\Pos Clg Project\POSUI"
npm run dev
