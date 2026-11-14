import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate} from './filter.js';
test('allows ordinary chat',()=>assert.equal(evaluate('Anyone watching the match tonight?').allowed,true));
test('blocks external links',()=>assert.equal(evaluate('Visit https://example.com').allowed,false));
test('blocks contact requests',()=>assert.equal(evaluate('my email is x@y.ie').allowed,false));
test('detects crisis language',()=>assert.equal(evaluate('I want to end my life').crisis,true));
test('rejects common grooming phrase',()=>assert.equal(evaluate('keep this secret from your parents').allowed,false));