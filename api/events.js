const snapshot=require('../assets/calendar-events.json');
let cache=null,expires=0,pending;
async function refresh(){
 const events=await Promise.all(snapshot.events.map(async saved=>{
  try{
   const url=new URL(saved.url);if(url.origin!=='https://luma.com'||!/^\/[a-z0-9]+$/i.test(url.pathname))throw Error();
   const response=await fetch(url,{signal:AbortSignal.timeout(6000),redirect:'error'});if(!response.ok)throw Error();
   const html=await response.text();if(html.length>3000000)throw Error();
   const entries=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>{try{return JSON.parse(m[1])}catch{return []}});
   const event=entries.find(e=>e['@type']==='Event');
   if(!event||!Number.isFinite(Date.parse(event.startDate))||!Number.isFinite(Date.parse(event.endDate)))throw Error();
   return {url:saved.url,title:String(event.name).replace(/\p{Extended_Pictographic}|\uFE0F/gu,'').trim().slice(0,250),start:event.startDate,end:event.endDate,location:String(event.location?.name||'See Luma for location').slice(0,200),status:event.eventStatus,checkedAt:new Date().toISOString()};
  }catch{return {...saved,stale:true}}
 }));
 cache={events};expires=Date.now()+15*60*1000;return cache;
}
module.exports=async(req,res)=>{
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, max-age=60');
 if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');res.end(JSON.stringify({message:'Method not allowed'}));return}
 if(!cache||Date.now()>expires){if(!pending)pending=refresh().finally(()=>pending=null);await pending}
 res.end(JSON.stringify(cache));
};
