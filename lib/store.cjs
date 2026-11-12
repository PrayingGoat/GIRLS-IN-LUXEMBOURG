const {getDatabase}=require('./database.cjs');
const {randomUUID}=require('node:crypto');
const clean=document=>{if(!document)return null;const {_id,...row}=document;return row};
async function getStore(){
 const db=await getDatabase();
 const stats=db.collection('community_stats'),images=db.collection('site_images'),sessions=db.collection('admin_sessions'),members=db.collection('membership_requests'),messages=db.collection('contact_messages'),feedback=db.collection('feedback_responses');
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
  async addContactMessage(data){const now=new Date();await messages.insertOne({id:randomUUID(),name:data.name,email:data.email,reason:data.reason,message:data.message,status:'new',created_at:now,updated_at:now})},
  async listContactMessages({reason,status,page}){
   const filter={};if(reason)filter.reason=reason;if(status)filter.status=status;
   const [rows,total]=await Promise.all([messages.find(filter).sort({created_at:-1,id:-1}).skip((page-1)*25).limit(25).toArray(),messages.countDocuments(filter)]);
   return {messages:rows.map(clean),total,page,pageSize:25};
  },
  // Feedback is anonymous: no IP, user agent or exact time is stored; only the day it was received.
  async addFeedback(data){const day=new Date(new Date().toISOString().slice(0,10));await feedback.insertOne({id:randomUUID(),...data,status:'new',created_at:day,updated_at:day})},
  async listFeedback({status,page}){
   const filter={};if(status)filter.status=status;
   const [rows,total,average]=await Promise.all([feedback.find(filter).sort({created_at:-1,id:-1}).skip((page-1)*25).limit(25).toArray(),feedback.countDocuments(filter),feedback.aggregate([{$group:{_id:null,rating:{$avg:'$rating'},count:{$sum:1}}}]).toArray()]);
   return {feedback:rows.map(clean),total,page,pageSize:25,average:average[0]?{rating:Math.round(average[0].rating*10)/10,count:average[0].count}:null};
  },
  async setFeedbackStatus(id,status){const row=await feedback.findOneAndUpdate({id},{$set:{status}},{returnDocument:'after'});return row?{id:row.id,status:row.status}:null},
  // Administrator password: only a salted scrypt hash is stored, in MongoDB.
  async getAdminPasswordHash(){const row=await db.collection('admin_settings').findOne({_id:'admin'});return row?.password_hash||null},
  async setAdminPasswordHash(hash){await db.collection('admin_settings').updateOne({_id:'admin'},{$set:{password_hash:hash,updated_at:new Date()}},{upsert:true})},
  async deleteOtherSessions(keepHash){await sessions.deleteMany({token_hash:{$ne:keepHash}})},
  async deleteContactMessage(id){return (await messages.deleteOne({id})).deletedCount===1},
  async deleteMember(id){return (await members.deleteOne({id})).deletedCount===1},
  async deleteFeedback(id){return (await feedback.deleteOne({id})).deletedCount===1},
  // Database cleanup: what each category holds, and deleting it.
  async storageUsage(referenced){
   const sum=async(collection,filter={})=>{const [row]=await db.collection(collection).aggregate([{$match:filter},{$group:{_id:null,count:{$sum:1},bytes:{$sum:{$bsonSize:'$$ROOT'}}}}]).toArray();return {count:row?.count||0,bytes:row?.bytes||0}};
   const unused={path:{$nin:[...referenced]}};
   const now=new Date(),day=new Date(Date.now()-24*60*60*1000);
   const [msg,fb,req,custom,media,unusedMedia,expired,limitsA,limitsB]=await Promise.all([
    sum('contact_messages'),sum('feedback_responses'),sum('membership_requests'),sum('site_images'),sum('media_assets'),sum('media_assets',unused),
    sum('admin_sessions',{expires_at:{$lte:now}}),sum('admin_login_limits',{window_start:{$lt:day}}),sum('membership_rate_limits',{window_start:{$lt:day}})]);
   let total=null;try{const s=await db.command({dbStats:1});total={dataBytes:s.dataSize,storageBytes:s.storageSize,indexBytes:s.indexSize}}catch{}
   return {total,categories:{messages:msg,feedback:fb,requests:req,customImages:custom,unusedImages:unusedMedia,technical:{count:expired.count+limitsA.count+limitsB.count,bytes:expired.bytes+limitsA.bytes+limitsB.bytes}},library:media};
  },
  async cleanup(category,olderThan,referenced){
   const before=olderThan?{$lt:olderThan}:null;
   const dated=field=>before?{[field]:before}:{};
   const one=async(collection,filter)=>(await db.collection(collection).deleteMany(filter)).deletedCount;
   switch(category){
    case 'messages':return one('contact_messages',dated('created_at'));
    case 'feedback':return one('feedback_responses',dated('created_at'));
    case 'requests':return one('membership_requests',dated('created_at'));
    case 'customImages':return one('site_images',dated('updated_at'));
    case 'unusedImages':return one('media_assets',{path:{$nin:[...referenced]},...dated('created_at')});
    case 'technical':{const day=new Date(Date.now()-24*60*60*1000);
     return (await one('admin_sessions',{expires_at:{$lte:new Date()}}))+(await one('admin_login_limits',{window_start:{$lt:day}}))+(await one('membership_rate_limits',{window_start:{$lt:day}}))}
    default:throw Error('Unknown category');
   }
  },
  async setContactMessageStatus(id,status){const row=await messages.findOneAndUpdate({id},{$set:{status,updated_at:new Date()}},{returnDocument:'after'});return row?{id:row.id,status:row.status}:null},
  async setMemberStatus(id,status){const row=await members.findOneAndUpdate({id},{$set:{status,updated_at:new Date()}},{returnDocument:'after'});return row?{id:row.id,status:row.status}:null}
 };
}
module.exports={getStore};
