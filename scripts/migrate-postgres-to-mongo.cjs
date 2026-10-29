const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {Pool}=require('pg'),{BSON:{EJSON}}=require('mongodb');
const {initializeDatabase}=require('../lib/mongo-schema.cjs'),{closeDatabase}=require('../lib/database.cjs');
const tables={community_stats:'id',site_images:'slot_id',membership_requests:'id',admin_sessions:'token_hash',admin_login_limits:'key_hash',membership_rate_limits:'key_hash'};
(async()=>{
 const connectionString=process.env.POSTGRES_MIGRATION_URL||process.env.DATABASE_URL||process.env.POSTGRES_URL;
 if(!connectionString)throw Error('PostgreSQL migration source not configured');
 const pg=new Pool({connectionString,max:1,connectionTimeoutMillis:5000});
 try{
  const snapshot={};
  const client=await pg.connect();
  try{await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');for(const table of Object.keys(tables))snapshot[table]=(await client.query('SELECT * FROM '+table)).rows;await client.query('COMMIT')}finally{client.release()}
  fs.mkdirSync('.research/database-backups',{recursive:true});
  const filename=path.join('.research/database-backups','postgres-'+Date.now()+'.json');
  fs.writeFileSync(filename,EJSON.stringify(snapshot),{mode:0o600});
  const db=await initializeDatabase({seed:false});
  for(const [table,key] of Object.entries(tables)){
   const collection=db.collection(table);
   for(const row of snapshot[table]){
    // Insert only: a rerun must never overwrite changes made on Atlas since migration.
    await collection.updateOne({[key]:row[key]},{$setOnInsert:row},{upsert:true});
    const document=await collection.findOne({[key]:row[key]});delete document._id;
    assert.deepEqual(document,row,'Migration mismatch in '+table);
   }
   console.log(table+': '+snapshot[table].length+' records copied and verified');
  }
  await initializeDatabase();
  console.log('Migration verified. Local backup saved in ignored .research/database-backups.');
 }finally{await pg.end();await closeDatabase()}
})().catch(e=>{console.error('Migration failed:',e.name,e.code||'',e.name==='AssertionError'?e.message:'Check database access.');process.exitCode=1});
