/**
 * 백엔드 예시 코드 (Node.js + Express)
 * 시간 윈도우 기반 이미지 업로드 및 노출 시스템
 */

const express = require('express');
const multer = require('multer');
const { 
    calculateDisplayWindow, 
    isInUploadWindow, 
    filterVisibleImages,
    getNextUploadWindowStart 
} = require('./windowUtils');

const app = express();
const upload = multer({ dest: 'uploads/' });

// ============================================
// DB 스키마 예시 (SQL)
// ============================================
/*
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
*/

// ============================================
// 1. 이미지 업로드 API
// ============================================
app.post('/api/images/upload', upload.single('image'), async (req, res) => {
    try {
        const serverTime = new Date(); // 서버 시간 기준
        
        // 업로드 윈도우 확인
        if (!isInUploadWindow(serverTime)) {
            return res.status(403).json({
                error: 'UPLOAD_WINDOW_CLOSED',
                message: '업로드 가능한 시간이 아닙니다.',
                nextWindowStart: getNextUploadWindowStart(serverTime).toISOString()
            });
        }
        
        // 노출 윈도우 계산
        const displayWindow = calculateDisplayWindow(serverTime);
        
        // 이미지 메타데이터 추출 (실제로는 이미지 처리 라이브러리 사용)
        const imageMetadata = {
            width: req.body.width || 0,
            height: req.body.height || 0,
            bgWidth: parseFloat(req.body.bgWidth) || 0,
            bgHeight: parseFloat(req.body.bgHeight) || 0,
            imgWidth: parseFloat(req.body.imgWidth) || 0,
            imgHeight: parseFloat(req.body.imgHeight) || 0,
            padding: parseFloat(req.body.padding) || 0
        };
        
        // DB에 저장
        const imageData = {
            user_id: req.user?.id || null, // 인증된 사용자 ID
            file_path: req.file.path,
            file_name: req.file.originalname,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            uploaded_at: serverTime,
            display_start_at: displayWindow.start,
            display_end_at: displayWindow.end,
            width: imageMetadata.width,
            height: imageMetadata.height,
            bg_width: imageMetadata.bgWidth,
            bg_height: imageMetadata.bgHeight,
            img_width: imageMetadata.imgWidth,
            img_height: imageMetadata.imgHeight,
            padding: imageMetadata.padding,
            is_deleted: false
        };
        
        // DB 저장 (예시 - 실제로는 ORM 사용)
        // const savedImage = await db.images.create(imageData);
        
        res.json({
            success: true,
            image: {
                id: savedImage.id,
                uploaded_at: savedImage.uploaded_at,
                display_start_at: savedImage.display_start_at,
                display_end_at: savedImage.display_end_at,
                message: `이미지가 업로드되었습니다. ${displayWindow.start.toLocaleString()}부터 노출됩니다.`
            }
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'INTERNAL_ERROR', message: '이미지 업로드 중 오류가 발생했습니다.' });
    }
});

// ============================================
// 2. 보드 조회 API (노출 가능한 이미지만)
// ============================================
app.get('/api/images/board', async (req, res) => {
    try {
        const serverTime = new Date(); // 서버 시간 기준
        
        // 노출 윈도우 내의 이미지만 조회
        // SQL 쿼리 예시:
        /*
        SELECT * FROM images
        WHERE is_deleted = FALSE
          AND display_start_at <= ?
          AND display_end_at > ?
        ORDER BY uploaded_at DESC;
        */
        
        const query = {
            is_deleted: false,
            display_start_at: { $lte: serverTime },
            display_end_at: { $gt: serverTime }
        };
        
        // 실제 DB 조회 (예시)
        // const images = await db.images.find(query).sort({ uploaded_at: -1 });
        
        // 또는 SQL 직접 사용
        /*
        const images = await db.query(`
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
              AND display_start_at <= ?
              AND display_end_at > ?
            ORDER BY uploaded_at DESC
        `, [serverTime, serverTime]);
        */
        
        res.json({
            success: true,
            images: images.map(img => ({
                id: img.id,
                src: `/uploads/${img.file_path}`,
                bgWidth: img.bg_width,
                bgHeight: img.bg_height,
                imgWidth: img.img_width,
                imgHeight: img.img_height,
                padding: img.padding,
                uploaded_at: img.uploaded_at,
                display_start_at: img.display_start_at,
                display_end_at: img.display_end_at
            })),
            current_time: serverTime.toISOString()
        });
        
    } catch (error) {
        console.error('Board fetch error:', error);
        res.status(500).json({ error: 'INTERNAL_ERROR', message: '보드 조회 중 오류가 발생했습니다.' });
    }
});

// ============================================
// 3. 업로드 가능 여부 확인 API
// ============================================
app.get('/api/images/upload-status', (req, res) => {
    const serverTime = new Date();
    const canUpload = isInUploadWindow(serverTime);
    const uploadWindow = calculateUploadWindow(serverTime);
    
    res.json({
        can_upload: canUpload,
        current_time: serverTime.toISOString(),
        upload_window: {
            start: uploadWindow.start.toISOString(),
            end: uploadWindow.end.toISOString()
        },
        next_window_start: getNextUploadWindowStart(serverTime).toISOString()
    });
});

// ============================================
// 4. 노출 시간 종료된 이미지 숨김 처리 (스케줄러)
// ============================================
// 매 시간마다 실행되는 스케줄러 (cron job)
async function hideExpiredImages() {
    const serverTime = new Date();
    
    // 노출 시간이 지난 이미지는 is_deleted = true로 업데이트
    // (실제로 삭제하지 않고 숨김 처리)
    /*
    await db.images.updateMany(
        {
            display_end_at: { $lt: serverTime },
            is_deleted: false
        },
        {
            $set: { is_deleted: true }
        }
    );
    */
    
    // 또는 SQL
    /*
    UPDATE images
    SET is_deleted = TRUE
    WHERE display_end_at < ?
      AND is_deleted = FALSE;
    */
    
    console.log(`[${serverTime.toISOString()}] Expired images hidden`);
}

// cron 스케줄러 설정 (예: node-cron 사용)
// cron.schedule('0 * * * *', hideExpiredImages); // 매 시간마다 실행

module.exports = app;

