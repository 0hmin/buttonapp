// ============================================
// 공통 유틸리티 및 전역 변수
// ============================================

// App 네임스페이스 초기화 (최초 선언만)
if (typeof window.App === 'undefined') {
    window.App = {};
}
var App = window.App;

// 전역 변수
App.selectedPhotos = []; // 선택된 사진 데이터 저장

// IndexedDB 데이터베이스 설정
App.DB_NAME = 'button_images_db';
App.DB_VERSION = 2; // user_buttons store 추가로 버전 증가
App.STORE_NAME = 'images';
App.USER_BUTTONS_STORE_NAME = 'user_buttons';
App.db = null;

// 시간 조작 관련 상수
App.TIME_OFFSET_KEY = 'time_offset_ms';
App.TIME_PANEL_VISIBLE_KEY = 'time_panel_visible';

// DOM 요소 참조 (초기화 시 설정됨)
App.elements = {};

/**
 * IndexedDB 데이터베이스 초기화
 */
App.initDB = function() {
    return new Promise((resolve, reject) => {
        // DB가 이미 열려있으면 버전을 확인하고, 필요시 재오픈
        if (App.db) {
            // DB 버전이 다르면 닫고 다시 열기
            if (App.db.version !== App.DB_VERSION) {
                console.log('DB 버전 불일치, 재오픈:', App.db.version, '->', App.DB_VERSION);
                App.db.close();
                App.db = null;
            } else {
                resolve(App.db);
                return;
            }
        }
        
        const request = indexedDB.open(App.DB_NAME, App.DB_VERSION);
        
        request.onerror = () => {
            console.error('IndexedDB 오픈 실패:', request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            App.db = request.result;
            console.log('IndexedDB 연결 성공');
            resolve(App.db);
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            const oldVersion = event.oldVersion;
            const newVersion = event.newVersion;
            
            console.log('IndexedDB 업그레이드:', oldVersion, '->', newVersion);
            
            // images store 생성 (기존)
            if (!database.objectStoreNames.contains(App.STORE_NAME)) {
                const objectStore = database.createObjectStore(App.STORE_NAME, { keyPath: 'id' });
                objectStore.createIndex('uploaded_at', 'uploaded_at', { unique: false });
                objectStore.createIndex('display_start_at', 'display_start_at', { unique: false });
                objectStore.createIndex('display_end_at', 'display_end_at', { unique: false });
                console.log('images 스토어 생성 완료');
            }
            
            // user_buttons store 생성 (버전 2에서 추가)
            if (newVersion >= 2 && !database.objectStoreNames.contains(App.USER_BUTTONS_STORE_NAME)) {
                const userButtonsStore = database.createObjectStore(App.USER_BUTTONS_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                userButtonsStore.createIndex('userId', 'userId', { unique: false });
                userButtonsStore.createIndex('imageId', 'imageId', { unique: false });
                userButtonsStore.createIndex('addedAt', 'addedAt', { unique: false });
                console.log('user_buttons 스토어 생성 완료');
            }
        };
    });
};

/**
 * 기존 localStorage 데이터를 IndexedDB로 마이그레이션
 */
App.migrateFromLocalStorage = async function() {
    try {
        const localStorageData = localStorage.getItem('window_based_images');
        if (localStorageData) {
            const images = JSON.parse(localStorageData);
            if (images.length > 0) {
                console.log('localStorage에서 IndexedDB로 마이그레이션 시작:', images.length, '개');
                await App.saveImagesToStorage(images);
                // 마이그레이션 완료 후 localStorage 삭제
                localStorage.removeItem('window_based_images');
                console.log('마이그레이션 완료');
            }
        }
    } catch (e) {
        console.error('마이그레이션 중 오류:', e);
    }
};

/**
 * IndexedDB에서 모든 이미지 불러오기
 */
App.loadImagesFromStorage = async function() {
    try {
        await App.initDB();
        return new Promise((resolve, reject) => {
            const transaction = App.db.transaction([App.STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(App.STORE_NAME);
            const request = objectStore.getAll();
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = () => {
                console.error('이미지 로드 실패:', request.error);
                resolve([]);
            };
        });
    } catch (e) {
        console.error('Failed to load images from storage:', e);
        return [];
    }
};

/**
 * IndexedDB에 이미지 저장 (배치 저장)
 */
App.saveImagesToStorage = async function(images) {
    try {
        await App.initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = App.db.transaction([App.STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(App.STORE_NAME);
            
            // 기존 데이터 모두 삭제
            const clearRequest = objectStore.clear();
            
            clearRequest.onsuccess = () => {
                // 새 데이터 추가
                let completed = 0;
                let hasError = false;
                
                if (images.length === 0) {
                    resolve();
                    return;
                }
                
                images.forEach((image, index) => {
                    const addRequest = objectStore.add(image);
                    
                    addRequest.onsuccess = () => {
                        completed++;
                        if (completed === images.length && !hasError) {
                            console.log('IndexedDB 저장 완료 - 이미지 개수:', images.length);
                            resolve();
                        }
                    };
                    
                    addRequest.onerror = () => {
                        hasError = true;
                        console.error('이미지 저장 실패:', addRequest.error);
                        reject(addRequest.error);
                    };
                });
            };
            
            clearRequest.onerror = () => {
                console.error('데이터 삭제 실패:', clearRequest.error);
                reject(clearRequest.error);
            };
        });
    } catch (e) {
        console.error('Failed to save images to storage:', e);
        throw e;
    }
};

/**
 * 사용자 단추 정보를 user_buttons store에 저장
 */
App.saveUserButton = async function(userId, imageId, buttonData) {
    try {
        await App.initDB();
        
        // user_buttons store가 있는지 확인
        if (!App.db.objectStoreNames.contains(App.USER_BUTTONS_STORE_NAME)) {
            console.warn('user_buttons store가 없습니다. 저장 실패');
            return null;
        }
        
        return new Promise((resolve, reject) => {
            const transaction = App.db.transaction([App.USER_BUTTONS_STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(App.USER_BUTTONS_STORE_NAME);
            
            const userButtonData = {
                userId: userId,
                imageId: imageId,
                buttonData: buttonData, // {src, width, height, left, top, transform}
                addedAt: buttonData.addedAt || Date.now()
            };
            
            const request = objectStore.add(userButtonData);
            
            request.onsuccess = () => {
                resolve(request.result); // 생성된 ID 반환
            };
            
            request.onerror = () => {
                console.error('사용자 단추 저장 실패:', request.error);
                reject(request.error);
            };
        });
    } catch (e) {
        console.error('Failed to save user button:', e);
        throw e;
    }
};

/**
 * 사용자의 모든 단추 정보 조회
 */
App.getUserButtons = async function(userId) {
    try {
        await App.initDB();
        
        // user_buttons store가 있는지 확인
        if (!App.db.objectStoreNames.contains(App.USER_BUTTONS_STORE_NAME)) {
            console.warn('user_buttons store가 없습니다. 빈 배열 반환');
            return [];
        }
        
        return new Promise((resolve, reject) => {
            const transaction = App.db.transaction([App.USER_BUTTONS_STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(App.USER_BUTTONS_STORE_NAME);
            const index = objectStore.index('userId');
            const request = index.getAll(userId);
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = () => {
                console.error('사용자 단추 조회 실패:', request.error);
                reject(request.error);
            };
        });
    } catch (e) {
        console.error('Failed to get user buttons:', e);
        return [];
    }
};

/**
 * 특정 이미지의 사용자 단추 정보 조회
 */
App.getUserButtonByImageId = async function(userId, imageId) {
    try {
        await App.initDB();
        
        // user_buttons store가 있는지 확인
        if (!App.db.objectStoreNames.contains(App.USER_BUTTONS_STORE_NAME)) {
            console.warn('user_buttons store가 없습니다. null 반환');
            return null;
        }
        
        return new Promise((resolve, reject) => {
            const transaction = App.db.transaction([App.USER_BUTTONS_STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(App.USER_BUTTONS_STORE_NAME);
            const index = objectStore.index('imageId');
            const request = index.getAll(imageId);
            
            request.onsuccess = () => {
                const results = request.result || [];
                // userId로 필터링
                const userButton = results.find(ub => String(ub.userId) === String(userId));
                resolve(userButton || null);
            };
            
            request.onerror = () => {
                console.error('이미지 단추 조회 실패:', request.error);
                reject(request.error);
            };
        });
    } catch (e) {
        console.error('Failed to get user button by imageId:', e);
        return null;
    }
};

/**
 * 특정 이미지의 모든 단추 정보 조회 (모든 사용자)
 */
App.getImageButtons = async function(imageId) {
    try {
        await App.initDB();
        
        // user_buttons store가 있는지 확인
        if (!App.db.objectStoreNames.contains(App.USER_BUTTONS_STORE_NAME)) {
            console.warn('user_buttons store가 없습니다. 빈 배열 반환');
            return [];
        }
        
        return new Promise((resolve, reject) => {
            const transaction = App.db.transaction([App.USER_BUTTONS_STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(App.USER_BUTTONS_STORE_NAME);
            const index = objectStore.index('imageId');
            const request = index.getAll(imageId);
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = () => {
                console.error('이미지 단추 조회 실패:', request.error);
                reject(request.error);
            };
        });
    } catch (e) {
        console.error('Failed to get image buttons:', e);
        return [];
    }
};

/**
 * IndexedDB에서 이미지 삭제
 */
App.deleteImageFromStorage = async function(imageId) {
    try {
        await App.initDB();
        return new Promise((resolve, reject) => {
            const transaction = App.db.transaction([App.STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(App.STORE_NAME);
            const request = objectStore.delete(imageId);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (e) {
        console.error('이미지 삭제 실패:', e);
        throw e;
    }
};

/**
 * 시간 오프셋 가져오기 (로컬 스토리지)
 */
App.getTimeOffset = function() {
    try {
        const offset = localStorage.getItem(App.TIME_OFFSET_KEY);
        return offset ? parseInt(offset, 10) : 0;
    } catch (e) {
        return 0;
    }
};

/**
 * 시간 오프셋 설정
 */
App.setTimeOffset = function(offsetMs) {
    try {
        localStorage.setItem(App.TIME_OFFSET_KEY, offsetMs.toString());
        if (App.updateTimeDisplay) App.updateTimeDisplay();
        if (App.updateUploadStatus) App.updateUploadStatus();
        // 보드 화면이면 이미지도 다시 로드
        if (App.elements.galleryScreen && App.elements.galleryScreen.classList.contains('active')) {
            if (App.loadVisibleImages) App.loadVisibleImages();
        }
    } catch (e) {
        console.error('Failed to set time offset:', e);
    }
};

/**
 * 시간 오프셋 초기화
 */
App.resetTimeOffset = function() {
    App.setTimeOffset(0);
};

/**
 * 서버 시간 가져오기 (실제로는 API에서 가져와야 함)
 * 개발 모드에서는 오프셋 적용
 */
App.getServerTime = function() {
    // 실제로는: return fetch('/api/time').then(r => r.json()).then(d => new Date(d.time));
    const realTime = new Date();
    const offset = App.getTimeOffset();
    return new Date(realTime.getTime() + offset);
};

/**
 * 시간 표시 업데이트
 */
App.updateTimeDisplay = function() {
    const currentTime = App.getServerTime();
    const offset = App.getTimeOffset();
    
    const currentTimeDisplay = document.getElementById('current-time-display');
    const timeOffsetDisplay = document.getElementById('time-offset-display');
    
    if (currentTimeDisplay) {
        currentTimeDisplay.textContent = currentTime.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    if (timeOffsetDisplay) {
        if (offset === 0) {
            timeOffsetDisplay.textContent = '없음';
            timeOffsetDisplay.style.color = '#666';
        } else {
            const hours = Math.floor(Math.abs(offset) / (1000 * 60 * 60));
            const minutes = Math.floor((Math.abs(offset) % (1000 * 60 * 60)) / (1000 * 60));
            const sign = offset > 0 ? '+' : '-';
            timeOffsetDisplay.textContent = `${sign}${hours}시간 ${minutes}분`;
            timeOffsetDisplay.style.color = '#f44336';
        }
    }
};

/**
 * 이미지 압축 함수
 * @param {string} dataUrl - 원본 이미지의 data URL
 * @param {number} maxWidth - 최대 너비 (기본값: 800px)
 * @param {number} quality - JPEG 품질 (0.0 ~ 1.0, 기본값: 0.7)
 * @returns {Promise<string>} 압축된 이미지의 data URL
 */
App.compressImage = function(dataUrl, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // 너비가 maxWidth보다 크면 비율에 맞춰 축소
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // JPEG로 변환 (압축)
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
};

/**
 * 화면 전환 함수
 */
App.showScreen = function(screenName) {
    const { loginScreen, signupScreen, loginFormScreen, uploadScreen, galleryScreen, myButtonsScreen } = App.elements;
    
    console.log('showScreen 호출됨:', screenName);
    console.log('화면 요소들:', { loginScreen, signupScreen, loginFormScreen, uploadScreen, galleryScreen, myButtonsScreen });
    
    // 모든 화면 비활성화
    if (loginScreen) {
        loginScreen.classList.remove('active');
        console.log('login-screen active 제거');
    }
    if (signupScreen) {
        signupScreen.classList.remove('active');
        console.log('signup-screen active 제거');
    }
    if (loginFormScreen) {
        loginFormScreen.classList.remove('active');
        console.log('login-form-screen active 제거');
    }
    if (uploadScreen) {
        uploadScreen.classList.remove('active');
    }
    const photoUploadScreen = document.getElementById('photo-upload-screen');
    if (photoUploadScreen) {
        photoUploadScreen.classList.remove('active');
    }
    if (galleryScreen) {
        galleryScreen.classList.remove('active');
    }
    if (myButtonsScreen) {
        myButtonsScreen.classList.remove('active');
    }
    
    // 선택한 화면 활성화
    if (screenName === 'login') {
        if (loginScreen) {
            loginScreen.classList.add('active');
            console.log('login-screen active 추가됨');
        }
    } else if (screenName === 'signup') {
        if (signupScreen) {
            signupScreen.classList.add('active');
            console.log('signup-screen active 추가됨');
        } else {
            console.error('signupScreen 요소를 찾을 수 없습니다!');
        }
    } else if (screenName === 'login-form') {
        if (loginFormScreen) {
            loginFormScreen.classList.add('active');
            console.log('login-form-screen active 추가됨');
        } else {
            console.error('loginFormScreen 요소를 찾을 수 없습니다!');
        }
    } else if (screenName === 'upload') {
        if (uploadScreen) {
            uploadScreen.classList.add('active');
            console.log('upload-screen active 추가됨');
        }
    } else if (screenName === 'photo-upload') {
        const photoUploadScreenEl = document.getElementById('photo-upload-screen');
        if (photoUploadScreenEl) {
            photoUploadScreenEl.classList.add('active');
            console.log('photo-upload-screen active 추가됨');
            // 사진 업로드 화면 초기화
            if (typeof App.initUploadScreen === 'function') {
                App.initUploadScreen();
            }
        }
    } else if (screenName === 'gallery') {
        if (galleryScreen) {
            galleryScreen.classList.add('active');
            console.log('gallery-screen active 추가됨');
            console.log('galleryScreen 요소:', galleryScreen);
            console.log('galleryScreen.classList:', galleryScreen.classList.toString());
        } else {
            console.error('galleryScreen 요소를 찾을 수 없습니다!');
        }
    } else if (screenName === 'my-buttons') {
        if (myButtonsScreen) {
            myButtonsScreen.classList.add('active');
            console.log('my-buttons-screen active 추가됨');
        }
    }
};

window.App = App;

