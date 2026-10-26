(() => {
 const root=document.querySelector('#gathering-calendar');if(!root)return;
 const zone='Europe/Luxembourg';
 const dayKey=value=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
 const today=dayKey(new Date());let selected=today,month=today.slice(0,7),events=[];
 const dateFor=key=>new Date(key+'T12:00:00Z');
 const label=key=>dateFor(key).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:zone});
 const onDay=key=>events.filter(e=>dayKey(e.start)<=key&&dayKey(e.end)>=key);
 const cancelled=e=>String(e.status).endsWith('EventCancelled');
 const node=(tag,text,cls)=>{const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el};
 function agenda(){
  root.querySelector('#calendar-day-title').textContent=label(selected);
  const list=root.querySelector('#calendar-day-events');list.replaceChildren();
  const matches=onDay(selected);
  if(!matches.length){list.append(node('p','No events listed for this day. Choose a marked date to see what is happening.','calendar-empty'));return}
  for(const event of matches){
   const card=node('article','','calendar-event');
   const past=new Date(event.end)<new Date();const multi=dayKey(event.start)!==dayKey(event.end);
   card.append(node('span',cancelled(event)?'Cancelled':past?'Past event':multi?'Ongoing initiative':'Community gathering','calendar-event-state'));
   card.append(node('h4',event.title));
   const time=new Date(event.start).toLocaleTimeString('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit'});
   card.append(node('p',multi?`${label(dayKey(event.start))} - ${label(dayKey(event.end))}`:`${time} / ${event.location}`));
   if(multi)card.append(node('p','An ongoing project, rather than a daily meet-up. Check Luma for participation details.'));
   const link=node('a',past||cancelled(event)?'View on Luma':'Details & registration on Luma','calendar-event-link');link.href=event.url;link.target='_blank';link.rel='noopener noreferrer';card.append(link);list.append(card);
  }
 }
 function render(){
  const first=dateFor(month+'-01');const year=first.getUTCFullYear(),m=first.getUTCMonth();
  root.querySelector('#calendar-month').textContent=first.toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:zone});
  const last=new Date(Date.UTC(year,m+1,0)).getUTCDate();const count=events.filter(e=>dayKey(e.start)<=`${month}-${last}`&&dayKey(e.end)>=month+'-01').length;
  root.querySelector('#calendar-count').textContent=`${count} ${count===1?'event':'events'} this month`;
  const days=root.querySelector('.calendar-days');days.replaceChildren();const offset=(first.getUTCDay()+6)%7;
  for(let i=0;i<Math.ceil((offset+last)/7)*7;i++){
   const d=new Date(Date.UTC(year,m,1+i-offset,12));const key=dayKey(d);const inMonth=key.startsWith(month);
   if(!inMonth){days.append(node('span',String(d.getUTCDate()),'calendar-outside'));continue}
   const button=node('button',String(d.getUTCDate()),'calendar-date');button.type='button';button.dataset.date=key;
   const entries=onDay(key);button.setAttribute('aria-label',`${label(key)}, ${entries.length} events`);button.setAttribute('aria-pressed',String(key===selected));if(key===today)button.setAttribute('aria-current','date');
   if(entries.length){button.classList.add(entries.some(e=>dayKey(e.start)===key)?'has-event':'has-ongoing');const dot=node('i','');dot.setAttribute('aria-hidden','true');button.append(dot)}
   button.addEventListener('click',()=>{
    selected=key;render();
    if(entries.length && matchMedia('(max-width:1000px)').matches){
     const heading=root.querySelector('#calendar-day-title');
     heading.tabIndex=-1;
     heading.focus({preventScroll:true});
     const header=document.querySelector('.site-header');
     const offset=(header?header.getBoundingClientRect().height:0)+20;
     window.scrollTo({top:Math.max(0,window.scrollY+heading.getBoundingClientRect().top-offset),behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
    }else root.querySelector(`[data-date="${key}"]`).focus({preventScroll:true});
   });days.append(button);
  }
  agenda();
 }
 root.querySelectorAll('[data-month-step]').forEach(button=>button.addEventListener('click',()=>{const d=dateFor(month+'-01');d.setUTCMonth(d.getUTCMonth()+Number(button.dataset.monthStep));month=dayKey(d).slice(0,7);selected=month+'-01';render()}));
 root.querySelector('#calendar-today').addEventListener('click',()=>{selected=today;month=today.slice(0,7);render()});
 render();
 async function load(){
  let fallback=false,data;
  try{const res=await fetch('/api/events',{signal:AbortSignal.timeout(9000)});if(!res.ok)throw Error();data=await res.json();if(!Array.isArray(data.events))throw Error()}
  catch{fallback=true;try{const res=await fetch('assets/calendar-events.json');if(!res.ok)throw Error();data=await res.json()}catch{root.querySelector('#calendar-source').textContent='Event dates are unavailable. Please use the Luma links below.';return}}
  events=data.events.filter(e=>{try{return new URL(e.url).origin==='https://luma.com'&&Number.isFinite(Date.parse(e.start))&&Number.isFinite(Date.parse(e.end))}catch{return false}});
  root.querySelector('#calendar-source').textContent=fallback||events.some(e=>e.stale)?'Showing saved Luma dates. Check Luma for the latest details.':'Dates refreshed from our linked Luma events.';render();
 }
 load();
})();
