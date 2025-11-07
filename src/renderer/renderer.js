function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
        if (k === 'class') e.className = v; else if (k === 'dataset') Object.assign(e.dataset, v); else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v); else e[k] = v;
    });
    children.forEach(c => e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return e;
}

async function refresh() {
    const cfg = await window.api.getConfig();
    const notesUl = document.getElementById('notesList');
    notesUl.innerHTML = '';
    cfg.notifications.forEach(n => {
        const li = el('li', {}, [
            `${n.time} ${n.title}`,
            el('button', { onclick: () => toggleNote(n.id) }, ['Toggle']),
            el('button', { onclick: () => deleteNote(n.id) }, ['X'])
        ]);
        if (!n.enabled) li.style.opacity = '0.5';
        notesUl.appendChild(li);
    });

    const tasksUl = document.getElementById('tasksList');
    tasksUl.innerHTML = '';
    cfg.tasks.forEach(t => {
        const li = el('li', {}, [
            el('input', { type: 'checkbox', checked: t.done, onchange: () => window.api.toggleTask(t.id) && setTimeout(refresh, 50) }),
            ' ', t.text,
            el('button', { onclick: () => window.api.deleteTask(t.id).then(refresh) }, ['X'])
        ]);
        tasksUl.appendChild(li);
    });
}

async function toggleNote(id) {
    const cfg = await window.api.getConfig();
    const note = cfg.notifications.find(n => n.id === id);
    if (note) {
        note.enabled = !note.enabled;
        await window.api.updateNotification(note);
        refresh();
    }
}
async function deleteNote(id) {
    await window.api.deleteNotification(id);
    refresh();
}

window.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const id = tab.dataset.tab;
            tabs.forEach(t => t.classList.toggle('active', t === tab));
            contents.forEach(c => c.classList.toggle('active', c.id === id));
        });
    });

    document.getElementById('testNotify').addEventListener('click', () => {
        window.api.showTestNotification();
    });

    document.getElementById('taskForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('taskText');
        const text = input.value.trim();
        if (!text) return;
        await window.api.addTask(text);
        input.value = '';
        refresh();
    });

    document.getElementById('noteForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('noteTitle').value.trim();
        const body = document.getElementById('noteBody').value.trim();
        const time = document.getElementById('noteTime').value.trim();
        if (!/^([0-1]?\d|2[0-3]):[0-5]\d$/.test(time)) {
            alert('Please enter time in HH:MM (24h) format');
            return;
        }
            const repeat = document.getElementById('noteRepeat').value;
            const category = document.getElementById('noteCategory').value.trim();
            const icon = document.getElementById('noteIcon').value.trim();
            const sound = document.getElementById('noteSound').value.trim();
        if (!title || !time) return;
            await window.api.addNotification({ title, body, time, repeat, category, icon, sound, enabled: true });
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteBody').value = '';
        document.getElementById('noteTime').value = '';
            document.getElementById('noteCategory').value = '';
            document.getElementById('noteIcon').value = '';
            document.getElementById('noteSound').value = '';
        refresh();
    });

    window.api.ping().then(p => console.log('ping:', p));
    // settings init
        window.api.getConfig().then(cfg => {
        const toggle = document.getElementById('autoLaunchToggle');
        if (toggle) {
            toggle.checked = !!cfg.settings?.autoLaunch;
            toggle.addEventListener('change', async () => {
                const res = await window.api.updateSettings({ autoLaunch: toggle.checked });
                const elStatus = document.getElementById('settingsStatus');
                elStatus.textContent = `Auto-launch: ${res.autoLaunch ? 'Enabled' : 'Disabled'}`;
            });
        }
            const snooze = document.getElementById('snoozeMinutes');
            const silent = document.getElementById('silentMode');
            const defSound = document.getElementById('defaultSound');
            if (snooze) snooze.value = cfg.settings?.snoozeMinutes ?? 5;
            if (silent) silent.checked = !!cfg.settings?.silent;
            if (defSound) defSound.value = cfg.settings?.defaultSound || '';
            const btnSave = document.getElementById('btnSaveSettings');
            if (btnSave) btnSave.addEventListener('click', async () => {
                const res = await window.api.updateSettings({
                    snoozeMinutes: Math.max(1, Math.min(60, parseInt(snooze.value || '5', 10))),
                    silent: !!silent.checked,
                    defaultSound: (defSound.value || '').trim()
                });
                const elStatus = document.getElementById('settingsStatus');
                elStatus.textContent = `Saved. Snooze ${res.snoozeMinutes} min, Silent ${res.silent ? 'On' : 'Off'}`;
            });
            const btnExport = document.getElementById('btnExport');
            const btnImport = document.getElementById('btnImport');
            const inputImport = document.getElementById('importFile');
            if (btnExport) btnExport.addEventListener('click', async () => {
                const name = `notification-app-config-${Date.now()}.json`;
                // simple client prompt for path: download to default via anchor if in web; here we ask user to pick save path via browser dialog isn't available
                // Workaround: ask user to place a path via prompt
                const target = prompt('Enter full path to save config JSON:', `C:\\Users\\${navigator.userAgent.includes('Windows') ? '' : ''}config.json`);
                if (target) await window.api.exportConfig(target);
            });
            if (btnImport && inputImport) {
                btnImport.addEventListener('click', () => inputImport.click());
                inputImport.addEventListener('change', async () => {
                    const file = inputImport.files[0];
                    if (!file) return;
                    // File path access is limited; in Electron, input.files[0].path is available
                    const path = file.path;
                    await window.api.importConfig(path);
                    refresh();
                });
            }
    });
    refresh();
});
