
import { useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';

const STORAGE_KEY = 'inventoryData_v2';

const initialForm = {
  name: '',
  code: '',
  quantity: '',
  price: '',
  location: '',
  category: '',
  description: '',
};

function formatNumber(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '۰';
  return num.toLocaleString('fa-IR');
}

function buildCategorySummary(items) {
  const map = {};

  items.forEach((item) => {
    const category = item.category || 'بدون دسته';
    const qty = parseFloat(item.quantity || 0) || 0;
    const price = parseFloat(item.price || 0) || 0;
    const value = qty * price;

    if (!map[category]) {
      map[category] = {
        category,
        totalQty: 0,
        totalValue: 0,
      };
    }

    map[category].totalQty += qty;
    map[category].totalValue += value;
  });

  return Object.values(map);
}

function sortItems(items, sortConfig) {
  if (!sortConfig.field) return items;

  const dir = sortConfig.direction === 'asc' ? 1 : -1;
  const field = sortConfig.field;
  const sorted = [...items];

  sorted.sort((a, b) => {
    let aVal;
    let bVal;

    switch (field) {
      case 'name':
      case 'code':
      case 'location':
      case 'category':
        aVal = (a[field] || '').toString().toLowerCase();
        bVal = (b[field] || '').toString().toLowerCase();
        break;
      case 'quantity':
        aVal = parseFloat(a.quantity || 0) || 0;
        bVal = parseFloat(b.quantity || 0) || 0;
        break;
      case 'price':
        aVal = parseFloat(a.price || 0) || 0;
        bVal = parseFloat(b.price || 0) || 0;
        break;
      case 'value':
        aVal = (parseFloat(a.quantity || 0) || 0) * (parseFloat(a.price || 0) || 0);
        bVal = (parseFloat(b.quantity || 0) || 0) * (parseFloat(b.price || 0) || 0);
        break;
      default:
        return 0;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal, 'fa', { numeric: true, sensitivity: 'base' }) * dir;
    }

    return (aVal - bVal) * dir;
  });

  return sorted;
}

