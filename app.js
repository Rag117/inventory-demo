/* ==========================================================================
   멍밥 ERP 통합 엔진 (app.js) - Advanced Flow Version
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

    // 페이지별 렌더링 라우터
    if (document.getElementById('product-tbody')) renderAdminPage(); 
    if (document.getElementById('inventoryChart')) renderDashboard(); 
    if (document.getElementById('purchase-table')) renderPurchasePage(); 
    if (document.getElementById('sales-table')) renderSalesPage(); 
    if (document.getElementById('current-stock-table')) { loadCurrentStock(); loadStockLedger(); } 
    if (document.getElementById('return-table')) renderReturnsPage(); 
});

/* ==========================================================================
   3. 데이터 초기화 (Bootstrapping)
   ========================================================================== */
function initSystemData() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // 유통기한 임박 테스트용 날짜 (오늘 + 10일)
    const nearExpiryDate = new Date();
    nearExpiryDate.setDate(today.getDate() + 10); 
    const nearExpiryStr = nearExpiryDate.toISOString().split('T')[0];

    // 1) 상품
    if (!localStorage.getItem(DB_PRODUCTS)) {
        const products = [
            { sku: 'SKU-D01', name: '프리미엄 그레인프리 사료', category: '사료', safetyStock: 50 },
            { sku: 'SKU-C01', name: '웰니스 고양이 캔', category: '간식/캔', safetyStock: 200 },
            { sku: 'SKU-EXP', name: '[테스트] 유통기한 임박 간식', category: '간식/캔', safetyStock: 10 } // 테스트용
        ];
        localStorage.setItem(DB_PRODUCTS, JSON.stringify(products));
    }
    // 2) 거래처
    if (!localStorage.getItem(DB_PARTNERS)) {
        localStorage.setItem(DB_PARTNERS, JSON.stringify([
            { id: 'V-001', name: '(주)튼튼펫푸드', type: '공급처', manager: '김철수' },
            { id: 'C-001', name: '냥이월드', type: '고객사', manager: '이영희' }
        ]));
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
            { id: 'WH01-B-01', whId: 'WH-01', desc: 'B구역 (간식)' }
        ]));
    }
    // 5) 초기 재고
    if (!localStorage.getItem(DB_STOCK)) {
        const stock = [
            { sku: 'SKU-D01', lotId: 'LOT-INIT-01', location: 'WH01-A-01', qty: 60, date: todayStr, expiry: '2025-12-31' },
            // [유통기한 임박 테스트 데이터]
            { sku: 'SKU-EXP', lotId: 'LOT-WARN-01', location: 'WH01-B-01', qty: 50, date: todayStr, expiry: nearExpiryStr }
        ];
        localStorage.setItem(DB_STOCK, JSON.stringify(stock));
        
        const ledger = stock.map(s => ({
            date: todayStr, type: '기초재고', sku: s.sku, inQty: s.qty, outQty: 0, refId: 'INIT'
        }));
        localStorage.setItem(DB_LEDGER, JSON.stringify(ledger));
    }
}

function setupCommonUI() {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    dateInputs.forEach(input => { if (!input.value) input.value = today; });
}

// [공통 유틸] 데이터 삭제 함수 (범용)
function deleteMasterData(dbKey, idField, idValue) {
    if (!confirm('정말 삭제하시겠습니까? (연관된 데이터가 있을 수 있습니다)')) return;
    
    let list = JSON.parse(localStorage.getItem(dbKey)) || [];
    const newList = list.filter(item => item[idField] !== idValue);
    
    localStorage.setItem(dbKey, JSON.stringify(newList));
    alert('삭제되었습니다.');
    location.reload(); // 화면 갱신을 위해 새로고침 (가장 확실한 방법)
}

// [공통 유틸] SKU로 상품 정보 찾기 (Admin 데이터 참조)
function getProductInfo(sku) {
    const products = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || [];
    return products.find(p => p.sku === sku) || { name: `(삭제됨: ${sku})`, category: '-', safetyStock: 0 };
}


/* ==========================================================================
   4. 관리자(Admin) 페이지 - 삭제 기능 추가됨
   ========================================================================== */
function renderAdminPage() {
    renderProducts(); renderPartners(); renderWarehouses(); renderLocations();
}

