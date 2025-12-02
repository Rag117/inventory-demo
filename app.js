/* ==========================================================================
   멍밥 ERP 통합 엔진 (app.js) - Final Full Version
   ========================================================================== */

// --- 1. 데이터베이스 키 (DB Schema) ---
const DB_PRODUCTS = 'mungbab_products';
const DB_PARTNERS = 'mungbab_partners';
const DB_WAREHOUSES = 'mungbab_warehouses';
const DB_LOCATIONS = 'mungbab_locations';
const DB_STOCK = 'mungbab_stock_data';
const DB_LEDGER = 'mungbab_ledger_data';
const DB_PURCHASE = 'mungbab_purchase_orders';
const DB_SALES = 'mungbab_sales_orders';
const DB_RETURNS = 'mungbab_returns_data';

// --- 2. 초기화 및 라우팅 ---
document.addEventListener('DOMContentLoaded', () => {
    initSystemData();   // 기초 데이터 생성
    setupCommonUI();    // 날짜 등 공통 설정
    initializeTabs();   // 탭 기능

    // 페이지별 렌더링 라우터
    if (document.getElementById('product-tbody')) renderAdminPage(); // admin.html
    if (document.getElementById('inventoryChart')) renderDashboard(); // dashboard.html
    if (document.getElementById('purchase-table')) renderPurchasePage(); // purchase.html
    if (document.getElementById('sales-table')) renderSalesPage(); // sales.html
    if (document.getElementById('current-stock-table')) { loadCurrentStock(); loadStockLedger(); } // stock.html
    if (document.getElementById('return-table')) renderReturnsPage(); // returns.html
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
            { id: 'V-001', name: '(주)튼튼펫푸드', type: '공급처', manager: '김철수' },
            { id: 'C-001', name: '냥이월드', type: '고객사', manager: '이영희' },
            { id: 'C-002', name: '행복한 펫샵', type: '고객사', manager: '박지성' }
        ];
        localStorage.setItem(DB_PARTNERS, JSON.stringify(partners));
    }
    // 3) 창고
    if (!localStorage.getItem(DB_WAREHOUSES)) {
        localStorage.setItem(DB_WAREHOUSES, JSON.stringify([
            { id: 'WH-01', name: '제1 물류센터', type: '일반' },
            { id: 'WH-02', name: '반품 센터', type: '반품' }
        ]));
    }
    // 4) 로케이션
    if (!localStorage.getItem(DB_LOCATIONS)) {
        localStorage.setItem(DB_LOCATIONS, JSON.stringify([
            { id: 'WH01-A-01', whId: 'WH-01', desc: 'A구역 (사료)' },
            { id: 'WH01-B-01', whId: 'WH-01', desc: 'B구역 (간식)' },
            { id: 'WH02-R-01', whId: 'WH-02', desc: '반품 대기존' }
        ]));
    }
    // 5) 초기 재고
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
   4. 관리자(Admin) 페이지 로직 - (상품/거래처/창고/로케이션)
   ========================================================================== */
function renderAdminPage() {
    renderProducts();
    renderPartners();
    renderWarehouses();
    renderLocations();
}

