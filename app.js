/* ==========================================================================
   멍밥 ERP 통합 엔진 (app.js) - Ledger Fix Version
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

    if (document.getElementById('product-tbody')) renderAdminPage(); 
    if (document.getElementById('inventoryChart')) renderDashboard(); 
    if (document.getElementById('purchase-table')) renderPurchasePage(); 
    if (document.getElementById('sales-table')) renderSalesPage(); 
    if (document.getElementById('current-stock-table')) { loadCurrentStock(); loadStockLedger(); } 
    // [중요] 리포트 페이지에서도 수불부를 불러오도록 확실하게 처리
    if (document.getElementById('report-sales-tbody')) renderReportPage(); 
    if (document.getElementById('return-table')) renderReturnsPage(); 
});

/* ==========================================================================
   3. 데이터 초기화
   ========================================================================== */
function initSystemData() {
    if (localStorage.getItem(DB_PRODUCTS)) return; // 데이터 있으면 스킵

    const today = new Date().toISOString().split('T')[0];
    const expirySoon = new Date(); expirySoon.setDate(new Date().getDate() + 5);

    // 1) 상품
    const products = [
        { sku: 'SKU-D01', name: '프리미엄 그레인프리 사료 (10kg)', category: '사료', safetyStock: 50 },
        { sku: 'SKU-D02', name: '관절 튼튼 기능성 사료 (5kg)', category: '사료', safetyStock: 30 },
        { sku: 'SKU-C01', name: '웰니스 고양이 캔 (참치)', category: '캔', safetyStock: 200 },
        { sku: 'SKU-S01', name: '유기농 캣닢 트릿', category: '간식', safetyStock: 100 },
        { sku: 'SKU-S02', name: '고양이들이 환장하는 츄르', category: '간식', safetyStock: 20 }
    ];
    localStorage.setItem(DB_PRODUCTS, JSON.stringify(products));

    // 2) 거래처
    localStorage.setItem(DB_PARTNERS, JSON.stringify([
        { id: 'V-001', name: '(주)튼튼펫푸드', type: '공급처', manager: '김철수' },
        { id: 'C-001', name: '냥이월드', type: '고객사', manager: '박지성' }
    ]));

    // 3) 창고 & 로케이션
    localStorage.setItem(DB_WAREHOUSES, JSON.stringify([{ id: 'WH-01', name: '제1 물류센터', type: '일반' }, { id: 'WH-02', name: '반품 센터', type: '반품' }]));
    localStorage.setItem(DB_LOCATIONS, JSON.stringify([{ id: 'WH01-A-01', whId: 'WH-01', desc: 'A구역' }, { id: 'WH01-B-01', whId: 'WH-01', desc: 'B구역' }]));

    // 4) 초기 재고 & 수불부
    const stock = [
        { sku: 'SKU-D01', lotId: 'LOT-INIT-01', location: 'WH01-A-01', qty: 60, date: today, expiry: '2025-12-31' },
        { sku: 'SKU-C02', lotId: 'LOT-WARN-01', location: 'WH01-B-01', qty: 80, date: today, expiry: expirySoon.toISOString().split('T')[0] }
    ];
    localStorage.setItem(DB_STOCK, JSON.stringify(stock));
    
    // 수불부 (초기화 시 change 값 확실하게 넣기)
    const ledger = stock.map(s => ({
        date: today, type: '기초재고', sku: s.sku, change: s.qty, refId: 'INIT'
    }));
    localStorage.setItem(DB_LEDGER, JSON.stringify(ledger));
}

// [시스템 초기화]
function resetSystemData() {
    if(!confirm('모든 데이터를 삭제하고 초기 상태로 되돌리겠습니까?')) return;
    localStorage.clear(); location.reload();
}

