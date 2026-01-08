# 시간 윈도우 기반 이미지 업로드 및 노출 시스템

## 개요

이 시스템은 특정 시간 윈도우에 업로드된 이미지를 다음날 특정 시간에만 노출하는 기능을 제공합니다.

## 핵심 규칙

### 1. 업로드 윈도우 (Upload Window)
- **시간**: 매일 오후 12:00 ~ 다음날 오전 06:00
- **예시**:
  - 12일 12:00 ~ 13일 06:00 → 하나의 업로드 윈도우
  - 13일 12:00 ~ 14일 06:00 → 다음 업로드 윈도우

### 2. 노출 윈도우 (Display Window)
- **시간**: 업로드 윈도우가 끝난 직후 같은 날짜의 오전 06:00 ~ 오후 12:00
- 업로드 윈도우와 노출 윈도우는 1:1로 매칭됨

### 3. 노출 규칙 예시
- **12일 12:00 ~ 13일 06:00**에 업로드된 이미지
  → **13일 06:00 ~ 13일 12:00**까지만 보임
- **13일 12:00 ~ 14일 06:00**에 업로드된 이미지
  → **14일 06:00 ~ 14일 12:00**까지만 보임

## 파일 구조

```
단추/
├── windowUtils.js          # 시간 윈도우 계산 유틸리티
├── backend-example.js      # 백엔드 구현 예시
├── script.js               # 프론트엔드 메인 로직 (시간 윈도우 통합)
├── index.html              # HTML (업로드 상태 UI 추가)
└── WINDOW_SYSTEM_README.md # 이 문서
```

## 사용 방법

### 프론트엔드 (로컬 스토리지 기반 시뮬레이션)

1. **업로드 가능 여부 확인**
   - 페이지 로드 시 자동으로 업로드 가능 여부를 확인합니다
   - 업로드 화면 상단에 상태가 표시됩니다

2. **이미지 업로드**
   - 업로드 윈도우 시간(12:00 ~ 다음날 06:00)에만 업로드 가능
   - 업로드 시 자동으로 노출 시간이 계산되어 저장됩니다

3. **보드 조회**
   - 노출 윈도우 시간(06:00 ~ 12:00)에만 이미지가 표시됩니다
   - 노출 시간이 지난 이미지는 자동으로 숨김 처리됩니다

### 백엔드 구현

`backend-example.js` 파일을 참고하여 실제 서버에 구현하세요.

## API 엔드포인트 예시

### 1. 이미지 업로드
```
POST /api/images/upload
Content-Type: multipart/form-data

Body:
- image: File
- width, height, bgWidth, bgHeight, imgWidth, imgHeight, padding: Number

Response:
{
  "success": true,
  "image": {
    "id": 1,
    "uploaded_at": "2024-01-13T14:30:00Z",
    "display_start_at": "2024-01-14T06:00:00Z",
    "display_end_at": "2024-01-14T12:00:00Z"
  }
}
```

### 2. 보드 조회 (노출 가능한 이미지만)
```
GET /api/images/board

Response:
{
  "success": true,
  "images": [...],
  "current_time": "2024-01-14T08:00:00Z"
}
```

### 3. 업로드 가능 여부 확인
```
GET /api/images/upload-status

Response:
{
  "can_upload": true,
  "current_time": "2024-01-13T15:00:00Z",
  "upload_window": {
    "start": "2024-01-13T12:00:00Z",
    "end": "2024-01-14T06:00:00Z"
  },
  "next_window_start": "2024-01-14T12:00:00Z"
}
```

## DB 스키마

```sql
CREATE TABLE images (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    
    -- 시간 윈도우 관련 필드
    uploaded_at DATETIME NOT NULL COMMENT '업로드 시점 (서버 시간)',
    display_start_at DATETIME NOT NULL COMMENT '노출 시작 시간',
    display_end_at DATETIME NOT NULL COMMENT '노출 종료 시간',
    
    -- 메타데이터
    width INT,
    height INT,
    bg_width DECIMAL(10, 2),
    bg_height DECIMAL(10, 2),
    img_width DECIMAL(10, 2),
    img_height DECIMAL(10, 2),
    padding DECIMAL(10, 2),
    
    -- 상태
    is_deleted BOOLEAN DEFAULT FALSE COMMENT '삭제 여부 (노출 시간 종료 후 숨김 처리)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_display_window (display_start_at, display_end_at),
    INDEX idx_uploaded_at (uploaded_at),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 보드 조회 쿼리 예시

### SQL
```sql
SELECT 
    id,
    file_path,
    file_name,
    width,
    height,
    bg_width,
    bg_height,
    img_width,
    img_height,
    padding,
    uploaded_at,
    display_start_at,
    display_end_at
