// ============================================
// 내가 단추를 추가한 이미지 보기 모듈
// ============================================

if (typeof window.App === 'undefined') {
    window.App = {};
}
var App = window.App;

/**
 * 사용자가 단추를 추가한 이미지들을 로드하고 표시
 */
App.loadMyButtonImages = async function() {
    const currentUser = App.getCurrentUser();
    if (!currentUser) {
        console.log('로그인이 필요합니다.');
        return;
    }

    // 단추보기 화면을 가져와서 컨테이너 초기화 (화면에 직접 추가하기 위해)
    const myButtonsScreen = document.getElementById('my-buttons-screen');
    const container = document.getElementById('my-buttons-container');
    if (!container) {
        console.error('my-buttons-container 요소를 찾을 수 없습니다.');
        return;
    }

    // 컨테이너 초기화
    container.innerHTML = '';
    
    // 단추보기 화면도 position: relative로 설정하여 absolute 위치 지정 가능하도록
    if (myButtonsScreen) {
        myButtonsScreen.style.position = 'relative';
    }

    try {
        // API를 통해 현재 사용자의 단추 정보 조회
        const userButtons = await App.apiGetUserButtons();
        console.log('=== 단추보기 페이지 로드 ===');
        console.log('사용자 단추 개수:', userButtons.length);
        console.log('현재 사용자:', currentUser);
        console.log('사용자 단추 데이터:', userButtons);

        if (userButtons.length === 0) {
            // 단추없음.png 이미지를 오전안내.png와 같은 위치에 표시
            // 화면에 직접 추가하여 absolute 위치 지정 가능하도록
            const emptyImage = document.createElement('img');
            emptyImage.src = '단추없음.png';
            emptyImage.alt = '단추 없음';
            emptyImage.className = 'my-buttons-empty-image';
            if (myButtonsScreen) {
                myButtonsScreen.appendChild(emptyImage);
            } else {
                container.appendChild(emptyImage);
            }
            return;
        }
        
        // 이전에 추가된 빈 이미지 제거 (이미지가 있는 경우)
        const existingEmptyImage = myButtonsScreen ? myButtonsScreen.querySelector('.my-buttons-empty-image') : null;
        if (existingEmptyImage) {
            existingEmptyImage.remove();
        }

        // API를 통해 모든 이미지 정보 가져오기
        const allImages = await App.apiGetImages();
        const imageMap = new Map(allImages.map(img => [img.id, img]));
        
        // 이미지 ID별로 그룹화하고 가장 최근 날짜 사용 (서버 응답 형식: image_id, added_at)
        const imageButtonMap = new Map();
        userButtons.forEach((userButton, index) => {
            console.log(`단추 ${index + 1} 데이터:`, {
                image_id: userButton.image_id,
                imageId: userButton.imageId,
                added_at: userButton.added_at,
                added_at_type: typeof userButton.added_at,
                image_src: userButton.image_src
            });
            
            // 서버 응답 형식: image_id 또는 imageId
            const imageId = userButton.image_id || userButton.imageId;
            if (!imageId) {
                console.warn('단추에 image_id가 없음:', userButton);
                return;
            }
            
            // 서버 응답 형식: added_at (타임스탬프 또는 ISO 문자열 또는 DATETIME 문자열)
            let addedAt = 0;
            if (userButton.added_at) {
                if (typeof userButton.added_at === 'number') {
                    // 이미 타임스탬프인 경우
                    addedAt = userButton.added_at;
                } else if (typeof userButton.added_at === 'string') {
                    // 문자열인 경우 Date 객체로 변환 시도
                    // SQLite DATETIME 형식 (예: "2024-01-08 10:47:18")도 지원
                    let dateObj;
                    
                    // ISO 형식인지 확인
                    if (userButton.added_at.includes('T') || userButton.added_at.includes('Z')) {
                        // ISO 8601 형식 (예: "2024-01-08T10:47:18.000Z")
                        dateObj = new Date(userButton.added_at);
                    } else {
                        // SQLite DATETIME 형식 (예: "2024-01-08 10:47:18")
                        // 공백을 T로 바꾸고 Z를 추가하거나 그냥 Date 생성자에 전달
                        const sqliteDateTime = userButton.added_at.replace(' ', 'T');
                        dateObj = new Date(sqliteDateTime + (sqliteDateTime.includes('Z') ? '' : 'Z'));
                        
                        // 그래도 안되면 그냥 시도
                        if (isNaN(dateObj.getTime())) {
                            dateObj = new Date(userButton.added_at);
                        }
                    }
                    
                    if (!isNaN(dateObj.getTime())) {
                        addedAt = dateObj.getTime();
                    } else {
                        console.warn('날짜 파싱 실패:', userButton.added_at);
                        addedAt = Date.now(); // 기본값: 현재 시간
                    }
                } else {
                    console.warn('예상치 못한 added_at 타입:', typeof userButton.added_at, userButton.added_at);
                    addedAt = Date.now(); // 기본값: 현재 시간
                }
            } else {
                console.warn('단추에 added_at이 없음:', userButton);
                addedAt = Date.now(); // 기본값: 현재 시간
            }
            
            console.log(`단추 ${index + 1} 날짜 처리:`, {
                원본: userButton.added_at,
                원본_타입: typeof userButton.added_at,
                변환된_타임스탬프: addedAt,
                날짜_문자열: new Date(addedAt).toLocaleString('ko-KR'),
                날짜_ISO: new Date(addedAt).toISOString()
            });
            
            if (!imageButtonMap.has(imageId) || imageButtonMap.get(imageId).addedAt < addedAt) {
                imageButtonMap.set(imageId, {
                    imageId: imageId,
                    addedAt: addedAt,
                    userButton: userButton
                });
            }
        });

        // 이미지 정보와 날짜 결합
        // 이미지가 실제로 존재하는 경우만 표시 (삭제된 이미지는 제외)
        const imagesWithDates = Array.from(imageButtonMap.values())
            .map(({ imageId, addedAt, userButton }) => {
                // allImages에서 이미지 찾기 (이미지가 삭제되었으면 없을 수 있음)
                const image = imageMap.get(imageId);
                if (!image) {
                    // 이미지를 찾을 수 없으면 삭제된 이미지로 간주하고 제외
                    console.log('삭제된 이미지 필터링:', imageId, '(이미지가 삭제되어 단추보기에서 제외됨)');
                    return null;
                }
                // 이미지가 존재하는 경우만 반환
                return {
                    ...image,
                    latestButtonDate: addedAt,
                    userButton: userButton
                };
            })
            .filter(img => img !== null); // null 값 제거 (삭제된 이미지)

        // 날짜 기준으로 내림차순 정렬 (최근 것이 위에)
        imagesWithDates.sort((a, b) => b.latestButtonDate - a.latestButtonDate);

        // 날짜별로 그룹화 (같은 날짜는 하나로 묶기)
        console.log('=== 날짜별 그룹화 시작 ===');
        console.log('이미지 개수 (날짜 포함):', imagesWithDates.length);
        imagesWithDates.forEach((img, idx) => {
            console.log(`이미지 ${idx + 1} 날짜:`, {
                imageId: img.id,
                latestButtonDate: img.latestButtonDate,
                날짜_타입: typeof img.latestButtonDate,
                날짜_문자열: img.latestButtonDate ? new Date(img.latestButtonDate).toLocaleString('ko-KR') : '없음'
            });
        });
        
        const dateGroups = new Map();
        imagesWithDates.forEach((imageData, idx) => {
            if (!imageData.latestButtonDate) {
                console.warn(`이미지 ${idx + 1} (ID: ${imageData.id})에 날짜가 없음`);
                return;
            }
            
            const date = new Date(imageData.latestButtonDate);
            
            // 날짜가 유효한지 확인
            if (isNaN(date.getTime())) {
                console.error(`이미지 ${idx + 1} (ID: ${imageData.id})의 날짜가 유효하지 않음:`, imageData.latestButtonDate);
                return;
            }
            
            // 날짜를 YYYY-MM-DD 형식으로 변환 (같은 날짜로 그룹화하기 위해)
            const dateKey = date.getFullYear() + '-' + 
                           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(date.getDate()).padStart(2, '0');
            const formattedDate = date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            console.log(`이미지 ${idx + 1} 날짜 그룹화:`, {
                dateKey: dateKey,
                formattedDate: formattedDate,
                dateTimestamp: imageData.latestButtonDate
            });
            
            if (!dateGroups.has(dateKey)) {
                dateGroups.set(dateKey, {
                    dateKey: dateKey,
                    formattedDate: formattedDate,
                    dateTimestamp: imageData.latestButtonDate,
                    images: []
                });
            }
            dateGroups.get(dateKey).images.push(imageData);
        });
        
        console.log('=== 날짜 그룹 생성 완료 ===');
        console.log('날짜 그룹 개수:', dateGroups.size);
        dateGroups.forEach((group, key) => {
            console.log(`날짜 그룹 "${key}":`, {
                formattedDate: group.formattedDate,
                이미지_개수: group.images.length
            });
        });

        // 날짜 그룹을 날짜순으로 정렬 (최근 것이 위에)
        const sortedDateGroups = Array.from(dateGroups.values())
            .sort((a, b) => b.dateTimestamp - a.dateTimestamp);

        // 날짜 그룹별로 표시
        sortedDateGroups.forEach((dateGroup, groupIndex) => {
            // 날짜 헤더 (날짜bg.png 배경)
            const dateHeaderDiv = document.createElement('div');
            dateHeaderDiv.className = 'my-button-date-header';
            dateHeaderDiv.textContent = dateGroup.formattedDate;
            container.appendChild(dateHeaderDiv);

            // 같은 날짜의 이미지들
            const imagesContainer = document.createElement('div');
            imagesContainer.className = 'my-button-date-group';
            
            dateGroup.images.forEach((imageData, imageIndex) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'my-button-item';

                // 이미지 wrapper (배경과 이미지를 포함)
                const imageWrapper = document.createElement('div');
                imageWrapper.className = 'my-button-image-wrapper';

                const imageSrc = imageData.src || imageData.dataUrl;
                if (!imageSrc) {
                    console.error('이미지 src 없음:', imageData);
                    return; // src가 없으면 이미지 항목을 건너뜀
                }

                // 사진을 div로 생성하여 background-image로 사용
                const photoDiv = document.createElement('div');
                photoDiv.className = 'my-button-image';
                
                // 단추 반응 이미지 배열
                const buttonImages = [
                    '단추반응/단추1.png',
                    '단추반응/단추2.png',
                    '단추반응/단추3.png',
                    '단추반응/단추4.png',
                    '단추반응/단추5.png',
                    '단추반응/단추6.png',
                    '단추반응/단추7.png',
                    '단추반응/단추8.png',
                    '단추반응/단추9.png',
                    '단추반응/단추10.png'
                ];
                
                // 회전 각도 생성 (-5도 ~ +5도)
                const rotation = (Math.random() - 0.5) * 10; // -5 ~ +5도
                
                // 스타일 적용
                photoDiv.style.border = '11px solid #FFF';
                photoDiv.style.background = `url('${imageSrc}') lightgray 50% / cover no-repeat`;
                photoDiv.style.boxShadow = '0 0 4px 0 rgba(92, 92, 92, 0.34)';
                photoDiv.style.width = '100%';
                photoDiv.style.aspectRatio = 'auto';
                photoDiv.style.display = 'block';
                photoDiv.style.transformOrigin = 'center center';
                photoDiv.style.transform = `rotate(${rotation}deg)`;
                
                // 이미지 wrapper를 relative로 설정 (단추 위치 지정을 위해)
                imageWrapper.style.position = 'relative';
                
                // 이미지 로드 완료 시 크기 설정 및 단추 배치
                const tempImg = new Image();
                tempImg.onload = function() {
                    const imgWidth = tempImg.naturalWidth;
                    const imgHeight = tempImg.naturalHeight;
                    const aspectRatio = imgWidth / imgHeight;
                    
                    // wrapper의 너비에 맞춰 높이 계산
                    const wrapperWidth = imageWrapper.offsetWidth || 300; // 기본값 300px
                    const calculatedHeight = wrapperWidth / aspectRatio;
                    
                    photoDiv.style.height = calculatedHeight + 'px';
                    imageWrapper.style.height = calculatedHeight + 'px';
                    
                    // 단추를 사진의 꼭짓점 중 하나에 배치
                    const buttonImg = document.createElement('img');
                    const randomButtonImage = buttonImages[Math.floor(Math.random() * buttonImages.length)];
                    buttonImg.src = randomButtonImage;
                    buttonImg.className = 'reaction-button';
                    
                    // 단추 크기 (1.5배로 증가)
                    const buttonSize = (25 + Math.random() * 20) * 1.5; // 37.5-67.5px 크기
                    
                    // 홀수번째 사진은 오른쪽 꼭짓점 두 개 중 랜덤, 짝수번째 사진은 왼쪽 꼭짓점 두 개 중 랜덤
                    // 0: 왼쪽 위, 1: 오른쪽 위, 2: 오른쪽 아래, 3: 왼쪽 아래
                    let corner;
                    if (imageIndex % 2 === 0) { // 짝수번째 (0, 2, 4, ...) - 왼쪽 꼭짓점
                        corner = Math.random() < 0.5 ? 0 : 3; // 왼쪽 위 또는 왼쪽 아래
                    } else { // 홀수번째 (1, 3, 5, ...) - 오른쪽 꼭짓점
                        corner = Math.random() < 0.5 ? 1 : 2; // 오른쪽 위 또는 오른쪽 아래
                    }
                    
                    let buttonX, buttonY;
                    
                    if (corner === 0) { // 왼쪽 위
                        buttonX = -buttonSize / 2;
                        buttonY = -buttonSize / 2;
                    } else if (corner === 1) { // 오른쪽 위
                        buttonX = wrapperWidth - buttonSize / 2;
                        buttonY = -buttonSize / 2;
                    } else if (corner === 2) { // 오른쪽 아래
                        buttonX = wrapperWidth - buttonSize / 2;
                        buttonY = calculatedHeight - buttonSize / 2;
                    } else { // 왼쪽 아래
                        buttonX = -buttonSize / 2;
                        buttonY = calculatedHeight - buttonSize / 2;
                    }
                    
                    // 단추 회전 각도
                    const buttonRotation = Math.random() * 360;
                    
                    // 단추 이미지 스타일 설정
                    buttonImg.style.position = 'absolute';
                    buttonImg.style.width = buttonSize + 'px';
                    buttonImg.style.height = buttonSize + 'px';
                    buttonImg.style.left = buttonX + 'px';
                    buttonImg.style.top = buttonY + 'px';
                    buttonImg.style.zIndex = '9999';
                    buttonImg.style.pointerEvents = 'none';
                    buttonImg.style.transform = `rotate(${buttonRotation}deg)`;
                    
                    imageWrapper.appendChild(buttonImg);
                };
                tempImg.onerror = function() {
                    console.error('이미지 로드 실패:', imageSrc.substring(0, 50) + '...');
                };
                tempImg.src = imageSrc;

                imageWrapper.appendChild(photoDiv);
                itemDiv.appendChild(imageWrapper);
                imagesContainer.appendChild(itemDiv);
            });
            
            container.appendChild(imagesContainer);
        });

    } catch (error) {
        console.error('이미지 로드 실패:', error);
        const errorMessage = document.createElement('div');
        errorMessage.textContent = '이미지를 불러오는 중 오류가 발생했습니다.';
        errorMessage.style.cssText = 'text-align: center; padding: 40px; color: #f44336; font-size: 16px;';
        container.appendChild(errorMessage);
    }
};

/**
 * 단추보기 화면 초기화
 */
App.initMyButtons = function() {
    const { viewButtonsBtn, goToUploadBtnFromButtons } = App.elements;

    // 단추보기 버튼 클릭 이벤트
    if (viewButtonsBtn) {
        viewButtonsBtn.addEventListener('click', async function() {
            await App.loadMyButtonImages();
            App.showScreen('my-buttons');
        });
    }

    // 홈 버튼 클릭 이벤트 (단추보기 화면에서)
    if (goToUploadBtnFromButtons) {
        goToUploadBtnFromButtons.addEventListener('click', function() {
            App.showScreen('upload');
        });
    }
};

window.App = App;

