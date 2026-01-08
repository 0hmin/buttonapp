    // ============================================
// 메인 진입점 - 모든 모듈 초기화
    // ============================================
    
document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소 참조
    App.elements = {
        photoUpload: document.getElementById('photo-upload'),
        photoPreview: document.getElementById('photo-preview'),
        mobileFrame: document.querySelector('.mobile-frame'),
        uploadScreen: document.getElementById('upload-screen'),
        galleryScreen: document.getElementById('gallery-screen'),
        myButtonsScreen: document.getElementById('my-buttons-screen'),
        loginScreen: document.getElementById('login-screen'),
        signupScreen: document.getElementById('signup-screen'),
        loginFormScreen: document.getElementById('login-form-screen'),
        goToUploadBtn: document.getElementById('go-to-upload-btn'),
        goToUploadBtnFromButtons: document.getElementById('go-to-upload-btn-from-buttons'),
        viewBoardBtn: document.getElementById('view-board-btn'),
        viewButtonsBtn: document.getElementById('view-buttons-btn'),
        selectedCount: document.getElementById('selected-photos-count'),
        countSpan: document.getElementById('count'),
        uploadStatus: document.getElementById('upload-status'),
        uploadStatusText: document.getElementById('upload-status-text'),
        uploadStatusTime: document.getElementById('upload-status-time')
    };
    
    // 로그인 화면 초기화
    App.initLoginScreen();
    
    // 페이지 로드 시 로그인 상태 확인
    const currentUser = App.getCurrentUser();
    if (currentUser) {
        // 이미 로그인되어 있으면 메인 화면으로
        App.updateUserInfo();
        App.showScreen('upload');
        // IndexedDB 초기화
        (async () => {
            try {
                await App.initDB();
                await App.migrateFromLocalStorage();
                // 업로드, 갤러리, 단추보기 모듈 초기화
                if (App.initUpload) App.initUpload();
                if (App.initGallery) App.initGallery();
                if (App.initMyButtons) App.initMyButtons();
                // 메인 화면의 사진 올리기 버튼 설정
                if (App.setupGoToPhotoUploadButton) App.setupGoToPhotoUploadButton();
            } catch (e) {
                console.error('초기화 중 오류:', e);
            }
        })();
    } else {
        // 로그인 안 되어 있으면 로그인 선택 화면 표시
        App.showScreen('login');
    }
});
