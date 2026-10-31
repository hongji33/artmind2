// Local-only preferences; no changes to student submissions or Firestore rules.
export function progressKey(uid,classId){return uid&&classId?'artmind-viewed-v1:'+encodeURIComponent(classId)+':'+encodeURIComponent(uid):null}
export function readViewed(storage,key){try{const ids=JSON.parse(key?storage.getItem(key)||'[]':'[]');return new Set(Array.isArray(ids)?ids.filter(x=>typeof x==='string').slice(-1000):[])}catch{return new Set()}}
export function saveViewed(storage,key,ids){if(!key)return false;try{storage.setItem(key,JSON.stringify([...ids].slice(-1000)));return true}catch{return false}}
export const studioZones=[
 {id:'atelier',number:'01',title:'드로잉 아틀리에',subtitle:'손끝에서 시작되는 상상',color:'#b47b65',motif:'drawing'},
 {id:'light',number:'02',title:'색과 빛 실험실',subtitle:'색을 섞고, 빛을 발견하다',color:'#72918a',motif:'spectrum'},
 {id:'digital',number:'03',title:'디지털 상상실',subtitle:'기술과 아이디어의 만남',color:'#8a80a3',motif:'digital'},
 {id:'culture',number:'04',title:'미술문화 라운지',subtitle:'작가와 세상, 그리고 나의 미래',color:'#9f8b5c',motif:'culture'}
];
const artclass=(tab,sub)=>'https://hongji33.github.io/artclass/?tab='+tab+(sub?'&sub='+sub:'');
export const studioActivities=[
 {id:'draw',zone:'atelier',title:'자유 그리기·색칠',description:'사진 위에 그리거나 나만의 그림을 완성해요.',url:artclass('play','draw')},
 {id:'materials',zone:'atelier',title:'미술 재료',description:'파스텔부터 클레이까지, 재료의 가능성을 찾아요.',url:artclass('materials')},
 {id:'color',zone:'light',title:'색채 이론 놀이',description:'색상환과 배색으로 나만의 색을 발견해요.',url:artclass('play','color')},
 {id:'value',zone:'light',title:'명암 놀이',description:'빛의 방향을 바꾸고 입체의 비밀을 찾아요.',url:artclass('play','value')},
 {id:'comp',zone:'light',title:'보색 놀이',description:'반대되는 색으로 특별한 시각 효과를 만들어요.',url:artclass('play','comp')},
 {id:'ai',zone:'digital',title:'AI 미술 체험',description:'프롬프트를 설계하고 AI와 상상해요.',note:'외부 무료 AI의 상태에 따라 생성이 지연될 수 있어요.',url:artclass('ai')},
 {id:'arthistory',zone:'digital',title:'미술사 탐험',description:'시대와 작품을 만나는 미술사 여행을 떠나요.',url:'https://hongji33.github.io/arthistory/'},
 {id:'artist',zone:'culture',title:'추천 화가·디자이너',description:'거장의 작품을 감상하고 미술 퀴즈에 도전해요.',url:artclass('artist')},
 {id:'expo',zone:'culture',title:'전시회 정보',description:'지금 만날 수 있는 전시와 미술관을 찾아요.',url:artclass('expo')},
 {id:'market',zone:'culture',title:'현재 미술시장',description:'작품의 가치와 미술시장의 이야기를 알아봐요.',url:artclass('market')},
 {id:'school',zone:'culture',title:'고등학교·대학 정보',description:'미술 전공과 학교를 탐색하며 미래를 그려요.',url:artclass('school')},
 {id:'job',zone:'culture',title:'미술 관련 직업',description:'나의 관심을 연결해 새로운 직업을 상상해요.',url:artclass('job')}
];
// Both apps are hosted on the same origin. The launcher selects the original
// app's existing menu without requiring write access to its repository.
export function activityHref(activity){return activity.url.startsWith('https://hongji33.github.io/artclass/')?'./activity.html?activity='+encodeURIComponent(activity.id):activity.url}
