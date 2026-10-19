// Rebuild the local reading panels from the reviewed public Notion snapshots.
// Run after refreshing .research/*-current.json; normal builds need no network.
const fs = require('node:fs');
const entries = [
  ['welcome','c4f4509e5591831087ce812ff5d654cb','Welcome','Your people. Your place.'],
  ['about','3d64509e559180918dbdfbaac318a58d','About us','Our story, purpose and people.'],
  ['community','3d64509e5591800192b6de18c289f2c9','Explore the community','Nine circles. So many possibilities.'],
  ['partnerships','3d64509e5591806189afef09ba3eaa4f','Our partnerships','Make something meaningful together.'],
  ['faq','3d64509e559180fd91e8d00275c3aa4f','FAQ','A little clarity before you join.'],
  ['policy','3e14509e559180a5be56f7212f27c2d2','Refund & Privacy Policy','Your plans, your information, your rights.'],
  ['join','3d64509e559180f19219f4c9dec1b0c8','Join and follow us','Find your circle and stay connected.'],
  ['contact','07e4509e5591821dbf3c8184d2587e77','Contact us','A question, an idea, a hello.'],
  ['feedback','3e44509e559180b7ae9ad7c7146b5358','Your opinion counts!','Help shape what comes next.']
];
const visibleEntries = entries.filter(([key]) => !['welcome', 'community', 'contact', 'feedback'].includes(key));
const membership = ['membership','3d64509e559180508c97ce32435164e5','Join the community','Tell us a little about yourself.'];
const all = [...entries,membership];
const base = 'https://big-basket-eb6.notion.site/';
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uuid = s => s.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,'$1-$2-$3-$4-$5');
const unwrap = v => v?.value?.value || v?.value || v;
const normalize = s => s.replaceAll('-','');
const match = url => all.find(e=>normalize(url).includes(e[1]));
function link(url,text,extra='') {
  url = url.replace('mailto:mailtohello@','mailto:hello@');
  // Correct outdated form references using the current pages supplied by the owner.
  if (url.includes('3d64509e559180a89bece7abda3d8143')) url=base+entries[8][1];
  const target=match(url);
  if(target)return `<a href="${base+target[1]}" data-panel="${target[0]}" ${extra}>${text}</a>`;
  if(url.startsWith('/'))url=base+url.replace(/^\/p\//,'').replace(/^\//,'');
  if(!/^(https?:|mailto:)/i.test(url))return text;
  return `<a href="${esc(url)}" ${url.startsWith('mailto:')?'':'target="_blank" rel="noopener noreferrer"'} ${extra}>${text}</a>`;
}
function rich(parts=[]) {
  return parts.map(([text,marks=[]])=>{
    const ref=marks.find(m=>m[0]==='p');
    if(ref){const e=all.find(e=>e[1]===normalize(ref[1]));return e?link(base+e[1],esc(e[2]),'class="panel-action"'):'';}
    let value=esc(text).replace(/\n/g,'<br>');
    for(const m of marks){if(m[0]==='b')value=`<strong>${value}</strong>`;if(m[0]==='i')value=`<em>${value}</em>`;if(m[0]==='a')value=link(m[1],value);}
    return value;
  }).join('');
}
const photos={
  '3e44509e-5591-80ff-840b-d1581f83ea1f':['fabrina','Fabrina Nmj'],
  '3e44509e-5591-80fe-b88b-ceafd5e90501':['marta','Marta Jiménez Martínez'],
  '3e44509e-5591-807b-947d-f57da3555919':['enare','Enare Abang'],
  '3e44509e-5591-805d-aa0e-ea10e2fbae90':['zahra','Zahra Maamary'],
  '3e44509e-5591-8020-b3de-f9421e16831f':['christina','Christina Ntokou']
};
function renderPage(key,id) {
  const data=JSON.parse(fs.readFileSync(`.research/${key}-current.json`));
  const blocks=Object.fromEntries(Object.entries(data.recordMap.block).map(([id,b])=>[id,unwrap(b)]));
  const plain=b=>(b?.properties?.title||[]).map(t=>t[0]).join('');
  const root=blocks[uuid(id)];
  function isFooter(id){const b=blocks[id];return b && ((b.type==='header' && plain(b)==='Stay in touch') || (b.content||[]).some(isFooter));}
  function children(b){return(b.content||[]).map(render).join('');}
  function render(id){
    const b=blocks[id];if(!b || isFooter(id))return '';
    const text=rich(b.properties?.title);const content=children(b);
    if(b.type==='image'){const photo=photos[id];return photo?`<img class="panel-portrait" src="assets/${photo[0]}.webp" alt="${photo[1]}" width="400" height="460" loading="lazy">`:'';}
    if(b.type==='equation'||b.type==='alias')return '';
    if(b.type==='divider')return '<hr>';
    if(b.type==='column_list')return `<div class="panel-columns">${content}</div>`;
    if(b.type==='column')return `<div>${content}</div>`;
    if(b.type==='callout')return `<div class="panel-card">${text?`<p>${text}</p>`:''}${content}</div>`;
    if(['header','sub_header','sub_sub_header','header_4'].includes(b.type)){
      if(key==='community'&&plain(b).startsWith('Current initiatives'))return '<h3>Events & initiatives</h3><p class="panel-note">Events shared by the community. Check the event page for dates, availability and booking details.</p>';
      return `<${plain(b).length>150?'p class="panel-lead"':'h3'}>${text}</${plain(b).length>150?'p':'h3'}>${content}`;
    }
    if(b.type==='bulleted_list'||b.type==='numbered_list')return `<ul><li>${text}${content}</li></ul>`;
    if(b.type==='bookmark')return link(b.properties?.link?.[0]?.[0]||'',text,'class="panel-event"');
    if(b.type==='embed'){const url=b.properties?.source?.[0]?.[0];return url?link(url,'View a past community moment on Instagram ↗','class="panel-event"'):'';}
    if(b.type==='page')return link(base+normalize(b.id),text,'class="panel-action"');
    return (text?`<p>${text}</p>`:'')+content;
  }
  if(key==='faq') {
    return (root.content||[]).map(id=>{
      const b=blocks[id];if(b?.type!=='callout'||isFooter(id))return '';
      let output='<section class="panel-faq-group">',opened=false;
      for(const child of b.content||[]){const q=blocks[child];if(!q)continue;
        if(q.type==='header'){output+=`<h3>${rich(q.properties.title)}</h3>`;}
        else if(q.type==='header_4'){if(opened)output+='</details>';output+=`<details><summary>${rich(q.properties.title)}</summary>`;opened=true;}
        else output+=render(child);
      }
      return output+(opened?'</details>':'')+'</section>';
    }).join('')+link(base+entries[7][1],'Still have a question? Contact us ↗','class="panel-action"');
  }
  let hideTeam = false;
  return (root.content||[]).filter(id => {
    if (key !== 'about') return true;
    const title = plain(blocks[id]);
    if (title === 'Meet the Team') hideTeam = true;
    if (title.startsWith('Do you have any questions')) hideTeam = false;
    return !hideTeam;
  }).map(render).join('');
}
function formPanel(key,id,title){
  let intro=key==='membership'?'<p>Choose the groups you’d like to join. Requests are reviewed manually, usually within 2–4 days and no longer than a week.</p>':'';
  if(key!=='membership'){
    const j=JSON.parse(fs.readFileSync(`.research/${key}-current.json`));
    const b=unwrap(j.recordMap.block[uuid(id)]);
    intro=`<p>${rich(b.format.form_config.description)}</p>`;
  }
  return `${intro}<div class="panel-form"><p class="form-loading" role="status">Loading the form…</p><iframe data-form-src="${base}ebd/${id}" title="${esc(title)} form" referrerpolicy="strict-origin-when-cross-origin"></iframe></div><p class="panel-note">Form not displaying? <button type="button" data-reload-form>Try again</button> or <a href="${base+id}" data-original-form target="_blank" rel="noopener noreferrer">open the original form in a new tab</a>.</p>`;
}
const nav=visibleEntries.map(([key,id,title],i)=>`<a href="${base+id}" data-panel="${key}"><span>${String(i+1).padStart(2,'0')}</span>${esc(title)}</a>`).join('');
const templates=all.map(([key,id,title,desc],i)=>{
  let body;
  if(key==='welcome')body=`<p class="panel-lead">Born or just landed in Luxembourg? Don’t worry! A community of women is here for you.</p><img class="panel-welcome-image" src="assets/community-strength.webp" alt="Community is strength — two hands joined in solidarity" width="1920" height="1080"><nav class="panel-welcome-nav" aria-label="Explore the community pages">${nav}</nav>`;
  else if(['contact','feedback','membership'].includes(key))body=formPanel(key,id,title);
  else body=renderPage(key,id);
  return `<template id="panel-${key}" data-title="${esc(title)}" data-subtitle="${esc(desc)}" data-number="${visibleEntries.some(e=>e[0]===key)?String(visibleEntries.findIndex(e=>e[0]===key)+1).padStart(2,'0'):''}"><div class="panel-prose panel-${key}">${body}</div></template>`;
}).join('\n');
const hub=`<!-- community-directory:start --><section class="community-directory container" aria-labelledby="directory-title"><div><p class="eyebrow">YOUR COMMUNITY, AT A GLANCE</p><h2 id="directory-title">Make yourself <em>at home.</em></h2><p>Our story, your circles, and everything you need to feel part of it.</p></div><nav aria-label="Community pages, in order">${visibleEntries.map(([key,id,title,desc],i)=>`<a href="${base+id}" data-panel="${key}"><span class="directory-number">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(title)}</strong><small>${esc(desc)}</small></span><span aria-hidden="true">↗</span></a>`).join('')}</nav></section><!-- community-directory:end -->`;
const modal=`<!-- community-panels:start --><dialog class="community-dialog" aria-labelledby="panel-title" aria-describedby="panel-subtitle"><header class="panel-header"><div><p class="eyebrow" id="panel-number"></p><h2 id="panel-title" tabindex="-1"></h2><p id="panel-subtitle"></p></div><button class="panel-close" type="button" aria-label="Close section"><svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button></header><div class="panel-layout"><nav class="panel-nav" aria-label="Community sections">${nav}</nav><div class="panel-content"></div></div></dialog>${templates}<!-- community-panels:end -->`;
let html=fs.readFileSync('index.html','utf8');
html=html.replace(/<!-- community-directory:start -->[\s\S]*?<!-- community-directory:end -->/,'');
html=html.replace(/<section class="community-directory\b[\s\S]*?<\/section>/,'');
html=html.replace(/<!-- community-panels:start -->[\s\S]*?<!-- community-panels:end -->/,'');
html=html.replace('<section id="contact"',hub+'\n<section id="contact"');
html=html.replace('</body>',modal+'\n</body>');
// Make existing source-page links open locally. Original hrefs remain a no-JS fallback.
html=html.replace(/<a\b([^>]*?)href="([^"]+)"([^>]*)>/g,(full,before,url,after)=>{
  if(full.includes('data-panel=')||full.includes('data-original-form'))return full;
  const e=match(url);if(!e)return full;
  return `<a${before}href="${url}"${after.replace(/ target="_blank"/,'')} data-panel="${e[0]}">`;
});
fs.writeFileSync('index.html',require('./svg-icons.cjs')(require('./localize-panels.cjs')(html)));
console.log('Built 5 directory entries with contextual panels and membership form.');