function renderProducts() {
    const list = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || [];
    const tbody = document.getElementById('product-tbody');
    if(tbody) tbody.innerHTML = list.map(p => `
        <tr>
            <td>${p.sku}</td><td>${p.name}</td><td>${p.category}</td><td>${p.safetyStock}</td>
            <td>
                <button onclick="openProductModal('EDIT', '${p.sku}')">수정</button>
                <button class="btn-danger" onclick="deleteMasterData('${DB_PRODUCTS}', 'sku', '${p.sku}')">삭제</button>
            </td>
        </tr>`).join('');
}
// (상품 등록/수정 모달 로직은 동일)
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

function renderPartners() { 
    const list = JSON.parse(localStorage.getItem(DB_PARTNERS))||[]; 
    const tbody = document.getElementById('partner-tbody'); 
    if(tbody) tbody.innerHTML = list.map(p => `
        <tr><td>${p.id}</td><td>${p.name}</td><td>${p.type}</td><td>${p.manager}</td>
        <td>
            <button onclick="openPartnerModal('EDIT', '${p.id}')">수정</button>
            <button class="btn-danger" onclick="deleteMasterData('${DB_PARTNERS}', 'id', '${p.id}')">삭제</button>
        </td></tr>`).join(''); 
}
// (거래처 모달 로직 동일 - 생략 없이 유지 필요)
function openPartnerModal(mode, id='') { document.getElementById('part-mode').value = mode; if(mode==='EDIT'){ const t = (JSON.parse(localStorage.getItem(DB_PARTNERS))||[]).find(p=>p.id===id); if(t){ document.getElementById('part-id').value=t.id; document.getElementById('part-id').readOnly=true; document.getElementById('part-name').value=t.name; document.getElementById('part-type').value=t.type; document.getElementById('part-manager').value=t.manager; } } else { document.getElementById('part-id').value=''; document.getElementById('part-id').readOnly=false; document.getElementById('part-name').value=''; document.getElementById('part-manager').value=''; } openModal('partnerModal'); }
function savePartner() { const id=document.getElementById('part-id').value, name=document.getElementById('part-name').value, type=document.getElementById('part-type').value, manager=document.getElementById('part-manager').value, mode=document.getElementById('part-mode').value; if(!id) return alert('ID필수'); let list = JSON.parse(localStorage.getItem(DB_PARTNERS))||[]; if(mode==='NEW'){ if(list.find(p=>p.id===id)) return alert('중복'); list.push({id,name,type,manager}); }else{ const idx=list.findIndex(p=>p.id===id); if(idx>-1) list[idx]={id,name,type,manager}; } localStorage.setItem(DB_PARTNERS, JSON.stringify(list)); closeModal('partnerModal'); renderPartners(); }

function renderWarehouses() { 
    const list=JSON.parse(localStorage.getItem(DB_WAREHOUSES))||[]; 
    const t=document.getElementById('warehouse-tbody'); 
    if(t) t.innerHTML=list.map(w=>`
        <tr><td>${w.id}</td><td>${w.name}</td><td>${w.type}</td>
        <td>
            <button onclick="openWarehouseModal('EDIT','${w.id}')">수정</button>
            <button class="btn-danger" onclick="deleteMasterData('${DB_WAREHOUSES}', 'id', '${w.id}')">삭제</button>
        </td></tr>`).join(''); 
}
// (창고 모달 로직 동일)
function openWarehouseModal(mode,id=''){ document.getElementById('wh-mode').value=mode; if(mode==='EDIT'){ const t=(JSON.parse(localStorage.getItem(DB_WAREHOUSES))||[]).find(w=>w.id===id); if(t){ document.getElementById('wh-id').value=t.id; document.getElementById('wh-id').readOnly=true; document.getElementById('wh-name').value=t.name; document.getElementById('wh-type').value=t.type;} }else{ document.getElementById('wh-id').value=''; document.getElementById('wh-id').readOnly=false; document.getElementById('wh-name').value=''; } openModal('warehouseModal'); }
function saveWarehouse() { const id=document.getElementById('wh-id').value, name=document.getElementById('wh-name').value, type=document.getElementById('wh-type').value, mode=document.getElementById('wh-mode').value; if(!id) return alert('ID필수'); let list=JSON.parse(localStorage.getItem(DB_WAREHOUSES))||[]; if(mode==='NEW'){ if(list.find(w=>w.id===id)) return alert('중복'); list.push({id,name,type}); }else{ const idx=list.findIndex(w=>w.id===id); if(idx>-1) list[idx]={id,name,type}; } localStorage.setItem(DB_WAREHOUSES, JSON.stringify(list)); closeModal('warehouseModal'); renderWarehouses(); }

