const fs = require('fs');
const path = require('path');

fs.mkdirSync('public', { recursive: true });

// Copy all static files to public/
const staticFiles = ['index.html', 'sw.js', 'manifest.json'];
staticFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join('public', file));
    console.log('Copied:', file);
  }
});

// Copy icons if they exist
fs.readdirSync('.').filter(f => f.match(/^icon.*\.(png|svg)$/)).forEach(f => {
  fs.copyFileSync(f, path.join('public', f));
  console.log('Copied:', f);
});

console.log('Build complete.');
