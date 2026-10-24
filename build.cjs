const fs=require('node:fs');
fs.mkdirSync('dist',{recursive:true});
for(const file of [...require('./site-pages.cjs'),'styles.css','app.js','events.js','join.js'])fs.copyFileSync(file,`dist/${file}`);
fs.cpSync('assets','dist/assets',{recursive:true});
console.log('Static site built in dist/');
