// Public chat safeguard endpoint: DISABLED unless PUBLIC_CHAT_ENABLED=true.
// No session creation or matchmaking endpoints. Never reuse private invite codes.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {moderatePublicMessage} from '../_shared/public-moderation.ts';
const origin=Deno.env.get('PUBLIC_CHAT_ORIGIN')||'';
const db=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false}});
const headers={'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':origin,'vary':'Origin'};
const respond=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
async function hash(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
Deno.serve(async req=>{
 if(!origin||Deno.env.get('PUBLIC_CHAT_ENABLED')!=='true')return respond(503,{error:'Public chat is not open'});
 if(req.headers.get('origin')!==origin)return respond(403,{error:'Forbidden'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type,authorization,apikey','vary':'Origin'}});
 if(req.method!=='POST')return respond(405,{error:'Method not allowed'});
 if(Number(req.headers.get('content-length')||0)>2048)return respond(413,{error:'Request too large'});
 let data:Record<string,unknown>;
 try{data=await req.json();}catch{return respond(400,{error:'Invalid request'});}
 if(data.action!=='send'||typeof data.token!=='string'||! /^[a-f0-9]{64}$/.test(data.token)||typeof data.room_id!=='string'||! /^[a-f0-9-]{36}$/i.test(data.room_id))return respond(400,{error:'Invalid request'});
 const {data:session,error:sessionError}=await db.from('public_chat_sessions').select('id,expires_at,revoked_at,age_verified_at').eq('token_hash',await hash(data.token)).maybeSingle();
 if(sessionError)return respond(503,{error:'Chat unavailable'});
 if(!session||session.revoked_at||!session.age_verified_at||Date.parse(session.expires_at)<=Date.now())return respond(401,{error:'Session unavailable'});
 const roomId=data.room_id;
 const {data:membership,error:membershipError}=await db.from('public_chat_members').select('room_id').eq('session_id',session.id).eq('room_id',roomId).is('left_at',null).maybeSingle();
 if(membershipError)return respond(503,{error:'Chat unavailable'});
 if(!membership)return respond(403,{error:'Conversation unavailable'});
 const {data:room,error:roomError}=await db.from('public_chat_rooms').select('closed_at').eq('id',roomId).maybeSingle();
 if(roomError||!room||room.closed_at)return respond(403,{error:'Conversation unavailable'});
 // Context is fetched from the database, never supplied by the visitor.
 const {data:last,error:lastError}=await db.from('public_chat_messages').select('body,sender_session_id').eq('room_id',roomId).order('id',{ascending:false}).limit(1);
 if(lastError)return respond(503,{error:'Chat unavailable'});
 const previousOther=last?.[0]?.sender_session_id!==session.id?last?.[0]?.body:undefined;
 const decision=moderatePublicMessage(data.body,previousOther);
 if(!decision.allowed){
   if(decision.reasons.includes('minor_disclosure')){
     const {data:revoked,error}=await db.rpc('public_chat_revoke_for_safety',{p_session_id:session.id,p_room_id:roomId,p_reason:'minor_disclosure'});
     if(error||!revoked)return respond(503,{error:'Chat unavailable'});
     return respond(403,{error:'This adults-only conversation has ended.'});
   }
   if(decision.action==='escalate'){
     const {error}=await db.rpc('public_chat_revoke_for_safety',{p_session_id:session.id,p_room_id:roomId,p_reason:'critical_safety'});
     if(error)return respond(503,{error:'Chat unavailable'});
     return respond(403,{error:'This conversation has ended for safety reasons.'});
   }
   return respond(400,{error:'Please do not share links, contact details or prohibited content.'});
 }
 const {data:id,error}=await db.rpc('public_chat_safe_insert',{p_session_id:session.id,p_room_id:roomId,p_body:(data.body as string).normalize('NFKC').trim()});
 if(error)return respond(403,{error:'Message could not be sent'});
 return respond(200,{id});
});
