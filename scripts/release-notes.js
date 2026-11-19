'use strict';
// Affiche les notes d'une version extraites de CHANGELOG.md :  node scripts/release-notes.js v1.2.0
const fs = require('node:fs');

const version = String(process.argv[2] || '').replace(/^v/, '');
const text = fs.readFileSync(`${__dirname}/../CHANGELOG.md`, 'utf8').replace(/\r\n/g, '\n');
const escaped = version.replace(/\./g, '\\.');
const match = new RegExp(`## \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=\\n## \\[|$)`).exec(text);
if (!match || !match[1].trim()) {
  console.error(`Section « ${version} » absente de CHANGELOG.md`);
  process.exit(1);
}
process.stdout.write(`${match[1].trim()}\n`);
