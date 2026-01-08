// ============================================
// 업로드 화면 관련 모듈
// ============================================

// App 네임스페이스 사용 (이미 common.js에서 선언됨)
if (typeof window.App === 'undefined') {
    window.App = {};
}
var App = window.App;

/**
 * 업로드 가능 여부 확인 및 UI 업데이트
 * 새로운 로직: 업로드는 항상 가능
 */
App.updateUploadStatus = function() {
    const { uploadStatus } = App.elements;
    if (!uploadStatus) return;
    
    // 업로드 상태 표시 숨김
    uploadStatus.style.display = 'none';
};

/**
 * 노출 시간인지 확인
 * 새로운 로직: 현재 시간이 06:00 ~ 12:00 사이인지 확인
 */
App.isInDisplayWindowTime = function(currentTime) {
    // 현재 시간이 노출 윈도우(06:00 ~ 12:00) 내에 있는지 확인
    const hour = currentTime.getHours();
    return hour >= 6 && hour < 12;
};

/**
 * 보드 보기 버튼 활성화 상태 업데이트 (더 이상 비활성화하지 않음)
 */
App.updateViewBoardButton = function() {
    const { viewBoardBtn } = App.elements;
    // 버튼은 항상 활성화 상태로 유지
    if (viewBoardBtn) {
        viewBoardBtn.disabled = false;
    }
};

/**
 * 팝업 이미지 표시
 * @param {string} imagePath - 표시할 팝업 이미지 경로 (없으면 시간에 따라 자동 선택)
 */
App.showPopup = function(imagePath) {
    const popupOverlay = document.getElementById('popup-overlay');
    const popupImage = document.querySelector('.popup-image');
    
    if (popupOverlay && popupImage) {
        // 이미지 경로가 지정되지 않으면 시간에 따라 자동 선택
        if (!imagePath) {
            // 현재 시간 가져오기
            const currentTime = App.getServerTime();
            const hour = currentTime.getHours();
            
            // 오후 12시(12:00) ~ 오전 12시(11:59) → 팝업업로드1.png
            // 오전 12시(00:00) ~ 오후 12시(11:59) → 팝업업로드2.png
            if (hour >= 12) {
                // 12:00 ~ 23:59
                popupImage.src = '팝업업로드1.png';
            } else {
                // 00:00 ~ 11:59
                popupImage.src = '팝업업로드2.png';
            }
        } else {
            // 지정된 이미지 경로 사용
            popupImage.src = imagePath;
        }
        
        popupOverlay.style.display = 'flex';
    }
};

/**
 * 팝업 이미지 닫기
 */
App.closePopup = function() {
    const popupOverlay = document.getElementById('popup-overlay');
    if (popupOverlay) {
        popupOverlay.style.display = 'none';
    }
};

/**
 * 시간 조작 패널 표시/숨김
 */
App.toggleTimePanelVisibility = function() {
    const timeControlPanel = document.getElementById('time-control-panel');
    const toggleTimePanel = document.getElementById('toggle-time-panel');
    
    if (timeControlPanel) {
        const isVisible = timeControlPanel.style.display !== 'none';
        timeControlPanel.style.display = isVisible ? 'none' : 'block';
        if (toggleTimePanel) {
            toggleTimePanel.textContent = isVisible ? '펼치기' : '접기';
        }
        try {
            localStorage.setItem(App.TIME_PANEL_VISIBLE_KEY, (!isVisible).toString());
        } catch (e) {}
    }
};

/**
 * 업로드 화면 초기화
 */
