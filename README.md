# 단추 앱 서버 배포 가이드

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일을 생성하여 다음 변수들을 설정합니다:

**필수 환경 변수 (Cloudinary):**
```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**선택 환경 변수:**
```
JWT_SECRET=your-secret-key-here
DATABASE_URL=your-postgresql-connection-string
```

**Cloudinary 계정 생성 방법:**
1. [Cloudinary](https://cloudinary.com/)에 가입
2. Dashboard에서 Cloud Name, API Key, API Secret 확인
3. `.env` 파일에 위 정보 입력

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
5. 환경 변수 설정:
   - **필수**: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (Cloudinary 계정 정보)
   - **선택**: `JWT_SECRET`: JWT 토큰 시크릿 키
   - **선택**: `DATABASE_URL`: PostgreSQL 연결 문자열 (기본값 사용 가능)
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

- **이미지 저장소**: Cloudinary를 사용하여 이미지를 저장합니다. 재배포 시에도 이미지가 유지됩니다.
- 업로드된 이미지는 Cloudinary에 저장되며, 로컬 `uploads/` 디렉토리는 더 이상 사용되지 않습니다.
- `.gitignore`에 `uploads/`, `database.db`가 포함되어 있어 Git에 커밋되지 않습니다.
- Cloudinary 무료 플랜: 25GB 저장 공간, 25GB 월간 대역폭 제공


