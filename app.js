/* ==========================================================================
   멍밥 ERP - 데이터 시뮬레이션 및 로직 (app.js)
   ========================================================================== */

const STORAGE_KEY_STOCK = 'mungbab_stock_data';
const STORAGE_KEY_LEDGER = 'mungbab_ledger_data';

// 1. 초기 더미 데이터 생성 (localStorage가 비어있을 경우)
function initMockData() {
    if (!localStorage.getItem(STORAGE_KEY_STOCK)) {
        const initialStock = [
            { sku: 'SKU-D01', name: '프리미엄 그레인프리 사료', lotId: 'D01-A251110', location: 'WH01-A-01', qty: 20, expiry: '2025-11-29' },
            { sku: 'SKU-D01', name: '프리미엄 그레인프리 사료', lotId: 'D01-B251115', location: 'WH01-A-02', qty: 40, expiry: '2026-02-15' },
            { sku: 'SKU-C01', name: '웰니스 고양이 캔', lotId: 'C01-A251111', location: 'WH01-C-01', qty: 100, expiry: '2026-01-10' }
        ];
        localStorage.setItem(STORAGE_KEY_STOCK, JSON.stringify(initialStock));
    }
    
    if (!localStorage.getItem(STORAGE_KEY_LEDGER)) {
        const initialLedger = [
            { date: '2025-11-10', type: '입고(PO)', sku: 'SKU-D01', name: '프리미엄 그레인프리 사료', refId: 'PO-001', inQty: 20, outQty: 0, balance: 20 },
            { date: '2025-11-11', type: '입고(PO)', sku: 'SKU-D01', name: '프리미엄 그레인프리 사료', refId: 'PO-002', inQty: 40, outQty: 0, balance: 60 }
        ];
        localStorage.setItem(STORAGE_KEY_LEDGER, JSON.stringify(initialLedger));
    }
}

// 2. [Tab 1] 현재고 현황 렌더링
// ... (이전 initMockData, loadCurrentStock 함수는 유지) ...

/**
 * [핵심 기능] 재고 수불부 조회 (날짜별 재고 계산 로직 포함)
 * - 전체 이력을 시간순으로 정렬하여 잔고(Balance)를 확정한 뒤,
 * - 사용자가 선택한 날짜 범위(End Date)에 맞는 데이터만 필터링하여 표시함.
 */
/* app.js - loadStockLedger 함수 (전면 수정) */

