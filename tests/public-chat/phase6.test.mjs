import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261115080000_public_chat_monitoring.sql');
const approvals=JSON.parse(read('ops/release-approval-template.json')).approvals;

test('monitoring SQL restricts function to service role',()=>{
 assert.match(sql,/auth\.role\(\)\s*<>\s*'service_role'/);
 assert.match(sql,/revoke all on function public\.public_chat_operational_metrics/);
 assert.match(sql,/grant execute on function public\.public_chat_operational_metrics\(\) to service_role/);
});
test('monitoring aggregates only counts and ages, without exposing messages',()=>{
 assert.match(sql,/pending_reports/);
 assert.match(sql,/urgent_pending_reports/);
 assert.match(sql,/oldest_pending_age_seconds/);
 assert.doesNotMatch(sql,/select\s+(?:msg\.)?body\b/i);
 assert.doesNotMatch(sql,/jsonb_build_object\([^;]*(?:token_hash|ip_hash|message_excerpt)/i);
});
test('default release checklist blocks every one of ten approvals',()=>{
 const entries=Object.values(approvals);
 assert.equal(entries.length,10);
 assert.ok(entries.every(x=>x.approved===false&&x.evidence===''&&x.approver===''));
});
test('release gate fails closed for the unchanged default template',()=>{
 const exe=fileURLToPath(new URL('../../scripts/public-chat-release-gate.mjs',import.meta.url));
 const result=spawnSync(process.execPath,[exe],{encoding:'utf8'});
 assert.equal(result.status,1);
 assert.match(result.stderr,/No release approval/);
});
test('metrics script does not log secrets or read raw chat tables',()=>{
 const monitor=read('scripts/public-chat-monitor.mjs');
 assert.match(monitor,/public_chat_operational_metrics/);
 assert.doesNotMatch(monitor,/console\.log\([^\n]*(?:key|SERVICE_ROLE|token_hash|ip_hash)/);
});
test('incident and rollback instructions are documented',()=>{
 const instructions=read('OPERATIONS_AND_LAUNCH_RUNBOOK.md');
 assert.match(instructions,/rollback procedure/i);
 assert.match(instructions,/DPC/);
 assert.match(instructions,/human go\/no-go/);
});
