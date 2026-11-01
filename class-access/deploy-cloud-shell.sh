#!/usr/bin/env bash
# Run only in the teacher's authenticated Google Cloud Shell.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if ! command -v gcloud >/dev/null || ! command -v npm >/dev/null; then
  echo 'Google Cloud Shell에서 실행해 주세요.' >&2; exit 1
fi
if [[ -z "$(gcloud auth list --filter=status:ACTIVE --format='value(account)')" ]]; then
  echo 'Cloud Shell에서 프로젝트 관리자 계정에 로그인해 주세요.' >&2; exit 1
fi
# This reads project access; it does not enable billing or change security rules.
gcloud projects describe artmind2-2edd4 --format='value(projectId)' >/dev/null
npm --prefix functions ci --ignore-scripts --no-audit --no-fund
npm --prefix functions test
npx --yes firebase-tools@14.22.0 deploy --only functions:joinClass --project artmind2-2edd4
printf '\n서버 함수 설치 완료. 기존 Firestore 규칙에 비공개 문서 규칙을 병합하고 반 비밀번호를 등록해야 학생이 입장할 수 있습니다.\n'