App.initUpload = function() {
    const { photoUpload, mobileFrame, selectedCount, countSpan, uploadStatus, uploadStatusText, uploadStatusTime, goToUploadBtn, viewBoardBtn } = App.elements;
    
    if (!photoUpload) return;
    
    // 시간 조작 UI 초기화
    const timeControlPanel = document.getElementById('time-control-panel');
    const toggleTimePanel = document.getElementById('toggle-time-panel');
    const resetTimeBtn = document.getElementById('reset-time-btn');
    
    // 시간 조작 버튼 이벤트 설정
    if (timeControlPanel) {
        // 오프셋 버튼들
        const timeButtons = timeControlPanel.querySelectorAll('.time-btn');
        timeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const offset = parseInt(this.dataset.offset, 10);
                const currentOffset = App.getTimeOffset();
                App.setTimeOffset(currentOffset + offset);
            });
        });
        
        // 프리셋 버튼들
        const presetButtons = timeControlPanel.querySelectorAll('.preset-btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const hour = parseInt(this.dataset.hour, 10);
                const minute = parseInt(this.dataset.minute, 10);
                
                const now = new Date();
                const targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
                
                // 오늘 해당 시간이 지났으면 내일로 설정
                if (targetTime < now) {
                    targetTime.setDate(targetTime.getDate() + 1);
                }
                
                const offset = targetTime.getTime() - now.getTime();
                App.setTimeOffset(offset);
            });
        });
        
        // 초기화 버튼
        if (resetTimeBtn) {
            resetTimeBtn.addEventListener('click', App.resetTimeOffset);
        }
        
        // 토글 버튼
        if (toggleTimePanel) {
            toggleTimePanel.addEventListener('click', App.toggleTimePanelVisibility);
        }
        
        // 패널 표시 상태 복원
        try {
            const wasVisible = localStorage.getItem(App.TIME_PANEL_VISIBLE_KEY) === 'true';
            if (wasVisible) {
                timeControlPanel.style.display = 'block';
                if (toggleTimePanel) {
                    toggleTimePanel.textContent = '접기';
                }
            }
        } catch (e) {}
        
        // 개발 모드: 시간 조작 패널 기본 표시
        if (timeControlPanel.style.display === 'none') {
            timeControlPanel.style.display = 'block';
        }
    }
    
    // 초기 업로드 상태 확인
    App.updateUploadStatus();
    App.updateTimeDisplay();
    App.updateViewBoardButton();
    
    // 안내 이미지 업데이트 및 주기적 업데이트
    App.updateGuideImage();
    setInterval(() => {
        App.updateGuideImage();
    }, 60000); // 1분마다 업데이트
    
    // 오늘 업로드된 사진 로드
    App.loadTodayUploadedPhotos();
    
    // 사진 추가 버튼 및 뒤로가기 버튼 설정 (photo-upload-screen에서만)
    App.setupAddPhotoButton();
    App.setupBackFromUploadButton();
    
    // 1분마다 업로드 상태 및 시간 표시 업데이트
    setInterval(() => {
        App.updateUploadStatus();
        App.updateTimeDisplay();
        App.updateViewBoardButton();
    }, 60000);
    
    // 업로드 화면으로 이동
    if (goToUploadBtn) {
        goToUploadBtn.addEventListener('click', function() {
            App.updateUploadStatus();
            App.showScreen('upload');
        });
    }
    
    // 사진 선택 시 처리
    photoUpload.addEventListener('change', async function(e) {
        const files = Array.from(e.target.files);
        const currentTime = App.getServerTime();
        
        // 업로드는 항상 가능 (시간 제한 없음)
        
        App.selectedPhotos = []; // 기존 선택 초기화
        
        let loadedCount = 0;
        const totalFiles = files.filter(f => f.type.startsWith('image/')).length;
        
        if (totalFiles === 0) return;
        
        files.forEach(function(file) {
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                
                reader.onload = async function(e) {
                    try {
                        // 이미지 압축
                        const compressedDataUrl = await App.compressImage(e.target.result, 800, 0.7);
                        
                        const img = new Image();
                        
                        img.onload = async function() {
                            const frameWidth = mobileFrame ? mobileFrame.offsetWidth - 40 : window.innerWidth - 40;
                            
                            // 이미지 크기 가져오기
                            const imgWidth = img.width;
                            const imgHeight = img.height;
                            
                            // 배경 크기 계산 (이미지 크기의 1.05배)
                            const bgWidth = imgWidth * 1.05;
                            const bgHeight = imgHeight * 1.05;
                            
                            console.log('배경 크기 계산 (1.05배):', {
                                imgWidth: imgWidth,
                                imgHeight: imgHeight,
                                bgWidth: bgWidth,
                                bgHeight: bgHeight,
                                widthRatio: (bgWidth / imgWidth).toFixed(3),
                                heightRatio: (bgHeight / imgHeight).toFixed(3)
                            });
                            
                            // 1차 축소: 모바일 화면에 맞게 축소
                            const widthScale = frameWidth / bgWidth;
                            const firstScale = Math.min(widthScale, 1);
                            
                            // 1차 축소된 크기
                            const firstScaledBgWidth = bgWidth * firstScale;
                            const firstScaledBgHeight = bgHeight * firstScale;
                            const firstScaledImgWidth = imgWidth * firstScale;
                            const firstScaledImgHeight = imgHeight * firstScale;
                            // 패딩은 배경 크기와 이미지 크기의 차이의 절반
                            const firstScaledPadding = (firstScaledBgWidth - firstScaledImgWidth) / 2;
                            
                            // 2차 랜덤 스케일 (0.6 ~ 0.8)
                            const randomScale = 0.6 + Math.random() * 0.2;
                            
                            // 최종 크기 계산
                            const finalBgWidth = firstScaledBgWidth * randomScale;
                            const finalBgHeight = firstScaledBgHeight * randomScale;
                            const finalImgWidth = firstScaledImgWidth * randomScale;
                            const finalImgHeight = firstScaledImgHeight * randomScale;
                            const finalPadding = firstScaledPadding * randomScale;
                            
                            // 사진 데이터 저장 (압축된 이미지 사용)
                            const photoData = {
                                src: compressedDataUrl, // 압축된 이미지 사용
                                bgWidth: finalBgWidth,
                                bgHeight: finalBgHeight,
                                imgWidth: finalImgWidth,
                                imgHeight: finalImgHeight,
                                padding: finalPadding,
                                scale: randomScale // scale 정보 저장
                            };
                            
                            App.selectedPhotos.push(photoData);
                            
                            loadedCount++;
                            
                            // 모든 사진 로드 완료 시 자동 저장
                            if (loadedCount === totalFiles) {
                                if (countSpan) countSpan.textContent = App.selectedPhotos.length;
                                if (selectedCount) selectedCount.style.display = 'block';
                                
                                // API를 통해 서버에 업로드
                                try {
                                    console.log('업로드 시작. 이미지 개수:', App.selectedPhotos.length);
                                    console.log('현재 시간:', currentTime.toISOString());
                                    
                                    // addDisplayWindowToImage 함수 확인
                                    if (typeof addDisplayWindowToImage !== 'function') {
                                        throw new Error('addDisplayWindowToImage 함수를 찾을 수 없습니다.');
                                    }
                                    
                                    // 로그인 토큰 확인
                                    const token = localStorage.getItem('auth_token');
                                    if (!token) {
                                        throw new Error('로그인이 필요합니다. 먼저 로그인해주세요.');
                                    }
                                    
                                    const uploadPromises = App.selectedPhotos.map(async (photo, index) => {
                                        console.log(`이미지 ${index + 1} 업로드 시작:`, {
                                            hasSrc: !!photo.src,
                                            imgWidth: photo.imgWidth,
                                            imgHeight: photo.imgHeight,
                                            scale: photo.scale
                                        });
                                        
                                        try {
                                            const imageWithWindow = addDisplayWindowToImage(photo, currentTime);
                                            console.log(`이미지 ${index + 1} 노출 시간:`, {
                                                display_start_at: imageWithWindow.display_start_at,
                                                display_end_at: imageWithWindow.display_end_at
                                            });
                                            
                                            const imageData = {
                                                width: Math.round(photo.imgWidth),
                                                height: Math.round(photo.imgHeight),
                                                scale: photo.scale || 0.7, // photoData에 저장된 scale 사용
                                                uploadedAt: currentTime.toISOString(), // 클라이언트 시간 기준
                                                displayStartAt: imageWithWindow.display_start_at,
                                                displayEndAt: imageWithWindow.display_end_at
                                            };
                                            
                                            const result = await App.apiUploadImage(photo.src, imageData);
                                            console.log(`이미지 ${index + 1} 업로드 성공:`, result);
                                            return result;
                                        } catch (err) {
                                            console.error(`이미지 ${index + 1} 업로드 실패:`, err);
                                            throw err;
                                        }
                                    });
                                    
                                    const uploadResults = await Promise.all(uploadPromises);
                                    
                                    console.log('업로드 완료. 업로드된 이미지 개수:', uploadResults.length);
                                    console.log('업로드 결과:', uploadResults);
                                    
                                    // 업로드된 이미지 ID로 직접 조회 테스트
                                    if (uploadResults.length > 0 && uploadResults[0].image && uploadResults[0].image.id) {
                                        console.log('=== 업로드된 이미지 직접 조회 테스트 ===');
                                        console.log('업로드된 이미지 ID:', uploadResults[0].image.id);
                                        
                                        try {
                                            const testToken = localStorage.getItem('auth_token');
                                            const testResponse = await fetch(`${App.API_BASE_URL}/api/images`, {
                                                method: 'GET',
                                                headers: {
                                                    'Authorization': `Bearer ${testToken}`,
                                                    'Content-Type': 'application/json'
                                                }
                                            });
                                            const testResult = await testResponse.json();
                                            console.log('직접 조회 결과 - 전체 이미지 개수:', testResult.images ? testResult.images.length : 0);
                                            
                                            const uploadedImage = testResult.images ? testResult.images.find(img => img.id === uploadResults[0].image.id) : null;
                                            console.log('업로드한 이미지가 목록에 있는지:', !!uploadedImage);
                                            if (uploadedImage) {
                                                console.log('업로드한 이미지 데이터:', uploadedImage);
                                            } else {
                                                console.error('업로드한 이미지를 목록에서 찾을 수 없습니다!');
                                            }
                                        } catch (testError) {
                                            console.error('직접 조회 테스트 실패:', testError);
                                        }
                                    }
                                    
                                    // 업로드 완료 후 팝업 표시
                                    App.showPopup();
                                    
                                    // 오늘 업로드된 사진 목록 새로고침
                                    await App.loadTodayUploadedPhotos();
                                    
                                    // 선택 초기화
                                    App.selectedPhotos = [];
                                    if (countSpan) countSpan.textContent = '0';
                                    if (selectedCount) selectedCount.style.display = 'none';
                                    photoUpload.value = '';
                                } catch (error) {
                                    console.error('이미지 업로드 실패:', error);
                                    console.error('에러 상세:', {
                                        message: error.message,
                                        stack: error.stack,
                                        name: error.name
                                    });
                                    alert('이미지 업로드에 실패했습니다: ' + (error.message || error));
                                }
                            }
                        };
                        
                        img.src = compressedDataUrl; // 압축된 이미지 사용
                    } catch (error) {
                        console.error('이미지 처리 중 오류:', error);
                        alert('이미지 처리 중 오류가 발생했습니다.');
                    }
                };
                
                reader.readAsDataURL(file);
            }
        });
    });
    
    // 보드 보기 버튼 클릭 시
    if (viewBoardBtn) {
        viewBoardBtn.addEventListener('click', async function() {
            const currentTime = App.getServerTime();
            const canView = App.isInDisplayWindowTime(currentTime);
            
            if (!canView) {
                // 노출 시간이 아니면 팝업 표시 (팝업.png 사용)
                App.showPopup('팝업.png');
                return;
            }
            
            console.log('보드 보기 버튼 클릭');
            
            // 기존 사진 제거
            const { photoPreview } = App.elements;
            if (photoPreview) {
                photoPreview.innerHTML = '';
                console.log('기존 사진 제거 완료');
            } else {
                console.error('photoPreview 요소를 찾을 수 없습니다!');
            }
            
            // 저장된 이미지 중 노출 가능한 것만 로드
            console.log('App 객체:', App);
            console.log('App.loadVisibleImages 함수 존재 여부:', !!App.loadVisibleImages);
            console.log('App 객체의 모든 속성:', Object.keys(App));
            
            // loadVisibleImages가 없으면 직접 호출 시도
            if (typeof App.loadVisibleImages === 'function') {
                console.log('loadVisibleImages 호출 시작');
                await App.loadVisibleImages();
                console.log('loadVisibleImages 호출 완료');
            } else {
                console.error('loadVisibleImages 함수가 없습니다!');
                console.error('App 객체 상태:', App);
                // 대안: 직접 이미지 로드 시도
                if (typeof App.apiGetImages === 'function') {
                    console.log('apiGetImages를 직접 호출 시도');
                    const allImages = await App.apiGetImages();
                    console.log('로드된 이미지 개수:', allImages.length);
                    
                    // 현재 시간 기준으로 노출 가능한 이미지 필터링
                    const currentTime = App.getServerTime();
                    console.log('현재 시간:', currentTime.toISOString());
                    
                    // filterVisibleImages 함수가 있으면 사용, 없으면 직접 필터링
                    let visibleImages = [];
                    if (typeof App.filterVisibleImages === 'function') {
                        visibleImages = App.filterVisibleImages(allImages, currentTime);
                    } else {
                        // 직접 필터링
                        visibleImages = allImages.filter(img => {
                            const displayStart = new Date(img.display_start_at);
                            const displayEnd = new Date(img.display_end_at);
                            const now = new Date(currentTime);
                            return now >= displayStart && now < displayEnd;
                        });
                    }
                    
                    console.log('노출 가능한 이미지 개수:', visibleImages.length);
                    
                    if (visibleImages.length > 0) {
                        App.selectedPhotos = visibleImages;
                        console.log('placePhotos 함수 존재 여부:', typeof App.placePhotos === 'function');
                        if (typeof App.placePhotos === 'function') {
                            console.log('placePhotos 직접 호출');
                            await App.placePhotos();
                        } else {
                            console.error('placePhotos 함수가 없습니다!');
                            // 최소한 이미지 데이터는 표시
                            const { photoPreview } = App.elements;
                            if (photoPreview) {
                                photoPreview.innerHTML = '<div style="padding: 20px; color: white;">이미지가 로드되었지만 표시할 수 없습니다. (placePhotos 함수 없음)</div>';
                            }
                        }
                    } else {
                        console.log('노출 가능한 이미지가 없습니다.');
                        const { photoPreview } = App.elements;
                        if (photoPreview) {
                            photoPreview.innerHTML = '<div style="padding: 20px; color: white;">현재 시간에 노출 가능한 이미지가 없습니다.</div>';
                        }
                    }
                }
            }
            
            // 갤러리 화면으로 이동
            App.showScreen('gallery');
        });
    }
    
    // 팝업 닫기 버튼 클릭 시
    const closePopupBtn = document.getElementById('close-popup-btn');
    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', App.closePopup);
    }
    
    // 팝업 오버레이 클릭 시 닫기
    const popupOverlay = document.getElementById('popup-overlay');
    if (popupOverlay) {
        popupOverlay.addEventListener('click', function(e) {
            if (e.target === popupOverlay) {
                App.closePopup();
            }
        });
    }
};