function renderLocations(){ 
    const list=JSON.parse(localStorage.getItem(DB_LOCATIONS))||[]; 
    const t=document.getElementById('location-tbody'); 
    if(t) t.innerHTML=list.map(l=>`
        <tr><td>${l.id}</td><td>${l.whId}</td><td>${l.desc}</td>
        <td>
            <button onclick="openLocationModal('EDIT','${l.id}')">수정</button>
            <button class="btn-danger" onclick="deleteMasterData('${DB_LOCATIONS}', 'id', '${l.id}')">삭제</button>
        </td></tr>`).join(''); 
}
// (로케이션 모달 로직 동일)
function openLocationModal(mode,id=''){ document.getElementById('loc-mode').value=mode; if(mode==='EDIT'){ const t=(JSON.parse(localStorage.getItem(DB_LOCATIONS))||[]).find(l=>l.id===id); if(t){ document.getElementById('loc-id').value=t.id; document.getElementById('loc-id').readOnly=true; document.getElementById('loc-wh').value=t.whId; document.getElementById('loc-desc').value=t.desc; } }else{ document.getElementById('loc-id').value=''; document.getElementById('loc-id').readOnly=false; document.getElementById('loc-desc').value=''; } openModal('locationModal'); }
function saveLocation(){ const id=document.getElementById('loc-id').value, whId=document.getElementById('loc-wh').value, desc=document.getElementById('loc-desc').value, mode=document.getElementById('loc-mode').value; if(!id)return alert('ID필수'); let list=JSON.parse(localStorage.getItem(DB_LOCATIONS))||[]; if(mode==='NEW'){ if(list.find(l=>l.id===id)) return alert('중복'); list.push({id,whId,desc}); }else{ const idx=list.findIndex(l=>l.id===id); if(idx>-1) list[idx]={id,whId,desc}; } localStorage.setItem(DB_LOCATIONS, JSON.stringify(list)); closeModal('locationModal'); renderLocations(); }


/* ==========================================================================
   5. 핵심 로직 - [입고 등록 -> 재고 반영] & [대시보드 알림]
   ========================================================================== */