// 1. 상품 (Products)
function renderProducts() {
    const list = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || [];
    const tbody = document.getElementById('product-tbody');
    if(tbody) tbody.innerHTML = list.map(p => `<tr><td>${p.sku}</td><td>${p.name}</td><td>${p.category}</td><td>${p.safetyStock}</td><td><button onclick="openProductModal('EDIT', '${p.sku}')">수정</button></td></tr>`).join('');
}
function openProductModal(mode, sku='') {
    document.getElementById('prod-mode').value = mode;
    if(mode==='EDIT'){
        const t = (JSON.parse(localStorage.getItem(DB_PRODUCTS))||[]).find(p=>p.sku===sku);
        if(t){ document.getElementById('prod-sku').value=t.sku; document.getElementById('prod-sku').readOnly=true; document.getElementById('prod-name').value=t.name; document.getElementById('prod-cat').value=t.category; document.getElementById('prod-safe').value=t.safetyStock; }
    } else {
        document.getElementById('prod-sku').value=''; document.getElementById('prod-sku').readOnly=false; document.getElementById('prod-name').value=''; document.getElementById('prod-safe').value=50;
    }
    openModal('productModal');
}
function saveProduct() {
    const sku=document.getElementById('prod-sku').value, name=document.getElementById('prod-name').value, cat=document.getElementById('prod-cat').value, safe=document.getElementById('prod-safe').value, mode=document.getElementById('prod-mode').value;
    if(!sku || !name) return alert('필수 입력 누락');
    let list = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || [];
    if(mode==='NEW'){ if(list.find(p=>p.sku===sku)) return alert('중복 SKU'); list.push({sku,name,category:cat,safetyStock:safe}); }
    else { const idx=list.findIndex(p=>p.sku===sku); if(idx>-1) list[idx]={sku,name,category:cat,safetyStock:safe}; }
    localStorage.setItem(DB_PRODUCTS, JSON.stringify(list)); closeModal('productModal'); renderProducts();
}

// 2. 거래처 (Partners)
function renderPartners() {
    const list = JSON.parse(localStorage.getItem(DB_PARTNERS)) || [];
    const tbody = document.getElementById('partner-tbody');
    if(tbody) tbody.innerHTML = list.map(p => `<tr><td>${p.id}</td><td>${p.name}</td><td>${p.type}</td><td>${p.manager}</td><td><button onclick="openPartnerModal('EDIT', '${p.id}')">수정</button></td></tr>`).join('');
}
function openPartnerModal(mode, id='') {
    document.getElementById('part-mode').value = mode;
    if(mode==='EDIT'){
        const t = (JSON.parse(localStorage.getItem(DB_PARTNERS))||[]).find(p=>p.id===id);
        if(t){ document.getElementById('part-id').value=t.id; document.getElementById('part-id').readOnly=true; document.getElementById('part-name').value=t.name; document.getElementById('part-type').value=t.type; document.getElementById('part-manager').value=t.manager; }
    } else {
        document.getElementById('part-id').value=''; document.getElementById('part-id').readOnly=false; document.getElementById('part-name').value=''; document.getElementById('part-manager').value='';
    }
    openModal('partnerModal');
}
function savePartner() {
    const id=document.getElementById('part-id').value, name=document.getElementById('part-name').value, type=document.getElementById('part-type').value, manager=document.getElementById('part-manager').value, mode=document.getElementById('part-mode').value;
    if(!id || !name) return alert('필수 입력 누락');
    let list = JSON.parse(localStorage.getItem(DB_PARTNERS)) || [];
    if(mode==='NEW'){ if(list.find(p=>p.id===id)) return alert('중복 ID'); list.push({id,name,type,manager}); }
    else { const idx=list.findIndex(p=>p.id===id); if(idx>-1) list[idx]={id,name,type,manager}; }
    localStorage.setItem(DB_PARTNERS, JSON.stringify(list)); closeModal('partnerModal'); renderPartners();
}

