# Render 배포 가이드

## 📋 배포 전 준비사항

### 1. Git 저장소 설정 (필수)
Render는 GitHub, GitLab, Bitbucket을 통해 배포합니다.

```bash
# Git 저장소 초기화 (아직 안했다면)
git init

# .gitignore 확인 (중요 파일 제외)
# .gitignore에 이미 설정됨:
# - node_modules/
# - database.db
# - uploads/
# - .env

# 모든 파일 추가
git add .

# 첫 커밋 (또는 업데이트)
git commit -m "Prepare for Render deployment"

# GitHub 저장소 생성 후 연결
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### 2. Render 계정 생성
1. [Render.com](https://render.com) 접속
2. GitHub 계정으로 로그인
3. GitHub 저장소 연동 승인

---

## 🚀 Render 배포 단계

### Step 1: 새 Web Service 생성

1. Render 대시보드에서 **"New +"** 클릭
2. **"Web Service"** 선택
3. GitHub 저장소 연결 및 선택

### Step 2: 서비스 설정

#### 기본 설정
- **Name**: `danchu-app` (또는 원하는 이름)
- **Region**: `Singapore` (또는 가장 가까운 지역)
- **Branch**: `main` (또는 사용하는 브랜치)

#### 빌드 및 시작 명령어
- **Runtime**: `Node`
- **Build Command**: 
  ```bash
  npm install
  ```
- **Start Command**: 
  ```bash
  node server.js
  ```

#### 환경 변수 설정
**Environment Variables** 섹션에서 다음 변수 추가:

```
PORT=3000
JWT_SECRET=your-strong-secret-key-change-this-in-production
NODE_ENV=production
```

**⚠️ 중요**: `JWT_SECRET`는 반드시 강력한 랜덤 문자열로 변경하세요!
- 예: `openssl rand -hex 32` 명령어로 생성 가능

#### 인스턴스 타입
- **Free**: 무료 플랜 (최소한의 리소스)
- **Starter**: 유료 플랜 (더 안정적)

### Step 3: 고급 설정 (Advanced)

#### 디스크 설정
⚠️ **중요**: Render의 무료 플랜은 파일 시스템이 영구적이지 않을 수 있습니다.
- SQLite 데이터베이스 파일 (`database.db`)
- 업로드된 이미지 (`uploads/`)

**해결 방법**:
1. **Persistent Disk** 사용 (유료 플랜 필요)
2. 또는 외부 스토리지 사용 (AWS S3, Cloudinary 등) - 추후 마이그레이션 권장

#### 헬스 체크 (Health Check)
선택사항:
- **Health Check Path**: `/` (또는 비워둠)

### Step 4: 배포 실행

1. **"Create Web Service"** 클릭
2. 배포 로그 확인 (빌드 과정 모니터링)
3. 배포 완료 후 URL 확인: `https://your-app-name.onrender.com`

---

## 🔧 배포 후 설정

### 1. 환경 변수 확인
Render 대시보드 → **Environment** 탭에서 환경 변수가 제대로 설정되었는지 확인

### 2. 로그 확인
Render 대시보드 → **Logs** 탭에서 서버 로그 확인
- 서버가 정상적으로 시작되었는지 확인
- 에러가 있는지 확인

### 3. API 테스트
브라우저에서 접속하여 테스트:
- `https://your-app-name.onrender.com` - 메인 페이지
- `https://your-app-name.onrender.com/api/images` - API 테스트 (인증 필요)

---

## ⚠️ 주의사항 및 제한사항

### 1. SQLite 데이터베이스
**문제**: Render의 무료 플랜에서는 파일 시스템이 영구적이지 않을 수 있음

**임시 해결책**:
- 무료 플랜에서는 데이터가 손실될 수 있음
- 테스트용으로만 사용 권장

**권장 해결책**:
- PostgreSQL 데이터베이스로 마이그레이션 (Render의 무료 PostgreSQL 사용 가능)
- 또는 Render의 Persistent Disk 사용 (유료)

### 2. 업로드된 이미지
**문제**: `uploads/` 디렉토리도 영구적이지 않을 수 있음

**해결책**:
- 외부 스토리지 사용 (AWS S3, Cloudinary, Imgur 등)
- 또는 Render의 Persistent Disk 사용 (유료)

### 3. 무료 플랜 제한
- 서버가 15분 동안 요청이 없으면 자동으로 sleep 상태
- 첫 요청 시 약 30초 정도 지연 가능 (cold start)
- 월 트래픽 제한: 750GB

### 4. 포트 설정
- Render는 자동으로 `PORT` 환경 변수를 제공
- `server.js`에서 이미 `process.env.PORT || 3000`로 설정되어 있음 ✅

---

## 🔄 PostgreSQL 마이그레이션 (권장)

Render의 무료 PostgreSQL을 사용하면 데이터베이스 문제를 해결할 수 있습니다.

### 1. Render에서 PostgreSQL 데이터베이스 생성
1. Render 대시보드 → **"New +"** → **"PostgreSQL"**
2. 이름 설정 후 생성
3. **Internal Database URL** 복사

### 2. 환경 변수 추가
Web Service의 환경 변수에 추가:
```
DATABASE_URL=postgresql://...
```

### 3. 코드 수정 (별도 작업 필요)
- `server.js`에서 SQLite 대신 PostgreSQL 사용하도록 수정
- `pg` 패키지 사용

**참고**: 현재 코드는 SQLite 기반이므로, PostgreSQL 마이그레이션은 별도 작업이 필요합니다.

---

## 📝 배포 체크리스트

배포 전:
- [ ] Git 저장소에 코드 푸시 완료
- [ ] `.gitignore`에 중요 파일 제외 확인
- [ ] `package.json`에 모든 의존성 정의 확인
- [ ] `server.js`에서 포트 설정 확인 (`process.env.PORT`)

Render 설정:
- [ ] Web Service 생성
- [ ] GitHub 저장소 연결
- [ ] Build Command: `npm install`
- [ ] Start Command: `node server.js`
- [ ] 환경 변수 설정:
  - [ ] `PORT=3000`
  - [ ] `JWT_SECRET` (강력한 값으로 변경)
  - [ ] `NODE_ENV=production`

배포 후:
- [ ] 서버 로그 확인 (에러 없음)
- [ ] 웹사이트 접속 테스트
- [ ] 회원가입/로그인 테스트
- [ ] 이미지 업로드 테스트
- [ ] API 엔드포인트 테스트

---

## 🐛 문제 해결

### 배포 실패
1. **로그 확인**: Render 대시보드 → Logs 탭
2. **의존성 문제**: `package.json` 확인
3. **포트 문제**: `PORT` 환경 변수 확인
4. **빌드 오류**: Build Command 확인

### 서버 시작 실패
1. **로그 확인**: 에러 메시지 확인
2. **환경 변수**: `JWT_SECRET` 설정 확인
3. **포트**: `process.env.PORT` 사용 확인

### 데이터 손실
- 무료 플랜 사용 시 정기적인 백업 권장
- 또는 PostgreSQL/외부 스토리지로 마이그레이션

---

## 📞 추가 리소스

- [Render 공식 문서](https://render.com/docs)
- [Node.js 배포 가이드](https://render.com/docs/deploy-node)
- [PostgreSQL 가이드](https://render.com/docs/databases)

