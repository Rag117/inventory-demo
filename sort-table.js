/**
 * HTML 테이블을 정렬 가능하게 만드는 스크립트
 * 사용법:
 * 1. <table>에 'sortable-table' 클래스 추가
 * 2. <thead>의 <th>에 'sortable-header' 클래스 추가
 * 3. 이 스크립트 파일을 <body> 끝에 추가
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
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const header = table.querySelectorAll('th.sortable-header')[columnIndex];
    
    // 현재 정렬 순서 (기본값: 오름차순 'asc')
    const currentOrder = header.classList.contains('sort-asc') ? 'desc' : 'asc';

    // 1. 정렬 로직
    const sortedRows = rows.sort((a, b) => {
        const aText = a.querySelectorAll('td')[columnIndex].textContent.trim();
        const bText = b.querySelectorAll('td')[columnIndex].textContent.trim();

        // 숫자형/텍스트형 자동 감지
        // 쉼표(,)가 포함된 숫자(예: 3,500)도 처리
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