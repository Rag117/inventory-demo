/* ==========================================================================
   멍밥 ERP 통합 엔진 (app.js) - Completed Version
   ========================================================================== */

// --- 1. 데이터베이스 키 (DB Schema) ---
const DB_PRODUCTS = 'mungbab_products';
const DB_PARTNERS = 'mungbab_partners';     // 거래처
const DB_WAREHOUSES = 'mungbab_warehouses'; // 창고
const DB_LOCATIONS = 'mungbab_locations';   // 로케이션
const DB_STOCK = 'mungbab_stock_data';      // 현재고 (Lot 단위)
const DB_LEDGER = 'mungbab_ledger_data';    // 수불부 (History)
const DB_PURCHASE = 'mungbab_purchase_orders'; // 발주 내역
const DB_SALES = 'mungbab_sales_orders';       // 수주 내역
const DB_RETURNS = 'mungbab_returns_data';     // 반품 내역

// --- 2. 초기화 및 라우팅 ---
document.addEventListener('DOMContentLoaded', () => {
    initSystemData();   // 기초 데이터 생성
    setupCommonUI();    // 날짜 등 공통 설정
    initializeTabs();   // 탭 기능

    // 페이지별 렌더링 라우터
    if (document.getElementById('inventoryChart')) renderDashboard(); 
    if (document.getElementById('product-category-filter')) renderAdminPage();
    if (document.getElementById('purchase-table')) renderPurchasePage();
    if (document.getElementById('sales-table')) renderSalesPage();
    if (document.getElementById('current-stock-table')) { loadCurrentStock(); loadStockLedger(); }
    if (document.getElementById('return-table')) renderReturnsPage();
});

/* ==========================================================================
   3. 데이터 초기화 (Bootstrapping)
   ========================================================================== */
function initSystemData() {
    // 1) 상품
    if (!localStorage.getItem(DB_PRODUCTS)) {
        const products = [
            { sku: 'SKU-D01', name: '프리미엄 그레인프리 사료', category: '사료', safetyStock: 50 },
            { sku: 'SKU-C01', name: '웰니스 고양이 캔', category: '간식/캔', safetyStock: 200 },
            { sku: 'SKU-T01', name: '유기농 닭가슴살 육포', category: '간식/캔', safetyStock: 100 }
        ];
        localStorage.setItem(DB_PRODUCTS, JSON.stringify(products));
    }
    // 2) 거래처
    if (!localStorage.getItem(DB_PARTNERS)) {
        const partners = [
            { id: 'V-001', name: '(주)튼튼펫푸드', type: '공급처' },
            { id: 'C-001', name: '냥이월드', type: '고객사' },
            { id: 'C-002', name: '행복한 펫샵', type: '고객사' }
        ];
        localStorage.setItem(DB_PARTNERS, JSON.stringify(partners));
    }
    // 3) 창고 및 로케이션
    if (!localStorage.getItem(DB_WAREHOUSES)) {
        localStorage.setItem(DB_WAREHOUSES, JSON.stringify([
            { id: 'WH-01', name: '제1 물류센터', type: '일반' },
            { id: 'WH-02', name: '반품 센터', type: '반품' }
        ]));
        localStorage.setItem(DB_LOCATIONS, JSON.stringify([
            { id: 'WH01-A-01', whId: 'WH-01', desc: '사료 구역' },
            { id: 'WH01-B-01', whId: 'WH-01', desc: '간식 구역' },
            { id: 'WH02-R-01', whId: 'WH-02', desc: '반품 대기존' }
        ]));
    }
    // 4) 초기 재고 (Demo Data)
    if (!localStorage.getItem(DB_STOCK)) {
        const today = new Date().toISOString().split('T')[0];
        const stock = [
            { sku: 'SKU-D01', name: '프리미엄 그레인프리 사료', lotId: 'LOT-INIT-01', location: 'WH01-A-01', qty: 60, date: today, expiry: '2025-11-29' },
            { sku: 'SKU-C01', name: '웰니스 고양이 캔', lotId: 'LOT-INIT-02', location: 'WH01-B-01', qty: 150, date: today, expiry: '2026-05-01' }
        ];
        localStorage.setItem(DB_STOCK, JSON.stringify(stock));
        
        // 수불부 초기 기록
        const ledger = stock.map(s => ({
            date: today, type: '기초재고', sku: s.sku, name: s.name,
            inQty: s.qty, outQty: 0, refId: 'INIT', balance: s.qty
        }));
        localStorage.setItem(DB_LEDGER, JSON.stringify(ledger));
    }
}

