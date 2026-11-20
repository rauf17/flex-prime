// Syntax-checks every JavaScript file in the extension (no dependencies needed).
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dirs = [root, path.join(root, 'scripts'), path.join(root, 'tests')];
let failed = 0;

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const file = path.join(dir, name);
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    } catch (e) {
      failed++;
      console.error(`Syntax error in ${path.relative(root, file)}:\n${e.stderr}`);
    }
  }
}

if (failed) process.exit(1);
console.log('All JavaScript files passed the syntax check.');
