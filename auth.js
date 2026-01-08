// ============================================
// 로그인/회원가입 관련 모듈
// ============================================

// App 네임스페이스 사용 (이미 common.js에서 선언됨)
if (typeof window.App === 'undefined') {
    window.App = {};
}
var App = window.App;

// 상수
App.CURRENT_USER_KEY = 'current_user';
App.USERS_DATA_KEY = 'users_data'; // {닉네임: 비밀번호} 형태로 저장

/**
 * 사용자 데이터 가져오기
 */
App.getUsersData = function() {
    try {
        const data = localStorage.getItem(App.USERS_DATA_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        return {};
    }
};

/**
 * 사용자 데이터 저장
 */
App.saveUsersData = function(usersData) {
    try {
        localStorage.setItem(App.USERS_DATA_KEY, JSON.stringify(usersData));
        return true;
    } catch (e) {
        console.error('사용자 데이터 저장 실패:', e);
        return false;
    }
};

/**
 * 현재 로그인한 사용자 가져오기
 */
App.getCurrentUser = function() {
    try {
        const userStr = localStorage.getItem(App.CURRENT_USER_KEY);
        if (userStr) {
            const user = JSON.parse(userStr);
            return user.id || user.nickname; // API 응답 형식에 맞춤
        }
        return null;
    } catch (e) {
        return null;
    }
};

/**
 * 현재 사용자 설정
 */
App.setCurrentUser = function(nickname) {
    try {
        // API 응답과 호환성을 위해 객체 형태로 저장 시도
        const userStr = localStorage.getItem(App.CURRENT_USER_KEY);
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                user.nickname = nickname;
                localStorage.setItem(App.CURRENT_USER_KEY, JSON.stringify(user));
                return;
            } catch (e) {
                // JSON이 아니면 새로 생성
            }
        }
        // 기본값으로 문자열 저장 (하위 호환성)
        localStorage.setItem(App.CURRENT_USER_KEY, nickname);
    } catch (e) {
        console.error('사용자 저장 실패:', e);
    }
};

/**
 * 닉네임 중복 체크
 */
App.isNicknameTaken = function(nickname) {
    const usersData = App.getUsersData();
    return nickname in usersData;
};

/**
 * 비밀번호 검증 (숫자 4자리)
 */
App.validatePassword = function(password) {
    if (!password || password.length !== 4) {
        return { valid: false, message: '비밀번호는 숫자 4자리여야 합니다.' };
    }
    
    const pattern = /^[0-9]{4}$/;
    if (!pattern.test(password)) {
        return { valid: false, message: '비밀번호는 숫자만 입력 가능합니다.' };
    }
    
    return { valid: true };
};

/**
 * 닉네임 유효성 검사
 */
App.validateNickname = function(nickname) {
    if (!nickname || nickname.trim().length === 0) {
        return { valid: false, message: '닉네임을 입력해주세요.' };
    }
    
    const trimmed = nickname.trim();
    
    if (trimmed.length < 2) {
        return { valid: false, message: '닉네임은 2자 이상 입력해주세요.' };
    }
    
    if (trimmed.length > 20) {
        return { valid: false, message: '닉네임은 20자 이하로 입력해주세요.' };
    }
    
    // 특수문자 체크 (한글, 영문, 숫자만 허용)
    const pattern = /^[가-힣a-zA-Z0-9]+$/;
    if (!pattern.test(trimmed)) {
        return { valid: false, message: '닉네임은 한글, 영문, 숫자만 사용 가능합니다.' };
    }
    
    return { valid: true, nickname: trimmed };
};

/**
 * 로그인 오류 메시지 표시
 */
App.showLoginError = function(message) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
};

/**
 * 로그인 오류 메시지 숨기기
 */
App.hideLoginError = function() {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
};

/**
 * 회원가입 오류 메시지 표시
 */
