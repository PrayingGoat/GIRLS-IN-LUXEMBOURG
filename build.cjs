const fs=require('node:fs');
fs.rmSync('dist',{recursive:true,force:true});
fs.mkdirSync('dist',{recursive:true});
for(const file of [...require('./site-pages.cjs'),'styles.css','app.js','events.js','join.js','contact-form.js','feedback-form.js'])fs.copyFileSync(file,`dist/${file}`);
// Images ship as static files so the CDN serves them without waking a function or the database.
// The /api/media rewrites in vercel.json only answer for an image that is missing from this build.
fs.cpSync('assets','dist/assets',{recursive:true});
const images=fs.readdirSync('dist/assets').filter(name=>/\.(webp|png|jpe?g|svg|gif|avif)$/i.test(name)).length;
console.log(`Static site built in dist/ with ${images} images; MongoDB Atlas remains the fallback for images missing from the build.`);
