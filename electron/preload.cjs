const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Vault
  getVaultPath: () => ipcRenderer.invoke("vault:getPath"),
  changeVaultPath: () => ipcRenderer.invoke("vault:changePath"),
  openVaultInExplorer: () => ipcRenderer.invoke("vault:openInExplorer"),

  // Journal entries
  loadAllEntries: () => ipcRenderer.invoke("entries:loadAll"),
  saveEntry: (date, entry) => ipcRenderer.invoke("entries:save", date, entry),

  // Projects
  loadAllProjects: () => ipcRenderer.invoke("projects:loadAll"),
  saveProject: (project) => ipcRenderer.invoke("projects:save", project),
  deleteProject: (projectId) => ipcRenderer.invoke("projects:delete", projectId),

  // Meetings
  loadAllMeetings: () => ipcRenderer.invoke("meetings:loadAll"),
  saveMeeting: (meeting) => ipcRenderer.invoke("meetings:save", meeting),
  deleteMeeting: (meetingId) => ipcRenderer.invoke("meetings:delete", meetingId),
  getTelegramReminderSettings: () => ipcRenderer.invoke("telegram:getSettings"),
  saveTelegramReminderSettings: (settings) => ipcRenderer.invoke("telegram:saveSettings", settings),
  testTelegramReminder: (botToken, chatId) => ipcRenderer.invoke("telegram:test", botToken, chatId),
  findTelegramChat: (botToken) => ipcRenderer.invoke("telegram:findChat", botToken),

  // People
  loadAllPeople: () => ipcRenderer.invoke("people:loadAll"),
  savePerson: (person) => ipcRenderer.invoke("people:save", person),
  deletePerson: (personId) => ipcRenderer.invoke("people:delete", personId),

  // Search
  searchVault: (query) => ipcRenderer.invoke("vault:search", query),

  // Data management
  exportBackup: () => ipcRenderer.invoke("data:exportBackup"),
  importBackup: () => ipcRenderer.invoke("data:importBackup"),

  // Window controls
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close"),

  // Event listeners (for menu commands and vault changes)
  onVaultChanged: (callback) => {
    ipcRenderer.on("vault:changed", callback);
    return () => ipcRenderer.removeListener("vault:changed", callback);
  },
  onMenuNewEntry: (callback) => {
    ipcRenderer.on("menu:newEntry", callback);
    return () => ipcRenderer.removeListener("menu:newEntry", callback);
  },
  onMenuChangeVault: (callback) => {
    ipcRenderer.on("menu:changeVault", callback);
    return () => ipcRenderer.removeListener("menu:changeVault", callback);
  },
  onMenuExportBackup: (callback) => {
    ipcRenderer.on("menu:exportBackup", callback);
    return () => ipcRenderer.removeListener("menu:exportBackup", callback);
  },
  onMenuImportBackup: (callback) => {
    ipcRenderer.on("menu:importBackup", callback);
    return () => ipcRenderer.removeListener("menu:importBackup", callback);
  },
  onMenuToggleSidebar: (callback) => {
    ipcRenderer.on("menu:toggleSidebar", callback);
    return () => ipcRenderer.removeListener("menu:toggleSidebar", callback);
  },
  onMenuNavigate: (callback) => {
    ipcRenderer.on("menu:navigate", (_event, path) => callback(path));
    return () => ipcRenderer.removeAllListeners("menu:navigate");
  },

  // Platform info
  platform: process.platform,
});
