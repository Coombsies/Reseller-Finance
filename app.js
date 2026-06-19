// ------------------------------
// LOCAL STORAGE KEYS
// ------------------------------
const STORAGE_KEYS = {
  sales: "rf_sales",
  purchases: "rf_purchases",
  settings: "rf_settings",
  months: "rf_months"
};

// ------------------------------
// HELPERS
// ------------------------------
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function toNum(v) {
  return Number(String(v || "0").replace(/[^0-9.-]/g, ""));
}

function formatCurrency(n) {
  return `$${(n || 0).toFixed(2)}`;
}

function getCurrentMonthId() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ------------------------------
// LOAD DATA
// ------------------------------
let sales = loadJSON(STORAGE_KEYS.sales, []);
let purchases = loadJSON(STORAGE_KEYS.purchases, []);
let settings = loadJSON(STORAGE_KEYS.settings, { salaryGoal: 0 });
let months = loadJSON(STORAGE_KEYS.months, {});

// ------------------------------
// MONTH LOGIC
// ------------------------------
function ensureMonthExists(monthId) {
  if (!months[monthId]) {
    months[monthId] = {
      profit: 0,
      salaryPaid: 0,
      inventoryBudget: 0,
      inventorySpent: 0,
      businessSavings: 0,
      salaryPayments: [],
      isLocked: false
    };
    saveJSON(STORAGE_KEYS.months, months);
  }
}

function getCurrentMonth() {
  const id = getCurrentMonthId();
  ensureMonthExists(id);
  document.getElementById("currentMonthName").textContent = id;
  return { id, data: months[id] };
}

