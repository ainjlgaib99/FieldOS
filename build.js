const fs = require('fs');
const token = process.env.AIRTABLE_TOKEN || 'YOUR_AIRTABLE_TOKEN';
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace("'YOUR_AIRTABLE_TOKEN'", `'${token}'`);
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/index.html', html);
console.log('Build complete. Token injected:', token.slice(0,10) + '...');
