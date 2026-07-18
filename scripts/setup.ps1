<#
.SYNOPSIS
  VAIC 2026 - Setup lan dau: build image, khoi dong Postgres, chay migration + seed,
  roi khoi dong toan bo he thong (Backend, AI Service, Frontend, Nginx).

.USAGE
  cd <thu muc goc CIVICAI>
  .\scripts\setup.ps1
#>

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."
Set-Location $root

Write-Host "==> [1/6] Kiem tra Docker..." -ForegroundColor Cyan
docker version | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Docker chua chay hoac chua cai dat. Mo Docker Desktop roi thu lai." }

Write-Host "==> [2/6] Build Docker image (backend, frontend, ai-service)..." -ForegroundColor Cyan
docker compose --env-file .env.development build
if ($LASTEXITCODE -ne 0) { throw "Docker build that bai. Xem log phia tren." }

Write-Host "==> [3/6] Khoi dong PostgreSQL va cho healthy..." -ForegroundColor Cyan
docker compose --env-file .env.development up -d postgres
docker compose exec postgres sh -c 'until pg_isready -U vaic -d vaic; do sleep 1; done'

Write-Host "==> [4/6] Chay migration + seed (tu host, ket noi qua port 5433)..." -ForegroundColor Cyan
Push-Location "$root\backend"
if (-not (Test-Path node_modules)) {
  Write-Host "    node_modules chua co, chay npm install truoc..." -ForegroundColor Yellow
  npm install
}
$env:DB_HOST = "localhost"
$env:DB_PORT = "5433"
$env:DB_USER = "vaic"
$env:DB_PASSWORD = "vaic_dev_password"
$env:DB_NAME = "vaic"
$env:NODE_ENV = "development"
$env:JWT_SECRET = "vaic-dev-secret-change-me"
npm run migration:run
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Migration that bai. Kiem tra ket noi Postgres." }
Pop-Location

Write-Host "==> [5/6] Khoi dong Backend, AI Service, Frontend, Nginx..." -ForegroundColor Cyan
docker compose --env-file .env.development up -d
if ($LASTEXITCODE -ne 0) { throw "Khoi dong service that bai. Xem 'docker compose logs'." }

Write-Host "==> [6/6] Nap kho tri thuc AI (embedding tu du lieu da seed)..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
try {
  Invoke-RestMethod -Method Post -Uri "http://localhost:8000/ai/ingest" -TimeoutSec 30 | Out-Null
  Write-Host "    Ingest thanh cong." -ForegroundColor Green
} catch {
  Write-Host "    Canh bao: ingest that bai hoac AI Service chua san sang ($($_.Exception.Message)). Thu chay lai: curl -X POST http://localhost:8000/ai/ingest" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==> Setup hoan tat!" -ForegroundColor Green
Write-Host "    Frontend : http://localhost:3001  (hoac http://localhost qua Nginx)"
Write-Host "    Backend  : http://localhost:3100/api/v1"
Write-Host "    AI Service: http://localhost:8000"
Write-Host "    Chay .\scripts\healthcheck.ps1 de kiem tra toan bo trang thai."
