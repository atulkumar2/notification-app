function parseHHMM(str) {
  if (!str) return null;
  const m = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return { hh, mm };
}

module.exports = function createScheduler({ onFire, getNotifications, onUpdate }) {
  function tick() {
    const now = new Date();
    const hh = now.getHours();
    const mm = now.getMinutes();
    const cfg = { notifications: [...getNotifications()] };

    let changed = false;
    for (const note of cfg.notifications) {
      if (!note.enabled) continue;
      const parsed = parseHHMM(note.time);
      if (!parsed) continue;
      if (parsed.hh === hh && parsed.mm === mm) {
        onFire(note);
        if (note.repeat === 'once') {
          note.enabled = false;
          changed = true;
        }
      }
    }
    if (changed && onUpdate) onUpdate({ notifications: cfg.notifications });
  }

  // Check every 30 seconds to cover minute boundaries
  const id = setInterval(tick, 30000);
  return {
    dispose() { clearInterval(id); }
  };
};
