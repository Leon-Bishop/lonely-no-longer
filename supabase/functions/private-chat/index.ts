// Supabase Edge Function: private-chat
// Deploy with JWT verification OFF; application verifies its own signed session tokens.
// This is a strictly private two-invite prototype, NOT production age assurance.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':ORIGIN,'vary':'Origin'}});
const ORIGIN=Deno.env.get('PRIVATE_CHAT_ORIGIN')||'';
const enc=new TextEncoder();
const b64=(buf:Uint8Array)=>btoa(String.fromCharCode(...buf)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const unb64=(str:string)=>Uint8Array.from(atob(str.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-str.length%4)%4)),c=>c.charCodeAt(0));
const equal=(a:string,b:string)=>{const aa=enc.encode(a),bb=enc.encode(b);let d=aa.length^bb.length;for(let i=0;i<Math.max(aa.length,bb.length);i++)d|=(aa[i]||0)^(bb[i]||0);return d===0;};
const secret=Deno.env.get('PRIVATE_CHAT_SIGNING_SECRET')||'';
async function signature(value:string){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value))));}
async function token(seat:number){const data=b64(enc.encode(JSON.stringify({seat,exp:Math.floor(Date.now()/1000)+60*60*12})));return data+'.'+await signature(data);}
async function checkToken(value:string){const parts=value.split('.');if(parts.length!==2||!equal(await signature(parts[0]),parts[1]))return null;try{const data=JSON.parse(new TextDecoder().decode(unb64(parts[0])));return ([1,2].includes(data.seat)&&Number.isFinite(data.exp)&&data.exp>Math.floor(Date.now()/1000))?data.seat as number:null;}catch{return null;}}
const db=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false}});
const bad=/(https?:\/\/|www\.|@|\b(?:\+?\d[\d\s().-]{7,}\d)\b|\b(?:instagram|snapchat|telegram|whatsapp|discord)\b|\b(?:address|postcode|eircode)\s*[:=]|\b(?:fuck|cunt|nigger)\b)/i;
Deno.serve(async req=>{
  if(!ORIGIN||secret.length<32||!Deno.env.get('PRIVATE_CHAT_CODE_1')||!Deno.env.get('PRIVATE_CHAT_CODE_2'))return json({error:'Private chat is not configured'},503);
  if(req.headers.get('origin')!==ORIGIN)return json({error:'Origin not allowed'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':ORIGIN,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type, authorization, apikey','access-control-max-age':'600'}});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  if(Number(req.headers.get('content-length')||0)>2048)return json({error:'Request too large'},413);
  let input:Record<string,unknown>;try{input=await req.json();}catch{return json({error:'Invalid request'},400);}
  const action=String(input.action||'');
  if(action==='join'){
    const code=String(input.code||'');if(code.length>128)return json({error:'Invalid invitation'},403);
    const seat=equal(code,Deno.env.get('PRIVATE_CHAT_CODE_1')||'')?1:equal(code,Deno.env.get('PRIVATE_CHAT_CODE_2')||'')?2:0;
    if(!seat)return json({error:'Invalid invitation'},403);
    const alias=seat===1?'GentleRobin'+seat:'KindFox'+seat;
    const {error}=await db.from('private_test_seats').upsert({seat,alias},{onConflict:'seat'});
    if(error)return json({error:'Unable to join'},500);
    return json({token:await token(seat),seat,alias});
  }
  const seat=await checkToken(String(input.token||''));
  if(!seat)return json({error:'Session expired. Re-enter your invitation code.'},401);
  if(action==='messages'){
    const {data,error}=await db.from('private_test_messages').select('id,seat,body,created_at').order('id',{ascending:false}).limit(60);
    if(error)return json({error:'Unable to load messages'},500);
    return json({messages:(data||[]).reverse()});
  }
  if(action==='send'){
    const body=String(input.body||'').trim();
    if(!body||body.length>500)return json({error:'Messages must be 1–500 characters'},400);
    if(bad.test(body))return json({error:'Please avoid links, contact details, social handles and abusive language.'},400);
    const {data,error}=await db.from('private_test_messages').insert({seat,body}).select('id').single();
    if(error)return json({error:'Unable to send'},500);
    return json({id:data.id});
  }
  if(action==='report'){
    const reason=String(input.reason||'').trim();const messageId=Number(input.message_id);
    if(reason.length<3||reason.length>400||!Number.isSafeInteger(messageId))return json({error:'Invalid report'},400);
    const {data:msg}=await db.from('private_test_messages').select('seat').eq('id',messageId).maybeSingle();
    if(!msg||msg.seat===seat)return json({error:'Message not found'},404);
    const {error}=await db.from('private_test_reports').insert({reporter_seat:seat,message_id:messageId,reason});
    if(error)return json({error:'Unable to report'},500);
    return json({ok:true});
  }
  return json({error:'Unknown action'},400);
});
