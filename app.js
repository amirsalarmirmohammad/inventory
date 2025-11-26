const STORAGE_KEY = 'inventoryData_v2';

const form = document.getElementById('inventory-form');
const tableBody = document.getElementById('inventory-table-body');
const clearBtn = document.getElementById('clear-all');
const searchInput = document.getElementById('search-input');
const emptyState = document.getElementById('empty-state');

const statItems = document.getElementById('stat-items');
const statQuantity = document.getElementById('stat-quantity');
const statLocations = document.getElementById('stat-locations');
const totalValueDiv = document.getElementById('total-value');

// حالت ویرایش
let currentEditId = null;

// تنظیمات مرتب‌سازی
let sortConfig = {
    field: null,      // مثل "name" یا "price"
    direction: 'asc', // "asc" یا "desc"
};

function loadInventory() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveInventory(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function formatNumber(num) {
    return Number(num).toLocaleString('fa-IR');
}

function renderStats(items) {
    const itemCount = items.length;

    const totalQty = items.reduce((sum, item) => {
        const q = parseFloat(item.quantity || 0);
        return sum + (isNaN(q) ? 0 : q);
    }, 0);

    const locations = new Set(
        items
            .map(i => (i.location || '').trim())
            .filter(Boolean)
    );

    if (statItems) statItems.textContent = formatNumber(itemCount);
    if (statQuantity) statQuantity.textContent = formatNumber(totalQty);
    if (statLocations) statLocations.textContent = formatNumber(locations.size);
}

function calcTotalInventoryValue(items) {
    return items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity || 0);
        const price = parseFloat(item.price || 0);
        if (isNaN(qty) || isNaN(price)) return sum;
        return sum + qty * price;
    }, 0);
}
function buildCategorySummary(items) {
    const map = {};

    items.forEach(item => {
        const category = item.category || 'بدون دسته';
        const qty = parseFloat(item.quantity || 0) || 0;
        const price = parseFloat(item.price || 0) || 0;
        const value = qty * price;

        if (!map[category]) {
            map[category] = {
                category,
                totalQty: 0,
                totalValue: 0
            };
        }

        map[category].totalQty += qty;
        map[category].totalValue += value;
    });

    return Object.values(map);
}

function renderCategorySummary(items) {
    const tbody = document.getElementById('category-summary-body');
    const maxInfoDiv = document.getElementById('max-item-info');

    if (!tbody) return;

    tbody.innerHTML = '';

    const summary = buildCategorySummary(items);

    if (summary.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 3;
        td.textContent = 'داده‌ای برای نمایش دسته‌ها وجود ندارد.';
        td.style.textAlign = 'center';
        tr.appendChild(td);
        tbody.appendChild(tr);

        if (maxInfoDiv) maxInfoDiv.textContent = '';
        return;
    }

    summary.forEach(row => {
        const tr = document.createElement('tr');

        const tdCat = document.createElement('td');
        tdCat.textContent = row.category;

        const tdQty = document.createElement('td');
        tdQty.textContent = formatNumber(row.totalQty);

        const tdVal = document.createElement('td');
        tdVal.textContent = formatNumber(row.totalValue);

        tr.appendChild(tdCat);
        tr.appendChild(tdQty);
        tr.appendChild(tdVal);

        tbody.appendChild(tr);
    });

    if (maxInfoDiv) {
        const maxItem = items.reduce((best, item) => {
            const qty = parseFloat(item.quantity || 0) || 0;
            const price = parseFloat(item.price || 0) || 0;
            const value = qty * price;

            if (!best || value > best.value) {
                return {
                    name: item.name,
                    code: item.code,
                    value
                };
            }
            return best;
        }, null);

        if (maxItem && maxItem.value > 0) {
            maxInfoDiv.textContent =
                'بیشترین ارزش: ' +
                (maxItem.name || 'بدون نام') +
                ' ' +
                '(' + (maxItem.code || 'بدون کد') + ')' +
                ' با ارزش ' +
                formatNumber(maxItem.value) +
                ' ریال';
        } else {
            maxInfoDiv.textContent = '';
        }
    }
}


