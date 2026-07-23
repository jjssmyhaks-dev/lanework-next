const fs = require('fs');
const path = require('path');

function walk(dir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') walk(full, files);
    else if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) files.push(full);
  }
  return files;
}

const srcDir = path.resolve(__dirname, '..', 'src');
const files = walk(srcDir, []);
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('@/lib/auth')) {
    console.log(f);
  }
}
