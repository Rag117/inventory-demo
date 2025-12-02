/* ==========================================================================
   멍밥 ERP 통합 스크립트 (app.js)
   - 기준정보 (Master Data) 관리
   - 재고 (Stock) 및 수불부 (Ledger) 관리
   - 공통 UI (탭, 모달) 기능
   ========================================================================== */

// --- 로컬 스토리지 키 정의 ---
const STORAGE_KEY_PRODUCTS = 'mungbab_products';
const STORAGE_KEY_PARTNERS = 'mungbab_partners';
const STORAGE_KEY_WAREHOUSES = 'mungbab_warehouses';
const STORAGE_KEY_LOCATIONS = 'mungbab_locations';
const STORAGE_KEY_STOCK = 'mungbab_stock_data';
const STORAGE_KEY_LEDGER = 'mungbab_ledger_data';

document.addEventListener('DOMContentLoaded', () => {
    // 1. 데이터 초기화 (없으면 더미 데이터 생성)
    initMasterData();
    initStockData();

    // 2. 탭 기능 초기화
    initializeTabs();

    // 3. 페이지별 초기 렌더링
    // admin.html 인 경우
    if (document.getElementById('product-category-filter')) {
        renderProducts();
    }
    // stock.html 인 경우
    if (document.getElementById('current-stock-table')) {
        loadCurrentStock();
    }
});


/* ==========================================================================
   1. 기준정보 관리 (Admin) 로직
   ========================================================================== */

function initMasterData() {
    // (1) 창고: 2개 고정
    if (!localStorage.getItem(STORAGE_KEY_WAREHOUSES)) {
        const warehouses = [
            { id: 'WH-01', name: '제1 물류센터 (김포)', type: '일반', use: 'Y' },
            { id: 'WH-02', name: '제2 반품센터 (용인)', type: '반품/폐기', use: 'Y' }
        ];
        localStorage.setItem(STORAGE_KEY_WAREHOUSES, JSON.stringify(warehouses));
    }
    // (2) 로케이션
    if (!localStorage.getItem(STORAGE_KEY_LOCATIONS)) {
        const locations = [
            { id: 'WH01-A-01-01', whId: 'WH-01', zone: 'A', rack: '01', shelf: '01', desc: '사료 구역', use: 'Y' },
            { id: 'WH01-B-01-01', whId: 'WH-01', zone: 'B', rack: '01', shelf: '01', desc: '간식 구역', use: 'Y' },
            { id: 'WH02-D-01-01', whId: 'WH-02', zone: 'D', rack: '01', shelf: '01', desc: '폐기 대기', use: 'Y' }
        ];
        localStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(locations));
    }
    // (3) 상품
    if (!localStorage.getItem(STORAGE_KEY_PRODUCTS)) {
        const products = [
            { sku: 'SKU-D01', name: '프리미엄 그레인프리 사료', category: '사료', safetyStock: 50 },
            { sku: 'SKU-C01', name: '웰니스 고양이 캔', category: '간식/캔', safetyStock: 200 },
            { sku: 'SKU-T01', name: '유기농 닭가슴살 육포', category: '간식/캔', safetyStock: 100 }
        ];
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    }
    // (4) 거래처
    if (!localStorage.getItem(STORAGE_KEY_PARTNERS)) {
        const partners = [
            { id: '1001', name: '(주)튼튼펫푸드', type: '공급처', manager: '김철수' },
            { id: '2001', name: '행복한 펫샵', type: '고객사', manager: '최민준' }
        ];
        localStorage.setItem(STORAGE_KEY_PARTNERS, JSON.stringify(partners));
    }
}

