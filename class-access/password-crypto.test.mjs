import test from 'node:test';import assert from 'node:assert/strict';import {pbkdf2Sync} from 'node:crypto';
import {derivePasswordProof,validClassId} from './password-crypto.mjs';
test('Web Crypto proof matches Node PBKDF2 including Korean and Unicode passwords',async()=>{
 for(const password of ['sample-class-pass','우리 반 미술🌷2026']){const salt='0123456789abcdef0123456789abcdef';assert.equal(await derivePasswordProof(password,salt),pbkdf2Sync(password,Buffer.from(salt,'hex'),210000,32,'sha256').toString('hex'))}
});
test('different salts and incorrect passwords produce different credentials',async()=>{const salt='0123456789abcdef0123456789abcdef';assert.notEqual(await derivePasswordProof('correct-password',salt),await derivePasswordProof('incorrect-password',salt));assert.notEqual(await derivePasswordProof('correct-password',salt),await derivePasswordProof('correct-password','11111111111111111111111111111111'))});
test('invalid parameters are rejected before costly derivation',async()=>{for(const args of [['short','0'.repeat(32)],['valid-password','garbage'],['valid-password','0'.repeat(32),1]])await assert.rejects(()=>derivePasswordProof(...args));for(const id of ['1-1','2-20','3-10'])assert.ok(validClassId(id));for(const id of ['9-1','1-0','1-21','1-1/x'])assert.ok(!validClassId(id))});
