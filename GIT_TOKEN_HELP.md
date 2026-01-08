# GitHub Personal Access Token 찾기/만들기 가이드

## 🔍 기존 토큰 찾기

### 방법 1: GitHub에서 확인
1. [GitHub.com](https://github.com) 접속 후 로그인
2. 오른쪽 위 **프로필 아이콘** 클릭
3. **Settings** 선택
4. 왼쪽 메뉴에서 **Developer settings** 클릭
5. **Personal access tokens** → **Tokens (classic)** 선택
6. 기존 토큰 목록 확인
   - ⚠️ **주의**: 토큰 자체는 다시 볼 수 없음 (보안상 이유)
   - 토큰 이름과 만료일만 보임
   - 토큰을 잊어버렸다면 새로 만들어야 함

### 방법 2: 기존 토큰이 작동하는지 테스트
터미널에서 `git push`를 시도해보면:
- 작동하면: 토큰이 이미 저장되어 있거나 아직 유효함
- 비밀번호 요구하면: 새 토큰 필요

---

## 🆕 새 토큰 만들기 (권장)

기존 토큰을 모르겠다면 새로 만드는 것이 가장 빠릅니다.

### Step 1: GitHub에서 토큰 생성
1. [GitHub.com](https://github.com) 접속 후 로그인
2. 오른쪽 위 **프로필 아이콘** 클릭
3. **Settings** 선택
4. 왼쪽 메뉴 맨 아래 **Developer settings** 클릭
5. **Personal access tokens** → **Tokens (classic)** 클릭
6. **Generate new token** → **Generate new token (classic)** 클릭

### Step 2: 토큰 설정
- **Note**: `Render Deployment` (아무 이름이나 괜찮음)
- **Expiration**: 
  - `No expiration` (만료 없음) - 개발용
  - 또는 `90 days` 등 원하는 기간
- **Select scopes**:
  - ✅ **repo** 체크 (이게 가장 중요!)
    - 이걸 체크하면 하위 항목들도 자동으로 체크됨

### Step 3: 토큰 생성 및 복사
1. 맨 아래 **"Generate token"** 버튼 클릭
2. **⚠️ 중요**: 생성된 토큰을 즉시 복사하세요!
   - `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` 형식
   - 이 페이지를 나가면 다시 볼 수 없습니다!
   - 메모장이나 텍스트 에디터에 임시로 붙여넣어 두세요

### Step 4: 터미널에서 사용
```bash
git push -u origin main
```
- Username: GitHub 사용자명 입력
- Password: 방금 복사한 토큰 붙여넣기

---

## 💡 더 쉬운 방법: GitHub Desktop 사용

터미널과 토큰 관리가 어렵다면 **GitHub Desktop**을 사용하는 것을 강력히 권장합니다:

1. **GitHub Desktop 다운로드**: https://desktop.github.com
2. 설치 후 GitHub 계정으로 로그인 (브라우저에서 로그인)
3. 토큰 자동 관리 (매번 입력할 필요 없음)

### GitHub Desktop 사용법:
1. **File** → **Add Local Repository**
2. 프로젝트 폴더 선택: `/Users/ohminyoung/Desktop/단추 복사본`
3. **"Publish repository"** 버튼 클릭
4. 저장소 이름 입력
5. **"Publish repository"** 클릭

✅ 끝! 터미널 명령어나 토큰을 기억할 필요 없습니다.

---

## 🔐 토큰 보관 방법 (보안)

토큰을 안전하게 보관하려면:

### 방법 1: 비밀번호 관리자 사용
- 1Password, LastPass, Bitwarden 등에 저장
- 토큰 이름: "GitHub Render Deployment"

### 방법 2: 메모장에 임시 저장 (주의!)
- 개발 중에만 사용
- **절대 GitHub에 업로드하지 않기** (이미 .gitignore에 .env가 있어서 안전)
- 사용 후 삭제 권장

### 방법 3: Git Credential Helper 사용
토큰을 매번 입력하지 않도록 저장:
```bash
git config --global credential.helper osxkeychain
```
맥에서는 Keychain에 자동 저장됩니다.

---

## ❓ 자주 묻는 질문

### Q: 토큰을 잊어버렸어요
A: 새로 만들어주세요. 여러 개의 토큰이 있어도 괜찮습니다.

### Q: 토큰이 만료되었어요
A: 새 토큰을 만들거나 기존 토큰의 만료일을 연장해주세요.

### Q: 토큰을 매번 입력하기 너무 불편해요
A: 
1. GitHub Desktop 사용 (가장 쉬움)
2. Git Credential Helper 설정
3. 또는 SSH 키 사용 (고급)

### Q: 토큰이 보안에 문제가 되나요?
A: 
- ✅ GitHub 비밀번호보다 안전함 (범위가 제한됨)
- ✅ 만료일 설정 가능
- ✅ 언제든지 삭제 가능
- ⚠️ 하지만 토큰을 다른 사람과 공유하거나 공개하면 안 됨

---

## 🎯 추천 방법

**초보자에게 가장 쉬운 방법:**
1. GitHub Desktop 다운로드 및 설치
2. GitHub 계정으로 로그인
3. 프로젝트 폴더 추가 후 "Publish repository" 클릭
4. 끝! 토큰 걱정 없이 사용 가능

