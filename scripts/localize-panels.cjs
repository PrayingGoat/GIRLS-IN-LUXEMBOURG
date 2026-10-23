const fs = require('node:fs');
function localizePanels(html) {
  for (const key of ['membership', 'contact', 'feedback']) {
    const message = key === 'membership'
      ? 'Our membership form will be available here soon. In the meantime, email us to ask about joining.'
      : key === 'feedback' ? 'We would love to hear your ideas. Our feedback form will be available here soon. In the meantime, send us an email.'
      : 'Our contact form will be available here soon. In the meantime, email us with your question.';
    html = html.replace(new RegExp('(<template id="panel-' + key + '"[^>]*>)[\\s\\S]*?(</template>)'), `$1<div class="panel-prose panel-${key}"><div class="panel-card"><h3>Let\u2019s stay in touch.</h3><p>${message}</p><a class="panel-action" href="mailto:hello@girlsinlu.com">hello@girlsinlu.com</a></div></div>$2`);
  }
  html = html.replace(/<a\b([^>]*)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g, (full, before, url, after, content) => {
    const attributes = before + after;
    const key = attributes.match(/data-panel="([^"]+)"/)?.[1];
    if (key === 'membership') return `<a${before}href="join.html"${after.replace(/\sdata-panel="membership"/,'')} >${content}</a>`.replace(/\sdata-panel="membership"/,'');
    if (key) return `<a${before}href="#panel-${key}"${after}>${content}</a>`;
    if (/https?:\/\/[^/]*notion\.(?:site|com|so)\b/i.test(url)) return content;
    return full;
  });
  return html;
}
module.exports = localizePanels;
if (require.main === module) fs.writeFileSync('index.html', localizePanels(fs.readFileSync('index.html', 'utf8')));
