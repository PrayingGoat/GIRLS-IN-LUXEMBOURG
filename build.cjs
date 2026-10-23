const fs = require('node:fs');
fs.mkdirSync('dist', { recursive: true });
for (const file of ['admin.html', 'index.html', 'styles.css', 'app.js', 'events.html', 'events.js', 'join.html', 'join.js']) fs.copyFileSync(file, `dist/${file}`);
fs.cpSync('assets', 'dist/assets', { recursive: true });
console.log('Static site built in dist/');
