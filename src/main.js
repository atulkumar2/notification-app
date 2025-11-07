const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const storage = require('./storage');
const AutoLaunch = require('auto-launch');
const createScheduler = require('./scheduler');

let tray = null;
let window = null;
let scheduler = null;
let autoLauncher;
let popupWindow = null;

function createWindow() {
  window = new BrowserWindow({
    width: 340,
    height: 420,
    show: false,
    frame: false,
    resizable: false,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  window.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Hide instead of close
  window.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      window.hide();
    }
  });
  window.on('closed', () => {
    window = null;
  });
}

function toggleWindow() {
  if (!window || window.isDestroyed()) {
    createWindow();
  }
  if (window.isVisible()) {
    window.hide();
  } else {
    const trayBounds = tray.getBounds();
    const { width, height } = window.getBounds();
    // Position near tray icon (approx for Windows)
    window.setPosition(trayBounds.x - width + trayBounds.width, trayBounds.y - height);
    window.show();
    window.focus();
  }
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray.png');
  let icon;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    // 16x16 transparent PNG dot
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAACXBIWXMAAAsSAAALEgHS3X78AAAAJ0lEQVQoz2NgGAXUBwYGhkYGiMDA8J8B4yAEYwQjGGQwGJgGmB8AAHtrm0Zl2bf8AAAAAElFTkSuQmCC';
    icon = nativeImage.createFromDataURL(dataUrl).resize({ width: 16, height: 16 });
  }
  tray = new Tray(icon);
  tray.setToolTip('Notification App');
  tray.on('click', () => toggleWindow());

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open', click: () => toggleWindow() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } }
  ]);
  tray.setContextMenu(contextMenu);
}

app.setAppUserModelId('com.example.notificationapp'); // Ensure Windows toast shows correct app name
app.whenReady().then(() => {
  storage.init();
  createWindow();
  createTray();
  autoLauncher = new AutoLaunch({ name: 'Notification App' });
  // Ensure launcher reflects saved setting
  const { autoLaunch } = storage.getConfig().settings;
  autoLauncher.isEnabled()
    .then((enabled) => {
      if (autoLaunch && !enabled) return autoLauncher.enable();
      if (!autoLaunch && enabled) return autoLauncher.disable();
    })
    .catch(() => {});
  scheduler = createScheduler({
    onFire: (note) => {
      const cfg = storage.getConfig();
      const noteIcon = note.icon && fs.existsSync(note.icon) ? nativeImage.createFromPath(note.icon) : undefined;
      const toast = new Notification({
        title: note.title || 'Reminder',
        body: note.body || '',
        silent: true,
        icon: noteIcon
      });
      toast.show();
      showPopup(note);
    },
    getNotifications: () => storage.getConfig().notifications,
    onUpdate: (updatedConfig) => storage.setConfig(updatedConfig)
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', (e) => {
  // Prevent app exit on Windows when window closed; keep tray running
  e.preventDefault();
});

// IPC API
ipcMain.handle('ping', () => 'pong');

ipcMain.handle('config:get', () => storage.getConfig());
ipcMain.handle('settings:update', async (e, patch) => {
  const updated = storage.updateSettings(patch);
  if (typeof patch.autoLaunch === 'boolean' && autoLauncher) {
    try {
      if (patch.autoLaunch) await autoLauncher.enable(); else await autoLauncher.disable();
    } catch {}
  }
  return updated;
});
ipcMain.handle('config:export', (e, targetPath) => storage.exportConfig(targetPath));
ipcMain.handle('config:import', (e, sourcePath) => storage.importConfig(sourcePath));
ipcMain.handle('config:export:dialog', async () => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export Config',
    defaultPath: 'notification-app-config.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return false;
  return storage.exportConfig(filePath);
});
ipcMain.handle('config:import:dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import Config',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths?.[0]) return false;
  return storage.importConfig(filePaths[0]);
});

