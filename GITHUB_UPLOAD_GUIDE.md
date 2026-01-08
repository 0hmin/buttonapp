# GitHub 업로드 가이드 (초보자용)

## 📋 준비사항

1. **GitHub 계정** 필요 (없으면 먼저 가입: https://github.com)
2. **Git 설치** 확인 (맥은 기본 설치되어 있음)

---

## 🔧 단계별 방법

### Step 1: GitHub에서 새 저장소 만들기

1. [GitHub.com](https://github.com) 접속 후 로그인
2. 오른쪽 위 **"+"** 버튼 클릭 → **"New repository"** 선택
3. 저장소 설정:
   - **Repository name**: `danchu-app` (원하는 이름)
   - **Description**: (선택사항) "Danchu image sharing app"
   - **Public** 또는 **Private** 선택
   - ⚠️ **"Initialize this repository with a README" 체크 하지 않기!** (이미 파일이 있으므로)
4. **"Create repository"** 클릭
5. 생성된 페이지에서 URL 복사 (예: `https://github.com/your-username/danchu-app.git`)

---

### Step 2: 터미널에서 Git 초기화 및 업로드

#### 2-1. 터미널 열기
- 맥: `Command + Space` → "터미널" 입력 → Enter
- 또는 Finder에서 Applications → Utilities → Terminal

#### 2-2. 프로젝트 폴더로 이동
```bash
cd "/Users/ohminyoung/Desktop/단추 복사본"
```

#### 2-3. Git 초기화
```bash
git init
```
→ 결과: "Initialized empty Git repository..."

#### 2-4. 모든 파일 추가
```bash
git add .
```
→ 결과: (아무 출력 없음이 정상)

#### 2-5. 첫 번째 커밋 (저장)
```bash
git commit -m "Initial commit: Prepare for Render deployment"
```
→ 결과: "X files changed..." 등

#### 2-6. GitHub 저장소 연결
```bash
# 아래 YOUR_USERNAME과 YOUR_REPO를 실제 값으로 변경하세요!
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

**예시:**
- 사용자명이 `john`이고 저장소명이 `danchu-app`이면:
```bash
git remote add origin https://github.com/john/danchu-app.git
```

#### 2-7. 브랜치 이름 설정 (필요한 경우)
```bash
git branch -M main
```

#### 2-8. GitHub에 업로드
```bash
git push -u origin main
```

**중요:** 처음 업로드할 때 GitHub 로그인을 요구할 수 있습니다.
- GitHub Username 입력
- **Personal Access Token (PAT)** 입력 (비밀번호 대신)

---

### Step 3: GitHub Personal Access Token 만들기 (필요한 경우)

만약 `git push` 시 비밀번호를 요구하면:

1. GitHub → 오른쪽 위 프로필 아이콘 클릭
2. **Settings** 선택
3. 왼쪽 메뉴에서 **Developer settings** 선택
4. **Personal access tokens** → **Tokens (classic)** 선택
5. **Generate new token** → **Generate new token (classic)** 클릭
6. 설정:
   - **Note**: `Render Deployment` (아무 이름)
   - **Expiration**: 원하는 기간 (예: 90 days)
   - **Scopes**: `repo` 체크
7. **Generate token** 클릭
8. 생성된 토큰 복사 (한 번만 보여줌!)
9. 터미널에서 비밀번호 요구 시 이 토큰 붙여넣기

---

## 💻 전체 명령어 한 번에 복사

아래 명령어들을 순서대로 실행하세요. `YOUR_USERNAME`과 `YOUR_REPO`만 실제 값으로 변경:

```bash
# 1. 프로젝트 폴더로 이동
cd "/Users/ohminyoung/Desktop/단추 복사본"

# 2. Git 초기화
git init

# 3. 모든 파일 추가
git add .

# 4. 커밋
git commit -m "Initial commit: Prepare for Render deployment"

# 5. GitHub 저장소 연결 (여기서 실제 값으로 변경!)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# 6. 브랜치 이름 설정
git branch -M main

# 7. GitHub에 업로드
git push -u origin main
```

---

## 🐛 문제 해결

### "fatal: remote origin already exists" 에러
이미 origin이 설정되어 있으면:
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

### "Authentication failed" 에러
- Personal Access Token이 필요한 경우
- 위의 "Step 3" 참고하여 토큰 생성

### "Permission denied" 에러
- GitHub 저장소 URL이 올바른지 확인
- 저장소 이름과 사용자명이 정확한지 확인

### 파일이 너무 많아서 업로드 안 됨
- `.gitignore` 파일 확인
- `node_modules/`, `database.db`, `uploads/` 등은 제외되어야 함

---

## ✅ 업로드 확인

1. GitHub 웹사이트에서 저장소 페이지 방문
2. 파일 목록이 보이면 성공!
3. Render에서 이 저장소를 선택할 수 있음

---

## 📝 다음 단계

GitHub 업로드가 완료되면:
1. Render.com 접속
2. New + → Web Service
3. GitHub 저장소 선택
4. 배포 설정 후 Create Web Service

