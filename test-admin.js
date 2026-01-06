const { exec, execSync } = require('child_process');

// Test admin detection method 1
function testAdminMethod1() {
  try {
    execSync('net session', { encoding: 'utf8', stdio: 'pipe' });
    console.log('Method 1 (net session): Running as admin');
    return true;
  } catch (error) {
    console.log('Method 1 (net session): NOT running as admin');
    return false;
  }
}

// Test admin detection method 2
function testAdminMethod2() {
  try {
    execSync('reg query "HKU\\S-1-5-19" >nul 2>&1', { stdio: 'pipe' });
    console.log('Method 2 (registry): Running as admin');
    return true;
  } catch (error) {
    console.log('Method 2 (registry): NOT running as admin');
    return false;
  }
}

// Test PowerShell command
function testPowerShellRestart() {
  const appPath = process.execPath.replace(/\\/g, '\\\\');
  const psCommand = `Start-Process -FilePath "${appPath}" -Verb RunAs`;
  
  console.log('PowerShell command that would be executed:');
  console.log(`powershell -Command "${psCommand}"`);
  
  // Don't actually execute, just show what would happen
}

console.log('=== Admin Detection Tests ===');
testAdminMethod1();
testAdminMethod2();
console.log('\n=== PowerShell Command Test ===');
testPowerShellRestart();
