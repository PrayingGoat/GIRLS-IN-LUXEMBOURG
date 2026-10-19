const shapes = {
  '\u2197': '<path d="M5 19 19 5M5 5h14v14"/>',
  '\u2191': '<path d="M12 20V4m-7 7 7-7 7 7"/>',
  '\u2661': '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  '\ud83d\udcd6': '<path d="M12 5v15M12 5C9 3 5 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-7-1-10 1Z"/>',
  '\ud83e\udd1d': '<path d="m2 8 4-4 5 2 3-2 8 4-3 8-5 4-8-5-4-7Zm9-2-4 5 3 2 4-4 5 7M6 15l3-3m0 5 3-3m0 5 3-3"/>'
};
function svgIcons(html) {
 return html.split(/(<[^>]*>)/g).map(part=>{
   if(part.startsWith('<'))return part;
   return part.replace(/&#8599;|&#8593;|[\u2197\u2191\u2661]|\ud83d\udcd6|\ud83e\udd1d/gu, value=>{
     const key=value==='&#8599;'?'\u2197':value==='&#8593;'?'\u2191':value;
     return `<svg class="ui-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shapes[key]}</svg>`;
   });
 }).join('');
}
module.exports=svgIcons;
if(require.main===module){const fs=require('fs');fs.writeFileSync('index.html',svgIcons(fs.readFileSync('index.html','utf8')));}
