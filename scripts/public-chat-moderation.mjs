#!/usr/bin/env node
// Trusted-operator CLI. The service-role key must never be used in a browser.
// queue: list pending reports; review: manually dismiss, revoke, or revoke+ban.
const args=process.argv.slice(2);
const help=()=>console.log('Usage:\n  node scripts/public-chat-moderation.mjs queue [limit:1..50]\n  node scripts/public-chat-moderation.mjs review <report-id> <dismiss|revoke|revoke_ban> <operator-ref> --confirm');
if(!args.length||args.includes('--help')||args.includes('-h')){help();process.exit(0);}
const [command,...rest]=args;
const number=value=>/^\d+$/.test(String(value||''))&&Number.isSafeInteger(Number(value))?Number(value):null;
let rpc,params;
if(command==='queue'){
 const limit=rest.length?number(rest[0]):25;
 if(rest.length>1||limit===null||limit<1||limit>50){help();process.exit(2);}
 rpc='public_chat_moderation_queue';params={p_limit:limit};
}else if(command==='review'){
 const [idText,action,operator,confirm]=rest;
 const id=number(idText);
 if(rest.length!==4||id===null||id<=0||!['dismiss','revoke','revoke_ban'].includes(action)||
    !/^[a-zA-Z0-9_-]{3,64}$/.test(operator||'')||confirm!=='--confirm'){
   console.error('Review requires a valid report ID, action, operator reference and --confirm.');
   help();process.exit(2);
 }
 rpc='public_chat_review_report';
 params={p_report_id:id,p_action:action,p_reviewer_ref:operator};
}else{help();process.exit(2);}
const url=process.env.SUPABASE_URL||'';
const key=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
let base;
try{base=new URL(url);if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw Error();}
catch{console.error('Set SUPABASE_URL to the trusted HTTPS Supabase project URL.');process.exit(2);}
if(!key||key.length<32){console.error('Set SUPABASE_SERVICE_ROLE_KEY locally. Never put it in a website or share it.');process.exit(2);}
try{
 const endpoint=new URL('/rest/v1/rpc/'+rpc,base);
 const res=await fetch(endpoint,{method:'POST',headers:{'apikey':key,'authorization':'Bearer '+key,'content-type':'application/json'},body:JSON.stringify(params),signal:AbortSignal.timeout(15000)});
 const json=await res.json().catch(()=>null);
 if(!res.ok){console.error('Moderation request failed (HTTP '+res.status+'). Check operator permissions and database migration.');process.exitCode=1;}
 else if(command==='review'&&json!==true){console.error('Report was already resolved or is unavailable.');process.exitCode=1;}
 else console.log(JSON.stringify(command==='queue'?json:{ok:true,report_id:params.p_report_id,action:params.p_action},null,2));
}catch(error){
 console.error('Moderation request could not complete: '+(error instanceof Error?error.name:'network error')+'.');
 process.exitCode=1;
}
