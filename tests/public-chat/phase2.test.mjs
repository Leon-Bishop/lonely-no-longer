// Phase 2 source and mocked API tests. No live database or external calls.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes,createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const file=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const backend=file('../../supabase/functions/public-chat/index.ts');
const ui=file('../../apps/web/app/chat/page.tsx');
const sql=file('../../supabase/migrations/20261115060000_public_chat_phase2_safety.sql');
const moderation=file('../../supabase/functions/_shared/public-moderation.ts');
const ORIGIN='https://lonely-no-longer.pages.dev', SECRET='long-test-secret-12345678901234567890';
const IP='b'.repeat(64),TOKEN='a'.repeat(64),ROOM='11111111-1111-4111-8111-111111111111',SESSION='22222222-2222-4222-8222-222222222222';
const digest=async s=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))).toString('hex');
const sign=async s=>{const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Buffer.from(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(s))).toString('hex');};
let count=0;
async function boot({denied='',blockOk=true,reportOk=true}={}){
 const calls=[],session={id:SESSION,ip_hash:IP,revoked_at:null,expires_at:new Date(Date.now()+3600000).toISOString(),age_declared_at:'2026-11-15',rules_accepted_at:'2026-11-15'};
 const db={
  from(table){const q={select(){return q;},eq(){return q;},is(){return q;},order(){return q;},async insert(){return {error:null};},
   async maybeSingle(){return {data:table==='public_chat_ip_bans'?null:table==='public_chat_sessions'?session:table==='public_chat_members'?{room_id:ROOM}:{closed_at:null},error:null};},
   async limit(){return {data:[],error:null};}};return q;},
  async rpc(name,args){calls.push({name,args});
   if(name==='public_chat_consume_rate_limit')return {data:args.p_bucket!==denied,error:null};
   if(name==='public_chat_report')return {data:reportOk,error:null};
   if(name==='public_chat_block')return {data:blockOk,error:null};
   if(name==='public_chat_safe_insert_v2')return {data:100,error:null};
   if(name==='public_chat_state'||name==='public_chat_match')return {data:{state:'connected',room_id:ROOM},error:null};
   if(name==='public_chat_read')return {data:[],error:null};
   if(name==='public_chat_begin')return {data:SESSION,error:null};
   if(name==='public_chat_leave')return {data:true,error:null};
   if(name==='public_chat_revoke_for_safety')return {data:true,error:null};
   if(name==='public_chat_set_ip_ban')return {data:null,error:null};
   throw Error(name);
  }
 };
 const {moderatePublicMessage}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(moderation)).toString('base64'));
 const source=backend.replace(/^import \{createClient\}.*;$/m,'const createClient=()=>globalThis.__db;').replace(/^import \{moderatePublicMessage\}.*;$/m,'const moderatePublicMessage=globalThis.__mod;');
 let handler;
 globalThis.__db=db;globalThis.__mod=moderatePublicMessage;
 globalThis.Deno={env:{get:k=>({PUBLIC_CHAT_ENABLED:'true',PUBLIC_CHAT_ORIGIN:ORIGIN,PUBLIC_CHAT_GATEWAY_SECRET:SECRET,SUPABASE_URL:'https://mock.invalid',SUPABASE_SERVICE_ROLE_KEY:'test'}[k])},serve:f=>handler=f};
 try{await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64')+'#'+(++count));}
 finally{delete globalThis.__db;delete globalThis.__mod;delete globalThis.Deno;}
 return {handler,calls,moderatePublicMessage};
}
async function call(handler,action,extra={}){
 const body=JSON.stringify({action,token:TOKEN,...extra}),timestamp=String(Math.floor(Date.now()/1000)),nonce=crypto.randomUUID();
 const signature=await sign([timestamp,nonce,IP,await digest(body)].join('.'));
 return handler(new Request('https://mock.invalid',{method:'POST',headers:{'content-type':'application/json','x-lnl-time':timestamp,'x-lnl-nonce':nonce,'x-lnl-ip-hash':IP,'x-lnl-signature':signature},body}));
}
test('public-chat backend parses',()=>assert.doesNotThrow(()=>stripTypeScriptTypes(backend)));
test('page TSX syntax parses',()=>{
 const r=ts.transpileModule(ui,{fileName:'page.tsx',compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 assert.equal(r.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
});
test('UI offers report message, report conversation and block-and-leave',()=>{
 for(const item of ['Report message','Report chat','Block &amp; leave','Submit report','Report previous chat'])assert.ok(ui.includes(item),item);
});
test('atomic fixed-window limits have a hard database ceiling',()=>{
 assert.match(sql,/on conflict \(rate_key,bucket,window_start\)/);
 assert.match(sql,/where public\.public_chat_rate_limits\.hits < v_limit/);
 assert.match(sql,/when 'start_ip'/);assert.match(sql,/when 'send_session'/);
});
test('all new safety tables have RLS and no anonymous access',()=>{
 for(const table of ['rate_limits','blocks','moderation_actions']){
  assert.ok(sql.includes('alter table public.public_chat_'+table+' enable row level security'),table);
  assert.ok(sql.includes('revoke all on public.public_chat_'+table+' from public,anon,authenticated'),table);
 }
});
test('match excludes blocked pairing in both directions',()=>{
 assert.match(sql,/b\.blocker_session_id=p_session_id and b\.blocked_session_id=s\.id/);
 assert.match(sql,/b\.blocker_session_id=s\.id and b\.blocked_session_id=p_session_id/);
 assert.match(sql,/pg_advisory_xact_lock\(7647218349\)/);
});
test('report is bound to message sender and room membership',()=>{
 assert.match(sql,/msg\.sender_session_id=v_peer/);
 assert.match(sql,/msg\.room_id=p_room_id/);
 assert.match(sql,/create unique index if not exists public_chat_report_once/);
});
test('moderator review is service-role only and is not a visitor action',()=>{
 for(const name of ['public_chat_review_report','public_chat_moderation_queue']){
  assert.ok(sql.includes('grant execute on function public.'+name));
  assert.ok(sql.includes('revoke all on function public.'+name));
  assert.ok(!backend.includes("action==='"+name+"'"));
 }
});
test('valid message report is submitted with server-derived reporter session',async()=>{
 const {handler,calls}=await boot();
 const r=await call(handler,'report',{room_id:ROOM,reason:'underage',message_id:13});
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true});
 assert.deepEqual(calls.find(x=>x.name==='public_chat_report').args,{p_session_id:SESSION,p_room_id:ROOM,p_message_id:13,p_reason:'underage'});
});
test('a report without a message ID is accepted as a general chat report',async()=>{
 const {handler,calls}=await boot();
 assert.equal((await call(handler,'report',{room_id:ROOM,reason:'threat'})).status,200);
 assert.equal(calls.find(x=>x.name==='public_chat_report').args.p_message_id,null);
});
test('malformed report reasons, IDs and rooms are refused before the report RPC',async()=>{
 const {handler,calls}=await boot();
 for(const params of [{room_id:ROOM,reason:'ban',message_id:5},{room_id:ROOM,reason:'underage',message_id:'5'},{room_id:'bogus',reason:'underage'}]){
  assert.equal((await call(handler,'report',params)).status,400);
 }
 assert.equal(calls.filter(x=>x.name==='public_chat_report').length,0);
});
test('client cannot name arbitrary block target, only room; backend stores no target identifier from body',async()=>{
 const {handler,calls}=await boot();
 const r=await call(handler,'block',{room_id:ROOM,blocked_session_id:'somebody'});
 assert.equal(r.status,200);
 assert.deepEqual(calls.find(x=>x.name==='public_chat_block').args,{p_session_id:SESSION,p_room_id:ROOM});
});
test('report and block reject database refusal',async()=>{
 const {handler:report}=await boot({reportOk:false});
 assert.equal((await call(report,'report',{room_id:ROOM,reason:'underage'})).status,403);
 const {handler:block}=await boot({blockOk:false});
 assert.equal((await call(block,'block',{room_id:ROOM})).status,403);
});
test('IP rate limiting happens before report or block writes',async()=>{
 const {handler,calls}=await boot({denied:'ip_all'});
 assert.equal((await call(handler,'block',{room_id:ROOM})).status,429);
 assert.equal(calls.some(x=>x.name==='public_chat_block'),false);
});
test('session rate limiting rejects excessive reports and sends',async()=>{
 const {handler:reports}=await boot({denied:'report_session'});
 assert.equal((await call(reports,'report',{room_id:ROOM,reason:'underage'})).status,429);
 const {handler:sends}=await boot({denied:'send_session'});
 assert.equal((await call(sends,'send',{room_id:ROOM,body:'hello'})).status,429);
});
test('visitor may not request staff moderation queue or decisions',async()=>{
 const {handler,calls}=await boot();
 assert.equal((await call(handler,'moderation_queue')).status,400);
 assert.equal((await call(handler,'review_report',{report_id:1})).status,400);
 assert.equal(calls.some(x=>x.name==='public_chat_moderation_queue'),false);
});
test('explicit and contextual age disclosures are escalated',async()=>{
 const {moderatePublicMessage}=await boot();
 for(const body of ["I'm sixteen",'I’m 16','im 15','I am 14 y/o']){
  const d=moderatePublicMessage(body);assert.equal(d.action,'escalate',body);assert.ok(d.reasons.includes('minor_disclosure'));
 }
 const contextual=moderatePublicMessage('15 y/o','How old are you?');
 assert.ok(contextual.reasons.includes('minor_disclosure'));
});
test('operator CLI refuses unconfirmed enforcement actions',()=>{
 const path=new URL('../../scripts/public-chat-moderation.mjs',import.meta.url);
 const output=spawnSync(process.execPath,[path.pathname,'review','3','revoke_ban','test_staff'],{encoding:'utf8',env:{PATH:process.env.PATH}});
 assert.equal(output.status,2);assert.match(output.stderr,/--confirm/);
});
