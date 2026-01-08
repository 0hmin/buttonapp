const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // 정적 파일 서빙

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer 설정 (Cloudinary 스토리지 사용)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'danchu-uploads', // Cloudinary 폴더명
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    resource_type: 'image',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }] // 자동 최적화
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 제한
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

// 로컬 업로드 디렉토리 (기존 파일 삭제용으로만 사용)
const uploadsDir = path.join(__dirname, 'uploads');

// PostgreSQL 데이터베이스 초기화
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://button_app_user:5hzsepBECBjyo1KQ32wV2cGe9PbYlCu7@dpg-d5fid32li9vc738pa520-a.oregon-postgres.render.com/button_app',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// 데이터베이스 연결 테스트
pool.on('connect', () => {
  console.log('PostgreSQL 데이터베이스에 연결되었습니다.');
});

pool.on('error', (err) => {
  console.error('PostgreSQL 연결 오류:', err);
});

// 데이터베이스 테이블 생성 (비동기)
(async () => {
  const client = await pool.connect();
  try {
    // 사용자 테이블
    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nickname VARCHAR(255) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 이미지 테이블
    await client.query(`CREATE TABLE IF NOT EXISTS images (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_filename TEXT,
      src TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      scale DOUBLE PRECISION,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      display_start_at TIMESTAMP,
      display_end_at TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // 단추(버튼) 테이블
    await client.query(`CREATE TABLE IF NOT EXISTS user_buttons (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      image_id INTEGER NOT NULL,
      button_src TEXT NOT NULL,
      button_width DOUBLE PRECISION NOT NULL,
      button_height DOUBLE PRECISION NOT NULL,
      button_left DOUBLE PRECISION NOT NULL,
      button_top DOUBLE PRECISION NOT NULL,
      button_transform TEXT,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (image_id) REFERENCES images(id)
    )`);

    console.log('데이터베이스 테이블 생성 완료');
  } catch (err) {
    console.error('테이블 생성 오류:', err);
  } finally {
    client.release();
  }
})();

// JWT 시크릿 키
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// JWT 토큰 생성
function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

// JWT 토큰 검증 미들웨어
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
  }
}

// 회원가입
app.post('/api/signup', async (req, res) => {
  const { nickname, password } = req.body;

  if (!nickname || !password) {
    return res.status(400).json({ error: '닉네임과 비밀번호를 입력해주세요.' });
  }

  if (!/^\d{4}$/.test(password)) {
    return res.status(400).json({ error: '비밀번호는 숫자 4자리여야 합니다.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (nickname, password) VALUES ($1, $2) RETURNING id',
      [nickname, hashedPassword]
    );

    const userId = result.rows[0].id;
    const token = generateToken(userId);
    res.json({ 
      success: true, 
      token, 
      user: { id: userId, nickname } 
    });
  } catch (error) {
    if (error.code === '23505') { // UNIQUE constraint violation
      return res.status(409).json({ error: '이미 존재하는 닉네임입니다.' });
    }
    console.error('회원가입 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 로그인
app.post('/api/login', async (req, res) => {
  const { nickname, password } = req.body;

  if (!nickname || !password) {
    return res.status(400).json({ error: '닉네임과 비밀번호를 입력해주세요.' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE nickname = $1',
      [nickname]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: '닉네임 또는 비밀번호가 잘못되었습니다.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: '닉네임 또는 비밀번호가 잘못되었습니다.' });
    }

    const token = generateToken(user.id);
    res.json({ 
      success: true, 
      token, 
      user: { id: user.id, nickname: user.nickname } 
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 이미지 업로드
app.post('/api/images/upload', authenticateToken, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
  }

  const { width, height, scale, displayStartAt, displayEndAt, uploadedAt: clientUploadedAt } = req.body;
  
  // Cloudinary에서 업로드된 파일 정보
  const cloudinaryResult = req.file;
  const fileUrl = cloudinaryResult.secure_url || cloudinaryResult.url; // HTTPS URL 사용
  const publicId = cloudinaryResult.public_id; // Cloudinary public_id
  const filename = cloudinaryResult.originalname || cloudinaryResult.filename;
  
  // 클라이언트에서 보낸 uploadedAt 사용, 없으면 서버 시간 사용
  const uploadedAt = clientUploadedAt || new Date().toISOString();

  try {
    const result = await pool.query(
      `INSERT INTO images (user_id, filename, original_filename, src, width, height, scale, uploaded_at, display_start_at, display_end_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [req.userId, publicId, filename, fileUrl, width, height, scale, uploadedAt, displayStartAt, displayEndAt]
    );

    const imageId = result.rows[0].id;

    res.json({
      success: true,
      image: {
        id: imageId,
        src: fileUrl,
        width: parseInt(width),
        height: parseInt(height),
        scale: parseFloat(scale),
        uploaded_at: uploadedAt,
        display_start_at: displayStartAt,
        display_end_at: displayEndAt
      }
    });
  } catch (error) {
    console.error('이미지 저장 오류:', error);
    // Cloudinary에서 업로드된 파일 삭제 (롤백)
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (deleteError) {
        console.error('Cloudinary 파일 삭제 실패:', deleteError);
      }
    }
    res.status(500).json({ error: '이미지 저장 실패' });
  }
});

