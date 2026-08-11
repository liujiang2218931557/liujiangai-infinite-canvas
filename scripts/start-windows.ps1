param(
    [switch]$NoBrowser
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$webRoot = Join-Path $projectRoot "web"
$canvasUrl = "http://localhost:3000/canvas"

function Test-CanvasServer {
    try {
        return (Test-NetConnection -ComputerName "127.0.0.1" -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue)
    } catch {
        return $false
    }
}

if (-not (Test-CanvasServer)) {
    Start-Process powershell.exe -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command",
        "Set-Location -LiteralPath '$webRoot'; npm.cmd run dev"
    )

    for ($attempt = 0; $attempt -lt 30 -and -not (Test-CanvasServer); $attempt += 1) {
        Start-Sleep -Seconds 1
    }
}

if (-not $NoBrowser) {
    Start-Process $canvasUrl
}
