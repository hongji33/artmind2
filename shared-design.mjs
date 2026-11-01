export const FABRIC_LIMIT=24000,AVATAR_LIMIT=50000;
export function validSharedImage(value,limit){return typeof value==='string'&&value.length<=limit&&/^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)}
export function normalizeVisual(value){
 const fabric=validSharedImage(value?.fabric,FABRIC_LIMIT)?value.fabric:'',avatar=validSharedImage(value?.avatar,AVATAR_LIMIT)?value.avatar:'';
 return fabric||avatar?{fabric,avatar,fabricScale:Math.max(12,Math.min(48,Math.round(Number(value?.fabricScale)||24)))}:null;
}
export function encodeSharedImage(source,{width=128,height=128,limit=FABRIC_LIMIT}={}){
 for(const factor of [1,.5]){const canvas=document.createElement('canvas');canvas.width=Math.round(width*factor);canvas.height=Math.round(height*factor);const ctx=canvas.getContext('2d'),sw=source.naturalWidth||source.width,sh=source.naturalHeight||source.height,fit=Math.min(canvas.width/sw,canvas.height/sh);ctx.drawImage(source,(canvas.width-sw*fit)/2,(canvas.height-sh*fit)/2,sw*fit,sh*fit);const data=canvas.toDataURL('image/webp',.8);if(validSharedImage(data,limit))return data;}
 throw Error('design-too-large');
}
