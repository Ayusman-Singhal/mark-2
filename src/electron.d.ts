export interface FirewallRule {
  name: string;
  enabled: string;
  direction: string;
  profiles: string;
  action: string;
  protocol: string;
  localPort: string;
  remotePort: string;
  remoteIP: string;
  localIP: string;
}

export interface NewRuleData {
  name: string;
  action: 'allow' | 'block';
  direction: 'in' | 'out';
  protocol: 'tcp' | 'udp' | 'any';
  program: string;
  localPort: string;
  remotePort: string;
  remoteIP: string;
}

export interface SystemProcess {
  id: string;
  name: string;
  pid: number;
  cpuUsage: number;
  memoryUsage: number;
  status: string;
  startTime: string;
  description: string;
  executablePath: string;
  commandLine: string;
  windowTitle?: string;
}

export interface StudentModeTimer {
  websiteUrl: string;
  duration: string;
  startTime: number;
  endTime: number;
  remainingMs: number;
  remainingFormatted: string;
}

export interface IElectronAPI {
  minimizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  checkAdmin: () => Promise<boolean>;
  restartAsAdmin: () => Promise<{ success: boolean; error?: string }>;
  firewall: {
    listRules: () => Promise<{ success: boolean; rules: FirewallRule[]; error?: string }>;
    addRule: (ruleData: NewRuleData) => Promise<{ success: boolean; message?: string; error?: string }>;
    removeRule: (ruleName: string) => Promise<{ success: boolean; message?: string; error?: string }>;
    editRule: (oldRuleName: string, newRuleData: NewRuleData) => Promise<{ success: boolean; message?: string; error?: string }>;
    editRuleAlternative: (oldRuleName: string, newRuleData: NewRuleData) => Promise<{ success: boolean; message?: string; error?: string }>;
    blockWebsite: (websiteUrl: string) => Promise<{ success: boolean; message?: string; error?: string }>;
    unblockWebsite: (websiteUrl: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  };
  getBlockedWebsites: () => Promise<{ success: boolean; websites?: string[]; error?: string }>;
  studentMode: {
    blockWebsite: (websiteUrl: string, duration: string) => Promise<{ success: boolean; message?: string; endTime?: number; duration?: string; error?: string }>;
    getStatus: () => Promise<{ success: boolean; activeTimers: StudentModeTimer[]; count: number; error?: string }>;
    cancel: (websiteUrl: string) => Promise<{ success: boolean; message?: string; error?: string }>;
    onTimerExpired: (callback: (event: any, websiteUrl: string) => void) => void;
    removeTimerExpiredListener: (callback: (event: any, websiteUrl: string) => void) => void;
  };
  system: {
    getProcessList: () => Promise<{ success: boolean; processes: SystemProcess[]; error?: string }>;
    killProcess: (pid: number) => Promise<{ success: boolean; message?: string; error?: string }>;
    openFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
    selectFolder: () => Promise<string | null>;
    showSaveDialog: (defaultFileName: string, fileExtension: string) => Promise<string | null>;
    openPath: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    getDefaultDownloadsPath: () => Promise<string>;
    getSystemInfo: () => Promise<{ success: boolean; data?: any; error?: string }>;
    getCPUInfo: () => Promise<any>;
    getMemoryInfo: () => Promise<any>;
    getStorageInfo: () => Promise<any>;
    getOSInfo: () => Promise<any>;
    getPrefetchFiles: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
  };

}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
