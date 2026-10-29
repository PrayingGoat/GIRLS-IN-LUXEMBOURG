const {getDatabase}=require('./database.cjs');
const {defaults}=require('./community-stats.cjs');
async function initializeDatabase({seed=true}={}){
 const db=await getDatabase();
 const collections=['media_assets','community_stats','site_images','membership_requests','admin_sessions','admin_login_limits','membership_rate_limits'];
 const existing=new Set((await db.listCollections({}, {nameOnly:true}).toArray()).map(c=>c.name));
 for(const name of collections)if(!existing.has(name))await db.createCollection(name);
 const indexes=[
 ['media_assets',{path:1},{unique:true}],
 ['community_stats',{id:1},{unique:true}],
 ['site_images',{slot_id:1},{unique:true}],
 ['membership_requests',{id:1},{unique:true}],
 ['membership_requests',{email:1},{unique:true}],
 ['membership_requests',{status:1,created_at:-1},{}],
 ['admin_sessions',{token_hash:1},{unique:true}],
 ['admin_sessions',{expires_at:1},{expireAfterSeconds:0}],
 ...['admin_login_limits','membership_rate_limits'].flatMap(name=>[[name,{key_hash:1},{unique:true}],[name,{window_start:1},{expireAfterSeconds:86400}]])
 ];
 for(const [name,keys,options] of indexes)await db.collection(name).createIndex(keys,options);
 if(seed)await db.collection('community_stats').updateOne({id:1},{$setOnInsert:{id:1,...defaults,updated_at:new Date()}},{upsert:true});
 return db;
}
module.exports={initializeDatabase};
