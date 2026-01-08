# GitHub Username 확인 방법

## ❌ Username에 이메일 쓰면 안 됩니다!

터미널에서 `git push` 할 때:
- ✅ **Username**: GitHub **사용자명** (이메일 아님!)
- ✅ **Password**: Personal Access Token

---

## 🔍 GitHub 사용자명 확인 방법

### 방법 1: GitHub 웹사이트에서 확인
1. [GitHub.com](https://github.com) 로그인
2. 오른쪽 위 **프로필 아이콘** 클릭
3. 프로필 페이지로 이동
4. URL 확인: `https://github.com/여기가사용자명`
   - 예: `https://github.com/john-doe` → 사용자명은 `john-doe`
5. 또는 프로필 페이지 상단의 **@사용자명** 확인

### 방법 2: 계정 설정에서 확인
1. GitHub 로그인
2. 프로필 아이콘 → **Settings**
3. 왼쪽 메뉴 맨 위 **Profile**
4. **Public profile** 섹션에서 **Username** 확인

### 방법 3: 저장소 URL에서 확인
GitHub 저장소 URL: `https://github.com/USERNAME/REPO-NAME`
- `USERNAME` 부분이 사용자명

---

## 📝 예시

### ✅ 올바른 예시:
```
Username: john-doe
Password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### ❌ 잘못된 예시:
```
Username: john@email.com  ← 이메일이 아님!
Password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 💡 GitHub Desktop 사용 시

GitHub Desktop을 사용하면:
- 브라우저에서 로그인 (이메일 가능)
- 터미널에서 username을 입력할 필요 없음
- 더 쉬움!

---

## 🔐 정리

| 항목 | 입력할 것 | 예시 |
|------|----------|------|
| **Username** | GitHub 사용자명 | `john-doe` |
| **Password** | Personal Access Token | `ghp_xxxxxxxxx...` |
| **이메일** | 사용 안 함 | ❌ 입력하지 않음 |

---

## 🎯 빠른 확인

자신의 GitHub 사용자명을 확인하려면:
1. GitHub.com 로그인
2. 프로필 아이콘 클릭
3. URL에서 `/사용자명` 확인
4. 또는 프로필 페이지에서 `@사용자명` 확인

