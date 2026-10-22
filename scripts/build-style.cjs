const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const output = '// Generated from dock.css by scripts/build-style.cjs.\nconst GDockStyle = ' + JSON.stringify(fs.readFileSync(path.join(root, 'dock.css'), 'utf8')) + ';\n';
const target = path.join(root, 'dock-style.js');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== output) {
    throw new Error('dock-style.js is stale. Run node scripts/build-style.cjs.');
  }
} else {
  fs.writeFileSync(target, output);
}
