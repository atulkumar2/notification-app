const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  ping: async () => ipcRenderer.invoke('ping'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  // tasks
  addTask: (text) => ipcRenderer.invoke('tasks:add', text),
  toggleTask: (id) => ipcRenderer.invoke('tasks:toggle', id),
  deleteTask: (id) => ipcRenderer.invoke('tasks:delete', id),
  reorderTask: (fromId, toId) => ipcRenderer.invoke('tasks:reorder', fromId, toId),
  // notifications
  addNotification: (payload) => ipcRenderer.invoke('notes:add', payload),
  updateNotification: (payload) => ipcRenderer.invoke('notes:update', payload),
  deleteNotification: (id) => ipcRenderer.invoke('notes:delete', id),
  // settings
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),
  exportConfig: (targetPath) => ipcRenderer.invoke('config:export', targetPath),
  importConfig: (sourcePath) => ipcRenderer.invoke('config:import', sourcePath),
  exportConfigDialog: () => ipcRenderer.invoke('config:export:dialog'),
  importConfigDialog: () => ipcRenderer.invoke('config:import:dialog'),
  exportTasks: (targetPath) => ipcRenderer.invoke('export:tasks', targetPath),
  exportTasksDialog: () => ipcRenderer.invoke('export:tasks:dialog'),
  exportNotes: (targetPath) => ipcRenderer.invoke('export:notes', targetPath),
  exportNotesDialog: () => ipcRenderer.invoke('export:notes:dialog'),
  importTasks: (sourcePath) => ipcRenderer.invoke('import:tasks', sourcePath),
  importTasksDialog: () => ipcRenderer.invoke('import:tasks:dialog'),
  importNotes: (sourcePath) => ipcRenderer.invoke('import:notes', sourcePath),
  importNotesDialog: () => ipcRenderer.invoke('import:notes:dialog'),
    // window controls
    hideWindow: () => ipcRenderer.send('window:hide'),
    minimizeWindow: () => ipcRenderer.send('window:minimize'),
  // test
  showTestNotification: () => ipcRenderer.send('show-test-notification')
});

// Popup-specific bridge
contextBridge.exposeInMainWorld('popupAPI', {
  onNote: (handler) => ipcRenderer.on('popup:note', (_e, note) => handler(note)),
  snooze: (id) => ipcRenderer.send('popup:snooze', id),
  dismiss: (id) => ipcRenderer.send('popup:dismiss', id)
});
