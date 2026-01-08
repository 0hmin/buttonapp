// ============================================
// 갤러리 화면 관련 모듈
// ============================================

// App 네임스페이스 사용 (이미 common.js에서 선언됨)
if (typeof window.App === 'undefined') {
    window.App = {};
}
var App = window.App;

// 모든 wrapper 요소들을 추적하는 배열
App.allWrappers = [];

/**
 * 고유 ID 생성
 */
App.generateImageId = function() {
    return 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

/**
 * 이미지 위치/크기 정보를 localStorage에 저장
 */
App.saveImageLayout = function(imageId, layout) {
    try {
        const key = `image_layout_${imageId}`;
        localStorage.setItem(key, JSON.stringify(layout));
    } catch (e) {
        console.error('이미지 레이아웃 저장 실패:', e);
    }
};

/**
 * 이미지 위치/크기 정보를 localStorage에서 로드
 */
App.loadImageLayout = function(imageId) {
    try {
        const key = `image_layout_${imageId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('이미지 레이아웃 로드 실패:', e);
    }
    return null;
};

/**
 * 기존 이미지의 노출 시간 재계산 (API 기반으로 변경됨 - 서버에서 관리)
 * 서버에서 이미 노출 시간을 관리하므로 클라이언트에서 재계산 불필요
 */
App.recalculateDisplayWindows = async function() {
    // API 기반으로 변경되었으므로 서버에서 노출 시간을 관리
    // 클라이언트에서 재계산 불필요
};

/**
 * 두 사각형이 겹치거나 간격이 부족한지 확인
 * @param {Object} rect1 - 첫 번째 사각형 {left, top, right, bottom}
 * @param {Object} rect2 - 두 번째 사각형 {left, top, right, bottom}
 * @param {number} minSpacing - 최소 간격 (px)
 * @returns {boolean} 겹치거나 간격이 부족하면 true
 */
App.isOverlappingOrTooClose = function(rect1, rect2, minSpacing) {
    // 간격을 고려하여 확장된 영역
    const expanded1 = {
        left: rect1.left - minSpacing,
        top: rect1.top - minSpacing,
        right: rect1.right + minSpacing,
        bottom: rect1.bottom + minSpacing
    };
    
    // 겹치는지 확인 (확장된 영역이 겹치면 간격 부족)
    return !(expanded1.right < rect2.left || 
             expanded1.left > rect2.right || 
             expanded1.bottom < rect2.top || 
             expanded1.top > rect2.bottom);
};

/**
 * 사진들이 겹치거나 간격이 부족한지 확인
 */
App.hasCollision = function(newRect, existingRects, minSpacing) {
    for (let i = 0; i < existingRects.length; i++) {
        if (App.isOverlappingOrTooClose(newRect, existingRects[i], minSpacing)) {
            return true;
        }
    }
    return false;
};

/**
 * 두 사각형의 겹치는 면적을 계산
 * @param {Object} rect1 - 첫 번째 사각형 {left, top, right, bottom, width, height}
 * @param {Object} rect2 - 두 번째 사각형 {left, top, right, bottom, width, height}
 * @returns {number} 겹치는 면적 (px²)
 */
App.calculateOverlapArea = function(rect1, rect2) {
    const overlapLeft = Math.max(rect1.left, rect2.left);
    const overlapTop = Math.max(rect1.top, rect2.top);
    const overlapRight = Math.min(rect1.right, rect2.right);
    const overlapBottom = Math.min(rect1.bottom, rect2.bottom);
    
    if (overlapRight <= overlapLeft || overlapBottom <= overlapTop) {
        return 0; // 겹치지 않음
    }
    
    return (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
};

/**
 * 새 이미지가 기존 이미지들과의 겹침이 허용 범위 내인지 확인
 * 겹치는 면적이 각 사진 면적의 25%를 초과하면 안 됨
 * @param {Object} newRect - 새로운 사각형 {left, top, right, bottom, width, height}
 * @param {Array} existingRects - 기존 사각형들의 배열
 * @returns {boolean} 허용 범위 내면 true, 초과하면 false
 */
App.isOverlapWithinLimit = function(newRect, existingRects) {
    const newArea = newRect.width * newRect.height;
    const maxOverlapArea = newArea * 0.25; // 25% 제한
    
    for (let i = 0; i < existingRects.length; i++) {
        const existingRect = existingRects[i];
        const existingArea = existingRect.width * existingRect.height;
        const existingMaxOverlapArea = existingArea * 0.25;
        
        const overlapArea = App.calculateOverlapArea(newRect, existingRect);
        
        // 새 이미지의 25%를 초과하거나 기존 이미지의 25%를 초과하면 안 됨
        if (overlapArea > maxOverlapArea || overlapArea > existingMaxOverlapArea) {
            return false;
        }
    }
    
    return true;
};

/**
 * 앵커 포인트 기반 이미지 배치 시스템
 * - 앵커 포인트를 기준으로 사진 배치
 * - 전체 보드는 세로 스크롤 없음, 가로 방향으로만 확장
 * - 앵커는 row별로 가로 방향(x)으로만 증가
 * - 사진은 반드시 하나의 앵커에 배치
 * - 사진의 width는 250px ~ 300px 사이에서 랜덤
 * - height는 auto로 비율 유지
 * - 사진 위치는 앵커 기준으로 약간의 랜덤 오프셋
 */

/**
 * Row 기반 앵커 포인트 정의
 * @param {number} containerHeight - 컨테이너 높이
 * @returns {Array} row 배열, 각 row는 {y, yOffset, anchors} 형태
 */
App.defineAnchorRows = function(containerHeight) {
    const rows = [];
    const rowCount = 3; // row 개수 (화면 높이에 맞춰 조정 가능)
    const yOffsetRange = 30; // y 오프셋 랜덤 범위 (±15px)
    
    // 홈버튼 위치 및 높이 (동적으로 계산)
    const homeButtonTop = 10; // 홈버튼 top 위치 (px)
    let homeButtonHeight = null; // 실제 높이를 가져와야 함
    
    // 홈버튼 요소 찾기 (gallery-screen 내의 홈버튼)
    const homeButton = document.getElementById('go-to-upload-btn');
    if (homeButton) {
        // 1순위: 버튼 요소 자체의 높이 확인 (이미지가 로드되어 렌더링된 경우)
        if (homeButton.offsetHeight > 0) {
            homeButtonHeight = homeButton.offsetHeight;
        } else {
            // 2순위: 버튼 내부 이미지의 높이 확인
            const homeButtonImage = homeButton.querySelector('.home-button-image');
            if (homeButtonImage) {
                // 이미지가 로드되어 있으면 실제 높이 사용
                if (homeButtonImage.offsetHeight > 0) {
                    homeButtonHeight = homeButtonImage.offsetHeight;
                } else if (homeButtonImage.complete && homeButtonImage.naturalHeight > 0) {
                    // 이미지가 로드되었지만 offsetHeight가 0인 경우
                    // naturalHeight를 width 85px 기준으로 비율 계산
                    const naturalWidth = homeButtonImage.naturalWidth;
                    const naturalHeight = homeButtonImage.naturalHeight;
                    if (naturalWidth > 0) {
                        // width가 85px일 때의 높이 계산
                        homeButtonHeight = (85 / naturalWidth) * naturalHeight;
                    } else {
                        homeButtonHeight = naturalHeight;
                    }
                }
            }
        }
        
        // 디버깅: 홈버튼 크기 확인
        if (homeButtonHeight) {
            console.log('홈버튼 크기 확인:', {
                버튼offsetHeight: homeButton.offsetHeight,
                이미지offsetHeight: homeButton.querySelector('.home-button-image')?.offsetHeight,
                이미지naturalHeight: homeButton.querySelector('.home-button-image')?.naturalHeight,
                이미지naturalWidth: homeButton.querySelector('.home-button-image')?.naturalWidth,
                사용된높이: homeButtonHeight
            });
        } else {
            console.warn('홈버튼 높이를 확인할 수 없습니다. 기본값 사용');
        }
    } else {
        console.warn('홈버튼 요소를 찾을 수 없습니다.');
    }
    
    // 홈버튼 높이를 확인하지 못한 경우 에러 (기본값 사용하지 않음)
    if (homeButtonHeight === null || homeButtonHeight === 0) {
        console.error('홈버튼 높이를 확인할 수 없습니다. 앵커 배치가 정확하지 않을 수 있습니다.');
        homeButtonHeight = 0; // 최소값으로 설정
    }
    
    // 첫 번째 앵커 포인트의 y좌표 = 홈버튼 top(10px) + 홈버튼 높이 + 20px
    const firstAnchorY = homeButtonTop + homeButtonHeight + 20;
    
    // 컨테이너 하단에서 100px 위 지점을 세로 배치의 하한선으로 설정
    const bottomLimit = containerHeight - 100;
    
    // 첫 번째 앵커와 하단 기준점 사이의 전체 사용 가능한 높이
    const availableHeight = bottomLimit - firstAnchorY;
    
    // 패딩 값 (20px)
    const padding = 20;
    
    // 패딩을 제외한 실제 사용 가능한 높이 (첫 번째와 마지막 앵커 사이에 패딩 2개)
    const usableHeight = availableHeight - padding * 2;
    
    // 패딩을 제외한 실제 사용 가능한 높이를 3등분
    const gap = usableHeight / 3;
    
    // 두 번째 앵커: 첫 번째 앵커 y + gap + padding
    const secondAnchorY = firstAnchorY + gap + padding;
    
    // 세 번째 앵커: 첫 번째 앵커 y + gap * 2 + padding * 2
    const thirdAnchorY = firstAnchorY + gap * 2 + padding * 2;
    
    console.log('앵커 위치 계산 (패딩 포함):', {
        homeButtonTop: homeButtonTop,
        homeButtonHeight: homeButtonHeight,
        firstAnchorY: firstAnchorY,
        bottomLimit: bottomLimit,
        availableHeight: availableHeight,
        padding: padding,
        usableHeight: usableHeight,
        gap: gap,
        secondAnchorY: secondAnchorY,
        thirdAnchorY: thirdAnchorY
    });
    
    const rowPositions = [
        firstAnchorY,  // 첫 번째 앵커: 홈버튼 top + 높이 + 20px 위치
        secondAnchorY, // 두 번째 앵커: 첫 번째 앵커 y + gap + padding
        thirdAnchorY   // 세 번째 앵커: 첫 번째 앵커 y + gap * 2 + padding * 2
    ];
    
    for (let i = 0; i < rowCount; i++) {
        const baseY = rowPositions[i];
        const yOffset = (Math.random() - 0.5) * yOffsetRange; // -15 ~ +15px
        const y = baseY + yOffset;
        
        rows.push({
            rowIndex: i,
            baseY: baseY,
            y: y,
            anchors: [] // 앵커 포인트 배열 (동적으로 추가됨)
        });
    }
    
    return rows;
};

// Row 배열: 각 row의 상태 추적
App.anchorRows = [];

// 컬럼 단위 앵커 관리: 각 컬럼은 3개의 앵커를 가짐 (1번, 2번, 3번 row)
App.anchorColumns = [];

/**
 * 앵커 포인트를 시각적으로 표시
 * @param {HTMLElement} container - 앵커를 표시할 컨테이너
 */
App.renderAnchors = function(container) {
    // 기존 앵커 표시 제거
    const existingAnchors = container.querySelectorAll('.anchor-point');
    existingAnchors.forEach(anchor => anchor.remove());
    
    // 모든 앵커 포인트 표시
    for (const row of App.anchorRows) {
        for (const anchor of row.anchors) {
            const anchorElement = document.createElement('div');
            anchorElement.className = 'anchor-point';
            anchorElement.dataset.anchorId = anchor.id;
            anchorElement.dataset.rowIndex = row.rowIndex;
            
            // 점유 상태에 따라 클래스 설정
            if (anchor.occupied) {
                anchorElement.classList.add('occupied');
                anchorElement.title = `점유됨 (사진 ID: ${anchor.photoId || '없음'})`;
            } else {
                anchorElement.classList.add('available');
                anchorElement.title = '사용 가능';
            }
            
            // 앵커 위치 설정 (CSS로는 위치를 지정할 수 없으므로 인라인 스타일 사용)
            anchorElement.style.left = anchor.x + 'px';
            anchorElement.style.top = row.y + 'px';
            
            container.appendChild(anchorElement);
        }
    }
};

// 사진과 앵커의 매핑 저장 (localStorage)
App.savePhotoAnchorMapping = function(photoId, anchorId) {
    try {
        const key = `photo_anchor_${photoId}`;
        localStorage.setItem(key, JSON.stringify({ anchorId: anchorId }));
    } catch (e) {
        console.error('사진-앵커 매핑 저장 실패:', e);
    }
};

// 사진과 앵커의 매핑 로드 (localStorage)
App.loadPhotoAnchorMapping = function(photoId) {
    try {
        const key = `photo_anchor_${photoId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('사진-앵커 매핑 로드 실패:', e);
    }
    return null;
};

/**
 * 컬럼에 3개의 앵커 생성 (1번, 2번, 3번 row)
 * @param {number} x - 컬럼의 x 좌표
 * @param {Array} anchorRows - row 배열
 * @returns {Object} 컬럼 객체 { x, anchors: [anchor1, anchor2, anchor3] }
 */
App.createAnchorColumn = function(x, anchorRows) {
    const column = {
        x: x,
        anchors: []
    };
    
    // 각 row에 앵커 생성
    for (let i = 0; i < anchorRows.length; i++) {
        const row = anchorRows[i];
        const anchor = {
            id: `anchor_${row.rowIndex}_col_${x}_${i}`,
            x: x,
            rowIndex: row.rowIndex,
            occupied: false,
            photoId: null
        };
        row.anchors.push(anchor);
        column.anchors.push(anchor);
    }
    
    App.anchorColumns.push(column);
    return column;
};

/**
 * 컬럼의 빈 앵커 개수 확인
 * @param {Object} column - 컬럼 객체
 * @returns {number} 빈 앵커 개수
 */
App.getEmptyAnchorCount = function(column) {
    return column.anchors.filter(a => !a.occupied).length;
};

/**
 * 컬럼이 모두 채워졌는지 확인
 * @param {Object} column - 컬럼 객체
 * @returns {boolean} 모두 채워졌으면 true
 */
App.isColumnFull = function(column) {
    return column.anchors.every(a => a.occupied);
};

/**
 * 앵커 포인트 기반으로 사진의 위치와 크기를 계산
 * @param {Object} photo - 이미지 객체
 * @param {Array} anchorRows - row 배열
 * @returns {Object|null} {x, y, width, height, anchorId, rowIndex} 또는 null (배치 실패)
 */
App.findAnchorPosition = function(photo, anchorRows) {
    // 이미지가 세로 이미지인지 확인
    const imgWidth = photo.imgWidth || photo.width || 100;
    const imgHeight = photo.imgHeight || photo.height || 100;
    const isPortrait = imgHeight > imgWidth; // 세로 이미지
    
    // 저장된 앵커 매핑 확인
    const savedMapping = photo.id ? App.loadPhotoAnchorMapping(photo.id) : null;
    
    if (savedMapping && savedMapping.anchorId !== undefined) {
        // 저장된 앵커 찾기 (두 개의 앵커 ID가 있을 수 있음)
        const anchorIds = savedMapping.anchorId.split(',');
        
        if (anchorIds.length === 2) {
            // 두 개의 앵커 ID가 있는 경우 (세로 이미지)
            const anchor1Id = anchorIds[0].trim();
            const anchor2Id = anchorIds[1].trim();
            let anchor1 = null, anchor2 = null, row1 = null, row2 = null;
            
        for (const row of anchorRows) {
                if (!anchor1) {
                    anchor1 = row.anchors.find(a => a.id === anchor1Id && !a.occupied);
                    if (anchor1) row1 = row;
                }
                if (!anchor2) {
                    anchor2 = row.anchors.find(a => a.id === anchor2Id && !a.occupied);
                    if (anchor2) row2 = row;
                }
            }
            
            if (anchor1 && anchor2 && row1 && row2) {
                return App.placePhotoAtTwoAnchors(photo, anchor1, row1, anchor2, row2);
            }
        } else {
            // 단일 앵커 ID인 경우
            for (const row of anchorRows) {
                const savedAnchor = row.anchors.find(a => a.id === savedMapping.anchorId && !a.occupied);
                if (savedAnchor) {
                // 저장된 앵커에 배치
                    if (isPortrait) {
                        // 세로 이미지: 저장된 앵커가 1번(rowIndex 0) 또는 3번(rowIndex 2) 앵커이면 한 앵커에 배치
                        // 저장된 앵커가 2번(rowIndex 1) 앵커이면 두 앵커를 차지하는 세로 사진으로 처리
                        if (savedAnchor.rowIndex === 0 || savedAnchor.rowIndex === 2) {
                            // 한 앵커를 차지하는 세로 사진
                return App.placePhotoAtAnchor(photo, savedAnchor, row);
                        } else if (savedAnchor.rowIndex === 1) {
                            // 두 앵커를 차지하는 세로 사진 (1번, 2번 앵커)
                            return App.findTwoAnchorsForPortrait(photo, savedAnchor, anchorRows);
                        }
                    } else {
                        return App.placePhotoAtAnchor(photo, savedAnchor, row);
                    }
                }
            }
        }
    }
    
    // 첫 번째 컬럼이 없으면 생성
    if (App.anchorColumns.length === 0) {
        App.createAnchorColumn(50, anchorRows);
    }
    
    // 세로 이미지인 경우
    if (isPortrait) {
        // 50% 확률로 큰 세로 사진(2개 앵커) 또는 작은 세로 사진(1개 앵커) 선택
        const useLargePortrait = Math.random() < 0.5;
        
        if (useLargePortrait) {
            // 큰 세로 사진 배치 시도 (2개 앵커 차지: 1번, 2번 앵커)
            for (const column of App.anchorColumns) {
                const anchor1 = column.anchors[0]; // 1번 앵커
                const anchor2 = column.anchors[1]; // 2번 앵커
                
                if (anchor1 && anchor2 && !anchor1.occupied && !anchor2.occupied) {
                    const row1 = anchorRows[0];
                    const row2 = anchorRows[1];
                    return App.placePhotoAtTwoAnchors(photo, anchor1, row1, anchor2, row2);
                }
            }
            
            // 큰 세로 사진을 배치할 수 없으면 작은 세로 사진으로 시도
            for (const column of App.anchorColumns) {
                const anchor1 = column.anchors[0]; // 1번 앵커
                const anchor3 = column.anchors[2]; // 3번 앵커
                
                if (anchor1 && !anchor1.occupied) {
                    const row1 = anchorRows[0];
                    return App.placePhotoAtAnchor(photo, anchor1, row1);
                }
                
                if (anchor3 && !anchor3.occupied) {
                    const row3 = anchorRows[2];
                    return App.placePhotoAtAnchor(photo, anchor3, row3);
                }
            }
        } else {
            // 작은 세로 사진 배치 시도 (1개 앵커 차지: 1번 또는 3번 앵커)
            for (const column of App.anchorColumns) {
                const anchor1 = column.anchors[0]; // 1번 앵커
                const anchor3 = column.anchors[2]; // 3번 앵커
                
                if (anchor1 && !anchor1.occupied) {
                    const row1 = anchorRows[0];
                    return App.placePhotoAtAnchor(photo, anchor1, row1);
                }
                
                if (anchor3 && !anchor3.occupied) {
                    const row3 = anchorRows[2];
                    return App.placePhotoAtAnchor(photo, anchor3, row3);
                }
            }
            
            // 작은 세로 사진을 배치할 수 없으면 큰 세로 사진으로 시도
            for (const column of App.anchorColumns) {
                const anchor1 = column.anchors[0]; // 1번 앵커
                const anchor2 = column.anchors[1]; // 2번 앵커
                
                if (anchor1 && anchor2 && !anchor1.occupied && !anchor2.occupied) {
                    const row1 = anchorRows[0];
                    const row2 = anchorRows[1];
                    return App.placePhotoAtTwoAnchors(photo, anchor1, row1, anchor2, row2);
                }
            }
        }
        
        // 모든 컬럼이 가득 찬 경우 새 컬럼 생성
        const anchorGap = 350; // 앵커 간 간격
        const lastColumn = App.anchorColumns[App.anchorColumns.length - 1];
        const newColumnX = lastColumn ? lastColumn.x + anchorGap : 50;
        const newColumn = App.createAnchorColumn(newColumnX, anchorRows);
        
        // 새 컬럼에 배치 시도 (큰 세로 사진 우선)
        const anchor1 = newColumn.anchors[0];
        const anchor2 = newColumn.anchors[1];
        
        if (useLargePortrait && anchor1 && anchor2) {
            const row1 = anchorRows[0];
            const row2 = anchorRows[1];
            return App.placePhotoAtTwoAnchors(photo, anchor1, row1, anchor2, row2);
        } else if (anchor1) {
            const row1 = anchorRows[0];
            return App.placePhotoAtAnchor(photo, anchor1, row1);
        }
        
        return null;
    }
    
    // 가로 이미지: 빈 앵커에 겹치지 않게 배치
    // 기존 컬럼부터 확인하여 빈 앵커 찾기
    for (const column of App.anchorColumns) {
        for (const anchor of column.anchors) {
            if (!anchor.occupied) {
                const row = anchorRows[anchor.rowIndex];
                return App.placePhotoAtAnchor(photo, anchor, row);
            }
        }
    }
    
    // 모든 컬럼이 가득 찬 경우 새 컬럼 생성
    const anchorGap = 350; // 앵커 간 간격
    const lastColumn = App.anchorColumns[App.anchorColumns.length - 1];
    const newColumnX = lastColumn ? lastColumn.x + anchorGap : 50;
    const newColumn = App.createAnchorColumn(newColumnX, anchorRows);
    
    // 새 컬럼의 첫 번째 앵커에 배치
    const anchor1 = newColumn.anchors[0];
    if (anchor1) {
        const row1 = anchorRows[0];
        return App.placePhotoAtAnchor(photo, anchor1, row1);
    }
    
    return null;
};

/**
 * 세로 이미지를 위한 두 개의 앵커 찾기 (저장된 앵커 기준)
 * @param {Object} photo - 이미지 객체
 * @param {Object} savedAnchor - 저장된 앵커
 * @param {Array} anchorRows - row 배열
 * @returns {Object|null} 배치 결과 또는 null
 */
App.findTwoAnchorsForPortrait = function(photo, savedAnchor, anchorRows) {
    // 저장된 앵커의 x 위치와 같은 위치의 인접한 row 앵커 찾기
    const savedRowIndex = savedAnchor.rowIndex;
    const maxRowIndex = 1; // 세로 이미지는 1번, 2번 앵커에만 배치 가능
    
    // 3번 앵커(rowIndex 2)에는 배치하지 않음
    if (savedRowIndex >= maxRowIndex + 1) {
        return null; // 3번 앵커에는 배치 불가
    }
    
    // 위쪽 row 확인
    if (savedRowIndex > 0 && savedRowIndex <= maxRowIndex) {
        const upperRow = anchorRows[savedRowIndex - 1];
        const upperAnchor = upperRow.anchors.find(a => Math.abs(a.x - savedAnchor.x) < 10 && !a.occupied);
        if (upperAnchor) {
            return App.placePhotoAtTwoAnchors(photo, upperAnchor, upperRow, savedAnchor, anchorRows[savedRowIndex]);
        }
    }
    
    // 아래쪽 row 확인 (3번 앵커 제외)
    if (savedRowIndex < maxRowIndex && savedRowIndex < anchorRows.length - 1) {
        const lowerRow = anchorRows[savedRowIndex + 1];
        if (lowerRow.rowIndex <= maxRowIndex) {
            const lowerAnchor = lowerRow.anchors.find(a => Math.abs(a.x - savedAnchor.x) < 10 && !a.occupied);
            if (lowerAnchor) {
                return App.placePhotoAtTwoAnchors(photo, savedAnchor, anchorRows[savedRowIndex], lowerAnchor, lowerRow);
            }
        }
    }
    
    // 인접한 앵커를 찾지 못하면 null 반환 (세로 이미지는 반드시 두 앵커 필요)
    return null;
};

/**
 * 세로 이미지를 두 개의 앵커에 배치
 * @param {Object} photo - 이미지 객체
 * @param {Object} anchor1 - 첫 번째 앵커 객체
 * @param {Object} row1 - 첫 번째 row 객체
 * @param {Object} anchor2 - 두 번째 앵커 객체
 * @param {Object} row2 - 두 번째 row 객체
 * @returns {Object} {x, y, width, height, anchorId, rowIndex, imgWidth, imgHeight}
 */
App.placePhotoAtTwoAnchors = function(photo, anchor1, row1, anchor2, row2) {
    // 이미지 원본 크기
    const imgWidth = photo.imgWidth || photo.width || 100;
    const imgHeight = photo.imgHeight || photo.height || 100;
    const aspectRatio = imgWidth / imgHeight;
    
    // 사진의 width는 250px ~ 300px 사이에서 랜덤
    const photoWidth = 250 + Math.random() * 50; // 250 ~ 300px
    const photoHeight = photoWidth / aspectRatio; // height는 auto로 비율 유지
    
    // 배경 크기 = 사진 크기의 1.1배 (비율 유지)
    const bgWidth = photoWidth * 1.1;
    const bgHeight = photoHeight * 1.1;
    
    // 회전을 고려하여 wrapper 크기에 여유 공간 추가 (최대 10도 회전 시 대각선 길이 증가)
    const rotationPadding = Math.max(photoWidth, photoHeight) * 0.2; // 약 20% 여유 공간
    const wrapperWidth = bgWidth + rotationPadding;
    const wrapperHeight = bgHeight + rotationPadding;
    
    // X 위치는 두 앵커의 중간 지점 (같은 x 위치일 경우 anchor1.x 사용)
    const midX = anchor1.x === anchor2.x ? anchor1.x : (anchor1.x + anchor2.x) / 2;
    
    // 앵커 기준으로 약간의 랜덤 오프셋
    const xOffsetRange = 20; // x 오프셋 범위 (±10px)
    const xOffset = (Math.random() - 0.5) * xOffsetRange;
    
    // 최종 위치 계산 (첫 번째 앵커에 맞춤)
    const finalX = midX + xOffset;
    const finalY = row1.y; // 첫 번째 앵커의 y 위치에 맞춤
    
    // 이미지 회전 각도 결정 (60-70%의 이미지만 회전)
    let rotation = 0;
    const shouldRotate = Math.random() < 0.65; // 65% 확률로 회전
    if (shouldRotate) {
        rotation = (Math.random() - 0.5) * 20; // -10도 ~ +10도
    }
    
    // 두 앵커를 모두 occupied로 표시
    anchor1.occupied = true;
    anchor2.occupied = true;
    if (photo.id) {
        anchor1.photoId = photo.id;
        anchor2.photoId = photo.id;
        // 두 앵커 ID를 모두 저장 (구분자로 구분)
        App.savePhotoAnchorMapping(photo.id, `${anchor1.id},${anchor2.id}`);
    }
    
    return {
        x: finalX,
        y: finalY,
        width: wrapperWidth, // wrapper 크기 (회전 여유 공간 포함)
        height: wrapperHeight, // wrapper 크기 (회전 여유 공간 포함)
        bgWidth: bgWidth, // 배경 크기 (사진 크기의 1.1배)
        bgHeight: bgHeight, // 배경 크기 (사진 크기의 1.1배)
        anchorId: `${anchor1.id},${anchor2.id}`, // 두 앵커 ID
        rowIndex: row1.rowIndex, // 첫 번째 row 인덱스
        imgWidth: photoWidth,
        imgHeight: photoHeight,
        rotation: rotation // 회전 각도 추가
    };
};

/**
 * 사진을 특정 앵커에 배치
 * @param {Object} photo - 이미지 객체
 * @param {Object} anchor - 앵커 객체
 * @param {Object} row - row 객체
 * @returns {Object} {x, y, width, height, anchorId, rowIndex, imgWidth, imgHeight, rotation}
 */
App.placePhotoAtAnchor = function(photo, anchor, row) {
    // 이미지 원본 크기
    const imgWidth = photo.imgWidth || photo.width || 100;
    const imgHeight = photo.imgHeight || photo.height || 100;
    const aspectRatio = imgWidth / imgHeight;
    const isPortrait = imgHeight > imgWidth; // 세로 이미지인지 확인
    
    // 세로 이미지인 경우 small portrait (120~150px), 가로 이미지인 경우 기존 범위 (250~300px)
    let photoWidth;
    if (isPortrait) {
        // small portrait: width 120~150px
        photoWidth = 120 + Math.random() * 30; // 120 ~ 150px
    } else {
        // landscape: width 250~300px
        photoWidth = 250 + Math.random() * 50; // 250 ~ 300px
    }
    const photoHeight = photoWidth / aspectRatio; // height는 auto로 비율 유지
    
    // 배경 크기 = 사진 크기의 1.1배 (비율 유지)
    const bgWidth = photoWidth * 1.1;
    const bgHeight = photoHeight * 1.1;
    
    // 회전을 고려하여 wrapper 크기에 여유 공간 추가 (최대 10도 회전 시 대각선 길이 증가)
    const rotationPadding = Math.max(photoWidth, photoHeight) * 0.2; // 약 20% 여유 공간
    const wrapperWidth = bgWidth + rotationPadding;
    const wrapperHeight = bgHeight + rotationPadding;
    
    // 앵커 기준으로 약간의 랜덤 오프셋
    const xOffsetRange = 20; // x 오프셋 범위 (±10px)
    const yOffsetRange = 20; // y 오프셋 범위 (±10px)
    const xOffset = (Math.random() - 0.5) * xOffsetRange;
    const yOffset = (Math.random() - 0.5) * yOffsetRange;
    
    // 최종 위치 계산
    const finalX = anchor.x + xOffset;
    const finalY = row.y + yOffset;
    
    // 이미지 회전 각도 결정 (60-70%의 이미지만 회전)
    let rotation = 0;
    const shouldRotate = Math.random() < 0.65; // 65% 확률로 회전
    if (shouldRotate) {
        rotation = (Math.random() - 0.5) * 20; // -10도 ~ +10도
    }
    
    // 앵커를 occupied로 표시
    anchor.occupied = true;
    if (photo.id) {
        anchor.photoId = photo.id;
        App.savePhotoAnchorMapping(photo.id, anchor.id);
    }
    
    return {
        x: finalX,
        y: finalY,
        width: wrapperWidth, // wrapper 크기 (회전 여유 공간 포함)
        height: wrapperHeight, // wrapper 크기 (회전 여유 공간 포함)
        bgWidth: bgWidth, // 배경 크기 (사진 크기의 1.1배)
        bgHeight: bgHeight, // 배경 크기 (사진 크기의 1.1배)
        anchorId: anchor.id,
        rowIndex: row.rowIndex,
        imgWidth: photoWidth,
        imgHeight: photoHeight,
        rotation: rotation // 회전 각도 추가
    };
};

/**
 * 새 이미지의 위치와 크기를 계산 (기존 함수 - 호환성 유지)
 * @param {Object} photo - 이미지 객체
 * @param {number} containerWidth - 컨테이너 너비
 * @param {number} containerHeight - 컨테이너 높이
 * @param {Array} existingRects - 기존 이미지들의 위치 정보 배열
 * @param {number} startX - 시작 X 좌표 (10)
 * @param {number} startY - 시작 Y 좌표 (30)
 * @returns {Object|null} {x, y, width, height, columnIndex} 또는 null (배치 실패)
 */
App.findRandomPosition = function(photo, containerWidth, containerHeight, existingRects, startX, startY) {
    // 이미지 가로/세로 비율 확인
    const imgWidth = photo.imgWidth || photo.width || 100;
    const imgHeight = photo.imgHeight || photo.height || 100;
    const isLandscape = imgWidth >= imgHeight; // 가로 이미지 (landscape)
    const isPortrait = imgHeight > imgWidth; // 세로 이미지 (portrait)
    
    // 이미지 크기를 모바일 화면 가로 너비의 0.7~0.8배로 설정
    const mobileFrameWidth = containerWidth; // 모바일 프레임 너비
    const targetWidthMin = mobileFrameWidth * 0.7;
    const targetWidthMax = mobileFrameWidth * 0.8;
    const targetWidth = targetWidthMin + Math.random() * (targetWidthMax - targetWidthMin);
    
    // 원본 이미지 비율 유지하면서 크기 계산
    const aspectRatio = imgWidth / imgHeight;
    let imgDisplayWidth, imgDisplayHeight;
    
    if (isLandscape) {
        imgDisplayWidth = targetWidth;
        imgDisplayHeight = targetWidth / aspectRatio;
    } else {
        imgDisplayWidth = targetWidth;
        imgDisplayHeight = targetWidth / aspectRatio;
    }
    
    // 배경 크기 = 이미지 크기 + 50px씩 (양쪽 각 25px)
    const bgWidth = imgDisplayWidth + 50;
    const bgHeight = imgDisplayHeight + 50;
    
    const maxLandscapeOnlyCount = 3; // Landscape 전용 컬럼: 최대 3개
    const maxMixedCount = 2; // Mixed 컬럼: 최대 2개
    const maxRetryAttempts = 10; // 랜덤 y 좌표 생성 최대 시도 횟수
    
    // 1단계: 기존 컬럼 중에 배치 가능한 곳 찾기
    for (let colIndex = 0; colIndex < App.columns.length; colIndex++) {
        const column = App.columns[colIndex];
        
        // 배치 가능 여부 확인
        let canPlace = false;
        const isMixed = column.portraitCount > 0; // 세로형이 하나라도 있으면 Mixed
        
        if (isMixed) {
            // Mixed 컬럼: 최대 2개까지만
            canPlace = column.images.length < maxMixedCount;
        } else {
            // Landscape 전용 컬럼: 가로형만, 최대 3개
            if (isLandscape) {
                canPlace = column.images.length < maxLandscapeOnlyCount;
            } else {
                // 세로형 이미지는 Mixed 컬럼에만 들어갈 수 있음
                canPlace = false;
            }
        }
        
        // 세로형 이미지가 Landscape 전용 컬럼에 들어가려고 하면 스킵
        if (isPortrait && !isMixed) {
            continue;
        }
        
        if (!canPlace) {
            continue;
        }
        
        // 컬럼 너비 업데이트 (현재 이미지가 더 넓으면)
        if (bgWidth > column.width) {
            column.width = bgWidth;
        }
        
        // 랜덤 y 좌표 생성 및 겹침 검사 (최대 10번 시도)
        for (let attempt = 0; attempt < maxRetryAttempts; attempt++) {
            // 랜덤 y 좌표 생성 (화면 경계 내)
            const minY = startY;
            const maxY = containerHeight - bgHeight;
            if (maxY < minY) {
                // 이미지가 화면보다 크면 다음 컬럼으로
                break;
            }
            
            const randomY = minY + Math.random() * (maxY - minY);
            
            // 새 사각형 생성 (패딩 10px 고려)
            const padding = 10;
            const newRect = {
                left: column.x - padding,
                top: randomY - padding,
                right: column.x + bgWidth + padding,
                bottom: randomY + bgHeight + padding,
                width: bgWidth + padding * 2,
                height: bgHeight + padding * 2
            };
            
            // 겹침 검사: 패딩을 고려하여 완전히 겹치지 않게
            let overlapValid = true;
            for (const existingRect of existingRects) {
                // 패딩을 고려한 기존 사각형
                const expandedExisting = {
                    left: existingRect.left - padding,
                    top: existingRect.top - padding,
                    right: existingRect.right + padding,
                    bottom: existingRect.bottom + padding
                };
                
                // 두 확장된 사각형이 겹치는지 확인
                if (!(newRect.right < expandedExisting.left || 
                      newRect.left > expandedExisting.right || 
                      newRect.bottom < expandedExisting.top || 
                      newRect.top > expandedExisting.bottom)) {
                    overlapValid = false;
                    break;
                }
            }
            
            if (overlapValid) {
                // 배치 성공
                return {
                    x: column.x,
                    y: randomY,
                    width: bgWidth,
                    height: bgHeight,
                    columnIndex: colIndex
                };
            }
        }
        
        // 10번 시도 후에도 배치 실패하면 다음 컬럼으로
        continue;
    }
    
    // 2단계: 새 컬럼 생성
    let newColumnX = startX;
    const columnGap = 50; // 컬럼 간 간격
    
    if (App.columns.length > 0) {
        // 가장 오른쪽 컬럼 찾기
        let rightmostColumn = App.columns[0];
        for (const col of App.columns) {
            if (col.x + col.width > rightmostColumn.x + rightmostColumn.width) {
                rightmostColumn = col;
            }
        }
        // 새 컬럼 X = 마지막 컬럼 X + 마지막 컬럼 너비 + 간격
        newColumnX = rightmostColumn.x + rightmostColumn.width + columnGap;
    }
    
    // 새 컬럼 생성
    const newColumn = {
        x: newColumnX,
        width: bgWidth, // 초기 너비는 현재 이미지 너비
        images: [],
        landscapeCount: isLandscape ? 1 : 0,
        portraitCount: isPortrait ? 1 : 0
    };
    
    // 랜덤 y 좌표 생성 (최대 10번 시도)
    for (let attempt = 0; attempt < maxRetryAttempts; attempt++) {
        const minY = startY;
        const maxY = containerHeight - bgHeight;
        if (maxY < minY) {
            // 이미지가 화면보다 크면 기본 위치 사용
            const defaultY = startY;
            App.columns.push(newColumn);
            return {
                x: newColumnX,
                y: defaultY,
                width: bgWidth,
                height: bgHeight,
                columnIndex: App.columns.length - 1
            };
        }
        
        const randomY = minY + Math.random() * (maxY - minY);
        
        // 새 사각형 생성 (패딩 10px 고려)
        const padding = 10;
        const newRect = {
            left: newColumnX - padding,
            top: randomY - padding,
            right: newColumnX + bgWidth + padding,
            bottom: randomY + bgHeight + padding,
            width: bgWidth + padding * 2,
            height: bgHeight + padding * 2
        };
        
        // 겹침 검사: 패딩을 고려하여 완전히 겹치지 않게
        let overlapValid = true;
        for (const existingRect of existingRects) {
            // 패딩을 고려한 기존 사각형
            const expandedExisting = {
                left: existingRect.left - padding,
                top: existingRect.top - padding,
                right: existingRect.right + padding,
                bottom: existingRect.bottom + padding
            };
            
            // 두 확장된 사각형이 겹치는지 확인
            if (!(newRect.right < expandedExisting.left || 
                  newRect.left > expandedExisting.right || 
                  newRect.bottom < expandedExisting.top || 
                  newRect.top > expandedExisting.bottom)) {
                overlapValid = false;
                break;
            }
        }
        
        if (overlapValid) {
            App.columns.push(newColumn);
            return {
                x: newColumnX,
                y: randomY,
                width: bgWidth,
                height: bgHeight,
                columnIndex: App.columns.length - 1
            };
        }
    }
    
    // 10번 시도 후에도 실패하면 기본 위치 사용
    const defaultY = startY;
    App.columns.push(newColumn);
    return {
        x: newColumnX,
        y: defaultY,
        width: bgWidth,
        height: bgHeight,
        columnIndex: App.columns.length - 1
    };
};

/**
 * 컬럼 기반 배치 함수
 * 요구사항:
 * 1. 이미지 간 간격: 최대 50px (서로 붙으면 안됨)
 * 2. 한 컬럼에 최대 2개 이미지
 * 3. 세로 고정, 가로 스크롤만 가능
 * 4. 컬럼 시작 y좌표: 70~100px 랜덤
 * 5. 이미지가 화면 밖으로 벗어나면 다음 컬럼에 위치
 */
App.findNextPosition = function(photo, containerWidth, containerHeight, existingRects, spacing, startX, startY) {
    const maxImagesPerColumn = 2; // 한 컬럼에 최대 2개 이미지
    const minSpacing = 10; // 최소 간격 (이미지가 붙지 않도록)
    const maxSpacing = 50; // 최대 간격 50px
    const firstImageYMin = 70; // 컬럼 시작 y좌표 최소값
    const firstImageYMax = 100; // 컬럼 시작 y좌표 최대값
    
    // 기존 이미지들을 컬럼별로 분류
    const columns = new Map(); // { x: { images: [{top, bottom}], count: number, maxWidth: number } }
    
    existingRects.forEach((rect) => {
        // 같은 컬럼 찾기 (X 좌표가 10px 이내면 같은 컬럼)
        let matchedColumnX = null;
        for (let colX of columns.keys()) {
            if (Math.abs(rect.left - colX) < 10) {
                matchedColumnX = colX;
                break;
            }
        }
        
        // 매칭된 컬럼이 없으면 새 컬럼으로
        if (matchedColumnX === null) {
            matchedColumnX = rect.left;
            columns.set(matchedColumnX, {
                images: [],
                count: 0,
                maxWidth: rect.right - rect.left
            });
        }
        
        const colData = columns.get(matchedColumnX);
        colData.images.push({
            top: rect.top,
            bottom: rect.bottom
        });
        colData.count++;
        colData.maxWidth = Math.max(colData.maxWidth, rect.right - rect.left);
    });
    
    // 각 컬럼의 이미지를 Y 좌표순으로 정렬
    columns.forEach((colData) => {
        colData.images.sort((a, b) => a.top - b.top);
    });
    
    // 1단계: 기존 컬럼 중 배치 가능한 곳 찾기 (2개 미만이고, 화면 내에 들어갈 수 있는 곳)
    const sortedColumns = Array.from(columns.keys()).sort((a, b) => a - b);
    
    for (let colX of sortedColumns) {
        const colData = columns.get(colX);
        
        // 이미 2개면 스킵
        if (colData.count >= maxImagesPerColumn) {
            continue;
        }
        
        let newY;
        
        if (colData.count === 0) {
            // 빈 컬럼: 컬럼 시작 Y 좌표 (70~100px)
            newY = firstImageYMin + Math.random() * (firstImageYMax - firstImageYMin);
        } else {
            // 이미 1개 있는 컬럼: 아래에 배치 (간격 10~50px)
            const lastImage = colData.images[colData.images.length - 1];
            const gap = minSpacing + Math.random() * (maxSpacing - minSpacing); // 10~50px 간격
            newY = lastImage.bottom + gap;
        }
        
        // 화면 밖으로 나가는지 확인 (세로는 고정이므로 벗어나면 안됨)
        if (newY + photo.bgHeight > containerHeight) {
            // 화면 밖이면 다음 컬럼으로
            continue;
        }
        
        // 겹침 체크
        const newRect = {
            left: colX,
            top: newY,
            right: colX + photo.bgWidth,
            bottom: newY + photo.bgHeight
        };
        
        if (!App.hasCollision(newRect, existingRects, minSpacing)) {
            return { x: colX, y: newY };
        }
    }
    
    // 2단계: 새 컬럼 생성
    let newColumnX = spacing;
    
    if (columns.size > 0) {
        // 가장 오른쪽 컬럼 찾기
        const lastColumnX = sortedColumns[sortedColumns.length - 1];
        const lastColData = columns.get(lastColumnX);
        // 새 컬럼 X = 마지막 컬럼 X + 마지막 컬럼 너비 + 최소 간격
        newColumnX = lastColumnX + lastColData.maxWidth + minSpacing;
    }
    
    // 컬럼 시작 Y 좌표 (70~100px)
    const newColumnY = firstImageYMin + Math.random() * (firstImageYMax - firstImageYMin);
    
    // 화면 내에 들어가는지 확인 (세로는 고정)
    if (newColumnY + photo.bgHeight <= containerHeight) {
        const newRect = {
            left: newColumnX,
            top: newColumnY,
            right: newColumnX + photo.bgWidth,
            bottom: newColumnY + photo.bgHeight
        };
        
        if (!App.hasCollision(newRect, existingRects, minSpacing)) {
            return { x: newColumnX, y: newColumnY };
        }
    }
    
    // 3단계: 최후의 수단 - 더 오른쪽에 배치
    let maxRight = spacing;
    existingRects.forEach(rect => {
        maxRight = Math.max(maxRight, rect.right + minSpacing);
    });
    
    return {
        x: maxRight,
        y: firstImageYMin + Math.random() * (firstImageYMax - firstImageYMin)
    };
};

/**
 * 사진들이 겹치는지 확인하는 함수 (실제 wrapper 요소 사용)
 */
App.checkOverlapWithOthers = function(currentWrapper, newWidth, newHeight, newX, newY) {
    const padding = 10;
    const newRect = {
        left: newX - padding,
        top: newY - padding,
        right: newX + newWidth + padding,
        bottom: newY + newHeight + padding
    };
    
    for (let i = 0; i < App.allWrappers.length; i++) {
        const otherWrapper = App.allWrappers[i];
        if (otherWrapper === currentWrapper) continue;
        
        const otherRect = {
            left: parseFloat(otherWrapper.style.left) - padding,
            top: parseFloat(otherWrapper.style.top) - padding,
            right: parseFloat(otherWrapper.style.left) + parseFloat(otherWrapper.style.width) + padding,
            bottom: parseFloat(otherWrapper.style.top) + parseFloat(otherWrapper.style.height) + padding
        };
        
        // 두 사각형이 겹치는지 확인
        if (!(newRect.right < otherRect.left || 
              newRect.left > otherRect.right || 
              newRect.bottom < otherRect.top || 
              newRect.top > otherRect.bottom)) {
            return true;
        }
    }
    return false;
};

/**
 * 노출 가능한 이미지만 필터링하여 보드에 표시
 */
App.loadVisibleImages = async function() {
    // API에서 이미지 목록 가져오기
    const allImages = await App.apiGetImages();
    const currentTime = App.getServerTime();
    
    const visibleImages = filterVisibleImages(allImages, currentTime);
    
    // 이미지 데이터 구조 확인
    if (visibleImages.length > 0) {
    }
    
    // 보드에 표시
    const { photoPreview } = App.elements;
    const galleryScreen = document.getElementById('gallery-screen');
    
    if (visibleImages.length > 0) {
        // 기존에 표시된 빈 이미지 제거
        const existingEmptyImage = galleryScreen ? galleryScreen.querySelector('.gallery-empty-image') : null;
        if (existingEmptyImage) {
            existingEmptyImage.remove();
        }
        
        App.selectedPhotos = visibleImages;
        await App.placePhotos();
    } else {
        // 노출 가능한 이미지가 없을 때 사진없을때.png 표시
        if (photoPreview) {
            photoPreview.innerHTML = '';
        }
        
        // 사진없을때.png 이미지를 단추없음.png와 같은 위치에 표시
        if (galleryScreen) {
            // 기존 빈 이미지 제거
            const existingEmptyImage = galleryScreen.querySelector('.gallery-empty-image');
            if (existingEmptyImage) {
                existingEmptyImage.remove();
            }
            
            // 새로 생성
            const emptyImage = document.createElement('img');
            emptyImage.src = '사진없을때.png';
            emptyImage.alt = '사진 없음';
            emptyImage.className = 'gallery-empty-image';
            galleryScreen.appendChild(emptyImage);
        }
    }
};

/**
 * 사진들을 앵커 포인트 기반으로 배치하는 함수
 */
App.placePhotos = async function() {
    const { photoPreview, mobileFrame } = App.elements;
    
    if (!photoPreview) {
        console.error('photoPreview 요소를 찾을 수 없습니다!');
        return;
    }
    
    if (App.selectedPhotos.length === 0) {
        return;
    }
    
    // 기존 사진 제거
    photoPreview.innerHTML = '';
    
    const frameWidth = mobileFrame ? mobileFrame.offsetWidth - 40 : window.innerWidth - 40;
    const containerHeight = window.innerHeight; // 세로 높이는 화면 높이로 고정 (세로 스크롤 없음)
    
    // 앵커 Row 정의 및 초기화
    App.anchorRows = App.defineAnchorRows(containerHeight);
    
    // 컬럼 초기화
    App.anchorColumns = [];
    
    // 첫 번째 컬럼 생성 (x=50)
    App.createAnchorColumn(50, App.anchorRows);
    
    // 저장된 앵커 매핑 복원 (기존 사진들이 어떤 앵커에 배치되었는지)
    for (const photo of App.selectedPhotos) {
        if (photo.id) {
            const savedMapping = App.loadPhotoAnchorMapping(photo.id);
            if (savedMapping && savedMapping.anchorId !== undefined) {
                // 저장된 앵커 찾기 (두 개의 앵커 ID가 있을 수 있음)
                const anchorIds = savedMapping.anchorId.split(',');
                for (const anchorId of anchorIds) {
                for (const row of App.anchorRows) {
                        const anchor = row.anchors.find(a => a.id === anchorId);
                    if (anchor) {
                        anchor.occupied = true;
                        anchor.photoId = photo.id;
                        break;
                        }
                    }
                }
            }
        }
    }
    
    App.allWrappers = []; // wrapper 배열 초기화
    
    // 이미지들을 순서대로 배치
    for (let index = 0; index < App.selectedPhotos.length; index++) {
        const photo = App.selectedPhotos[index];
        
        // 저장된 레이아웃 정보 로드
        let layout = photo.layout || App.loadImageLayout(photo.id);
        
        let finalX, finalY, bgWidth, bgHeight, imgWidth, imgHeight, padding, scaleFactor, anchorId, rowIndex, rotation = 0;
        
        // 저장된 레이아웃이 있고 anchorId가 있으면 사용
        if (layout && layout.x !== undefined && layout.y !== undefined && layout.anchorId !== undefined) {
            // 저장된 앵커 찾기 (두 개의 앵커 ID가 있을 수 있음)
            const anchorIds = layout.anchorId.split(',');
            let savedAnchor = null;
            let savedRow = null;
            let savedAnchor2 = null;
            let savedRow2 = null;
            
            if (anchorIds.length === 2) {
                // 두 개의 앵커 ID가 있는 경우 (세로 이미지)
                const anchor1Id = anchorIds[0].trim();
                const anchor2Id = anchorIds[1].trim();
                
            for (const row of App.anchorRows) {
                    if (!savedAnchor) {
                        const anchor = row.anchors.find(a => a.id === anchor1Id && a.photoId === photo.id);
                        if (anchor) {
                            savedAnchor = anchor;
                            savedRow = row;
                        }
                    }
                    if (!savedAnchor2) {
                        const anchor = row.anchors.find(a => a.id === anchor2Id && a.photoId === photo.id);
                        if (anchor) {
                            savedAnchor2 = anchor;
                            savedRow2 = row;
                        }
                    }
                }
            } else {
                // 단일 앵커 ID인 경우
                for (const row of App.anchorRows) {
                    const anchor = row.anchors.find(a => a.id === layout.anchorId && a.photoId === photo.id);
                    if (anchor) {
                    savedAnchor = anchor;
                    savedRow = row;
                    break;
                    }
                }
            }
            
            if (savedAnchor && savedRow && (anchorIds.length === 1 || (savedAnchor2 && savedRow2))) {
                // 저장된 앵커에 배치
                finalX = layout.x;
                finalY = layout.y;
                bgWidth = layout.bgWidth;
                bgHeight = layout.bgHeight;
                imgWidth = layout.imgWidth;
                imgHeight = layout.imgHeight;
                padding = (bgWidth - imgWidth) / 2; // 배경과 이미지의 차이의 절반
                scaleFactor = layout.scale || (imgWidth / (photo.imgWidth || photo.width || 100));
                anchorId = layout.anchorId;
                rowIndex = layout.rowIndex;
                rotation = layout.rotation !== undefined ? layout.rotation : 0; // 저장된 회전 각도 사용
            } else {
                // 저장된 앵커가 없거나 다른 사진이 있으면 새로 배치
                
                // 첫 번째 사진(index === 0)은 무조건 (1,1) 앵커에 배치
                let anchorLayout = null;
                if (index === 0 && App.anchorRows.length > 0) {
                    const firstRow = App.anchorRows[0]; // 첫 번째 row
                    
                    // 첫 번째 앵커가 없으면 생성
                    if (firstRow.anchors.length === 0) {
                        const firstAnchor = {
                            id: `anchor_${firstRow.rowIndex}_0`,
                            x: 50, // 첫 앵커는 x=50부터 시작
                            rowIndex: firstRow.rowIndex,
                            occupied: false,
                            photoId: null
                        };
                        firstRow.anchors.push(firstAnchor);
                    }
                    
                    const firstAnchor = firstRow.anchors[0];
                    if (!firstAnchor.occupied) {
                        // 첫 번째 앵커에 배치
                        anchorLayout = App.placePhotoAtAnchor(photo, firstAnchor, firstRow);
                    }
                }
                
                // 첫 번째 사진이 아니거나 첫 번째 앵커에 배치 실패한 경우 일반 로직 사용
                if (!anchorLayout) {
                    anchorLayout = App.findAnchorPosition(photo, App.anchorRows);
                }
                
                if (!anchorLayout) {
                    console.warn(`이미지 ${index + 1} (${photo.id}) 배치 실패, 건너뜀`);
                    continue;
                }
                finalX = anchorLayout.x;
                finalY = anchorLayout.y;
                bgWidth = anchorLayout.bgWidth || anchorLayout.width; // 배경 크기
                bgHeight = anchorLayout.bgHeight || anchorLayout.height; // 배경 크기
                const wrapperWidth = anchorLayout.width; // wrapper 크기
                const wrapperHeight = anchorLayout.height; // wrapper 크기
                imgWidth = anchorLayout.imgWidth;
                imgHeight = anchorLayout.imgHeight;
                padding = (bgWidth - imgWidth) / 2; // 배경과 이미지의 차이의 절반
                scaleFactor = imgWidth / (photo.imgWidth || photo.width || 100);
                anchorId = anchorLayout.anchorId;
                rowIndex = anchorLayout.rowIndex;
                rotation = anchorLayout.rotation || 0; // 회전 각도 가져오기
                
                // 레이아웃 정보 저장
                layout = {
                    x: finalX,
                    y: finalY,
                    bgWidth: bgWidth,
                    bgHeight: bgHeight,
                    wrapperWidth: wrapperWidth,
                    wrapperHeight: wrapperHeight,
                    imgWidth: imgWidth,
                    imgHeight: imgHeight,
                    scale: scaleFactor,
                    anchorId: anchorId,
                    rowIndex: rowIndex,
                    rotation: rotation // 회전 각도 저장
                };
                if (photo.id) {
                    App.saveImageLayout(photo.id, layout);
                }
                photo.layout = layout;
            }
        } else {
            // 저장된 레이아웃이 없으면 앵커 기반으로 새로 배치
            
            // 첫 번째 사진(index === 0)은 무조건 (1,1) 앵커에 배치
            let anchorLayout = null;
            if (index === 0 && App.anchorRows.length > 0) {
                const firstRow = App.anchorRows[0]; // 첫 번째 row
                
                // 첫 번째 앵커가 없으면 생성
                if (firstRow.anchors.length === 0) {
                    const firstAnchor = {
                        id: `anchor_${firstRow.rowIndex}_0`,
                        x: 50, // 첫 앵커는 x=50부터 시작
                        rowIndex: firstRow.rowIndex,
                        occupied: false,
                        photoId: null
                    };
                    firstRow.anchors.push(firstAnchor);
                }
                
                const firstAnchor = firstRow.anchors[0];
                if (!firstAnchor.occupied) {
                    // 첫 번째 앵커에 배치
                    anchorLayout = App.placePhotoAtAnchor(photo, firstAnchor, firstRow);
                }
            }
            
            // 첫 번째 사진이 아니거나 첫 번째 앵커에 배치 실패한 경우 일반 로직 사용
            if (!anchorLayout) {
                anchorLayout = App.findAnchorPosition(photo, App.anchorRows);
            }
            
            if (!anchorLayout) {
                console.warn(`이미지 ${index + 1} (${photo.id}) 배치 실패, 건너뜀`);
                continue;
            }
            
            finalX = anchorLayout.x;
            finalY = anchorLayout.y;
            bgWidth = anchorLayout.bgWidth || anchorLayout.width; // 배경 크기
            bgHeight = anchorLayout.bgHeight || anchorLayout.height; // 배경 크기
            const wrapperWidth = anchorLayout.width; // wrapper 크기
            const wrapperHeight = anchorLayout.height; // wrapper 크기
            imgWidth = anchorLayout.imgWidth;
            imgHeight = anchorLayout.imgHeight;
            padding = (bgWidth - imgWidth) / 2; // 배경과 이미지의 차이의 절반
            scaleFactor = imgWidth / (photo.imgWidth || photo.width || 100);
            anchorId = anchorLayout.anchorId;
            rowIndex = anchorLayout.rowIndex;
            rotation = anchorLayout.rotation || 0; // 회전 각도 가져오기
            
            // 레이아웃 정보 저장
            layout = {
                x: finalX,
                y: finalY,
                bgWidth: bgWidth,
                bgHeight: bgHeight,
                wrapperWidth: wrapperWidth,
                wrapperHeight: wrapperHeight,
                imgWidth: imgWidth,
                imgHeight: imgHeight,
                scale: scaleFactor,
                anchorId: anchorId,
                rowIndex: rowIndex,
                rotation: rotation // 회전 각도 저장
            };
            
            if (photo.id) {
                App.saveImageLayout(photo.id, layout);
            }
            photo.layout = layout;
        }
        
        // 래퍼 생성
        const wrapper = document.createElement('div');
        wrapper.className = 'photo-wrapper';
        // wrapper 크기는 회전 여유 공간을 포함한 크기
        const wrapperWidth = layout.wrapperWidth || bgWidth;
        const wrapperHeight = layout.wrapperHeight || bgHeight;
        wrapper.style.width = wrapperWidth + 'px';
        wrapper.style.height = wrapperHeight + 'px';
        wrapper.style.left = finalX + 'px';
        wrapper.style.top = finalY + 'px';
        
        // wrapper에 앵커 정보 저장 (나중에 드래그 제한에 사용)
        wrapper.dataset.anchorId = anchorId;
        wrapper.dataset.rowIndex = rowIndex;
        wrapper.dataset.photoId = photo.id || '';
        
        // wrapper를 배열에 추가
        App.allWrappers.push(wrapper);
        
        // 배경 div 생성 (레이아웃용, 배경 이미지는 사용하지 않음)
        const background = document.createElement('div');
        background.className = 'photo-background';
        background.style.width = bgWidth + 'px';
        background.style.height = bgHeight + 'px';
        
        // 배경 클릭 시 이벤트 전파 방지
        background.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
        });
        
        // 이미지 생성
        const photoImg = document.createElement('img');
        photoImg.className = 'photo-image';
        photoImg.src = photo.src;
        photoImg.style.width = imgWidth + 'px';
        photoImg.style.height = imgHeight + 'px';
        // 배경 중앙에 이미지 배치 (배경 크기의 1.1배이므로 차이의 절반만큼 패딩)
        const bgPaddingX = (bgWidth - imgWidth) / 2;
        const bgPaddingY = (bgHeight - imgHeight) / 2;
        photoImg.style.top = bgPaddingY + 'px';
        photoImg.style.left = bgPaddingX + 'px';
        
        // 사진에 직접 스타일 적용
        photoImg.style.border = '10px solid #fff';
        photoImg.style.boxShadow = '0 0 4px 0 rgba(92, 92, 92, 0.34)';
        
        // 회전 적용 (이미지 중앙 기준)
        if (rotation !== 0) {
            photoImg.style.transformOrigin = 'center center';
            photoImg.style.transform = `rotate(${rotation}deg)`;
        }
        
        // 반응 관련 데이터 초기화 (저장된 정보가 있으면 사용)
        let reactionCount = photo.reactionCount || 0;
        let currentWidth = imgWidth;
        let currentHeight = imgHeight;
        let currentPadding = padding;
        const originalWidth = photo.imgWidth; // 원본 크기는 항상 유지
        const originalHeight = photo.imgHeight;
        const originalPadding = photo.padding;
        
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
        
        // 이미지 클릭 이벤트 - 반응 추가
        photoImg.addEventListener('click', async function(e) {
            e.stopPropagation();
            
            console.log('=== 사진 클릭됨 ===');
            console.log('photo.id:', photo.id);
            
            // 현재 사용자 정보 가져오기
            const currentUser = App.getCurrentUser ? App.getCurrentUser() : null;
            console.log('currentUser:', currentUser);
            
            if (!currentUser) {
                console.log('로그인이 필요합니다.');
                alert('로그인이 필요합니다.');
                return;
            }
            
            // API에서 중복 체크 (비동기)
            let userHasButton = false;
            if (photo.id) {
                try {
                    const existingButton = await App.apiGetUserButtonByImageId(photo.id);
                    userHasButton = existingButton !== null;
                } catch (error) {
                    console.error('단추 중복 체크 실패:', error);
                }
            }
            
            // 메모리상의 데이터도 확인 (이중 체크, 호환성)
            if (!userHasButton && photo.buttons && photo.buttons.length > 0) {
                userHasButton = photo.buttons.some(btn => String(btn.userId) === String(currentUser));
            }
            
            if (userHasButton) {
                return;
            }
            
            // 반응 횟수 증가
            reactionCount++;
            
            // 단추 이미지 랜덤 선택
            const randomButtonImage = buttonImages[Math.floor(Math.random() * buttonImages.length)];
            
            // 단추 이미지 생성
            const buttonImg = document.createElement('img');
            buttonImg.src = randomButtonImage;
            buttonImg.className = 'reaction-button';
            
            // 이미지 외곽 부분에 랜덤 위치 배치
            // wrapper 내부에서 이미지 주변 영역 계산
            const margin = 5; // 외곽 여백 (사진 테두리 기준 ±5px)
            const buttonSize = 25 + Math.random() * 20; // 25-45px 크기
            
            // 외곽 영역: 이미지의 패딩 영역과 배경의 경계 영역
            // 랜덤 위치 생성 (이미지 외곽 부분, 테두리 기준 -5px ~ +5px)
            let randomX, randomY;
            const side = Math.floor(Math.random() * 4); // 0: 위, 1: 오른쪽, 2: 아래, 3: 왼쪽
            
            if (side === 0) { // 위쪽
                randomX = currentPadding + Math.random() * (currentWidth - buttonSize);
                randomY = -margin + Math.random() * (margin * 2); // -5px ~ +5px
            } else if (side === 1) { // 오른쪽
                randomX = currentPadding + currentWidth - margin + Math.random() * (margin * 2); // 이미지 오른쪽 끝 -5px ~ +5px
                randomY = currentPadding + Math.random() * (currentHeight - buttonSize);
            } else if (side === 2) { // 아래쪽
                randomX = currentPadding + Math.random() * (currentWidth - buttonSize);
                randomY = currentPadding + currentHeight - margin + Math.random() * (margin * 2); // 이미지 아래 끝 -5px ~ +5px
            } else { // 왼쪽
                randomX = -margin + Math.random() * (margin * 2); // -5px ~ +5px
                randomY = currentPadding + Math.random() * (currentHeight - buttonSize);
            }
            
            // 단추 회전 각도
            const rotation = Math.random() * 360;
            
            // 단추 이미지 스타일 설정
            buttonImg.style.position = 'absolute';
            buttonImg.style.width = buttonSize + 'px';
            buttonImg.style.height = buttonSize + 'px';
            buttonImg.style.left = randomX + 'px';
            buttonImg.style.top = randomY + 'px';
            buttonImg.style.zIndex = '9999'; // 모든 사진보다 앞에 위치하도록 높은 z-index 설정
            buttonImg.style.pointerEvents = 'none';
            buttonImg.style.transform = 'rotate(' + rotation + 'deg)';
            
            // 애니메이션 효과
            buttonImg.style.opacity = '0';
            buttonImg.style.transition = 'opacity 0.3s ease';
            
            // wrapper에 단추 추가
            if (wrapper) {
                wrapper.appendChild(buttonImg);
            } else {
                console.error('wrapper를 찾을 수 없습니다!');
            }
            
            // 페이드인 효과
            setTimeout(() => {
                buttonImg.style.opacity = '1';
            }, 10);
            
            // 단추 정보 저장 및 메모리 동기화
            if (photo.id) {
                const buttonData = {
                    src: randomButtonImage,
                    width: buttonSize,
                    height: buttonSize,
                    left: randomX,
                    top: randomY,
                    transform: 'rotate(' + rotation + 'deg)',
                    userId: currentUser, // 사용자 ID 저장
                    addedAt: App.getServerTime().getTime() // 단추 추가 날짜 (타임스탬프)
                };
                
                // 메모리상의 photo.buttons에 즉시 추가 (동기화)
                if (!photo.buttons) {
                    photo.buttons = [];
                }
                photo.buttons.push(buttonData);
                
                // API를 통해 서버에 단추 저장
                (async () => {
                    try {
                        const result = await App.apiAddButton(photo.id, buttonData);
                        // 저장 성공 - 화면에 이미 표시된 단추는 그대로 유지
                    } catch (error) {
                        console.error('단추 저장 실패:', error);
                        alert('단추 저장에 실패했습니다: ' + (error.message || error));
                        // 저장 실패 시 화면에서도 제거
                        if (buttonImg && buttonImg.parentNode) {
                            buttonImg.parentNode.removeChild(buttonImg);
                        }
                        // 메모리에서도 제거
                        if (photo.buttons) {
                            const index = photo.buttons.findIndex(btn => 
                                btn.src === buttonData.src && 
                                btn.left === buttonData.left && 
                                btn.top === buttonData.top
                            );
                            if (index !== -1) {
                                photo.buttons.splice(index, 1);
                            }
                        }
                    }
                })();
            }
            
            // 이미지 크기 증가 (5번 클릭 단위로 5% 증가, 최대 50%까지)
            // 5번 클릭마다 5% 증가하므로, reactionCount를 5로 나눈 몫에 0.05를 곱함
            const growthLevel = Math.floor(reactionCount / 5); // 5번 단위로 증가 레벨 계산
            const maxGrowthLevel = 10; // 최대 50% 증가 (10 * 5% = 50%)
            const actualGrowthLevel = Math.min(growthLevel, maxGrowthLevel); // 최대 제한 적용
            const scaleFactor = 1 + (actualGrowthLevel * 0.05); // 최대 1.5 (50% 증가)
            
            let newWidth = originalWidth * scaleFactor;
            let newHeight = originalHeight * scaleFactor;
            let newPadding = originalPadding * scaleFactor;
            
            // 배경 크기도 함께 증가
            const bgScaleFactor = scaleFactor;
            let newBgWidth = photo.bgWidth * bgScaleFactor;
            let newBgHeight = photo.bgHeight * bgScaleFactor;
            
            // 이전 growthLevel 계산 (크기가 실제로 증가하는지 확인)
            const previousGrowthLevel = Math.floor((reactionCount - 1) / 5);
            const previousActualGrowthLevel = Math.min(previousGrowthLevel, maxGrowthLevel);
            const shouldGrow = actualGrowthLevel > previousActualGrowthLevel; // 5번 단위로 증가할 때만 true
            
            // 현재 wrapper의 위치
            const currentX = parseFloat(wrapper.style.left);
            const currentY = parseFloat(wrapper.style.top);
            
            // 5번 단위로 증가할 때만 크기 변경 시도
            if (shouldGrow) {
                // 다른 이미지들과 겹치는지 확인
                let canGrow = !App.checkOverlapWithOthers(wrapper, newBgWidth, newBgHeight, currentX, currentY);
                
                // 겹치지 않을 때만 크기 증가
                if (canGrow) {
                    // 현재 크기 업데이트
                    currentWidth = newWidth;
                    currentHeight = newHeight;
                    currentPadding = newPadding;
                    
                    // 크기 업데이트 (애니메이션 효과)
                    photoImg.style.transition = 'all 0.3s ease';
                    photoImg.style.width = newWidth + 'px';
                    photoImg.style.height = newHeight + 'px';
                    photoImg.style.top = newPadding + 'px';
                    photoImg.style.left = newPadding + 'px';
                    
                    wrapper.style.transition = 'all 0.3s ease';
                    wrapper.style.width = newBgWidth + 'px';
                    wrapper.style.height = newBgHeight + 'px';
                    background.style.transition = 'all 0.3s ease';
                    background.style.width = newBgWidth + 'px';
                    background.style.height = newBgHeight + 'px';
                    
                    // 크기 정보는 레이아웃에 저장됨 (saveImageLayout 사용)
                } else {
                    // 겹치면 반응 횟수 되돌림 (크기 증가 없이 단추만 추가)
                    reactionCount--;
                }
            } else {
                // 크기가 증가하지 않아도 반응 횟수는 레이아웃에 저장됨
            }
            
            // 클릭 가능하도록 설정
            photoImg.style.cursor = 'pointer';
        });
        
        // 요소 조립
        wrapper.appendChild(background);
        wrapper.appendChild(photoImg);
        photoPreview.appendChild(wrapper);
        
        // 이미지에 달린 단추들 로드 및 표시
        if (photo.id) {
            (async () => {
                try {
                    const buttons = await App.apiGetImageButtons(photo.id);
                    
                    if (buttons && buttons.length > 0) {
                        buttons.forEach(buttonInfo => {
                            const buttonData = buttonInfo.buttonData || buttonInfo;
                            
                            // 단추 이미지 생성
                            const existingButtonImg = document.createElement('img');
                            existingButtonImg.src = buttonData.src || buttonData.button_src;
                            existingButtonImg.className = 'reaction-button';
                            
                            // 단추 이미지 스타일 설정 (저장된 위치 사용)
                            existingButtonImg.style.position = 'absolute';
                            existingButtonImg.style.width = (buttonData.width || buttonData.button_width || 30) + 'px';
                            existingButtonImg.style.height = (buttonData.height || buttonData.button_height || 30) + 'px';
                            existingButtonImg.style.left = (buttonData.left || buttonData.button_left || 0) + 'px';
                            existingButtonImg.style.top = (buttonData.top || buttonData.button_top || 0) + 'px';
                            existingButtonImg.style.zIndex = '9999';
                            existingButtonImg.style.pointerEvents = 'none';
                            
                            // 회전 적용
                            const transform = buttonData.transform || buttonData.button_transform || 'rotate(0deg)';
                            existingButtonImg.style.transform = transform;
                            
                            // wrapper에 단추 추가
                            wrapper.appendChild(existingButtonImg);
                        });
                    }
                } catch (error) {
                    console.error(`이미지 ${index + 1} (${photo.id})의 단추 로드 실패:`, error);
                }
            })();
        }
    }
    
    // preview 영역 크기 업데이트
    // 가로: 모든 row의 가장 오른쪽 앵커 위치를 찾아서 계산
    let maxAnchorRight = 0;
    for (const row of App.anchorRows) {
        if (row.anchors.length > 0) {
            const lastAnchor = row.anchors[row.anchors.length - 1];
            // 앵커 위치 + 사진 최대 너비(300px) + 여유 공간(50px)
            maxAnchorRight = Math.max(maxAnchorRight, lastAnchor.x + 350);
        }
    }
    
    const finalWidth = Math.max(frameWidth, maxAnchorRight + 50); // 오른쪽 여백 50px
    const fixedHeight = containerHeight; // 세로 고정 (화면 높이)
    
    photoPreview.style.width = finalWidth + 'px';
    photoPreview.style.height = containerHeight + 'px'; // 화면 높이로 고정
    photoPreview.style.minHeight = containerHeight + 'px';
    photoPreview.style.maxHeight = containerHeight + 'px'; // 세로 스크롤 방지
    photoPreview.style.overflowX = 'auto'; // 가로 스크롤만 활성화
    photoPreview.style.overflowY = 'hidden'; // 세로 스크롤 비활성화
    
    // 앵커 포인트 시각적으로 표시
    App.renderAnchors(photoPreview);
};