App.showSignupError = function(message) {
    const errorDiv = document.getElementById('signup-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
};

/**
 * 회원가입 오류 메시지 숨기기
 */
App.hideSignupError = function() {
    const errorDiv = document.getElementById('signup-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
};

/**
 * 회원가입 처리
 */
App.handleSignup = async function(nickname, password) {
    // 닉네임 유효성 검사
    const nicknameValidation = App.validateNickname(nickname);
    if (!nicknameValidation.valid) {
        App.showSignupError(nicknameValidation.message);
        return false;
    }
    
    const trimmedNickname = nicknameValidation.nickname;
    
    // 비밀번호 유효성 검사
    const passwordValidation = App.validatePassword(password);
    if (!passwordValidation.valid) {
        App.showSignupError(passwordValidation.message);
        return false;
    }
    
    try {
        // API 호출
        const result = await App.apiSignup(trimmedNickname, password);
        
        if (result.success) {
            const userObj = result.user || { nickname: trimmedNickname };
            App.setCurrentUser(trimmedNickname);
            App.hideSignupError();
            
            // 모듈 초기화
            if (App.initUpload) App.initUpload();
            if (App.initGallery) App.initGallery();
            if (App.initMyButtons) App.initMyButtons();
            
            App.showScreen('upload');
            App.updateUserInfo();
            return true;
        } else {
            App.showSignupError(result.error || '회원가입에 실패했습니다.');
            return false;
        }
    } catch (error) {
        console.error('회원가입 오류:', error);
        App.showSignupError(error.message || '회원가입에 실패했습니다.');
        return false;
    }
};

/**
 * 로그인 처리
 */
App.handleLogin = async function(nickname, password) {
    // 닉네임 유효성 검사
    if (!nickname || !nickname.trim()) {
        App.showLoginError('닉네임을 입력해주세요.');
        return false;
    }
    
    const trimmedNickname = nickname.trim();
    
    // 비밀번호 검증
    const passwordValidation = App.validatePassword(password);
    if (!passwordValidation.valid) {
        App.showLoginError(passwordValidation.message);
        return false;
    }
    
    try {
        // API 호출
        const result = await App.apiLogin(trimmedNickname, password);
        
        if (result.success) {
            App.setCurrentUser(trimmedNickname);
            App.hideLoginError();
            
            // 모듈 초기화
            if (App.initUpload) App.initUpload();
            if (App.initGallery) App.initGallery();
            if (App.initMyButtons) App.initMyButtons();
            
            App.showScreen('upload');
            App.updateUserInfo();
            return true;
        } else {
            App.showLoginError(result.error || '로그인에 실패했습니다.');
            return false;
        }
    } catch (error) {
        console.error('로그인 오류:', error);
        App.showLoginError(error.message || '로그인에 실패했습니다.');
        return false;
    }
};

/**
 * 로그아웃 처리
 */
App.handleLogout = function() {
    // 로컬 스토리지에서 인증 정보 제거
    localStorage.removeItem(App.CURRENT_USER_KEY);
    localStorage.removeItem('auth_token');
    
    // 로그인 화면으로 이동
    App.showScreen('login');
    
    console.log('로그아웃 완료');
};

/**
 * 현재 사용자 정보 표시
 */
App.updateUserInfo = function() {
    const logoutBtn = document.getElementById('logout-btn');
    
    if (logoutBtn) {
        // 기존 이벤트 리스너 제거 후 새로 추가
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.replaceWith(newLogoutBtn);
        
        newLogoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            App.handleLogout();
        });
    }
};

/**
 * 로그인 화면 초기화
 */
App.initLoginScreen = function() {
    // 처음이신가요? 선택 버튼
    const signupBtn = document.getElementById('signup-btn');
    const loginBtn = document.getElementById('login-btn');
    
    console.log('버튼 찾기:', { signupBtn, loginBtn });
    
    if (signupBtn) {
        signupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('회원가입 버튼 클릭됨');
            App.showScreen('signup');
        });
    } else {
        console.error('회원가입 버튼을 찾을 수 없습니다!');
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('로그인 버튼 클릭됨');
            App.showScreen('login-form');
        });
    } else {
        console.error('로그인 버튼을 찾을 수 없습니다!');
    }
    
    // 회원가입 폼
    const signupForm = document.getElementById('signup-form');
    const signupNicknameInput = document.getElementById('signup-nickname-input');
    const signupPasswordInput = document.getElementById('signup-password-input');
    const backToChoiceBtn = document.getElementById('back-to-choice-btn');
    
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const nickname = signupNicknameInput.value.trim();
            const password = signupPasswordInput.value;
            await App.handleSignup(nickname, password);
        });
    }
    
    if (backToChoiceBtn) {
        backToChoiceBtn.addEventListener('click', function() {
            App.showScreen('login');
            App.hideSignupError();
            if (signupNicknameInput) signupNicknameInput.value = '';
            if (signupPasswordInput) signupPasswordInput.value = '';
        });
    }
    
    if (signupNicknameInput) {
        signupNicknameInput.addEventListener('input', App.hideSignupError);
    }
    if (signupPasswordInput) {
        signupPasswordInput.addEventListener('input', App.hideSignupError);
    }
    
    // 로그인 폼
    const loginForm = document.getElementById('login-form');
    const loginNicknameInput = document.getElementById('login-nickname-input');
    const loginPasswordInput = document.getElementById('login-password-input');
    const backToChoiceBtn2 = document.getElementById('back-to-choice-btn2');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const nickname = loginNicknameInput.value.trim();
            const password = loginPasswordInput.value;
            await App.handleLogin(nickname, password);
        });
    }
    
    if (backToChoiceBtn2) {
        backToChoiceBtn2.addEventListener('click', function() {
            App.showScreen('login');
            App.hideLoginError();
            if (loginNicknameInput) loginNicknameInput.value = '';
            if (loginPasswordInput) loginPasswordInput.value = '';
        });
    }
    
    if (loginNicknameInput) {
        loginNicknameInput.addEventListener('input', App.hideLoginError);
    }
    if (loginPasswordInput) {
        loginPasswordInput.addEventListener('input', App.hideLoginError);
    }
};

window.App = App;