/**
 * 안내 이미지 업데이트 (시간에 따라)
 */
App.updateGuideImage = function() {
    const guideImage = document.getElementById('upload-guide-image');
    if (!guideImage) return;
    
    const currentTime = App.getServerTime();
    const hour = currentTime.getHours();
    
    // 오후 12시(12:00) ~ 오전 12시(11:59) → 오후안내.png
    // 오전 12시(00:00) ~ 오후 12시(11:59) → 오전안내.png
    let imageSrc;
    if (hour >= 12) {
        // 12:00 ~ 23:59
        imageSrc = '오후안내.png';
    } else {
        // 00:00 ~ 11:59
        imageSrc = '오전안내.png';
    }
    
    if (!guideImage.querySelector('img')) {
        const img = document.createElement('img');
        img.src = imageSrc;
        img.alt = '안내';
        guideImage.appendChild(img);
    } else {
        guideImage.querySelector('img').src = imageSrc;
    }
};

/**
 * 현재 시간 기준으로 업로드 윈도우 계산 (업로드 화면용)
 * 12:00 ~ 다음날 12:00 윈도우 내에 업로드된 모든 사진을 표시
 */
App.calculateCurrentUploadWindow = function(currentTime) {
    const currentDate = new Date(currentTime);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();
    const hour = currentDate.getHours();
    
    let windowStart, windowEnd;
    
    // 현재 시간이 12:00 이전이면 전날 12:00부터 시작
    if (hour < 12) {
        // 전날 12:00 ~ 오늘 12:00
        windowStart = new Date(year, month, day - 1, 12, 0, 0, 0);
        windowEnd = new Date(year, month, day, 12, 0, 0, 0);
    } else {
        // 오늘 12:00 ~ 내일 12:00
        windowStart = new Date(year, month, day, 12, 0, 0, 0);
        windowEnd = new Date(year, month, day + 1, 12, 0, 0, 0);
    }
    
    return { start: windowStart, end: windowEnd };
};

