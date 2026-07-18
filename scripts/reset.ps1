<#
.SYNOPSIS
  VAIC 2026 - XOA TOAN BO container + volume (mat het du lieu Postgres/upload da co)
  roi setup lai tu dau. CHI dung khi muon lam sach hoan toan moi truong demo.

.USAGE
  .\scripts\reset.ps1          # se hoi xac nhan truoc khi xoa
  .\scripts\reset.ps1 -Force   # bo qua xac nhan (dung can than)
#>

param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."
Set-Location $root

if (-not $Force) {
  Write-Host "CANH BAO: lenh nay se XOA toan bo du lieu Postgres va file upload hien tai." -ForegroundColor Yellow
  $confirm = Read-Host "Go 'YES' de xac nhan xoa va setup lai tu dau"
  if ($confirm -ne "YES") {
    Write-Host "Da huy. Khong co gi bi xoa." -ForegroundColor Cyan
    exit 0
  }
}

Write-Host "==> Dung va xoa container + volume..." -ForegroundColor Cyan
docker compose down -v

Write-Host "==> Da xoa sach. Chay setup lai tu dau..." -ForegroundColor Cyan
& "$PSScriptRoot\setup.ps1"
