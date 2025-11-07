const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const defaultConfig = {
  tasks: [],
  notifications: [],
  settings: { version: 1, autoLaunch: false, snoozeMinutes: 5, silent: false, defaultSound: '' }
};

let config = { ...defaultConfig };
let filePath;

function load() {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      config = { ...defaultConfig, ...data };
    }
  } catch (e) {
    console.error('Failed to load config', e);
  }
}

function save() {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save config', e);
  }
}

module.exports = {
  init() {
    const userDir = app.getPath('userData');
    filePath = path.join(userDir, 'config.json');
    load();
  },
  getConfig() {
    return config;
  },
  setConfig(newConfig) {
    config = { ...config, ...newConfig };
    save();
    return config;
  },
  updateSettings(patch) {
    config.settings = { ...config.settings, ...patch };
    save();
    return config.settings;
  },
  // tasks
  addTask(text) {
    const item = { id: Date.now().toString(36), text, done: false };
    config.tasks.unshift(item);
    save();
    return item;
  },
  toggleTask(id) {
    const t = config.tasks.find(t => t.id === id);
    if (t) { t.done = !t.done; save(); }
    return t;
  },
  deleteTask(id) {
    const prev = config.tasks.length;
    config.tasks = config.tasks.filter(t => t.id !== id);
    if (config.tasks.length !== prev) save();
    return true;
  },
  // notifications
  addNotification({ title, body, time, repeat = 'daily', enabled = true, id, icon = '', category = '', sound = '', date = '', randomWithinHours = 0, nextAt = 0 }) {
    const item = { id: id || Date.now().toString(36), title, body, time, repeat, enabled, icon, category, sound, date, randomWithinHours, nextAt };
    config.notifications.push(item);
    save();
    return item;
  },
  updateNotification({ id, ...rest }) {
    const idx = config.notifications.findIndex(n => n.id === id);
    if (idx >= 0) {
      config.notifications[idx] = { ...config.notifications[idx], ...rest };
      save();
      return config.notifications[idx];
    }
    return null;
  },
  deleteNotification(id) {
    const prev = config.notifications.length;
    config.notifications = config.notifications.filter(n => n.id !== id);
    if (config.notifications.length !== prev) save();
    return true;
  },
  exportConfig(targetPath) {
    fs.writeFileSync(targetPath, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  },
  importConfig(sourcePath) {
    const raw = fs.readFileSync(sourcePath, 'utf-8');
    const data = JSON.parse(raw);
    // simple schema merge with defaults
    config = { ...defaultConfig, ...data, settings: { ...defaultConfig.settings, ...(data.settings || {}) } };
    save();
    return config;
  }
};
