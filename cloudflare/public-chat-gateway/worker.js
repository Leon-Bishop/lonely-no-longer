// Cloudflare Worker gateway for future public chat. NOT ROUTED OR DEPLOYED.
// Secrets: PUBLIC_CHAT_GATEWAY_SECRET (same at Supabase), PUBLIC_CHAT_IP_HASH_SECRET
// Variables: PUBLIC_CHAT_BACKEND_URL, PUBLIC_CHAT_ORIGIN, PUBLIC_CHAT_ENABLED
// The backend independently verifies the HMAC envelope. Never forward raw IP.
async function hmac(secret, value){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export default {async fetch(req,env){
 const origin=env.PUBLIC_CHAT_ORIGIN;
 const base={'access-control-allow-origin':origin||'','vary':'Origin','cache-control':'no-store'};
 const fail=(status)=>new Response(JSON.stringify({error:status===503?'Chat unavailable':'Request denied'}),{status,headers:{...base,'content-type':'application/json'}});
 if(!origin||env.PUBLIC_CHAT_ENABLED!=='true'||!env.PUBLIC_CHAT_BACKEND_URL||!env.PUBLIC_CHAT_GATEWAY_SECRET||env.PUBLIC_CHAT_GATEWAY_SECRET.length<32||!env.PUBLIC_CHAT_IP_HASH_SECRET||env.PUBLIC_CHAT_IP_HASH_SECRET.length<32)return fail(503);
 if(req.headers.get('origin')!==origin)return fail(403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...base,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type'}});
 if(req.method!=='POST')return fail(405);
 const ip=req.headers.get('CF-Connecting-IP');
 if(!ip||ip.length>45||!/^[0-9a-fA-F:.]+$/.test(ip))return fail(403);
 const bytes=await req.arrayBuffer();
 if(bytes.byteLength>2048)return fail(413);
 const ipHash=await hmac(env.PUBLIC_CHAT_IP_HASH_SECRET,'public-chat-ip-ban:v1:'+ip.trim().toLowerCase());
 const timestamp=String(Math.floor(Date.now()/1000));
 const nonce=crypto.randomUUID();
 const bodyHash=await crypto.subtle.digest('SHA-256',bytes);
 const bodyHex=[...new Uint8Array(bodyHash)].map(x=>x.toString(16).padStart(2,'0')).join('');
 const signed=[timestamp,nonce,ipHash,bodyHex].join('.');
 const signature=await hmac(env.PUBLIC_CHAT_GATEWAY_SECRET,signed);
 // Backend URL must be the exact, private-to-app function endpoint. The
 // signature prevents bypassing this Worker via direct Supabase requests.
 const upstream=await fetch(env.PUBLIC_CHAT_BACKEND_URL,{method:'POST',headers:{'content-type':'application/json','x-lnl-time':timestamp,'x-lnl-nonce':nonce,'x-lnl-ip-hash':ipHash,'x-lnl-signature':signature},body:bytes,redirect:'error'});
 return new Response(upstream.body,{status:upstream.status,headers:{...base,'content-type':'application/json'}});
}};
