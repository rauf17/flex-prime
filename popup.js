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
function injectOnceLoaded(tabId, urlFragment, fn) {
  const listener = (updatedTabId, changeInfo, updatedTab) => {
    if (updatedTabId !== tabId) return;
    if (changeInfo.status !== 'complete') return;
    if (!updatedTab.url?.includes(urlFragment)) return;
    chrome.tabs.onUpdated.removeListener(listener);
    setTimeout(() => {
      chrome.scripting.executeScript({ target: { tabId }, function: fn });
    }, 800);
  };
  chrome.tabs.onUpdated.addListener(listener);
  setTimeout(() => chrome.tabs.onUpdated.removeListener(listener), 15000);
}

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

function injectDarkMode() {
  if (document.getElementById('__jugaadu_dark')) return;
  const style = document.createElement('style');
  style.id = '__jugaadu_dark';
  style.textContent = `
    body, .m-grid, .m-wrapper, .m-portlet, .modal-content { background: #0d0d14 !important; color: #eeeef8 !important; }
    .m-portlet__head, table, th, td { background: #141420 !important; border-color: #22223a !important; color: #a8a8cc !important; }
    input, select, textarea { background: #1a1a2e !important; color: #fff !important; border: 1px solid #44446a !important; }
    a { color: #8b7cf8 !important; }
  `;
  document.head.appendChild(style);
}

function removeDarkMode() {
  document.getElementById('__jugaadu_dark')?.remove();
}

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

// ── REPLACED Theme Marketplace Logic ──────────────────────────────────────────
const themeOptions = document.querySelectorAll('.fb-label');

themeOptions.forEach(label => {
  label.addEventListener('click', () => {
    const radioId = label.getAttribute('for');
    const radio = document.getElementById(radioId);
    if (!radio || radio.name !== 'theme-radio') return;

    const theme = radio.value;
    radio.checked = true;

    chrome.storage.local.set({ 'jf_theme': theme, 'dark_mode_global': (theme !== 'light') }, () => {
      getActiveTab((tab) => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (t) => {
            if (typeof applyClaudeTheme === 'function') applyClaudeTheme(t);
          },
          args: [theme]
        });
      });
    });
    showToast(`Theme: ${theme.toUpperCase()}`);
  });
});

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
            if (typeof applyClaudeTheme === 'function') applyClaudeTheme(t);
          },
          args: [theme]
        });
      });
    });
    showToast(`Theme: ${theme.toUpperCase()}`);
  });
});

// ── Reset Marks Snapshot (replaces old notification system) ──────────────────
const btnResetSnapshot = document.getElementById('btn-reset-snapshot');
if (btnResetSnapshot) {
  btnResetSnapshot.addEventListener('click', () => {
    chrome.storage.local.remove(['marks_snapshot', 'jf_seen_updates'], () => {
      showToast('Snapshot reset — reopen Marks page');
    });
  });
}

// ── Test Highlight: simulate EE3009 marks update ──────────────────────────────
const btnTestHighlight = document.getElementById('btn-test-highlight');
if (btnTestHighlight) {
  btnTestHighlight.addEventListener('click', () => {
    getActiveTab((tab) => {
      if (!isFlexHost(tab)) return showToast('Open FlexStudent Marks page first', 'error');
      if (!tab.url.includes('StudentMarks')) return showToast('Navigate to Marks page first', 'error');

      // Scrape the real current snapshot from the live page
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const snapshot = {};
          document.querySelectorAll("div[class*='tab-pane']").forEach(course => {
            const tabId = course.id;
            const title = document.querySelector(`a[href="#${tabId}"]`)?.textContent?.trim() || tabId;
            const rows = [];
            course.querySelectorAll('[class*="totalColumn_"]').forEach(row => {
              const obt = row.querySelector('.totalColObtMarks')?.textContent?.trim();
              const wt = row.querySelector('.totalColweightage')?.textContent?.trim();
              if (obt !== undefined || wt !== undefined) rows.push(`w${wt}:o${obt}`);
            });
            course.querySelectorAll('.calculationrow').forEach(cr => {
              const avg = cr.querySelector('.AverageMarks')?.textContent?.trim();
              const tot = cr.querySelector('.GrandTotal')?.textContent?.trim();
              if (avg !== undefined) rows.push(`avg${avg}_tot${tot}`);
            });
            if (rows.length > 0) snapshot[title] = rows.join('|');
          });
          return snapshot;
        }
      }, (results) => {
        const liveSnapshot = results?.[0]?.result;
        if (!liveSnapshot || Object.keys(liveSnapshot).length === 0) {
          return showToast('Marks page not loaded yet', 'error');
        }

        // Find the key that contains EE3009
        const ee3009Key = Object.keys(liveSnapshot).find(k => k.includes('EE3009'));
        if (!ee3009Key) {
          return showToast('EE3009 not found on this page', 'error');
        }

        // Save a "stale" snapshot: EE3009 gets a fake old value, rest are real
        const staleSnapshot = { ...liveSnapshot };
        staleSnapshot[ee3009Key] = staleSnapshot[ee3009Key] + '|__TEST_STALE__';

        // Also clear seen list so the highlight isn't suppressed
        chrome.storage.local.set({ marks_snapshot: JSON.stringify(staleSnapshot), jf_seen_updates: [] }, () => {
          // Reload the marks page so content.js re-runs and detects the diff
          chrome.tabs.reload(tab.id);
          showToast('Test active — EE3009 will be highlighted!');
        });
      });
    });
  });
}