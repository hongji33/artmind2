# 서비스 운영자 최초 설정

교사 사용 흐름에는 Firebase 콘솔이나 UID 등록이 없습니다. 새 교사는 이메일 계정을 만들고 자신의 자료 공간만 관리합니다. 다음 두 항목은 서비스 운영 권한으로 한 번 설치해야 합니다.

1. Firebase Authentication에서 이메일/비밀번호 제공자를 활성화합니다. 익명 제공자는 학생 로그인에 계속 사용하므로 유지합니다. 공개된 클라이언트 키나 GitHub 배포 권한만으로 이 설정을 바꿀 수 없습니다.
2. 새 전체 `firestore.rules`를 적용합니다. 교사 프로필/자기 자료 공간, 새 학생 입장, 기존 자료 읽기·표시 관리 권한을 포함합니다. 기존 규칙을 먼저 백업합니다. 인증 제공자와 규칙을 준비한 뒤 실제 계정·교사 간 차단·학생 입장을 검사하고 UI를 배포합니다.

현재 ChatGPT 작업 환경에는 Firebase 관리자 자격·구글 클라우드 배포 권한이 없습니다. 따라서 위 두 항목을 자동 설치한 상태가 아닙니다. 서비스 계정 키·사용자 비밀번호를 공개 저장소나 채팅에 올리지 않습니다. 운영 권한이 제공되지 않으면 운영자 본인 또는 설치 담당자가 이 두 항목을 한 번 수행해야 합니다. 각 교사가 할 작업은 아닙니다.

## 기존 데이터 보존

- 기존 `artmind2_exhibits`, 학급 비밀번호, 승인 회원, 수업 파일은 삭제하지 않습니다.
- 기존 교사 기기의 익명 계정을 `linkWithCredential`로 이메일 계정에 연결해 UID를 유지합니다. 기존 `artmind2_teachers` 권한을 그대로 읽어 이전 반과 작품을 표시합니다.
- 새 교사 반과 작품은 `artmind2_spaces/{교사UID}` 아래에 저장합니다. 교사 자기 계정으로만 설정/관리하고 학생은 승인 회원의 teacherId와 classId 범위로 접근합니다.
- 기존 반 공유 링크는 그대로 작동합니다. 새 반은 관리자 화면이 만드는 교사별 학생 링크를 사용합니다.
- 작품 숨김은 표시 관리입니다. 같은 반 사용자의 원래 읽기 권한은 유지하며, 교사가 숨긴 작품을 학생이 다시 전시하도록 hidden 값을 바꿀 수는 없습니다.

## 검증

```sh
node --test tests/workspace_paths.test.mjs class-access/password-crypto.test.mjs tests/layout.test.mjs
python tests/teacher_entry.py
python tests/scoped_students.py
python tests/class_entry.py
python tests/lesson_entry.py
python tests/clean_session.py
python tests/browser_test.py
```

브라우저 검사는 Firebase를 모의합니다. 실제 이메일 서비스·운영 권한·학교 30대 접속 검증과 구분합니다. 에뮬레이터용 기존/교사별 보안 규칙 검사도 작성했습니다.

```sh
cd class-access
npm ci
npx --yes firebase-tools@14.22.0 emulators:exec --project demo-artmind-free --config emulator.json --only firestore 'npm run test:rules'
```

에뮬레이터 다운로드가 이 작업 환경의 네트워크 정책에 막혀 규칙 실행 검사는 아직 수행하지 못했습니다. 설치 전에는 준비된 코드를 운영 완료로 간주하지 않습니다.

## 개인번호 계정 추가

개인번호·작성 복원을 배포하려면 최신 Firestore 및 Realtime Database 규칙을 모두 적용합니다. 이전 갤러리 규칙 게시와 별도입니다. [개인번호 설치 안내](PERSONAL_ACCOUNTS.md)를 따릅니다. 교사가 학생의 원문 번호를 확인할 수 있는 기능이므로 해당 기록은 담당 교사 전용 경로에 보관합니다.
