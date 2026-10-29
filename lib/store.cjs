const {getDatabase}=require('./database.cjs');
const {randomUUID}=require('node:crypto');
const clean=document=>{if(!document)return null;const {_id,...row}=document;return row};
async function getStore(){
 const db=await getDatabase();
 const stats=db.collection('community_stats'),images=db.collection('site_images'),sessions=db.collection('admin_sessions'),members=db.collection('membership_requests');
 return {
  async getStats(){return clean(await stats.findOne({id:1}))},
  async setStats(values){return clean(await stats.findOneAndUpdate({id:1},{$set:{...values,updated_at:new Date()}},{returnDocument:'after'}))},
  async listImages(){return (await images.find({},{projection:{image_data:0}}).toArray()).map(clean)},
  async getImage(id){return clean(await images.findOne({slot_id:id}))},
  async deleteImage(id){await images.deleteOne({slot_id:id})},
  async saveImage(row){const document={...row,updated_at:new Date()};await images.updateOne({slot_id:row.slot_id},{$set:document},{upsert:true});return clean(document)},
  async createSession(hash,expires=new Date(Date.now()+8*60*60*1000)){await sessions.insertOne({token_hash:hash,expires_at:expires,created_at:new Date()})},
  async hasSession(hash){return Boolean(await sessions.findOne({token_hash:hash,expires_at:{$gt:new Date()}},{projection:{_id:1}}))},
  async deleteSession(hash){await sessions.deleteOne({token_hash:hash})},
  async consumeLimit(collection,key){
   if(!['admin_login_limits','membership_rate_limits'].includes(collection))throw Error('Invalid limiter');
   const limits=db.collection(collection),now=new Date(),cutoff=new Date(Date.now()-15*60*1000);
   const expired={$lt:[{$ifNull:['$window_start',new Date(0)]},cutoff]};
   const update=[{$set:{key_hash:{$literal:key},attempts:{$cond:[expired,1,{$add:[{$ifNull:['$attempts',0]},1]}]},window_start:{$cond:[expired,now,'$window_start']}}}];
   let row;try{row=await limits.findOneAndUpdate({key_hash:key},update,{upsert:true,returnDocument:'after'})}
   catch(error){if(error.code!==11000)throw error;row=await limits.findOneAndUpdate({key_hash:key},update,{returnDocument:'after'})}
   return row.attempts;
  },
  async addMember(data){
   const now=new Date();try{await members.updateOne({email:data.email},{$setOnInsert:{id:randomUUID(),first_name:data.firstName,last_name:data.lastName,email:data.email,whatsapp:data.whatsapp,consent_version:data.consentVersion,status:'pending',created_at:now,updated_at:now,consented_at:now}},{upsert:true})}catch(e){if(e.code!==11000)throw e}
  },
  async listMembers({search,status,page}){
   const filter={};if(status)filter.status=status;
   if(search){const expression=search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');filter.$or=['first_name','last_name','email','whatsapp'].map(key=>({[key]:{$regex:expression,$options:'i'}}))}
   const [rows,total,counts]=await Promise.all([members.find(filter).sort({created_at:-1,id:-1}).skip((page-1)*25).limit(25).toArray(),members.countDocuments(filter),members.aggregate([{$group:{_id:'$status',count:{$sum:1}}}]).toArray()]);
   return {requests:rows.map(clean),total,page,pageSize:25,stats:counts.map(c=>({status:c._id,count:c.count}))};
  },
  async setMemberStatus(id,status){const row=await members.findOneAndUpdate({id},{$set:{status,updated_at:new Date()}},{returnDocument:'after'});return row?{id:row.id,status:row.status}:null}
 };
}
module.exports={getStore};
