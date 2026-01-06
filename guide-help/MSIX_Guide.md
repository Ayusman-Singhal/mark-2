# MSIX Package Creation Guide

## Summary

This guide covers creating MSIX packages using the Windows SDK, focusing on the AppxManifest.xml configuration and the packaging process. MSIX is Microsoft's modern application packaging format that provides reliable installation, uninstallation, and updating capabilities.

## What is MSIX?

MSIX is a Windows app package format that provides a modern packaging experience to all Windows apps. It combines the best features of MSI, .appx, App-V, and ClickOnce to provide a reliable, secure, and efficient packaging solution.

### Key Benefits:
- **Reliable Installation/Uninstallation**: Clean removal without registry leftovers
- **Security**: Apps run in a container with controlled access
- **Updates**: Differential updates reduce download size
- **Backward Compatibility**: Works on Windows 10 version 1709 and later
- **Store Distribution**: Can be distributed through Microsoft Store

---

## AppxManifest.xml Guide

The `AppxManifest.xml` file is the heart of your MSIX package. It defines your application's identity, capabilities, and visual elements.

### Basic Structure

```xml
<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
         xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
         IgnorableNamespaces="uap rescap">
  
  <!-- Package Identity -->
  <Identity />
  
  <!-- Package Properties -->
  <Properties />
  
  <!-- Dependencies -->
  <Dependencies />
  
  <!-- Resources -->
  <Resources />
  
  <!-- Applications -->
  <Applications />
  
  <!-- Capabilities -->
  <Capabilities />
  
</Package>
```

### 1. Package Identity

The `<Identity>` element uniquely identifies your package:

```xml
<Identity Name="Technican.PC-Troubleshooter"
          Publisher="CN=BAA8767D-4FEA-4F18-A470-55D2F92BCF77"
          Version="1.0.0.0" />
```

**Key Attributes:**
- `Name`: Unique package name (reverse domain notation recommended)
- `Publisher`: Certificate subject name (CN= format)
- `Version`: Four-part version number (Major.Minor.Build.Revision)

### 2. Package Properties

Defines display information and metadata:

```xml
<Properties>
  <DisplayName>PC-Troubleshooter</DisplayName>
  <PublisherDisplayName>Technican</PublisherDisplayName>
  <Description>System diagnostic and repair tool</Description>
  <Logo>assets\StoreLogo.png</Logo>
</Properties>
```

**Elements:**
- `DisplayName`: App name shown to users
- `PublisherDisplayName`: Publisher name shown to users
- `Description`: Brief app description
- `Logo`: Store logo (50x50 pixels)

### 3. Dependencies

Specifies target platform requirements:

```xml
<Dependencies>
  <TargetDeviceFamily Name="Windows.Desktop"
                      MinVersion="10.0.17763.0"
                      MaxVersionTested="10.0.26100.0" />
</Dependencies>
```

**Common Device Families:**
- `Windows.Desktop`: Desktop/laptop computers
- `Windows.Universal`: All Windows 10 devices
- `Windows.Mobile`: Mobile devices (deprecated)

**Version Numbers:**
- `10.0.17763.0`: Windows 10 version 1809
- `10.0.18362.0`: Windows 10 version 1903
- `10.0.19041.0`: Windows 10 version 2004
- `10.0.22000.0`: Windows 11

### 4. Resources

Defines supported languages and regions:

```xml
<Resources>
  <Resource Language="en-US" />
  <Resource Language="es-ES" />
  <Resource Language="fr-FR" />
</Resources>
```

### 5. Applications

The core application definition:

```xml
<Applications>
  <Application Id="App" 
               Executable="PC-Troubleshooter.exe" 
               EntryPoint="Windows.FullTrustApplication">
    
    <uap:VisualElements DisplayName="PC-Troubleshooter"
                        Description="System diagnostic and repair tool"
                        Square44x44Logo="assets\SmallLogo.png"
                        Square150x150Logo="assets\Logo.png"
                        BackgroundColor="transparent">
      
      <uap:DefaultTile Wide310x150Logo="assets\WideLogo.png"
                       Square71x71Logo="assets\SmallLogo_71.png" />
    </uap:VisualElements>
    
  </Application>
</Applications>
```

**Key Attributes:**
- `Id`: Unique application identifier within the package
- `Executable`: Main executable file name
- `EntryPoint`: For Win32 apps, use "Windows.FullTrustApplication"

**Visual Elements:**
- `Square44x44Logo`: App list icon (44x44 pixels)
- `Square150x150Logo`: Start menu tile (150x150 pixels)
- `Wide310x150Logo`: Wide tile (310x150 pixels)
- `Square71x71Logo`: Small tile (71x71 pixels)
- `BackgroundColor`: Tile background color (hex or named color)

### 6. Capabilities

Defines what system resources your app can access:

```xml
<Capabilities>
  <rescap:Capability Name="runFullTrust" />
  <Capability Name="internetClient" />
  <Capability Name="documentsLibrary" />
</Capabilities>
```

