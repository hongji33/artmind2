import {pbkdf2 as derive,timingSafeEqual,randomBytes,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const pbkdf2=promisify(derive);
export const ITERATIONS=210000;
export function normalizeEntry(data){
 if(!data||typeof data.classId!=='string'||!/^([1-3])-([1-9]|1\d|20)$/.test(String(data.classId||'')))throw Error('invalid-entry');
 const nickname=typeof data.nickname==='string'?data.nickname.trim():'';
 if(!nickname||nickname.length>20||/[\u0000-\u001f]/.test(nickname)||typeof data.password!=='string'||data.password.length<4||data.password.length>128)throw Error('invalid-entry');
 return {classId:data.classId,nickname,password:data.password};
}
export async function hashPassword(password,salt=randomBytes(16).toString('hex')){return {salt,passwordHash:(await pbkdf2(password,Buffer.from(salt,'hex'),ITERATIONS,32,'sha256')).toString('hex'),iterations:ITERATIONS}}
export async function verifyPassword(password,record){
 const valid=record?.enabled===true&&/^[a-f0-9]{32}$/.test(record.salt||'')&&/^[a-f0-9]{64}$/.test(record.passwordHash||'')&&record.iterations===ITERATIONS;
 const salt=valid?record.salt:'0'.repeat(32),expected=Buffer.from(valid?record.passwordHash:'0'.repeat(64),'hex');
 const actual=await pbkdf2(password,Buffer.from(salt,'hex'),ITERATIONS,32,'sha256');return valid&&timingSafeEqual(actual,expected);
}
export function attemptKeys(uid,classId,ip){const digest=s=>createHash('sha256').update(s).digest('hex');return [{id:digest('user:'+uid+':'+classId),limit:5},{id:digest('ip:'+String(ip)+':'+classId+':'+digest(uid).slice(0,1)),limit:20}]}
