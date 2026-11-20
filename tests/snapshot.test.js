// Unit tests for the pure logic in snapshot.js: alerts, fee reminders, notification text and the CGPA planner.
// Run with: npm test   (uses Node's built-in test runner, no dependencies)
const test = require('node:test');
const assert = require('node:assert/strict');

globalThis.self = globalThis; // snapshot.js attaches FPSnap to `self` (the page window in the browser)
require('../snapshot.js');
const F = globalThis.FPSnap;

test('changedSections: reports only sections whose data changed', () => {
  const prev = { Quiz: 'w3.5:o10', Final: '__empty__' };
  assert.deepEqual(F.changedSections(prev, { Quiz: 'w3.5:o10', Final: '__empty__' }), []);
  assert.deepEqual(F.changedSections(prev, { Quiz: 'w3.5:o12', Final: '__empty__' }), ['Quiz']);
  assert.deepEqual(F.changedSections(prev, { Quiz: 'w3.5:o10', Final: 'w40:o33' }), ['Final']);
});

test('changedSections: a brand-new course counts as all-new, empty sections are ignored', () => {
  assert.deepEqual(F.changedSections(undefined, { A: 'x', B: 'y' }), ['A', 'B']);
  assert.deepEqual(F.changedSections({ A: 'x' }, { A: '__empty__' }), []);
});

test('attendanceAlerts: warns once, again only when it drops further, resets after recovery', () => {
  const stats = (pct) => [{ title: 'CS101', pct }];
  let r = F.attendanceAlerts(stats(78.5), {}, 80);
  assert.equal(r.fresh.length, 1);
  r = F.attendanceAlerts(stats(78.5), r.alerted, 80);
  assert.equal(r.fresh.length, 0, 'same value must not alert twice');
  r = F.attendanceAlerts(stats(75), r.alerted, 80);
  assert.equal(r.fresh.length, 1, 'a further drop alerts again');
  r = F.attendanceAlerts(stats(82), r.alerted, 80);
  assert.deepEqual(r.alerted, {}, 'recovering clears the memory');
  r = F.attendanceAlerts(stats(79), r.alerted, 80);
  assert.equal(r.fresh.length, 1, 'dipping again after recovery alerts again');
});

test('attendanceAlerts: exactly 80% is not below the threshold', () => {
  assert.equal(F.attendanceAlerts([{ title: 'X', pct: 80 }], {}, 80).fresh.length, 0);
});

test('parseFlexDate understands Flex dates and rejects junk', () => {
  const d = F.parseFlexDate('04-Sep-2026');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 8);
  assert.equal(d.getDate(), 4);
  assert.equal(F.parseFlexDate('not a date'), null);
  assert.equal(F.parseFlexDate('04-Foo-2026'), null);
});

const rows = [
  { amount: '218500 Rs.', generated: '16-Aug-2026', due: '04-Sep-2026', status: 'Paid' },
  { amount: '100 Rs.', generated: '01-Sep-2026', due: '10-Sep-2026', status: 'Unpaid' },
  { amount: '200 Rs.', generated: '01-Sep-2026', due: '01-Sep-2026', status: 'Cancelled' }
];
const days = (iso) => F.feeReminders(rows, new Date(iso)).map(r => r.daysLeft);

test('feeReminders: silent until 3 days before the due date', () => {
  assert.deepEqual(days('2026-09-02T09:00:00'), []);
  assert.deepEqual(days('2026-09-07T09:00:00'), [3]);
  assert.deepEqual(days('2026-09-08T23:30:00'), [2]);
});

test('feeReminders: due today, overdue, and stops after two weeks', () => {
  assert.deepEqual(days('2026-09-10T20:00:00'), [0]);
  assert.deepEqual(days('2026-09-12T09:00:00'), [-2]);
  assert.deepEqual(days('2026-10-20T09:00:00'), []);
});

test('feeReminders: paid and cancelled challans never remind', () => {
  const all = F.feeReminders(rows, new Date('2026-09-08T09:00:00'));
  assert.equal(all.length, 1);
  assert.equal(all[0].amount, '100 Rs.');
});

test('feeReminders: overdue challans share one bucket so they notify once', () => {
  const a = F.feeReminders(rows, new Date('2026-09-12T09:00:00'))[0].bucket;
  const b = F.feeReminders(rows, new Date('2026-09-15T09:00:00'))[0].bucket;
  assert.equal(a, -1);
  assert.equal(b, -1);
});

test('notification text: marks', () => {
  const m = F.marksAlertMessage([{ title: 'CS3001', secs: ['Quiz', 'Sessional-I'] }, { title: 'MT2002', secs: ['Assignment'] }]);
  assert.equal(m.title, 'Flex Prime: new marks added');
  assert.equal(m.message, 'CS3001: Quiz, Sessional-I\nMT2002: Assignment');
});

test('notification text: attendance', () => {
  const m = F.attendanceAlertMessage([{ title: 'CS3005', pct: 78.571 }]);
  assert.equal(m.title, 'Flex Prime: attendance below 80%');
  assert.equal(m.message, 'CS3005: 78.57%');
});

test('notification text: fees', () => {
  const line = (daysLeft) => F.feeAlertMessage([{ amount: '1000 Rs.', due: '04-Sep-2026', daysLeft }]).message;
  assert.equal(line(2), '1000 Rs. is due in 2 days (04-Sep-2026)');
  assert.equal(line(1), '1000 Rs. is due in 1 day (04-Sep-2026)');
  assert.equal(line(0), '1000 Rs. is due TODAY (04-Sep-2026)');
  assert.equal(line(-1), '1000 Rs. was due on 04-Sep-2026 (overdue)');
});

test('notification text is clipped to what Chrome can show', () => {
  const many = Array.from({ length: 80 }, (_, i) => ({ title: `COURSE${i}`, secs: ['Quiz', 'Assignment'] }));
  assert.ok(F.marksAlertMessage(many).message.length <= 300);
});

test('CGPA planner maths round-trips and matches a hand-checked case', () => {
  const needed = F.requiredSgpa(3.08, 96, 18, 3.2);
  assert.ok(Math.abs(needed - 3.84) < 0.001);
  assert.ok(Math.abs(F.projectedCgpa(3.08, 96, 18, needed) - 3.2) < 1e-9);
  assert.ok(Math.abs(F.projectedCgpa(3.08, 96, 18, 4) - 3.2253) < 0.001, 'a perfect semester is the ceiling');
});
