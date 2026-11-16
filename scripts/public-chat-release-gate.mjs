#!/usr/bin/env node
// Read-only procedural checklist. Passing this script is NOT a security or legal certification.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const file=process.argv[2]||resolve(root,'ops/release-approval-template.json');
const input=JSON.parse(readFileSync(file,'utf8'));
const approvals=input?.approvals;
if(!approvals||typeof approvals!=='object'){throw Error('Invalid release approval file')}
let pending=0;
for(const [name,record] of Object.entries(approvals)){
 const ok=record?.approved===true&&typeof record?.approver==='string'&&record.approver.trim().length>=3&&typeof record?.evidence==='string'&&record.evidence.trim().length>=8;
 console.log((ok?'REVIEWED':'BLOCKED')+' '+name);
 if(!ok)pending++;
}
if(Object.keys(approvals).length<10){throw Error('Release checklist incomplete')}
if(pending){console.error('No release approval: '+pending+' required sign-offs are missing or incomplete.');process.exitCode=1}
else{console.log('All listed approvals have entries; independently verify all evidence and human decisions before release.')}
