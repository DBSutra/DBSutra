const fs = require('fs');
const path = require('path');
const glob = require('glob');

const mapping = {
  '16px': 'var(--text-lg)',
  '14px': 'var(--text-md)',
  '13px': 'var(--text-base)',
  '12px': 'var(--text-sm)',
  '11px': 'var(--text-sm)',
  '10px': 'var(--text-xs)',
  '9px': 'var(--text-xs)',
  '8px': 'var(--text-xs)'
};

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [px, variable] of Object.entries(mapping)) {
        const regex = new RegExp(`font-size:\\s*${px};`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, `font-size: ${variable};`);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir('/Users/amit/Development/ClientDB/frontend/src');
