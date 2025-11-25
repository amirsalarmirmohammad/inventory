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

// اگر null باشد یعنی در حالت "افزودن" هستیم، نه "ویرایش"
let currentEditId = null;

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

    filtered.forEach((item, index) => {
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

        // دکمه ویرایش
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-outline btn-sm btn-edit';
        editBtn.textContent = 'ویرایش';
        editBtn.setAttribute('data-id', item.id);

        // دکمه حذف
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
        // حالت ویرایش: آیتم موجود را پیدا و آپدیت کن
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
        // حالت افزودن: آیتم جدید اضافه کن
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
});

// initial render
renderTable();
