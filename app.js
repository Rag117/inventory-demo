/* ==========================================================================
   멍밥 ERP 통합 엔진 (app.js)
   - 역할: 데이터 생성, 입고/출고 처리, 저장소 관리
   ========================================================================== */

// DB 키 정의
const DB_PRODUCTS = 'mungbab_products';
const DB_STOCK = 'mungbab_stock_data';
const DB_LEDGER = 'mungbab_ledger_data';
// (기타 기준정보 키는 생략하지만 코드는 유지된다고 가정)

document.addEventListener('DOMContentLoaded', () => {
    initSystemData(); // 데이터 초기화
    initializeTabs(); // 탭 기능

    // 페이지별 렌더링 분기
    const path = window.location.pathname;
    if (path.includes('dashboard')) renderDashboard();
    if (path.includes('stock')) { loadCurrentStock(); loadStockLedger(); }
    if (path.includes('purchase')) renderPurchaseList(); // 입고 목록 렌더링
    if (path.includes('sales')) renderSalesList();       // 수주 목록 렌더링
    if (path.includes('admin') && typeof renderProducts === 'function') renderProducts();
});

/* --------------------------------------------------------------------------
   1. 초기 데이터 생성 (요구사항: 종류는 적지만 개수는 많게)
   -------------------------------------------------------------------------- */
function initSystemData() {
    // 1) 상품 기초 데이터
    if (!localStorage.getItem(DB_PRODUCTS)) {
        const products = [
            { sku: 'SKU-D01', name: '프리미엄 그레인프리 사료', category: '사료', safetyStock: 100 },
            { sku: 'SKU-C01', name: '웰니스 고양이 캔', category: '간식/캔', safetyStock: 500 },
            { sku: 'SKU-T01', name: '유기농 닭가슴살 육포', category: '간식/캔', safetyStock: 200 }
        ];
        localStorage.setItem(DB_PRODUCTS, JSON.stringify(products));
    }

    // 2) [핵심] 재고 데이터 (수량이 빵빵하게 들어가도록 설정)
    if (!localStorage.getItem(DB_STOCK)) {
        const stock = [
            // 사료: 2개의 Lot, 총 3500개
            { sku: 'SKU-D01', name: '프리미엄 그레인프리 사료', lotId: 'LOT-D01-A01', location: 'WH01-A-01', qty: 1500, expiry: '2025-12-31' },
            { sku: 'SKU-D01', name: '프리미엄 그레인프리 사료', lotId: 'LOT-D01-B02', location: 'WH01-A-02', qty: 2000, expiry: '2026-06-30' },
            
            // 캔: 3개의 Lot, 총 12000개
            { sku: 'SKU-C01', name: '웰니스 고양이 캔', lotId: 'LOT-C01-A01', location: 'WH01-C-01', qty: 5000, expiry: '2026-01-15' },
            { sku: 'SKU-C01', name: '웰니스 고양이 캔', lotId: 'LOT-C01-A02', location: 'WH01-C-02', qty: 4000, expiry: '2026-02-20' },
            { sku: 'SKU-C01', name: '웰니스 고양이 캔', lotId: 'LOT-C01-B01', location: 'WH01-C-03', qty: 3000, expiry: '2026-03-10' },

            // 육포: 1개의 Lot, 800개
            { sku: 'SKU-T01', name: '유기농 닭가슴살 육포', lotId: 'LOT-T01-A01', location: 'WH02-A-01', qty: 800, expiry: '2025-11-20' } // 임박 상품
        ];
        localStorage.setItem(DB_STOCK, JSON.stringify(stock));
    }

    // 3) 수불부 기초 데이터
    if (!localStorage.getItem(DB_LEDGER)) {
        // 초기 재고에 대한 입고 이력 생성
        const ledger = [
            { date: '2025-01-01', type: '기초재고', sku: 'SKU-D01', name: '프리미엄 그레인프리 사료', inQty: 3500, outQty: 0, refId: 'INIT' },
            { date: '2025-01-01', type: '기초재고', sku: 'SKU-C01', name: '웰니스 고양이 캔', inQty: 12000, outQty: 0, refId: 'INIT' }
        ];
        localStorage.setItem(DB_LEDGER, JSON.stringify(ledger));
    }
}

