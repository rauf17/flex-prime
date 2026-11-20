// Guards the extension's packaging: the manifest, the files it names and the release ZIP stay in sync.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const { FILES, buildZip, crc32 } = require('../scripts/build-zip.js');

const referenced = () => [
  manifest.background.service_worker,
  manifest.action.default_popup,
  ...Object.values(manifest.icons),
  ...manifest.content_scripts.flatMap(c => c.js)
];

test('manifest is Manifest V3 with a semantic version', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.match(manifest.version, /^\d+\.\d+(\.\d+)?$/);
});

test('package.json version matches the manifest', () => {
  assert.equal(pkg.version.replace(/\.0$/, ''), manifest.version.replace(/\.0$/, ''));
});

test('every file the manifest references exists and is in the release package', () => {
  for (const file of referenced()) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} is missing`);
    assert.ok(FILES.includes(file), `${file} is not in scripts/build-zip.js FILES`);
  }
});

test('pages and scripts loaded by the HTML files are in the release package', () => {
  for (const page of ['popup.html', 'summary.html', 'offscreen.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const [, src] of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
      assert.ok(FILES.includes(src), `${page} loads ${src}, which is not packaged`);
      assert.ok(fs.existsSync(path.join(root, src)), `${src} is missing`);
    }
  }
});

test('files imported by the background worker are packaged', () => {
  const bg = fs.readFileSync(path.join(root, 'background.js'), 'utf8');
  const imported = (/importScripts\(([^)]*)\)/.exec(bg) || [, ''])[1].match(/'([^']+)'/g) || [];
  assert.ok(imported.length > 0);
  for (const quoted of imported) assert.ok(FILES.includes(quoted.slice(1, -1)), `${quoted} is not packaged`);
});

test('permissions stay minimal and host access is limited to FlexStudent', () => {
  assert.deepEqual([...manifest.permissions].sort(), ['alarms', 'notifications', 'offscreen', 'scripting', 'storage', 'tabs']);
  assert.deepEqual(manifest.host_permissions, ['*://flexstudent.nu.edu.pk/*']);
});

test('the release ZIP is a valid archive with the right entries', () => {
  const entries = FILES.map(name => ({ name, data: fs.readFileSync(path.join(root, name)) }));
  const zip = buildZip(entries);
  assert.equal(zip.readUInt32LE(0), 0x04034b50, 'starts with a local file header');
  assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50, 'ends with the end-of-central-directory record');
  assert.equal(zip.readUInt16LE(zip.length - 22 + 10), FILES.length);
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926, 'CRC-32 check value');
});

test('the project is MIT licensed', () => {
  assert.equal(pkg.license, 'MIT');
  assert.match(fs.readFileSync(path.join(root, 'LICENSE'), 'utf8'), /^MIT License/);
});
