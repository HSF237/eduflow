# PowerShell Script to download and extract PocketBase binary for Windows
$ErrorActionPreference = "Stop"

$pocketbaseVersion = "0.22.20"
$downloadUrl = "https://github.com/pocketbase/pocketbase/releases/download/v$pocketbaseVersion/pocketbase_${pocketbaseVersion}_windows_amd64.zip"
$targetDir = "$PSScriptRoot\pocketbase"
$zipPath = "$targetDir\pocketbase.zip"

Write-Host "Creating target directory: $targetDir"
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir | Out-Null
}

if (-not (Test-Path "$targetDir\pocketbase.exe")) {
    Write-Host "Downloading PocketBase v$pocketbaseVersion from $downloadUrl..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing

    Write-Host "Extracting PocketBase binary..."
    Expand-Archive -Path $zipPath -DestinationPath $targetDir -Force
    Remove-Item -Path $zipPath -Force
    Write-Host "PocketBase installed successfully at $targetDir\pocketbase.exe!"
} else {
    Write-Host "PocketBase executable already present at $targetDir\pocketbase.exe."
}
