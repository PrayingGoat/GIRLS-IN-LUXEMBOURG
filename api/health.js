// Public health check for the hosting setup. Reveals no address, user or password:
// only whether the database is configured and reachable, and a generic error category.
const {getDatabase}=require('../lib/database.cjs');
module.exports=async(req,res)=>{
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
 const send=(code,body)=>{res.statusCode=code;res.end(JSON.stringify(body))};
 if(!process.env.MONGODB_URI)return send(503,{database:'not-configured',hint:'Set MONGODB_URI and MONGODB_DB in the hosting environment variables, then redeploy.'});
 try{await (await getDatabase()).command({ping:1});return send(200,{database:'ok',name:process.env.MONGODB_DB?'set':'default'})}
 catch(error){
  const text=String(error?.message||'');
  const reason=/auth/i.test(text)||error?.code===18?'authentication-failed':/ENOTFOUND|querySrv|ESERVFAIL/i.test(text)?'host-not-found':/timed out|Server selection/i.test(text)?'unreachable-check-network-access':'error';
  return send(503,{database:reason});
 }
};