// --- 렌더링 함수 ---
function renderProducts() {
    const tbody = document.querySelector('#tab-products tbody');
    if (!tbody) return;
    const filter = document.getElementById('product-category-filter').value;
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY_PRODUCTS)) || [];
    
    tbody.innerHTML = '';
    list.forEach(item => {
        if (filter === 'all' || item.category === filter) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.sku}</td><td>${item.name}</td><td>${item.category}</td><td>${item.safetyStock}</td>
                <td><button onclick="openProductModal('EDIT', '${item.sku}')">수정</button></td>
            `;
            tbody.appendChild(tr);
        }
    });
}

function renderWarehouses() {
    const tbody = document.querySelector('#tab-warehouses tbody');
    if (!tbody) return;
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY_WAREHOUSES)) || [];
    tbody.innerHTML = '';
    list.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.id}</td><td>${item.name}</td><td>${item.type}</td><td>${item.use}</td>`;
        tbody.appendChild(tr);
    });
}

function renderLocations() {
    const tbody = document.querySelector('#tab-locations tbody');
    if (!tbody) return;
    const filter = document.getElementById('wh-select-filter').value;
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY_LOCATIONS)) || [];
    
    tbody.innerHTML = '';
    list.forEach(item => {
        if (filter === 'all' || item.whId === filter) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.id}</td><td>${item.whId}</td><td>${item.zone}-${item.rack}-${item.shelf}</td><td>${item.desc}</td><td>${item.use}</td>
            `;
            tbody.appendChild(tr);
        }
    });
}

function renderPartners() {
    const tbody = document.querySelector('#tab-partners tbody');
    if (!tbody) return;
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY_PARTNERS)) || [];
    tbody.innerHTML = '';
    list.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.id}</td><td>${item.name}</td><td>${item.type}</td><td>${item.manager}</td>`;
        tbody.appendChild(tr);
    });
}

// --- 저장/수정 액션 ---
function openProductModal(mode, sku = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const btn = document.getElementById('productModalBtn');
    
    document.getElementById('prod-sku').value = '';
    document.getElementById('prod-name').value = '';
    document.getElementById('prod-cat').value = '사료';
    document.getElementById('prod-safe').value = 0;

    if (mode === 'EDIT' && sku) {
        title.innerText = '상품 수정';
        btn.innerText = '수정 저장';
        btn.onclick = () => saveProduct('EDIT');
        const list = JSON.parse(localStorage.getItem(STORAGE_KEY_PRODUCTS)) || [];
        const target = list.find(p => p.sku === sku);
        if(target) {
            document.getElementById('prod-sku').value = target.sku;
            document.getElementById('prod-sku').readOnly = true;
            document.getElementById('prod-name').value = target.name;
            document.getElementById('prod-cat').value = target.category;
            document.getElementById('prod-safe').value = target.safetyStock;
        }
    } else {
        title.innerText = '신규 상품 등록';
        btn.innerText = '등록';
        btn.onclick = () => saveProduct('NEW');
        document.getElementById('prod-sku').readOnly = false;
    }
    openModal('productModal');
}

function saveProduct(mode) {
    const sku = document.getElementById('prod-sku').value;
    const name = document.getElementById('prod-name').value;
    const cat = document.getElementById('prod-cat').value;
    const safe = document.getElementById('prod-safe').value;
    if(!sku || !name) return alert('필수 입력값을 확인하세요.');

    let list = JSON.parse(localStorage.getItem(STORAGE_KEY_PRODUCTS)) || [];
    if (mode === 'NEW') {
        if(list.find(p => p.sku === sku)) return alert('이미 존재하는 SKU입니다.');
        list.push({ sku, name, category: cat, safetyStock: safe });
    } else {
        const idx = list.findIndex(p => p.sku === sku);
        if(idx > -1) list[idx] = { sku, name, category: cat, safetyStock: safe };
    }
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(list));
    closeModal('productModal');
    renderProducts();
}

function savePartner() {
    const id = document.getElementById('part-id').value;
    const name = document.getElementById('part-name').value;
    const type = document.getElementById('part-type').value;
    const manager = document.getElementById('part-manager').value;
    let list = JSON.parse(localStorage.getItem(STORAGE_KEY_PARTNERS)) || [];
    list.push({ id, name, type, manager });
    localStorage.setItem(STORAGE_KEY_PARTNERS, JSON.stringify(list));
    closeModal('partnerModal');
    renderPartners();
}

