const { scryptSync, timingSafeEqual, createHash } = require('node:crypto');
function verifyPassword(password, encoded) {
 if(typeof password!=='string'||password.length>256||!encoded)return false;
 const [scheme,salt,hex]=encoded.split(':');
 if(scheme!=='scrypt'||!salt||!(/^[a-f0-9]{128}$/.test(hex||'')))return false;
 const expected=Buffer.from(hex,'hex');
 return timingSafeEqual(scryptSync(password,salt,64),expected);
}
function sessionToken(req) {
 const value=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('gil_admin='))?.slice(10);
 return /^[a-f0-9]{64}$/.test(value||'')?value:null;
}
const tokenHash=token=>createHash('sha256').update(token).digest('hex');
module.exports={verifyPassword,sessionToken,tokenHash};
// Same format as scripts/setup-admin.cjs: scrypt:<salt>:<128 hex characters>.
function hashPassword(password){
 const { randomBytes } = require('node:crypto');
 const salt=randomBytes(16).toString('hex');
 return 'scrypt:'+salt+':'+scryptSync(password,salt,64).toString('hex');
}
module.exports.hashPassword=hashPassword;