function setupCommonUI() { const dateInputs = document.querySelectorAll('input[type="date"]'); const today = new Date().toISOString().split('T')[0]; dateInputs.forEach(input => { if (!input.value) input.value = today; }); }
function deleteMasterData(dbKey, idField, idValue) { if (!confirm('삭제하시겠습니까?')) return; let list = JSON.parse(localStorage.getItem(dbKey)) || []; localStorage.setItem(dbKey, JSON.stringify(list.filter(item => item[idField] !== idValue))); location.reload(); }
function getProductInfo(sku) {
    const products = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || [];
    // category가 없으면 '기타' 반환
    return products.find(p => p.sku === sku) || { name: `(삭제됨: ${sku})`, category: '기타', safetyStock: 0 };
}
function deleteTransaction(dbKey, id) { if(!confirm('내역을 삭제하시겠습니까? (재고는 복구되지 않습니다)')) return; let list = JSON.parse(localStorage.getItem(dbKey)) || []; localStorage.setItem(dbKey, JSON.stringify(list.filter(item => item.id !== id))); alert('삭제완료'); location.reload(); }

/* ==========================================================================
   4. 관리자(Admin)
   ========================================================================== */
function renderAdminPage() { renderProducts(); renderPartners(); renderWarehouses(); renderLocations(); }
function renderProducts() { const list = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || []; document.getElementById('product-tbody').innerHTML = list.map(p => `<tr><td>${p.sku}</td><td>${p.name}</td><td>${p.category}</td><td>${p.safetyStock}</td><td><button onclick="openProductModal('EDIT', '${p.sku}')">수정</button> <button class="btn-danger" onclick="deleteMasterData('${DB_PRODUCTS}', 'sku', '${p.sku}')">삭제</button></td></tr>`).join(''); }
function openProductModal(mode, sku='') { document.getElementById('prod-mode').value = mode; if(mode==='EDIT'){ const t = (JSON.parse(localStorage.getItem(DB_PRODUCTS))||[]).find(p=>p.sku===sku); if(t){ document.getElementById('prod-sku').value=t.sku; document.getElementById('prod-sku').readOnly=true; document.getElementById('prod-name').value=t.name; document.getElementById('prod-cat').value=t.category; document.getElementById('prod-safe').value=t.safetyStock; } } else { document.getElementById('prod-sku').value=''; document.getElementById('prod-sku').readOnly=false; document.getElementById('prod-name').value=''; document.getElementById('prod-safe').value=50; } openModal('productModal'); }
function saveProduct() { const sku=document.getElementById('prod-sku').value, name=document.getElementById('prod-name').value, cat=document.getElementById('prod-cat').value, safe=document.getElementById('prod-safe').value, mode=document.getElementById('prod-mode').value; if(!sku || !name) return alert('필수 입력 누락'); let list = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || []; if(mode==='NEW'){ if(list.find(p=>p.sku===sku)) return alert('중복 SKU'); list.push({sku,name,category:cat,safetyStock:safe}); } else { const idx=list.findIndex(p=>p.sku===sku); if(idx>-1) list[idx]={sku,name,category:cat,safetyStock:safe}; } localStorage.setItem(DB_PRODUCTS, JSON.stringify(list)); closeModal('productModal'); renderProducts(); }

