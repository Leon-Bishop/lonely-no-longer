import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=new URL('.',import.meta.url);
const file=name=>readFileSync(new URL(name,root),'utf8');
const backend=file('../../supabase/functions/public-chat/index.ts');
const sql=file('../../supabase/migrations/20261115050000_public_chat_phase1.sql');
const ui=file('../../apps/web/app/chat/page.tsx');
let counter=0;
const ORIGIN='https://lonely-no-longer.pages.dev';
const SECRET='a-very-long-test-gateway-secret-12345';
const IP='b'.repeat(64);
const ROOM='11111111-1111-4111-8111-111111111111';
const SESSION='22222222-2222-4222-8222-222222222222';
const sha=async value=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))).toString('hex');
const sign=async value=>{const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value))).toString('hex');};
async function request(handler, data,opts={}){
 const body=JSON.stringify(data),timestamp=String(Math.floor(Date.now()/1000));const nonce=crypto.randomUUID(),ip=opts.ip||IP;
 const signature=opts.badSignature?'f'.repeat(64):await sign([timestamp,nonce,ip,await sha(body)].join('.'));
 return handler(new Request('https://supabase.test/functions/v1/public-chat',{method:'POST',headers:{'content-type':'application/json','x-lnl-time':timestamp,'x-lnl-nonce':nonce,'x-lnl-ip-hash':ip,'x-lnl-signature':signature},body}));
}
async function init(enabled=true){
 const state={sessions:new Map(),nonces:new Set(),messages:[],rpcCalls:[],waiting:true,closed:false,revoked:false};
 const db={
   from(table){const filters={};const q={
     select(){return q;},eq(k,v){filters[k]=v;return q;},is(){return q;},order(){return q;},
     async insert({nonce}){if(table!=='public_chat_gateway_nonces'||state.nonces.has(nonce))return {error:{message:'replay'}};state.nonces.add(nonce);return {error:null};},
     async maybeSingle(){
       if(table==='public_chat_ip_bans')return {data:null,error:null};
       if(table==='public_chat_sessions')return {data:state.sessions.get(filters.token_hash)||null,error:null};
       if(table==='public_chat_members')return {data:filters.room_id===ROOM&&!state.closed?{room_id:ROOM}:null,error:null};
       if(table==='public_chat_rooms')return {data:filters.id===ROOM?{closed_at:state.closed?new Date().toISOString():null}:null,error:null};
       throw Error(table);
     },async limit(){if(table!=='public_chat_messages')throw Error(table);return {data:state.messages.slice(-1).reverse(),error:null};}
   };return q;},
   async rpc(name,args){state.rpcCalls.push({name,args});
     if(name==='public_chat_begin'){state.sessions.set(args.p_token_hash,{id:SESSION,ip_hash:args.p_ip_hash,expires_at:new Date(Date.now()+3600000).toISOString(),revoked_at:null,age_declared_at:new Date().toISOString(),rules_accepted_at:new Date().toISOString()});return {data:SESSION,error:null};}
     if(name==='public_chat_match'){state.waiting=false;return {data:{state:'connected',room_id:ROOM},error:null};}
     if(name==='public_chat_state')return {data:{state:state.closed?'ended':state.waiting?'waiting':'connected',room_id:state.closed||state.waiting?undefined:ROOM},error:null};
     if(name==='public_chat_read'&&args.p_room_id!==ROOM)return {data:null,error:{message:'Conversation unavailable'}};
     if(name==='public_chat_read')return {data:state.messages.filter(x=>x.id>args.p_after_id).map(x=>({id:x.id,body:x.body,mine:x.sender_session_id===SESSION,created_at:x.created_at})),error:null};
     if(name==='public_chat_safe_insert_v2'){const last=state.messages.at(-1)?.id||0;if(last!==args.p_expected_latest_id)return {data:null,error:{message:'Context changed'}};const id=last+1;state.messages.push({id,body:args.p_body,sender_session_id:SESSION,created_at:new Date().toISOString()});return {data:id,error:null};}
     if(name==='public_chat_leave'){state.closed=true;if(args.p_end)state.revoked=true;return {data:true,error:null};}
     if(name==='public_chat_revoke_for_safety'){state.closed=true;state.revoked=true;return {data:true,error:null};}
     if(name==='public_chat_set_ip_ban')return {data:null,error:null};
     throw Error('unexpected rpc '+name);
   }
 };
 let source=backend.replace(/^import \{createClient\}.*;$/m,'const createClient=()=>globalThis.__phaseDb;').replace(/^import \{moderatePublicMessage\}.*;$/m,'const moderatePublicMessage=globalThis.__phaseModerate;');
 const modSource=file('../../supabase/functions/_shared/public-moderation.ts');
 const {moderatePublicMessage}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(modSource)).toString('base64'));
 let handler;
 globalThis.__phaseDb=db;globalThis.__phaseModerate=moderatePublicMessage;
 globalThis.Deno={env:{get:key=>({PUBLIC_CHAT_ORIGIN:ORIGIN,PUBLIC_CHAT_ENABLED:enabled?'true':'false',PUBLIC_CHAT_GATEWAY_SECRET:SECRET,SUPABASE_URL:'https://test.example',SUPABASE_SERVICE_ROLE_KEY:'mock'}[key])},serve:fn=>{handler=fn;}};
 try{await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64')+'#'+(++counter));}
 finally{delete globalThis.Deno;delete globalThis.__phaseDb;delete globalThis.__phaseModerate;}
 return {handler,state};
}

