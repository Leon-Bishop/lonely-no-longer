// Regression tests for fixes identified in the 2026-11-15 safety review.
// Safe to run locally; no network calls, credentials, or production sessions.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isUnder18AgeReply, moderatePublicMessage} from '../../supabase/functions/_shared/public-moderation.ts';

const contextual=(reply,question='How old are you?')=>moderatePublicMessage(reply,question);

test('public backend accepts the ten-digit signed gateway timestamp syntax',()=>{
  const source=readFileSync(new URL('../../supabase/functions/public-chat/index.ts',import.meta.url),'utf8');
  const match=source.match(/if\(!([^\n]+?)\.test\(timestamp\)/);
  assert.ok(match,'could not locate timestamp validation');
  assert.match(match[1], /^\/\^\\d\{10\}\$\/$/);
});
test('all bare ages 1 through 17 are recognized after an age question',()=>{
  for(let age=1;age<=17;age++){
    assert.equal(isUnder18AgeReply(String(age),'How old are you?'),true,'age '+age);
    const result=contextual(String(age));
    assert.equal(result.action,'escalate','age '+age);
    assert.ok(result.reasons.includes('minor_disclosure'),'age '+age);
  }
});
test('ages 18 and above are not misclassified by the contextual age rule',()=>{
  for(const age of [18,19,20,25,45,99]){
    assert.equal(isUnder18AgeReply(String(age),'How old are you?'),false,'age '+age);
  }
});
test('age replies with conventional units or punctuation are blocked',()=>{
  for(const reply of ['17 years old','16 yrs old','15yo','14.',' 13! ','aged 12','only 11']){
    const decision=contextual(reply);
    assert.ok(decision.reasons.includes('minor_disclosure'),JSON.stringify({reply,decision}));
  }
});
test('age questions recognize common wordings and typographic apostrophes',()=>{
  for(const question of ['How old are you?','How old r u?','What is your age?','What’s your age?','Your age?','Ur age?']){
    assert.equal(isUnder18AgeReply('15',question),true,question);
  }
});
test('curly and straight apostrophe age disclosures all escalate',()=>{
  for(const message of ["I'm 16",'I’m 16','I‘m 16','I’m a minor','I’m under 18']){
    const decision=moderatePublicMessage(message);
    assert.equal(decision.action,'escalate',message);
    assert.ok(decision.reasons.includes('minor_disclosure'),message);
  }
});
test('zero-width characters do not evade the curly apostrophe disclosure rule',()=>{
  const decision=moderatePublicMessage('I’\u200bm 16');
  assert.ok(decision.reasons.includes('minor_disclosure'));
});
test('unrelated statements are not treated as contextual age replies',()=>{
  for(const question of ['How is your day?','What did you do yesterday?','Nice to meet you']){
    assert.equal(isUnder18AgeReply('15',question),false,question);
  }
});
test('non-string messages cannot masquerade as contextual age replies',()=>{
  assert.equal(isUnder18AgeReply(15,'How old are you?'),false);
  assert.equal(isUnder18AgeReply('15',{message:'How old are you?'}),false);
});