function updateStock(actionType, data) {
    let stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    let ledgerList = JSON.parse(localStorage.getItem(DB_LEDGER)) || [];
    const today = new Date().toISOString().split('T')[0];

    if (actionType === 'IN') {
        // [로직] 같은 SKU, Lot, 위치면 수량 합치기, 아니면 신규 생성
        let target = stockList.find(s => s.sku === data.sku && s.lotId === data.lotId && s.location === data.location);
        if (target) {
            target.qty += parseInt(data.qty);
        } else {
            stockList.push({
                sku: data.sku, 
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

// --- [대시보드] 재고부족 & 유통기한 알림 ---
function renderDashboard() {
    const stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    const products = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || [];
    
    // 1. SKU별 총 재고량 집계 (Lot 합산)
    const stockBySku = {};
    stockList.forEach(s => {
        if (!stockBySku[s.sku]) stockBySku[s.sku] = 0;
        stockBySku[s.sku] += s.qty;
    });

    // 2. 차트 렌더링
    const labels = Object.keys(stockBySku).map(sku => getProductInfo(sku).name);
    const dataValues = Object.values(stockBySku);
    const ctx = document.getElementById('inventoryChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: '현재 총 재고량', data: dataValues, backgroundColor: 'rgba(54, 162, 235, 0.6)' }]
        }
    });

    // 3. 재고 부족 알림 (기준정보의 안전재고와 비교)
    const lowStockList = document.getElementById('low-stock-list');
    lowStockList.innerHTML = '';
    products.forEach(p => {
        const current = stockBySku[p.sku] || 0; 
        if (current < p.safetyStock) {
            lowStockList.innerHTML += `<li>⚠️ [${p.name}] 현재: ${current} < 안전: ${p.safetyStock}</li>`;
        }
    });

    // 4. 유통기한 임박 알림 (오늘 기준 30일 이내)
    const expiryList = document.getElementById('expiry-list');
    expiryList.innerHTML = '';
    const today = new Date();
    
    stockList.forEach(s => {
        if (s.qty > 0 && s.expiry) {
            const p = getProductInfo(s.sku);
            const expDate = new Date(s.expiry);
            const diffTime = expDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // 유통기한이 지났거나(음수), 30일 이내인 경우
            if (diffDays <= 30) {
                const color = diffDays < 0 ? 'red' : 'orange';
                const msg = diffDays < 0 ? `만료됨 (${Math.abs(diffDays)}일 지남)` : `${diffDays}일 남음`;
                expiryList.innerHTML += `<li style="color:${color}">⏳ [${p.name}] Lot:${s.lotId} / ${msg}</li>`;
            }
        }
    });
}


// --- [재고 관리] ---
function loadCurrentStock() {
    const tbody = document.getElementById('stock-tbody');
    const stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    const filterText = document.getElementById('stock-search-input') ? document.getElementById('stock-search-input').value.toLowerCase() : '';

    tbody.innerHTML = stockList.filter(s => s.qty > 0).map(s => {
        const p = getProductInfo(s.sku);
        if (filterText && !p.name.includes(filterText) && !s.sku.toLowerCase().includes(filterText)) return '';
        return `<tr>
            <td>${s.sku}</td><td>${p.name}</td><td>${s.lotId}</td><td>${s.location}</td>
            <td class="text-right bold">${s.qty.toLocaleString()}</td><td>${s.expiry || '-'}</td><td>정상</td>
        </tr>`;
    }).join('');
}
function loadStockLedger() {
    const tbody = document.getElementById('ledger-tbody');
    if(!tbody) return;
    const ledgerList = JSON.parse(localStorage.getItem(DB_LEDGER)) || [];
    let runningBalance = {};
    
    let html = '';
    ledgerList.forEach(row => {
        const p = getProductInfo(row.sku);
        if (!runningBalance[row.sku]) runningBalance[row.sku] = 0;
        runningBalance[row.sku] += (row.inQty - row.outQty);
        html += `
            <tr>
                <td>${row.date}</td><td><span class="${row.type.includes('입고')?'status-done':'status-danger'}">${row.type}</span></td>
                <td>${row.sku}</td><td>${p.name}</td><td>${row.refId}</td>
                <td style="color:blue;">${row.inQty>0?'+'+row.inQty:'-'}</td><td style="color:red;">${row.outQty>0?'-'+row.outQty:'-'}</td><td>${runningBalance[row.sku]}</td>
            </tr>`;
    });
    tbody.innerHTML = html;
}
function filterStockTable() { loadCurrentStock(); }


// --- [입고 관리] - 신규 상품 연동 ---
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
    // *중요* 페이지 로드 시에도 옵션 갱신
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
    
    // 입고 처리 시 Lot 번호 생성 및 유통기한 임의 설정 (실무에선 입력받음)
    const lotId = 'LOT-' + poId.split('-')[1];
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1년 뒤
    
    // [핵심] 재고 원장에 반영
    updateStock('IN', { 
        sku: po.sku, qty: po.qty, 
        lotId: lotId, location: 'WH01-Temp', 
        refType: '구매입고', refId: po.id, 
        expiry: expiryDate.toISOString().split('T')[0] 
    });
    
    po.status = 'Received';
    localStorage.setItem(DB_PURCHASE, JSON.stringify(list));
    alert('입고 처리 완료 (재고 증가)'); renderPurchasePage();
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
    document.getElementById('ship-name-hidden').value = p.name;
    const stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    // 재고 있는 Lot만 필터
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
// [드롭다운] Admin에서 상품 등록/삭제 시 반영되도록 매번 새로 생성
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
function openModal(id) { 
    // 모달 열 때 드롭다운 최신화 (삭제된 상품은 안 보이게)
    if(id === 'purchaseModal') populateProductOptions('po-sku-select');
    if(id === 'salesRegModal') populateProductOptions('so-sku-select');
    if(id === 'returnRegModal') populateProductOptions('ret-sku-select');
    
    document.getElementById(id).style.display = 'block'; 
}
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function openReturnProcessModal(id) { document.getElementById('proc-ret-id').value = id; openModal('returnProcessModal'); }