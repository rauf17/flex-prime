// ── UI refs ──────────────────────────────────────────────────────────────────
const btnMarks = document.getElementById('btn-marks');
const btnGpa = document.getElementById('btn-gpa');
const btnFeedback = document.getElementById('btn-feedback');
const btnPdf = document.getElementById('btn-pdf');
const toast = document.getElementById('toast');
const toastSvg = document.getElementById('toast-svg');
const toastMsg = document.getElementById('toast-msg');

// ── Toast Logic ──────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
  clearTimeout(toastTimer);
  toastMsg.textContent = msg;
  if (type === 'error') {
    toastSvg.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
    toast.className = 'toast error show';
  } else {
    toastSvg.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
    toast.className = 'toast show';
  }
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 2800);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getActiveTab(cb) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => cb(tabs[0]));
}

function isFlexHost(tab) {
  return tab?.url?.includes('flexstudent.nu.edu.pk');
}

// ── Navigate then auto-inject once page loads (mirrors background.js logic) ──

// Helper to inject code from existing functions sitewide
function injectFunction(func, args = []) {
  getActiveTab((tab) => {
    if (!isFlexHost(tab)) return showToast('Open FlexStudent first', 'error');
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: func,
      args: args
    });
  });
}

// ── Button handlers ──────────────────────────────────────────────────────────
btnMarks.addEventListener('click', () => {
  getActiveTab((tab) => {
    if (!isFlexHost(tab)) return showToast('Open FlexStudent first', 'error');
    if (tab.url.includes('StudentMarks')) {
      chrome.scripting.executeScript({ target: { tabId: tab.id }, function: marksMainFunction });
      showToast('Grand total fixed!');
    } else {
      // Navigate via sidebar click to keep session alive — chrome.tabs.update causes logout
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const link = document.querySelector('a[href*="StudentMarks"]') ||
                       document.querySelector('a[href="/Student/StudentMarks"]');
          if (link) { link.click(); } else { window.location.href = '/Student/StudentMarks'; }
        }
      });
      injectOnceLoaded(tab.id, 'StudentMarks', marksMainFunction);
      showToast('Opening Marks page...');
    }
  });
});

btnGpa.addEventListener('click', () => {
  getActiveTab((tab) => {
    if (!isFlexHost(tab)) return showToast('Open FlexStudent first', 'error');
    if (tab.url.includes('Transcript')) {
      chrome.scripting.executeScript({ target: { tabId: tab.id }, function: calculatorMainFunction });
      showToast('GPA Calculator activated!');
    } else {
      // Navigate via sidebar click to keep session alive — chrome.tabs.update causes logout
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const link = document.querySelector('a[href*="Transcript"]') ||
                       document.querySelector('a[href="/Student/Transcript"]');
          if (link) { link.click(); } else { window.location.href = '/Student/Transcript'; }
        }
      });
      injectOnceLoaded(tab.id, 'Transcript', calculatorMainFunction);
      showToast('Opening Transcript page...');
    }
  });
});

btnFeedback.addEventListener('click', () => {
  const input = document.querySelector('input[name="feedback-radio"]:checked');
  if (!input) return showToast('Select a feedback option first', 'error');
  injectFunction(feedbackMainFunction, [input.value]);
  showToast('Feedback set: ' + input.value);
});

btnPdf.addEventListener('click', () => {
  getActiveTab((tab) => {
    if (!isFlexHost(tab)) return showToast('Open FlexStudent first', 'error');
    if (!tab.url.includes('Transcript')) return showToast('Open Transcript page first', 'error');
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: transcriptPdfFunction
    });
    showToast('Generating PDF...');
  });
});

// ── Dark Mode Logic (handled by Theme Marketplace below) ─────────────────────

// ── Functions to be Injected ─────────────────────────────────────────────────