function saveWarehouse() {
    const id = document.getElementById('wh-id').value;
    const name = document.getElementById('wh-name').value;
    const type = document.getElementById('wh-type').value;
    let list = JSON.parse(localStorage.getItem(STORAGE_KEY_WAREHOUSES)) || [];
    list.push({ id, name, type, use: 'Y' });
    localStorage.setItem(STORAGE_KEY_WAREHOUSES, JSON.stringify(list));
    closeModal('warehouseModal');
    renderWarehouses();
}

function saveLocation() {
    const whId = document.getElementById('loc-wh').value;
    const zone = document.getElementById('loc-zone').value;
    const rack = document.getElementById('loc-rack').value;
    const shelf = document.getElementById('loc-shelf').value;
    const desc = document.getElementById('loc-desc').value;
    const id = `${whId.replace('-','')}-${zone}-${rack}-${shelf}`;

    let list = JSON.parse(localStorage.getItem(STORAGE_KEY_LOCATIONS)) || [];
    list.push({ id, whId, zone, rack, shelf, desc, use: 'Y' });
    localStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(list));
    closeModal('locationModal');
    renderLocations();
}


/* ==========================================================================
   2. 재고 관리 (Stock) & 수불부 (Ledger) 로직
   ========================================================================== */

function initStockData() {
    if (!localStorage.getItem(STORAGE_KEY_STOCK)) {
        const initialStock = [
            { sku: 'SKU-D01', name: '프리미엄 그레인프리 사료', lotId: 'D01-A251110', location: 'WH01-A-01-01', qty: 20, expiry: '2025-11-29' },
            { sku: 'SKU-C01', name: '웰니스 고양이 캔', lotId: 'C01-A251111', location: 'WH01-B-01-01', qty: 100, expiry: '2026-01-10' }
        ];
        localStorage.setItem(STORAGE_KEY_STOCK, JSON.stringify(initialStock));
    }
    if (!localStorage.getItem(STORAGE_KEY_LEDGER)) {
        const initialLedger = [
            { date: '2025-11-10', type: '입고(PO)', sku: 'SKU-D01', name: '프리미엄 그레인프리 사료', refId: 'PO-001', inQty: 20, outQty: 0 }
        ];
        localStorage.setItem(STORAGE_KEY_LEDGER, JSON.stringify(initialLedger));
    }
}

