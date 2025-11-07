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

Packaging (Windows)
-------------------

Build an installer:

```pwsh
npm run build:win
```

Artifacts will be under `dist/`. Code signing is optional during development; if you have a cert:

- `setx CSC_LINK "C:\path\to\cert.pfx"`
- `setx CSC_KEY_PASSWORD "yourpassword"`

Roadmap
-------

1. Optional per-note icon (supported) and future default branding icon.
2. Snooze duration global setting (supported) and per-reminder override (future).
3. Export/import config, tasks, and notifications (supported).
4. System tray quick-add mini form (future).
5. Linux/macOS testing & packaging (future).

Development Notes
-----------------

- Replace `src/assets/tray.png` with a 16x16 or 24x24 PNG for a crisp tray icon.
- Preload exposes a limited API (`window.api`). Extend via IPC channels.
- Windows toast app attribution via `app.setAppUserModelId('com.example.notificationapp')`.
- Build installer (NSIS): `npm run build:win`.

License

-------
MIT (add LICENSE file before release)
