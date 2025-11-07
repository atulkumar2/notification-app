const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  ping: async () => ipcRenderer.invoke('ping'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  // tasks
  addTask: (text) => ipcRenderer.invoke('tasks:add', text),
  toggleTask: (id) => ipcRenderer.invoke('tasks:toggle', id),
  deleteTask: (id) => ipcRenderer.invoke('tasks:delete', id),
  // notifications
  addNotification: (payload) => ipcRenderer.invoke('notes:add', payload),
  updateNotification: (payload) => ipcRenderer.invoke('notes:update', payload),
  deleteNotification: (id) => ipcRenderer.invoke('notes:delete', id),
  // settings
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),
  exportConfig: (targetPath) => ipcRenderer.invoke('config:export', targetPath),
  importConfig: (sourcePath) => ipcRenderer.invoke('config:import', sourcePath),
  // test
  showTestNotification: () => ipcRenderer.send('show-test-notification')
});
