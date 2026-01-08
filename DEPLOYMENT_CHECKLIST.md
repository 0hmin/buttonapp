# 배포 준비 상태 체크리스트

## ✅ 완료된 항목

### 1. 서버 코드
- ✅ `server.js` - Express 서버 준비됨
- ✅ 포트 설정: `process.env.PORT || 3000`
- ✅ 미들웨어 설정: CORS, JSON, Static 파일 서빙
- ✅ 인증 미들웨어: JWT 토큰 기반
- ✅ 파일 업로드: Multer 설정 완료 (10MB 제한)
- ✅ API 엔드포인트:
  - 회원가입 (`/api/signup`)
  - 로그인 (`/api/login`)
  - 이미지 업로드 (`/api/images/upload`)
  - 이미지 목록 조회 (`/api/images`)
  - 이미지 삭제 (`/api/images/:imageId`)
  - 단추 추가/업데이트 (`/api/buttons`)
  - 단추 목록 조회 (`/api/images/:imageId/buttons`)
  - 사용자 단추 목록 (`/api/users/buttons`)

### 2. 데이터베이스
- ✅ SQLite 데이터베이스 설정
- ✅ 테이블 스키마:
  - `users` - 사용자 정보
  - `images` - 이미지 정보
  - `user_buttons` - 단추 정보
- ✅ 데이터베이스 파일: `database.db` (자동 생성됨)
- ✅ 외래 키 제약 조건 설정

### 3. 프론트엔드
- ✅ `index.html` - 메인 HTML 파일
- ✅ `style.css` - 스타일시트
- ✅ JavaScript 모듈:
  - `api.js` - API 통신
  - `auth.js` - 인증 관련
  - `common.js` - 공통 유틸리티
  - `upload.js` - 업로드 기능
  - `gallery.js` - 갤러리 기능
  - `myButtons.js` - 단추보기 기능
  - `windowUtils.js` - 시간 윈도우 유틸리티
- ✅ API_BASE_URL 자동 설정: `window.location.origin`

### 4. 패키지 의존성
- ✅ `package.json` - 모든 의존성 정의됨
- ✅ 주요 패키지:
  - express
  - cors
  - multer
  - bcrypt
  - jsonwebtoken
  - sqlite3
  - dotenv

### 5. 정적 파일
- ✅ 이미지 파일들 (업로드된 이미지 포함)
- ✅ 업로드 디렉토리: `uploads/`

## ⚠️ 확인/추가 필요 항목

### 1. 환경 변수 설정
- ⚠️ `.env` 파일 없음 (선택사항)
- 현재 기본값 사용 중:
  - `PORT`: 3000 (기본값)
  - `JWT_SECRET`: 'your-secret-key-change-in-production' (기본값)

**권장사항**: 프로덕션 배포 시 `.env` 파일 생성
```env
PORT=3000
JWT_SECRET=your-strong-secret-key-here
```

### 2. 보안 설정
- ⚠️ JWT_SECRET 기본값 사용 중 - 프로덕션에서 반드시 변경 필요
- ⚠️ CORS 설정: 현재 모든 origin 허용 (`app.use(cors())`)

### 3. 파일 업로드
- ✅ `uploads/` 디렉토리 자동 생성
- ✅ 파일 크기 제한: 10MB
- ⚠️ 파일 타입 검증: 이미지 파일만 허용

### 4. 데이터베이스
- ✅ SQLite 파일 자동 생성
- ⚠️ 프로덕션에서는 데이터베이스 백업 계획 필요

### 5. 에러 처리
- ✅ 기본적인 에러 처리 구현됨
- ✅ 로깅 기능 포함

## 배포 전 확인사항

### 필수 체크리스트
1. [ ] `.env` 파일 생성 및 JWT_SECRET 변경 (프로덕션)
2. [ ] `npm install` 실행하여 의존성 설치 확인
3. [ ] `node server.js` 실행하여 서버 시작 확인
4. [ ] 데이터베이스 파일(`database.db`) 생성 확인
5. [ ] `uploads/` 디렉토리 생성 확인
6. [ ] 프론트엔드 파일들이 정적 파일로 서빙되는지 확인
7. [ ] API 엔드포인트 테스트
8. [ ] 인증 플로우 테스트
9. [ ] 이미지 업로드/조회 테스트
10. [ ] 단추 추가/조회 테스트

### 프로덕션 배포 시 추가 확인
1. [ ] 환경 변수 설정 (.env 또는 배포 플랫폼 환경 변수)
2. [ ] 포트 번호 확인 (환경 변수 또는 배포 플랫폼 설정)
3. [ ] 정적 파일 경로 확인
4. [ ] 데이터베이스 파일 권한 확인
5. [ ] 업로드 디렉토리 권한 확인
6. [ ] 로그 파일 관리 설정 (선택사항)
7. [ ] HTTPS 설정 (선택사항)
8. [ ] 도메인 설정 (선택사항)

## 빠른 시작

### 로컬 개발
```bash
# 의존성 설치
npm install

# 개발 서버 실행 (nodemon 사용)
npm run dev

# 또는 프로덕션 모드
npm start
```

### 프로덕션 배포
```bash
# 의존성 설치
npm install --production

# 환경 변수 설정
# .env 파일 생성 또는 환경 변수 설정
PORT=3000
JWT_SECRET=your-strong-secret-key-here

# 서버 시작
npm start
```

## 서버 시작 후 확인

1. 서버가 정상적으로 시작되면:
   ```
   서버가 포트 3000에서 실행 중입니다.
   ```

2. 브라우저에서 접속:
   - `http://localhost:3000` (또는 설정한 포트)

3. API 테스트:
   - `http://localhost:3000/api/images` (인증 필요)

## 문제 해결

### 데이터베이스 오류
- `database.db` 파일이 생성되는지 확인
- 파일 권한 확인

### 파일 업로드 오류
- `uploads/` 디렉토리가 생성되는지 확인
- 디렉토리 쓰기 권한 확인

### 포트 충돌
- 다른 포트 사용: `PORT=3001 npm start`
- 또는 `.env` 파일에서 포트 변경

