const fs = require('fs');
const token = process.env.AIRTABLE_TOKEN || 'YOUR_AIRTABLE_TOKEN';
const utils = fs.readFileSync('utils.js', 'utf8');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace("'YOUR_AIRTABLE_TOKEN'", `'${token}'`);
html = html.replace('<script src="utils.js"></script>', `<script>\n${utils}\n</script>`);
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/index.html', html);
console.log('Build complete. Token injected:', token.slice(0,10) + '...');
