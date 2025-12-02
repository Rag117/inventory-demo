/* ==========================================================================
   멍밥 ERP 통합 엔진 (app.js) - Linked & Synced Version
   ========================================================================== */

// --- 1. 데이터베이스 키 ---
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
    initSystemData();   
    setupCommonUI();    
    initializeTabs();   

    // 페이지별 렌더링 (모든 페이지에서 최신 데이터를 불러오도록 보장)
    if (document.getElementById('product-tbody')) renderAdminPage(); 
    if (document.getElementById('inventoryChart')) renderDashboard(); 
    if (document.getElementById('purchase-table')) renderPurchasePage(); 
    if (document.getElementById('sales-table')) renderSalesPage(); 
    if (document.getElementById('current-stock-table')) { loadCurrentStock(); loadStockLedger(); } 
    if (document.getElementById('return-table')) renderReturnsPage(); 
});

/* ==========================================================================
   3. 데이터 초기화 (Bootstrapping) - [수정] 데이터 간 연결성 강화
   ========================================================================== */
function initSystemData() {
    // 1) 상품 (Master)
    if (!localStorage.getItem(DB_PRODUCTS)) {
        const products = [
            { sku: 'SKU-D01', name: '프리미엄 그레인프리 사료', category: '사료', safetyStock: 50 },
            { sku: 'SKU-C01', name: '웰니스 고양이 캔', category: '간식/캔', safetyStock: 200 },
            { sku: 'SKU-T01', name: '유기농 닭가슴살 육포', category: '간식/캔', safetyStock: 100 }
        ];
        localStorage.setItem(DB_PRODUCTS, JSON.stringify(products));
    }
    // 2) 거래처 (Master)
    if (!localStorage.getItem(DB_PARTNERS)) {
        localStorage.setItem(DB_PARTNERS, JSON.stringify([
            { id: 'V-001', name: '(주)튼튼펫푸드', type: '공급처', manager: '김철수' },
            { id: 'C-001', name: '냥이월드', type: '고객사', manager: '이영희' }
        ]));
    }
    // 3) 창고 (Master)
    if (!localStorage.getItem(DB_WAREHOUSES)) {
        localStorage.setItem(DB_WAREHOUSES, JSON.stringify([
            { id: 'WH-01', name: '제1 물류센터', type: '일반' },
            { id: 'WH-02', name: '반품 센터', type: '반품' }
        ]));
    }
    // 4) 로케이션 (Master)
    if (!localStorage.getItem(DB_LOCATIONS)) {
        localStorage.setItem(DB_LOCATIONS, JSON.stringify([
            { id: 'WH01-A-01', whId: 'WH-01', desc: 'A구역 (사료)' },
            { id: 'WH01-B-01', whId: 'WH-01', desc: 'B구역 (간식)' }
        ]));
    }
    // 5) 초기 재고 (Transaction) - SKU가 Master와 일치해야 함
    if (!localStorage.getItem(DB_STOCK)) {
        const today = new Date().toISOString().split('T')[0];
        const stock = [
            // SKU-D01, SKU-C01 등 위에서 정의한 SKU를 사용해야 연동됨
            { sku: 'SKU-D01', lotId: 'LOT-INIT-01', location: 'WH01-A-01', qty: 60, date: today, expiry: '2025-12-31' },
            { sku: 'SKU-C01', lotId: 'LOT-INIT-02', location: 'WH01-B-01', qty: 150, date: today, expiry: '2026-05-01' }
        ];
        // *주의: 재고 데이터에는 '상품명(name)'을 굳이 저장하지 않거나, 저장하더라도 조회 시점에 Master를 참조하는 것이 좋습니다.
        // 편의상 여기선 저장하지 않고 조회 시 Join합니다.
        localStorage.setItem(DB_STOCK, JSON.stringify(stock));
        
        const ledger = stock.map(s => ({
            date: today, type: '기초재고', sku: s.sku, inQty: s.qty, outQty: 0, refId: 'INIT'
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
   4. 관리자(Admin) 페이지 - 기준정보 관리
   ========================================================================== */
function renderAdminPage() {
    renderProducts(); renderPartners(); renderWarehouses(); renderLocations();
}
// (관리자 페이지 CRUD 함수들은 기존과 동일하므로 지면 관계상 핵심만 유지하고 생략하지 않고 넣어드립니다)
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
// (거래처, 창고, 로케이션 함수는 이전과 동일 - 생략 없이 작동하도록 기존 코드 사용 필요)
function renderPartners() { const list = JSON.parse(localStorage.getItem(DB_PARTNERS))||[]; const tbody = document.getElementById('partner-tbody'); if(tbody) tbody.innerHTML = list.map(p => `<tr><td>${p.id}</td><td>${p.name}</td><td>${p.type}</td><td>${p.manager}</td><td><button onclick="openPartnerModal('EDIT', '${p.id}')">수정</button></td></tr>`).join(''); }
function openPartnerModal(mode, id='') { document.getElementById('part-mode').value = mode; if(mode==='EDIT'){ const t = (JSON.parse(localStorage.getItem(DB_PARTNERS))||[]).find(p=>p.id===id); if(t){ document.getElementById('part-id').value=t.id; document.getElementById('part-id').readOnly=true; document.getElementById('part-name').value=t.name; document.getElementById('part-type').value=t.type; document.getElementById('part-manager').value=t.manager; } } else { document.getElementById('part-id').value=''; document.getElementById('part-id').readOnly=false; document.getElementById('part-name').value=''; document.getElementById('part-manager').value=''; } openModal('partnerModal'); }
function savePartner() { const id=document.getElementById('part-id').value, name=document.getElementById('part-name').value, type=document.getElementById('part-type').value, manager=document.getElementById('part-manager').value, mode=document.getElementById('part-mode').value; if(!id) return alert('ID필수'); let list = JSON.parse(localStorage.getItem(DB_PARTNERS))||[]; if(mode==='NEW'){ if(list.find(p=>p.id===id)) return alert('중복'); list.push({id,name,type,manager}); }else{ const idx=list.findIndex(p=>p.id===id); if(idx>-1) list[idx]={id,name,type,manager}; } localStorage.setItem(DB_PARTNERS, JSON.stringify(list)); closeModal('partnerModal'); renderPartners(); }
function renderWarehouses() { const list=JSON.parse(localStorage.getItem(DB_WAREHOUSES))||[]; const t=document.getElementById('warehouse-tbody'); if(t) t.innerHTML=list.map(w=>`<tr><td>${w.id}</td><td>${w.name}</td><td>${w.type}</td><td><button onclick="openWarehouseModal('EDIT','${w.id}')">수정</button></td></tr>`).join(''); }
function openWarehouseModal(mode,id=''){ document.getElementById('wh-mode').value=mode; if(mode==='EDIT'){ const t=(JSON.parse(localStorage.getItem(DB_WAREHOUSES))||[]).find(w=>w.id===id); if(t){ document.getElementById('wh-id').value=t.id; document.getElementById('wh-id').readOnly=true; document.getElementById('wh-name').value=t.name; document.getElementById('wh-type').value=t.type;} }else{ document.getElementById('wh-id').value=''; document.getElementById('wh-id').readOnly=false; document.getElementById('wh-name').value=''; } openModal('warehouseModal'); }
function saveWarehouse() { const id=document.getElementById('wh-id').value, name=document.getElementById('wh-name').value, type=document.getElementById('wh-type').value, mode=document.getElementById('wh-mode').value; if(!id) return alert('ID필수'); let list=JSON.parse(localStorage.getItem(DB_WAREHOUSES))||[]; if(mode==='NEW'){ if(list.find(w=>w.id===id)) return alert('중복'); list.push({id,name,type}); }else{ const idx=list.findIndex(w=>w.id===id); if(idx>-1) list[idx]={id,name,type}; } localStorage.setItem(DB_WAREHOUSES, JSON.stringify(list)); closeModal('warehouseModal'); renderWarehouses(); }
function renderLocations(){ const list=JSON.parse(localStorage.getItem(DB_LOCATIONS))||[]; const t=document.getElementById('location-tbody'); if(t) t.innerHTML=list.map(l=>`<tr><td>${l.id}</td><td>${l.whId}</td><td>${l.desc}</td><td><button onclick="openLocationModal('EDIT','${l.id}')">수정</button></td></tr>`).join(''); }
function openLocationModal(mode,id=''){ document.getElementById('loc-mode').value=mode; if(mode==='EDIT'){ const t=(JSON.parse(localStorage.getItem(DB_LOCATIONS))||[]).find(l=>l.id===id); if(t){ document.getElementById('loc-id').value=t.id; document.getElementById('loc-id').readOnly=true; document.getElementById('loc-wh').value=t.whId; document.getElementById('loc-desc').value=t.desc; } }else{ document.getElementById('loc-id').value=''; document.getElementById('loc-id').readOnly=false; document.getElementById('loc-desc').value=''; } openModal('locationModal'); }
function saveLocation(){ const id=document.getElementById('loc-id').value, whId=document.getElementById('loc-wh').value, desc=document.getElementById('loc-desc').value, mode=document.getElementById('loc-mode').value; if(!id)return alert('ID필수'); let list=JSON.parse(localStorage.getItem(DB_LOCATIONS))||[]; if(mode==='NEW'){ if(list.find(l=>l.id===id)) return alert('중복'); list.push({id,whId,desc}); }else{ const idx=list.findIndex(l=>l.id===id); if(idx>-1) list[idx]={id,whId,desc}; } localStorage.setItem(DB_LOCATIONS, JSON.stringify(list)); closeModal('locationModal'); renderLocations(); }


/* ==========================================================================
   5. 핵심 로직 - [연동 수정] SKU로 이름 실시간 조회 (JOIN)
   ========================================================================== */

// 유틸: SKU로 상품 정보 찾기 (Admin 데이터 참조)
function getProductInfo(sku) {
    const products = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || [];
    return products.find(p => p.sku === sku) || { name: sku, category: '알수없음', safetyStock: 0 };
}

function updateStock(actionType, data) {
    let stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    let ledgerList = JSON.parse(localStorage.getItem(DB_LEDGER)) || [];
    const today = new Date().toISOString().split('T')[0];
    
    // 입고/출고 시에는 SKU만 정확하면 됩니다. 이름은 저장하지 않아도 조회 시 가져옵니다.
    // 하지만 데이터 확인 편의를 위해 Transaction에는 스냅샷(당시 이름)을 넣기도 합니다.

    if (actionType === 'IN') {
        let target = stockList.find(s => s.sku === data.sku && s.lotId === data.lotId && s.location === data.location);
        if (target) {
            target.qty += parseInt(data.qty);
        } else {
            stockList.push({
                sku: data.sku, 
                // name: data.name, // <-- 굳이 저장 안 해도 됨 (조회 시 SKU로 매칭)
                lotId: data.lotId, location: data.location, qty: parseInt(data.qty),
                date: data.date || today, expiry: data.expiry || ''
            });
        }
        ledgerList.push({ date: today, type: data.refType || '입고', sku: data.sku, inQty: data.qty, outQty: 0, refId: data.refId });
    }
    else if (actionType === 'OUT') {
        let target = stockList.find(s => s.sku === data.sku && s.lotId === data.lotId);
        if (!target || target.qty < data.qty) { alert('재고 부족'); return false; }
        target.qty -= parseInt(data.qty);
        ledgerList.push({ date: today, type: data.refType || '출고', sku: data.sku, inQty: 0, outQty: data.qty, refId: data.refId });
    }

    localStorage.setItem(DB_STOCK, JSON.stringify(stockList));
    localStorage.setItem(DB_LEDGER, JSON.stringify(ledgerList));
    return true;
}

// --- [대시보드] 연동 수정: Admin의 최신 이름 사용 ---
function renderDashboard() {
    const stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    // Product 정보는 여기서 새로 불러옵니다.
    const products = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || [];
    
    // SKU별 재고 집계
    const stockBySku = {};
    stockList.forEach(s => {
        if (!stockBySku[s.sku]) stockBySku[s.sku] = 0;
        stockBySku[s.sku] += s.qty;
    });

    // 차트 라벨 생성 (재고에 있는 SKU를 기준으로 Admin에서 이름을 찾아옴)
    const labels = Object.keys(stockBySku).map(sku => {
        const p = products.find(prod => prod.sku === sku);
        return p ? p.name : sku; // Admin에 있으면 그 이름, 없으면 SKU
    });
    const dataValues = Object.values(stockBySku);

    const ctx = document.getElementById('inventoryChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: '현재 재고량', data: dataValues, backgroundColor: 'rgba(54, 162, 235, 0.6)' }]
        }
    });

    // 알림 위젯
    const lowStockList = document.getElementById('low-stock-list');
    lowStockList.innerHTML = '';
    // 모든 상품(Admin 기준)을 순회하며 재고 확인
    products.forEach(p => {
        const current = stockBySku[p.sku] || 0; // 재고 없으면 0
        if (current < p.safetyStock) {
            lowStockList.innerHTML += `<li>⚠️ [${p.name}] 현재: ${current} < 안전: ${p.safetyStock}</li>`;
        }
    });

    // 유통기한 알림
    const expiryList = document.getElementById('expiry-list');
    expiryList.innerHTML = '';
    const today = new Date();
    stockList.forEach(s => {
        if (s.qty > 0 && s.expiry) {
            const p = getProductInfo(s.sku); // 이름 실시간 조회
            const expDate = new Date(s.expiry);
            const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30 && diffDays >= 0) {
                expiryList.innerHTML += `<li>⏳ [${p.name}] Lot:${s.lotId} (${diffDays}일)</li>`;
            }
        }
    });
}

// --- [재고 관리] 연동 수정: SKU로 Admin 이름 매칭 ---
function loadCurrentStock() {
    const tbody = document.getElementById('stock-tbody');
    const stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    const filterText = document.getElementById('stock-search-input') ? document.getElementById('stock-search-input').value.toLowerCase() : '';

    tbody.innerHTML = stockList.filter(s => s.qty > 0).map(s => {
        const p = getProductInfo(s.sku); // [중요] Admin의 최신 정보 가져오기
        
        // 검색 필터 적용 (이름 or SKU)
        if (filterText && !p.name.includes(filterText) && !s.sku.toLowerCase().includes(filterText)) return '';

        return `<tr>
            <td>${s.sku}</td>
            <td>${p.name}</td> <td>${s.lotId}</td>
            <td>${s.location}</td>
            <td class="text-right bold">${s.qty.toLocaleString()}</td>
            <td>${s.expiry || '-'}</td>
            <td>정상</td>
        </tr>`;
    }).join('');
}

function loadStockLedger() {
    const tbody = document.getElementById('ledger-tbody');
    if(!tbody) return;
    const ledgerList = JSON.parse(localStorage.getItem(DB_LEDGER)) || [];
    let runningBalance = {}; // SKU별 잔고
    
    // 수불부는 과거 기록이므로 이름을 저장 당시 것으로 쓸지, 최신으로 할지 결정해야 함.
    // 여기서는 '최신 이름'을 보여주는 것으로 통일합니다.
    
    let html = '';
    ledgerList.forEach(row => {
        const p = getProductInfo(row.sku); // 이름 연동
        if (!runningBalance[row.sku]) runningBalance[row.sku] = 0;
        runningBalance[row.sku] += (row.inQty - row.outQty);
        
        html += `
            <tr>
                <td>${row.date}</td>
                <td><span class="${row.type.includes('입고') ? 'status-done' : 'status-danger'}">${row.type}</span></td>
                <td>${row.sku}</td>
                <td>${p.name}</td> <td>${row.refId}</td>
                <td style="color:blue;">${row.inQty > 0 ? '+' + row.inQty : '-'}</td>
                <td style="color:red;">${row.outQty > 0 ? '-' + row.outQty : '-'}</td>
                <td>${runningBalance[row.sku]}</td>
            </tr>`;
    });
    tbody.innerHTML = html;
}
function filterStockTable() { loadCurrentStock(); }

// --- [입고 관리] ---
function renderPurchasePage() {
    const list = JSON.parse(localStorage.getItem(DB_PURCHASE)) || [];
    const tbody = document.querySelector('#purchase-table tbody');
    tbody.innerHTML = list.map(po => {
        const p = getProductInfo(po.sku);
        return `<tr>
            <td>${po.id}</td><td>${po.partnerName}</td><td>${p.name}</td><td>${po.qty}</td>
            <td>${po.status === 'Ordered' ? `<button class="btn-primary" onclick="processPurchaseReceive('${po.id}')">입고처리</button>` : '<span class="status-done">입고완료</span>'}</td>
        </tr>`;
    }).join('');
    populateProductOptions('po-sku-select');
}
function registerPurchase() {
    const skuSel = document.getElementById('po-sku-select');
    const partner = document.getElementById('po-partner').value;
    const qty = document.getElementById('po-qty').value;
    if (!skuSel.value || !qty) return alert('필수 정보 누락');
    const list = JSON.parse(localStorage.getItem(DB_PURCHASE)) || [];
    list.push({ id: 'PO-' + Date.now(), sku: skuSel.value, partnerName: partner, qty: parseInt(qty), date: new Date().toISOString().split('T')[0], status: 'Ordered' });
    localStorage.setItem(DB_PURCHASE, JSON.stringify(list));
    alert('발주 등록 완료'); closeModal('purchaseModal'); renderPurchasePage();
}
function processPurchaseReceive(poId) {
    const list = JSON.parse(localStorage.getItem(DB_PURCHASE)) || [];
    const po = list.find(p => p.id === poId);
    if (!po) return;
    const lotId = 'LOT-' + poId.split('-')[1];
    // 이름은 저장하지 않고 SKU만 넘김
    updateStock('IN', { sku: po.sku, qty: po.qty, lotId: lotId, location: 'WH01-Temp', refType: '구매입고', refId: po.id, expiry: '2026-12-31' });
    po.status = 'Received';
    localStorage.setItem(DB_PURCHASE, JSON.stringify(list));
    alert('입고 완료'); renderPurchasePage();
}

// --- [수주 관리] ---
function renderSalesPage() {
    const list = JSON.parse(localStorage.getItem(DB_SALES)) || [];
    const tbody = document.querySelector('#sales-table tbody');
    tbody.innerHTML = list.map(so => {
        const p = getProductInfo(so.sku);
        return `<tr>
            <td>${so.id}</td><td>${so.customer}</td><td>${p.name}</td><td>${so.qty}</td>
            <td>${so.status === 'Ordered' ? `<button class="btn-primary" onclick="openShipmentModal('${so.id}')">출고처리</button>` : '<span class="status-done">출고완료</span>'}</td>
        </tr>`;
    }).join('');
    populateProductOptions('so-sku-select');
}
function registerSales() {
    const skuSel = document.getElementById('so-sku-select');
    const customer = document.getElementById('so-customer').value;
    const qty = document.getElementById('so-qty').value;
    if (!skuSel.value || !qty) return alert('정보 입력 필요');
    const list = JSON.parse(localStorage.getItem(DB_SALES)) || [];
    list.push({ id: 'SO-' + Date.now(), sku: skuSel.value, customer: customer, qty: parseInt(qty), status: 'Ordered' });
    localStorage.setItem(DB_SALES, JSON.stringify(list));
    alert('수주 등록 완료'); closeModal('salesRegModal'); renderSalesPage();
}
function openShipmentModal(soId) {
    const salesList = JSON.parse(localStorage.getItem(DB_SALES));
    const so = salesList.find(s => s.id === soId);
    const p = getProductInfo(so.sku);
    document.getElementById('ship-so-id').value = so.id;
    document.getElementById('ship-req-qty').value = so.qty;
    document.getElementById('ship-sku-hidden').value = so.sku;
    document.getElementById('ship-name-hidden').value = p.name; // 표시용
    
    // 재고 찾기
    const stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    const availableLots = stockList.filter(s => s.sku === so.sku && s.qty > 0);
    const lotSelect = document.getElementById('ship-lot-select');
    lotSelect.innerHTML = availableLots.map(l => `<option value="${l.lotId}">Lot: ${l.lotId} (잔고: ${l.qty})</option>`).join('');
    openModal('shipmentModal');
}
function confirmShipment() {
    const soId = document.getElementById('ship-so-id').value;
    const lotId = document.getElementById('ship-lot-select').value;
    const sku = document.getElementById('ship-sku-hidden').value;
    const qty = parseInt(document.getElementById('ship-req-qty').value);
    const success = updateStock('OUT', { sku, lotId, qty, refType: '수주출고', refId: soId });
    if (success) {
        let salesList = JSON.parse(localStorage.getItem(DB_SALES));
        let so = salesList.find(s => s.id === soId);
        so.status = 'Shipped';
        localStorage.setItem(DB_SALES, JSON.stringify(salesList));
        alert('출고 완료'); closeModal('shipmentModal'); renderSalesPage();
    }
}

// --- [반품 관리] ---
function renderReturnsPage() {
    const list = JSON.parse(localStorage.getItem(DB_RETURNS)) || [];
    const tbody = document.querySelector('#return-table tbody');
    tbody.innerHTML = list.map(r => {
        const p = getProductInfo(r.sku);
        return `<tr>
            <td>${r.id}</td><td>${r.date}</td><td>${p.name}</td><td>${r.qty}</td>
            <td>${r.reason}</td>
            <td>${r.status === 'Requested' ? '<span class="status-wait">승인대기</span>' : '<span class="status-done">'+r.status+'</span>'}</td>
            <td>${r.status === 'Requested' ? `<button onclick="openReturnProcessModal('${r.id}')">처리하기</button>` : '-'}</td>
        </tr>`;
    }).join('');
    populateProductOptions('ret-sku-select');
}
function registerReturn() {
    const skuSel = document.getElementById('ret-sku-select');
    const qty = document.getElementById('ret-qty').value;
    const reason = document.getElementById('ret-reason').value;
    const list = JSON.parse(localStorage.getItem(DB_RETURNS)) || [];
    list.push({ id: 'RT-' + Date.now(), date: new Date().toISOString().split('T')[0], sku: skuSel.value, qty: parseInt(qty), reason: reason, status: 'Requested' });
    localStorage.setItem(DB_RETURNS, JSON.stringify(list));
    alert('반품 접수 완료'); closeModal('returnRegModal'); renderReturnsPage();
}
function completeReturnProcess() {
    const id = document.getElementById('proc-ret-id').value;
    const action = document.getElementById('proc-action').value;
    let list = JSON.parse(localStorage.getItem(DB_RETURNS)) || [];
    let item = list.find(r => r.id === id);
    if (action === 'RESTOCK') {
        updateStock('IN', { sku: item.sku, qty: item.qty, lotId: 'LOT-RET-'+item.id, location: 'WH02-R-01', refType: '반품재입고', refId: item.id });
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