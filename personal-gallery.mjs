// Local-only preferences; no changes to student submissions or Firestore rules.
export function progressKey(uid,classId){return uid&&classId?'artmind-viewed-v1:'+encodeURIComponent(classId)+':'+encodeURIComponent(uid):null}
export function readViewed(storage,key){try{const ids=JSON.parse(key?storage.getItem(key)||'[]':'[]');return new Set(Array.isArray(ids)?ids.filter(x=>typeof x==='string').slice(-1000):[])}catch{return new Set()}}
export function saveViewed(storage,key,ids){if(!key)return false;try{storage.setItem(key,JSON.stringify([...ids].slice(-1000)));return true}catch{return false}}
export const studioActivities=[{id:'arthistory',title:'미술사 탐험',description:'시대와 작품을 만나는 미술사 웹앱',url:'https://hongji33.github.io/arthistory/'}];
