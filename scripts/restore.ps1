<#
.SYNOPSIS
    Automated restore script for DailyMart POS PostgreSQL database.
.DESCRIPTION
    Restores a database snapshot from a dump or SQL file produced by backup.ps1.
.EXAMPLE
    .\scripts\restore.ps1 -BackupFile .\backups\pos_billing_db_20261020_200000.dump
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$HostName = $(if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }),
    [int]$Port = $(if ($env:DB_PORT) { [int]$env:DB_PORT } else { 5432 }),
    [string]$Database = $(if ($env:DB_NAME) { $env:DB_NAME } else { "pos_billing_db" }),
    [string]$User = $(if ($env:DB_USER) { $env:DB_USER } else { "postgres" }),
    [string]$Password = $(if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "root" })
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file does not exist: $BackupFile"
    exit 1
}

[Environment]::SetEnvironmentVariable("PGPASSWORD", $Password, "Process")

$ext = [System.IO.Path]::GetExtension($BackupFile).ToLower()

if ($ext -eq ".dump") {
    $pgRestore = Get-Command "pg_restore" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
    if (-not $pgRestore) {
        $candidate = Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter "pg_restore.exe" -ErrorAction SilentlyContinue | 
                     Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
        if ($candidate -and (Test-Path $candidate)) { $pgRestore = $candidate }
    }
    if (-not $pgRestore) {
        Write-Error "pg_restore.exe could not be found."
        exit 1
    }

    Write-Host "Restoring $BackupFile to $Database using pg_restore..." -ForegroundColor Cyan
    & $pgRestore -h $HostName -p $Port -U $User -d $Database -c --if-exists -v $BackupFile
    Write-Host "[SUCCESS] Database restored from $BackupFile" -ForegroundColor Green
}
elseif ($ext -eq ".sql") {
    $psql = Get-Command "psql" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
    if (-not $psql) {
        $candidate = Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter "psql.exe" -ErrorAction SilentlyContinue | 
                     Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
        if ($candidate -and (Test-Path $candidate)) { $psql = $candidate }
    }
    if (-not $psql) {
        Write-Error "psql.exe could not be found."
        exit 1
    }

    Write-Host "Restoring $BackupFile to $Database using psql..." -ForegroundColor Cyan
    & $psql -h $HostName -p $Port -U $User -d $Database -v ON_ERROR_STOP=1 -f $BackupFile
    Write-Host "[SUCCESS] Database restored from $BackupFile" -ForegroundColor Green
}
else {
    Write-Error "Unsupported file format ($ext). Expected .dump or .sql"
    exit 1
}
