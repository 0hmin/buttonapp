const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // 정적 파일 서빙

// 이미지 업로드 디렉토리 생성
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer 설정 (이미지 업로드)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
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

// SQLite 데이터베이스 초기화
const db = new sqlite3.Database('database.db');

// 데이터베이스 테이블 생성
db.serialize(() => {
  // 사용자 테이블
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 이미지 테이블
  db.run(`CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT,
    src TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    scale REAL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    display_start_at DATETIME,
    display_end_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // 단추(버튼) 테이블
  db.run(`CREATE TABLE IF NOT EXISTS user_buttons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    image_id INTEGER NOT NULL,
    button_src TEXT NOT NULL,
    button_width REAL NOT NULL,
    button_height REAL NOT NULL,
    button_left REAL NOT NULL,
    button_top REAL NOT NULL,
    button_transform TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (image_id) REFERENCES images(id)
  )`);
});

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
    
    db.run(
      'INSERT INTO users (nickname, password) VALUES (?, ?)',
      [nickname, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: '이미 존재하는 닉네임입니다.' });
          }
          return res.status(500).json({ error: '회원가입 실패' });
        }
        
        const token = generateToken(this.lastID);
        res.json({ 
          success: true, 
          token, 
          user: { id: this.lastID, nickname } 
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 로그인
app.post('/api/login', async (req, res) => {
  const { nickname, password } = req.body;

  if (!nickname || !password) {
    return res.status(400).json({ error: '닉네임과 비밀번호를 입력해주세요.' });
  }

  db.get(
    'SELECT * FROM users WHERE nickname = ?',
    [nickname],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: '서버 오류' });
      }

      if (!user) {
        return res.status(401).json({ error: '닉네임 또는 비밀번호가 잘못되었습니다.' });
      }

      try {
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
        res.status(500).json({ error: '서버 오류' });
      }
    }
  );
});

// 이미지 업로드
app.post('/api/images/upload', authenticateToken, upload.single('image'), (req, res) => {
  console.log('=== 이미지 업로드 요청 ===');
  console.log('요청한 사용자 ID:', req.userId);
  console.log('파일 존재:', !!req.file);
  
  if (!req.file) {
    console.error('파일이 없습니다.');
    return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
  }

  const { width, height, scale, displayStartAt, displayEndAt, uploadedAt: clientUploadedAt } = req.body;
  const filename = req.file.filename;
  const fileUrl = `/uploads/${filename}`;
  // 클라이언트에서 보낸 uploadedAt 사용, 없으면 서버 시간 사용
  const uploadedAt = clientUploadedAt || new Date().toISOString();
  
  console.log('이미지 업로드 - 시간 정보:', {
    클라이언트에서_받은_uploadedAt: clientUploadedAt,
    사용할_uploaded_at: uploadedAt,
    display_start_at: displayStartAt,
    display_end_at: displayEndAt
  });

  console.log('업로드 데이터:', {
    user_id: req.userId,
    filename: filename,
    width: width,
    height: height,
    scale: scale,
    displayStartAt: displayStartAt,
    displayEndAt: displayEndAt
  });

  db.run(
    `INSERT INTO images (user_id, filename, original_filename, src, width, height, scale, uploaded_at, display_start_at, display_end_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.userId, filename, req.file.originalname, fileUrl, width, height, scale, uploadedAt, displayStartAt, displayEndAt],
    function(err) {
      if (err) {
        console.error('이미지 저장 오류:', err);
        return res.status(500).json({ error: '이미지 저장 실패' });
      }

      console.log('=== 이미지 저장 성공 ===');
      console.log('저장된 이미지 ID:', this.lastID);
      console.log('저장된 이미지 URL:', fileUrl);

      // 저장 후 실제로 DB에 있는지 확인
      db.get('SELECT * FROM images WHERE id = ?', [this.lastID], (checkErr, savedImage) => {
        if (checkErr) {
          console.error('저장 확인 오류:', checkErr);
        } else {
          console.log('DB에서 확인한 이미지:', savedImage ? {
            id: savedImage.id,
            user_id: savedImage.user_id,
            src: savedImage.src
          } : '없음');
        }
      });

      res.json({
        success: true,
        image: {
          id: this.lastID,
          src: fileUrl,
          width: parseInt(width),
          height: parseInt(height),
          scale: parseFloat(scale),
          uploaded_at: uploadedAt,
          display_start_at: displayStartAt,
          display_end_at: displayEndAt
        }
      });
    }
  );
});

