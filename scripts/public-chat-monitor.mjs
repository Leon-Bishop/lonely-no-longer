#!/usr/bin/env node
// Read-only aggregate monitoring. Run from a trusted staff environment only.
// No raw messages, session tokens or hashed IPs are printed.
import assert from 'node:assert/strict';
const origin=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const key=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
if(!origin||!key){console.error('Missing trusted SUPABASE_URL or service-role credential.');process.exit(2)}
const url=new URL(origin);
assert.equal(url.protocol,'https:','Monitoring requires HTTPS');
assert.equal(url.pathname,'/','Expected a Supabase project base URL');
const res=await fetch(origin+'/rest/v1/rpc/public_chat_operational_metrics',{
 method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
 headers:{'apikey':key,'authorization':'Bearer '+key,'content-type':'application/json'},
 body:'{}'
});
if(!res.ok){console.error('Metrics request failed with HTTP',res.status);process.exit(2)}
const raw=await res.json();
const names=['pending_reports','urgent_pending_reports','oldest_pending_age_seconds','safety_incidents_last_hour','open_rooms','waiting_sessions'];
const safe={captured_at:raw?.captured_at||null};
for(const name of names){
 if(!Number.isSafeInteger(raw?.[name])||raw[name]<0){console.error('Invalid metrics response');process.exit(2)}
 safe[name]=raw[name];
}
console.log(JSON.stringify(safe,null,2));
if(safe.urgent_pending_reports>0){
 console.error('ALERT: urgent safeguarding reports require immediate trained staff assessment.');
 process.exitCode=1;
}else if(safe.oldest_pending_age_seconds>3600){
 console.error('ALERT: at least one report is older than 60 minutes. Investigate the queue.');
 process.exitCode=1;
}