// 3. 창고 (Warehouses)
function renderWarehouses() {
    const list = JSON.parse(localStorage.getItem(DB_WAREHOUSES)) || [];
    const tbody = document.getElementById('warehouse-tbody');
    if(tbody) tbody.innerHTML = list.map(w => `<tr><td>${w.id}</td><td>${w.name}</td><td>${w.type}</td><td><button onclick="openWarehouseModal('EDIT', '${w.id}')">수정</button></td></tr>`).join('');
}
function openWarehouseModal(mode, id='') {
    document.getElementById('wh-mode').value = mode;
    if(mode==='EDIT'){
        const t = (JSON.parse(localStorage.getItem(DB_WAREHOUSES))||[]).find(w=>w.id===id);
        if(t){ document.getElementById('wh-id').value=t.id; document.getElementById('wh-id').readOnly=true; document.getElementById('wh-name').value=t.name; document.getElementById('wh-type').value=t.type; }
    } else {
        document.getElementById('wh-id').value=''; document.getElementById('wh-id').readOnly=false; document.getElementById('wh-name').value='';
    }
    openModal('warehouseModal');
}
function saveWarehouse() {
    const id=document.getElementById('wh-id').value, name=document.getElementById('wh-name').value, type=document.getElementById('wh-type').value, mode=document.getElementById('wh-mode').value;
    if(!id) return alert('ID 필수');
    let list = JSON.parse(localStorage.getItem(DB_WAREHOUSES)) || [];
    if(mode==='NEW'){ if(list.find(w=>w.id===id)) return alert('중복 ID'); list.push({id,name,type}); }
    else { const idx=list.findIndex(w=>w.id===id); if(idx>-1) list[idx]={id,name,type}; }
    localStorage.setItem(DB_WAREHOUSES, JSON.stringify(list)); closeModal('warehouseModal'); renderWarehouses();
}

// 4. 로케이션 (Locations)
function renderLocations() {
    const list = JSON.parse(localStorage.getItem(DB_LOCATIONS)) || [];
    const tbody = document.getElementById('location-tbody');
    if(tbody) tbody.innerHTML = list.map(l => `<tr><td>${l.id}</td><td>${l.whId}</td><td>${l.desc}</td><td><button onclick="openLocationModal('EDIT', '${l.id}')">수정</button></td></tr>`).join('');
}
function openLocationModal(mode, id='') {
    document.getElementById('loc-mode').value = mode;
    if(mode==='EDIT'){
        const t = (JSON.parse(localStorage.getItem(DB_LOCATIONS))||[]).find(l=>l.id===id);
        if(t){ document.getElementById('loc-id').value=t.id; document.getElementById('loc-id').readOnly=true; document.getElementById('loc-wh').value=t.whId; document.getElementById('loc-desc').value=t.desc; }
    } else {
        document.getElementById('loc-id').value=''; document.getElementById('loc-id').readOnly=false; document.getElementById('loc-desc').value='';
    }
    openModal('locationModal');
}
function saveLocation() {
    const id=document.getElementById('loc-id').value, whId=document.getElementById('loc-wh').value, desc=document.getElementById('loc-desc').value, mode=document.getElementById('loc-mode').value;
    if(!id) return alert('ID 필수');
    let list = JSON.parse(localStorage.getItem(DB_LOCATIONS)) || [];
    if(mode==='NEW'){ if(list.find(l=>l.id===id)) return alert('중복 ID'); list.push({id,whId,desc}); }
    else { const idx=list.findIndex(l=>l.id===id); if(idx>-1) list[idx]={id,whId,desc}; }
    localStorage.setItem(DB_LOCATIONS, JSON.stringify(list)); closeModal('locationModal'); renderLocations();
}


/* ==========================================================================
   5. 핵심 로직 (재고 트랜잭션, 대시보드, 입출고 등)
   ========================================================================== */

function updateStock(actionType, data) {
    let stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    let ledgerList = JSON.parse(localStorage.getItem(DB_LEDGER)) || [];
    const today = new Date().toISOString().split('T')[0];

    // 1. 입고 (IN)
    if (actionType === 'IN') {
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

    localStorage.setItem(DB_STOCK, JSON.stringify(stockList));
    localStorage.setItem(DB_LEDGER, JSON.stringify(ledgerList));
    return true;
}

// --- [대시보드] Dashboard ---
function renderDashboard() {
    const stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    const products = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || [];
    
    // 차트 데이터 집계
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

    // 알림 위젯 (안전재고)
    const lowStockList = document.getElementById('low-stock-list');
    lowStockList.innerHTML = '';
    products.forEach(p => {
        const current = stockBySku[p.sku] ? stockBySku[p.sku].qty : 0;
        if (current < p.safetyStock) {
            lowStockList.innerHTML += `<li>⚠️ [${p.name}] 현재: ${current} < 안전: ${p.safetyStock}</li>`;
        }
    });
    
    // 알림 위젯 (유통기한)
    const expiryList = document.getElementById('expiry-list');
    expiryList.innerHTML = '';
    const today = new Date();
    stockList.forEach(s => {
        if (s.qty > 0 && s.expiry) {
            const expDate = new Date(s.expiry);
            const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30 && diffDays >= 0) {
                expiryList.innerHTML += `<li>⏳ [${s.name}] Lot:${s.lotId} (${diffDays}일 남음)</li>`;
            }
        }
    });
}

