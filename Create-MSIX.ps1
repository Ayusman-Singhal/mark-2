<#
.SYNOPSIS
    Creates an MSIX package for Document Converter application using Windows SDK.

.DESCRIPTION
    This script automates the MSIX package creation process including:
    - Finding Windows SDK tools
    - Preparing the AppLayout directory
    - Copying necessary files and assets
    - Creating and signing the MSIX package
    - Optional installation for testing

.PARAMETER SourceDir
    Path to the built Electron application (default: release\technician-app-win32-x64)

.PARAMETER OutputDir
    Directory where the MSIX package will be created (default: release\msix)

.PARAMETER AppName
    Name of the MSIX package file (default: DocumentConverter)

.PARAMETER Version
    Version number for the package (default: from package.json or 1.0.0.0)

.PARAMETER Sign
    If specified, attempts to sign the package with a certificate

.PARAMETER CertPath
    Path to the PFX certificate file for signing

.PARAMETER CertPassword
    Password for the PFX certificate

.PARAMETER Install
    If specified, installs the package after creation

.PARAMETER Clean
    If specified, cleans up temporary AppLayout directory after packaging

.EXAMPLE
    .\Create-MSIX.ps1
    Creates MSIX package with default settings

.EXAMPLE
    .\Create-MSIX.ps1 -Sign -CertPath ".\MyCert.pfx" -CertPassword "password123"
    Creates and signs the MSIX package

.EXAMPLE
    .\Create-MSIX.ps1 -Install
    Creates and installs the MSIX package for testing

.NOTES
    Requires Windows 10 SDK to be installed
    Run as Administrator if installation is required
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$SourceDir = "release\technician-app-win32-x64",
    
    [Parameter()]
    [string]$OutputDir = "release\msix",
    
    [Parameter()]
    [string]$AppName = "DocumentConverter",
    
    [Parameter()]
    [string]$Version = "",
    
    [Parameter()]
    [switch]$Sign,
    
    [Parameter()]
    [string]$CertPath = "",
    
    [Parameter()]
    [string]$CertPassword = "",
    
    [Parameter()]
    [switch]$Install,
    
    [Parameter()]
    [switch]$Clean
)