/**
 * 업로드 화면에서 보여줄 사진 로드
 * 사진보기 페이지에서 노출이 끝나지 않은 사진만 표시 (display_end_at이 지나면 안 보임)
 * 즉, 업로드 페이지도 24시간마다 갱신되는 느낌
 */
App.loadTodayUploadedPhotos = async function() {
    const photosList = document.getElementById('uploaded-photos-list');
    const emptyPlaceholder = document.getElementById('empty-photo-placeholder');
    
    if (!photosList) return;
    
    try {
        // 현재 시간
        const currentTime = App.getServerTime();
        
        console.log('=== loadTodayUploadedPhotos 시작 ===');
        console.log('현재 시간:', currentTime.toISOString(), '로컬:', currentTime.toLocaleString('ko-KR'));
        
        // 모든 이미지 가져오기 - 직접 fetch로 디버깅
        let allImages = [];
        try {
            console.log('=== apiGetImages 호출 전 ===');
            console.log('API_BASE_URL:', App.API_BASE_URL);
            
            // 직접 API 호출해서 응답 확인
            const token = localStorage.getItem('auth_token');
            console.log('토큰 존재:', !!token);
            
            // 토큰이 없으면 경고
            if (!token) {
                console.warn('⚠️ 인증 토큰이 없습니다. 로그인이 필요합니다.');
                alert('이미지 목록을 조회하려면 로그인이 필요합니다.');
                if (emptyPlaceholder) {
                    emptyPlaceholder.style.display = 'block';
                }
                return;
            }
            if (token) {
                console.log('토큰 앞 20자:', token.substring(0, 20));
            }
            
            const directResponse = await fetch(`${App.API_BASE_URL}/api/images`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('=== 직접 fetch 응답 ===');
            console.log('상태 코드:', directResponse.status, directResponse.statusText);
            console.log('응답 OK:', directResponse.ok);
            
            if (!directResponse.ok) {
                const errorText = await directResponse.text();
                console.error('에러 응답:', errorText);
                throw new Error(`API 호출 실패: ${directResponse.status} ${errorText}`);
            }
            
            const directResult = await directResponse.json();
            console.log('=== 직접 fetch 응답 본문 ===');
            console.log('응답 전체:', directResult);
            console.log('images 타입:', typeof directResult.images);
            console.log('images 배열 여부:', Array.isArray(directResult.images));
            console.log('images 개수:', directResult.images ? directResult.images.length : 0);
            
            if (directResult.images && directResult.images.length > 0) {
                console.log('첫 번째 이미지:', directResult.images[0]);
            }
            
            // apiGetImages 함수 사용
            allImages = await App.apiGetImages();
            console.log('=== 업로드 페이지 사진 필터링 디버그 ===');
            console.log('전체 이미지 수:', allImages.length);
        } catch (error) {
            console.error('=== 이미지 목록 조회 실패 ===');
            console.error('에러 메시지:', error.message);
            console.error('에러 전체:', error);
            alert('이미지 목록을 가져오는 중 오류가 발생했습니다: ' + error.message);
            // 에러 발생 시 빈 사진 placeholder 표시
            if (emptyPlaceholder) {
                emptyPlaceholder.style.display = 'block';
            }
            return;
        }
        
        // 현재 사용자 ID 가져오기
        const currentUser = App.getCurrentUser();
        console.log('=== 업로드 페이지 사용자 필터링 ===');
        console.log('현재 사용자:', currentUser);
        
        // 자신이 업로드한 사진만 필터링 + display_end_at이 아직 지나지 않은 사진만 표시
        // 사진보기 페이지에서 노출이 끝나면 업로드 페이지에서도 안 보임
        const windowImages = allImages.filter(img => {
            // 1. 자신이 업로드한 사진인지 확인
            const isMyImage = img.user_id && String(img.user_id) === String(currentUser);
            if (!isMyImage) {
                console.log('다른 사용자의 이미지 제외:', {
                    id: img.id,
                    image_user_id: img.user_id,
                    current_user: currentUser
                });
                return false;
            }
            
            // 2. display_end_at이 아직 지나지 않은 사진인지 확인
            if (img.display_end_at) {
                const displayEnd = new Date(img.display_end_at);
                const isVisible = currentTime < displayEnd;
                console.log('내 이미지 필터링:', {
                    id: img.id,
                    uploaded_at: img.uploaded_at,
                    display_end_at: img.display_end_at,
                    displayEnd_local: displayEnd.toLocaleString('ko-KR'),
                    currentTime_local: currentTime.toLocaleString('ko-KR'),
                    isVisible: isVisible
                });
                return isVisible;
            }
            return false;
        }).sort((a, b) => {
            // 최신 업로드 사진이 먼저 오도록 정렬 (내림차순)
            const timeA = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
            const timeB = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
            return timeB - timeA;
        });
        
        console.log('필터링된 이미지 수:', windowImages.length);
        
        // 기존 목록 초기화
        photosList.innerHTML = '';
        
        if (windowImages.length === 0) {
            // 사진이 없으면 빈 사진 placeholder 표시
            if (emptyPlaceholder) {
                emptyPlaceholder.style.display = 'block';
            }
        } else {
            // 사진이 있으면 빈 사진 placeholder 숨김
            if (emptyPlaceholder) {
                emptyPlaceholder.style.display = 'none';
            }
            
            // 업로드 윈도우 내에 업로드된 사진 표시
            windowImages.forEach(image => {
                const photoItem = document.createElement('div');
                photoItem.className = 'uploaded-photo-item';
                photoItem.dataset.imageId = image.id;
                
                const img = document.createElement('img');
                img.src = image.image_url || image.url;
                img.alt = '업로드된 사진';
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-photo-btn';
                deleteBtn.textContent = '×';
                deleteBtn.addEventListener('click', async function(e) {
                    e.stopPropagation();
                    if (confirm('이 사진을 삭제하시겠습니까?')) {
                        try {
                            // 서버에서 삭제
                            await App.apiDeleteImage(image.id);
                            
                            // IndexedDB에서도 삭제
                            try {
                                await App.deleteImageFromStorage(image.id);
                            } catch (storageError) {
                                console.warn('IndexedDB 삭제 실패 (무시 가능):', storageError);
                            }
                            
                            // DOM에서 제거
                            photoItem.remove();
                            
                            // 사진이 모두 삭제되면 빈 사진 placeholder 표시
                            const remainingPhotos = photosList.querySelectorAll('.uploaded-photo-item');
                            if (remainingPhotos.length === 0 && emptyPlaceholder) {
                                emptyPlaceholder.style.display = 'block';
                            }
                        } catch (error) {
                            console.error('사진 삭제 실패:', error);
                            alert('사진 삭제에 실패했습니다: ' + (error.message || error));
                        }
                    }
                });
                
                photoItem.appendChild(img);
                photoItem.appendChild(deleteBtn);
                photosList.appendChild(photoItem);
            });
        }
    } catch (error) {
        console.error('오늘 업로드된 사진 로드 실패:', error);
        // 에러 발생 시 빈 사진 placeholder 표시
        if (emptyPlaceholder) {
            emptyPlaceholder.style.display = 'block';
        }
    }
};

/**
 * 사진 추가 버튼 클릭 핸들러
 */
App.setupAddPhotoButton = function() {
    const addPhotoBtn = document.getElementById('add-photo-btn');
    const photoUpload = document.getElementById('photo-upload');
    
    if (!addPhotoBtn || !photoUpload) return;
    
    addPhotoBtn.addEventListener('click', function() {
        photoUpload.click();
    });
};

/**
 * 뒤로가기 버튼 클릭 핸들러
 */
App.setupBackFromUploadButton = function() {
    const backBtn = document.getElementById('back-from-upload-btn');
    
    if (!backBtn) return;
    
    backBtn.addEventListener('click', function() {
        // 메인 화면(upload-screen)으로 이동
        App.showScreen('upload');
    });
};

/**
 * 사진 올리기 버튼 클릭 핸들러 (메인 화면에서)
 */
App.setupGoToPhotoUploadButton = function() {
    const goToPhotoUploadBtn = document.getElementById('go-to-photo-upload-btn');
    
    if (!goToPhotoUploadBtn) return;
    
    goToPhotoUploadBtn.addEventListener('click', function() {
        // 사진 업로드 페이지로 이동
        App.showScreen('photo-upload');
    });
};

/**
 * 업로드 화면 표시 시 초기화
 */
App.initUploadScreen = function() {
    // 안내 이미지 업데이트
    App.updateGuideImage();
    
    // 오늘 업로드된 사진 로드
    App.loadTodayUploadedPhotos();
};

window.App = App;

