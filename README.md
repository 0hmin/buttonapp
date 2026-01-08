# 단추 앱 서버 배포 가이드

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정 (선택사항)
`.env` 파일을 생성하여 JWT_SECRET을 설정할 수 있습니다:
```
JWT_SECRET=your-secret-key-here
```

### 3. 서버 실행
```bash
npm start
```

개발 모드 (nodemon 사용):
```bash
npm run dev
```

서버는 기본적으로 포트 3000에서 실행됩니다.

## Render 배포

1. Render에 새 Web Service 생성
2. GitHub 저장소 연결
3. 빌드 명령: `npm install`
4. 시작 명령: `npm start`
5. 환경 변수 설정 (선택사항):
   - `JWT_SECRET`: JWT 토큰 시크릿 키
   - `PORT`: 포트 번호 (Render가 자동 설정)

## 데이터베이스

SQLite 데이터베이스 (`database.db`)가 자동으로 생성됩니다.
- Render의 경우 영구 파일 시스템이 필요합니다.
- 프로덕션에서는 PostgreSQL 사용을 권장합니다.

## API 엔드포인트

- `POST /api/signup` - 회원가입
- `POST /api/login` - 로그인
- `POST /api/images/upload` - 이미지 업로드 (인증 필요)
- `GET /api/images` - 이미지 목록 조회 (인증 필요)
- `POST /api/buttons` - 단추 추가 (인증 필요)
- `GET /api/images/:imageId/buttons` - 이미지의 단추 목록 (인증 필요)
- `GET /api/users/buttons` - 사용자가 추가한 단추 목록 (인증 필요)

## 주의사항

- 업로드된 이미지는 `uploads/` 디렉토리에 저장됩니다.
- `.gitignore`에 `uploads/`, `database.db`가 포함되어 있어 Git에 커밋되지 않습니다.
- 프로덕션 환경에서는 적절한 이미지 저장소(AWS S3 등) 사용을 권장합니다.


