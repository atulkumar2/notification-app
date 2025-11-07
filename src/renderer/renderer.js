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
        const titleText = n.title || '(no text)';
        const subtitle = `${n.time || ''}${n.randomWithinHours>0?' · random≤'+n.randomWithinHours+'h':''}${n.date? ' · '+n.date: ''}`;
        const li = el('li', {}, [
            el('button', { class: 'delete', title: 'Delete', onclick: () => deleteNote(n.id) }, ['X']),
            el('div', { class: 'text left' }, [
                el('div', { class: 'line1' }, [
                  titleText,
                  n.category ? ' ' : '',
                  n.category ? el('span', { class: 'category' }, ['· ', n.category]) : null,
                  (!n.enabled ? el('span', { class: 'badge-off' }, ['Off']) : null)
                ].filter(Boolean)),
                el('div', { class: 'line2', style: 'font-size:11px;color:#666' }, [subtitle])
            ]),
            el('button', { onclick: () => toggleNote(n.id), title: 'Enable/Disable' }, [n.enabled ? 'On' : 'Off'])
        ]);
        if (!n.enabled) li.style.opacity = '0.6';
        notesUl.appendChild(li);
    });

    const tasksUl = document.getElementById('tasksList');
    tasksUl.innerHTML = '';
        cfg.tasks.forEach(t => {
                const li = el('li', { draggable: true, dataset: { id: t.id } }, [
                        el('button', { class: 'delete', title: 'Delete', onclick: () => window.api.deleteTask(t.id).then(refresh) }, ['X']),
                        el('div', { class: 'text left' }, [
                                el('label', {}, [
                                    el('input', { type: 'checkbox', checked: t.done, onchange: () => window.api.toggleTask(t.id).then(refresh) }),
                                    ' ', t.text
                                ])
                        ]),
            el('div', { class: 'handle', title: 'Drag to reorder' }, ['⋮⋮'])
                ]);
                // DnD events
                li.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', t.id);
                });
                li.addEventListener('dragover', (e) => { e.preventDefault(); li.classList.add('drag-over'); });
                li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
                li.addEventListener('drop', async (e) => {
                    e.preventDefault(); li.classList.remove('drag-over');
                    const fromId = e.dataTransfer.getData('text/plain');
                    const toId = t.id;
                    if (!fromId || fromId === toId) return;
                    await window.api.reorderTask(fromId, toId);
                    refresh();
                });
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
        const time = document.getElementById('noteTime').value.trim();
            const repeat = document.getElementById('noteRepeat').value;
            const category = document.getElementById('noteCategory').value.trim();
        const icon = document.getElementById('noteIcon').value.trim();
            const hasDate = document.getElementById('hasDate').checked;
            const dateVal = hasDate ? document.getElementById('noteDate').value : '';
            const randomWithinHours = parseInt(document.getElementById('randomHours').value || '0', 10);
        if (!title) return;
        if (randomWithinHours === 0) {
            if (!/^([0-1]?\d|2[0-3]):[0-5]\d$/.test(time)) {
                alert('Please enter time in HH:MM (24h) format, or set Random>0 and leave time empty');
                return;
            }
        }
        await window.api.addNotification({ title, body: '', time, repeat, category, icon, date: dateVal, randomWithinHours, enabled: true });
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteTime').value = '';
            document.getElementById('noteCategory').value = '';
            document.getElementById('noteIcon').value = '';
                document.getElementById('noteDate').value = '';
                document.getElementById('hasDate').checked = false;
                document.getElementById('noteDate').style.display = 'none';
                document.getElementById('randomHours').value = '0';
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
            if (snooze) snooze.value = cfg.settings?.snoozeMinutes ?? 5;
            const btnSave = document.getElementById('btnSaveSettings');
            if (btnSave) btnSave.addEventListener('click', async () => {
                const res = await window.api.updateSettings({
                    snoozeMinutes: Math.max(1, Math.min(60, parseInt(snooze.value || '5', 10)))
                });
                const elStatus = document.getElementById('settingsStatus');
                elStatus.textContent = `Saved. Snooze ${res.snoozeMinutes} min.`;
            });
            const btnExport = document.getElementById('btnExport');
            const btnImport = document.getElementById('btnImport');
            if (btnExport) btnExport.addEventListener('click', async () => {
                const ok = await window.api.exportConfigDialog();
                if (ok) document.getElementById('settingsStatus').textContent = 'Config exported.';
            });
            if (btnImport) btnImport.addEventListener('click', async () => {
                const ok = await window.api.importConfigDialog();
                if (ok) {
                    document.getElementById('settingsStatus').textContent = 'Config imported.';
                    refresh();
                }
            });
            const btnExportTasks = document.getElementById('btnExportTasks');
            const btnImportTasks = document.getElementById('btnImportTasks');
            const btnExportNotes = document.getElementById('btnExportNotes');
            const btnImportNotes = document.getElementById('btnImportNotes');
            if (btnExportTasks) btnExportTasks.addEventListener('click', async () => {
                const ok = await window.api.exportTasksDialog();
                if (ok) document.getElementById('settingsStatus').textContent = 'Tasks exported.';
            });
            if (btnImportTasks) btnImportTasks.addEventListener('click', async () => {
                const ok = await window.api.importTasksDialog();
                if (ok) { document.getElementById('settingsStatus').textContent = 'Tasks imported.'; refresh(); }
            });
            if (btnExportNotes) btnExportNotes.addEventListener('click', async () => {
                const ok = await window.api.exportNotesDialog();
                if (ok) document.getElementById('settingsStatus').textContent = 'Notifications exported.';
            });
            if (btnImportNotes) btnImportNotes.addEventListener('click', async () => {
                const ok = await window.api.importNotesDialog();
                if (ok) { document.getElementById('settingsStatus').textContent = 'Notifications imported.'; refresh(); }
            });
    });
    refresh();
});

// date checkbox show/hide
document.addEventListener('DOMContentLoaded', () => {
    const chk = document.getElementById('hasDate');
    const inputDate = document.getElementById('noteDate');
    if (chk && inputDate) {
        chk.addEventListener('change', () => {
            inputDate.style.display = chk.checked ? 'inline-block' : 'none';
        });
    }
    // title bar buttons - rely on window hiding
    const btnClose = document.getElementById('btnClose');
    const btnMin = document.getElementById('btnMin');
            if (btnClose) btnClose.addEventListener('click', () => window.api.hideWindow());
            if (btnMin) btnMin.addEventListener('click', () => window.api.minimizeWindow());
});
