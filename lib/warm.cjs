// A form page calls GET ...?warm=1 when the visitor starts typing, so the function and the
// database connection are already awake when the form is submitted.
const { getStore } = require('./store.cjs');
module.exports = async function warm(req, res) {
  if (req.method !== 'GET' || !/[?&]warm=1(?:&|$)/.test(req.url || '')) return false;
  try { await getStore(); } catch { /* The real request reports any problem. */ }
  res.statusCode = 204; res.setHeader('Cache-Control', 'no-store'); res.end();
  return true;
};
