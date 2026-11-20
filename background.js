// Shared helpers: snapshot.js (marks/attendance/fee logic) and injected.js (functions run inside Flex pages)
if (typeof importScripts === 'function') importScripts('snapshot.js', 'injected.js');

const FLEX = 'https://flexstudent.nu.edu.pk';
const REPO_MANIFEST_URL = 'https://raw.githubusercontent.com/rauf17/flex-prime/main/manifest.json';

// ── ALARMS ───────────────────────────────────────────────────────────────────
// Background checks (marks, attendance, fees) and the update check both run every 12 hours.
const CHECK_EVERY_MIN = 12 * 60;

function setupAlarms(force) {
  [['jf-update', 2], ['jf-marks', 1]].forEach(([name, firstRunMin]) => {
    chrome.alarms.get(name, (existing) => {
      // On install/update replace old alarms (an older version used 30 minutes); on browser start keep them
      if (existing && !force && existing.periodInMinutes === CHECK_EVERY_MIN) return;
      chrome.alarms.create(name, { delayInMinutes: firstRunMin, periodInMinutes: CHECK_EVERY_MIN });
    });
  });
}
chrome.runtime.onInstalled.addListener((details) => {
  setupAlarms(true);
  checkForUpdate();
  // After an update (not a fresh install) the popup shows a one-time "what's new" note
  if (details.reason === 'update') chrome.storage.local.set({ jf_whats_new: chrome.runtime.getManifest().version });
});
chrome.runtime.onStartup.addListener(() => { setupAlarms(false); checkForUpdate(); });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'jf-update') checkForUpdate();
  if (alarm.name === 'jf-marks') runBackgroundChecks();
});
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'open-summary') {
    chrome.tabs.create({ url: chrome.runtime.getURL('summary.html') });
    return;
  }
  if (msg && msg.type === 'check-update') {
    checkForUpdate().then(() => sendResponse({ ok: true }));
    return true; // keep the channel open for the async reply
  }
});

// ── UPDATE CHECK ─────────────────────────────────────────────────────────────
// Compares our version with the manifest.json currently on GitHub (main branch).
function isNewer(remote, local) {
  const a = String(remote).split('.').map(Number), b = String(local).split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d > 0;
  }
  return false;
}

async function checkForUpdate() {
  try {
    const res = await fetch(REPO_MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const remote = (await res.json()).version;
    const local = chrome.runtime.getManifest().version;
    const hasUpdate = isNewer(remote, local);
    await chrome.storage.local.set({ jf_update: { remote, local, hasUpdate, at: Date.now() } });
    chrome.action.setBadgeText({ text: hasUpdate ? 'NEW' : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#0d9488' });
  } catch (e) { /* offline or GitHub unreachable: try again next time */ }
}

// ── BACKGROUND CHECKS ────────────────────────────────────────────────────────
// Every 12 hours, using the user's own FlexStudent login: marks, attendance and fee reminders.
async function parseInOffscreen(html, type) {
  if (!(await chrome.offscreen.hasDocument())) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSER'],
      justification: 'Read FlexStudent pages to detect new marks, low attendance and fee deadlines'
    });
  }
  return chrome.runtime.sendMessage({ target: 'offscreen', type, html });
}

// Latest semester id + the Challan link (also tells us whether we are still logged in)
async function getSession() {
  const res = await fetch(`${FLEX}/Student/StudentMarks`, { credentials: 'include' });
  if (!res.ok) return null;
  const html = await res.text();
  const ids = [...html.matchAll(/<option[^>]*value="(\d{5})"/g)].map(m => parseInt(m[1], 10));
  if (!ids.length) return null; // logged out, or a verification page
  const challan = html.match(/href="(\/Student\/Challan\?dump=[^"]+)"/);
  return { latest: String(Math.max(...ids)), challanHref: challan ? challan[1].replace(/&amp;/g, '&') : null };
}

let checksRunning = false;
async function runBackgroundChecks() {
  if (checksRunning) return;
  checksRunning = true;
  try {
    if (!chrome.offscreen) return;
    const off = await chrome.storage.local.get(['jf_alerts_off', 'jf_att_alerts_off', 'jf_fee_alerts_off']);
    if (off.jf_alerts_off && off.jf_att_alerts_off && off.jf_fee_alerts_off) return;
    const session = await getSession();
    if (!session) return;
    await chrome.storage.local.set({ jf_latest_sem: session.latest, jf_challan_href: session.challanHref });
    // One failing check must not stop the others
    if (!off.jf_alerts_off) await checkMarks(session).catch(() => {});
    if (!off.jf_att_alerts_off) await checkAttendance(session).catch(() => {});
    if (!off.jf_fee_alerts_off) await checkFees(session).catch(() => {});
  } catch (e) { /* network or parsing problem: try again next time */ }
  finally {
    checksRunning = false;
    try { if (chrome.offscreen && await chrome.offscreen.hasDocument()) await chrome.offscreen.closeDocument(); } catch (e) {}
  }
}

