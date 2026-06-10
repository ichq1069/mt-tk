const fs = require('fs');
const path = require('path');

const lucidePath = '/workspace/app-a8orwhnquio1/node_modules/lucide-react/dist/esm/lucide-react.js';
const content = fs.readFileSync(lucidePath, 'utf8');

const icons = new Set();
const exportMatches = Array.from(content.matchAll(/default as ([A-Z][a-zA-Z0-9]*)/g));
exportMatches.forEach(match => {
  icons.add(match[1]);
});

const files = fs.readFileSync('files.txt', 'utf8').split('\n').filter(Boolean);

files.forEach(file => {
  const fileContent = fs.readFileSync(file, 'utf8');
  const importMatches = Array.from(fileContent.matchAll(/import \{([^}]+)\} from ["']lucide-react["']/gs));
  importMatches.forEach(match => {
    const rawIcons = match[1].replace(/\n/g, ' ').split(',');
    rawIcons.forEach(rawIcon => {
      const cleanIcon = rawIcon.trim().split(/\s+as\s+/)[0].trim();
      if (cleanIcon && !icons.has(cleanIcon)) {
        console.log(`Icon "${cleanIcon}" NOT found in lucide-react (used in ${file})`);
      }
    });
  });
});
