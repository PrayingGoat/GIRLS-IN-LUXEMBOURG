// After `npx netlify-cli build --offline`: every Netlify function must ship the packages its code
// requires at run time. A missing package only fails once deployed ("Cannot find module 'mongodb'").
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const dir='.netlify/functions';
const needs={admin:['mongodb','sharp'],'site-images':['mongodb','sharp'],membership:['mongodb','libphonenumber-js'],contact:['mongodb'],feedback:['mongodb'],'community-stats':['mongodb'],media:['mongodb'],events:[]};
if(!fs.existsSync(dir)){console.error('Run `npx netlify-cli build --offline` first.');process.exit(1)}
let failed=false;
for(const [name,modules] of Object.entries(needs)){
 const zip=path.join(dir,name+'.zip');
 if(!fs.existsSync(zip)){console.error(`MISSING function ${name}`);failed=true;continue}
 const list=execFileSync('unzip',['-l',zip],{encoding:'utf8'});
 const missing=modules.filter(m=>!list.includes(`node_modules/${m}/package.json`));
 if(missing.length){console.error(`${name}: missing ${missing.join(', ')}`);failed=true}
}
if(failed)process.exit(1);
console.log('PASS Netlify functions ship mongodb, sharp and libphonenumber-js where needed');