/**
 * 갤러리 화면 초기화
 */
App.initGallery = function() {
    const { galleryScreen, photoPreview } = App.elements;
    
    // 갤러리 화면 진입 시 노출 가능한 이미지 로드
    if (galleryScreen) {
        galleryScreen.addEventListener('click', function(e) {
            if (e.target.id === 'go-to-upload-btn' || e.target.closest('#go-to-upload-btn')) {
                return;
            }
            // 갤러리 화면이 활성화될 때 노출 가능한 이미지 로드
            if (galleryScreen.classList.contains('active')) {
                App.loadVisibleImages();
            }
        });
    }
    
    // 화면 배경 클릭 시 이벤트 차단 (한 번만 설정)
    if (photoPreview) {
        photoPreview.addEventListener('click', function(e) {
            // 사진이나 버튼이 아닌 빈 영역(photo-preview 자체)을 클릭했을 때만 이벤트 차단
            if (e.target === photoPreview) {
                e.stopPropagation();
                e.preventDefault();
            }
        });
    }
    
    // 갤러리 화면이면 노출 가능한 이미지 로드
    if (galleryScreen && galleryScreen.classList.contains('active')) {
        App.loadVisibleImages();
    }
};

window.App = App;
console.log('gallery.js 로드 완료, App.loadVisibleImages 존재:', typeof App.loadVisibleImages === 'function');
console.log('gallery.js에서 정의된 App 함수들:', Object.keys(App).filter(key => typeof App[key] === 'function'));

