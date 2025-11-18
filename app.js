// DOM이 모두 로드되면 스크립트 실행
document.addEventListener("DOMContentLoaded", () => {
    
    // [수정] data.json 대신 실제 서버 API를 호출해야 합니다.
    // 예: fetch('/api/dashboard/summary')
    fetch('data.json') // (데모용으로 data.json을 유지)
        .then(response => response.json())
        .then(data => {
            if (document.getElementById('inventoryChart')) {
                // 1. 대시보드 차트 그리기 (Tbl_StockLots 합계 기반)
                renderInventoryChart(data.dashboardInventory);
            }
            if (document.getElementById('low-stock-list')) {
                // 2. 재고 부족 알림 (Tbl_StockLots 합계 vs Tbl_Products.SafetyStock)
                renderLowStockList(data.dashboardInventory);
            }
            if (document.getElementById('expiry-list')) {
                // 3. 유통기한 임박 알림 (Tbl_StockLots.ExpiryDate 기반)
                renderExpiryList(data.dashboardExpiry);
            }
        })
        .catch(error => console.error('대시보드 데이터 로딩 실패:', error));
});

/**
 * 1. 실시간 재고 현황 (차트)
 */
function renderInventoryChart(inventory) {
    const labels = inventory.map(item => item.name);
    const chartData = inventory.map(item => item.currentStock);
    const safeData = inventory.map(item => item.safeStock);

    const ctx = document.getElementById('inventoryChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '현재고',
                    data: chartData,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)', // 파란색
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                },
                {
                    label: '안전재고 (발주점)',
                    data: safeData,
                    type: 'line', // 라인 차트로 혼합
                    borderColor: 'rgba(239, 68, 68, 1)', // 빨간색
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        // 라이트 모드용 차트 옵션
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#374151' }, 
                    grid: { color: '#E5E7EB' } 
                },
                x: {
                    ticks: { color: '#374151' }, 
                    grid: { display: false } 
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#374151' } 
                }
            }
        }
    });
}

/**
 * 2. 재고 부족 알림 (목록)
 */
function renderLowStockList(inventory) {
    const lowStockList = document.getElementById('low-stock-list');
    lowStockList.innerHTML = ''; 

    inventory.forEach(item => {
        if (item.currentStock <= item.safeStock) {
            const li = document.createElement('li');
            li.textContent = `${item.name} - 현재: ${item.currentStock} (안전: ${item.safeStock})`;
            lowStockList.appendChild(li);
        }
    });
    if (lowStockList.children.length === 0) {
        lowStockList.innerHTML = '<li>재고 부족 상품이 없습니다.</li>';
    }
}

/**
 * 3. 유통기한 임박 알림 (목록)
 */
function renderExpiryList(expiryItems) {
    const expiryList = document.getElementById('expiry-list');
    expiryList.innerHTML = '';
    const today = new Date(); // 오늘 날짜

    expiryItems.forEach(item => {
        const expiryDate = new Date(item.expiryDate);
        const timeDiff = expiryDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysRemaining <= 30 && daysRemaining > 0) {
            const li = document.createElement('li');
            li.textContent = `${item.name} - ${daysRemaining}일 남음 (${item.expiryDate})`;
            expiryList.appendChild(li);
        }
    });
     if (expiryList.children.length === 0) {
        expiryList.innerHTML = '<li>유통기한 임박 상품이 없습니다.</li>';
    }
}

/**
 * 4. [신규] 리포트 페이지 월별 수익 차트
 */
function renderProfitChart(profitData) {
    const ctx = document.getElementById('monthlyProfitChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: profitData.labels,
            datasets: [
                {
                    label: '총 매출액 (SalePrice)',
                    data: profitData.sales,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: '총 원가 (UnitCost)',
                    data: profitData.cost,
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: { 
            scales: {
                y: { beginAtZero: true, ticks: { color: '#374151' }, grid: { color: '#E5E7EB' } },
                x: { ticks: { color: '#374151' }, grid: { color: '#E5E7EB' } }
            },
            plugins: { legend: { labels: { color: '#374151' } } }
        }
    });
}

// 모달 공통 스크립트
function openModal(modalId) { 
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'block';
}
function closeModal(modalId) { 
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// 탭 기능 공통 스크립트
function initializeTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    tabLinks.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // 모든 탭 링크와 컨텐츠 비활성화
            button.closest('.tabs').querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
            button.closest('.dashboard').querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // 클릭한 탭과 컨텐츠 활성화
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}