// یک آرایه نمونه از کالاها
let inventory = [
  { name: "سیمان", count: 20, price: 150000 },
  { name: "میلگرد", count: 50, price: 230000 },
  { name: "پیچ", count: 200, price: 2000 }
];

function calcItemTotal(item) {
  return item.count * item.price;
}

function calcInventoryTotal(items) {
  let total = 0;
  for (const item of items) {
    total += calcItemTotal(item);
  }
  return total;
}

function renderInventoryTable() {
  const tbody = document.getElementById("inventory-body");
  tbody.innerHTML = ""; // خالی کردن قبلی

  for (const item of inventory) {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.textContent = item.name;

    const countTd = document.createElement("td");
    countTd.textContent = item.count;

    const priceTd = document.createElement("td");
    priceTd.textContent = item.price.toLocaleString("fa-IR");

    const totalTd = document.createElement("td");
    totalTd.textContent = calcItemTotal(item).toLocaleString("fa-IR");

    tr.appendChild(nameTd);
    tr.appendChild(countTd);
    tr.appendChild(priceTd);
    tr.appendChild(totalTd);

    tbody.appendChild(tr);
  }

  const totalDiv = document.getElementById("total-value");
  const total = calcInventoryTotal(inventory);
  totalDiv.textContent = "ارزش کل انبار: " + total.toLocaleString("fa-IR") + " ریال";
}document.addEventListener("DOMContentLoaded", () => {
  renderInventoryTable();

  const form = document.getElementById("add-item-form");
  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const nameInput = document.getElementById("item-name");
    const countInput = document.getElementById("item-count");
    const priceInput = document.getElementById("item-price");

    const name = nameInput.value.trim();
    const count = parseInt(countInput.value, 10);
    const price = parseInt(priceInput.value, 10);

    if (!name || isNaN(count) || isNaN(price)) {
      alert("ورودی‌ها درست نیست.");
      return;
    }

    inventory.push({ name, count, price });

    // خالی کردن فرم
    nameInput.value = "";
    countInput.value = "";
    priceInput.value = "";

    renderInventoryTable();
  });
});

// وقتی صفحه لود شد، جدول رو بساز
document.addEventListener("DOMContentLoaded", renderInventoryTable);
