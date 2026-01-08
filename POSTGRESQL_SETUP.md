# PostgreSQL 설정 가이드

## ✅ 완료된 작업

PostgreSQL 데이터베이스 URL을 받았으므로, SQLite에서 PostgreSQL로 마이그레이션을 완료했습니다.

## 📝 변경 사항

### 1. package.json
- ✅ `sqlite3` → `pg` 패키지로 변경
- ✅ `pg` 패키지 추가됨

### 2. server.js
- ✅ SQLite (`sqlite3`) → PostgreSQL (`pg` Pool)로 변경
- ✅ 모든 데이터베이스 쿼리를 PostgreSQL 문법으로 변경:
  - `db.run()` → `pool.query()` with `RETURNING id`
  - `db.get()` → `pool.query()` with `result.rows[0]`
  - `db.all()` → `pool.query()` with `result.rows`
  - `?` 플레이스홀더 → `$1, $2, $3...` 사용
  - `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
  - `TEXT` → `VARCHAR(255)` or `TEXT`
  - `DATETIME` → `TIMESTAMP`
  - `REAL` → `DOUBLE PRECISION`
- ✅ 콜백 스타일 → async/await로 변경

## 🔧 다음 단계

### 1. 패키지 설치
```bash
npm install
```

이 명령어가 `pg` 패키지를 설치합니다.

### 2. 환경 변수 설정 (Render에서)

Render Web Service 설정:
- **Environment Variable** 추가:
  - Key: `DATABASE_URL`
  - Value: `postgresql://button_app_user:5hzsepBECBjyo1KQ32wV2cGe9PbYlCu7@dpg-d5fid32li9vc738pa520-a.oregon-postgres.render.com/button_app`

또는 Render의 Internal Database URL을 사용하려면:
- Render PostgreSQL 데이터베이스 설정에서 **Internal Database URL** 복사
- Web Service의 환경 변수에 `DATABASE_URL`로 설정

### 3. 서버 시작
```bash
npm start
```

## 📊 데이터베이스 연결 정보

현재 설정된 연결 문자열:
```
postgresql://button_app_user:5hzsepBECBjyo1KQ32wV2cGe9PbYlCu7@dpg-d5fid32li9vc738pa520-a.oregon-postgres.render.com/button_app
```

이것은:
- **Host**: `dpg-d5fid32li9vc738pa520-a.oregon-postgres.render.com`
- **Database**: `button_app`
- **User**: `button_app_user`
- **Password**: `5hzsepBECBjyo1KQ32wV2cGe9PbYlCu7`

## 🔒 보안 참고사항

⚠️ **중요**: 
- 현재 연결 문자열이 코드에 하드코딩되어 있습니다.
- 프로덕션에서는 환경 변수(`DATABASE_URL`)를 사용해야 합니다.
- Render에서 환경 변수로 설정하면 하드코딩된 값보다 우선됩니다.

## ✅ 확인 사항

배포 전 확인:
- [ ] `npm install` 실행 (pg 패키지 설치 확인)
- [ ] Render에서 `DATABASE_URL` 환경 변수 설정
- [ ] 서버 시작 테스트
- [ ] 데이터베이스 연결 확인 (로그에서 "PostgreSQL 데이터베이스에 연결되었습니다." 확인)
- [ ] 테이블 생성 확인 (로그에서 "데이터베이스 테이블 생성 완료" 확인)

## 🎯 Render 배포 시

1. Render Web Service 설정에서:
   - **Environment Variables**에 `DATABASE_URL` 추가
   - 값: 위의 PostgreSQL URL 또는 Render Internal Database URL

2. 배포 후:
   - 로그에서 데이터베이스 연결 확인
   - API 테스트 (회원가입, 로그인, 이미지 업로드 등)

## 🐛 문제 해결

### 연결 오류
- Render PostgreSQL 데이터베이스가 활성화되어 있는지 확인
- Internal Database URL 사용 시 외부 연결이 안 될 수 있음 (Render 내부에서만 접근 가능)
- External Database URL 사용 (Render PostgreSQL 설정에서 확인)

### SSL 오류
- 현재 설정: `ssl: { rejectUnauthorized: false }`
- Render PostgreSQL은 SSL이 필요함

### 테이블 생성 오류
- 이미 테이블이 존재하는 경우 오류가 발생할 수 있음 (정상)
- `CREATE TABLE IF NOT EXISTS`를 사용하여 안전함

