// Shared snapshot helpers (changedSections is used for marks alerts)
if (typeof importScripts === 'function') importScripts('snapshot.js');

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
chrome.runtime.onInstalled.addListener(() => { setupAlarms(true); checkForUpdate(); });
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
  chrome.notifications.create('jf-marks', {
    type: 'basic',
    iconUrl: 'favicon.png',
    title: 'Flex Prime: new marks added',
    message: changed.map(c => `${c.title}: ${c.secs.join(', ')}`).join('\n').slice(0, 300),
    priority: 1
  });
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
  chrome.notifications.create('jf-att', {
    type: 'basic',
    iconUrl: 'favicon.png',
    title: 'Flex Prime: attendance below 80%',
    message: fresh.map(c => `${c.title}: ${c.pct.toFixed(2)}%`).join('\n').slice(0, 300),
    priority: 2
  });
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
  const line = (d) => d.daysLeft < 0 ? `${d.amount} was due on ${d.due} (overdue)`
    : d.daysLeft === 0 ? `${d.amount} is due TODAY (${d.due})`
    : `${d.amount} is due in ${d.daysLeft} day${d.daysLeft > 1 ? 's' : ''} (${d.due})`;
  chrome.notifications.create('jf-fee', {
    type: 'basic',
    iconUrl: 'favicon.png',
    title: 'Flex Prime: fee challan reminder',
    message: fresh.map(line).join('\n').slice(0, 300),
    priority: 2
  });
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

