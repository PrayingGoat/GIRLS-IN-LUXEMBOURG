const {MongoClient}=require('mongodb');
let client,connection;
async function getDatabase(){
 if(!process.env.MONGODB_URI)throw new Error('MONGODB_NOT_CONFIGURED');
 if(!connection){
  client=new MongoClient(process.env.MONGODB_URI,{maxPoolSize:3,minPoolSize:0,serverSelectionTimeoutMS:8000,connectTimeoutMS:8000,socketTimeoutMS:15000,promoteBuffers:true});
  connection=client.connect().catch(async error=>{
   // Log only error categories/codes; never log URIs, credentials or documents.
   const servers=error.reason?.servers;
   console.error('MongoDB connection failed',JSON.stringify({name:error.name,code:error.code,servers:servers?[...servers.values()].map(server=>({name:server.error?.name,code:server.error?.code,cause:server.error?.cause?.code})):undefined}));
   const failed=client;connection=null;client=null;await failed?.close();throw error});
 }
 const connected=await connection;
 return connected.db(process.env.MONGODB_DB||'girls_in_luxembourg');
}
async function closeDatabase(){const current=client;client=null;connection=null;await current?.close()}
module.exports={getDatabase,closeDatabase};
