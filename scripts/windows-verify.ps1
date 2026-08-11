[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [switch]$Start
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$webRoot = Join-Path $repoRoot "web"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git for Windows is required. Install it, reopen PowerShell, then run this script again."
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js 22 LTS is required. Install it, reopen PowerShell, then run this script again."
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "npm.cmd was not found with Node.js. Reinstall Node.js 22 LTS, then retry."
}

$nodeMajor = [int]((node --version).TrimStart("v").Split(".")[0])
if ($nodeMajor -lt 20) {
    throw "Node.js 20 or newer is required; Node.js 22 LTS is the pinned recommendation."
}
if (-not (Test-Path (Join-Path $webRoot "package-lock.json"))) {
    throw "web/package-lock.json is missing; this checkout is incomplete."
}

Write-Host "Node $(node --version); npm $(npm.cmd --version); Git $(git --version)"
Push-Location $webRoot
try {
    if (-not $SkipInstall) {
        npm.cmd ci
    }
    npm.cmd run typecheck
    npm.cmd run build
    if ($Start) {
        npm.cmd run dev
    }
} finally {
    Pop-Location
}