FROM images
WHERE is_deleted = FALSE
  AND display_start_at <= NOW()
  AND display_end_at > NOW()
ORDER BY uploaded_at DESC;
```

### MongoDB (Mongoose)
```javascript
const images = await Image.find({
    is_deleted: false,
    display_start_at: { $lte: new Date() },
    display_end_at: { $gt: new Date() }
}).sort({ uploaded_at: -1 });
```

## 시간 윈도우 계산 로직

### 업로드 윈도우 계산
```javascript
function calculateUploadWindow(uploadTime) {
    const uploadDate = new Date(uploadTime);
    const year = uploadDate.getFullYear();
    const month = uploadDate.getMonth();
    const day = uploadDate.getDate();
    const hour = uploadDate.getHours();
    
    let windowStart, windowEnd;
    
    if (hour < 12) {
        // 전날 12:00 ~ 오늘 06:00
        windowStart = new Date(year, month, day - 1, 12, 0, 0, 0);
        windowEnd = new Date(year, month, day, 6, 0, 0, 0);
    } else {
        // 오늘 12:00 ~ 내일 06:00
        windowStart = new Date(year, month, day, 12, 0, 0, 0);
        windowEnd = new Date(year, month, day + 1, 6, 0, 0, 0);
    }
    
    return { start: windowStart, end: windowEnd };
}
```

### 노출 윈도우 계산
```javascript
function calculateDisplayWindow(uploadTime) {
    const uploadWindow = calculateUploadWindow(uploadTime);
    const windowEndDate = uploadWindow.end; // 업로드 윈도우 종료 시간 (다음날 06:00)
    
    // 노출 윈도우: 업로드 윈도우 종료 시간(06:00) ~ 같은 날 12:00
    const displayStart = new Date(windowEndDate);
    const displayEnd = new Date(windowEndDate);
    displayEnd.setHours(12, 0, 0, 0);
    
    return { start: displayStart, end: displayEnd };
}
```

## 프론트엔드에서 업로드 가능 여부 판단

```javascript
// 현재 시간이 업로드 윈도우 내에 있는지 확인
const currentTime = new Date(); // 실제로는 서버 시간 사용
const canUpload = isInUploadWindow(currentTime);

if (!canUpload) {
    const nextWindow = getNextUploadWindowStart(currentTime);
    console.log('다음 업로드 가능 시간:', nextWindow);
}
```

## 주의사항

1. **서버 시간 사용**: 클라이언트 시간을 신뢰하지 말고 항상 서버 시간을 사용하세요.
2. **타임존 처리**: 서버와 클라이언트의 타임존을 일치시켜야 합니다.
3. **스케줄러**: 노출 시간이 지난 이미지는 정기적으로 `is_deleted = true`로 업데이트해야 합니다.
4. **인덱스**: `display_start_at`과 `display_end_at`에 인덱스를 생성하여 조회 성능을 최적화하세요.

## 스케줄러 설정 (노출 시간 종료 이미지 숨김 처리)

```javascript
// 매 시간마다 실행 (cron: '0 * * * *')
async function hideExpiredImages() {
    const serverTime = new Date();
    
    await db.images.updateMany(
        {
            display_end_at: { $lt: serverTime },
            is_deleted: false
        },
        {
            $set: { is_deleted: true }
        }
    );
}
```

## 테스트 시나리오

1. **업로드 윈도우 내 업로드**
   - 시간: 13일 15:00
   - 결과: 업로드 성공, 노출 시간은 14일 06:00 ~ 14일 12:00

2. **업로드 윈도우 외 업로드**
   - 시간: 13일 10:00
   - 결과: 업로드 실패 (업로드 윈도우가 아님)

3. **노출 윈도우 내 조회**
   - 시간: 14일 08:00
   - 결과: 13일 12:00~14일 06:00에 업로드된 이미지 표시

4. **노출 윈도우 외 조회**
   - 시간: 14일 13:00
   - 결과: 이미지 숨김 처리됨

