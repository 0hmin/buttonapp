/**
 * 시간 윈도우 기반 이미지 업로드 및 노출 시스템 유틸리티
 */

/**
 * 업로드 화면에서 보여줄 업로드 윈도우 계산
 * 업로드 윈도우: 매일 12:00 ~ 다음날 12:00
 * 이 윈도우 내에 업로드된 모든 사진이 업로드 화면에 표시됨
 * 
 * @param {Date} currentTime - 현재 시간 (서버 시간)
 * @returns {Object} { start: Date, end: Date } 업로드 윈도우 시작/종료 시간
 */
function calculateCurrentUploadWindow(currentTime) {
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
}

/**
 * 업로드 윈도우 계산 (기존 호환성 유지)
 * 업로드 윈도우: 매일 12:00 ~ 다음날 06:00
 * 
 * @param {Date} uploadTime - 업로드 시점 (서버 시간)
 * @returns {Object} { start: Date, end: Date } 업로드 윈도우 시작/종료 시간
 */
function calculateUploadWindow(uploadTime) {
    const uploadDate = new Date(uploadTime);
    const year = uploadDate.getFullYear();
    const month = uploadDate.getMonth();
    const day = uploadDate.getDate();
    const hour = uploadDate.getHours();
    
    let windowStart, windowEnd;
    
    // 현재 시간이 12:00 이전이면 전날 12:00부터 시작
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

/**
 * 노출 윈도우 계산
 * 새로운 로직: 업로드 시간 기준으로 다음날 06:00 ~ 12:00에 노출
 * 예: 12일 12:00 ~ 13일 12:00 사이 업로드 → 13일 06:00 ~ 13일 12:00 노출
 * 
 * @param {Date} uploadTime - 업로드 시점 (서버 시간)
 * @returns {Object} { start: Date, end: Date } 노출 윈도우 시작/종료 시간
 */
function calculateDisplayWindow(uploadTime) {
    const uploadDate = new Date(uploadTime);
    
    // 로컬 시간으로 변환 (한국 시간 기준)
    // getFullYear(), getMonth(), getDate(), getHours()는 로컬 시간 기준으로 반환됨
    const localYear = uploadDate.getFullYear();
    const localMonth = uploadDate.getMonth();
    const localDay = uploadDate.getDate();
    const localHour = uploadDate.getHours();
    const localMinute = uploadDate.getMinutes();
    
    let displayStart, displayEnd;
    
    // 새로운 로직: 12일 12:00 ~ 13일 12:00 사이 업로드 → 13일 06:00 ~ 13일 12:00 노출
    // 업로드 시간이 12:00 이후면 다음날 06:00 ~ 12:00에 노출
    // 업로드 시간이 12:00 이전이면 오늘 06:00 ~ 12:00에 노출 (이미 지났으면 내일)
    
    // 로컬 시간 기준으로 판단 (한국 시간)
    // localHour >= 12이면 다음날 06:00 ~ 12:00에 노출
    if (localHour >= 12) {
        // 다음날 06:00 ~ 12:00 (로컬 시간, 한국 시간)
        // new Date(year, month, day, hour, minute, second)는 로컬 시간으로 생성됨
        displayStart = new Date(localYear, localMonth, localDay + 1, 6, 0, 0, 0);
        displayEnd = new Date(localYear, localMonth, localDay + 1, 12, 0, 0, 0);
    } else {
        // 오늘 06:00 ~ 12:00 (로컬 시간, 한국 시간)
        displayStart = new Date(localYear, localMonth, localDay, 6, 0, 0, 0);
        displayEnd = new Date(localYear, localMonth, localDay, 12, 0, 0, 0);
        
        // 오늘 06:00 ~ 12:00가 이미 지났다면 내일로
        if (displayEnd <= uploadDate) {
            displayStart = new Date(localYear, localMonth, localDay + 1, 6, 0, 0, 0);
            displayEnd = new Date(localYear, localMonth, localDay + 1, 12, 0, 0, 0);
        }
    }
    
    console.log('calculateDisplayWindow:', {
        uploadTime: uploadTime.toISOString(),
        uploadTimeLocal: uploadDate.toLocaleString('ko-KR'),
        localYear: localYear,
        localMonth: localMonth,
        localDay: localDay,
        localHour: localHour,
        localMinute: localMinute,
        displayStart: displayStart.toISOString(),
        displayStartLocal: displayStart.toLocaleString('ko-KR'),
        displayEnd: displayEnd.toISOString(),
        displayEndLocal: displayEnd.toLocaleString('ko-KR')
    });
    
    return { start: displayStart, end: displayEnd };
}

/**
 * 현재 시간이 업로드 윈도우 내에 있는지 확인
 * 
 * @param {Date} currentTime - 현재 시간 (서버 시간)
 * @returns {boolean} 업로드 가능 여부
 */
function isInUploadWindow(currentTime) {
    const uploadWindow = calculateUploadWindow(currentTime);
    const now = new Date(currentTime);
    
    return now >= uploadWindow.start && now < uploadWindow.end;
}

/**
 * 현재 시간이 노출 윈도우 내에 있는지 확인
 * 
 * @param {Date} displayStart - 노출 시작 시간
 * @param {Date} displayEnd - 노출 종료 시간
 * @param {Date} currentTime - 현재 시간 (서버 시간)
 * @returns {boolean} 노출 가능 여부
 */
function isInDisplayWindow(displayStart, displayEnd, currentTime) {
    const now = new Date(currentTime);
    return now >= displayStart && now < displayEnd;
}

/**
 * 이미지 데이터에 노출 시간 정보 추가
 * 
 * @param {Object} imageData - 이미지 데이터
 * @param {Date} uploadTime - 업로드 시점 (서버 시간)
 * @returns {Object} 노출 시간 정보가 추가된 이미지 데이터
 */
function addDisplayWindowToImage(imageData, uploadTime) {
    const displayWindow = calculateDisplayWindow(uploadTime);
    
    return {
        ...imageData,
        uploaded_at: uploadTime.toISOString(),
        display_start_at: displayWindow.start.toISOString(),
        display_end_at: displayWindow.end.toISOString(),
        is_visible: false // 초기에는 숨김, 노출 시간이 되면 표시
    };
}

/**
 * 노출 가능한 이미지 필터링
 * 
 * @param {Array} images - 이미지 배열
 * @param {Date} currentTime - 현재 시간 (서버 시간)
 * @returns {Array} 노출 가능한 이미지 배열
 */
function filterVisibleImages(images, currentTime) {
    const now = new Date(currentTime);
    console.log('filterVisibleImages - 현재 시간:', now.toISOString());
    
    return images.filter(image => {
        if (!image.display_start_at || !image.display_end_at) {
            console.log('이미지에 노출 시간 정보 없음:', image);
            return false;
        }
        
        const displayStart = new Date(image.display_start_at);
        const displayEnd = new Date(image.display_end_at);
        
        const isVisible = now >= displayStart && now < displayEnd;
        
        console.log('이미지 필터링:', {
            uploaded_at: image.uploaded_at,
            display_start_at: displayStart.toISOString(),
            display_end_at: displayEnd.toISOString(),
            isVisible: isVisible,
            now: now.toISOString()
        });
        
        return isVisible;
    });
}

/**
 * 다음 업로드 윈도우 시작 시간 계산
 * 
 * @param {Date} currentTime - 현재 시간
 * @returns {Date} 다음 업로드 윈도우 시작 시간
 */
function getNextUploadWindowStart(currentTime) {
    const now = new Date(currentTime);
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const hour = now.getHours();
    
    if (hour < 12) {
        // 오늘 12:00
        return new Date(year, month, day, 12, 0, 0, 0);
    } else {
        // 내일 12:00
        return new Date(year, month, day + 1, 12, 0, 0, 0);
    }
}

/**
 * 업로드 윈도우 남은 시간 계산 (밀리초)
 * 
 * @param {Date} currentTime - 현재 시간
 * @returns {number} 남은 시간 (밀리초)
 */
function getRemainingUploadWindowTime(currentTime) {
    const uploadWindow = calculateUploadWindow(currentTime);
    const now = new Date(currentTime);
    
    if (now >= uploadWindow.start && now < uploadWindow.end) {
        return uploadWindow.end.getTime() - now.getTime();
    }
    return 0;
}

// 전역으로 노출 (브라우저 환경)
if (typeof window !== 'undefined') {
    window.calculateCurrentUploadWindow = calculateCurrentUploadWindow;
    window.addDisplayWindowToImage = addDisplayWindowToImage;
    window.filterVisibleImages = filterVisibleImages;
}

// 모듈 내보내기 (Node.js 환경)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateUploadWindow,
        calculateCurrentUploadWindow,
        calculateDisplayWindow,
        isInUploadWindow,
        isInDisplayWindow,
        addDisplayWindowToImage,
        filterVisibleImages,
        getNextUploadWindowStart,
        getRemainingUploadWindowTime
    };
}