// 현재고 렌더링
function loadCurrentStock() {
    const tbody = document.getElementById('stock-tbody');
    if (!tbody) return;
    const stockList = JSON.parse(localStorage.getItem(STORAGE_KEY_STOCK)) || [];
    tbody.innerHTML = '';
    stockList.forEach(item => {
        if (item.qty <= 0) return;
        const daysLeft = Math.ceil((new Date(item.expiry) - new Date()) / (1000 * 60 * 60 * 24));
        let statusBadge = daysLeft <= 30 ? `<span class="status-wait">임박 (${daysLeft}일)</span>` : '<span class="status-done">정상</span>';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.sku}</td><td>${item.name}</td><td>${item.lotId}</td><td>${item.location}</td>
            <td style="text-align:right; font-weight:bold">${item.qty.toLocaleString()}</td>
            <td>${item.expiry}</td><td>${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 재고 수불부 조회 (날짜별 잔고 계산 포함)
function loadStockLedger() {
    const tbody = document.getElementById('ledger-tbody');
    if (!tbody) return;
    
    const startDate = document.getElementById('ledger-start-date')?.value || '2025-01-01';
    const endDate = document.getElementById('ledger-end-date')?.value || new Date().toISOString().split('T')[0];
    const skuFilter = (document.getElementById('ledger-sku-filter')?.value || '').toUpperCase();

    let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY_LEDGER)) || [];
    // 날짜 오름차순 정렬 (계산용)
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    let skuBalanceMap = {};
    
    // 잔고 계산
    const calculated = transactions.map(tx => {
        let bal = skuBalanceMap[tx.sku] || 0;
        if (tx.inQty > 0) bal += parseInt(tx.inQty);
        if (tx.outQty > 0) bal -= parseInt(tx.outQty);
        skuBalanceMap[tx.sku] = bal;
        return { ...tx, balanceSnapshot: bal };
    });

    // 필터링
    const filtered = calculated.filter(item => {
        const inDate = item.date >= startDate && item.date <= endDate;
        const inSku = skuFilter === '' || item.sku.includes(skuFilter) || item.name.includes(skuFilter);
        return inDate && inSku;
    });

    // 화면용 내림차순 정렬
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">거래 내역 없음</td></tr>';
        return;
    }

    filtered.forEach(row => {
        const tr = document.createElement('tr');
        const typeHtml = row.inQty > 0 ? `<span class="status-done">${row.type}</span>` : `<span class="status-danger">${row.type}</span>`;
        tr.innerHTML = `
            <td>${row.date}</td><td>${typeHtml}</td><td>${row.sku}</td><td>${row.name}</td><td>${row.refId || '-'}</td>
            <td style="color:blue; text-align:right">${row.inQty > 0 ? '+' + row.inQty : '-'}</td>
            <td style="color:red; text-align:right">${row.outQty > 0 ? '-' + row.outQty : '-'}</td>
            <td style="text-align:right; font-weight:bold; background-color:#f9fafb">${row.balanceSnapshot}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 재고 트랜잭션 발생
function updateStockTransaction(type, sku, name, lotId, qty, refId) {
    let stockList = JSON.parse(localStorage.getItem(STORAGE_KEY_STOCK)) || [];
    let ledgerList = JSON.parse(localStorage.getItem(STORAGE_KEY_LEDGER)) || [];
    const today = new Date().toISOString().split('T')[0];

    let target = stockList.find(i => i.sku === sku && i.lotId === lotId);
    if (type === 'IN') {
        if (target) target.qty += parseInt(qty);
        else stockList.push({ sku, name, lotId, location: '입고대기', qty: parseInt(qty), expiry: '2026-12-31' });
    } else {
        if (target) target.qty -= parseInt(qty);
        else return alert('재고 부족');
    }

    ledgerList.push({ date: today, type: type === 'IN'?'입고':'출고', sku, name, refId, inQty: type==='IN'?qty:0, outQty: type==='OUT'?qty:0 });
    
    localStorage.setItem(STORAGE_KEY_STOCK, JSON.stringify(stockList));
    localStorage.setItem(STORAGE_KEY_LEDGER, JSON.stringify(ledgerList));
    
    if (document.getElementById('current-stock-table')) {
        loadCurrentStock();
        loadStockLedger();
    }
}

function confirmShipment() {
    if(confirm('출고 확정하시겠습니까?')) {
        updateStockTransaction('OUT', 'SKU-D01', '프리미엄 그레인프리 사료', 'D01-A251110', 20, 'SO-202511-002');
        alert('출고 완료 및 재고 차감됨');
        window.location.href = 'stock.html';
    }
}


/* ==========================================================================
   3. 공통 유틸리티 (Tabs, Modal)
   ========================================================================== */

function initializeTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    tabLinks.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            button.closest('.tabs').querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            const target = document.getElementById(tabId);
            if (target) target.classList.add('active');

            // 탭 전환 시 데이터 리로드
            if(tabId === 'tab-products') renderProducts();
            if(tabId === 'tab-warehouses') renderWarehouses();
            if(tabId === 'tab-locations') renderLocations();
            if(tabId === 'tab-partners') renderPartners();
            if(tabId === 'tab-current-stock') loadCurrentStock();
            if(tabId === 'tab-stock-ledger') loadStockLedger();
        });
    });
}

function openModal(modalId) {
    const m = document.getElementById(modalId);
    if(m) m.style.display = 'block';
}
function closeModal(modalId) {
    const m = document.getElementById(modalId);
    if(m) m.style.display = 'none';
}
// 검색 필터
function filterStockTable() {
    const input = document.getElementById('stock-search-input');
    if(!input) return;
    const filter = input.value.toUpperCase();
    const rows = document.getElementById('current-stock-table').querySelectorAll('tbody tr');
    rows.forEach(row => {
        const txt = row.innerText.toUpperCase();
        row.style.display = txt.includes(filter) ? '' : 'none';
    });
}