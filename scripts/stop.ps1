<#
.SYNOPSIS
  VAIC 2026 - Dung toan bo container (KHONG xoa du lieu/volume).
  Dung .\scripts\start.ps1 de khoi dong lai voi du lieu cu con nguyen.

.USAGE
  .\scripts\stop.ps1
#>

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."
Set-Location $root

Write-Host "==> Dung toan bo container VAIC 2026 (giu nguyen du lieu)..." -ForegroundColor Cyan
docker compose stop
Write-Host "==> Da dung. Du lieu Postgres/upload van con (volume khong bi xoa)." -ForegroundColor Green
