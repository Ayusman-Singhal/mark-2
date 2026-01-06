const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  checkAdmin: () => ipcRenderer.invoke('check-admin'),
  restartAsAdmin: () => ipcRenderer.invoke('restart-as-admin'),
  
  // Firewall APIs
  firewall: {
    listRules: () => ipcRenderer.invoke('firewall-list-rules'),
    addRule: (ruleData) => ipcRenderer.invoke('firewall-add-rule', ruleData),
    removeRule: (ruleName) => ipcRenderer.invoke('firewall-remove-rule', ruleName),
    editRule: (oldRuleName, newRuleData) => ipcRenderer.invoke('firewall-edit-rule', oldRuleName, newRuleData),
    editRuleAlternative: (oldRuleName, newRuleData) => ipcRenderer.invoke('firewall-edit-rule-alternative', oldRuleName, newRuleData),
    blockWebsite: (websiteUrl) => ipcRenderer.invoke('firewall-block-website', websiteUrl),
    unblockWebsite: (websiteUrl) => ipcRenderer.invoke('firewall-unblock-website', websiteUrl)
  },
  
  // Website blocking APIs
  getBlockedWebsites: () => ipcRenderer.invoke('get-blocked-websites'),

  // Student/Focused Mode APIs
  studentMode: {
    blockWebsite: (websiteUrl, duration) => ipcRenderer.invoke('student-mode-block-website', websiteUrl, duration),
    getStatus: () => ipcRenderer.invoke('get-student-mode-status'),
    cancel: (websiteUrl) => ipcRenderer.invoke('cancel-student-mode', websiteUrl),
    onTimerExpired: (callback) => ipcRenderer.on('student-mode-timer-expired', callback),
    removeTimerExpiredListener: (callback) => ipcRenderer.removeListener('student-mode-timer-expired', callback)
  },

  // System monitoring APIs
  system: {
    getProcessList: () => ipcRenderer.invoke('process-list'),
    killProcess: (pid) => ipcRenderer.invoke('process-kill', pid),
    openFolder: (folderPath) => ipcRenderer.invoke('system-open-folder', folderPath),
    selectFolder: () => ipcRenderer.invoke('system-select-folder'),
    showSaveDialog: (defaultFileName, fileExtension) => ipcRenderer.invoke('system-show-save-dialog', defaultFileName, fileExtension),
    openPath: (filePath) => ipcRenderer.invoke('system-open-path', filePath),
    getDefaultDownloadsPath: () => ipcRenderer.invoke('system-get-downloads-path'),
    getSystemInfo: () => ipcRenderer.invoke('system-get-info'),
    getCPUInfo: () => ipcRenderer.invoke('system-get-cpu-info'),
    getMemoryInfo: () => ipcRenderer.invoke('system-get-memory-info'),
    getStorageInfo: () => ipcRenderer.invoke('system-get-storage-info'),
    getOSInfo: () => ipcRenderer.invoke('system-get-os-info'),
    getPrefetchFiles: () => ipcRenderer.invoke('system-get-prefetch-files')
  },

  // Terminal command APIs
  terminal: {
    runCommand: (command) => ipcRenderer.send('run-command', command),
    onOutput: (callback) => ipcRenderer.on('command-output', callback),
    onComplete: (callback) => ipcRenderer.on('command-complete', callback),
    removeOutputListener: (callback) => ipcRenderer.removeListener('command-output', callback),
    removeCompleteListener: (callback) => ipcRenderer.removeListener('command-complete', callback)
  },

  // Script execution APIs
  scripts: {
    runScript: (scriptName) => ipcRenderer.invoke('run-script-async', scriptName),
    stopScript: (scriptName) => ipcRenderer.invoke('stop-script', scriptName),
    getRunningScripts: () => ipcRenderer.invoke('get-running-scripts'),
    onScriptCompleted: (callback) => ipcRenderer.on('script-completed', callback),
    removeScriptCompletedListener: (callback) => ipcRenderer.removeListener('script-completed', callback)
  }
});

// Expose file system cleaning APIs
contextBridge.exposeInMainWorld('electron', {
  calculateDirectorySize: (dirPath) => ipcRenderer.invoke('calculate-directory-size', dirPath),
  cleanDirectory: (dirPath) => ipcRenderer.invoke('clean-directory', dirPath),
  getDirectoryExists: (dirPath) => ipcRenderer.invoke('get-directory-exists', dirPath),
  getRecycleBinSize: () => ipcRenderer.invoke('get-recycle-bin-size'),
  emptyRecycleBin: () => ipcRenderer.invoke('empty-recycle-bin'),
  getBrowserCacheSize: (browser) => ipcRenderer.invoke('get-browser-cache-size', browser),
  cleanBrowserCache: (browser) => ipcRenderer.invoke('clean-browser-cache', browser)
});
