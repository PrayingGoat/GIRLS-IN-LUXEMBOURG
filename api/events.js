const snapshot=require('../assets/calendar-events.json');
const {hostedEvents,PROFILE}=require('../lib/luma-events.cjs');
let cache=null,expires=0,pending;
async function refresh(){
 try{const events=await hostedEvents();cache={events,source:'luma-profile',profile:PROFILE,checkedAt:new Date().toISOString()};expires=Date.now()+15*60*1000;}
 catch{cache={...(cache||snapshot),events:(cache?.events||snapshot.events).map(e=>({...e,stale:true})),source:'saved',profile:PROFILE};expires=Date.now()+60*1000;}
 return cache;
}
module.exports=async(req,res)=>{
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, max-age=60');
 if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');res.end(JSON.stringify({message:'Method not allowed'}));return;}
 if(!cache||Date.now()>expires){if(!pending)pending=refresh().finally(()=>pending=null);await pending}
 res.end(JSON.stringify(cache));
};
