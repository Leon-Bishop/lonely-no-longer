#!/usr/bin/env node
// Optional manual probe: will reject the known production domains and any
// hostname that is not explicitly named as staging or localhost.
// No visitor sessions, messages, or moderation actions are created.
import assert from 'node:assert/strict';
const target=process.env.STAGING_GATEWAY_URL||'';
if(!target){console.error('Set STAGING_GATEWAY_URL to a separate staging gateway URL.');process.exit(2)}
const url=new URL(target);
assert.ok(url.protocol==='https:'||url.hostname==='localhost'||url.hostname==='127.0.0.1','HTTPS is required outside local development');
const host=url.hostname.toLowerCase();
assert.ok(/(^|[.-])(?:staging|stage|test|localhost)([.-]|$)/.test(host)||host==='127.0.0.1','Refusing to probe a non-staging hostname');
assert.ok(!host.includes('lonely-no-longer.pages.dev')&&!host.includes('lonely-no-longer-security.cenkkingir4.workers.dev'),'Known live domains forbidden');
const res=await fetch(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(8000),headers:{'cache-control':'no-store'}});
assert.ok([403,405,503].includes(res.status),'Unexpected staging gateway response '+res.status);
console.log('Staging gateway answered GET with',res.status);
console.log('This does not prove functionality, age safety, CORS or production readiness.');