// (기타 Admin 함수들 - 기존 동일)
function renderPartners(){ const l=JSON.parse(localStorage.getItem(DB_PARTNERS))||[]; document.getElementById('partner-tbody').innerHTML=l.map(p=>`<tr><td>${p.id}</td><td>${p.name}</td><td>${p.type}</td><td>${p.manager}</td><td><button onclick="openPartnerModal('EDIT','${p.id}')">수정</button> <button class="btn-danger" onclick="deleteMasterData('${DB_PARTNERS}','id','${p.id}')">삭제</button></td></tr>`).join(''); }
function openPartnerModal(m,i=''){document.getElementById('part-mode').value=m; if(m==='EDIT'){const t=(JSON.parse(localStorage.getItem(DB_PARTNERS))||[]).find(p=>p.id===i); if(t){document.getElementById('part-id').value=t.id; document.getElementById('part-id').readOnly=true; document.getElementById('part-name').value=t.name;}}else{document.getElementById('part-id').value='';document.getElementById('part-id').readOnly=false;document.getElementById('part-name').value='';} openModal('partnerModal');}
function savePartner(){const i=document.getElementById('part-id').value,n=document.getElementById('part-name').value,t=document.getElementById('part-type').value,m=document.getElementById('part-manager').value,md=document.getElementById('part-mode').value; if(!i)return alert('ID필수'); let l=JSON.parse(localStorage.getItem(DB_PARTNERS))||[]; if(md==='NEW'){l.push({id:i,name:n,type:t,manager:m});}else{const idx=l.findIndex(p=>p.id===i); if(idx>-1)l[idx]={id:i,name:n,type:t,manager:m};} localStorage.setItem(DB_PARTNERS, JSON.stringify(l)); closeModal('partnerModal'); renderPartners();}
function renderWarehouses(){ const l=JSON.parse(localStorage.getItem(DB_WAREHOUSES))||[]; document.getElementById('warehouse-tbody').innerHTML=l.map(w=>`<tr><td>${w.id}</td><td>${w.name}</td><td>${w.type}</td><td><button onclick="openWarehouseModal('EDIT','${w.id}')">수정</button> <button class="btn-danger" onclick="deleteMasterData('${DB_WAREHOUSES}','id','${w.id}')">삭제</button></td></tr>`).join(''); }
function openWarehouseModal(m,i=''){document.getElementById('wh-mode').value=m; if(m==='EDIT'){const t=(JSON.parse(localStorage.getItem(DB_WAREHOUSES))||[]).find(w=>w.id===i); if(t){document.getElementById('wh-id').value=t.id;document.getElementById('wh-id').readOnly=true;document.getElementById('wh-name').value=t.name;}}else{document.getElementById('wh-id').value='';document.getElementById('wh-id').readOnly=false;document.getElementById('wh-name').value='';} openModal('warehouseModal');}
function saveWarehouse(){const i=document.getElementById('wh-id').value,n=document.getElementById('wh-name').value,t=document.getElementById('wh-type').value,md=document.getElementById('wh-mode').value; if(!i)return alert('ID필수'); let l=JSON.parse(localStorage.getItem(DB_WAREHOUSES))||[]; if(md==='NEW'){l.push({id:i,name:n,type:t});}else{const idx=l.findIndex(w=>w.id===i);if(idx>-1)l[idx]={id:i,name:n,type:t};} localStorage.setItem(DB_WAREHOUSES, JSON.stringify(l)); closeModal('warehouseModal'); renderWarehouses(); }
function renderLocations(){ const l=JSON.parse(localStorage.getItem(DB_LOCATIONS))||[]; document.getElementById('location-tbody').innerHTML=l.map(o=>`<tr><td>${o.id}</td><td>${o.whId}</td><td>${o.desc}</td><td><button onclick="openLocationModal('EDIT','${o.id}')">수정</button> <button class="btn-danger" onclick="deleteMasterData('${DB_LOCATIONS}','id','${o.id}')">삭제</button></td></tr>`).join(''); }
function openLocationModal(m,i=''){document.getElementById('loc-mode').value=m; if(m==='EDIT'){const t=(JSON.parse(localStorage.getItem(DB_LOCATIONS))||[]).find(o=>o.id===i); if(t){document.getElementById('loc-id').value=t.id;document.getElementById('loc-id').readOnly=true;document.getElementById('loc-desc').value=t.desc;}}else{document.getElementById('loc-id').value='';document.getElementById('loc-id').readOnly=false;document.getElementById('loc-desc').value='';} openModal('locationModal');}
function saveLocation(){const i=document.getElementById('loc-id').value,w=document.getElementById('loc-wh').value,d=document.getElementById('loc-desc').value,md=document.getElementById('loc-mode').value; if(!i)return alert('ID필수'); let l=JSON.parse(localStorage.getItem(DB_LOCATIONS))||[]; if(md==='NEW'){l.push({id:i,whId:w,desc:d});}else{const idx=l.findIndex(o=>o.id===i);if(idx>-1)l[idx]={id:i,whId:w,desc:d};} localStorage.setItem(DB_LOCATIONS, JSON.stringify(l)); closeModal('locationModal'); renderLocations(); }


/* ==========================================================================
   5. 핵심 로직: 재고 트랜잭션 (수불부 통합)
   ========================================================================== */
