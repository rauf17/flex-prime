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

  root.FPSnap = { scrapeSnapshot, changedSections, paneTotals, courseTotals, semLabel, scanOlderSemesters };
})(typeof self !== 'undefined' ? self : window);
