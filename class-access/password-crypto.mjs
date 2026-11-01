// Public salt parameters are safe to download. The resulting proof is a credential.
export const ITERATIONS=210000;
export function validClassId(value){return typeof value==='string'&&/^([1-3])-([1-9]|1\d|20)$/.test(value)}
export async function derivePasswordProof(password,salt,iterations=ITERATIONS){
 if(typeof password!=='string'||!/^[0-9]{4}$/.test(password)||typeof salt!=='string'||!/^[a-f0-9]{32}$/.test(salt)||iterations!==ITERATIONS)throw Error('invalid-class-entry');
 const bytes=Uint8Array.from(salt.match(/../g),x=>parseInt(x,16));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const result=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes,iterations},key,256);
 return [...new Uint8Array(result)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