// --- [입고 관리] Purchase ---
function renderPurchasePage() {
    const list = JSON.parse(localStorage.getItem(DB_PURCHASE)) || [];
    const tbody = document.querySelector('#purchase-table tbody');
    tbody.innerHTML = list.map(po => `
        <tr>
            <td>${po.id}</td><td>${po.partnerName}</td><td>${po.skuName}</td><td>${po.qty}</td>
            <td>${po.status === 'Ordered' ? `<button class="btn-primary" onclick="processPurchaseReceive('${po.id}')">입고처리</button>` : '<span class="status-done">입고완료</span>'}</td>
        </tr>
    `).join('');
    populateProductOptions('po-sku-select');
}

function registerPurchase() {
    const skuSel = document.getElementById('po-sku-select');
    const partner = document.getElementById('po-partner').value;
    const qty = document.getElementById('po-qty').value;
    if (!skuSel.value || !qty) return alert('필수 정보 누락');
    const list = JSON.parse(localStorage.getItem(DB_PURCHASE)) || [];
    list.push({ id: 'PO-' + Date.now(), sku: skuSel.value, skuName: skuSel.options[skuSel.selectedIndex].text, partnerName: partner, qty: parseInt(qty), date: new Date().toISOString().split('T')[0], status: 'Ordered' });
    localStorage.setItem(DB_PURCHASE, JSON.stringify(list));
    alert('발주 등록 완료'); closeModal('purchaseModal'); renderPurchasePage();
}

function processPurchaseReceive(poId) {
    const list = JSON.parse(localStorage.getItem(DB_PURCHASE)) || [];
    const po = list.find(p => p.id === poId);
    if (!po) return;
    const lotId = 'LOT-' + poId.split('-')[1];
    updateStock('IN', { sku: po.sku, name: po.skuName, qty: po.qty, lotId: lotId, location: 'WH01-Temp', refType: '구매입고', refId: po.id, expiry: '2026-12-31' });
    po.status = 'Received';
    localStorage.setItem(DB_PURCHASE, JSON.stringify(list));
    alert('입고 처리 완료 (재고 증가)'); renderPurchasePage();
}

