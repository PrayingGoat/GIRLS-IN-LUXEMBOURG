const keys=['instagram','tiktok','whatsapp','linkedin'];
const defaults={instagram:4500,tiktok:2200,whatsapp:950,linkedin:335};
function validStats(data){return keys.every(k=>Number.isInteger(data?.[k])&&data[k]>=0&&data[k]<=1000000000)}
module.exports={keys,defaults,validStats};