// Marks: compare with the baseline saved by the Marks page
async function checkMarks(session) {
  const page = await fetch(`${FLEX}/Student/StudentMarks?semid=${session.latest}`, { credentials: 'include' });
  if (!page.ok) return;
  const reply = await parseInOffscreen(await page.text(), 'snapshot');
  const snapshot = reply && reply.snapshot;
  if (!snapshot || !Object.keys(snapshot).length) return;

  const st = await chrome.storage.local.get(['marks_snapshot', 'marks_snapshot_sem', 'jf_seen_updates', 'jf_last_alert']);
  if (!st.marks_snapshot || st.marks_snapshot_sem !== session.latest) return; // no baseline yet: opening Marks once creates it
  const prev = JSON.parse(st.marks_snapshot);
  const seen = st.jf_seen_updates || [];
  const changed = [];
  for (const title in snapshot) {
    if (seen.includes(title)) continue;
    const secs = FPSnap.changedSections(prev[title], snapshot[title]);
    if (secs.length) changed.push({ title, secs });
  }
  if (!changed.length) return;

  // Notify once per distinct change
  const signature = JSON.stringify(changed.map(c => [c.title, c.secs, c.secs.map(s => snapshot[c.title][s])]));
  if (st.jf_last_alert === signature) return;
  await chrome.storage.local.set({ jf_last_alert: signature, jf_pending_courses: changed.map(c => c.title) });
  chrome.notifications.create('jf-marks', { type: 'basic', iconUrl: 'favicon.png', priority: 1, ...FPSnap.marksAlertMessage(changed) });
}

// Attendance: warn when a course drops below 80% (Flex's own percentage)
async function checkAttendance(session) {
  const page = await fetch(`${FLEX}/Student/StudentAttendance?semid=${session.latest}`, { credentials: 'include' });
  if (!page.ok) return;
  const reply = await parseInOffscreen(await page.text(), 'attendance');
  const stats = reply && reply.attendance;
  if (!stats || !stats.length) return;

  const { jf_att_alerted } = await chrome.storage.local.get('jf_att_alerted');
  const { fresh, alerted } = FPSnap.attendanceAlerts(stats, jf_att_alerted || {}, 80);
  await chrome.storage.local.set({ jf_att_alerted: alerted });
  if (!fresh.length) return;
  chrome.notifications.create('jf-att', { type: 'basic', iconUrl: 'favicon.png', priority: 2, ...FPSnap.attendanceAlertMessage(fresh) });
}

// Fees: remind 3 days before an unpaid challan is due, every day after that, and once when overdue
async function checkFees(session) {
  if (!session.challanHref) return;
  const page = await fetch(FLEX + session.challanHref, { credentials: 'include' });
  if (!page.ok) return;
  const reply = await parseInOffscreen(await page.text(), 'challans');
  const rows = reply && reply.challans;
  if (!rows) return;

  const due = FPSnap.feeReminders(rows, new Date());
  const { jf_fee_alerted } = await chrome.storage.local.get('jf_fee_alerted');
  const before = jf_fee_alerted || {};
  const after = {};
  const fresh = [];
  due.forEach(d => {
    after[d.key] = d.bucket; // forget challans that are paid or no longer relevant
    if (before[d.key] !== d.bucket) fresh.push(d);
  });
  await chrome.storage.local.set({ jf_fee_alerted: after });
  if (!fresh.length) return;
  chrome.notifications.create('jf-fee', { type: 'basic', iconUrl: 'favicon.png', priority: 2, ...FPSnap.feeAlertMessage(fresh) });
}

chrome.notifications.onClicked.addListener(async (id) => {
  const st = await chrome.storage.local.get(['jf_latest_sem', 'jf_challan_href']);
  const sem = st.jf_latest_sem ? `?semid=${st.jf_latest_sem}` : '';
  const target = {
    'jf-marks': `/Student/StudentMarks${sem}`,
    'jf-att': `/Student/StudentAttendance${sem}`,
    'jf-fee': st.jf_challan_href || '/Student/Challan'
  }[id];
  if (!target) return;
  chrome.tabs.create({ url: FLEX + target });
  chrome.notifications.clear(id);
});

// ── COMMAND LISTENER (keyboard shortcuts) ────────────────────────────────────
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.url?.includes('flexstudent.nu.edu.pk')) return;

    if (command === 'fix-marks') {
      if (tab.url.includes('StudentMarks')) {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, function: marksMainFunction });
      } else {
        // Navigate via sidebar click to keep session alive, then auto-inject once loaded
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const link =
              document.querySelector('a[href*="StudentMarks"]') ||
              document.querySelector('a[href="/Student/StudentMarks"]');
            if (link) { link.click(); } else { window.location.href = '/Student/StudentMarks'; }
          }
        });
        injectOnceLoaded(tab.id, 'StudentMarks', marksMainFunction);
      }
    } else if (command === 'toggle-gpa') {
      if (tab.url.includes('Transcript')) {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, function: calculatorMainFunction });
      } else {
        // Navigate via sidebar click to keep session alive, then auto-inject once loaded
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const link =
              document.querySelector('a[href*="Transcript"]') ||
              document.querySelector('a[href="/Student/Transcript"]');
            if (link) { link.click(); } else { window.location.href = '/Student/Transcript'; }
          }
        });
        injectOnceLoaded(tab.id, 'Transcript', calculatorMainFunction);
      }
    }
  });
});

