// Service workers have no DOMParser, so the background marks check hands the page HTML here.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.target !== 'offscreen') return;
  const doc = new DOMParser().parseFromString(msg.html, 'text/html');
  if (msg.type === 'snapshot') sendResponse({ snapshot: FPSnap.scrapeSnapshot(doc) });
  else if (msg.type === 'totals') sendResponse({ totals: FPSnap.courseTotals(doc) });
});