function feedbackMainFunction(input) {
  const questions = document.getElementsByClassName('m-list-timeline__item');
  Array.from(questions).forEach(q => {
    const spans = q.getElementsByClassName('m-list-timeline__time');
    const idx = input === 'Randomize' ? Math.floor(Math.random() * spans.length) : Array.from(spans).findIndex(s => s.textContent.trim() === input);
    if (spans[idx]) spans[idx].querySelector('input').checked = true;
  });
}
function transcriptPdfFunction() {
  // ── 1. DATA SCRAPER ──
  const pageText = document.body.innerText;
  const nameMatch = pageText.match(/Name:\s*([^\n|]+)/i);
  let studentName = nameMatch ? nameMatch[1].trim() : "Student";
  const rollMatch = pageText.match(/Roll No:\s*([^\s\n|]+)/i);
  let rollNo = rollMatch ? rollMatch[1].trim() : "N/A";

  const tabTitle = "Transcript - " + studentName;
  const generatedDate = new Date().toLocaleDateString('en-PK', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // ── 2. DATA COLLECTION ──
  const semesterBlocks = document.querySelectorAll('.col-md-6:has(table)');
  const semesters = [];
  semesterBlocks.forEach(block => {
    const allText = block.innerText.split('\n').map(s => s.trim()).filter(Boolean);
    const semTitle = allText[0] || 'Semester';
    const summaryLine = allText.find(l => l.includes('CGPA') || l.includes('SGPA')) || '';
    const rows = [];
    block.querySelectorAll('tbody tr').forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
      if (cells.length >= 5 && cells[0]) {
        rows.push({ code: cells[0], name: cells[1], crHrs: cells[3], grade: cells[4], points: cells[5], remarks: cells[7] });
      }
    });
    if (rows.length > 0) {
      semesters.push({
        title: semTitle,
        sgpa: summaryLine.match(/SGPA\s*[:\-]?\s*([\d.]+)/i)?.[1] || '0.00',
        cgpa: summaryLine.match(/CGPA\s*[:\-]?\s*([\d.]+)/i)?.[1] || '0.00',
        rows
      });
    }
  });

  const overallCGPA = semesters.length > 0 ? semesters[semesters.length - 1].cgpa : '-';

  // ── 3. BUILD UI ──
  const semesterHTML = semesters.map(sem => `
    <div class="sem-block">
      <div class="sem-header">
        <span class="sem-title">${sem.title.toUpperCase()}</span>
        <span class="sem-stats">SGPA: <u>${sem.sgpa}</u> &nbsp;|&nbsp; CGPA: <u>${sem.cgpa}</u></span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 15%">CODE</th>
            <th style="width: 50%">COURSE TITLE</th>
            <th style="width: 10%; text-align: center;">CR. HRS</th>
            <th style="width: 10%; text-align: center;">GRADE</th>
            <th style="width: 15%; text-align: center;">POINTS</th>
          </tr>
        </thead>
        <tbody>
          ${sem.rows.map(r => `
            <tr>
              <td class="mono">${r.code}</td>
              <td class="course-name">${r.name}</td>
              <td class="center">${r.crHrs}</td>
              <td class="center grade">${r.grade}</td>
              <td class="center">${r.points}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`).join('');

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${tabTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    @page { margin: 0; size: A4; }
    
    body { 
      font-family: 'Inter', sans-serif; 
      font-size: 10px; 
      color: #1e293b; 
      background: #f1f5f9; 
      margin: 0; padding: 0; 
    }

    .page-container {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm 18mm;
      margin: 20px auto;
      background: white;
      position: relative;
      box-shadow: 0 0 30px rgba(0,0,0,0.15);
      border-top: 8px solid #1e3a8a;
    }

    .doc-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      border-bottom: 2px solid #e2e8f0; 
      padding-bottom: 15px; 
      margin-bottom: 25px; 
    }

    .uni-title h1 { 
      font-family: 'Cinzel', serif; 
      font-size: 22px; 
      margin: 0; 
      color: #1e3a8a; 
      letter-spacing: 1px;
    }
    .uni-title p { margin: 2px 0 0 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 9px; letter-spacing: 2px; }

    .doc-label { text-align: right; }
    .doc-label h2 { font-size: 14px; margin: 0; color: #1e3a8a; text-transform: uppercase; letter-spacing: 1px; }
    .doc-label p { margin: 3px 0 0 0; color: #94a3b8; font-size: 9px; }

    .student-bar {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 12px 15px;
      margin-bottom: 25px;
    }
    .info-item label { display: block; font-size: 7px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
    .info-item span { font-size: 11px; font-weight: 700; color: #1e293b; }

    .cgpa-pill {
      grid-column: span 3;
      background: #1e3a8a;
      color: white;
      text-align: center;
      padding: 6px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 13px;
      margin-top: 5px;
    }

    .sem-block { margin-bottom: 20px; page-break-inside: avoid; }
    
    .sem-header { 
      display: flex; 
      justify-content: space-between; 
      background: #1e3a8a; 
      color: white; 
      padding: 7px 12px; 
      border-radius: 4px 4px 0 0; 
      font-weight: 700;
      font-size: 9px;
    }

    table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #e2e8f0; border-top: none; }
    th { 
      background: #f1f5f9; 
      padding: 8px; 
      text-align: left; 
      font-size: 8px; 
      color: #475569; 
      border-bottom: 1px solid #e2e8f0;
    }
    td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; font-size: 9.5px; vertical-align: middle; }
    
    .mono { font-family: 'JetBrains Mono', monospace; font-size: 8.5px; color: #64748b; }
    .course-name { font-weight: 600; color: #1e293b; }
    .grade { font-weight: 800; color: #1e3a8a; }
    .center { text-align: center; }

    .no-print { 
      display: block; width: 200px; margin: 30px auto 10px; padding: 12px; 
      background: #1e3a8a; color: white; border: none; border-radius: 6px; 
      cursor: pointer; font-weight: 700; font-family: 'Inter', sans-serif;
      box-shadow: 0 4px 12px rgba(30, 58, 138, 0.3);
    }
    
    @media print { 
      body { background: white; }
      .page-container { margin: 0; box-shadow: none; width: 100%; border-top: none; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()">PRINT TRANSCRIPT</button>
  
  <div class="page-container">
    <div class="doc-header">
      <div class="uni-title">
        <h1>FAST &mdash; National University</h1>
        <p>Computer & Emerging Sciences</p>
      </div>
      <div class="doc-label">
        <h2>Academic Transcript</h2>
        <p>Official Verification: ${generatedDate}</p>
      </div>
    </div>

    <div class="student-bar">
      <div class="info-item"><label>Student Name</label><span>${studentName.toUpperCase()}</span></div>
      <div class="info-item"><label>Roll Number</label><span>${rollNo}</span></div>
      <div class="info-item"><label>Issuing Institution</label><span>FAST-NUCES ISLAMABAD</span></div>
      <div class="cgpa-pill">CUMULATIVE GRADE POINT AVERAGE (CGPA): ${overallCGPA}</div>
    </div>

    ${semesterHTML}
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=UTF-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

// ── Theme Marketplace Logic ──────────────────────────────────────────────────
const themeRadios = document.querySelectorAll('input[name="theme-radio"]');

// Load saved theme on popup open
chrome.storage.local.get(['jf_theme'], (res) => {
  const activeTheme = res.jf_theme || 'dark';
  const radio = document.getElementById(`t-${activeTheme}`);
  if (radio) radio.checked = true;
});

// Listener for theme changes
themeRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    const theme = radio.value;
    chrome.storage.local.set({
      'jf_theme': theme,
      'dark_mode_global': (theme !== 'light')
    }, () => {
      getActiveTab((tab) => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (t) => {
            if (typeof applyFlexPrimeTheme === 'function') applyFlexPrimeTheme(t);
          },
          args: [theme]
        });
      });
    });
    showToast(`Theme: ${theme.toUpperCase()}`);
  });
});

// ── All Semesters Summary page ───────────────────────────────────────────────
document.getElementById('btn-summary').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('summary.html') });
});

// ── Update notifier ──────────────────────────────────────────────────────────
// The background script compares our version with manifest.json on GitHub.
(function () {
  const banner = document.getElementById('update-banner');
  const text = document.getElementById('update-text');
  function show() {
    chrome.storage.local.get(['jf_update'], (res) => {
      const u = res.jf_update;
      if (u && u.hasUpdate) {
        text.textContent = `New version ${u.remote} is out (you have ${chrome.runtime.getManifest().version})`;
        banner.classList.add('show');
      } else {
        banner.classList.remove('show');
      }
    });
  }
  show();
  // Ask for a fresh check, then redraw
  chrome.runtime.sendMessage({ type: 'check-update' }, () => { void chrome.runtime.lastError; show(); });
})();

// ── Alert switches (marks / attendance / fees) ──────────────────────────────
// Each switch stores "off" under its own key, so alerts are on by default.
[
  ['alerts-toggle', 'jf_alerts_off', 'Marks alerts'],
  ['att-toggle', 'jf_att_alerts_off', 'Attendance alerts'],
  ['fee-toggle', 'jf_fee_alerts_off', 'Fee reminders']
].forEach(([id, key, name]) => {
  const toggle = document.getElementById(id);
  if (!toggle) return;
  chrome.storage.local.get([key], (res) => { toggle.checked = !res[key]; });
  toggle.addEventListener('change', () => {
    chrome.storage.local.set({ [key]: !toggle.checked });
    showToast(`${name} ${toggle.checked ? 'on' : 'off'}`);
  });
});

// ── What's new (shown once after an update) ──────────────────────────────────
const WHATS_NEW = {
  '2.5': "What's new: all-semesters summary page, marks / attendance / fee alerts, CGPA target planner and this one-menu popup."
};
(function () {
  const box = document.getElementById('whats-new');
  const text = document.getElementById('whats-new-text');
  const version = chrome.runtime.getManifest().version;
  chrome.storage.local.get(['jf_whats_new'], (res) => {
    if (res.jf_whats_new !== version || !WHATS_NEW[version]) return;
    text.textContent = WHATS_NEW[version];
    box.classList.add('show');
  });
  document.getElementById('whats-new-close').addEventListener('click', () => {
    box.classList.remove('show');
    chrome.storage.local.remove('jf_whats_new');
  });
})();
