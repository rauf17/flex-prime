// transcript-extras.js — CGPA target planner, shown at the top of the Transcript page.
(function () {
  if (!location.href.includes('Student/Transcript')) return;

  const GRADED = new Set(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F']);
  const fmt2 = (n) => (Math.round(n * 100) / 100).toFixed(2);

  const { requiredSgpa, projectedCgpa } = FPSnap; // see snapshot.js

  // Read grades from the page. A retaken course counts only with its latest grade (later semesters come later).
  function readTranscript() {
    const sems = Array.from(document.querySelectorAll('.col-md-6'));
    const latest = {};
    let inProgressCH = 0;
    sems.forEach((sem, i) => {
      sem.querySelectorAll('tbody > tr').forEach(tr => {
        const c = Array.from(tr.children).map(x => x.textContent.trim());
        if (c.length < 6) return;
        const ch = parseFloat(c[3]) || 0, grade = c[4], pts = parseFloat(c[5]);
        // The GPA calculator swaps a running course's grade for a dropdown: still "in progress"
        const running = grade === 'I' || !!tr.children[4]?.querySelector('select');
        if (!running && GRADED.has(grade) && Number.isFinite(pts)) latest[c[0]] = { ch, pts };
        else if (i === sems.length - 1 && running) inProgressCH += ch; // courses running right now
      });
    });
    let E = 0, GP = 0;
    Object.values(latest).forEach(({ ch, pts }) => { E += ch; GP += ch * pts; });
    const siteText = sems.length ? Array.from(sems[sems.length - 1].querySelectorAll('span')).map(s => s.textContent).join(' ') : '';
    const siteCgpa = parseFloat((/CGPA:\s*([\d.]+)/i.exec(siteText) || [])[1]);
    return { sems: sems.length, E, C: E > 0 ? GP / E : 0, inProgressCH, siteCgpa, firstSem: sems[0] };
  }

  function build() {
    if (document.getElementById('jf-planner')) return;
    const t = readTranscript();
    if (!t.sems || t.E <= 0) return;

    const style = document.createElement('style');
    style.textContent = `
      #jf-planner { border: 1px solid rgba(127,127,127,.3); background: rgba(127,127,127,.08); border-radius: 12px;
        padding: 14px 16px; margin: 0 0 16px; font-family: 'Plus Jakarta Sans','Inter',sans-serif; font-size: 13px; }
      #jf-planner .jf-pl-title { font-weight: 800; margin-bottom: 6px; }
      #jf-planner .jf-pl-row { margin-top: 9px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
      #jf-planner input { width: 74px; padding: 5px 7px; border-radius: 6px; text-align: center;
        border: 1px solid rgba(127,127,127,.4); background: rgba(127,127,127,.12); font: inherit; }
      #jf-planner b { font-family: 'JetBrains Mono', monospace; }
      #jf-planner .jf-pl-result { font-weight: 700; font-size: 14px; }
      #jf-planner .jf-pl-chip { padding: 3px 9px; border-radius: 99px; border: 1px solid rgba(127,127,127,.35);
        font-size: 12px; background: rgba(127,127,127,.1); }
      #jf-planner .jf-pl-note { opacity: .65; font-size: 11px; margin-top: 8px; }`;
    document.head.appendChild(style);

    const targetDefault = Math.min(4, Math.round((t.C + 0.1) * 100) / 100);
    const hoursDefault = t.inProgressCH || 15;
    const card = document.createElement('div');
    card.id = 'jf-planner';
    card.className = 'jf-card';
    card.innerHTML = `
      <div class="jf-pl-title">🎯 CGPA target planner</div>
      <div>Current CGPA <b>${fmt2(t.C)}</b> over <b>${t.E}</b> graded credit hours${
        Number.isFinite(t.siteCgpa) ? ` · Flex shows <b>${fmt2(t.siteCgpa)}</b>` : ''}</div>
      <div class="jf-pl-row">I want a CGPA of <input id="jf-pl-target" type="number" min="0" max="4" step="0.01" value="${fmt2(targetDefault)}">
        and this semester has <input id="jf-pl-hours" type="number" min="1" max="30" step="1" value="${hoursDefault}"> credit hours</div>
      <div class="jf-pl-row"><span class="jf-pl-result" id="jf-pl-result"></span></div>
      <div class="jf-pl-row" id="jf-pl-chips"></div>
      <div class="jf-pl-note">Estimate from the grades on this page; your university's official CGPA may differ slightly.</div>`;
    t.firstSem.parentElement.insertAdjacentElement('beforebegin', card);

    const targetEl = card.querySelector('#jf-pl-target'), hoursEl = card.querySelector('#jf-pl-hours');
    const resultEl = card.querySelector('#jf-pl-result'), chipsEl = card.querySelector('#jf-pl-chips');
    const update = () => {
      const target = parseFloat(targetEl.value), H = parseFloat(hoursEl.value);
      if (!Number.isFinite(target) || !Number.isFinite(H) || H <= 0) { resultEl.textContent = '—'; return; }
      const need = requiredSgpa(t.C, t.E, H, target);
      const best = projectedCgpa(t.C, t.E, H, 4);
      if (need <= 0) {
        resultEl.textContent = `✅ You already stay above ${fmt2(target)} even with a 0.00 SGPA.`;
        resultEl.style.color = 'var(--jf-good, #22c55e)';
      } else if (need > 4) {
        resultEl.textContent = `❌ Not reachable in one semester. With a perfect 4.00 SGPA you'd reach ${fmt2(best)}.`;
        resultEl.style.color = 'var(--jf-bad, #ef4444)';
      } else {
        resultEl.textContent = `You need an SGPA of ${fmt2(need)} this semester.`;
        resultEl.style.color = need >= 3.5 ? 'var(--jf-warn, #f59e0b)' : 'var(--jf-good, #22c55e)';
      }
      chipsEl.innerHTML = [4, 3.5, 3, 2.5].map(s =>
        `<span class="jf-pl-chip">SGPA ${fmt2(s)} → CGPA <b>${fmt2(projectedCgpa(t.C, t.E, H, s))}</b></span>`).join('');
    };
    targetEl.addEventListener('input', update);
    hoursEl.addEventListener('input', update);
    update();
  }

  let tries = 0;
  const start = () => {
    if (document.querySelectorAll('.col-md-6 tbody > tr').length) build();
    else if (++tries < 20) setTimeout(start, 300);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