function sortItems(items) {
    if (!sortConfig.field) return items;

    const sorted = [...items];
    const field = sortConfig.field;
    const dir = sortConfig.direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
        let aVal, bVal;

        switch (field) {
            case 'name':
                aVal = (a.name || '').toLowerCase();
                bVal = (b.name || '').toLowerCase();
                break;
            case 'code':
                aVal = (a.code || '').toLowerCase();
                bVal = (b.code || '').toLowerCase();
                break;
            case 'location':
                aVal = (a.location || '').toLowerCase();
                bVal = (b.location || '').toLowerCase();
                break;
            case 'category':
                aVal = (a.category || '').toLowerCase();
                bVal = (b.category || '').toLowerCase();
                break;
            case 'quantity':
                aVal = parseFloat(a.quantity || 0) || 0;
                bVal = parseFloat(b.quantity || 0) || 0;
                break;
            case 'price':
                aVal = parseFloat(a.price || 0) || 0;
                bVal = parseFloat(b.price || 0) || 0;
                break;
            case 'value': {
                const aq = parseFloat(a.quantity || 0) || 0;
                const ap = parseFloat(a.price || 0) || 0;
                const bq = parseFloat(b.quantity || 0) || 0;
                const bp = parseFloat(b.price || 0) || 0;
                aVal = aq * ap;
                bVal = bq * bp;
                break;
            }
            default:
                return 0;
        }

        let cmp;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
            cmp = aVal.localeCompare(bVal, 'fa', {
                numeric: true,
                sensitivity: 'base',
            });
        } else {
            cmp = aVal - bVal;
        }
        return cmp * dir;
    });

    return sorted;
}

function renderTable(filterText = '') {
    const items = loadInventory();
    const normalizedFilter = filterText.trim().toLowerCase();
    tableBody.innerHTML = '';

    const filtered = items.filter(item => {
        if (!normalizedFilter) return true;

        const haystack = [
            item.name,
            item.code,
            item.location,
            item.category,
            item.description
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return haystack.includes(normalizedFilter);
    });

    if (filtered.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
    }

    const dataToRender = sortItems(filtered);

    dataToRender.forEach((item, index) => {
        const tr = document.createElement('tr');

        const tdIndex = document.createElement('td');
        tdIndex.textContent = index + 1;

        const tdName = document.createElement('td');
        tdName.textContent = item.name;

        const tdCode = document.createElement('td');
        tdCode.textContent = item.code;

        const tdQty = document.createElement('td');
        tdQty.textContent = item.quantity;

        const tdPrice = document.createElement('td');
        tdPrice.textContent = item.price
            ? formatNumber(item.price)
            : '—';

        const tdValue = document.createElement('td');
        const qtyNum = parseFloat(item.quantity || 0);
        const priceNum = parseFloat(item.price || 0);
        const lineTotal =
            isNaN(qtyNum) || isNaN(priceNum) ? 0 : qtyNum * priceNum;
        tdValue.textContent = lineTotal ? formatNumber(lineTotal) : '—';

        const tdLocation = document.createElement('td');
        tdLocation.textContent = item.location || '—';

        const tdCategory = document.createElement('td');
        if (item.category) {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = item.category;
            tdCategory.appendChild(span);
        } else {
            tdCategory.textContent = '—';
        }

        const tdDesc = document.createElement('td');
        tdDesc.textContent = item.description || '—';

        const tdActions = document.createElement('td');

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-outline btn-sm btn-edit';
        editBtn.textContent = 'ویرایش';
        editBtn.setAttribute('data-id', item.id);

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-danger btn-sm btn-delete';
        delBtn.textContent = 'حذف';
        delBtn.setAttribute('data-id', item.id);

        tdActions.appendChild(editBtn);
        tdActions.appendChild(delBtn);

        tr.appendChild(tdIndex);
        tr.appendChild(tdName);
        tr.appendChild(tdCode);
        tr.appendChild(tdQty);
        tr.appendChild(tdPrice);
        tr.appendChild(tdValue);
        tr.appendChild(tdLocation);
        tr.appendChild(tdCategory);
        tr.appendChild(tdDesc);
        tr.appendChild(tdActions);

        tableBody.appendChild(tr);
    });

    renderStats(items);

    if (totalValueDiv) {
        const totalValue = calcTotalInventoryValue(items);
        totalValueDiv.textContent =
            'ارزش کل انبار: ' + formatNumber(totalValue) + ' ریال';
    }
    // گزارش دسته‌ها و بیشترین ارزش
    renderCategorySummary(items);
}

function generateId() {
    return (
        'item_' +
        Date.now() +
        '_' +
        Math.random()
            .toString(16)
            .slice(2)
    );
}

function fillFormFromItem(item) {
    document.getElementById('name').value = item.name || '';
    document.getElementById('code').value = item.code || '';
    document.getElementById('quantity').value = item.quantity || '';
    document.getElementById('price').value = item.price || '';
    document.getElementById('location').value = item.location || '';
    document.getElementById('category').value = item.category || '';
    document.getElementById('description').value = item.description || '';
}

function setFormModeEdit(isEdit) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    if (isEdit) {
        submitBtn.textContent = 'ذخیره تغییرات';
        submitBtn.classList.add('btn-edit-mode');
    } else {
        submitBtn.textContent = 'افزودن به انبار';
        submitBtn.classList.remove('btn-edit-mode');
    }
}

