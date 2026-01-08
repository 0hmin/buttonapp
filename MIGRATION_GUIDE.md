# 서버 마이그레이션 가이드

현재 서버 코드와 API 모듈은 작성 완료되었습니다. 하지만 프론트엔드 코드 전체를 API로 마이그레이션하는 것은 큰 작업입니다.

## 완료된 작업

1. ✅ 서버 코드 (`server.js`) 작성
2. ✅ API 통신 모듈 (`api.js`) 작성
3. ✅ `package.json` 및 `.gitignore` 설정
4. ⚠️ `auth.js` 부분 수정 (API 호출로 변경 필요 - 코드 확인 필요)

## 남은 작업

### 1. auth.js 수정 (우선순위: 높음)
- `handleSignup` 함수를 `App.apiSignup` 호출로 변경
- `handleLogin` 함수를 `App.apiLogin` 호출로 변경
- `getCurrentUser` 함수를 API 응답 형식에 맞게 수정

### 2. upload.js 수정
- 이미지 업로드 로직을 `App.apiUploadImage`로 변경
- IndexedDB 저장 대신 서버 API 호출

### 3. gallery.js 수정
- 이미지 로딩을 `App.apiGetImages`로 변경
- 단추 추가를 `App.apiAddButton`로 변경
- 단추 로딩을 `App.apiGetImageButtons`로 변경

### 4. myButtons.js 수정
- 단추 목록 조회를 `App.apiGetUserButtons`로 변경

## 현재 문제점

코드베이스가 클라이언트 사이드(IndexedDB)에 최적화되어 있어, 모든 데이터 접근을 API 호출로 변경하려면 상당한 리팩토링이 필요합니다.

## 권장 사항

1. **점진적 마이그레이션**: 기능별로 하나씩 마이그레이션
2. **하이브리드 접근**: 기존 IndexedDB 코드는 유지하고, 새로운 데이터만 서버로 전송
3. **테스트 환경 구축**: 로컬에서 서버를 실행하여 API가 정상 작동하는지 확인

## 다음 단계

1. 로컬에서 서버 실행 테스트
2. auth.js부터 API 호출로 변경
3. 나머지 모듈 순차적으로 마이그레이션