**Common Capabilities:**
- `runFullTrust`: Full system access (required for Win32 apps)
- `internetClient`: Internet access
- `documentsLibrary`: Documents folder access
- `picturesLibrary`: Pictures folder access
- `videosLibrary`: Videos folder access
- `musicLibrary`: Music folder access

---

## Required Assets

Your MSIX package needs specific image assets with exact dimensions:

| Asset | Size | Purpose |
|-------|------|---------|
| StoreLogo.png | 50x50 | Store listing |
| Square44x44Logo | 44x44 | App list icon |
| Square150x150Logo | 150x150 | Medium tile |
| Wide310x150Logo | 310x150 | Wide tile |
| Square71x71Logo | 71x71 | Small tile |

**Asset Guidelines:**
- Use PNG format
- Transparent background recommended
- High contrast for visibility
- Follow Microsoft design guidelines

---

## Creating the MSIX Package

### Prerequisites

1. **Windows SDK**: Install Windows 10/11 SDK
2. **Project Structure**: Organize files in a single directory
3. **Manifest**: Create properly formatted AppxManifest.xml
4. **Assets**: Include all required image assets

### Package Creation Process

1. **Prepare Directory Structure**:
   ```
   AppLayout/
   ├── AppxManifest.xml
   ├── YourApp.exe
   ├── assets/
   │   ├── StoreLogo.png
   │   ├── Square44x44Logo.png
   │   └── ...
   └── [other app files]
   ```

2. **Create Package**:
   ```powershell
   & "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\makeappx.exe" pack /d AppLayout /p YourApp.msix /o
   ```

3. **Sign Package** (for distribution):
   ```powershell
   & "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe" sign /f certificate.pfx /p password /fd SHA256 YourApp.msix
   ```

### MakeAppx Parameters

- `pack`: Create a package
- `/d [directory]`: Source directory containing app files
- `/p [package]`: Output package file name
- `/o`: Overwrite existing package
- `/v`: Verbose output
- `/no`: Skip semantic validation

---

## Common Issues and Solutions

### 1. Manifest Validation Errors
**Problem**: Invalid XML or missing required elements
**Solution**: Validate XML syntax and ensure all required elements are present

### 2. Asset Loading Issues
**Problem**: Images not displaying correctly
**Solution**: Check file paths, image dimensions, and formats

### 3. Capability Errors
**Problem**: App crashes due to insufficient permissions
**Solution**: Add appropriate capabilities to the manifest

### 4. Version Conflicts
**Problem**: Cannot install due to version conflicts
**Solution**: Increment version number in manifest

### 5. Publisher Mismatch
**Problem**: Cannot update package due to publisher mismatch
**Solution**: Use same certificate or publisher identity

---

## Best Practices

### Manifest Design
1. **Use meaningful names**: Choose clear, descriptive names for your app
2. **Follow naming conventions**: Use reverse domain notation for package names
3. **Version systematically**: Use semantic versioning
4. **Minimize capabilities**: Only request necessary permissions

### Asset Optimization
1. **Optimize file sizes**: Compress images without quality loss
2. **Use appropriate formats**: PNG for logos, JPEG for photos
3. **Test on different themes**: Ensure visibility in light and dark themes
4. **Provide all sizes**: Include all required asset sizes

### Package Structure
1. **Organize logically**: Group related files in subdirectories
2. **Minimize package size**: Exclude unnecessary files
3. **Test thoroughly**: Validate on different Windows versions
4. **Document dependencies**: Note any external requirements

---

## Testing Your MSIX Package

### Local Testing
1. **Install locally**: Double-click the .msix file
2. **Test functionality**: Verify all features work correctly
3. **Check uninstall**: Ensure clean removal
4. **Monitor logs**: Check Event Viewer for errors

### Validation Tools
- **Windows App Certification Kit**: Validate store compliance
- **MakeAppx validate**: Check package integrity
- **PowerShell**: Test installation programmatically

### PowerShell Installation Commands
```powershell
# Install package
Add-AppxPackage -Path "YourApp.msix"

# List installed packages
Get-AppxPackage -Name "YourPackageName"

# Remove package
Remove-AppxPackage -Package "FullPackageName"
```

---

## Distribution Options

### Microsoft Store
- Broadest reach
- Automatic updates
- Revenue sharing model
- Strict certification requirements

### Enterprise Distribution
- Microsoft Store for Business
- System Center Configuration Manager
- Group Policy deployment
- PowerShell scripting

### Sideloading
- Direct installation
- Requires developer mode or enterprise licensing
- Manual distribution
- Self-service updates

---

This guide provides the foundation for creating professional MSIX packages. Always test thoroughly and follow Microsoft's guidelines for the best user experience.


### THE CMD

``` bash
 & "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\makeappx.exe" pack /d "C:\MSIX\Document Converter" /p "C:\MSIX\Document Converter.msix" /o

```

``` bash
& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe" sign /f TechnicianPublisher.pfx /p password123 /fd SHA256 Document Converter.msix
```

``` bash
Add-AppxPackage -Path "C:\MSIX\Document Converter.msix"
```