export const APP_VERSION='one-gallery-1';
export function validTeacherId(value){return typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value)}
export function exhibitSegments(teacherId,...tail){if(teacherId&&!validTeacherId(teacherId))throw Error('invalid-teacher');return teacherId?['artmind2_spaces',teacherId,'exhibits',...tail]:['artmind2_exhibits',...tail]}
export function classSegments(teacherId,classId,secret=false){if(teacherId&&!validTeacherId(teacherId))throw Error('invalid-teacher');return teacherId?['artmind2_spaces',teacherId,secret?'private_classes':'classes',classId]:[secret?'artmind2_class_access':'artmind2_class_public',classId]}
export function studentLink(base,teacherId,classId,host=''){const url=new URL('./index.html',base);if(teacherId){if(!validTeacherId(teacherId))throw Error('invalid-teacher');url.searchParams.set('teacher',teacherId)}if(!teacherId&&host){if(!validTeacherId(host))throw Error('invalid-host');url.searchParams.set('host',host)}url.searchParams.set('class',classId);url.searchParams.set('v',APP_VERSION);return url.href}

export function galleryLink(base,teacherId,classId,host=''){const url=new URL(studentLink(base,teacherId,classId,host));url.pathname=url.pathname.replace(/index\.html$/,'metaverse.html');return url.href}

export function teacherGalleryLink(base,uid,classId){const url=new URL(galleryLink(base,uid,classId));url.searchParams.set('mode','teacher');return url.href}
