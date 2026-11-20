// summary.js — All Semesters Summary page (an extension page, opened from the Marks page or popup).
// It reads each semester's marks page with the user's own FlexStudent login.
const BASE = 'https://flexstudent.nu.edu.pk';
const TTL_RECENT = 6 * 3600 * 1000;      // semesters Flex still lists: marks may still change
const TTL_OLD = 30 * 24 * 3600 * 1000;   // older semesters: effectively final

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => String(Math.round(n * 100) / 100);
// Colours come from CSS variables so every theme gets a readable palette
const pctColor = (p) => p >= 80 ? 'var(--good)' : p >= 65 ? 'var(--ok)' : p >= 50 ? 'var(--mid)' : 'var(--bad)';
const store = {
  get: (k) => new Promise(r => chrome.storage.local.get(k, r)),
  set: (o) => new Promise(r => chrome.storage.local.set(o, r))
};

// Same theme the user picked in the popup
chrome.storage.local.get(['jf_theme'], (res) => {
  document.documentElement.setAttribute('data-theme', res.jf_theme || 'dark');
});

async function fetchHtml(path) {
  const res = await fetch(BASE + path, { credentials: 'include' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

// Semester ids Flex lists in its own dropdown (empty when not logged in)
async function listedSemesters() {
  const html = await fetchHtml('/Student/StudentMarks');
  return [...html.matchAll(/<option[^>]*value="(\d{5})"/g)].map(m => m[1]);
}

async function olderSemesters(oldest) {
  const { jf_old_semesters } = await store.get('jf_old_semesters');
  if (jf_old_semesters && jf_old_semesters.oldest === oldest && Date.now() - jf_old_semesters.at < 7 * 24 * 3600 * 1000) {
    return jf_old_semesters.list;
  }
  const list = await FPSnap.scanOlderSemesters(BASE, oldest);
  if (list) await store.set({ jf_old_semesters: { oldest, at: Date.now(), list } });
  return list || [];
}

async function totalsFor(id, cache, recent, force) {
  const hit = cache[id];
  if (!force && hit && Date.now() - hit.at < (recent.has(id) ? TTL_RECENT : TTL_OLD)) return hit.courses;
  const doc = new DOMParser().parseFromString(await fetchHtml(`/Student/StudentMarks?semid=${id}`), 'text/html');
  const courses = FPSnap.courseTotals(doc);
  cache[id] = { at: Date.now(), courses };
  return courses;
}

function semesterHTML(id, courses, latest) {
  const rows = courses.filter(c => c.weight > 0);
  if (!rows.length) return { html: '', pcts: [] };
  const pcts = rows.map(c => (c.obtained / c.weight) * 100);
  const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
  const inProgress = rows.some(c => c.weight < 90);
  const html = `
    <div class="sem">
      <div class="sem-head">
        <div><a href="${BASE}/Student/StudentMarks?semid=${id}" target="_blank" rel="noopener">${esc(FPSnap.semLabel(id))}</a>
          ${inProgress ? '<small>in progress</small>' : ''}</div>
        <span class="avg" style="color:${pctColor(avg)}">avg ${fmt(avg)}%</span>
      </div>
      <table>${rows.map((c, i) => `
        <tr><td class="code">${esc(c.title)}</td>
            <td class="marks">${fmt(c.obtained)} / ${fmt(c.weight)}</td>
            <td><div class="bar"><i style="width:${Math.min(100, pcts[i])}%;background:${pctColor(pcts[i])}"></i></div></td>
            <td class="pct" style="color:${pctColor(pcts[i])}">${fmt(pcts[i])}%</td></tr>`).join('')}
      </table>
    </div>`;
  return { html, pcts };
}

function showMessage(html) {
  $('stats').innerHTML = '';
  $('content').innerHTML = `<div class="msg">${html}</div>`;
}

let running = false;
async function load(force) {
  if (running) return;
  running = true;
  $('refresh').disabled = true;
  try {
    showMessage('Loading your semesters…');
    const listed = await listedSemesters();
    if (!listed.length) {
      showMessage(`<b>Please log in to FlexStudent first.</b><br>Open
        <a href="${BASE}" target="_blank" rel="noopener" style="color:var(--accent)">flexstudent.nu.edu.pk</a>,
        log in, then press Refresh here.`);
      return;
    }
    const oldest = String(Math.min(...listed.map(Number)));
    showMessage('Looking for older semesters…');
    const older = (await olderSemesters(oldest)).map(s => s.id);
    const ids = [...new Set([...listed, ...older])].sort((a, b) => Number(b) - Number(a));
    const recent = new Set(listed);

    const { jf_sem_totals } = await store.get('jf_sem_totals');
    const cache = jf_sem_totals || {};
    const results = {};
    let done = 0, next = 0;
    // A few semesters at a time keeps it quick without hammering the server
    async function worker() {
      while (next < ids.length) {
        const id = ids[next++];
        try { results[id] = await totalsFor(id, cache, recent, force && recent.has(id)); } catch (e) { results[id] = []; }
        showMessage(`Loading semesters… ${++done}/${ids.length}`);
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    await store.set({ jf_sem_totals: cache });

    const allPcts = [];
    let semCount = 0, courseCount = 0;
    const blocks = ids.map(id => {
      const { html, pcts } = semesterHTML(id, results[id] || []);
      if (html) { semCount++; courseCount += pcts.length; allPcts.push(...pcts); }
      return html;
    }).join('');

    if (!blocks) { showMessage('No marks found yet.'); return; }
    const overall = allPcts.reduce((a, b) => a + b, 0) / allPcts.length;
    const best = Math.max(...allPcts), worst = Math.min(...allPcts);
    $('stats').innerHTML = `
      <div class="stat"><b>${semCount}</b><span>semesters</span></div>
      <div class="stat"><b>${courseCount}</b><span>courses</span></div>
      <div class="stat"><b style="color:${pctColor(overall)}">${fmt(overall)}%</b><span>average across all courses</span></div>
      <div class="stat"><b style="color:${pctColor(best)}">${fmt(best)}%</b><span>best course</span></div>
      <div class="stat"><b style="color:${pctColor(worst)}">${fmt(worst)}%</b><span>lowest course</span></div>`;
    $('content').innerHTML = blocks;
    $('note').textContent = 'Percentages are marks obtained out of the weightage published so far, so a course still in progress can move.';
  } catch (e) {
    showMessage('Could not load your marks. Check your connection and that you are logged in to FlexStudent, then press Refresh.');
  } finally {
    running = false;
    $('refresh').disabled = false;
  }
}

$('refresh').addEventListener('click', () => load(true));
load(false);