// 이미지 목록 조회
app.get('/api/images', authenticateToken, async (req, res) => {
  try {
    // LEFT JOIN을 사용해서 users 테이블에 없는 경우에도 이미지는 조회되도록
    const query = `
      SELECT 
        i.*,
        u.nickname as user_nickname
      FROM images i
      LEFT JOIN users u ON i.user_id = u.id
      ORDER BY i.uploaded_at DESC
    `;

    const result = await pool.query(query);
    const images = result.rows;

    res.json({ images: images || [] });
  } catch (error) {
    console.error('이미지 조회 오류:', error);
    res.status(500).json({ error: '이미지 조회 실패: ' + error.message });
  }
});

// 이미지 삭제
app.delete('/api/images/:imageId', authenticateToken, async (req, res) => {
  const { imageId } = req.params;

  try {
    // 먼저 이미지 정보 조회 (파일명과 사용자 확인용)
    const imageResult = await pool.query(
      'SELECT filename, user_id FROM images WHERE id = $1',
      [imageId]
    );

    const image = imageResult.rows[0];

    if (!image) {
      return res.status(404).json({ error: '이미지를 찾을 수 없습니다.' });
    }

    // 본인이 업로드한 이미지만 삭제 가능하도록 검증
    if (image.user_id !== req.userId) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    // 관련된 단추 먼저 삭제
    try {
      await pool.query('DELETE FROM user_buttons WHERE image_id = $1', [imageId]);
    } catch (err) {
      console.error('단추 삭제 오류:', err);
      // 단추 삭제 실패해도 계속 진행
    }

    // 이미지 레코드 삭제
    await pool.query('DELETE FROM images WHERE id = $1', [imageId]);

    // Cloudinary에서 파일 삭제
    try {
      // filename이 Cloudinary public_id인 경우
      if (image.filename) {
        await cloudinary.uploader.destroy(image.filename);
        console.log('Cloudinary 파일 삭제 완료:', image.filename);
      }
    } catch (cloudinaryError) {
      console.error('Cloudinary 파일 삭제 오류:', cloudinaryError);
      // Cloudinary 삭제 실패해도 DB 삭제는 완료되었으므로 계속 진행
    }

    res.json({
      success: true,
      message: '이미지가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('이미지 삭제 오류:', error);
    res.status(500).json({ error: '이미지 삭제 실패' });
  }
});

// 단추 추가
app.post('/api/buttons', authenticateToken, async (req, res) => {
  const { imageId, buttonData } = req.body;

  if (!imageId || !buttonData) {
    return res.status(400).json({ error: '이미지 ID와 단추 데이터가 필요합니다.' });
  }

  try {
    // 이미 해당 사용자가 이 이미지에 단추를 추가했는지 확인
    const existingResult = await pool.query(
      'SELECT id FROM user_buttons WHERE user_id = $1 AND image_id = $2',
      [req.userId, imageId]
    );

    const existing = existingResult.rows[0];

    if (existing) {
      // 이미 단추가 있으면 기존 단추 업데이트
      // 클라이언트에서 보낸 addedAt 사용 (타임스탬프인 경우 ISO 문자열로 변환)
      let addedAtValue;
      if (buttonData.addedAt) {
        // 타임스탬프(숫자)인 경우 ISO 문자열로 변환
        if (typeof buttonData.addedAt === 'number') {
          addedAtValue = new Date(buttonData.addedAt).toISOString();
        } else {
          // 이미 문자열인 경우 그대로 사용
          addedAtValue = buttonData.addedAt;
        }
      } else {
        // addedAt이 없으면 기존 시간 유지 (업데이트하지 않음)
        addedAtValue = null;
      }
      
      if (addedAtValue) {
        await pool.query(
          `UPDATE user_buttons 
           SET button_src = $1, button_width = $2, button_height = $3, button_left = $4, button_top = $5, button_transform = $6, added_at = $7
           WHERE user_id = $8 AND image_id = $9`,
          [
            buttonData.src,
            buttonData.width,
            buttonData.height,
            buttonData.left,
            buttonData.top,
            buttonData.transform || 'rotate(0deg)',
            addedAtValue,
            req.userId,
            imageId
          ]
        );
      } else {
        await pool.query(
          `UPDATE user_buttons 
           SET button_src = $1, button_width = $2, button_height = $3, button_left = $4, button_top = $5, button_transform = $6
           WHERE user_id = $7 AND image_id = $8`,
          [
            buttonData.src,
            buttonData.width,
            buttonData.height,
            buttonData.left,
            buttonData.top,
            buttonData.transform || 'rotate(0deg)',
            req.userId,
            imageId
          ]
        );
      }

      res.json({
        success: true,
        buttonId: existing.id,
        message: '단추가 업데이트되었습니다.'
      });
    } else {
      // 새 단추 추가
      // 클라이언트에서 보낸 addedAt 사용 (타임스탬프인 경우 ISO 문자열로 변환)
      let addedAtValue;
      if (buttonData.addedAt) {
        // 타임스탬프(숫자)인 경우 ISO 문자열로 변환
        if (typeof buttonData.addedAt === 'number') {
          addedAtValue = new Date(buttonData.addedAt).toISOString();
        } else {
          // 이미 문자열인 경우 그대로 사용
          addedAtValue = buttonData.addedAt;
        }
      } else {
        // addedAt이 없으면 현재 서버 시간 사용 (기본값)
        addedAtValue = new Date().toISOString();
      }
      
      console.log('단추 추가 - 추가 시간:', {
        클라이언트에서_받은_addedAt: buttonData.addedAt,
        저장할_시간: addedAtValue,
        타입: typeof buttonData.addedAt
      });
      
      const result = await pool.query(
        `INSERT INTO user_buttons 
         (user_id, image_id, button_src, button_width, button_height, button_left, button_top, button_transform, added_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          req.userId,
          imageId,
          buttonData.src || buttonData.button_src,
          buttonData.width || buttonData.button_width,
          buttonData.height || buttonData.button_height,
          buttonData.left || buttonData.button_left,
          buttonData.top || buttonData.button_top,
          buttonData.transform || 'rotate(0deg)',
          addedAtValue
        ]
      );

      res.json({
        success: true,
        buttonId: result.rows[0].id,
        message: '단추가 저장되었습니다.'
      });
    }
  } catch (error) {
    console.error('단추 저장/업데이트 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 이미지의 단추 목록 조회
app.get('/api/images/:imageId/buttons', authenticateToken, async (req, res) => {
  const { imageId } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        ub.*,
        u.nickname as user_nickname
       FROM user_buttons ub
       JOIN users u ON ub.user_id = u.id
       WHERE ub.image_id = $1`,
      [imageId]
    );

    const buttons = result.rows;

    const formattedButtons = buttons.map(btn => ({
      id: btn.id,
      userId: btn.user_id,
      imageId: btn.image_id,
      buttonData: {
        src: btn.button_src,
        width: btn.button_width,
        height: btn.button_height,
        left: btn.button_left,
        top: btn.button_top,
        transform: btn.button_transform
      },
      addedAt: btn.added_at
    }));

    res.json({ buttons: formattedButtons });
  } catch (error) {
    console.error('단추 조회 오류:', error);
    res.status(500).json({ error: '단추 조회 실패' });
  }
});

// 사용자가 추가한 단추 목록 조회 (단추보기 페이지용)
app.get('/api/users/buttons', authenticateToken, async (req, res) => {
  const query = `
    SELECT 
      ub.*,
      i.src as image_src,
      i.filename as image_filename,
      u.nickname as user_nickname
    FROM user_buttons ub
    JOIN images i ON ub.image_id = i.id
    JOIN users u ON ub.user_id = u.id
    WHERE ub.user_id = $1
    ORDER BY ub.added_at DESC
  `;

  try {
    const result = await pool.query(query, [req.userId]);
    const userButtons = result.rows;

    console.log('=== 사용자 단추 조회 결과 ===');
    console.log('조회된 단추 개수:', userButtons ? userButtons.length : 0);
    if (userButtons && userButtons.length > 0) {
      console.log('첫 번째 단추 데이터:', {
        id: userButtons[0].id,
        user_id: userButtons[0].user_id,
        image_id: userButtons[0].image_id,
        added_at: userButtons[0].added_at,
        added_at_type: typeof userButtons[0].added_at
      });
    }

    res.json({ userButtons: userButtons || [] });
  } catch (error) {
    console.error('사용자 단추 조회 오류:', error);
    res.status(500).json({ error: '단추 조회 실패' });
  }
});

// 업로드된 이미지 파일 서빙 (로컬 파일용, Cloudinary 사용 시 불필요하지만 호환성 유지)
// app.use('/uploads', express.static(uploadsDir));

// 모든 데이터 삭제 (개발/테스트용)
app.delete('/api/admin/reset-all', authenticateToken, async (req, res) => {
  try {
    // 모든 테이블 데이터 삭제
    await pool.query('DELETE FROM user_buttons');
    await pool.query('DELETE FROM images');
    
    // Cloudinary에서 모든 이미지 삭제 (폴더 단위)
    try {
      const result = await cloudinary.api.delete_resources_by_prefix('danchu-uploads/');
      console.log('Cloudinary 파일 삭제 완료:', result);
    } catch (cloudinaryError) {
      console.error('Cloudinary 파일 삭제 오류:', cloudinaryError);
      // Cloudinary 삭제 실패해도 DB 삭제는 완료되었으므로 계속 진행
    }
    
    res.json({ 
      success: true, 
      message: '모든 데이터가 삭제되었습니다.' 
    });
  } catch (error) {
    console.error('데이터 삭제 오류:', error);
    res.status(500).json({ error: '데이터 삭제 실패' });
  }
});

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