function updateStock(actionType, data) {
    let stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    let ledgerList = JSON.parse(localStorage.getItem(DB_LEDGER)) || [];
    const today = new Date().toISOString().split('T')[0];

    let changeQty = 0;

    if (actionType === 'IN') {
        let target = stockList.find(s => s.sku === data.sku && s.lotId === data.lotId && s.location === data.location);
        if (target) {
            target.qty += parseInt(data.qty);
        } else {
            stockList.push({
                sku: data.sku, lotId: data.lotId, location: data.location,
                qty: parseInt(data.qty), date: data.date || today, expiry: data.expiry || ''
            });
        }
        changeQty = parseInt(data.qty);
    }
    else if (actionType === 'OUT') {
        let target = stockList.find(s => s.sku === data.sku && s.lotId === data.lotId);
        if (!target || target.qty < data.qty) { alert('재고 부족'); return false; }
        target.qty -= parseInt(data.qty);
        changeQty = -parseInt(data.qty);
    }

    // [중요] 수불부 저장 시 'change' 필드로 통일
    ledgerList.push({ 
        date: today, type: data.refType || (changeQty > 0 ? '입고' : '출고'), 
        sku: data.sku, change: changeQty, refId: data.refId 
    });

    localStorage.setItem(DB_STOCK, JSON.stringify(stockList));
    localStorage.setItem(DB_LEDGER, JSON.stringify(ledgerList));
    return true;
}

// --- [대시보드] ---
function renderDashboard() {
    const stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    const products = JSON.parse(localStorage.getItem(DB_PRODUCTS)) || [];
    const stockBySku = {};
    stockList.forEach(s => { if (!stockBySku[s.sku]) stockBySku[s.sku] = 0; stockBySku[s.sku] += s.qty; });

    const ctx = document.getElementById('inventoryChart').getContext('2d');
    const labels = Object.keys(stockBySku).map(sku => getProductInfo(sku).name);
    new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: '현재 재고량', data: Object.values(stockBySku), backgroundColor: '#3B82F6' }] } });

    const lowStockList = document.getElementById('low-stock-list');
    lowStockList.innerHTML = '';
    products.forEach(p => {
        const current = stockBySku[p.sku] || 0;
        if (current < p.safetyStock) { lowStockList.innerHTML += `<li>⚠️ [${p.name}] 현재: ${current} < 안전: ${p.safetyStock}</li>`; }
    });

    const expiryList = document.getElementById('expiry-list');
    expiryList.innerHTML = '';
    const today = new Date();
    stockList.forEach(s => {
        if (s.qty > 0 && s.expiry) {
            const p = getProductInfo(s.sku);
            const expDate = new Date(s.expiry);
            const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) {
                const color = diffDays < 0 ? 'red' : 'orange';
                const msg = diffDays < 0 ? `만료됨` : `${diffDays}일 남음`;
                expiryList.innerHTML += `<li style="color:${color}">⏳ [${p.name}] Lot:${s.lotId} (${msg})</li>`;
            }
        }
    });
}

// --- [재고 관리] 및 [리포트] 공용 수불부 로직 ---
function loadCurrentStock() {
    const tbody = document.getElementById('stock-tbody');
    const stockList = JSON.parse(localStorage.getItem(DB_STOCK)) || [];
    const filterText = document.getElementById('stock-search-input') ? document.getElementById('stock-search-input').value.toLowerCase() : '';
    tbody.innerHTML = stockList.filter(s => s.qty > 0).map(s => {
        const p = getProductInfo(s.sku);
        if (filterText && !p.name.includes(filterText) && !s.sku.toLowerCase().includes(filterText)) return '';
        return `<tr><td>${s.sku}</td><td>${p.name}</td><td>${s.lotId}</td><td>${s.location}</td><td class="text-right bold">${s.qty.toLocaleString()}</td><td>${s.expiry || '-'}</td><td>정상</td></tr>`;
    }).join('');
}