function loadStockLedger() {
    const tbody = document.getElementById('ledger-tbody');
    if (!tbody) return;

    // 1. 조회 조건 가져오기
    const startDate = document.getElementById('ledger-start-date').value || '2025-01-01';
    const endDate = document.getElementById('ledger-end-date').value || new Date().toISOString().split('T')[0];
    const skuFilter = (document.getElementById('ledger-sku-filter').value || '').toUpperCase();

    // 2. 전체 거래 내역 가져오기 (localStorage)
    let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY_LEDGER)) || [];

    // 3. [핵심 로직] 시간 순서대로 정렬 (과거 -> 미래)
    // 날짜별 재고 흐름을 계산하기 위해 필수
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 4. SKU별 누적 재고 계산 (Running Balance)
    let skuBalanceMap = {}; // { 'SKU-D01': 50, ... }

    // 모든 거래를 순회하며 잔고를 계산 (표시 여부와 관계없이 계산은 전체 수행해야 정확함)
    const calculatedTransactions = transactions.map(tx => {
        // 현재 SKU의 이전 잔고 가져오기 (없으면 0)
        let currentBal = skuBalanceMap[tx.sku] || 0;

        // 입고면 더하고, 출고면 뺌
        if (tx.inQty > 0) currentBal += parseInt(tx.inQty);
        if (tx.outQty > 0) currentBal -= parseInt(tx.outQty);

        // 맵 업데이트
        skuBalanceMap[tx.sku] = currentBal;

        // 계산된 '그 날짜의 재고'를 트랜잭션 객체에 추가
        return {
            ...tx,
            balanceSnapshot: currentBal // [중요] 날짜별 현재고
        };
    });

    // 5. 계산 후, 사용자가 요청한 날짜/SKU로 필터링
    const filteredList = calculatedTransactions.filter(item => {
        const inDateRange = item.date >= startDate && item.date <= endDate;
        const inSkuMatches = skuFilter === '' || item.sku.includes(skuFilter) || item.name.includes(skuFilter);
        return inDateRange && inSkuMatches;
    });

    // 6. 보여줄 때는 최신순(미래 -> 과거)으로 뒤집어서 렌더링
    filteredList.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 7. HTML 렌더링
    tbody.innerHTML = '';
    if (filteredList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">조회된 내역이 없습니다.</td></tr>';
        return;
    }

    filteredList.forEach(row => {
        const tr = document.createElement('tr');
        
        // 입고/출고 색상 구분
        const typeHtml = row.inQty > 0 
            ? `<span class="status-done">${row.type}</span>` 
            : `<span class="status-danger">${row.type}</span>`;
        
        // 수량 표시 (+/-)
        const inQtyStr = row.inQty > 0 ? `+${row.inQty}` : '-';
        const outQtyStr = row.outQty > 0 ? `-${row.outQty}` : '-';

        tr.innerHTML = `
            <td>${row.date}</td>
            <td>${typeHtml}</td>
            <td>${row.sku}</td>
            <td style="text-align:left;">${row.name}</td>
            <td>${row.refId || '-'}</td>
            <td style="color:blue; text-align:right;">${inQtyStr}</td>
            <td style="color:red; text-align:right;">${outQtyStr}</td>
            <td style="font-weight:bold; text-align:right; background-color:#f9fafb;">${row.balanceSnapshot}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 3. [Tab 2] 재고 수불부 렌더링
function loadStockLedger() {
    const tbody = document.getElementById('ledger-tbody');
    if (!tbody) return;

    const ledgerList = JSON.parse(localStorage.getItem(STORAGE_KEY_LEDGER)) || [];
    // 최신순 정렬 (날짜 내림차순)
    ledgerList.sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = '';
    
    // 잔고 재계산 로직 (단순화를 위해 저장된 balance 사용하지만, 실제론 여기서 다시 계산 가능)
    ledgerList.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.date}</td>
            <td>${row.type.includes('입고') ? '<span class="status-done">'+row.type+'</span>' : '<span class="status-danger">'+row.type+'</span>'}</td>
            <td>${row.sku}</td>
            <td>${row.name}</td>
            <td>${row.refId}</td>
            <td style="color:blue;">${row.inQty > 0 ? '+' + row.inQty : '-'}</td>
            <td style="color:red;">${row.outQty > 0 ? '-' + row.outQty : '-'}</td>
            <td style="font-weight:bold;">${row.balance}</td> 
        `;
        tbody.appendChild(tr);
    });
}

// 4. [핵심] 재고 트랜잭션 처리 (입고/출고 발생 시 호출)
// type: 'IN'(입고) or 'OUT'(출고)
function updateStockTransaction(type, sku, name, lotId, qty, refId) {
    let stockList = JSON.parse(localStorage.getItem(STORAGE_KEY_STOCK)) || [];
    let ledgerList = JSON.parse(localStorage.getItem(STORAGE_KEY_LEDGER)) || [];
    const today = new Date().toISOString().split('T')[0];

    // (1) 현재고(Tbl_StockLots) 업데이트
    let targetItem = stockList.find(item => item.sku === sku && item.lotId === lotId);
    
    if (type === 'IN') {
        if (targetItem) {
            targetItem.qty += parseInt(qty);
        } else {
            // 신규 로트 생성
            stockList.push({
                sku: sku, name: name, lotId: lotId, location: '입고대기', qty: parseInt(qty), expiry: '2026-12-31' // 데모용
            });
        }
    } else if (type === 'OUT') {
        if (targetItem) {
            targetItem.qty -= parseInt(qty);
            if(targetItem.qty < 0) targetItem.qty = 0; // 마이너스 방지
        } else {
            alert('오류: 출고하려는 재고(Lot)가 없습니다.');
            return;
        }
    }

    // (2) 수불부(Ledger) 기록 추가
    // 현재 해당 SKU의 총 재고량 계산 (Balance용)
    const totalStock = stockList.filter(i => i.sku === sku).reduce((acc, cur) => acc + cur.qty, 0);

    ledgerList.push({
        date: today,
        type: type === 'IN' ? '입고(PO)' : '출고(SO)',
        sku: sku,
        name: name,
        refId: refId,
        inQty: type === 'IN' ? qty : 0,
        outQty: type === 'OUT' ? qty : 0,
        balance: totalStock // 트랜잭션 후 잔고
    });

    // (3) 저장
    localStorage.setItem(STORAGE_KEY_STOCK, JSON.stringify(stockList));
    localStorage.setItem(STORAGE_KEY_LEDGER, JSON.stringify(ledgerList));

    // (4) UI 갱신 (현재 페이지가 stock.html인 경우)
    if(document.getElementById('current-stock-table')) {
        loadCurrentStock();
        loadStockLedger();
    }
}