// --- [수주 관리] Sales ---
function renderSalesPage() {
    const list = JSON.parse(localStorage.getItem(DB_SALES)) || [];
    const tbody = document.querySelector('#sales-table tbody');
    tbody.innerHTML = list.map(so => `
        <tr>
            <td>${so.id}</td><td>${so.customer}</td><td>${so.skuName}</td><td>${so.qty}</td>
            <td>${so.status === 'Ordered' ? `<button class="btn-primary" onclick="openShipmentModal('${so.id}')">출고처리</button>` : '<span class="status-done">출고완료</span>'}</td>
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
    list.push({ id: 'SO-' + Date.now(), sku: skuSel.value, skuName: skuSel.options[skuSel.selectedIndex].text, customer: customer, qty: parseInt(qty), status: 'Ordered' });
    localStorage.setItem(DB_SALES, JSON.stringify(list));
    alert('수주 등록 완료'); closeModal('salesRegModal'); renderSalesPage();
}

function openShipmentModal(soId) {
    const salesList = JSON.parse(localStorage.getItem(DB_SALES));
    const so = salesList.find(s => s.id === soId);
    document.getElementById('ship-so-id').value = so.id;
    document.getElementById('ship-req-qty').value = so.qty;
    document.getElementById('ship-sku-hidden').value = so.sku;
    document.getElementById('ship-name-hidden').value = so.skuName;
    const stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    const availableLots = stockList.filter(s => s.sku === so.sku && s.qty > 0);
    const lotSelect = document.getElementById('ship-lot-select');
    lotSelect.innerHTML = availableLots.map(l => `<option value="${l.lotId}">Lot: ${l.lotId} (잔고: ${l.qty}, 유통기한: ${l.expiry})</option>`).join('');
    openModal('shipmentModal');
}

function confirmShipment() {
    const soId = document.getElementById('ship-so-id').value;
    const lotId = document.getElementById('ship-lot-select').value;
    const sku = document.getElementById('ship-sku-hidden').value;
    const name = document.getElementById('ship-name-hidden').value;
    const qty = parseInt(document.getElementById('ship-req-qty').value);
    const success = updateStock('OUT', { sku, name, lotId, qty, refType: '수주출고', refId: soId });
    if (success) {
        let salesList = JSON.parse(localStorage.getItem(DB_SALES));
        let so = salesList.find(s => s.id === soId);
        so.status = 'Shipped';
        localStorage.setItem(DB_SALES, JSON.stringify(salesList));
        alert('출고 완료'); closeModal('shipmentModal'); renderSalesPage();
    }
}

// --- [재고 및 리포트] Stock & Ledger ---
function loadCurrentStock() {
    const tbody = document.getElementById('stock-tbody');
    const stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    const filterText = document.getElementById('stock-search-input') ? document.getElementById('stock-search-input').value.toLowerCase() : '';
    tbody.innerHTML = stockList.filter(s => s.qty > 0 && (s.name.includes(filterText) || s.sku.toLowerCase().includes(filterText))).map(s => `
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
    let runningBalance = {};
    let html = '';
    ledgerList.forEach(row => {
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
            </tr>`;
    });
    tbody.innerHTML = html;
}
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
        </tr>`).join('');
    populateProductOptions('ret-sku-select');
}
function registerReturn() {
    const skuSel = document.getElementById('ret-sku-select');
    const qty = document.getElementById('ret-qty').value;
    const reason = document.getElementById('ret-reason').value;
    const list = JSON.parse(localStorage.getItem(DB_RETURNS)) || [];
    list.push({ id: 'RT-' + Date.now(), date: new Date().toISOString().split('T')[0], sku: skuSel.value, skuName: skuSel.options[skuSel.selectedIndex].text, qty: parseInt(qty), reason: reason, status: 'Requested' });
    localStorage.setItem(DB_RETURNS, JSON.stringify(list));
    alert('반품 접수 완료'); closeModal('returnRegModal'); renderReturnsPage();
}
function completeReturnProcess() {
    const id = document.getElementById('proc-ret-id').value;
    const action = document.getElementById('proc-action').value;
    let list = JSON.parse(localStorage.getItem(DB_RETURNS)) || [];
    let item = list.find(r => r.id === id);
    if (action === 'RESTOCK') {
        updateStock('IN', { sku: item.sku, name: item.skuName, qty: item.qty, lotId: 'LOT-RET-'+item.id, location: 'WH02-R-01', refType: '반품재입고', refId: item.id });
        item.status = 'Restocked'; alert('재입고 완료');
    } else {
        item.status = 'Disposed'; alert('폐기 완료');
    }
    localStorage.setItem(DB_RETURNS, JSON.stringify(list)); closeModal('returnProcessModal'); renderReturnsPage();
}

// --- 유틸리티 ---
function populateProductOptions(selectId) {
    const el = document.getElementById(selectId);
    if (!el) return;
    const products = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || [];
    el.innerHTML = '<option value="">상품 선택</option>' + products.map(p => `<option value="${p.sku}">${p.name}</option>`).join('');
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
function openReturnProcessModal(id) { document.getElementById('proc-ret-id').value = id; openModal('returnProcessModal'); }