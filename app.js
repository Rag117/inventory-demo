// DOM이 모두 로드되면 스크립트 실행
document.addEventListener("DOMContentLoaded", () => {
    
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            // 1. 대시보드 차트 그리기
            renderInventoryChart(data.dashboardInventory);
            
            // 2. 재고 부족 알림
            renderLowStockList(data.dashboardInventory);
            
            // 3. 유통기한 임박 알림
            renderExpiryList(data.dashboardExpiry);
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
                    borderColor: 'rgba(239, 68, 68, 1)', // [수정] 빨간색
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        // [수정] 라이트 모드용 차트 옵션
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#374151' }, // [수정] Y축 글자 (어두운색)
                    grid: { color: '#E5E7EB' } // [수정] Y축 그리드선 (밝게)
                },
                x: {
                    ticks: { color: '#374151' }, // [수정] X축 글자
                    grid: { display: false } 
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#374151' } // [수정] 범례 글자
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