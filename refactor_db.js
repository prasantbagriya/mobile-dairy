const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, 'src', 'views'),
  path.join(__dirname, 'src', 'components')
];

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('../lib/firebase')) {
        content = content.replace(/import\s+\{\s*([^{}]*)\s*\}\s+from\s+['"]\.\.\/lib\/firebase['"];/g, (match, imports) => {
          if (imports.includes('db') && !imports.includes('auth')) {
             if (imports.trim() === 'db') {
               return `import { db } from '../lib/db';`;
             } else {
               const others = imports.split(',').map(i => i.trim()).filter(i => i !== 'db').join(', ');
               return `import { db } from '../lib/db';\nimport { ${others} } from '../lib/firebase';`;
             }
          }
          if (imports.includes('db') && imports.includes('auth')) {
             const others = imports.split(',').map(i => i.trim()).filter(i => i !== 'db').join(', ');
             return `import { db } from '../lib/db';\nimport { ${others} } from '../lib/firebase';`;
          }
          return match;
        });
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

dirs.forEach(processDirectory);
console.log('Imports replaced successfully.');
