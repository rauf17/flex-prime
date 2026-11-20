// snapshot.js — shared by content.js (live page), marks-extras.js, offscreen.js
// (background marks alerts) and background.js. Reads FlexStudent's Marks page markup.
(function (root) {
  const num = (t) => {
    const v = parseFloat(String(t == null ? '' : t).replace(/,/g, ''));
    return Number.isFinite(v) ? v : null;
  };

  const paneTitle = (doc, pane) =>
    doc.querySelector(`a[href="#${pane.id}"]`)?.textContent?.trim() || pane.id;

  // Section cards of one course pane (the first child holds them; anything we inject goes after it)
  function sectionCards(pane) {
    const inner = pane.children[0];
    return inner ? Array.from(inner.querySelectorAll(':scope > div.card')) : [];
  }

  function sectionName(card) {
    const header = card.querySelector('.card-header');
    if (!header) return null;
    const clone = header.cloneNode(true);
    clone.querySelectorAll('.jf-section-updated').forEach(el => el.remove());
    return clone.textContent?.trim() || null;
  }

  // { courseTitle: { sectionName: "serialised rows" } }
  function scrapeSnapshot(doc) {
    const snapshot = {};
    doc.querySelectorAll("div[class*='tab-pane']").forEach(pane => {
      const sections = {};
      sectionCards(pane).forEach(card => {
        const name = sectionName(card);
        if (!name || name === 'Grand Total Marks') return;
        const rows = [];
        card.querySelectorAll('[class*="totalColumn_"]').forEach(row => {
          const obt = row.querySelector('.totalColObtMarks')?.textContent?.trim() || '';
          const wt = row.querySelector('.totalColweightage')?.textContent?.trim() || '';
          if (obt || wt) rows.push(`w${wt}:o${obt}`);
        });
        card.querySelectorAll('.calculationrow').forEach(cr => {
          const avg = cr.querySelector('.AverageMarks')?.textContent?.trim();
          const tot = cr.querySelector('.GrandTotal')?.textContent?.trim();
          if (avg !== undefined) rows.push(`avg${avg}_tot${tot}`);
        });
        // Keep empty sections too, so we notice when data first appears
        sections[name] = rows.length > 0 ? rows.join('|') : '__empty__';
      });
      snapshot[paneTitle(doc, pane)] = sections;
    });
    return snapshot;
  }

  // Names of sections whose data differs between two snapshots of one course
  function changedSections(prevCourse, currCourse) {
    if (!prevCourse) return Object.keys(currCourse);
    const changed = [];
    for (const sec in currCourse) {
      if (currCourse[sec] === '__empty__') continue;
      if (prevCourse[sec] !== currCourse[sec]) changed.push(sec);
    }
    return changed;
  }

  // Marks counted so far for one course: weightage published and weighted marks obtained
  function paneTotals(pane) {
    let weight = 0, obtained = 0;
    sectionCards(pane).forEach(card => {
      if (sectionName(card) === 'Grand Total Marks') return;
      card.querySelectorAll('[class*="totalColumn_"]').forEach(row => {
        weight += num(row.querySelector('.totalColweightage')?.textContent) || 0;
        obtained += num(row.querySelector('.totalColObtMarks')?.textContent) || 0;
      });
    });
    return { weight: Math.round(weight * 100) / 100, obtained: Math.round(obtained * 100) / 100 };
  }

  function courseTotals(doc) {
    return Array.from(doc.querySelectorAll("div[class*='tab-pane']")).map(pane => ({
      title: paneTitle(doc, pane),
      ...paneTotals(pane)
    }));
  }

  // ── Semesters ──────────────────────────────────────────────────────────────
  // Flex serves marks for ANY semester via /Student/StudentMarks?semid=YYYYT
  // (T: 1 = Spring, 2 = Summer, 3 = Fall) even when it is missing from its dropdown.
  const TERM_NAMES = { '1': 'Spring', '2': 'Summer', '3': 'Fall' };
  const semLabel = (id) => `${TERM_NAMES[String(id).slice(4)] || 'Term'} ${String(id).slice(0, 4)}`;

  // Walk backwards from the oldest semester Flex lists; stop after 6 empty terms in a row.
  // `base` is '' on Flex pages and the full site URL from the extension's own pages.
  async function scanOlderSemesters(base, oldestInDropdown) {
    let year = parseInt(String(oldestInDropdown).slice(0, 4), 10);
    let term = parseInt(String(oldestInDropdown).slice(4), 10);
    const step = () => { term--; if (term < 1) { term = 3; year--; } };
    const found = [];
    let emptyRun = 0;
    step();
    while (emptyRun < 6 && year >= 2015) {
      const id = `${year}${term}`;
      try {
        const html = await fetch(`${base}/Student/StudentMarks?semid=${id}`, { credentials: 'include' }).then(r => r.text());
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const courses = Array.from(doc.querySelectorAll('.nav-tabs a')).map(a => a.textContent.trim()).filter(Boolean);
        if (courses.length) { found.push({ id, label: semLabel(id), courses }); emptyRun = 0; }
        else emptyRun++;
      } catch (e) { return null; } // network problem: don't cache a half result
      step();
    }
    return found;
  }

  // ── Attendance ─────────────────────────────────────────────────────────────
  // Flex renders its own (official) attendance % in each course's progress bar.
  function attendanceStats(doc) {
    const out = [];
    doc.querySelectorAll("div[class*='tab-pane']").forEach(pane => {
      const pct = parseFloat(pane.querySelector('.progress')?.textContent);
      if (Number.isFinite(pct)) out.push({ title: paneTitle(doc, pane), pct });
    });
    return out;
  }

  // Which courses need a (new) low-attendance alert? `alerted` maps course -> % we last warned at.
  // Returns { fresh: [{title, pct}], alerted: updatedMap }. Warn again only if it drops further.
  function attendanceAlerts(stats, alerted, threshold) {
    const next = Object.assign({}, alerted);
    const fresh = [];
    stats.forEach(({ title, pct }) => {
      if (pct >= threshold) { delete next[title]; return; }
      const last = next[title];
      if (last === undefined || pct < last - 0.005) { fresh.push({ title, pct }); next[title] = pct; }
    });
    return { fresh, alerted: next };
  }

  // ── Fee challans ───────────────────────────────────────────────────────────
  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  function parseFlexDate(str) { // "04-Sep-2026"
    const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(String(str).trim());
    if (!m || MONTHS[m[2].toLowerCase()] === undefined) return null;
    return new Date(parseInt(m[3], 10), MONTHS[m[2].toLowerCase()], parseInt(m[1], 10));
  }

  // Rows of Flex's "Student Challan" table: { amount, generated, due, status }
  function challanRows(doc) {
    const seen = new Set(), out = [];
    doc.querySelectorAll('table').forEach(table => {
      if (!/Due Date/i.test(table.textContent)) return;
      table.querySelectorAll('tr').forEach(tr => {
        const c = Array.from(tr.children).map(x => x.textContent.trim().replace(/\s+/g, ' '));
        if (c.length < 5 || !parseFlexDate(c[3])) return;
        const key = c[1] + '|' + c[2] + '|' + c[3];
        if (seen.has(key)) return; // Flex repeats the table
        seen.add(key);
        out.push({ amount: c[1], generated: c[2], due: c[3], status: c[4] });
      });
    });
    return out;
  }

  // Unpaid challans due within `windowDays` (or recently overdue). `bucket` is the days left,
  // so a new reminder fires each day, and once when it becomes overdue.
  function feeReminders(rows, now, windowDays = 3) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const out = [];
    rows.forEach(r => {
      const unpaid = /(un|not)\s*-?\s*paid|pending|due/i.test(r.status);
      if (!unpaid && /paid|cancel|expire|void|reject|clos/i.test(r.status)) return;
      const due = parseFlexDate(r.due);
      if (!due) return;
      const daysLeft = Math.round((due - today) / 86400000);
      if (daysLeft > windowDays || daysLeft < -14) return;
      out.push({ key: `${r.amount}|${r.generated}|${r.due}`, daysLeft, bucket: daysLeft < 0 ? -1 : daysLeft, amount: r.amount, due: r.due });
    });
    return out;
  }

  root.FPSnap = {
    scrapeSnapshot, changedSections, paneTotals, courseTotals, semLabel, scanOlderSemesters,
    attendanceStats, attendanceAlerts, parseFlexDate, challanRows, feeReminders
  };
})(typeof self !== 'undefined' ? self : window);