function App() {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to read storage', error);
      return [];
    }
  });
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + (parseFloat(item.quantity || 0) || 0), 0);
    const locations = new Set(items.map((item) => (item.location || '').trim()).filter(Boolean));

    return {
      totalItems,
      totalQuantity,
      locationCount: locations.size,
    };
  }, [items]);

  const totalValue = useMemo(
    () =>
      items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity || 0) || 0;
        const price = parseFloat(item.price || 0) || 0;
        return sum + qty * price;
      }, 0),
    [items],
  );

  const categorySummary = useMemo(() => buildCategorySummary(items), [items]);

  const maxValueItem = useMemo(() => {
    return items.reduce(
      (best, item) => {
        const qty = parseFloat(item.quantity || 0) || 0;
        const price = parseFloat(item.price || 0) || 0;
        const value = qty * price;

        if (!best || value > best.value) {
          return {
            name: item.name || 'بدون نام',
            code: item.code || 'بدون کد',
            value,
          };
        }
        return best;
      },
      null,
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return items;

    return items.filter((item) => {
      const haystack = [item.name, item.code, item.location, item.category, item.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [items, searchTerm]);

  const sortedItems = useMemo(() => sortItems(filteredItems, sortConfig), [filteredItems, sortConfig]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedName = formData.name.trim();
    const trimmedCode = formData.code.trim();

    if (!trimmedName || !trimmedCode) {
      alert('نام کالا و کد کالا الزامی است.');
      return;
    }

    if (editingId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                ...formData,
                name: trimmedName,
                code: trimmedCode,
                quantity: formData.quantity || '0',
                price: formData.price || '0',
              }
            : item,
        ),
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: `item_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          ...formData,
          name: trimmedName,
          code: trimmedCode,
          quantity: formData.quantity || '0',
          price: formData.price || '0',
        },
      ]);
    }

    resetForm();
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name || '',
      code: item.code || '',
      quantity: item.quantity || '',
      price: item.price || '',
      location: item.location || '',
      category: item.category || '',
      description: item.description || '',
    });
  };

  const handleDelete = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      resetForm();
    }
  };

  const handleClear = () => {
    if (confirm('همهٔ اطلاعات انبار برای این مرورگر حذف شود؟')) {
      setItems([]);
      resetForm();
    }
  };

  const handleSort = (field) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'asc' };
    });
  };

  const handleExportCSV = () => {
    if (!items.length) {
      alert('هیچ داده‌ای برای خروجی وجود ندارد');
      return;
    }

    const header = ['name', 'code', 'quantity', 'price', 'location', 'category', 'description'];
    const rows = items.map((item) =>
      header.map((key) => `"${(item[key] || '').toString().replace(/"/g, '""')}"`).join(','),
    );

    const csvBody = `${header.join(',')}\n${rows.join('\n')}`;
    const blob = new Blob([`\uFEFF${csvBody}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (!items.length) {
      alert('هیچ داده‌ای برای خروجی وجود ندارد');
      return;
    }

    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result ?? '[]');
        if (!Array.isArray(data)) {
          alert('فرمت فایل معتبر نیست');
          return;
        }
        setItems(data);
        resetForm();
        alert('داده‌ها با موفقیت وارد شدند');
      } catch (error) {
        console.error('Import failed', error);
        alert('فایل JSON معتبر نیست');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const handlePrint = () => window.print();

  return (
    <div className="page-wrapper">
      <div className="card">
        <div className="card-header">
          <div>
            <h1>سیستم انبارداری تحت وب</h1>
            <p className="subtitle">ثبت، مدیریت و نمایش موجودی کالاها تنها در مرورگر</p>
          </div>
          <span className="badge">نسخه ری‌اکتیو</span>
        </div>
      </div>

      <div className="card">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">تعداد اقلام</div>
            <div className="stat-value" id="stat-items">
              {formatNumber(stats.totalItems)}
            </div>
            <div className="stat-extra">تعداد ردیف‌های ثبت‌شده</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">مجموع تعداد</div>
            <div className="stat-value" id="stat-quantity">
              {formatNumber(stats.totalQuantity)}
            </div>
            <div className="stat-extra">جمع تعداد تمام کالاها</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">تعداد محل‌ها</div>
            <div className="stat-value" id="stat-locations">
              {formatNumber(stats.locationCount)}
            </div>
            <div className="stat-extra">محل‌های یکتای نگهداری</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--primary-dark)' }}>
            گزارش دسته‌ها و بیشترین ارزش
          </h2>
        </div>

        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>دسته</th>
                <th>مجموع تعداد</th>
                <th>مجموع ارزش (ریال)</th>
              </tr>
            </thead>
            <tbody>
              {categorySummary.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center' }}>
                    داده‌ای برای نمایش دسته‌ها وجود ندارد.
                  </td>
                </tr>
              ) : (
                categorySummary.map((row) => (
                  <tr key={row.category}>
                    <td>{row.category}</td>
                    <td>{formatNumber(row.totalQty)}</td>
                    <td>{formatNumber(row.totalValue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div id="max-item-info" className="hint" style={{ marginTop: '8px', fontWeight: 600 }}>
          {maxValueItem && maxValueItem.value > 0
            ? `بیشترین ارزش: ${maxValueItem.name} (${maxValueItem.code}) با ارزش ${formatNumber(
                maxValueItem.value,
              )} ریال`
            : ''}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--primary-dark)' }}>
            افزودن کالای جدید به انبار
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">نام کالا *</label>
            <input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="مثال: پیچ M8، کابل شبکه، مانیتور..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="code">کد کالا / SKU *</label>
            <input
              id="code"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              required
              placeholder="مثال: IT-001، WH-202، SKU-8899"
            />
          </div>

          <div className="form-group">
            <label htmlFor="quantity">تعداد *</label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min="0"
              value={formData.quantity}
              onChange={handleInputChange}
              required
              placeholder="مثال: 10"
            />
          </div>

          <div className="form-group">
            <label htmlFor="price">قیمت واحد (ریال)</label>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="مثال: 150000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">محل نگهداری</label>
            <input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="مثال: قفسه A3، انبار پایین"
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">دسته‌بندی</label>
            <select id="category" name="category" value={formData.category} onChange={handleInputChange}>
              <option value="">(انتخاب نشده)</option>
              <option value="مصرفی">مصرفی</option>
              <option value="تجهیزات">تجهیزات</option>
              <option value="لوازم یدکی">لوازم یدکی</option>
              <option value="سایر">سایر</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="description">توضیحات</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="توضیحات اضافی مثل وضعیت، برند، سریال و ..."
            />
          </div>

          <div className="form-actions">
            <button type="submit" className={`btn btn-primary ${editingId ? 'btn-edit-mode' : ''}`}>
              {editingId ? 'ذخیره تغییرات' : 'افزودن به انبار'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button id="clear-all" type="button" onClick={handleClear} className="btn btn-outline btn-sm">
                حذف همهٔ اطلاعات
              </button>
              <span className="hint">داده‌ها فقط در مرورگر این سیستم ذخیره می‌شوند (LocalStorage).</span>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--primary-dark)' }}>لیست کالاهای ثبت‌شده</h2>
        </div>

        <div className="table-toolbar">
          <div className="search-box">
            <input
              id="search-input"
              type="text"
              placeholder="جستجو بر اساس نام، کد یا محل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>
          <span className="hint">با جستجو، جدول به‌صورت لحظه‌ای فیلتر می‌شود.</span>
        </div>

        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th className="sortable" onClick={() => handleSort('name')}>
                  نام کالا
                </th>
                <th className="sortable" onClick={() => handleSort('code')}>
                  کد
                </th>
                <th className="sortable" onClick={() => handleSort('quantity')}>
                  تعداد
                </th>
                <th className="sortable" onClick={() => handleSort('price')}>
                  قیمت واحد
                </th>
                <th className="sortable" onClick={() => handleSort('value')}>
                  ارزش کل
                </th>
                <th className="sortable" onClick={() => handleSort('location')}>
                  محل
                </th>
                <th className="sortable" onClick={() => handleSort('category')}>
                  دسته
                </th>
                <th>توضیحات</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item, index) => {
                const qtyNum = parseFloat(item.quantity || 0);
                const priceNum = parseFloat(item.price || 0);
                const lineValue = Number.isNaN(qtyNum) || Number.isNaN(priceNum) ? 0 : qtyNum * priceNum;

                return (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>{item.name}</td>
                    <td>{item.code}</td>
                    <td>{item.quantity}</td>
                    <td>{item.price ? formatNumber(item.price) : '—'}</td>
                    <td>{lineValue ? formatNumber(lineValue) : '—'}</td>
                    <td>{item.location || '—'}</td>
                    <td>{item.category ? <span className="tag">{item.category}</span> : '—'}</td>
                    <td>{item.description || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button type="button" className="btn btn-outline btn-sm btn-edit" onClick={() => handleEdit(item)}>
                          ویرایش
                        </button>
                        <button type="button" className="btn btn-danger btn-sm btn-delete" onClick={() => handleDelete(item.id)}>
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sortedItems.length === 0 && (
            <div id="empty-state" className="empty-state">
              هنوز کالایی ثبت نشده است. از فرم بالا برای افزودن اولین ردیف استفاده کنید.
            </div>
          )}

          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <h2 style={{ margin: 0, fontSize: '18px' }}>خروجی و ورودی انبار</h2>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button id="export-csv" className="btn btn-outline" type="button" onClick={handleExportCSV}>
                خروجی CSV
              </button>
              <button id="export-json" className="btn btn-outline" type="button" onClick={handleExportJSON}>
                خروجی JSON
              </button>

              <input
                type="file"
                id="import-file"
                accept="application/json"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleImport}
              />
              <button
                id="import-json"
                className="btn btn-primary"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                Import JSON
              </button>
              <button id="print-report" className="btn btn-outline" type="button" onClick={handlePrint}>
                چاپ گزارش
              </button>
            </div>

            <span className="hint" style={{ marginTop: '10px', display: 'block' }}>
              خروجی‌ها شامل تمام اطلاعات انبار هستند. ورودی JSON فقط فایل‌های ساخت همین سیستم را قبول می‌کند.
            </span>
          </div>

          <div id="total-value" className="hint" style={{ marginTop: '8px', textAlign: 'left', fontWeight: 600, color: '#115293' }}>
            ارزش کل انبار: {formatNumber(totalValue)} ریال
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
