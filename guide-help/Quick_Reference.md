# MSIX Creation Quick Reference

## 📋 Pre-Package Checklist

### ✅ Project Structure
- [ ] Create `AppLayout` folder
- [ ] Place main executable in root of AppLayout
- [ ] Create `assets` subfolder
- [ ] Place all required image assets
- [ ] Create `AppxManifest.xml` in root of AppLayout

### ✅ Required Assets (PNG format)
- [ ] `StoreLogo.png` (50x50 pixels)
- [ ] `Square44x44Logo.png` (44x44 pixels)  
- [ ] `Square150x150Logo.png` (150x150 pixels)
- [ ] `Wide310x150Logo.png` (310x150 pixels)
- [ ] `Square71x71Logo.png` (71x71 pixels)

### ✅ Manifest Validation
- [ ] Unique package name in Identity/Name
- [ ] Correct publisher certificate name
- [ ] Version number format (x.x.x.x)
- [ ] Minimum Windows version specified
- [ ] Correct executable name
- [ ] All asset paths match actual files

## 🚀 Package Creation Commands

### Create MSIX Package
```powershell
& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\makeappx.exe" pack /d AppLayout /p YourApp.msix /o
```

### Validate Package (Optional)
```powershell
& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\makeappx.exe" validate /p YourApp.msix
```

### Sign Package (For Distribution)
```powershell
& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe" sign /f certificate.pfx /p password /fd SHA256 YourApp.msix
```

## 📝 Common XML Elements

### Basic Identity
```xml
<Identity Name="YourCompany.YourApp"
          Publisher="CN=YourPublisher"
          Version="1.0.0.0" />
```

### Win32 Application Entry
```xml
<Application Id="App" 
             Executable="YourApp.exe" 
             EntryPoint="Windows.FullTrustApplication">
```

### Full Trust Capability (Required for Win32)
```xml
<rescap:Capability Name="runFullTrust" />
```

## 🔧 Testing Commands

### Install Package Locally
```powershell
Add-AppxPackage -Path "YourApp.msix"
```

### List Installed Packages
```powershell
Get-AppxPackage -Name "*YourApp*"
```

### Remove Package
```powershell
Remove-AppxPackage -Package "FullPackageName"
```

## ⚠️ Common Issues

### Manifest Errors
- **Invalid XML syntax**: Use XML validator
- **Missing elements**: Check required sections
- **Wrong namespaces**: Copy from template

### Asset Issues  
- **Wrong dimensions**: Use exact pixel sizes
- **Wrong format**: Use PNG only
- **Missing files**: Check file paths in manifest

### Packaging Errors
- **File not found**: Check executable name and path
- **Permission denied**: Run PowerShell as Administrator
- **Invalid manifest**: Validate XML structure

### Installation Issues
- **Publisher mismatch**: Use same certificate for updates
- **Version conflict**: Increment version number
- **Missing dependencies**: Include required runtimes

## 📊 Version History Example

| Version | Description | Date |
|---------|-------------|------|
| 1.0.0.0 | Initial release | 2025-01-01 |
| 1.0.1.0 | Bug fixes | 2025-01-15 |
| 1.1.0.0 | New features | 2025-02-01 |
| 2.0.0.0 | Major update | 2025-06-01 |

## 🎯 Best Practices

1. **Always increment version** for updates
2. **Test on clean machine** before distribution  
3. **Use meaningful descriptions** in manifest
4. **Optimize asset sizes** without quality loss
5. **Document capabilities** and why they're needed
6. **Test uninstall process** for clean removal
7. **Follow naming conventions** consistently
8. **Keep packages small** by excluding unnecessary files

## 📁 Example Directory Structure
```
YourProject/
├── AppLayout/
│   ├── AppxManifest.xml
│   ├── YourApp.exe
│   ├── config.ini
│   ├── assets/
│   │   ├── StoreLogo.png
│   │   ├── Square44x44Logo.png
│   │   ├── Square150x150Logo.png
│   │   ├── Wide310x150Logo.png
│   │   └── Square71x71Logo.png
│   └── data/
│       └── database.db
├── YourApp.msix (generated)
└── certificate.pfx (optional)
```