// 이미지 목록 조회
app.get('/api/images', authenticateToken, (req, res) => {
  console.log('=== 이미지 목록 조회 요청 ===');
  console.log('요청한 사용자 ID:', req.userId);
  
  // 먼저 JOIN 없이 이미지만 조회해서 확인
  db.all('SELECT COUNT(*) as count FROM images', [], (countErr, countResult) => {
    if (!countErr && countResult && countResult.length > 0) {
      console.log('images 테이블의 총 이미지 개수 (JOIN 없이):', countResult[0].count);
      
      // 이미지가 있는데 JOIN으로 조회가 안 되는 경우를 대비해 실제 이미지 데이터도 확인
      db.all('SELECT id, user_id, src, uploaded_at FROM images LIMIT 5', [], (sampleErr, sampleImages) => {
        if (!sampleErr && sampleImages) {
          console.log('샘플 이미지 데이터 (최대 5개):', sampleImages);
        }
      });
    }
  });
  
  // LEFT JOIN을 사용해서 users 테이블에 없는 경우에도 이미지는 조회되도록
  const query = `
    SELECT 
      i.*,
      u.nickname as user_nickname
    FROM images i
    LEFT JOIN users u ON i.user_id = u.id
    ORDER BY i.uploaded_at DESC
  `;

  db.all(query, [], (err, images) => {
    if (err) {
      console.error('이미지 조회 오류:', err);
      console.error('에러 상세:', err.message);
      return res.status(500).json({ error: '이미지 조회 실패: ' + err.message });
    }

    console.log('=== 데이터베이스 조회 결과 ===');
    console.log('조회된 이미지 개수:', images ? images.length : 0);
    if (images && images.length > 0) {
      console.log('첫 번째 이미지:', {
        id: images[0].id,
        user_id: images[0].user_id,
        src: images[0].src,
        uploaded_at: images[0].uploaded_at,
        user_nickname: images[0].user_nickname
      });
    } else {
      console.log('조회된 이미지가 없습니다.');
      // JOIN 없이 이미지만 조회해보기
      db.all('SELECT * FROM images ORDER BY uploaded_at DESC LIMIT 10', [], (noJoinErr, noJoinImages) => {
        if (!noJoinErr) {
          console.log('JOIN 없이 조회한 이미지 개수:', noJoinImages ? noJoinImages.length : 0);
          if (noJoinImages && noJoinImages.length > 0) {
            console.log('JOIN 없이 조회한 첫 번째 이미지:', {
              id: noJoinImages[0].id,
              user_id: noJoinImages[0].user_id,
              src: noJoinImages[0].src
            });
          }
        }
      });
    }

    res.json({ images: images || [] });
  });
});

// 이미지 삭제
app.delete('/api/images/:imageId', authenticateToken, (req, res) => {
  const { imageId } = req.params;

  // 먼저 이미지 정보 조회 (파일명과 사용자 확인용)
  db.get(
    'SELECT filename, user_id FROM images WHERE id = ?',
    [imageId],
    (err, image) => {
      if (err) {
        console.error('이미지 조회 오류:', err);
        return res.status(500).json({ error: '이미지 조회 실패' });
      }

      if (!image) {
        return res.status(404).json({ error: '이미지를 찾을 수 없습니다.' });
      }

      // 본인이 업로드한 이미지만 삭제 가능하도록 검증
      if (image.user_id !== req.userId) {
        return res.status(403).json({ error: '삭제 권한이 없습니다.' });
      }

      // 관련된 단추 먼저 삭제
      db.run(
        'DELETE FROM user_buttons WHERE image_id = ?',
        [imageId],
        (err) => {
          if (err) {
            console.error('단추 삭제 오류:', err);
            // 단추 삭제 실패해도 계속 진행
          }

          // 이미지 레코드 삭제
          db.run(
            'DELETE FROM images WHERE id = ?',
            [imageId],
            function(err) {
              if (err) {
                console.error('이미지 삭제 오류:', err);
                return res.status(500).json({ error: '이미지 삭제 실패' });
              }

              // 실제 파일도 삭제
              const filePath = path.join(uploadsDir, image.filename);
              fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                  // 파일이 없어도 성공으로 처리 (ENOENT)
                  console.error('파일 삭제 오류:', unlinkErr);
                }
              });

              res.json({
                success: true,
                message: '이미지가 삭제되었습니다.'
              });
            }
          );
        }
      );
    }
  );
});

