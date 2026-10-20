<#
.SYNOPSIS
    Automated backup script for DailyMart POS PostgreSQL database (pos_billing_db).
.DESCRIPTION
    Creates a compressed, consistent snapshot of the PostgreSQL database using pg_dump.
    Output is saved to the backups/ folder with timestamped filenames.
.EXAMPLE
    .\scripts\backup.ps1
    .\scripts\backup.ps1 -Database pos_billing_db -HostName localhost -Port 5432 -User postgres
#>

[CmdletBinding()]
param(
    [string]$HostName = $(if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }),
    [int]$Port = $(if ($env:DB_PORT) { [int]$env:DB_PORT } else { 5432 }),
    [string]$Database = $(if ($env:DB_NAME) { $env:DB_NAME } else { "pos_billing_db" }),
    [string]$User = $(if ($env:DB_USER) { $env:DB_USER } else { "postgres" }),
    [string]$Password = $(if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "root" }),
    [string]$BackupDir = ""
)

$ErrorActionPreference = "Stop"

if (-not $BackupDir) {
    $BackupDir = Join-Path $PSScriptRoot "..\backups"
}

# Ensure output directory exists
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# Locate pg_dump.exe
$pgDump = Get-Command "pg_dump" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $pgDump) {
    $candidate = Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter "pg_dump.exe" -ErrorAction SilentlyContinue | 
                 Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
    if ($candidate -and (Test-Path $candidate)) {
        $pgDump = $candidate
    }
}

if (-not $pgDump) {
    Write-Error "pg_dump.exe could not be found. Please ensure PostgreSQL client tools are installed."
    exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dumpFile = Join-Path $BackupDir "${Database}_${timestamp}.dump"
$sqlFile = Join-Path $BackupDir "${Database}_${timestamp}.sql"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " DailyMart POS Database Backup" -ForegroundColor Cyan
Write-Host " Target DB : $Database on ${HostName}:${Port}" -ForegroundColor Cyan
Write-Host " Output    : $dumpFile" -ForegroundColor Cyan
Write-Host " Using     : $pgDump" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

[Environment]::SetEnvironmentVariable("PGPASSWORD", $Password, "Process")

try {
    # Custom compressed format (suitable for pg_restore)
    & $pgDump -h $HostName -p $Port -U $User -F c -b -f $dumpFile $Database
    
    # Also dump schema and plain SQL for easy inspection/migration
    & $pgDump -h $HostName -p $Port -U $User -F p --clean --if-exists -f $sqlFile $Database

    $dumpSize = (Get-Item $dumpFile).Length / 1MB
    Write-Host "[SUCCESS] Backup completed successfully!" -ForegroundColor Green
    Write-Host " Compressed dump: $dumpFile ($([math]::Round($dumpSize, 2)) MB)" -ForegroundColor Green
    Write-Host " Plain SQL dump : $sqlFile" -ForegroundColor Green
}
catch {
    Write-Error "Backup failed: $_"
    exit 1
}
