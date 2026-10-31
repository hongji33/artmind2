// Resolution-independent illustrated people. No image sheets, network or idle loop.
export const avatarOptions={
 hair:['숏컷','단발','긴 머리','포니테일','곱슬머리','올림머리'],
 outfit:['셔츠와 팬츠','후드와 데님','니트와 팬츠','재킷 셋업','원피스'],
 skin:['#f2c9ac','#dba27c','#b97d59','#80543e'],
 hairColor:['#302923','#624432','#a76d40','#202735'],
 color:['#3e695d','#7093ad','#bb7789','#8b79a2','#bc9654','#394b66']
};
export const avatarLabels={skin:['밝은 살구','따뜻한 베이지','브론즈','깊은 브라운'],hairColor:['흑갈색','밤색','캐러멜','블루 블랙'],color:['포레스트','스카이','로즈','라벤더','샌드','네이비']};
export const defaultAppearance={hair:1,outfit:3,skin:0,hairColor:0,color:0};
export function normalizeAppearance(value={}){return Object.fromEntries(Object.entries(defaultAppearance).map(([k,v])=>[k,Number.isInteger(value?.[k])&&value[k]>=0&&value[k]<avatarOptions[k].length?value[k]:v]))}
export function drawPerson(ctx,{x,y,scale=1,appearance=defaultAppearance,phase=0,walking=false,seated=false,facing=1,back=false}){
 const a=normalizeAppearance(appearance),skin=avatarOptions.skin[a.skin],hair=avatarOptions.hairColor[a.hairColor],cloth=avatarOptions.color[a.color];
 const gait=walking&&!seated?Math.sin(phase):0,bob=walking&&!seated?Math.abs(Math.sin(phase))*2:0;
 ctx.save();ctx.translate(x,y);ctx.scale(scale*facing,scale);ctx.lineCap='round';ctx.lineJoin='round';
 const ellipse=(x,y,rx,ry,fill)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()};
 const shape=(points,fill,stroke)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}};
 const limb=(points,color,width)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke()};
 ellipse(0,1,23,seated?5:6,'#18221e28');ctx.translate(0,-bob);
 const hip=seated?-42:-78,torso=seated?41:0,legColor=a.outfit===1?'#526b81':a.outfit===3?'#3c4248':'#424749';
 // Opposite knee/foot travel, with a planted heel and a lifted returning foot.
 for(const side of [-1,1]){const stride=gait*side;const hx=side*8;
  const knee=seated?[hx+17,-26]:[hx+stride*8,-41-Math.max(0,stride)*4];
  const foot=seated?[hx+22,-5]:[hx+stride*14,-6-Math.max(0,-stride)*7];
  limb([[hx,hip],knee,foot],legColor,12);
  ellipse(foot[0]+3,foot[1]+3,10,5,'#eee9dc');ellipse(foot[0]+4,foot[1]+1,9,4,a.outfit===3?'#39332e':'#faf8ef');
 }
 // Hair behind shoulders, neck and individually articulated arms.
 if([2,3].includes(a.hair))shape([[-18,-173+torso],[-22,-114+torso],[20,-111+torso],[18,-172+torso]],hair);
 if(a.hair===3)ellipse(back?-23:20,-148+torso,9,24,hair);
 const shoulder=-133+torso;
 for(const side of [-1,1]){const swing=-gait*side,hand=seated?[side*14+7,-75]:[side*23+swing*10,-85-Math.max(0,swing)*5];
  limb([[side*17,shoulder],[side*23+swing*5,-108+torso],hand],cloth,11);ellipse(hand[0],hand[1]+3,5,7,skin);
 }
 shape([[-16,-138+torso],[16,-138+torso],[21,-85+torso],[-21,-85+torso]],cloth,'#172a2522');
 if(a.outfit===4)shape([[-13,-117+torso],[13,-117+torso],[31,-65+torso],[-29,-65+torso]],cloth);
 // Subtle seams and highlights give the outfit a tailored silhouette.
 limb([[-13,-129+torso],[-10,-92+torso]],'#ffffff20',2);
 if(a.outfit===0){shape([[-8,-140+torso],[0,-127+torso],[8,-140+torso]],'#fff8e7');limb([[0,-126+torso],[0,-90+torso]],'#fff9ec66',1);for(const y of [-119,-109,-99])ellipse(1,y+torso,1,1,'#dccbab')}
 if(a.outfit===1){limb([[-7,-134+torso],[0,-128+torso],[7,-134+torso]],'#d8e0dd',2);limb([[-10,-102+torso],[10,-102+torso]],'#17352b55',2);limb([[-4,-127+torso],[-4,-115+torso]],'#ece8dc',1);limb([[4,-127+torso],[4,-115+torso]],'#ece8dc',1)}
 if(a.outfit===2)for(const y of [-125,-119,-113,-107])limb([[-14,y+torso],[14,y+torso]],'#ffffff16',1);
 if(a.outfit===3){shape([[-8,-139+torso],[8,-139+torso],[7,-89+torso],[-6,-89+torso]],'#eee8dc');shape([[-15,-140+torso],[-4,-128+torso],[-9,-117+torso],[-2,-110+torso],[-17,-90+torso]],cloth);shape([[14,-140+torso],[4,-128+torso],[9,-117+torso],[3,-110+torso],[18,-90+torso]],cloth);ellipse(10,-111+torso,1.4,1.4,'#d6ba7f')}
 limb([[0,-143+torso],[0,-136+torso]],skin,10);
 const hy=-159+torso;ellipse(0,hy,17,22,skin);ellipse(-17,hy+1,3,5,skin);ellipse(17,hy+1,3,5,skin);
 if(!back){
  ellipse(-6,hy+1,1.6,2,'#3d302a');ellipse(7,hy+1,1.6,2,'#3d302a');
  limb([[-9,hy-5],[-4,hy-6]],hair,1.5);limb([[4,hy-6],[10,hy-5]],hair,1.5);
  limb([[1,hy+4],[2,hy+8]],'#ae765b',1);limb([[-3,hy+13],[1,hy+14],[5,hy+12]],'#a16050',1.4);
  ellipse(-10,hy+8,3,1.5,'#d48f7d44');ellipse(11,hy+8,3,1.5,'#d48f7d44');
 }
 if(back){ellipse(0,hy-2,18,23,hair)}
 else{
  shape([[-18,hy+2],[-18,hy-15],[-11,hy-24],[6,hy-25],[18,hy-15],[18,hy-2],[11,hy-10],[3,hy-14],[-9,hy-7]],hair);
  if(a.hair===0)shape([[3,hy-24],[20,hy-20],[16,hy-10],[-5,hy-7]],hair);
  if(a.hair===1){shape([[-18,hy-11],[-20,hy+20],[-12,hy+22],[-13,hy-3]],hair);shape([[14,hy-11],[20,hy+18],[13,hy+21],[13,hy]],hair)}
  if(a.hair===2){limb([[-17,hy-9],[-19,hy+31]],hair,7);limb([[16,hy-9],[20,hy+33]],hair,7)}
 }
 if(a.hair===4)for(let i=0;i<9;i++){const t=Math.PI+i*Math.PI/8;ellipse(Math.cos(t)*16,hy-9+Math.sin(t)*16,7,7,hair)}
 if(a.hair===5){ellipse(5,hy-27,10,9,hair);limb([[-15,hy-12],[13,hy-16]],'#ffffff12',1)}
 ctx.restore();
}