function setupCommonUI() {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    dateInputs.forEach(input => { if (!input.value) input.value = today; });
}

/* ==========================================================================
   4. 재고 트랜잭션 코어 (입/출고/반품 반영)
   ========================================================================== */
function updateStock(actionType, data) {
    let stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    let ledgerList = JSON.parse(localStorage.getItem(DB_LEDGER)) || [];
    const today = new Date().toISOString().split('T')[0];

    // 1. 입고 (IN)
    if (actionType === 'IN') {
        // 기존 Lot 검색 (보통 입고는 새 Lot이지만, 반품 재입고 등은 합칠 수도 있음)
        let target = stockList.find(s => s.sku === data.sku && s.lotId === data.lotId && s.location === data.location);
        if (target) {
            target.qty += parseInt(data.qty);
        } else {
            stockList.push({
                sku: data.sku, name: data.name, lotId: data.lotId,
                location: data.location, qty: parseInt(data.qty),
                date: data.date || today, expiry: data.expiry || ''
            });
        }
        
        // 수불부 기록
        ledgerList.push({
            date: today, type: data.refType || '입고', sku: data.sku, name: data.name,
            inQty: data.qty, outQty: 0, refId: data.refId
        });
    }

    // 2. 출고 (OUT)
    else if (actionType === 'OUT') {
        let target = stockList.find(s => s.sku === data.sku && s.lotId === data.lotId);
        if (!target || target.qty < data.qty) {
            alert('재고가 부족합니다!');
            return false;
        }
        target.qty -= parseInt(data.qty);
        
        ledgerList.push({
            date: today, type: data.refType || '출고', sku: data.sku, name: data.name,
            inQty: 0, outQty: data.qty, refId: data.refId
        });
    }

    // 3. 재고 이동/조정 등은 생략(기존 코드 참고)

    localStorage.setItem(DB_STOCK, JSON.stringify(stockList));
    localStorage.setItem(DB_LEDGER, JSON.stringify(ledgerList));
    return true;
}

/* ==========================================================================
   5. 페이지별 로직
   ========================================================================== */

// --- [대시보드] Dashboard ---
function renderDashboard() {
    const stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    const products = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || [];
    
    // 1. 차트 데이터 집계 (SKU별 총 수량)
    const stockBySku = {};
    stockList.forEach(s => {
        if (!stockBySku[s.sku]) stockBySku[s.sku] = { name: s.name, qty: 0 };
        stockBySku[s.sku].qty += s.qty;
    });

    const ctx = document.getElementById('inventoryChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.values(stockBySku).map(i => i.name),
            datasets: [{
                label: '현재 재고량',
                data: Object.values(stockBySku).map(i => i.qty),
                backgroundColor: 'rgba(54, 162, 235, 0.6)'
            }]
        }
    });

    // 2. 알림 위젯 (안전재고 부족)
    const lowStockList = document.getElementById('low-stock-list');
    lowStockList.innerHTML = '';
    products.forEach(p => {
        const current = stockBySku[p.sku] ? stockBySku[p.sku].qty : 0;
        if (current < p.safetyStock) {
            lowStockList.innerHTML += `<li>⚠️ [${p.name}] 현재: ${current} < 안전: ${p.safetyStock} (발주필요)</li>`;
        }
    });

    // 3. 유통기한 임박 (30일 이내)
    const expiryList = document.getElementById('expiry-list');
    expiryList.innerHTML = '';
    const today = new Date();
    stockList.forEach(s => {
        if (s.qty > 0 && s.expiry) {
            const expDate = new Date(s.expiry);
            const diffTime = expDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 30 && diffDays >= 0) {
                expiryList.innerHTML += `<li>⏳ [${s.name}] Lot:${s.lotId} (${diffDays}일 남음)</li>`;
            }
        }
    });
}