/* --------------------------------------------------------------------------
   2. [입고 관리] 실제 입고 처리 함수
   -------------------------------------------------------------------------- */
function processPurchaseInput() {
    // purchase.html의 모달에서 값을 가져옴
    const sku = document.getElementById('in-sku').value;
    const name = document.getElementById('in-name').value;
    const qty = parseInt(document.getElementById('in-qty').value);
    const lotId = document.getElementById('in-lot').value;
    const expiry = document.getElementById('in-expiry').value;
    const loc = document.getElementById('in-loc').value;

    if (!sku || !qty || qty <= 0) return alert('상품정보와 수량을 정확히 입력하세요.');

    // 1. 재고 추가 (기존 Lot이 있으면 수량증가, 없으면 신규생성)
    let stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    let target = stockList.find(item => item.sku === sku && item.lotId === lotId);

    if (target) {
        target.qty += qty; // 기존 재고 합산
    } else {
        // 신규 Lot 생성
        stockList.push({ sku, name, lotId, location: loc, qty, expiry });
    }

    // 2. 수불부 기록
    let ledgerList = JSON.parse(localStorage.getItem(DB_LEDGER)) || [];
    const today = new Date().toISOString().split('T')[0];
    ledgerList.push({
        date: today, type: '정상 입고', sku, name, inQty: qty, outQty: 0, refId: 'PO-' + Date.now().toString().slice(-4)
    });

    // 3. 저장 및 새로고침
    localStorage.setItem(DB_STOCK, JSON.stringify(stockList));
    localStorage.setItem(DB_LEDGER, JSON.stringify(ledgerList));

    alert(`[입고 완료] ${name} ${qty}개가 재고에 반영되었습니다.`);
    closeModal('purchaseModal');
    
    // 화면 갱신 (리스트에 추가된 척 하기 위해 페이지 리로드)
    location.reload(); 
}

/* --------------------------------------------------------------------------
   3. [수주/출고 관리] 실제 출고 처리 함수
   -------------------------------------------------------------------------- */
function processSalesOutput() {
    // sales.html의 출고 확정 버튼에서 호출
    const sku = "SKU-C01"; // 데모용 고정값 (화면 UI에 따라 동적으로 변경 가능)
    const name = "웰니스 고양이 캔";
    const qty = 500; // 데모용 출고 수량
    const lotId = "LOT-C01-A01"; // FEFO에 의해 선택된 Lot

    let stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    let target = stockList.find(item => item.sku === sku && item.lotId === lotId);

    if (!target || target.qty < qty) {
        return alert('재고가 부족하여 출고할 수 없습니다.');
    }

    // 1. 재고 차감
    target.qty -= qty;

    // 2. 수불부 기록
    let ledgerList = JSON.parse(localStorage.getItem(DB_LEDGER)) || [];
    const today = new Date().toISOString().split('T')[0];
    ledgerList.push({
        date: today, type: '수주 출고', sku, name, inQty: 0, outQty: qty, refId: 'SO-' + Date.now().toString().slice(-4)
    });

    localStorage.setItem(DB_STOCK, JSON.stringify(stockList));
    localStorage.setItem(DB_LEDGER, JSON.stringify(ledgerList));

    alert(`[출고 완료] ${name} ${qty}개가 차감되었습니다.`);
    
    // 수주 완료 상태로 UI 변경 (데모용)
    const btn = document.querySelector('.confirm-shipment button');
    if(btn) {
        btn.innerText = "출고 완료됨";
        btn.disabled = true;
        btn.style.backgroundColor = "#10B981"; // 초록색
    }
}

/* --- 공통 유틸리티 (대시보드 차트, 재고 로딩 등 기존 코드 포함) --- */
function loadCurrentStock() { /* ...이전 답변의 코드와 동일... */ }
function loadStockLedger() { /* ...이전 답변의 코드와 동일... */ }
function renderDashboard() { /* ...이전 답변의 코드와 동일... */ }
function initializeTabs() { /* ...이전 답변의 코드와 동일... */ }
function openModal(id) { document.getElementById(id).style.display = 'block'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// 더미 렌더링 함수들 (빈 함수 방지)
function renderPurchaseList() {} 
function renderSalesList() {}