// 단추 추가
app.post('/api/buttons', authenticateToken, (req, res) => {
  const { imageId, buttonData } = req.body;

  if (!imageId || !buttonData) {
    return res.status(400).json({ error: '이미지 ID와 단추 데이터가 필요합니다.' });
  }

  // 이미 해당 사용자가 이 이미지에 단추를 추가했는지 확인
  db.get(
    'SELECT id FROM user_buttons WHERE user_id = ? AND image_id = ?',
    [req.userId, imageId],
    (err, existing) => {
      if (err) {
        console.error('단추 중복 확인 오류:', err);
        return res.status(500).json({ error: '서버 오류' });
      }

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
        
        const updateQuery = addedAtValue 
          ? `UPDATE user_buttons 
             SET button_src = ?, button_width = ?, button_height = ?, button_left = ?, button_top = ?, button_transform = ?, added_at = ?
             WHERE user_id = ? AND image_id = ?`
          : `UPDATE user_buttons 
             SET button_src = ?, button_width = ?, button_height = ?, button_left = ?, button_top = ?, button_transform = ?
             WHERE user_id = ? AND image_id = ?`;
        
        const updateParams = addedAtValue
          ? [
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
          : [
              buttonData.src,
              buttonData.width,
              buttonData.height,
              buttonData.left,
              buttonData.top,
              buttonData.transform || 'rotate(0deg)',
              req.userId,
              imageId
            ];
        
        db.run(
          updateQuery,
          updateParams,
          function(updateErr) {
            if (updateErr) {
              console.error('단추 업데이트 오류:', updateErr);
              return res.status(500).json({ error: '단추 업데이트 실패' });
            }

            res.json({
              success: true,
              buttonId: existing.id,
              message: '단추가 업데이트되었습니다.'
            });
          }
        );
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
        
        db.run(
          `INSERT INTO user_buttons 
           (user_id, image_id, button_src, button_width, button_height, button_left, button_top, button_transform, added_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          ],
          function(err) {
            if (err) {
              console.error('단추 저장 오류:', err);
              return res.status(500).json({ error: '단추 저장 실패: ' + err.message });
            }

            res.json({
              success: true,
              buttonId: this.lastID,
              message: '단추가 저장되었습니다.'
            });
          }
        );
      }
    }
  );
});

// 이미지의 단추 목록 조회
app.get('/api/images/:imageId/buttons', authenticateToken, (req, res) => {
  const { imageId } = req.params;

  db.all(
    `SELECT 
      ub.*,
      u.nickname as user_nickname
     FROM user_buttons ub
     JOIN users u ON ub.user_id = u.id
     WHERE ub.image_id = ?`,
    [imageId],
    (err, buttons) => {
      if (err) {
        console.error('단추 조회 오류:', err);
        return res.status(500).json({ error: '단추 조회 실패' });
      }

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
    }
  );
});

// 사용자가 추가한 단추 목록 조회 (단추보기 페이지용)
app.get('/api/users/buttons', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      ub.*,
      i.src as image_src,
      i.filename as image_filename,
      u.nickname as user_nickname
    FROM user_buttons ub
    JOIN images i ON ub.image_id = i.id
    JOIN users u ON ub.user_id = u.id
    WHERE ub.user_id = ?
    ORDER BY ub.added_at DESC
  `;

  db.all(query, [req.userId], (err, userButtons) => {
    if (err) {
      console.error('사용자 단추 조회 오류:', err);
      return res.status(500).json({ error: '단추 조회 실패' });
    }

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
  });
});

// 업로드된 이미지 파일 서빙
app.use('/uploads', express.static(uploadsDir));

// 모든 데이터 삭제 (개발/테스트용)
app.delete('/api/admin/reset-all', authenticateToken, (req, res) => {
  // 모든 테이블 데이터 삭제
  db.serialize(() => {
    db.run('DELETE FROM user_buttons', (err) => {
      if (err) {
        console.error('단추 삭제 오류:', err);
        return res.status(500).json({ error: '데이터 삭제 실패' });
      }
      
      db.run('DELETE FROM images', (err) => {
        if (err) {
          console.error('이미지 삭제 오류:', err);
          return res.status(500).json({ error: '데이터 삭제 실패' });
        }
        
        // 업로드된 파일도 삭제
        fs.readdir(uploadsDir, (err, files) => {
          if (err) {
            console.error('파일 목록 읽기 오류:', err);
            return res.status(500).json({ error: '파일 삭제 실패' });
          }
          
          files.forEach(file => {
            fs.unlink(path.join(uploadsDir, file), (unlinkErr) => {
              if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                console.error('파일 삭제 오류:', unlinkErr);
              }
            });
          });
          
          res.json({ 
            success: true, 
            message: '모든 데이터가 삭제되었습니다.' 
          });
        });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});

