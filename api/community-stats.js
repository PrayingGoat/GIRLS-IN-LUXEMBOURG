const {getPool}=require('../lib/database.cjs');
const {defaults}=require('../lib/community-stats.cjs');
module.exports=async function(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');res.end(JSON.stringify({message:'Method not allowed.'}));return;}
 try{const result=await getPool().query('SELECT instagram,tiktok,whatsapp,linkedin,updated_at FROM community_stats WHERE id=1');if(!result.rowCount)throw Error();res.end(JSON.stringify({stats:result.rows[0],source:'database'}));}
 catch{res.end(JSON.stringify({stats:defaults,source:'fallback'}));}
};