function initSortHeaders() {
    const headers = document.querySelectorAll('th[data-sort]');
    headers.forEach(th => {
        th.addEventListener('click', () => {
            const field = th.getAttribute('data-sort');
            if (!field) return;

            if (sortConfig.field === field) {
                sortConfig.direction =
                    sortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortConfig.field = field;
                sortConfig.direction = 'asc';
            }

            renderTable(searchInput ? searchInput.value : '');
        });
    });
}

form.addEventListener('submit', function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const code = document.getElementById('code').value.trim();
    const quantity = document.getElementById('quantity').value;
    const price = document.getElementById('price').value;
    const location = document.getElementById('location').value.trim();
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value.trim();

    if (!name || !code) {
        alert('نام کالا و کد کالا الزامی است.');
        return;
    }

    const items = loadInventory();

    if (currentEditId) {
        const index = items.findIndex(i => i.id === currentEditId);
        if (index !== -1) {
            items[index] = {
                ...items[index],
                name,
                code,
                quantity: quantity || '0',
                price: price || '0',
                location,
                category,
                description
            };
        }
        currentEditId = null;
        setFormModeEdit(false);
    } else {
        items.push({
            id: generateId(),
            name,
            code,
            quantity: quantity || '0',
            price: price || '0',
            location,
            category,
            description
        });
    }

    saveInventory(items);
    renderTable(searchInput ? searchInput.value : '');
    form.reset();
    document.getElementById('name').focus();
});

clearBtn.addEventListener('click', function () {
    if (confirm('همهٔ اطلاعات انبار برای این مرورگر حذف شود؟')) {
        localStorage.removeItem(STORAGE_KEY);
        currentEditId = null;
        setFormModeEdit(false);
        renderTable(searchInput ? searchInput.value : '');
    }
});

if (searchInput) {
    searchInput.addEventListener('input', function () {
        renderTable(this.value);
    });
}

tableBody.addEventListener('click', function (e) {
    const editBtn = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.btn-delete');

    if (editBtn) {
        const id = editBtn.getAttribute('data-id');
        const items = loadInventory();
        const item = items.find(i => i.id === id);
        if (item) {
            currentEditId = id;
            fillFormFromItem(item);
            setFormModeEdit(true);
        }
        return;
    }

    if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-id');
        let items = loadInventory();
        items = items.filter(item => item.id !== id);
        saveInventory(items);
        renderTable(searchInput ? searchInput.value : '');
    }

    function exportCSV(items) {
    if (!items.length) {
        alert("هیچ داده‌ای برای خروجی وجود ندارد");
        return;
    }

    const header = [
        "name", "code", "quantity", "price",
        "location", "category", "description"
    ];

    const rows = items.map(item =>
        header.map(h => `"${(item[h] || "").toString().replace(/"/g, '""')}"`).join(",")
    );

    const csv = header.join(",") + "\n" + rows.join("\n");

    const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory.csv";
    a.click();
    URL.revokeObjectURL(url);
}
    function exportJSON(items) {
    if (!items.length) {
        alert("هیچ داده‌ای برای خروجی وجود ندارد");
        return;
    }

    const json = JSON.stringify(items, null, 2);

    const blob = new Blob([json], {type: "application/json"});
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory.json";
    a.click();
    URL.revokeObjectURL(url);
}
function importJSON(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) {
                alert("فرمت فایل معتبر نیست");
                return;
            }

            saveInventory(data);
            renderTable();
            alert("داده‌ها با موفقیت وارد شدند");
        } catch {
            alert("فایل JSON معتبر نیست");
        }
    };

    reader.readAsText(file);
}
document.getElementById("export-csv").addEventListener("click", () => {
    exportCSV(loadInventory());
});

document.getElementById("export-json").addEventListener("click", () => {
    exportJSON(loadInventory());
});

document.getElementById("import-json").addEventListener("click", () => {
    document.getElementById("import-file").click();
});

document.getElementById("import-file").addEventListener("change", function() {
    if (this.files.length) {
        importJSON(this.files[0]);
        this.value = "";
    }
});


});

// init
initSortHeaders();
renderTable();
