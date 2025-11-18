/**
 * HTML 테이블을 정렬 가능하게 만드는 스크립트
 */
document.addEventListener('DOMContentLoaded', () => {
    // 정렬 가능한 모든 테이블을 찾습니다.
    const tables = document.querySelectorAll('table.sortable-table');
    
    tables.forEach(table => {
        const headers = table.querySelectorAll('th.sortable-header');
        
        headers.forEach((header, index) => {
            header.addEventListener('click', () => {
                sortTableByColumn(table, index);
            });
        });
    });
});

/**
 * 테이블을 특정 열 기준으로 정렬합니다.
 * @param {HTMLTableElement} table - 정렬할 테이블
 * @param {number} columnIndex - 정렬할 열의 인덱스 (0부터 시작)
 */
function sortTableByColumn(table, columnIndex) {
    const tbody = table.querySelector('tbody');
    if (!tbody) return; // tbody가 없으면 정렬하지 않음
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const header = table.querySelectorAll('th.sortable-header')[columnIndex];
    
    // 현재 정렬 순서 (기본값: 오름차순 'asc')
    const currentOrder = header.classList.contains('sort-asc') ? 'desc' : 'asc';

    // 1. 정렬 로직
    const sortedRows = rows.sort((a, b) => {
        const aCell = a.querySelectorAll('td')[columnIndex];
        const bCell = b.querySelectorAll('td')[columnIndex];

        if (!aCell || !bCell) return 0;

        const aText = aCell.textContent.trim();
        const bText = bCell.textContent.trim();

        // 숫자형/텍스트형 자동 감지 (쉼표 포함)
        const aValue = parseValue(aText);
        const bValue = parseValue(bText);

        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return currentOrder === 'asc' ? aValue - bValue : bValue - aValue;
        } else {
            // 텍스트 비교
            return currentOrder === 'asc' 
                ? aValue.toString().localeCompare(bValue.toString(), 'ko-KR') 
                : bValue.toString().localeCompare(aValue.toString(), 'ko-KR');
        }
    });

    // 2. 모든 헤더의 정렬 클래스 초기화
    table.querySelectorAll('th.sortable-header').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });

    // 3. 현재 헤더에 정렬 클래스 적용
    header.classList.add(currentOrder === 'asc' ? 'sort-asc' : 'sort-desc');

    // 4. 정렬된 행을 다시 DOM에 삽입
    tbody.innerHTML = ''; // tbody 비우기
    sortedRows.forEach(row => {
        tbody.appendChild(row); // 정렬된 순서대로 다시 추가
    });
}

/**
 * 셀의 텍스트를 숫자나 문자로 변환
 */
function parseValue(value) {
    // 쉼표(,) 제거 후 숫자로 변환 시도
    const numberValue = parseFloat(value.replace(/,/g, ''));
    if (!isNaN(numberValue)) {
        return numberValue;
    }
    return value; // 숫자가 아니면 원본 텍스트 반환
}