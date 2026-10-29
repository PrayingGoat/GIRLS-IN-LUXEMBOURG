const { createHmac } = require('node:crypto');
const { getStore } = require('../lib/store.cjs');
const { validateMembership } = require('../lib/membership.cjs');
module.exports = async function handler(req, res) {
  const send = (status, body) => { res.statusCode = status; res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','no-store'); res.end(JSON.stringify(body)); };
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return send(405,{ message:'Use the membership form to send a request.' }); }
  const host = req.headers.host;
  if (req.headers.origin) {
    try { if (new URL(req.headers.origin).host !== host) return send(403,{ message:'Please submit your request from our website.' }); } catch { return send(403,{message:'Invalid origin.'}); }
  }
  if (!(req.headers['content-type'] || '').startsWith('application/json')) return send(415,{message:'Please use the membership form.'});
  let body;
  try {
    if (req.body !== undefined) body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    else { let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw)>8192) return send(413,{message:'Request too large.'}); } body = JSON.parse(raw); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body))>8192) return send(400,{message:'Invalid request.'});
  } catch { return send(400,{message:'Invalid request.'}); }
  if (body.website) return send(400,{message:'Please reload the page and try again.'});
  const {errors,data} = validateMembership(body);
  if (Object.keys(errors).length) return send(422,{message:'Please check the highlighted fields.',errors});
  try {
    const db=await getStore();
    // Vercel supplies this trusted header; local requests use their socket address.
    const ip = process.env.VERCEL ? (req.headers['x-vercel-forwarded-for'] || 'unknown').split(',')[0].trim() : req.socket?.remoteAddress || 'local';
    const key = createHmac('sha256',process.env.RATE_LIMIT_SECRET || process.env.MONGODB_URI).update(ip).digest('hex');
    const attempts=await db.consumeLimit('membership_rate_limits',key);
    if(attempts>5){res.setHeader('Retry-After','900');return send(429,{message:'Too many attempts. Please try again in 15 minutes.'});}
    await db.addMember(data);
    // Same response for an existing email: do not expose the member list or overwrite another request.
    return send(200,{message:'Your request has been received. If you already submitted a request with this email, it is still on file.'});
  } catch {
    return send(503,{message:'We cannot save your request right now. Your details have not been confirmed as saved. Please try again later or email hello@girlsinlu.com.'});
  }
};
