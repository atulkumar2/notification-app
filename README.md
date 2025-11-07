Notification App (Windows Tray)
================================

A lightweight Electron-based tray app for Windows that shows configurable notifications and stores a small task list.

Status
------

- Tray window, tasks & notifications CRUD, scheduler.
- Auto-launch setting, snooze/dismiss popup, Windows toast shows app name.

Prerequisites
-------------

- Node.js 18+ (or later) and npm installed.

Install and Run
---------------

```pwsh

cd e:\workspace\notification-app
npm install
npm run dev
```

Usage
-----

- The app runs in the Windows notification area (system tray).
- Left-click the tray icon to toggle the window.
- Use the "Show test notification" button to verify notifications work.

Roadmap
-------

1. Sound & custom icons per notification.
2. Snooze duration selection per reminder.
3. Export/import config.
4. System tray quick-add mini form.
5. Linux/macOS testing & packaging.

Development Notes
-----------------

- Replace `src/assets/tray.png` with a 16x16 or 24x24 PNG for a crisp tray icon.
- Preload exposes a limited API (`window.api`). Extend via IPC channels.
- Windows toast app attribution via `app.setAppUserModelId('com.example.notificationapp')`.
- Build installer (NSIS): `npm run build:win`.

License

-------
MIT (add LICENSE file before release)