// --- [입고 관리] Purchase ---
function renderPurchasePage() {
    // 발주 목록 렌더링
    const list = JSON.parse(localStorage.getItem(DB_PURCHASE)) || [];
    const tbody = document.querySelector('#purchase-table tbody');
    tbody.innerHTML = list.map(po => `
        <tr>
            <td>${po.id}</td><td>${po.partnerName}</td><td>${po.skuName}</td><td>${po.qty}</td>
            <td>
                ${po.status === 'Ordered' 
                  ? `<button class="btn-primary" onclick="processPurchaseReceive('${po.id}')">입고처리</button>` 
                  : '<span class="status-done">입고완료</span>'}
            </td>
        </tr>
    `).join('');
    
    // 모달 상품 옵션 채우기
    populateProductOptions('po-sku-select');
}

function registerPurchase() {
    const skuSel = document.getElementById('po-sku-select');
    const partner = document.getElementById('po-partner').value;
    const qty = document.getElementById('po-qty').value;
    
    if (!skuSel.value || !qty) return alert('필수 정보를 입력하세요.');

    const list = JSON.parse(localStorage.getItem(DB_PURCHASE)) || [];
    const newPO = {
        id: 'PO-' + Date.now(),
        sku: skuSel.value,
        skuName: skuSel.options[skuSel.selectedIndex].text,
        partnerName: partner,
        qty: parseInt(qty),
        date: new Date().toISOString().split('T')[0],
        status: 'Ordered'
    };
    list.push(newPO);
    localStorage.setItem(DB_PURCHASE, JSON.stringify(list));
    
    alert('발주가 등록되었습니다.');
    closeModal('purchaseModal');
    renderPurchasePage();
}

function processPurchaseReceive(poId) {
    const list = JSON.parse(localStorage.getItem(DB_PURCHASE)) || [];
    const po = list.find(p => p.id === poId);
    if (!po) return;

    // 실제 재고 반영
    const lotId = 'LOT-' + poId.split('-')[1]; // Lot 자동생성 예시
    updateStock('IN', {
        sku: po.sku, name: po.skuName, qty: po.qty, 
        lotId: lotId, location: 'WH01-Temp', 
        refType: '구매입고', refId: po.id, expiry: '2026-12-31' // 데모용 유통기한
    });

    po.status = 'Received';
    localStorage.setItem(DB_PURCHASE, JSON.stringify(list));
    alert('입고 처리가 완료되어 재고가 증가했습니다.');
    renderPurchasePage();
}

// --- [수주 관리] Sales ---
function renderSalesPage() {
    const list = JSON.parse(localStorage.getItem(DB_SALES)) || [];
    const tbody = document.querySelector('#sales-table tbody');
    
    tbody.innerHTML = list.map(so => `
        <tr>
            <td>${so.id}</td><td>${so.customer}</td><td>${so.skuName}</td><td>${so.qty}</td>
            <td>
                ${so.status === 'Ordered'
                  ? `<button class="btn-primary" onclick="openShipmentModal('${so.id}')">출고처리</button>`
                  : '<span class="status-done">출고완료</span>'}
            </td>
        </tr>
    `).join('');

    populateProductOptions('so-sku-select');
}

function registerSales() {
    const skuSel = document.getElementById('so-sku-select');
    const customer = document.getElementById('so-customer').value;
    const qty = document.getElementById('so-qty').value;

    if (!skuSel.value || !qty) return alert('정보 입력 필요');

    const list = JSON.parse(localStorage.getItem(DB_SALES)) || [];
    const newSO = {
        id: 'SO-' + Date.now(),
        sku: skuSel.value,
        skuName: skuSel.options[skuSel.selectedIndex].text,
        customer: customer,
        qty: parseInt(qty),
        status: 'Ordered'
    };
    list.push(newSO);
    localStorage.setItem(DB_SALES, JSON.stringify(list));

    alert('수주 주문이 등록되었습니다.');
    closeModal('salesRegModal');
    renderSalesPage();
}

