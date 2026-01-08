// ============================================
// API 통신 모듈
// ============================================

if (typeof window.App === 'undefined') {
    window.App = {};
}
var App = window.App;

// API 기본 URL (환경에 따라 변경)
App.API_BASE_URL = window.location.origin;

// API 헬퍼 함수
App.apiRequest = async function(endpoint, options = {}) {
    const token = localStorage.getItem('auth_token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log(`=== API 요청: ${endpoint} ===`);
    console.log('토큰 존재:', !!token);
    console.log('요청 옵션:', { method: options.method || 'GET', headers });
    
    const response = await fetch(`${App.API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });
    
    console.log(`=== API 응답: ${endpoint} ===`);
    console.log('상태 코드:', response.status, response.statusText);
    console.log('응답 OK:', response.ok);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('에러 응답 본문:', errorText);
        let error;
        try {
            error = JSON.parse(errorText);
        } catch (e) {
            error = { error: errorText || '서버 오류가 발생했습니다.' };
        }
        throw new Error(error.error || '요청 실패');
    }
    
    const result = await response.json();
    console.log('응답 본문:', result);
    return result;
};

// 회원가입
App.apiSignup = async function(nickname, password) {
    const result = await App.apiRequest('/api/signup', {
        method: 'POST',
        body: JSON.stringify({ nickname, password })
    });
    
    if (result.token) {
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('current_user', JSON.stringify(result.user));
    }
    
    return result;
};

// 로그인
App.apiLogin = async function(nickname, password) {
    const result = await App.apiRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify({ nickname, password })
    });
    
    if (result.token) {
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('current_user', JSON.stringify(result.user));
    }
    
    return result;
};

// DataURL을 Blob으로 변환
App.dataURLtoBlob = function(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

// 이미지 업로드
App.apiUploadImage = async function(dataURL, imageData) {
    // DataURL을 Blob으로 변환
    const blob = App.dataURLtoBlob(dataURL);
    const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('width', imageData.width);
    formData.append('height', imageData.height);
    formData.append('scale', imageData.scale);
    if (imageData.uploadedAt) formData.append('uploadedAt', imageData.uploadedAt);
    if (imageData.displayStartAt) formData.append('displayStartAt', imageData.displayStartAt);
    if (imageData.displayEndAt) formData.append('displayEndAt', imageData.displayEndAt);
    
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${App.API_BASE_URL}/api/images/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '서버 오류가 발생했습니다.' }));
        throw new Error(error.error || '업로드 실패');
    }
    
    return response.json();
};

// 이미지 목록 조회
App.apiGetImages = async function() {
    try {
        console.log('=== apiGetImages 호출 시작 ===');
        const token = localStorage.getItem('auth_token');
        console.log('인증 토큰 존재:', !!token);
        
        const result = await App.apiRequest('/api/images', {
            method: 'GET'
        });
        
        console.log('=== API 응답 받음 ===');
        console.log('응답 타입:', typeof result);
        console.log('응답 전체:', result);
        console.log('result.images 존재:', !!result.images);
        console.log('result.images 타입:', Array.isArray(result.images) ? '배열' : typeof result.images);
        console.log('result.images 길이:', result.images ? result.images.length : 0);
        
        if (result.images && result.images.length > 0) {
            console.log('첫 번째 이미지 데이터:', result.images[0]);
        }
        
        // 서버 응답을 클라이언트 형식으로 변환
        const images = (result.images || []).map(img => ({
            id: img.id,
            src: img.src, // 서버 URL
            url: img.url || img.src, // url 또는 src
            image_url: img.image_url || img.url || img.src, // image_url 또는 url 또는 src
            width: img.width,
            height: img.height,
            scale: img.scale,
            user_id: img.user_id, // 사용자 ID 포함
            uploaded_at: img.uploaded_at,
            display_start_at: img.display_start_at,
            display_end_at: img.display_end_at,
            // 클라이언트에서 계산되는 값들 (서버에서 가져온 기본값 사용)
            bgWidth: (img.width || 100) * 1.1, // 기본 배경 크기
            bgHeight: (img.height || 100) * 1.1,
            imgWidth: img.width || 100,
            imgHeight: img.height || 100,
            padding: ((img.width || 100) * 1.1 - (img.width || 100)) / 2
        }));
        
        console.log('=== 변환된 이미지 개수 ===', images.length);
        return images;
    } catch (error) {
        console.error('=== apiGetImages 에러 ===');
        console.error('에러 메시지:', error.message);
        console.error('에러 전체:', error);
        throw error;
    }
};

// 이미지 삭제
App.apiDeleteImage = async function(imageId) {
    const result = await App.apiRequest(`/api/images/${imageId}`, {
        method: 'DELETE'
    });
    return result;
};

// 단추 추가
App.apiAddButton = async function(imageId, buttonData) {
    const result = await App.apiRequest('/api/buttons', {
        method: 'POST',
        body: JSON.stringify({ imageId, buttonData })
    });
    return result;
};

// 이미지의 단추 목록 조회
App.apiGetImageButtons = async function(imageId) {
    const result = await App.apiRequest(`/api/images/${imageId}/buttons`, {
        method: 'GET'
    });
    return result.buttons || [];
};

// 사용자가 추가한 단추 목록 조회
App.apiGetUserButtons = async function() {
    try {
        console.log('=== apiGetUserButtons 호출 시작 ===');
        const result = await App.apiRequest('/api/users/buttons', {
            method: 'GET'
        });
        
        console.log('=== apiGetUserButtons 응답 ===');
        console.log('응답 전체:', result);
        console.log('userButtons 존재:', !!result.userButtons);
        console.log('userButtons 타입:', Array.isArray(result.userButtons) ? '배열' : typeof result.userButtons);
        console.log('userButtons 개수:', result.userButtons ? result.userButtons.length : 0);
        
        if (result.userButtons && result.userButtons.length > 0) {
            console.log('첫 번째 단추 데이터:', result.userButtons[0]);
            console.log('첫 번째 단추의 added_at:', result.userButtons[0].added_at);
            console.log('첫 번째 단추의 added_at 타입:', typeof result.userButtons[0].added_at);
        }
        
        return result.userButtons || [];
    } catch (error) {
        console.error('=== apiGetUserButtons 에러 ===');
        console.error('에러 메시지:', error.message);
        console.error('에러 전체:', error);
        throw error;
    }
};

// 특정 이미지에 현재 사용자가 추가한 단추 조회 (중복 체크용)
App.apiGetUserButtonByImageId = async function(imageId) {
    try {
        const buttons = await App.apiGetImageButtons(imageId);
        const currentUser = App.getCurrentUser();
        if (!currentUser) return null;
        
        // 현재 사용자의 단추 찾기
        const userButton = buttons.find(btn => String(btn.userId) === String(currentUser));
        return userButton || null;
    } catch (error) {
        console.error('단추 조회 실패:', error);
        return null;
    }
};

window.App = App;
