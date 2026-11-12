const { createHmac } = require('node:crypto');
const { getStore } = require('../lib/store.cjs');
const { validateContact } = require('../lib/contact.cjs');
module.exports = async function handler(req, res) {
  if (await require('../lib/warm.cjs')(req, res)) return;
  const send = (status, body) => { res.statusCode = status; res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','no-store'); res.end(JSON.stringify(body)); };
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return send(405,{ message:'Use the contact form to send a message.' }); }
  if (req.headers.origin) {
    try { if (new URL(req.headers.origin).host !== req.headers.host) return send(403,{ message:'Please send your message from our website.' }); } catch { return send(403,{ message:'Invalid origin.' }); }
  }
  if (!(req.headers['content-type'] || '').startsWith('application/json')) return send(415,{ message:'Please use the contact form.' });
  let body;
  try {
    if (req.body !== undefined) body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    else { let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 16384) return send(413,{ message:'Message too large.' }); } body = JSON.parse(raw); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body)) > 16384) return send(400,{ message:'Invalid request.' });
  } catch { return send(400,{ message:'Invalid request.' }); }
  if (body.website) return send(400,{ message:'Please reload the page and try again.' });
  const { errors, data } = validateContact(body);
  if (Object.keys(errors).length) return send(422,{ message:'Please check the highlighted fields.', errors });
  try {
    const db = await getStore();
    // Vercel supplies this trusted header; local requests use their socket address.
    const ip = process.env.VERCEL ? (req.headers['x-vercel-forwarded-for'] || 'unknown').split(',')[0].trim() : req.socket?.remoteAddress || 'local';
    const key = createHmac('sha256', process.env.RATE_LIMIT_SECRET || process.env.MONGODB_URI).update('contact:' + ip).digest('hex');
    if (await db.consumeLimit('membership_rate_limits', key) > 5) { res.setHeader('Retry-After','900'); return send(429,{ message:'Too many messages. Please try again in 15 minutes.' }); }
    await db.addContactMessage(data);
    return send(200,{ message:'Thank you. Your message has been received.' });
  } catch {
    return send(503,{ message:'We cannot send your message right now. Please try again later or email hello@girlsinlu.com.' });
  }
};
