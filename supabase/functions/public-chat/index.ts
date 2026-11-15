// Phase 1 public-chat API. HMAC gateway only; non-live until reviewed and deployed.
// Adult self-declaration is recorded separately from independently verified age.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {moderatePublicMessage} from '../_shared/public-moderation.ts';
const origin=Deno.env.get('PUBLIC_CHAT_ORIGIN')||'';
const enabled=Deno.env.get('PUBLIC_CHAT_ENABLED')==='true';
const gatewaySecret=Deno.env.get('PUBLIC_CHAT_GATEWAY_SECRET')||'';
const db=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false}});
const headers={'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':origin,'vary':'Origin'};
const respond=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
async function hash(value:string){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));}
async function hmac(value:string){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(gatewaySecret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value))));
}
function constantEqual(a:string,b:string){
 if(a.length!==b.length)return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}
const validToken=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const validRoom=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(v);
const failDb=()=>respond(503,{error:'Chat unavailable'});

Deno.serve(async req=>{
 if(!origin||!enabled||gatewaySecret.length<32)return respond(503,{error:'Public chat is not open'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type','vary':'Origin'}});
 if(req.method!=='POST')return respond(405,{error:'Method not allowed'});
 if(Number(req.headers.get('content-length')||0)>2048)return respond(413,{error:'Request too large'});
 const timestamp=req.headers.get('x-lnl-time')||'';
 const nonce=req.headers.get('x-lnl-nonce')||'';
 const ipHash=req.headers.get('x-lnl-ip-hash')||'';
 const signature=req.headers.get('x-lnl-signature')||'';
 if(!/^\d{10}$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>30||
    !/^[a-f0-9-]{36}$/.test(nonce)||!/^[a-f0-9]{64}$/.test(ipHash)||!/^[a-f0-9]{64}$/.test(signature))
   return respond(403,{error:'Forbidden'});
 const body=await req.text();
 if(new TextEncoder().encode(body).length>2048)return respond(413,{error:'Request too large'});
 const bodyHash=await hash(body);
 if(!constantEqual(await hmac([timestamp,nonce,ipHash,bodyHash].join('.')),signature))
   return respond(403,{error:'Forbidden'});
 const {error:nonceError}=await db.from('public_chat_gateway_nonces').insert({nonce,expires_at:new Date(Date.now()+60000).toISOString()});
 if(nonceError)return failDb();
 const {data:ban,error:banError}=await db.from('public_chat_ip_bans').select('expires_at').eq('ip_hash',ipHash).maybeSingle();
 if(banError)return failDb();
 if(ban&&Date.parse(ban.expires_at)>Date.now())return respond(403,{error:'Chat access temporarily unavailable'});
 let data:Record<string,unknown>;
 try{const parsed=JSON.parse(body);if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')throw Error();data=parsed;}
 catch{return respond(400,{error:'Invalid request'});}
 const action=data.action;
 if(action==='start'){
   // These are explicit declarations by the visitor, NOT proof of age.
   if(data.adult!==true||data.agree_rules!==true)return respond(400,{error:'Please confirm the entry rules'});
   const token=hex(crypto.getRandomValues(new Uint8Array(32)));
   const {error}=await db.rpc('public_chat_begin',{p_token_hash:await hash(token),p_ip_hash:ipHash});
   if(error)return error.message?.includes('Too many active sessions')?
     respond(429,{error:'Please try again later'}):failDb();
   return respond(200,{token});
 }
 if(!validToken(data.token))return respond(401,{error:'Session unavailable'});
 const {data:session,error:sessionError}=await db.from('public_chat_sessions')
   .select('id,ip_hash,expires_at,revoked_at,age_declared_at,rules_accepted_at')
   .eq('token_hash',await hash(data.token)).maybeSingle();
 if(sessionError)return failDb();
 if(!session||session.ip_hash!==ipHash||session.revoked_at||!session.age_declared_at||!session.rules_accepted_at||Date.parse(session.expires_at)<=Date.now())
   return respond(401,{error:'Session unavailable'});
 if(action==='match'){
   const {data:result,error}=await db.rpc('public_chat_match',{p_session_id:session.id});
   return error?failDb():respond(200,result);
 }
 if(action==='state'){
   const {data:result,error}=await db.rpc('public_chat_state',{p_session_id:session.id});
   return error?failDb():respond(200,result);
 }
 if(action==='leave'){
   if(typeof data.end!=='boolean')return respond(400,{error:'Invalid request'});
   const {data:result,error}=await db.rpc('public_chat_leave',{p_session_id:session.id,p_end:data.end});
   return error?failDb():respond(result?200:401,{ok:!!result});
 }
 if(action==='messages'){
   if(!validRoom(data.room_id)||!Number.isSafeInteger(data.after_id)||Number(data.after_id)<0)
     return respond(400,{error:'Invalid request'});
   const {data:messages,error}=await db.rpc('public_chat_read',{
     p_session_id:session.id,p_room_id:data.room_id,p_after_id:data.after_id});
   return error?respond(403,{error:'Conversation unavailable'}):respond(200,{messages});
 }
 if(action!=='send')return respond(400,{error:'Unknown action'});
 if(!validRoom(data.room_id))return respond(400,{error:'Invalid request'});
 if(typeof data.body!=='string')return respond(400,{error:'Invalid message'});
 const roomId=data.room_id;
 const {data:membership,error:memberError}=await db.from('public_chat_members')
   .select('room_id').eq('session_id',session.id).eq('room_id',roomId).is('left_at',null).maybeSingle();
 if(memberError)return failDb();
 if(!membership)return respond(403,{error:'Conversation unavailable'});
 const {data:room,error:roomError}=await db.from('public_chat_rooms').select('closed_at').eq('id',roomId).maybeSingle();
 if(roomError||!room||room.closed_at)return respond(403,{error:'Conversation unavailable'});
 for(let attempt=0;attempt<3;attempt++){
   const {data:last,error:lastError}=await db.from('public_chat_messages')
     .select('id,body,sender_session_id').eq('room_id',roomId).order('id',{ascending:false}).limit(1);
   if(lastError)return failDb();
   const latest=last?.[0];
   const previousOther=latest&&latest.sender_session_id!==session.id?latest.body:undefined;
   const decision=moderatePublicMessage(data.body,previousOther);
   if(!decision.allowed){
     if(decision.reasons.includes('minor_disclosure')){
       const {data:revoked,error}=await db.rpc('public_chat_revoke_for_safety',{
         p_session_id:session.id,p_room_id:roomId,p_reason:'minor_disclosure'});
       if(error||!revoked)return failDb();
       const {error:ipBanError}=await db.rpc('public_chat_set_ip_ban',{
         p_ip_hash:ipHash,p_reason:'minor_disclosure',p_hours:24});
       if(ipBanError)return failDb();
       return respond(403,{error:'This adults-only conversation has ended.'});
     }
     if(decision.action==='escalate'){
       const {error}=await db.rpc('public_chat_revoke_for_safety',{
         p_session_id:session.id,p_room_id:roomId,p_reason:'critical_safety'});
       if(error)return failDb();
       return respond(403,{error:'This conversation has ended for safety reasons.'});
     }
     return respond(400,{error:'Please do not share links, contact details or prohibited content.'});
   }
   const clean=(data.body as string).normalize('NFKC').replace(/[‘’]/g,"'").replace(/[\u200B-\u200D\uFEFF]/g,'').trim();
   const {data:id,error}=await db.rpc('public_chat_safe_insert_v2',{
     p_session_id:session.id,p_room_id:roomId,p_body:clean,p_expected_latest_id:latest?.id||0});
   if(!error)return respond(200,{id});
   if(!error.message?.includes('Context changed'))return respond(403,{error:'Message could not be sent'});
 }
 return respond(409,{error:'Conversation changed. Please try again.'});
});
