/**
 * IP-ban primitives. Do not trust an IP from JSON, URL params, or arbitrary
 * X-Forwarded-For headers. Caller must obtain it from a verified edge gateway.
 * Not yet connected to public chat; public chat remains disabled.
 */
export async function hashTrustedIp(ip:string, secret:string):Promise<string>{
 if(!secret||secret.length<32)throw new Error('IP hash secret not configured');
 const canonical=ip.trim().toLowerCase();
 if(canonical.length<3||canonical.length>45||!/^[0-9a-f:.]+$/.test(canonical))
   throw new Error('Invalid canonical IP');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('public-chat-ip-ban:v1:'+canonical)));
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
export const UNDERAGE_IP_BAN_HOURS=24;
