const fs=require('node:fs'),path=require('node:path');
fs.mkdirSync('dist',{recursive:true});
for(const file of [...require('./site-pages.cjs'),'styles.css','app.js','events.js','join.js'])fs.copyFileSync(file,`dist/${file}`);
const image=/\.(webp|png|jpe?g|svg|gif|avif)$/i;
fs.cpSync('assets','dist/assets',{recursive:true,filter:source=>!image.test(source)});
// Clear old image copies from this build output only; originals remain local backups.
const output=path.resolve('dist/assets');
for(const file of fs.readdirSync(output,{recursive:true})){
 const target=path.resolve(output,file);
 if(target.startsWith(output+path.sep)&&image.test(target)&&fs.statSync(target).isFile())fs.unlinkSync(target);
}
console.log('Static site built in dist/; image bytes are served from MongoDB Atlas.');
