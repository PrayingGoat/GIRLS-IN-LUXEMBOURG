const {getStore}=require('../lib/store.cjs');
const {defaults}=require('../lib/community-stats.cjs');
module.exports=async function(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');res.end(JSON.stringify({message:'Method not allowed.'}));return;}
 try{const stats=await (await getStore()).getStats();if(!stats)throw Error();res.end(JSON.stringify({stats,source:'database'}));}
 catch{res.end(JSON.stringify({stats:defaults,source:'fallback'}));}
};