// 출고 처리 모달 열기 (FEFO Lot 추천)
function openShipmentModal(soId) {
    const salesList = JSON.parse(localStorage.getItem(DB_SALES));
    const so = salesList.find(s => s.id === soId);
    
    document.getElementById('ship-so-id').value = so.id;
    document.getElementById('ship-req-qty').value = so.qty;
    document.getElementById('ship-sku-hidden').value = so.sku;
    document.getElementById('ship-name-hidden').value = so.skuName;

    // 해당 SKU의 재고 Lot 불러오기 (Current Stock)
    const stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    const availableLots = stockList.filter(s => s.sku === so.sku && s.qty > 0);
    
    const lotSelect = document.getElementById('ship-lot-select');
    lotSelect.innerHTML = availableLots.map(l => 
        `<option value="${l.lotId}">Lot: ${l.lotId} (잔고: ${l.qty}, 유통기한: ${l.expiry})</option>`
    ).join('');

    openModal('shipmentModal');
}

function confirmShipment() {
    const soId = document.getElementById('ship-so-id').value;
    const lotId = document.getElementById('ship-lot-select').value;
    const sku = document.getElementById('ship-sku-hidden').value;
    const name = document.getElementById('ship-name-hidden').value;
    const qty = parseInt(document.getElementById('ship-req-qty').value);

    // 재고 차감 실행
    const success = updateStock('OUT', {
        sku, name, lotId, qty, refType: '수주출고', refId: soId
    });

    if (success) {
        // 주문 상태 업데이트
        let salesList = JSON.parse(localStorage.getItem(DB_SALES));
        let so = salesList.find(s => s.id === soId);
        so.status = 'Shipped';
        localStorage.setItem(DB_SALES, JSON.stringify(salesList));

        alert('출고 확정! 재고가 차감되었습니다.');
        closeModal('shipmentModal');
        renderSalesPage();
    }
}


// --- [재고 및 리포트] Stock & Ledger ---
function loadCurrentStock() {
    const tbody = document.getElementById('stock-tbody');
    const stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    const filterText = document.getElementById('stock-search-input') ? document.getElementById('stock-search-input').value.toLowerCase() : '';

    tbody.innerHTML = stockList
        .filter(s => s.qty > 0 && (s.name.includes(filterText) || s.sku.toLowerCase().includes(filterText)))
        .map(s => `
            <tr>
                <td>${s.sku}</td><td>${s.name}</td><td>${s.lotId}</td><td>${s.location}</td>
                <td class="text-right bold">${s.qty.toLocaleString()}</td><td>${s.expiry || '-'}</td>
                <td>정상</td>
            </tr>
    `).join('');
}

