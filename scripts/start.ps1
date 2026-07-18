<#
.SYNOPSIS
  VAIC 2026 - Khoi dong lai he thong da duoc setup truoc do (khong build lai,
  khong chay lai migration). Dung cho lan chay tiep theo sau setup.ps1.

.USAGE
  .\scripts\start.ps1
#>

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."
Set-Location $root

Write-Host "==> Khoi dong VAIC 2026 (postgres, backend, ai-service, frontend, nginx)..." -ForegroundColor Cyan
docker compose --env-file .env.development up -d
if ($LASTEXITCODE -ne 0) { throw "Khoi dong that bai. Xem 'docker compose logs'." }

Write-Host "==> Da khoi dong. Kiem tra trang thai:" -ForegroundColor Green
docker compose ps
Write-Host ""
Write-Host "Chay .\scripts\healthcheck.ps1 de xac nhan tung service da san sang."
