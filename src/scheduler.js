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
  function scheduleNextRandom(note) {
    // schedule within next randomWithinHours window, but not later than that
    const maxH = Math.max(1, Math.min(24, Number(note.randomWithinHours || 0)));
    const now = Date.now();
    const deltaMs = Math.floor(Math.random() * maxH * 60 * 60 * 1000);
    note.nextAt = now + deltaMs;
  }

  function tick() {
    const now = new Date();
    const hh = now.getHours();
    const mm = now.getMinutes();
    const cfg = { notifications: [...getNotifications()] };

    let changed = false;
    for (const note of cfg.notifications) {
      if (!note.enabled) continue;
      // If date specified, only trigger on that date
      if (note.date) {
        const d = new Date(note.date);
        if (isFinite(d)) {
          if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth() || d.getDate() !== now.getDate()) {
            continue;
          }
        }
      }

      const randomWindow = Number(note.randomWithinHours || 0);
      if (randomWindow > 0) {
        if (!note.nextAt || note.nextAt < Date.now()) {
          scheduleNextRandom(note);
          changed = true;
        }
        if (Date.now() >= note.nextAt) {
          onFire(note);
          if (note.repeat === 'once') {
            note.enabled = false;
          } else {
            scheduleNextRandom(note);
          }
          changed = true;
        }
        continue;
      }

      const parsed = parseHHMM(note.time);
      if (!parsed) continue;
      // Additional repeat gating for weekly/monthly
      if (note.repeat === 'weekly') {
        if (note.date && !note.weekday) {
          const d = new Date(note.date);
          if (isFinite(d)) { note.weekday = d.getDay(); changed = true; }
        }
        if (note.weekday == null) { note.weekday = now.getDay(); changed = true; }
        if (now.getDay() !== note.weekday) continue;
      }
      if (note.repeat === 'monthly') {
        if (note.date && !note.monthday) {
          const d = new Date(note.date);
          if (isFinite(d)) { note.monthday = d.getDate(); changed = true; }
        }
        if (note.monthday == null) { note.monthday = now.getDate(); changed = true; }
        if (now.getDate() !== note.monthday) continue;
      }
      if (parsed.hh === hh && parsed.mm === mm) {
        onFire(note);
        if (note.repeat === 'once') {
          note.enabled = false;
          changed = true;
        } else if (note.repeat === 'weekly') {
          // disable for the rest of the day and rely on minute check tomorrow-next days
          // no state needed; minute match will only happen next week on the same weekday
        } else if (note.repeat === 'monthly') {
          // same time & day-of-month each month; fire will occur again when date matches
          // rely on day check below (add simple date gating)
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