test('TSX page transpiles without parse errors',()=>{
 const result=ts.transpileModule(ui,{fileName:'page.tsx',compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 assert.equal(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
 assert.match(result.outputText,/function PublicChat/);
});
test('backend TypeScript parses with Node type stripping',()=>assert.doesNotThrow(()=>stripTypeScriptTypes(backend)));
test('SQL is designed as service-role-only RPCs with one-at-a-time matchmaking',()=>{
 for(const name of ['public_chat_begin','public_chat_match','public_chat_leave','public_chat_state','public_chat_read','public_chat_safe_insert_v2']){
   assert.match(sql,new RegExp('create or replace function public\\.'+name+'\\('));
   assert.match(sql,new RegExp('grant execute on function public\\.'+name+'\\('));
 }
 assert.match(sql,/pg_advisory_xact_lock\(7647218349\)/);
 assert.match(sql,/for update of w,s skip locked/);
 assert.match(sql,/last_peer_session_id/);
 assert.match(sql,/age_declared_at/);
 assert.match(sql,/alter column age_verified_at drop not null/);
 assert.match(sql,/public_chat_room_member_limit/);
 assert.match(sql,/revoke all on public\.public_chat_waiting from public, anon, authenticated/);
 assert.match(sql,/v_latest<>p_expected_latest_id/);
});
test('start refuses missing adult or rules acknowledgement',async()=>{
 const {handler}=await init();for(const data of [{action:'start',adult:false,agree_rules:true},{action:'start',adult:true,agree_rules:false},{action:'start'}]){
   assert.equal((await request(handler,data)).status,400);
 }
});
test('endpoints reject bad signatures and direct calls',async()=>{
 const {handler}=await init();assert.equal((await request(handler,{action:'start',adult:true,agree_rules:true},{badSignature:true})).status,403);
 const res=await handler(new Request('https://mock.test',{method:'GET'}));assert.equal(res.status,405);
});
test('disabled backend rejects entry',async()=>{
 const {handler}=await init(false);assert.equal((await request(handler,{action:'start',adult:true,agree_rules:true})).status,503);
});
test('complete flow: anonymous start, match, status, send, read, next, end',async()=>{
 const {handler,state}=await init();
 const started=await request(handler,{action:'start',adult:true,agree_rules:true});assert.equal(started.status,200);
 const {token}=await started.json();assert.match(token,/^[a-f0-9]{64}$/);
 assert.equal(state.sessions.size,1);
 let response=await request(handler,{action:'match',token});assert.equal(response.status,200);assert.equal((await response.json()).room_id,ROOM);
 response=await request(handler,{action:'state',token});assert.equal((await response.json()).state,'connected');
 response=await request(handler,{action:'send',token,room_id:ROOM,body:'Hello'});assert.equal(response.status,200);assert.equal((await response.json()).id,1);
 response=await request(handler,{action:'messages',token,room_id:ROOM,after_id:0});assert.equal(response.status,200);
 assert.deepEqual((await response.json()).messages.map(m=>m.body),['Hello']);
 response=await request(handler,{action:'leave',token,end:false});assert.equal(response.status,200);
 response=await request(handler,{action:'leave',token,end:true});assert.equal(response.status,200);
 assert.equal(state.revoked,true);
 assert.deepEqual(state.rpcCalls.map(x=>x.name),['public_chat_begin','public_chat_match','public_chat_state','public_chat_safe_insert_v2','public_chat_read','public_chat_leave','public_chat_leave']);
});
test('stolen token from a different IP cannot access session',async()=>{
 const {handler}=await init();const {token}=await (await request(handler,{action:'start',adult:true,agree_rules:true})).json();
 assert.equal((await request(handler,{action:'state',token},{ip:'c'.repeat(64)})).status,401);
});
test('sender cannot read an arbitrary room or submit non-string messages',async()=>{
 const {handler}=await init();const {token}=await (await request(handler,{action:'start',adult:true,agree_rules:true})).json();
 assert.equal((await request(handler,{action:'messages',token,room_id:'44444444-4444-4444-8444-444444444444',after_id:0})).status,403);
 assert.equal((await request(handler,{action:'send',token,room_id:ROOM,body:{value:'hi'}})).status,400);
});
test('minor disclosure triggers revocation, not saved delivery',async()=>{
 const {handler,state}=await init();const {token}=await (await request(handler,{action:'start',adult:true,agree_rules:true})).json();
 const res=await request(handler,{action:'send',token,room_id:ROOM,body:'I’m 16'});
 assert.equal(res.status,403);assert.equal(state.messages.length,0);
 assert.ok(state.rpcCalls.some(x=>x.name==='public_chat_revoke_for_safety'));
 assert.ok(state.rpcCalls.some(x=>x.name==='public_chat_set_ip_ban'));
});