# Color output functions
function Write-Status {
    param([string]$Message)
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ " -ForegroundColor Cyan -NoNewline
    Write-Host $Message
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Write-StepHeader {
    param([string]$Message)
    Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host " $Message" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
}

# Find Windows SDK tools
function Find-WindowsSDK {
    Write-StepHeader "Locating Windows SDK"
    
    $sdkBasePath = "C:\Program Files (x86)\Windows Kits\10\bin"
    
    if (-not (Test-Path $sdkBasePath)) {
        Write-ErrorMsg "Windows SDK not found at: $sdkBasePath"
        Write-Info "Please install Windows 10/11 SDK from:"
        Write-Host "  https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/" -ForegroundColor Yellow
        throw "Windows SDK not found"
    }
    
    # Find the latest SDK version
    $sdkVersions = Get-ChildItem $sdkBasePath -Directory | 
                   Where-Object { $_.Name -match '^\d+\.\d+\.\d+\.\d+$' } |
                   Sort-Object Name -Descending
    
    if ($sdkVersions.Count -eq 0) {
        throw "No SDK versions found in $sdkBasePath"
    }
    
    $latestSdk = $sdkVersions[0]
    Write-Status "Found Windows SDK version: $($latestSdk.Name)"
    
    # Check architecture
    $arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
    $toolsPath = Join-Path $latestSdk.FullName $arch
    
    if (-not (Test-Path $toolsPath)) {
        throw "SDK tools not found at: $toolsPath"
    }
    
    $makeappx = Join-Path $toolsPath "makeappx.exe"
    $signtool = Join-Path $toolsPath "signtool.exe"
    
    if (-not (Test-Path $makeappx)) {
        throw "makeappx.exe not found at: $makeappx"
    }
    
    Write-Status "MakeAppx path: $makeappx"
    Write-Status "SignTool path: $signtool"
    
    return @{
        MakeAppx = $makeappx
        SignTool = $signtool
        Version = $latestSdk.Name
    }
}

# Get version from package.json
function Get-AppVersion {
    $packageJsonPath = "package.json"
    
    if (Test-Path $packageJsonPath) {
        try {
            $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
            $version = $packageJson.version
            
            # Convert to 4-part version (e.g., 1.0.0 -> 1.0.0.0)
            $versionParts = $version -split '\.'
            while ($versionParts.Count -lt 4) {
                $versionParts += "0"
            }
            
            $fullVersion = $versionParts[0..3] -join '.'
            Write-Status "Version from package.json: $fullVersion"
            return $fullVersion
        }
        catch {
            Write-Warning "Could not parse package.json, using default version"
        }
    }
    
    return "1.0.0.0"
}

# Prepare AppLayout directory
function Prepare-AppLayout {
    param(
        [string]$Source,
        [string]$LayoutDir
    )
    
    Write-StepHeader "Preparing AppLayout Directory"
    
    # Validate source directory
    $sourcePath = Join-Path $PSScriptRoot $Source
    if (-not (Test-Path $sourcePath)) {
        throw "Source directory not found: $sourcePath"
    }
    
    Write-Status "Source directory: $sourcePath"
    
    # Create AppLayout directory
    if (Test-Path $LayoutDir) {
        Write-Info "Cleaning existing AppLayout directory..."
        Remove-Item $LayoutDir -Recurse -Force
    }
    
    New-Item -ItemType Directory -Path $LayoutDir -Force | Out-Null
    Write-Status "Created AppLayout directory: $LayoutDir"
    
    # Copy application files
    Write-Info "Copying application files..."
    Copy-Item -Path "$sourcePath\*" -Destination $LayoutDir -Recurse -Force
    Write-Status "Application files copied"
    
    # Copy AppxManifest.xml
    $manifestSource = Join-Path $PSScriptRoot "AppxManifest.xml"
    if (-not (Test-Path $manifestSource)) {
        throw "AppxManifest.xml not found in project root"
    }
    
    Copy-Item -Path $manifestSource -Destination $LayoutDir -Force
    Write-Status "AppxManifest.xml copied"
    
    # Create assets directory and copy assets
    $assetsSource = Join-Path $PSScriptRoot "public\assets"
    $assetsDest = Join-Path $LayoutDir "assets"
    
    if (Test-Path $assetsSource) {
        New-Item -ItemType Directory -Path $assetsDest -Force | Out-Null
        Copy-Item -Path "$assetsSource\*" -Destination $assetsDest -Force
        Write-Status "Assets copied"
    } else {
        Write-Warning "Assets directory not found at: $assetsSource"
    }
    
    # Verify required assets
    $requiredAssets = @(
        "StoreLogo.png",
        "Square44x44Logo.png",
        "Square150x150Logo.png",
        "Wide310x150Logo.png",
        "Square71x71Logo.png"
    )
    
    $missingAssets = @()
    foreach ($asset in $requiredAssets) {
        $assetPath = Join-Path $assetsDest $asset
        if (-not (Test-Path $assetPath)) {
            $missingAssets += $asset
        }
    }
    
    if ($missingAssets.Count -gt 0) {
        Write-Warning "Missing required assets:"
        $missingAssets | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
        Write-Info "Package may not display correctly without these assets"
    } else {
        Write-Status "All required assets present"
    }
    
    return $LayoutDir
}

# Update manifest version
function Update-ManifestVersion {
    param(
        [string]$ManifestPath,
        [string]$NewVersion
    )
    
    if (-not $NewVersion) {
        return
    }
    
    Write-Info "Updating manifest version to: $NewVersion"
    
    try {
        [xml]$manifest = Get-Content $ManifestPath
        $manifest.Package.Identity.Version = $NewVersion
        $manifest.Save($ManifestPath)
        Write-Status "Manifest version updated"
    }
    catch {
        Write-Warning "Could not update manifest version: $_"
    }
}

# Create MSIX package
function Create-MsixPackage {
    param(
        [string]$MakeAppxPath,
        [string]$LayoutDir,
        [string]$OutputPath
    )
    
    Write-StepHeader "Creating MSIX Package"
    
    # Ensure output directory exists
    $outputDir = Split-Path $OutputPath -Parent
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }
    
    Write-Info "Output package: $OutputPath"
    Write-Info "Running MakeAppx..."
    
    # Run makeappx
    $arguments = @(
        "pack",
        "/d", "`"$LayoutDir`"",
        "/p", "`"$OutputPath`"",
        "/o",
        "/v"
    )
    
    $process = Start-Process -FilePath $MakeAppxPath `
                            -ArgumentList $arguments `
                            -NoNewWindow `
                            -Wait `
                            -PassThru
    
    if ($process.ExitCode -eq 0) {
        Write-Status "MSIX package created successfully"
        
        # Get file size
        $fileInfo = Get-Item $OutputPath
        $sizeInMB = [math]::Round($fileInfo.Length / 1MB, 2)
        Write-Info "Package size: $sizeInMB MB"
        
        return $true
    }
    else {
        Write-ErrorMsg "Failed to create MSIX package (Exit code: $($process.ExitCode))"
        return $false
    }
}

