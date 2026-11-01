# 관리자 계정에서 한 번만 설치하기

현재 운영 사이트의 로그인 방식은 그대로입니다. 아래 서버·규칙·학급 설정을 마친 뒤 PR #10 화면을 배포합니다.

## 1. 요금제와 관리자 계정 확인

https://console.firebase.google.com/project/artmind2-2edd4/overview

프로젝트 이름이 artmind2-2edd4인지 확인하고 왼쪽 아래 요금제가 Blaze인지 확인합니다. Spark라면 Cloud Functions 배포를 위해 결제 연결이 필요합니다. 사용량에 따라 비용이 생길 수 있으므로 요금제 변경은 선생님이 직접 결정합니다. 예산 알림은 지출 상한이 아닙니다.

## 2. Google Cloud Shell에서 함수 설치

https://console.cloud.google.com/cloudshell/editor?project=artmind2-2edd4

Firebase 관리자와 같은 Google 계정으로 로그인합니다. Cloud Shell 터미널에서 저장소를 받은 뒤 실행합니다. 기존 작업 폴더를 덮어쓰지 않도록 새로운 폴더에서 진행합니다.

```sh
git clone --branch codex/class-password-entry --single-branch https://github.com/hongji33/artmind2.git artmind-class-entry
cd artmind-class-entry/class-access
bash deploy-cloud-shell.sh
```

이 스크립트는 joinClass 함수만 배포합니다. 기존 작품/학생 문서와 Firestore 규칙을 덮어쓰지 않으며 결제도 활성화하지 않습니다. 배포 중 관리자 인증이나 API 활성화 안내가 나오면 해당 Google 화면에서 확인합니다. 오류 시 오류 문구만 전달하고 토큰·비밀번호·서비스 계정 키는 전달하지 않습니다.

## 3. Firestore 규칙 확인

Firebase 콘솔 → Firestore Database → 규칙에서 현재 내용을 먼저 보관합니다. firestore-private.fragment.rules는 전체 규칙이 아니라 추가할 조각입니다. 기존 학급별 작품·좋아요·댓글 규칙은 보존해야 합니다. 넓은 범위의 허용 규칙이 새 비공개 경로도 허용하면 deny 조각만 추가해도 보호되지 않습니다. 기존 규칙을 확인하기 전에는 추측해서 덮어쓰지 않습니다.

## 4. 반별 비밀번호 등록

Cloud Shell에서 이 폴더를 기준으로 다음 명령을 실행합니다.

```sh
python3 -m http.server 8080 --bind 0.0.0.0
```

Cloud Shell의 웹 미리보기 → 포트 8080 미리보기에서 /password-setup.html을 엽니다. 학반(예: 3-1)과 교사가 정한 반 비밀번호를 넣고 설정 JSON을 생성합니다. 원문은 서버에 전송되지 않습니다.

Firebase 콘솔 → Firestore Database → 데이터에서 artmind2_class_access 컬렉션의 3-1 문서에 JSON의 필드를 등록합니다. enabled는 boolean true, iterations는 number 210000, salt와 passwordHash는 string입니다. 다른 반도 같은 방식으로 등록합니다. 다른 학생 문서는 변경하지 않습니다. 미리보기 서버는 Ctrl+C로 종료합니다.

## 5. 운영 화면 적용 전 확인

함수 설치·규칙 확인·한 반 등록을 마친 뒤 실제 SDK로 올바른/틀린 비밀번호와 학급별 작품 접근을 확인합니다. 검증을 마치면 PR #10을 병합·배포합니다. 학생에게는 학반·닉네임·교사가 알려 준 비밀번호만 안내합니다.