// ------------------------------
// CSV PARSER (SAFE FOR COMMAS)
// ------------------------------
function parseCsv(text) {
  const rows = [];
  let current = "";
  let insideQuotes = false;
  let row = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (current.length > 0 || row.length > 0) {
        row.push(current);
        rows.push(row);
        row = [];
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  const header = rows.shift().map(h => h.trim().toLowerCase());

  const idxTitle = header.findIndex(h => h.includes("listing title"));
  const idxQty = header.findIndex(h => h.includes("quantity sold"));
  const idxTotalSales = header.findIndex(h => h.includes("total sales"));
  const idxTotalCosts = header.findIndex(h => h.includes("total selling costs"));
  const idxCogs = header.findIndex(h => h.includes("cogs"));

  const parsed = [];

  rows.forEach(cols => {
    if (!cols || cols.length < 3) return;

    parsed.push({
      title: idxTitle >= 0 ? cols[idxTitle] : "",
      qty: idxQty >= 0 ? Number(cols[idxQty] || 1) : 1,
      totalSales: idxTotalSales >= 0 ? cols[idxTotalSales] : "0",
      totalCosts: idxTotalCosts >= 0 ? cols[idxTotalCosts] : "0",
      cogs: idxCogs >= 0 ? cols[idxCogs] : "0",
      monthId: getCurrentMonthId()
    });
  });

  return parsed;
}

// ------------------------------
// GLOBAL SUMMARY
// ------------------------------
function computeSaleProfit(sale) {
  return toNum(sale.totalSales) - toNum(sale.totalCosts) - toNum(sale.cogs);
}

function recomputeGlobalSummary() {
  let totalRevenue = 0;
  let totalCogs = 0;
  let totalProfit = 0;
  let totalQty = 0;

  sales.forEach(sale => {
    const qty = Number(sale.qty || 1);
    const revenue = toNum(sale.totalSales);
    const cogs = toNum(sale.cogs);
    const costs = toNum(sale.totalCosts);
    const profit = revenue - costs - cogs;

    totalRevenue += revenue;
    totalCogs += cogs;
    totalProfit += profit;
    totalQty += qty;
  });

  document.getElementById("totalRevenue").textContent = formatCurrency(totalRevenue);
  document.getElementById("totalCogs").textContent = formatCurrency(totalCogs);
  document.getElementById("totalProfit").textContent = formatCurrency(totalProfit);
  document.getElementById("avgSalePrice").textContent =
    totalQty > 0 ? formatCurrency(totalRevenue / totalQty) : "$0.00";
  document.getElementById("sellThroughRate").textContent =
    totalQty > 0 ? "100%" : "N/A";

  const { id, data } = getCurrentMonth();
  const monthSales = sales.filter(s => s.monthId === id);

  let monthProfit = 0;
  monthSales.forEach(s => (monthProfit += computeSaleProfit(s)));

  data.profit = monthProfit;

  const salaryPaid = data.salaryPaid || 0;
  const remainingProfit = monthProfit - salaryPaid;

  data.inventoryBudget = remainingProfit * 0.75;
  data.businessSavings = remainingProfit * 0.25;

  saveJSON(STORAGE_KEYS.months, months);

  document.getElementById("monthProfit").textContent = formatCurrency(monthProfit);
  document.getElementById("salaryPaid").textContent = formatCurrency(salaryPaid);
  document.getElementById("remainingProfit").textContent = formatCurrency(remainingProfit);
  document.getElementById("inventoryBudget").textContent = formatCurrency(data.inventoryBudget);
  document.getElementById("inventorySpent").textContent = formatCurrency(data.inventorySpent || 0);
  document.getElementById("inventoryRemaining").textContent =
    formatCurrency((data.inventoryBudget || 0) - (data.inventorySpent || 0));
  document.getElementById("businessSavings").textContent = formatCurrency(data.businessSavings);

  updateSalaryProgressBar();
  renderMonthArchive();
}

// ------------------------------
// DELETE FUNCTIONS
// ------------------------------
function deleteSale(index) {
  sales.splice(index, 1);
  saveJSON(STORAGE_KEYS.sales, sales);
  recomputeGlobalSummary();
  renderSalesTable();
}

function deletePurchase(index) {
  purchases.splice(index, 1);
  saveJSON(STORAGE_KEYS.purchases, purchases);
  recomputeGlobalSummary();
  renderPurchaseTable();
}

function deleteSalaryPayment(index) {
  const { data } = getCurrentMonth();
  data.salaryPayments.splice(index, 1);
  saveJSON(STORAGE_KEYS.months, months);
  renderSalaryPayments();
  recomputeGlobalSummary();
}
// ------------------------------
// RENDER TABLES (continued)
// ------------------------------
function renderSalesTable() {
  const tbody = document.getElementById("salesTableBody");
  tbody.innerHTML = "";

  sales.forEach((sale, index) => {
    const tr = document.createElement("tr");
    const profit = computeSaleProfit(sale);

    tr.innerHTML = `
      <td>${sale.title}</td>
      <td>${sale.qty}</td>
      <td>${formatCurrency(toNum(sale.totalSales))}</td>
      <td>${formatCurrency(toNum(sale.totalCosts))}</td>
      <td><input type="number" step="0.01" value="${toNum(sale.cogs).toFixed(2)}" data-index="${index}" class="cogs-input" /></td>
      <td>${formatCurrency(profit)}</td>
      <td><button class="delete-btn" data-index="${index}">Delete</button></td>
    `;

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".cogs-input").forEach(input => {
    input.addEventListener("change", e => {
      const idx = Number(e.target.dataset.index);
      sales[idx].cogs = toNum(e.target.value);
      saveJSON(STORAGE_KEYS.sales, sales);
      recomputeGlobalSummary();
      renderSalesTable();
    });
  });

  tbody.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", e => deleteSale(Number(e.target.dataset.index)));
  });
}

function renderPurchaseTable() {
  const tbody = document.getElementById("purchaseTableBody");
  tbody.innerHTML = "";

  const { id } = getCurrentMonth();
  const monthPurchases = purchases.filter(p => p.monthId === id);

  monthPurchases.forEach((p, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.desc}</td>
      <td>${formatCurrency(toNum(p.amount))}</td>
      <td><button class="delete-btn" data-index="${index}">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", e => deletePurchase(Number(e.target.dataset.index)));
  });
}

