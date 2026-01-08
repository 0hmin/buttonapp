# GitHub 푸시 명령어

## 📋 현재 상태
- Git 저장소: 초기화됨 ✅
- GitHub 연결: origin/main 연결됨 ✅
- 변경된 파일: 있음
- 새 파일: 사진없을때.png

## 🚀 푸시 명령어 (순서대로 실행)

### 1단계: 변경된 파일 추가
```bash
cd "/Users/ohminyoung/Desktop/단추 복사본"
git add .
```

### 2단계: 커밋 (변경사항 저장)
```bash
git commit -m "배포 준비: PostgreSQL 마이그레이션, UI 개선, 개발자 모드 제거"
```

또는 더 간단하게:
```bash
git commit -m "배포 준비 완료"
```

### 3단계: GitHub에 푸시
```bash
git push origin main
```

---

## 💻 전체 명령어 한 번에 복사

터미널에서 아래 명령어들을 순서대로 실행하세요:

```bash
cd "/Users/ohminyoung/Desktop/단추 복사본"
git add .
git commit -m "배포 준비: PostgreSQL 마이그레이션, UI 개선, 개발자 모드 제거"
git push origin main
```

---

## ⚠️ 주의사항

### 인증이 필요한 경우
`git push` 시 GitHub 로그인을 요구하면:
- **Username**: GitHub 사용자명 (이메일 아님!)
- **Password**: Personal Access Token (비밀번호 아님!)

### Personal Access Token이 없다면
1. GitHub → 프로필 아이콘 → Settings
2. Developer settings → Personal access tokens → Tokens (classic)
3. Generate new token (classic)
4. Note: `Render Deployment`
5. Expiration: 원하는 기간
6. Scopes: `repo` 체크
7. Generate token 클릭
8. 생성된 토큰 복사 (한 번만 보여줌!)
9. 터미널에서 비밀번호 요구 시 이 토큰 붙여넣기

---

## ✅ 푸시 확인

푸시가 성공하면:
```
Enumerating objects: X
Counting objects: 100% (X/X)
Writing objects: 100% (X/X)
To https://github.com/USERNAME/REPO.git
   abc1234..def5678  main -> main
```

이런 메시지가 나오면 성공입니다!

---

## 🔄 다음 단계

GitHub 푸시가 완료되면:
1. Render 대시보드에서 자동 배포 확인
2. 또는 Render에서 수동으로 재배포
3. 배포 완료 후 웹사이트 테스트

