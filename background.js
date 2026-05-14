// ── COMMAND LISTENER (keyboard shortcuts) ────────────────────────────────────
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab?.url?.includes('flexstudent.nu.edu.pk')) {
      if (command === "fix-marks") {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, function: marksMainFunction });
      } else if (command === "toggle-gpa") {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, function: calculatorMainFunction });
      }
    }
  });
});

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
      course.querySelectorAll('.calculationrow').forEach(cr => {
        const avg = cr.querySelector('.AverageMarks')?.textContent;
        const tot = cr.querySelector('.GrandTotal')?.textContent;
        const wt = cr.querySelector('.weightage')?.textContent;
        const mn = cr.querySelector('.MinMarks')?.textContent;
        const mx = cr.querySelector('.MaxMarks')?.textContent;
        if (avg && tot && wt) {
          const ratio = parseFloat(wt) / parseFloat(tot);
          totalAverage += parseFloat(avg) * ratio;
          totalMin += parseFloat(mn) * ratio;
          totalMax += parseFloat(mx) * ratio;
        }
      });
      document.getElementById('GrandtotalColMarks_' + id).textContent = grandTotal.toFixed(2);
      document.getElementById('GrandtotalObtMarks_' + id).textContent = totalObtained.toFixed(2);
      document.getElementById('GrandtotalClassAvg_' + id).textContent = totalAverage.toFixed(2);
      document.getElementById('GrandtotalClassMin_' + id).textContent = totalMin.toFixed(2);
      document.getElementById('GrandtotalClassMax_' + id).textContent = totalMax.toFixed(2);
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