# Sign MSIX package
function Sign-MsixPackage {
    param(
        [string]$SignToolPath,
        [string]$PackagePath,
        [string]$CertPath,
        [string]$CertPassword
    )
    
    Write-StepHeader "Signing MSIX Package"
    
    if (-not (Test-Path $SignToolPath)) {
        Write-ErrorMsg "SignTool not found at: $SignToolPath"
        return $false
    }
    
    if (-not (Test-Path $CertPath)) {
        Write-ErrorMsg "Certificate not found at: $CertPath"
        return $false
    }
    
    Write-Info "Signing with certificate: $CertPath"
    
    $arguments = @(
        "sign",
        "/f", "`"$CertPath`"",
        "/fd", "SHA256"
    )
    
    if ($CertPassword) {
        $arguments += "/p"
        $arguments += $CertPassword
    }
    
    $arguments += "`"$PackagePath`""
    
    $process = Start-Process -FilePath $SignToolPath `
                            -ArgumentList $arguments `
                            -NoNewWindow `
                            -Wait `
                            -PassThru
    
    if ($process.ExitCode -eq 0) {
        Write-Status "Package signed successfully"
        return $true
    }
    else {
        Write-ErrorMsg "Failed to sign package (Exit code: $($process.ExitCode))"
        return $false
    }
}

# Install MSIX package
function Install-MsixPackage {
    param(
        [string]$PackagePath
    )
    
    Write-StepHeader "Installing MSIX Package"
    
    # Check if running as Administrator
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if (-not $isAdmin) {
        Write-Warning "Not running as Administrator"
        Write-Info "Installation may require elevated privileges"
    }
    
    try {
        Write-Info "Installing package: $PackagePath"
        Add-AppxPackage -Path $PackagePath -ErrorAction Stop
        Write-Status "Package installed successfully"
        Write-Info "You can now launch 'Document Converter' from the Start Menu"
        return $true
    }
    catch {
        Write-ErrorMsg "Installation failed: $($_.Exception.Message)"
        
        if ($_.Exception.Message -match "certificate") {
            Write-Warning "Certificate trust issue detected"
            Write-Info "For testing, you may need to:"
            Write-Info "  1. Install the certificate to Trusted Root Certification Authorities"
            Write-Info "  2. Enable Developer Mode in Windows Settings"
        }
        
        return $false
    }
}

# Main execution
try {
    Write-Host "`n╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║         MSIX Package Creator for Document Converter         ║" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
    
    # Find Windows SDK
    $sdk = Find-WindowsSDK
    
    # Get version
    $appVersion = if ($Version) { $Version } else { Get-AppVersion }
    
    # Prepare paths
    $layoutDir = Join-Path $PSScriptRoot "AppLayout"
    $outputPath = Join-Path $PSScriptRoot "$OutputDir\$AppName-$appVersion.msix"
    
    # Prepare AppLayout
    $layoutDir = Prepare-AppLayout -Source $SourceDir -LayoutDir $layoutDir
    
    # Update manifest version
    $manifestPath = Join-Path $layoutDir "AppxManifest.xml"
    Update-ManifestVersion -ManifestPath $manifestPath -NewVersion $appVersion
    
    # Create MSIX package
    $packageCreated = Create-MsixPackage -MakeAppxPath $sdk.MakeAppx `
                                        -LayoutDir $layoutDir `
                                        -OutputPath $outputPath
    
    if (-not $packageCreated) {
        throw "Package creation failed"
    }
    
    # Sign package if requested
    if ($Sign) {
        if (-not $CertPath) {
            Write-Warning "Certificate path not specified, skipping signing"
        }
        else {
            $signed = Sign-MsixPackage -SignToolPath $sdk.SignTool `
                                      -PackagePath $outputPath `
                                      -CertPath $CertPath `
                                      -CertPassword $CertPassword
            
            if (-not $signed) {
                Write-Warning "Package created but not signed"
            }
        }
    }
    
    # Install package if requested
    if ($Install) {
        Install-MsixPackage -PackagePath $outputPath
    }
    
    # Clean up AppLayout if requested
    if ($Clean) {
        Write-Info "Cleaning up AppLayout directory..."
        Remove-Item $layoutDir -Recurse -Force
        Write-Status "AppLayout directory removed"
    }
    
    # Success summary
    Write-StepHeader "Build Complete"
    Write-Status "MSIX package created successfully!"
    Write-Host "`n  Package: " -NoNewline
    Write-Host $outputPath -ForegroundColor Green
    Write-Host "  Version: " -NoNewline
    Write-Host $appVersion -ForegroundColor Green
    
    if (-not $Install) {
        Write-Host "`n  To install: " -NoNewline
        Write-Host "Add-AppxPackage -Path `"$outputPath`"" -ForegroundColor Yellow
    }
    
    Write-Host ""
}
catch {
    Write-Host "`n" -NoNewline
    Write-ErrorMsg "Error: $($_.Exception.Message)"
    Write-Host ""
    exit 1
}
