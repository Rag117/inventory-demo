// DOM이 모두 로드되면 스크립트 실행
document.addEventListener("DOMContentLoaded", () => {

    // data.json 파일에서 가짜 데이터 가져오기
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            // 1. 실시간 재고 현황 (차트)
            const ctx = document.getElementById('inventoryChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar', // 막대 차트
                data: {
                    labels: data.inventoryStatus.labels,
                    datasets: [{
                        label: '현재고',
                        data: data.inventoryStatus.data,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)'
                    }]
                },
                options: {
                    scales: { y: { beginAtZero: true } }
                }
            });

            // 2. 재고 부족 알림 (목록)
            const lowStockList = document.getElementById('low-stock-list');
            data.lowStockItems.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `${item.name} (${item.sku}) - 현재: ${item.current} (안전: ${item.safe})`;
                li.style.color = 'red';
                lowStockList.appendChild(li);
            });

            // 3. 유통기한 임박 알림 (목록)
            const expiryList = document.getElementById('expiry-list');
            data.expiryItems.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `${item.name} (~${item.expiryDate}) - ${item.remaining}일 남음`;
                expiryList.appendChild(li);
            });
        })
        .catch(error => console.error('데이터 로딩 실패:', error));
});