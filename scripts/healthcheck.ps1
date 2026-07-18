<#
.SYNOPSIS
  VAIC 2026 - Kiem tra nhanh trang thai toan bo he thong sau khi start/setup.
  In PASS/FAIL cho tung service; exit code != 0 neu co service FAIL.

.USAGE
  .\scripts\healthcheck.ps1
#>

$results = @()

function Test-Endpoint {
  param([string]$Name, [string]$Url, [int]$TimeoutSec = 5)
  try {
    $resp = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSec -UseBasicParsing
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) {
      return @{ Name = $Name; Status = "PASS"; Detail = "HTTP $($resp.StatusCode)" }
    }
    return @{ Name = $Name; Status = "FAIL"; Detail = "HTTP $($resp.StatusCode)" }
  } catch {
    return @{ Name = $Name; Status = "FAIL"; Detail = $_.Exception.Message }
  }
}

Write-Host "==> VAIC 2026 Health Check" -ForegroundColor Cyan
Write-Host ""

$results += Test-Endpoint -Name "Backend (/api/v1/health)" -Url "http://localhost:3100/api/v1/health"
$results += Test-Endpoint -Name "AI Service (/health)"     -Url "http://localhost:8000/health"
$results += Test-Endpoint -Name "Frontend (/)"             -Url "http://localhost:3001"
$results += Test-Endpoint -Name "Nginx Gateway (/)"        -Url "http://localhost/"

# Postgres: kiem tra qua container healthcheck cua Docker (khong mo port rieng them)
try {
  $pgStatus = docker inspect --format "{{.State.Health.Status}}" vaic-postgres 2>$null
  if ($pgStatus -eq "healthy") {
    $results += @{ Name = "PostgreSQL (docker healthcheck)"; Status = "PASS"; Detail = "healthy" }
  } else {
    $results += @{ Name = "PostgreSQL (docker healthcheck)"; Status = "FAIL"; Detail = "status=$pgStatus" }
  }
} catch {
  $results += @{ Name = "PostgreSQL (docker healthcheck)"; Status = "FAIL"; Detail = $_.Exception.Message }
}

$allPass = $true
foreach ($r in $results) {
  $color = if ($r.Status -eq "PASS") { "Green" } else { "Red" }
  Write-Host ("  [{0}] {1,-32} {2}" -f $r.Status, $r.Name, $r.Detail) -ForegroundColor $color
  if ($r.Status -ne "PASS") { $allPass = $false }
}

Write-Host ""
if ($allPass) {
  Write-Host "==> TAT CA PASS. He thong san sang demo." -ForegroundColor Green
  exit 0
} else {
  Write-Host "==> CO SERVICE FAIL. Xem 'docker compose logs <service>' de biet chi tiet." -ForegroundColor Red
  exit 1
}