// partial exports/imports for tasks and notifications
ipcMain.handle('export:tasks', (e, targetPath) => {
  const cfg = storage.getConfig();
  fs.writeFileSync(targetPath, JSON.stringify(cfg.tasks, null, 2), 'utf-8');
  return true;
});
ipcMain.handle('export:tasks:dialog', async () => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export Tasks',
    defaultPath: 'tasks.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return false;
  const cfg = storage.getConfig();
  fs.writeFileSync(filePath, JSON.stringify(cfg.tasks, null, 2), 'utf-8');
  return true;
});
ipcMain.handle('export:notes', (e, targetPath) => {
  const cfg = storage.getConfig();
  fs.writeFileSync(targetPath, JSON.stringify(cfg.notifications, null, 2), 'utf-8');
  return true;
});
ipcMain.handle('export:notes:dialog', async () => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export Notifications',
    defaultPath: 'notifications.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return false;
  const cfg = storage.getConfig();
  fs.writeFileSync(filePath, JSON.stringify(cfg.notifications, null, 2), 'utf-8');
  return true;
});
ipcMain.handle('import:tasks', (e, sourcePath) => {
  const tasks = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
  const cfg = storage.getConfig();
  storage.setConfig({ tasks: Array.isArray(tasks) ? tasks : cfg.tasks });
  return true;
});
ipcMain.handle('import:tasks:dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import Tasks',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths?.[0]) return false;
  const tasks = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'));
  const cfg = storage.getConfig();
  storage.setConfig({ tasks: Array.isArray(tasks) ? tasks : cfg.tasks });
  return true;
});
ipcMain.handle('import:notes', (e, sourcePath) => {
  const notes = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
  const cfg = storage.getConfig();
  storage.setConfig({ notifications: Array.isArray(notes) ? notes : cfg.notifications });
  return true;
});
ipcMain.handle('import:notes:dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import Notifications',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths?.[0]) return false;
  const notes = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'));
  const cfg = storage.getConfig();
  storage.setConfig({ notifications: Array.isArray(notes) ? notes : cfg.notifications });
  return true;
});
ipcMain.handle('tasks:add', (e, text) => storage.addTask(text));
ipcMain.handle('tasks:toggle', (e, id) => storage.toggleTask(id));
ipcMain.handle('tasks:delete', (e, id) => storage.deleteTask(id));
ipcMain.handle('tasks:reorder', (e, fromId, toId) => storage.reorderTask(fromId, toId));

ipcMain.handle('notes:add', (e, payload) => storage.addNotification(payload));
ipcMain.handle('notes:update', (e, payload) => storage.updateNotification(payload));
ipcMain.handle('notes:delete', (e, id) => storage.deleteNotification(id));

ipcMain.on('show-test-notification', () => {
  new Notification({ title: 'Test Notification', body: 'This is a sample notification.' }).show();
});

// window control from renderer
ipcMain.on('window:hide', () => { if (window && !window.isDestroyed()) window.hide(); });
ipcMain.on('window:minimize', () => { if (window && !window.isDestroyed()) window.minimize(); });

function showPopup(note) {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.close();
  }
  popupWindow = new BrowserWindow({
    width: 300,
    height: 140,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });
  popupWindow.loadFile(path.join(__dirname, 'renderer', 'popup.html'));
  popupWindow.once('ready-to-show', () => {
    popupWindow.webContents.send('popup:note', note);
  });
}

ipcMain.on('popup:snooze', (e, id) => {
  const cfg = storage.getConfig();
  const note = cfg.notifications.find(n => n.id === id);
  if (note) {
    const snooze = cfg.settings.snoozeMinutes || 5;
    // compute new time: add snooze minutes
    const now = new Date();
    now.setMinutes(now.getMinutes() + snooze);
    note.time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    note.enabled = true;
    storage.setConfig({ notifications: cfg.notifications });
  }
  if (popupWindow) popupWindow.close();
});

ipcMain.on('popup:dismiss', (e, id) => {
  const cfg = storage.getConfig();
  const note = cfg.notifications.find(n => n.id === id);
  if (note && note.repeat === 'once') {
    note.enabled = false;
    storage.setConfig({ notifications: cfg.notifications });
  }
  if (popupWindow) popupWindow.close();
});
