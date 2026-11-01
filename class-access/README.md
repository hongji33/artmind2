# 학반 · 닉네임 · 반 비밀번호로 입장

현재 상태: **서버 설치 전**입니다. 현재 연결은 GitHub 파일 배포만 가능하며 Firebase 관리자 자격/서버 배포 권한이 없습니다. GitHub Pages에 HTML을 올리는 것만으로 아래 서버 함수가 설치되지는 않습니다.

## 한 번만 필요한 Firebase 관리자 설치

1. Firebase 프로젝트 `artmind2-2edd4`에서 Cloud Functions 사용 조건/요금제를 확인합니다. Functions 배포에는 결제 연결이 필요할 수 있습니다.
2. 관리자 컴퓨터에 Node.js 22와 Firebase CLI를 설치하고 로그인합니다. 비밀번호나 서비스 계정 키를 공개 저장소/채팅에 올리지 않습니다.
3. 이 디렉터리에서 실행합니다.

```sh
firebase login
npm --prefix functions install
firebase deploy --only functions:joinClass --project artmind2-2edd4
```

4. `firestore-private.fragment.rules`를 기존 보안 규칙 안에 병합합니다. 전체 규칙을 덮어쓰지 않습니다. 특히 기존 광범위 허용 규칙이 비밀번호 설정 문서/시도 제한 문서를 함께 허용하지 않아야 합니다. 학생이 `artmind2_members`를 직접 쓰는 규칙도 허용하지 않습니다. 기존 학급별 작품/좋아요/댓글 규칙은 유지합니다.
5. HTTPS에서 `password-setup.html`을 열어 학반과 새 반 비밀번호를 입력합니다. 이 도구는 로컬에서 임의 salt와 PBKDF2 해시를 생성하며 원문 비밀번호를 전송하지 않습니다. 생성된 JSON 필드를 Firestore의 `artmind2_class_access/{학반}` 문서에 등록합니다. 예: 학반 `3-1`이면 문서 ID `3-1`. 비밀번호는 교사가 별도로 학생에게 안내합니다.

## 학생 입장 동작

학생이 학반/닉네임/반 비밀번호를 입력하면 익명 Firebase UID를 만들고 callable `joinClass`에 POST로 전달합니다. 함수가 비밀번호 해시를 비교하고 해당 UID의 학급 문서를 서버에서 생성합니다. 학생별 UID를 콘솔에 한 명씩 승인할 필요가 없어집니다.

- 틀린 비밀번호·등록되지 않은 반·서버 오류에는 입장시키지 않습니다. 프런트엔드 비밀번호 표나 오프라인 우회 모드를 두지 않습니다.
- 원문 비밀번호는 문서/브라우저 저장소/URL에 저장하지 않습니다. 학생에게 비밀번호 목록을 내려주지 않습니다.
- UID당 실패 시도 제한과 학급/IP의 분산된 시도 제한이 있습니다. 학교 Wi-Fi에 학생 30명이 함께 있어도 한 문서에 모든 요청을 집중시키지 않습니다. 실제 운영 부하/규칙은 서버 설치 후 확인해야 합니다.
- 반 비밀번호는 공동 입장용입니다. 닉네임은 개인 비밀 인증 수단이 아니며 교사별 별도 계정/분리는 이 버전에 포함되지 않습니다.

## 코드 검증

```sh
node functions/class-password.test.mjs
```

올바른 해시/틀린 비밀번호/비활성 반/미등록 반/입력 검증/시도 제한 키를 검사합니다. Firebase 실서버 배포 및 실제 운영 보안 규칙은 현재 검증하지 못했습니다.

## 반영 순서와 세션 한계

이 브랜치의 index.html/metaverse.html은 위 서버와 규칙 설치 후에 배포합니다. 서버가 없는 상태에서는 반 비밀번호 입장이 실패하도록 설계했습니다. 이전 자료 초기화 PR을 먼저 반영하고 이 인증 PR을 검토합니다.

같은 탭에서 수업 → 메타버스는 입장 정보를 이어 받습니다. 비밀번호는 저장하지 않습니다. 다른 학생으로 다시 입장하면 새 익명 UID를 발급합니다. 로그아웃 후 같은 닉네임으로 입장해도 과거 UID의 작품 수정 권한은 복구하지 않으며 기존 전시는 삭제하지 않습니다. 개인별 작품 복구가 필요하면 별도 개인 인증 설계가 필요합니다.

추가 모의 SDK 브라우저 검사:

```sh
python tests/class_entry.py
python tests/lesson_entry.py
python tests/clean_session.py
python tests/browser_test.py
```

실제 서버의 권한 규칙, callable 함수, 학교 네트워크에서 30명 동시 접속은 설치 후 별도로 확인해야 합니다. 개발 환경에서는 Node 24로 단위 검사를 실행했으며 배포 런타임은 Node 22로 지정했습니다.

## Cloud Shell 설치 안내와 에뮬레이터 추가 검사

관리자 설치 순서는 [CLOUD_SHELL.md](CLOUD_SHELL.md)에 정리했습니다. deploy-cloud-shell.sh는 joinClass 함수만 배포하며 요금제·Firestore 규칙·기존 작품을 변경하지 않습니다. Spark에서는 이 함수 설치를 진행하지 않습니다. Blaze 전환은 관리자가 비용 조건을 확인한 뒤 직접 결정합니다.

다음 검사는 실제 프로젝트 대신 demo 프로젝트의 Auth/Firestore/Functions 에뮬레이터를 사용합니다.

```sh
firebase emulators:exec --project demo-artmind-class --config emulator.json --only auth,firestore,functions 'node tests/emulator.mjs'
```

검사 항목: 동시 입장 30명, 회원 문서 생성, 비밀번호 오류, UID 시도 제한, 인증 없는 요청 차단, 비밀번호 해시 문서 직접 열람 차단. tests/emulator.rules는 검사용 최소 규칙이므로 실제 규칙으로 배포하면 안 됩니다.

현재 실행 환경에서는 에뮬레이터 다운로드가 네트워크 정책의 403 응답으로 차단되어 이 추가 검사는 **미실행**입니다. 기존 Node/모의 SDK 검사 통과와 구분해야 합니다.