// ── Wait for the target page to finish loading, then inject the feature ──────
function injectOnceLoaded(tabId, urlFragment, fn) {
  const listener = (updatedTabId, changeInfo, updatedTab) => {
    if (updatedTabId !== tabId) return;
    if (changeInfo.status !== 'complete') return;
    if (!updatedTab.url?.includes(urlFragment)) return;

    chrome.tabs.onUpdated.removeListener(listener);

    // Give the page's own JS (AJAX data load) a moment to settle before injecting
    setTimeout(() => {
      chrome.scripting.executeScript({ target: { tabId }, function: fn });
    }, 800);
  };
  chrome.tabs.onUpdated.addListener(listener);

  // Safety: remove listener after 15s in case navigation never completes
  setTimeout(() => chrome.tabs.onUpdated.removeListener(listener), 15000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── INJECTED FUNCTIONS ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function marksMainFunction() {
  if (!window.location.href.includes('Student/StudentMarks')) {
    alert('Please open the Marks page first.');
    return;
  }
  const getTd = (className, id) => {
    let td = document.createElement('td');
    td.className = `text-center ${className}`;
    td.id = id;
    return td;
  };
  const getTr = (id) => {
    let tr = document.createElement('tr');
    tr.className = 'totalColumn_' + id;
    const ids = ['GrandtotalColMarks_', 'GrandtotalObtMarks_', 'GrandtotalClassAvg_', 'GrandtotalClassMin_', 'GrandtotalClassMax_', 'GrandtotalClassStdDev_'];
    const classes = ['totalColGrandTotal', 'totalColObtMarks', 'totalColAverageMark', 'totalColMinMarks', 'totalColMaxMarks', 'totalColStdDev'];
    classes.forEach((cls, i) => tr.appendChild(getTd(cls, ids[i] + id)));
    return tr;
  };
  const courses = document.querySelectorAll("div[class*='tab-pane']");
  courses.forEach(course => {
    const btn = course.querySelector("button[onclick*='ftn_calculateMarks']");
    if (btn) {
      const id = parseInt(btn.getAttribute('onclick').substring(20, 24));
      const tbody = course.querySelector(`div[id=${course.id}-Grand_Total_Marks] tbody`);
      if (!tbody) return;
      tbody.innerHTML = '';
      tbody.appendChild(getTr(id));
      let grandTotal = 0, totalObtained = 0, totalAverage = 0, totalMin = 0, totalMax = 0;
      course.querySelectorAll('.totalColumn_' + id).forEach(row => {
        const wt = row.querySelector('.totalColweightage')?.textContent;
        const obt = row.querySelector('.totalColObtMarks')?.textContent;
        if (wt) grandTotal += parseFloat(wt);
        if (obt) totalObtained += parseFloat(obt);
      });
      const parseNumber = (text) => {
        const value = parseFloat(text?.replace(/,/g, '').trim());
        return Number.isFinite(value) ? value : null;
      };

      const sectionStats = new Map();
      course.querySelectorAll('.calculationrow').forEach(cr => {
        const rowName = (cr.querySelector('td, th')?.textContent || '').trim();
        const sectionCard = cr.closest('.card');
        const sectionName = sectionCard?.querySelector('.card-header')?.textContent?.trim() || 'default';
        const weight = parseNumber(cr.querySelector('.weightage')?.textContent);
        const totalMarks = parseNumber(cr.querySelector('.GrandTotal')?.textContent);
        const avg = parseNumber(cr.querySelector('.AverageMarks')?.textContent);
        const mn = parseNumber(cr.querySelector('.MinMarks')?.textContent);
        const mx = parseNumber(cr.querySelector('.MaxMarks')?.textContent);

        if (!sectionStats.has(sectionName)) {
          sectionStats.set(sectionName, { entries: [], targetWeight: null });
        }
        const stats = sectionStats.get(sectionName);

        if (/^total$/i.test(rowName) && weight !== null) {
          stats.targetWeight = weight;
          return;
        }

        if (avg !== null && totalMarks > 0 && weight !== null) {
          const ratio = weight / totalMarks;
          stats.entries.push({
            contribution: avg * ratio,
            minContribution: mn !== null ? mn * ratio : 0,
            maxContribution: mx !== null ? mx * ratio : 0,
            weight,
            scoreRatio: avg / totalMarks
          });
        }
      });

      sectionStats.forEach(({ entries, targetWeight }) => {
        const allWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
        const sectionWeight = targetWeight !== null ? targetWeight : allWeight;
        let selected = entries;

        if (allWeight > sectionWeight + 1e-9) {
          selected = [];
          let remaining = sectionWeight;
          entries.sort((a, b) => b.scoreRatio - a.scoreRatio);
          for (const entry of entries) {
            if (remaining <= 1e-9) break;
            if (entry.weight <= remaining + 1e-9) {
              selected.push(entry);
              remaining -= entry.weight;
            } else {
              const fraction = remaining / entry.weight;
              selected.push({
                contribution: entry.contribution * fraction,
                minContribution: entry.minContribution * fraction,
                maxContribution: entry.maxContribution * fraction,
                weight: remaining,
                scoreRatio: entry.scoreRatio
              });
              remaining = 0;
              break;
            }
          }
        }

        selected.forEach(entry => {
          totalAverage += entry.contribution;
          totalMin += entry.minContribution;
          totalMax += entry.maxContribution;
        });
      });
      document.getElementById('GrandtotalColMarks_' + id).textContent = grandTotal.toFixed(2);
      document.getElementById('GrandtotalObtMarks_' + id).textContent = totalObtained.toFixed(2);
      document.getElementById('GrandtotalClassAvg_' + id).textContent = totalAverage.toFixed(2);
      document.getElementById('GrandtotalClassMin_' + id).textContent = totalMin.toFixed(2);
      document.getElementById('GrandtotalClassMax_' + id).textContent = totalMax.toFixed(2);

      // ── Auto-expand the Grand Total accordion panel ──
      // Only click if it's currently collapsed (avoid toggling it closed)
      const grandTotalDiv = course.querySelector(`div[id="${course.id}-Grand_Total_Marks"]`);
      const isCollapsed = grandTotalDiv && !grandTotalDiv.classList.contains('in');
      if (isCollapsed) {
        // Let Bootstrap's own handler do the expand — direct class manipulation doesn't work
        btn.click();
      }
    }
  });
}

function calculatorMainFunction() {
  if (!window.location.href.includes('Student/Transcript')) {
    alert('Please open the Transcript page first.');
    return;
  }

  const getGpaColor = (gpa) => {
    if (gpa >= 3.5) return '#16a34a';
    if (gpa >= 3.0) return '#2563eb';
    if (gpa >= 2.5) return '#d97706';
    return '#dc2626';
  };

  const gradeToValue = (text) => {
    const map = {
      'A+': 4, 'A': 4, 'A-': 3.67,
      'B+': 3.33, 'B': 3, 'B-': 2.67,
      'C+': 2.33, 'C': 2, 'C-': 1.67,
      'D+': 1.33, 'D': 1, 'F': 0,
      'S': -2, 'U': -3
    };
    return map[text.trim()] !== undefined ? map[text.trim()] : -1;
  };

  const getSelect = (currGradeText) => {
    const options = [
      ['-1','Select'],
      ['4','A / A+'],['3.67','A-'],
      ['3.33','B+'],['3','B'],['2.67','B-'],
      ['2.33','C+'],['2','C'],['1.67','C-'],
      ['1.33','D+'],['1','D'],['0','F'],
      ['-2','S'],['-3','U'],
    ];
    const currVal = gradeToValue(currGradeText.trim());
    let html = `<select style="font-family:'Inter',sans-serif;font-size:11px;padding:2px 2px;border-radius:5px;border:1px solid #e2e8f0;background:#f8fafc;cursor:pointer;max-width:80px;width:80px;box-sizing:border-box;">`;
    options.forEach(([val, label]) => {
      const sel = (val !== '-1' && parseFloat(val) === currVal) ? 'selected' : '';
      html += `<option value="${val}" ${sel}>${label}</option>`;
    });
    return html + '</select>';
  };

  const semesters = document.querySelectorAll('.col-md-6');
  if (semesters.length === 0) { alert('No semester data found on this page.'); return; }

  if (!document.getElementById('fp-gpa-calc-style')) {
    const s = document.createElement('style');
    s.id = 'fp-gpa-calc-style';
    s.textContent = `
      .col-md-6 table {
        table-layout: fixed !important;
        width: 100% !important;
      }
      .col-md-6 table th:nth-child(1), .col-md-6 table td:nth-child(1) {
        width: 12% !important; word-break: break-word !important; padding: 6px 4px !important;
      }
      .col-md-6 table th:nth-child(2), .col-md-6 table td:nth-child(2) {
        width: 16% !important; word-break: break-word !important;
        white-space: normal !important; padding: 6px 5px !important; font-size: 11px !important;
      }
      .col-md-6 table th:nth-child(3), .col-md-6 table td:nth-child(3) {
        width: 15% !important; word-break: break-word !important;
        white-space: normal !important; padding: 6px 3px !important; font-size: 11px !important;
      }
      .col-md-6 table th:nth-child(4), .col-md-6 table td:nth-child(4) {
        width: 10% !important; text-align: center !important; padding: 6px 3px !important;
      }
      .col-md-6 table th:nth-child(5), .col-md-6 table td:nth-child(5) {
        width: 14% !important; overflow: hidden !important;
        padding: 6px 3px !important; text-align: center !important;
      }
      .col-md-6 table td:nth-child(5) select {
        width: 100% !important; max-width: 100% !important;
        font-size: 11px !important; padding: 2px 1px !important; box-sizing: border-box !important;
      }
      .col-md-6 table th:nth-child(6), .col-md-6 table td:nth-child(6) {
        width: 9% !important; text-align: center !important; padding: 6px 3px !important;
      }
      .col-md-6 table th:nth-child(7), .col-md-6 table td:nth-child(7) {
        width: 10% !important; text-align: center !important;
        padding: 6px 3px !important; font-size: 11px !important;
      }
      .col-md-6 table th:nth-child(8), .col-md-6 table td:nth-child(8) {
        width: 14% !important; padding: 6px 3px !important; font-size: 11px !important;
      }
    `;
    document.head.appendChild(s);
  }

  const lastSem = semesters[semesters.length - 1];
  lastSem.querySelectorAll('tbody > tr').forEach(row => {
    const gradeCell = row.querySelectorAll('td.text-center')[1];
    if (gradeCell && !gradeCell.querySelector('select')) {
      gradeCell.innerHTML = getSelect(gradeCell.innerText.trim());
    }
  });

  const spans = lastSem.querySelectorAll('span');
  const cgpaElem = spans[2];
  const sgpaElem = spans[3];

  const recalc = () => {
    let semCH = 0, semGP = 0;
    lastSem.querySelectorAll('select').forEach(sel => {
      const v = parseFloat(sel.value);
      if (isNaN(v) || v < 0) return;
      const chCell = sel.closest('td').previousElementSibling;
      const ch = parseInt(chCell?.innerText?.replace(/\s/g, '') || '0') || 0;
      semCH += ch;
      semGP += ch * v;
    });
    const sgpa = semCH > 0 ? semGP / semCH : 0;

    const courseLatest = {};
    semesters.forEach(sem => {
      sem.querySelectorAll('tbody > tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;
        const courseName = cells[1]?.innerText?.trim() || '';
        const ch = parseInt(cells[3]?.innerText?.replace(/\s/g, '') || '0') || 0;
        const gradeCell = cells[4];
        const selectEl = gradeCell?.querySelector('select');
        const gradeValue = selectEl ? parseFloat(selectEl.value) : gradeToValue(gradeCell?.innerText?.trim() || '');
        if (gradeValue >= 0 && courseName) courseLatest[courseName] = { ch, gradeValue };
      });
    });

    let totalCH = 0, totalGP = 0;
    Object.values(courseLatest).forEach(({ ch, gradeValue }) => {
      totalCH += ch; totalGP += ch * gradeValue;
    });
    const cgpa = totalCH > 0 ? totalGP / totalCH : 0;

    const chipStyle = (color) => `font-family:'JetBrains Mono',monospace;color:${color};font-weight:700;font-size:13px;background:${color}18;border:1.5px solid ${color}55;border-radius:8px;padding:4px 12px;letter-spacing:0.5px;display:inline-block;margin-top:4px;`;

    if (sgpaElem) {
      sgpaElem.innerHTML = semCH > 0
        ? `<span style="${chipStyle(getGpaColor(sgpa))}">SGPA: ${sgpa.toFixed(2)}</span>`
        : `<span style="color:#94a3b8;font-size:12px;">SGPA: — (select grades above)</span>`;
    }
    if (cgpaElem && totalCH > 0) {
      cgpaElem.innerHTML = `<span style="${chipStyle(getGpaColor(cgpa))}">CGPA: ${cgpa.toFixed(2)}</span>`;
    }
  };

  lastSem.querySelectorAll('select').forEach(s => s.addEventListener('change', recalc));
  recalc();
}
