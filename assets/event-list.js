// Shared renderer for the event directory and its saved, no-JavaScript markup.
window.renderCommunityEvents = function(events) {
 const list=document.querySelector('.events-link-grid');if(!list)return;
 const zone='Europe/Luxembourg';
 const text=(tag,value,cls)=>{const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;return el};
 list.replaceChildren();
 const now=Date.now();const sorted=[...events].sort((a,b)=>{const pastA=Date.parse(a.end)<now,pastB=Date.parse(b.end)<now;return Number(pastA)-Number(pastB)||(pastA?Date.parse(b.start)-Date.parse(a.start):Date.parse(a.start)-Date.parse(b.start))});
 for(const event of sorted){
  const start=new Date(event.start),end=new Date(event.end);if(!Number.isFinite(+start)||!Number.isFinite(+end))continue;
  const url=new URL(event.url);if(url.origin!=='https://luma.com')continue;
  const multi=end-start>86400000, past=end<now, cancelled=String(event.status).endsWith('EventCancelled');
  const row=text('article','','event-directory-row');
  const stamp=text('div','','event-date-stamp');
  stamp.append(text('span',start.toLocaleDateString('en-GB',{timeZone:zone,day:'2-digit',month:'short'}),'event-date-label'));
  const time=text('time',multi?'Ongoing':start.toLocaleTimeString('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit'}));time.dateTime=event.start;stamp.append(time,text('span',start.toLocaleDateString('en-GB',{timeZone:zone,year:'numeric'}),'event-date-year'));
  const copy=text('div','','event-directory-copy');
  copy.append(text('span',cancelled?'Cancelled':past?'Past event':multi?'Ongoing project':'Upcoming event','event-directory-status'));
  copy.append(text('h4',event.title.replace(/\s*\(Ongoing\)/i,'').trim()));
  copy.append(text('p',multi?`${event.location} / Until ${end.toLocaleDateString('en-GB',{timeZone:zone,day:'numeric',month:'long',year:'numeric'})}`:event.location));
  const link=text('a',past||cancelled?'View event':'Details & booking','event-directory-link');link.href=event.url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',`${link.textContent}: ${event.title} on Luma`);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d','M5 19 19 5M5 5h14v14');svg.append(path);link.append(svg);
  row.append(stamp,copy,link);list.append(row);
 }
};
