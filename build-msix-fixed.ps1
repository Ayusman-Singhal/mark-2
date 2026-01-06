# MSIX Package Build Script for Sarang
# Run this script from the Vajra project root directory

param(
    [string]$OutputPath = ".\msix\Sarang.msix",
    [string]$CertificatePath = "",
    [string]$CertificatePassword = ""
)

$ErrorActionPreference = "Stop"

# Windows SDK paths
$SdkVersion = "10.0.26100.0"
$SdkPath = "C:\Program Files (x86)\Windows Kits\10\bin\$SdkVersion\x64"
$MakeAppx = "$SdkPath\makeappx.exe"
$SignTool = "$SdkPath\signtool.exe"

# Validate SDK installation
if (-not (Test-Path $MakeAppx)) {
    # Try to find any available SDK version
    $SdkBasePath = "C:\Program Files (x86)\Windows Kits\10\bin"
    $AvailableVersions = Get-ChildItem -Path $SdkBasePath -Directory | Where-Object { $_.Name -match "^\d+\.\d+\.\d+\.\d+$" } | Sort-Object Name -Descending
    
    if ($AvailableVersions.Count -gt 0) {
        $SdkVersion = $AvailableVersions[0].Name
        $SdkPath = "$SdkBasePath\$SdkVersion\x64"
        $MakeAppx = "$SdkPath\makeappx.exe"
        $SignTool = "$SdkPath\signtool.exe"
        Write-Host "Using Windows SDK version: $SdkVersion" -ForegroundColor Yellow
    } else {
        Write-Error "Windows SDK not found. Please install Windows 10/11 SDK from https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/"
        exit 1
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Sarang MSIX Package Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build the Electron app
Write-Host "[1/5] Building Electron application..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build Electron application"
    exit 1
}

# Step 2: Package with electron-builder or copy files
Write-Host "[2/5] Preparing package layout..." -ForegroundColor Green

$PackageLayout = ".\package-layout"

# Clean previous build - rename if locked, then delete
if (Test-Path $PackageLayout) {
    $BackupPath = ".\package-layout.old"
    if (Test-Path $BackupPath) {
        Remove-Item -Path $BackupPath -Recurse -Force -ErrorAction SilentlyContinue
    }
    Rename-Item -Path $PackageLayout -NewName "package-layout.old" -Force -ErrorAction SilentlyContinue
    Start-Job -ScriptBlock { param($p) Start-Sleep -Seconds 5; Remove-Item -Path $p -Recurse -Force -ErrorAction SilentlyContinue } -ArgumentList (Resolve-Path $BackupPath -ErrorAction SilentlyContinue).Path | Out-Null
}
New-Item -Path $PackageLayout -ItemType Directory -Force | Out-Null

# Copy manifest
Copy-Item -Path ".\msix\AppxManifest.xml" -Destination $PackageLayout

# Copy assets
Copy-Item -Path ".\msix\assets" -Destination $PackageLayout -Recurse

# Copy PowerShell scripts (IMPORTANT: These must be outside the asar archive!)
Write-Host "Copying PowerShell scripts..." -ForegroundColor Gray
$ScriptsSource = ".\src\scripts"
$ScriptsDest = "$PackageLayout\scripts"
if (Test-Path $ScriptsSource) {
    New-Item -Path $ScriptsDest -ItemType Directory -Force | Out-Null
    Copy-Item -Path "$ScriptsSource\*" -Destination $ScriptsDest -Recurse -Force
    Write-Host "  PowerShell scripts copied to: $ScriptsDest" -ForegroundColor Green
} else {
    Write-Host "  WARNING: Scripts source not found at: $ScriptsSource" -ForegroundColor Yellow
}

# Copy Electron app files
$ElectronAppPath = ".\build\win-unpacked"
if (Test-Path $ElectronAppPath) {
    Write-Host "Copying Electron app files..." -ForegroundColor Gray
    Get-ChildItem -Path $ElectronAppPath | Copy-Item -Destination $PackageLayout -Recurse -Force
}

# Note: You need to build your Electron app into a portable executable first
# Using electron-packager or electron-builder
Write-Host ""
Write-Host "NOTE: You need to copy your built Electron app files to: $PackageLayout" -ForegroundColor Yellow
Write-Host "      This includes the main exe and all supporting files." -ForegroundColor Yellow
Write-Host ""

# Check for app files (check for 'Nemi Sarang.exe' as per AppxManifest)
$ExpectedExe = "$PackageLayout\Nemi Sarang.exe"
if (-not (Test-Path $ExpectedExe)) {
    # Also check for SARANG.exe as fallback
    $ExpectedExe = "$PackageLayout\SARANG.exe"
}
if (-not (Test-Path $ExpectedExe)) {
    Write-Host "Please ensure your built application is in the package-layout folder." -ForegroundColor Yellow
    Write-Host "Expected structure:" -ForegroundColor Yellow
    Write-Host "  package-layout/" -ForegroundColor Gray
    Write-Host "    ├── AppxManifest.xml" -ForegroundColor Gray
    Write-Host "    ├── Nemi Sarang.exe (main executable)" -ForegroundColor Gray
    Write-Host "    ├── resources/" -ForegroundColor Gray
    Write-Host "    ├── locales/" -ForegroundColor Gray
    Write-Host "    ├── scripts/" -ForegroundColor Cyan
    Write-Host "    │   └── powershell/" -ForegroundColor Cyan
    Write-Host "    │       ├── Get-ActiveWindow.ps1" -ForegroundColor Cyan
    Write-Host "    │       ├── Get-AllApplications.ps1" -ForegroundColor Cyan
    Write-Host "    │       ├── Get-BrowserUrls.ps1" -ForegroundColor Cyan
    Write-Host "    │       ├── Trace-RunningApps.ps1" -ForegroundColor Cyan
    Write-Host "    │       └── ... (other scripts)" -ForegroundColor Cyan
    Write-Host "    └── assets/" -ForegroundColor Gray
    Write-Host "        ├── StoreLogo.png" -ForegroundColor Gray
    Write-Host "        ├── Square44x44Logo.png" -ForegroundColor Gray
    Write-Host "        ├── Square71x71Logo.png" -ForegroundColor Gray
    Write-Host "        ├── Square150x150Logo.png" -ForegroundColor Gray
    Write-Host "        ├── Wide310x150Logo.png" -ForegroundColor Gray
    Write-Host "        ├── Square310x310Logo.png" -ForegroundColor Gray
    Write-Host "        └── SplashScreen.png" -ForegroundColor Gray
    Write-Host ""
    Write-Host "IMPORTANT: The 'scripts/powershell/' folder is required for app tracking!" -ForegroundColor Red
    
    $continue = Read-Host "Do you want to continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
}

# Step 3: Validate assets
Write-Host "[3/5] Checking required assets..." -ForegroundColor Green

$RequiredAssets = @(
    @{ Name = "StoreLogo.png"; Size = "50x50" },
    @{ Name = "Square44x44Logo.png"; Size = "44x44" },
    @{ Name = "Square71x71Logo.png"; Size = "71x71" },
    @{ Name = "Square150x150Logo.png"; Size = "150x150" },
    @{ Name = "Wide310x150Logo.png"; Size = "310x150" },
    @{ Name = "Square310x310Logo.png"; Size = "310x310" },
    @{ Name = "SplashScreen.png"; Size = "620x300" }
)

$MissingAssets = @()
foreach ($asset in $RequiredAssets) {
    $assetPath = "$PackageLayout\assets\$($asset.Name)"
    if (-not (Test-Path $assetPath)) {
        $MissingAssets += "$($asset.Name) ($($asset.Size))"
    }
}

if ($MissingAssets.Count -gt 0) {
    Write-Host "Missing assets:" -ForegroundColor Yellow
    foreach ($missing in $MissingAssets) {
        Write-Host "  - $missing" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please create the missing PNG assets in: .\msix\assets\" -ForegroundColor Yellow
}

# Step 4: Create MSIX package
Write-Host "[4/5] Creating MSIX package..." -ForegroundColor Green

# Remove existing package
if (Test-Path $OutputPath) {
    Remove-Item -Path $OutputPath -Force
}

& $MakeAppx pack /d $PackageLayout /p $OutputPath /o /v

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create MSIX package"
    exit 1
}

Write-Host "MSIX package created: $OutputPath" -ForegroundColor Green

# Step 5: Sign the package (optional)
if ($CertificatePath -and (Test-Path $CertificatePath)) {
    Write-Host "[5/5] Signing MSIX package..." -ForegroundColor Green
    
    $signArgs = @(
        "sign",
        "/f", $CertificatePath,
        "/fd", "SHA256",
        "/t", "http://timestamp.digicert.com"
    )
    
    if ($CertificatePassword) {
        $signArgs += "/p"
        $signArgs += $CertificatePassword
    }
    
    $signArgs += $OutputPath
    
    & $SignTool @signArgs
    
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Failed to sign MSIX package. Package created but unsigned."
    } else {
        Write-Host "Package signed successfully!" -ForegroundColor Green
    }
} else {
    Write-Host "[5/5] Skipping signing (no certificate provided)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To sign for Microsoft Store submission, you'll need to:" -ForegroundColor Yellow
    Write-Host "  1. Use the Partner Center to generate a signing certificate, or" -ForegroundColor Gray
    Write-Host "  2. Upload the unsigned package to Partner Center for signing" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Package: $OutputPath" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Test locally: Add-AppxPackage -Path `"$OutputPath`"" -ForegroundColor Gray
Write-Host "  2. Upload to Partner Center: https://partner.microsoft.com/dashboard" -ForegroundColor Gray
Write-Host ""