function renderMonthArchive() {
  const tbody = document.getElementById("monthArchiveBody");
  tbody.innerHTML = "";

  Object.keys(months)
    .sort()
    .forEach(id => {
      const m = months[id];
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${id}</td>
        <td>${formatCurrency(m.profit)}</td>
        <td>${formatCurrency(m.salaryPaid)}</td>
        <td>${formatCurrency(m.inventoryBudget)}</td>
        <td>${formatCurrency(m.inventorySpent)}</td>
        <td>${formatCurrency(m.businessSavings)}</td>
      `;
      tbody.appendChild(tr);
    });
}

function renderSalaryPayments() {
  const { data } = getCurrentMonth();
  const tbody = document.getElementById("salaryPaymentsBody");
  tbody.innerHTML = "";

  (data.salaryPayments || []).forEach((p, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.date}</td>
      <td>${formatCurrency(p.amount)}</td>
      <td><button class="delete-btn" data-index="${index}">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", e => deleteSalaryPayment(Number(e.target.dataset.index)));
  });
}

// ------------------------------
// SALARY SYSTEM
// ------------------------------
function initSalaryPayments() {
  const payInput = document.getElementById("salaryPayInput");
  const payBtn = document.getElementById("paySalaryBtn");
  const payFullBtn = document.getElementById("payFullSalaryBtn");
  const statusEl = document.getElementById("salaryStatus");

  payBtn.addEventListener("click", () => {
    const amount = toNum(payInput.value);
    if (amount <= 0) {
      statusEl.textContent = "Enter a valid salary amount.";
      return;
    }

    const { data } = getCurrentMonth();
    data.salaryPaid = (data.salaryPaid || 0) + amount;

    data.salaryPayments.push({
      date: new Date().toISOString().split("T")[0],
      amount
    });

    saveJSON(STORAGE_KEYS.months, months);

    statusEl.textContent = `Paid ${formatCurrency(amount)} salary.`;
    setTimeout(() => (statusEl.textContent = ""), 2500);

    payInput.value = "";

    recomputeGlobalSummary();
    renderSalaryPayments();
  });

  payFullBtn.addEventListener("click", () => {
    const goal = settings.salaryGoal || 0;
    const { data } = getCurrentMonth();

    const remaining = goal - (data.salaryPaid || 0);
    if (remaining <= 0) {
      statusEl.textContent = "Salary goal already met.";
      return;
    }

    data.salaryPaid += remaining;

    data.salaryPayments.push({
      date: new Date().toISOString().split("T")[0],
      amount: remaining
    });

    saveJSON(STORAGE_KEYS.months, months);

    statusEl.textContent = `Paid full salary goal (${formatCurrency(remaining)}).`;
    setTimeout(() => (statusEl.textContent = ""), 2500);

    recomputeGlobalSummary();
    renderSalaryPayments();
  });
}

function updateSalaryProgressBar() {
  const { data } = getCurrentMonth();
  const goal = settings.salaryGoal || 0;
  const paid = data.salaryPaid || 0;

  const pct = goal > 0 ? Math.min((paid / goal) * 100, 100) : 0;
  document.getElementById("salaryProgressBar").style.width = pct + "%";
}

// ------------------------------
// PURCHASES
// ------------------------------
function initPurchases() {
  const descEl = document.getElementById("purchaseDesc");
  const amountEl = document.getElementById("purchaseAmount");
  const btn = document.getElementById("addPurchaseBtn");
  const statusEl = document.getElementById("purchaseStatus");

  btn.addEventListener("click", () => {
    const desc = descEl.value.trim();
    const amount = toNum(amountEl.value);

    if (!desc || amount <= 0) {
      statusEl.textContent = "Enter a description and amount.";
      return;
    }

    const { id, data } = getCurrentMonth();

    purchases.push({ desc, amount, monthId: id });
    data.inventorySpent = (data.inventorySpent || 0) + amount;

    saveJSON(STORAGE_KEYS.purchases, purchases);
    saveJSON(STORAGE_KEYS.months, months);

    statusEl.textContent = "Purchase added.";
    setTimeout(() => (statusEl.textContent = ""), 2500);

    descEl.value = "";
    amountEl.value = "";

    renderPurchaseTable();
    recomputeGlobalSummary();
  });
}

// ------------------------------
// MANUAL SALES
// ------------------------------
function initManualSaleEntry() {
  const titleEl = document.getElementById("manualTitle");
  const saleEl = document.getElementById("manualSale");
  const costsEl = document.getElementById("manualCosts");
  const cogsEl = document.getElementById("manualCogs");
  const btn = document.getElementById("addSaleBtn");
  const statusEl = document.getElementById("manualStatus");

  btn.addEventListener("click", () => {
    const title = titleEl.value.trim();
    const totalSales = toNum(saleEl.value);
    const totalCosts = toNum(costsEl.value);
    const cogs = toNum(cogsEl.value);

    if (!title || totalSales <= 0) {
      statusEl.textContent = "Enter at least a title and total sales.";
      return;
    }

    sales.push({
      title,
      qty: 1,
      totalSales,
      totalCosts,
      cogs,
      monthId: getCurrentMonthId()
    });

    saveJSON(STORAGE_KEYS.sales, sales);

    statusEl.textContent = "Manual sale added.";
    setTimeout(() => (statusEl.textContent = ""), 2500);

    titleEl.value = "";
    saleEl.value = "";
    costsEl.value = "";
    cogsEl.value = "";

    recomputeGlobalSummary();
    renderSalesTable();
  });
}

// ------------------------------
// CSV IMPORT
// ------------------------------
function initCsvImport() {
  const fileInput = document.getElementById("csvFileInput");
  const loadBtn = document.getElementById("loadCsvBtn");
  const statusEl = document.getElementById("uploadStatus");

  loadBtn.addEventListener("click", () => {
    const file = fileInput.files?.[0];
    if (!file) {
      statusEl.textContent = "No file selected.";
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const rows = parseCsv(e.target.result);

      if (rows.length === 0) {
        statusEl.textContent = "No valid rows found.";
        return;
      }

      sales = sales.concat(rows);
      saveJSON(STORAGE_KEYS.sales, sales);

      statusEl.textContent = `Loaded ${rows.length} sales.`;
      setTimeout(() => (statusEl.textContent = ""), 2500);

      recomputeGlobalSummary();
      renderSalesTable();
    };

    reader.readAsText(file);
  });
}

// ------------------------------
// CLEAR SALES
// ------------------------------
function initClearData() {
  const btn = document.getElementById("clearDataBtn");
  const statusEl = document.getElementById("clearStatus");

  btn.addEventListener("click", () => {
    if (!confirm("Clear ALL sales data?")) return;

    sales = [];
    saveJSON(STORAGE_KEYS.sales, sales);

    statusEl.textContent = "All sales cleared.";
    setTimeout(() => (statusEl.textContent = ""), 2500);

    recomputeGlobalSummary();
    renderSalesTable();
  });
}

// ------------------------------
// CLOSE MONTH
// ------------------------------
function initCloseMonth() {
  const btn = document.getElementById("closeMonthBtn");
  const statusEl = document.getElementById("monthStatus");

  btn.addEventListener("click", () => {
    const { id, data } = getCurrentMonth();

    if (data.isLocked) {
      statusEl.textContent = "Month already closed.";
      return;
    }

    data.isLocked = true;
    saveJSON(STORAGE_KEYS.months, months);

    statusEl.textContent = `Month ${id} closed.`;
    setTimeout(() => (statusEl.textContent = ""), 2500);

    let [year, month] = id.split("-").map(Number);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }

    const nextId = `${year}-${String(month).padStart(2, "0")}`;
    ensureMonthExists(nextId);

    document.getElementById("currentMonthName").textContent = nextId;

    recomputeGlobalSummary();
    renderPurchaseTable();

    document
      .getElementById("monthArchiveSection")
      .scrollIntoView({ behavior: "smooth" });
  });
}

// ------------------------------
// INIT
// ------------------------------
function init() {
  getCurrentMonth();

  initCsvImport();
  initManualSaleEntry();
  initPurchases();
  initClearData();
  initCloseMonth();
  initSalaryPayments();

  recomputeGlobalSummary();
  renderSalesTable();
  renderPurchaseTable();
  renderMonthArchive();
  renderSalaryPayments();
}

document.addEventListener("DOMContentLoaded", init);