function loadStockLedger() {
    const tbody = document.getElementById('ledger-tbody');
    if(!tbody) return;
    const ledgerList = JSON.parse(localStorage.getItem(DB_LEDGER)) || [];
    
    // [중요] 날짜 필터 요소가 있으면 값 쓰고, 없으면(리포트 페이지 등) 필터 안 함
    const sDateInput = document.getElementById('ledger-start-date');
    const eDateInput = document.getElementById('ledger-end-date');
    const startDate = sDateInput ? sDateInput.value : '';
    const endDate = eDateInput ? eDateInput.value : '';
    
    let runningBalance = {};
    let html = '';

    // 날짜순 정렬
    ledgerList.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach(row => {
        const p = getProductInfo(row.sku);
        if (!runningBalance[row.sku]) runningBalance[row.sku] = 0;
        
        // [중요] 호환성 처리: 옛날 데이터(inQty/outQty)가 섞여있어도 'change'로 계산
        let actualChange = 0;
        if (row.change !== undefined) {
            actualChange = row.change;
        } else {
            actualChange = (row.inQty || 0) - (row.outQty || 0); // 옛날 데이터 호환
        }
        
        runningBalance[row.sku] += actualChange;
        
        // 필터링
        if (startDate && row.date < startDate) return;
        if (endDate && row.date > endDate) return;

        const changeColor = actualChange > 0 ? 'blue' : (actualChange < 0 ? 'red' : 'black');
        const changeStr = actualChange > 0 ? `+${actualChange}` : actualChange;

        html += `<tr>
            <td>${row.date}</td><td>${row.type}</td><td>${row.sku}</td><td>${p.name}</td><td>${row.refId}</td>
            <td style="color:${changeColor}; font-weight:bold;">${changeStr}</td>
            <td>${runningBalance[row.sku]}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}
function filterStockTable() { loadCurrentStock(); }

// --- [리포트 페이지] ---
function renderReportPage() {
    // 1. 매출 내역 (출고 완료 건)
    const salesList = JSON.parse(localStorage.getItem(DB_SALES)) || [];
    const salesBody = document.getElementById('report-sales-tbody');
    if (salesBody) {
        const shippedSales = salesList.filter(s => s.status === 'Shipped');
        salesBody.innerHTML = shippedSales.map(s => {
            const p = getProductInfo(s.sku);
            return `<tr><td>2025-12-02</td><td>${s.id}</td><td>${p.name}</td><td>${s.qty}</td><td>-</td></tr>`;
        }).join('');
    }
    // 2. 재고 원장 (공용 함수 사용)
    loadStockLedger();
}

// --- [입고/수주/반품] 렌더링 (삭제 버튼 포함) ---
function renderPurchasePage() {
    const list = JSON.parse(localStorage.getItem(DB_PURCHASE)) || [];
    const tbody = document.querySelector('#purchase-table tbody');
    tbody.innerHTML = list.map(po => {
        const p = getProductInfo(po.sku);
        return `<tr><td>${po.id}</td><td>${po.partnerName}</td><td>${p.name}</td><td>${po.qty}</td><td>${po.location||'-'}</td>
        <td>${po.status==='Ordered'?`<button class="btn-primary" onclick="processPurchaseReceive('${po.id}')">입고확정</button>`:'<span class="status-done">입고완료</span>'} <button class="btn-danger" style="margin-left:5px" onclick="deleteTransaction('${DB_PURCHASE}','${po.id}')">삭제</button></td></tr>`;
    }).join('');
    populateProductOptions('po-sku-select');
}
function registerPurchase() {
    const skuSel=document.getElementById('po-sku-select'), partner=document.getElementById('po-partner').value, location=document.getElementById('po-location').value, qty=document.getElementById('po-qty').value;
    if(!skuSel.value||!qty||!location) return alert('정보누락');
    const list=JSON.parse(localStorage.getItem(DB_PURCHASE))||[];
    list.push({id:'PO-'+Date.now(), sku:skuSel.value, partnerName:partner, location:location, qty:parseInt(qty), date:new Date().toISOString().split('T')[0], status:'Ordered'});
    localStorage.setItem(DB_PURCHASE, JSON.stringify(list)); alert('등록완료'); closeModal('purchaseModal'); renderPurchasePage();
}
function processPurchaseReceive(poId) {
    const list=JSON.parse(localStorage.getItem(DB_PURCHASE))||[]; const po=list.find(p=>p.id===poId); if(!po)return;
    const lotId='LOT-'+poId.split('-')[1]; const expiry=new Date(); expiry.setFullYear(expiry.getFullYear()+1);
    updateStock('IN', {sku:po.sku, qty:po.qty, lotId:lotId, location:po.location||'WH01-Temp', refType:'구매입고', refId:po.id, expiry:expiry.toISOString().split('T')[0]});
    po.status='Received'; localStorage.setItem(DB_PURCHASE, JSON.stringify(list)); alert('입고완료'); renderPurchasePage();
}

function renderSalesPage() {
    const list = JSON.parse(localStorage.getItem(DB_SALES)) || [];
    const tbody = document.querySelector('#sales-table tbody');
    tbody.innerHTML = list.map(so => {
        const p = getProductInfo(so.sku);
        return `<tr><td>${so.id}</td><td>${so.customer}</td><td>${p.name}</td><td>${so.qty}</td>
        <td>${so.status==='Ordered'?`<button class="btn-primary" onclick="openShipmentModal('${so.id}')">출고처리</button>`:'<span class="status-done">출고완료</span>'} <button class="btn-danger" style="margin-left:5px" onclick="deleteTransaction('${DB_SALES}','${so.id}')">삭제</button></td></tr>`;
    }).join('');
    populateProductOptions('so-sku-select');
}
// (Sales 등록/처리, Returns 함수들은 기존과 로직 동일하므로 생략 없이 사용)
function registerSales() { const skuSel=document.getElementById('so-sku-select'), customer=document.getElementById('so-customer').value, qty=document.getElementById('so-qty').value; if(!skuSel.value||!qty) return alert('정보누락'); const list=JSON.parse(localStorage.getItem(DB_SALES))||[]; list.push({id:'SO-'+Date.now(), sku:skuSel.value, customer:customer, qty:parseInt(qty), status:'Ordered'}); localStorage.setItem(DB_SALES, JSON.stringify(list)); alert('등록완료'); closeModal('salesRegModal'); renderSalesPage(); }
function openShipmentModal(soId) { const so=JSON.parse(localStorage.getItem(DB_SALES)).find(s=>s.id===soId); document.getElementById('ship-so-id').value=so.id; document.getElementById('ship-req-qty').value=so.qty; document.getElementById('ship-sku-hidden').value=so.sku; document.getElementById('ship-name-hidden').value=getProductInfo(so.sku).name; const lots=(JSON.parse(localStorage.getItem(DB_STOCK))||[]).filter(s=>s.sku===so.sku && s.qty>0); document.getElementById('ship-lot-select').innerHTML=lots.map(l=>`<option value="${l.lotId}">Lot:${l.lotId} (잔고:${l.qty})</option>`).join(''); openModal('shipmentModal'); }
function confirmShipment() { const soId=document.getElementById('ship-so-id').value, lotId=document.getElementById('ship-lot-select').value, sku=document.getElementById('ship-sku-hidden').value, qty=parseInt(document.getElementById('ship-req-qty').value); if(updateStock('OUT', {sku, lotId, qty, refType:'수주출고', refId:soId})) { let list=JSON.parse(localStorage.getItem(DB_SALES)); let so=list.find(s=>s.id===soId); so.status='Shipped'; localStorage.setItem(DB_SALES, JSON.stringify(list)); alert('출고완료'); closeModal('shipmentModal'); renderSalesPage(); } }
function renderReturnsPage() {
    const list = JSON.parse(localStorage.getItem(DB_RETURNS)) || [];
    const tbody = document.querySelector('#return-table tbody');
    
    tbody.innerHTML = list.map(r => {
        const p = getProductInfo(r.sku);
        return `
        <tr>
            <td>${r.id}</td>
            <td>${r.returnDate}</td> <td>${p.name}</td>
            <td>${r.qty}</td>
            <td>${r.reason}</td>
            <td>
                ${r.status === 'Requested' ? '<span class="status-wait">승인대기</span>' : 
                  r.status === 'Disposed' ? '<span class="status-danger">폐기완료</span>' : 
                  '<span class="status-done">재입고완료</span>'}
            </td>
            <td>
                ${r.status === 'Requested' 
                    ? `<button class="btn-primary" onclick="openReturnProcessModal('${r.id}')">처리</button>` 
                    : `<button onclick="openReturnDetailModal('${r.id}')">상세</button>`}
            </td>
        </tr>`;
    }).join('');
    
    populateProductOptions('ret-sku-select');
}
function registerReturn() {
    const skuSel = document.getElementById('ret-sku-select');
    const qty = document.getElementById('ret-qty').value;
    const reason = document.getElementById('ret-reason').value;
    const customer = document.getElementById('ret-customer').value; // 고객사 추가
    const orgDate = document.getElementById('ret-org-date').value;  // 실제 거래일 추가
    
    if(!skuSel.value || !qty || !orgDate) return alert('필수 정보 누락');

    const list = JSON.parse(localStorage.getItem(DB_RETURNS)) || [];
    list.push({
        id: 'RT-' + Date.now(),
        returnDate: new Date().toISOString().split('T')[0], // 반품 접수일(오늘)
        orgDate: orgDate,       // 실제 거래일
        customer: customer,     // 반품처(고객)
        sku: skuSel.value,
        qty: parseInt(qty),
        reason: reason,
        status: 'Requested',
        processDate: null,      // 처리일(폐기/재입고일)
        actionType: null        // 처리유형
    });
    localStorage.setItem(DB_RETURNS, JSON.stringify(list));
    alert('반품 접수 완료'); closeModal('returnRegModal'); renderReturnsPage();
}
function completeReturnProcess() {
    const id = document.getElementById('proc-ret-id').value;
    const action = document.getElementById('proc-action').value;
    const procDate = document.getElementById('proc-date').value; // 처리 날짜 입력

    if(!procDate) return alert('처리 날짜를 입력하세요.');

    let list = JSON.parse(localStorage.getItem(DB_RETURNS)) || [];
    let item = list.find(r => r.id === id);
    
    item.processDate = procDate; // 처리일 저장
    item.actionType = action;

    if (action === 'RESTOCK') {
        updateStock('IN', { 
            sku: item.sku, qty: item.qty, 
            lotId: 'LOT-RET-'+item.id, location: 'WH02-R-01', 
            refType: '반품재입고', refId: item.id,
            date: procDate // 재고 반영일
        });
        item.status = 'Restocked'; 
        alert('재입고 처리 완료');
    } else {
        item.status = 'Disposed'; 
        alert(`폐기 처리 완료 (폐기일: ${procDate})`);
    }

    localStorage.setItem(DB_RETURNS, JSON.stringify(list)); 
    closeModal('returnProcessModal'); 
    renderReturnsPage();
}

function openReturnDetailModal(id) {
    const list = JSON.parse(localStorage.getItem(DB_RETURNS)) || [];
    const item = list.find(r => r.id === id);
    const p = getProductInfo(item.sku);

    const detailHtml = `
        <p><strong>반품 ID:</strong> ${item.id}</p>
        <p><strong>상품명:</strong> ${p.name} (${p.category})</p>
        <p><strong>반품처(고객):</strong> ${item.customer || '-'}</p>
        <hr>
        <p><strong>실제 거래일:</strong> ${item.orgDate}</p>
        <p><strong>반품 접수일:</strong> ${item.returnDate}</p>
        <p><strong>처리 완료일:</strong> ${item.processDate || '-'}</p>
        <hr>
        <p><strong>처리 결과:</strong> ${item.status} (${item.actionType === 'DISPOSE' ? '폐기' : '재입고'})</p>
        <p><strong>사유:</strong> ${item.reason}</p>
    `;
    document.getElementById('detail-content').innerHTML = detailHtml;
    openModal('returnDetailModal');
}

// --- 유틸 ---
function populateProductOptions(id) { const el=document.getElementById(id); if(el) el.innerHTML='<option value="">상품 선택</option>'+(JSON.parse(localStorage.getItem(DB_PRODUCTS))||[]).map(p=>`<option value="${p.sku}">${p.name}</option>`).join(''); }
function populateLocationOptions(id) { const el=document.getElementById(id); if(el) el.innerHTML='<option value="">로케이션 선택</option>'+(JSON.parse(localStorage.getItem(DB_LOCATIONS))||[]).map(l=>`<option value="${l.id}">${l.id} (${l.desc})</option>`).join(''); }
function initializeTabs() { document.querySelectorAll('.tab-link').forEach(btn=>{btn.addEventListener('click',(e)=>{const t=e.target.dataset.tab; document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active')); document.querySelectorAll('.tab-link').forEach(b=>b.classList.remove('active')); document.getElementById(t).classList.add('active'); e.target.classList.add('active');});}); }
function openModal(id) { if(id==='purchaseModal'){populateProductOptions('po-sku-select');populateLocationOptions('po-location');} if(id==='salesRegModal')populateProductOptions('so-sku-select'); if(id==='returnRegModal')populateProductOptions('ret-sku-select'); document.getElementById(id).style.display='block'; }
function closeModal(id) { document.getElementById(id).style.display='none'; }
function openReturnProcessModal(id) { document.getElementById('proc-ret-id').value=id; openModal('returnProcessModal'); }