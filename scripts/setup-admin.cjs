// Run in your own terminal: the password is masked and only its scrypt hash is saved, in MongoDB.
// Use it for the first setup or if the password is lost. Otherwise change it in /admin.
const fs=require('node:fs'),path=require('node:path'),readline=require('node:readline');
const envFile=path.join(__dirname,'../.env');
if(fs.existsSync(envFile)&&process.loadEnvFile)process.loadEnvFile(envFile);
const {hashPassword}=require('../lib/admin-auth.cjs');
const {getDatabase,closeDatabase}=require('../lib/database.cjs');
if(!process.stdin.isTTY){console.error('Run npm run admin:setup in an interactive terminal.');process.exit(1)}
if(!process.env.MONGODB_URI){console.error('MONGODB_URI is missing. Add it to .env (or the environment) first.');process.exit(1)}
const rl=readline.createInterface({input:process.stdin,output:process.stdout,terminal:true});let masked=false;
const original=rl._writeToOutput.bind(rl);rl._writeToOutput=text=>{if(!masked)original(text)};
function ask(prompt){process.stdout.write(prompt);masked=true;return new Promise(resolve=>rl.question('',answer=>{masked=false;process.stdout.write('\n');resolve(answer)}))}
(async()=>{try{
 const password=await ask('Choose administrator password (at least 14 characters, hidden): ');
 if(password.length<14||password.length>256)throw Error('Use 14 to 256 characters.');
 const confirm=await ask('Confirm password (hidden): ');
 if(password!==confirm)throw Error('Passwords do not match.');
 const db=await getDatabase();
 await db.collection('admin_settings').updateOne({_id:'admin'},{$set:{password_hash:hashPassword(password),updated_at:new Date()}},{upsert:true});
 const {deletedCount}=await db.collection('admin_sessions').deleteMany({});
 console.log(`Password saved in the online database. ${deletedCount} open session(s) signed out. No restart needed.`);
}catch(error){console.error(error.message);process.exitCode=1}finally{rl.close();await closeDatabase()}})();
