const keys=['instagram','tiktok','whatsapp','linkedin'];
const defaults={instagram:3900,tiktok:2000,whatsapp:890,linkedin:270};
function validStats(data){return keys.every(k=>Number.isInteger(data?.[k])&&data[k]>=0&&data[k]<=1000000000)}
module.exports={keys,defaults,validStats};
