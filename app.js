// DOM이 모두 로드되면 스크립트 실행
document.addEventListener("DOMContentLoaded", () => {
    
    // data.json 파일에서 원본 데이터 가져오기
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            const products = data.products;
            const stockLots = data.stockLots;
            
            // 오늘 날짜 (계산 기준)
            // (데모이므로 2025-11-17로 고정)
            const today = new Date('2025-11-17');

            // 1. SKU별로 현재고 합산
            const stockSummary = {}; // 예: { "SKU-001": 120, "SKU-002": 80, ... }
            stockLots.forEach(lot => {
                stockSummary[lot.sku] = (stockSummary[lot.sku] || 0) + lot.qty;
            });

            // 2. 대시보드 위젯 그리기
            renderInventoryChart(products, stockSummary);
            renderLowStockList(products, stockSummary);
            renderExpiryList(stockLots, products, today);
        })
        .catch(error => console.error('데이터 로딩 실패:', error));
});


/**
 * 1. 실시간 재고 현황 (차트)
 * @param {Array} products - 상품 마스터 목록
 * @param {Object} stockSummary - SKU별 재고 합계
 */
function renderInventoryChart(products, stockSummary) {
    const labels = [];
    const chartData = [];

    products.forEach(p => {
        labels.push(p.name);
        chartData.push(stockSummary[p.sku] || 0); // 해당 SKU의 재고 합계
    });

    const ctx = document.getElementById('inventoryChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '현재고',
                data: chartData,
                backgroundColor: 'rgba(54, 162, 235, 0.6)'
            }]
        },
        options: {
            scales: { y: { beginAtZero: true } }
        }
    });
}

/**
 * 2. 재고 부족 알림 (목록)
 * @param {Array} products - 상품 마스터 목록
 * @param {Object} stockSummary - SKU별 재고 합계
 */
function renderLowStockList(products, stockSummary) {
    const lowStockList = document.getElementById('low-stock-list');
    lowStockList.innerHTML = ''; // 목록 비우기

    products.forEach(p => {
        const currentStock = stockSummary[p.sku] || 0;
        if (currentStock < p.safeStock) {
            const li = document.createElement('li');
            li.textContent = `${p.name} (${p.sku}) - 현재: ${currentStock} (안전: ${p.safeStock})`;
            li.style.color = 'red';
            lowStockList.appendChild(li);
        }
    });
}

/**
 * 3. 유통기한 임박 알림 (목록)
 * @param {Array} stockLots - 모든 재고 로트 목록
 * @param {Array} products - 상품 마스터 (이름을 찾기 위해)
 * @param {Date} today - 기준이 되는 오늘 날짜
 */
function renderExpiryList(stockLots, products, today) {
    const expiryList = document.getElementById('expiry-list');
    expiryList.innerHTML = ''; // 목록 비우기
    const alertDays = 30; // 30일 이내 임박 건

    // product 이름을 쉽게 찾기 위한 Map
    const productMap = new Map(products.map(p => [p.sku, p.name]));

    stockLots.forEach(lot => {
        const expiryDate = new Date(lot.expiryDate);
        const timeDiff = expiryDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysRemaining <= alertDays && daysRemaining > 0) {
            const li = document.createElement('li');
            const productName = productMap.get(lot.sku) || lot.sku;
            li.textContent = `${productName} (${lot.lot}) - ${daysRemaining}일 남음 (만료: ${lot.expiryDate})`;
            expiryList.appendChild(li);
        }
    });
}