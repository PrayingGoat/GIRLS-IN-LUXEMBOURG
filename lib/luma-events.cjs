const ORGANISER='usr-5mEZeykJMwDEoUA';
const PROFILE='https://luma.com/user/'+ORGANISER;
function normalise(entry){
 const e=entry.event;if(!e||e.visibility!=='public'||!Number.isFinite(Date.parse(e.start_at))||!Number.isFinite(Date.parse(e.end_at)))return null;
 if(typeof e.url!=='string'||!/^[-a-z0-9]+$/i.test(e.url))return null;
 return {url:'https://luma.com/'+e.url,title:String(e.name||'Community event').replace(/\p{Extended_Pictographic}|\uFE0F/gu,'').trim().slice(0,250),start:e.start_at,end:e.end_at,location:e.geo_address_visibility==='public'?String(e.geo_address_info?.address||e.geo_address_info?.city||'See Luma for location').slice(0,200):'See Luma for location',status:e.cancelled_at?'https://schema.org/EventCancelled':'https://schema.org/EventScheduled',soldOut:entry.registration_availability==='sold-out'||entry.ticket_info?.is_sold_out===true,checkedAt:new Date().toISOString()};
}
async function hostedEvents(fetcher=fetch){
 const signal=AbortSignal.timeout(7500);
 async function period(name){const rows=[];let cursor;const cursors=new Set();for(let page=0;page<50;page++){
  const params=new URLSearchParams({pagination_limit:'10',period:name,user_api_id:ORGANISER});if(cursor)params.set('pagination_cursor',cursor);
  const response=await fetcher('https://api.luma.com/user/profile/events-hosting?'+params,{signal,redirect:'error'});if(!response.ok)throw Error('Luma unavailable');const data=await response.json();if(!Array.isArray(data.entries)||typeof data.has_more!=='boolean')throw Error('Luma response changed');
  rows.push(...data.entries.map(normalise).filter(Boolean));if(!data.has_more)return rows;
  if(typeof data.next_cursor!=='string'||!data.next_cursor||cursors.has(data.next_cursor))throw Error('Invalid pagination');cursor=data.next_cursor;cursors.add(cursor);
 }throw Error('Incomplete Luma pagination')}
 const groups=await Promise.all([period('future'),period('past')]);return [...new Map(groups.flat().map(e=>[e.url,e])).values()];
}
module.exports={hostedEvents,normalise,PROFILE};
