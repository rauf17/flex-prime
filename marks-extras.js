// marks-extras.js — adds a button on the Marks page that opens the All Semesters Summary page.
// (The summary itself lives in summary.html / summary.js.)
(function () {
  if (!location.href.includes('Student/StudentMarks')) return;

  let tries = 0;
  const start = () => {
    const sel = document.getElementById('SemId');
    if (!sel) { if (++tries < 20) setTimeout(start, 300); return; }
    if (document.getElementById('jf-summary-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'jf-summary-btn';
    btn.type = 'button';
    btn.className = 'btn btn-brand';
    btn.textContent = '📊 All semesters summary';
    btn.style.cssText = 'margin-left:10px;';
    btn.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'open-summary' }));
    // Put it after our "Older semesters" dropdown if that is already there
    (document.getElementById('jf-old-sem') || sel).insertAdjacentElement('afterend', btn);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
