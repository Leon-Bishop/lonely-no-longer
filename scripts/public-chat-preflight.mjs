#!/usr/bin/env node
// Read-only checks. No deployment, network connection or changes to configuration.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=path=>readFileSync(resolve(root,path),'utf8');
function check(ok,why){assert.ok(ok,why);console.log('OK:',why)}
const config=read('apps/web/next.config.ts');
check(/output\s*:\s*['"]export['"]/.test(config),'frontend remains static export');
const gitignore=existsSync(resolve(root,'.gitignore'))?read('.gitignore'):'';
check(!/SERVICE_ROLE_KEY\s*=/.test(read('apps/web/lib/api.ts')),'no service role key in shared browser API module');
const frontend=['apps/web/app/chat/page.tsx','apps/web/app/page.tsx','apps/web/app/layout.tsx'].map(read).join('\n');
check(!/SUPABASE_SERVICE_ROLE_KEY|PUBLIC_CHAT_GATEWAY_SECRET|PUBLIC_CHAT_IP_HASH_SECRET/.test(frontend),'no privileged secrets in preview UI');
check(!/fetch\([^)]*supabase\.co\/rest\/v1/.test(frontend),'frontend does not directly query Supabase tables');
check(/!gateway\|\|!adult\|\|!rules/.test(frontend),'chat entry is gated when gateway config or consent is missing');
check(/moderatePublicMessage/.test(read('supabase/functions/public-chat/index.ts')),'server-side moderation remains in public endpoint');
check(/PUBLIC_CHAT_ENABLED/.test(read('cloudflare/public-chat-gateway/worker.js')),'Cloudflare gateway has a release switch');
check(/PUBLIC_CHAT_ENABLED/.test(read('supabase/functions/public-chat/index.ts')),'Supabase backend has a release switch');
check(!/\.env\.local\b/.test(frontend),'frontend does not reference a local secrets path');
console.log('Read-only preflight checks passed. This does not validate live configuration.');