function loadStockLedger() {
    const tbody = document.getElementById('ledger-tbody');
    if(!tbody) return;
    
    const ledgerList = JSON.parse(localStorage.getItem(DB_LEDGER)) || [];
    // 잔고 계산 (단순 누적) - 실제 ERP는 Snapshot을 쓰지만 여기선 데모용으로 순차 계산
    let runningBalance = {};
    
    // 화면 표시용
    let html = '';
    // 최신순 정렬을 원하면 reverse()
    ledgerList.forEach(row => {
        // 잔고 계산
        if (!runningBalance[row.sku]) runningBalance[row.sku] = 0;
        runningBalance[row.sku] += (row.inQty - row.outQty);
        
        html += `
            <tr>
                <td>${row.date}</td>
                <td><span class="${row.type.includes('입고') ? 'status-done' : 'status-danger'}">${row.type}</span></td>
                <td>${row.sku}</td><td>${row.name}</td><td>${row.refId}</td>
                <td style="color:blue;">${row.inQty > 0 ? '+' + row.inQty : '-'}</td>
                <td style="color:red;">${row.outQty > 0 ? '-' + row.outQty : '-'}</td>
                <td>${runningBalance[row.sku]}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html; // 순서대로 뿌리면 과거->현재. 
}
// 검색 필터 함수 (stock.html)
function filterStockTable() { loadCurrentStock(); }


// --- [반품 관리] Returns ---
function renderReturnsPage() {
    const list = JSON.parse(localStorage.getItem(DB_RETURNS)) || [];
    const tbody = document.querySelector('#return-table tbody');
    tbody.innerHTML = list.map(r => `
        <tr>
            <td>${r.id}</td><td>${r.date}</td><td>${r.skuName}</td><td>${r.qty}</td>
            <td>${r.reason}</td>
            <td>${r.status === 'Requested' ? '<span class="status-wait">승인대기</span>' : '<span class="status-done">'+r.status+'</span>'}</td>
            <td>${r.status === 'Requested' ? `<button onclick="openReturnProcessModal('${r.id}')">처리하기</button>` : '-'}</td>
        </tr>
    `).join('');
    populateProductOptions('ret-sku-select');
}

function registerReturn() {
    const skuSel = document.getElementById('ret-sku-select');
    const qty = document.getElementById('ret-qty').value;
    const reason = document.getElementById('ret-reason').value;

    const list = JSON.parse(localStorage.getItem(DB_RETURNS)) || [];
    list.push({
        id: 'RT-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        sku: skuSel.value,
        skuName: skuSel.options[skuSel.selectedIndex].text,
        qty: parseInt(qty),
        reason: reason,
        status: 'Requested'
    });
    localStorage.setItem(DB_RETURNS, JSON.stringify(list));
    alert('반품 접수 완료');
    closeModal('returnRegModal');
    renderReturnsPage();
}

function completeReturnProcess() {
    const id = document.getElementById('proc-ret-id').value;
    const action = document.getElementById('proc-action').value; // RESTOCK or DISPOSE
    
    let list = JSON.parse(localStorage.getItem(DB_RETURNS)) || [];
    let item = list.find(r => r.id === id);

    if (action === 'RESTOCK') {
        // 재입고: 재고 증가
        updateStock('IN', {
            sku: item.sku, name: item.skuName, qty: item.qty,
            lotId: 'LOT-RET-'+item.id, location: 'WH02-R-01',
            refType: '반품재입고', refId: item.id
        });
        item.status = 'Restocked';
        alert('재입고 처리 및 재고 반영 완료');
    } else {
        // 폐기: 재고 변화 없음 (이미 나간 물건이므로)
        item.status = 'Disposed';
        alert('폐기 처리 완료 (재고 미반영)');
    }
    
    localStorage.setItem(DB_RETURNS, JSON.stringify(list));
    closeModal('returnProcessModal');
    renderReturnsPage();
}


// --- 유틸리티 ---
function populateProductOptions(selectId) {
    const el = document.getElementById(selectId);
    if (!el) return;
    const products = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || [];
    el.innerHTML = '<option value="">상품 선택</option>' + 
        products.map(p => `<option value="${p.sku}">${p.name}</option>`).join('');
}
function initializeTabs() {
    document.querySelectorAll('.tab-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.target.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            e.target.classList.add('active');
        });
    });
}
function openModal(id) { document.getElementById(id).style.display = 'block'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function openReturnProcessModal(id) {
    document.getElementById('proc-ret-id').value = id;
    openModal('returnProcessModal');
}

/* ==========================================================================
   [추가] 관리자(Admin) 페이지 전용 로직
   ========================================================================== */

function renderAdminPage() {
    renderProducts();
    renderPartners();
    renderWarehouses();
    renderLocations();
}

// --- 1. 상품 관리 (Products) ---
function renderProducts() {
    const list = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || [];
    const tbody = document.getElementById('product-tbody');
    if(!tbody) return;
    
    tbody.innerHTML = list.map(p => `
        <tr>
            <td>${p.sku}</td><td>${p.name}</td><td>${p.category}</td><td>${p.safetyStock}</td>
            <td><button onclick="openProductModal('EDIT', '${p.sku}')">수정</button></td>
        </tr>
    `).join('');
}

function openProductModal(mode, sku = '') {
    document.getElementById('prod-mode').value = mode;
    const title = document.getElementById('prod-modal-title');
    
    if (mode === 'EDIT') {
        title.innerText = '상품 수정';
        const list = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || [];
        const target = list.find(p => p.sku === sku);
        if(target) {
            document.getElementById('prod-sku').value = target.sku;
            document.getElementById('prod-sku').readOnly = true; // PK 수정 불가
            document.getElementById('prod-name').value = target.name;
            document.getElementById('prod-cat').value = target.category;
            document.getElementById('prod-safe').value = target.safetyStock;
        }
    } else {
        title.innerText = '신규 상품 등록';
        document.getElementById('prod-sku').value = '';
        document.getElementById('prod-sku').readOnly = false;
        document.getElementById('prod-name').value = '';
        document.getElementById('prod-safe').value = 50;
    }
    openModal('productModal');
}

function saveProduct() {
    const mode = document.getElementById('prod-mode').value;
    const sku = document.getElementById('prod-sku').value;
    const name = document.getElementById('prod-name').value;
    const cat = document.getElementById('prod-cat').value;
    const safe = document.getElementById('prod-safe').value;

    if(!sku || !name) return alert('필수값을 입력하세요.');

    let list = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || [];
    
    if (mode === 'NEW') {
        if(list.find(p => p.sku === sku)) return alert('이미 존재하는 SKU입니다.');
        list.push({ sku, name, category: cat, safetyStock: safe });
    } else {
        const idx = list.findIndex(p => p.sku === sku);
        if(idx > -1) list[idx] = { sku, name, category: cat, safetyStock: safe };
    }

    localStorage.setItem(DB_PRODUCTS, JSON.stringify(list));
    alert('저장되었습니다.');
    closeModal('productModal');
    renderProducts();
}


// --- 2. 거래처 관리 (Partners) ---
function renderPartners() {
    const list = JSON.parse(localStorage.getItem(DB_PARTNERS)) || [];
    const tbody = document.getElementById('partner-tbody');
    if(!tbody) return;

    tbody.innerHTML = list.map(p => `
        <tr>
            <td>${p.id}</td><td>${p.name}</td><td>${p.type}</td><td>${p.manager || '-'}</td>
            <td><button onclick="openPartnerModal('EDIT', '${p.id}')">수정</button></td>
        </tr>
    `).join('');
}

function openPartnerModal(mode, id = '') {
    document.getElementById('part-mode').value = mode;
    if(mode === 'EDIT') {
        const list = JSON.parse(localStorage.getItem(DB_PARTNERS)) || [];
        const target = list.find(p => p.id === id);
        if(target) {
            document.getElementById('part-id').value = target.id;
            document.getElementById('part-id').readOnly = true;
            document.getElementById('part-name').value = target.name;
            document.getElementById('part-type').value = target.type;
            document.getElementById('part-manager').value = target.manager || '';
        }
    } else {
        document.getElementById('part-id').value = '';
        document.getElementById('part-id').readOnly = false;
        document.getElementById('part-name').value = '';
        document.getElementById('part-manager').value = '';
    }
    openModal('partnerModal');
}

function savePartner() {
    const mode = document.getElementById('part-mode').value;
    const id = document.getElementById('part-id').value;
    const name = document.getElementById('part-name').value;
    const type = document.getElementById('part-type').value;
    const manager = document.getElementById('part-manager').value;

    if(!id || !name) return alert('필수 정보를 입력하세요.');

    let list = JSON.parse(localStorage.getItem(DB_PARTNERS)) || [];
    if(mode === 'NEW') {
        if(list.find(p => p.id === id)) return alert('중복된 ID입니다.');
        list.push({ id, name, type, manager });
    } else {
        const idx = list.findIndex(p => p.id === id);
        if(idx > -1) list[idx] = { id, name, type, manager };
    }
    localStorage.setItem(DB_PARTNERS, JSON.stringify(list));
    alert('저장되었습니다.');
    closeModal('partnerModal');
    renderPartners();
}


// --- 3. 창고 관리 (Warehouses) ---
function renderWarehouses() {
    const list = JSON.parse(localStorage.getItem(DB_WAREHOUSES)) || [];
    const tbody = document.getElementById('warehouse-tbody');
    if(!tbody) return;
    tbody.innerHTML = list.map(w => `
        <tr><td>${w.id}</td><td>${w.name}</td><td>${w.type}</td>
        <td><button onclick="openWarehouseModal('EDIT', '${w.id}')">수정</button></td></tr>
    `).join('');
}

function openWarehouseModal(mode, id='') {
    document.getElementById('wh-mode').value = mode;
    if(mode === 'EDIT') {
        const list = JSON.parse(localStorage.getItem(DB_WAREHOUSES)) || [];
        const target = list.find(w => w.id === id);
        if(target) {
            document.getElementById('wh-id').value = target.id;
            document.getElementById('wh-id').readOnly = true;
            document.getElementById('wh-name').value = target.name;
            document.getElementById('wh-type').value = target.type;
        }
    } else {
        document.getElementById('wh-id').value = '';
        document.getElementById('wh-id').readOnly = false;
        document.getElementById('wh-name').value = '';
    }
    openModal('warehouseModal');
}

function saveWarehouse() {
    const mode = document.getElementById('wh-mode').value;
    const id = document.getElementById('wh-id').value;
    const name = document.getElementById('wh-name').value;
    const type = document.getElementById('wh-type').value;
    
    if(!id) return alert('ID를 입력하세요.');

    let list = JSON.parse(localStorage.getItem(DB_WAREHOUSES)) || [];
    if(mode === 'NEW') {
        if(list.find(w => w.id === id)) return alert('중복 ID');
        list.push({ id, name, type });
    } else {
        const idx = list.findIndex(w => w.id === id);
        if(idx > -1) list[idx] = { id, name, type };
    }
    localStorage.setItem(DB_WAREHOUSES, JSON.stringify(list));
    alert('저장되었습니다.');
    closeModal('warehouseModal');
    renderWarehouses();
}


// --- 4. 로케이션 관리 (Locations) ---
function renderLocations() {
    const list = JSON.parse(localStorage.getItem(DB_LOCATIONS)) || [];
    const tbody = document.getElementById('location-tbody');
    if(!tbody) return;
    tbody.innerHTML = list.map(l => `
        <tr><td>${l.id}</td><td>${l.whId}</td><td>${l.desc}</td>
        <td><button onclick="openLocationModal('EDIT', '${l.id}')">수정</button></td></tr>
    `).join('');
}

function openLocationModal(mode, id='') {
    document.getElementById('loc-mode').value = mode;
    if(mode === 'EDIT') {
        const list = JSON.parse(localStorage.getItem(DB_LOCATIONS)) || [];
        const target = list.find(l => l.id === id);
        if(target) {
            document.getElementById('loc-id').value = target.id;
            document.getElementById('loc-id').readOnly = true;
            document.getElementById('loc-wh').value = target.whId;
            document.getElementById('loc-desc').value = target.desc;
        }
    } else {
        document.getElementById('loc-id').value = '';
        document.getElementById('loc-id').readOnly = false;
        document.getElementById('loc-desc').value = '';
    }
    openModal('locationModal');
}

function saveLocation() {
    const mode = document.getElementById('loc-mode').value;
    const id = document.getElementById('loc-id').value;
    const whId = document.getElementById('loc-wh').value;
    const desc = document.getElementById('loc-desc').value;

    if(!id) return alert('ID 입력 필요');
    let list = JSON.parse(localStorage.getItem(DB_LOCATIONS)) || [];
    
    if(mode === 'NEW') {
        if(list.find(l => l.id === id)) return alert('중복 ID');
        list.push({ id, whId, desc });
    } else {
        const idx = list.findIndex(l => l.id === id);
        if(idx > -1) list[idx] = { id, whId, desc };
    }
    localStorage.setItem(DB_LOCATIONS, JSON.stringify(list));
    alert('저장되었습니다.');
    closeModal('locationModal');
    renderLocations();
}