// 5. 버튼 연동용 래퍼 함수 (sales.html / purchase.html 에서 호출)
function confirmShipment() {
    // sales.html의 '출고 확정' 버튼에서 호출됨
    // 예시: SKU-D01 20개 출고
    if(confirm('수주 건(SO-202511-002)을 출고 확정하시겠습니까?')) {
        updateStockTransaction('OUT', 'SKU-D01', '프리미엄 그레인프리 사료', 'D01-A251110', 20, 'SO-202511-002');
        updateStockTransaction('OUT', 'SKU-C01', '웰니스 고양이 캔', 'C01-A251111', 100, 'SO-202511-002');
        alert('출고가 확정되었으며 재고가 차감되었습니다.');
        window.location.href = 'stock.html'; // 재고 페이지로 이동하여 확인
    }
}

/* 탭 기능 및 검색 기능 등 기존 app.js 내용 유지 */
function initializeTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    tabLinks.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            button.closest('.tabs').querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
            button.closest('.dashboard').querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

function filterStockTable() {
    const input = document.getElementById('stock-search-input');
    const filter = input.value.toUpperCase();
    const table = document.getElementById('current-stock-table');
    if (!table) return;
    const tr = table.getElementsByTagName('tr');
    for (let i = 0; i < tr.length; i++) {
        if (tr[i].getElementsByTagName('th').length > 0) continue;
        const tdSku = tr[i].getElementsByTagName('td')[0];
        const tdName = tr[i].getElementsByTagName('td')[1];
        if (tdSku && tdName) {
            if ((tdSku.textContent || tdSku.innerText).toUpperCase().indexOf(filter) > -1 || 
                (tdName.textContent || tdName.innerText).toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}

/* app.js - 반품 모달 데이터 바인딩 로직 */

/**
 * [기능] 반품 상세 모달 열기 및 데이터 바인딩
 * @param {Object} returnData - 반품 건 데이터 객체 (예시)
 */
function openReturnActionModal(returnData) {
    // 1. 모달 엘리먼트 가져오기
    const modal = document.getElementById('actionModal');
    if (!modal) return;

    // 2. [요구사항] 카테고리 구분 불가 시 '기타' 처리
    // returnData.category 값이 없거나(falsey) 빈 문자열이면 '기타' 사용
    const categoryName = returnData.category || '기타';
    
    // 3. 데이터 바인딩 (input ID는 returns.html에 맞춰져 있어야 함)
    // 예: <input id="modal-category" ...>
    document.getElementById('modal-transaction-date').value = returnData.transactionDate; // 실제 거래일
    document.getElementById('modal-customer').value = returnData.customerName;            // 반품처(어디서)
    document.getElementById('modal-category').value = categoryName;                       // 카테고리 (기타)
    
    // 반품/폐기 날짜 초기값 세팅 (오늘 날짜)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('modal-return-date').value = returnData.returnDate || today;
    document.getElementById('modal-action-date').value = today;

    // 모달 표시
    modal.style.display = 'block';
}

// [테스트용] 버튼 클릭 시 실행될 예시 함수
function testOpenReturnModal() {
    // 가상의 데이터 (카테고리가 없는 경우 테스트)
    const mockData = {
        id: 'RT-001',
        transactionDate: '2025-11-12',
        customerName: 'C-2001 (행복한 펫샵)',
        category: '', // [중요] 비어있음 -> '기타'로 표시되어야 함
        returnDate: '2025-11-18'
    };
    openReturnActionModal(mockData);
}