// ------------------------------
// LOCAL STORAGE DATA MODEL
// ------------------------------
const STORAGE_KEYS = {
  sales: "rf_sales",
  purchases: "rf_purchases",
  settings: "rf_settings",
  months: "rf_months"
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ------------------------------
// HELPERS
// ------------------------------
function toNum(v) {
  return Number(String(v || "0").replace(/[^0-9.-]/g, ""));
}

function formatCurrency(n) {
  return `$${(n || 0).toFixed(2)}`;
}

function getCurrentMonthId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// ------------------------------
// INITIAL DATA LOAD
// ------------------------------
let sales = loadJSON(STORAGE_KEYS.sales, []);          // array of sale objects
let purchases = loadJSON(STORAGE_KEYS.purchases, []);  // array of purchase objects
let settings = loadJSON(STORAGE_KEYS.settings, {
  salaryGoal: 0
});
let months = loadJSON(STORAGE_KEYS.months, {});        // { "YYYY-MM": { ... } }

// ------------------------------
// MONTH LOGIC
// ------------------------------
function ensureMonthExists(monthId) {
  if (!months[monthId]) {
    const now = new Date();
    const [year, monthStr] = monthId.split("-");
    const yearNum = Number(year);
    const monthNum = Number(monthStr);

    const grace = new Date(yearNum, monthNum, 1, 23, 59, 59);

    months[monthId] = {
      profit: 0,
      salaryPaid: 0,
      inventoryBudget: 0,
      inventorySpent: 0,
      businessSavings: 0,
      isLocked: false,
      gracePeriodEnds: grace.toISOString()
    };
    saveJSON(STORAGE_KEYS.months, months);
  }
}

function getCurrentMonth() {
  const id = getCurrentMonthId();
  document.getElementById("currentMonthName").textContent = id;
  ensureMonthExists(id);
  return { id, data: months[id] };
}

// ------------------------------
// SALES CALCULATIONS
// ------------------------------
function computeSaleProfit(sale) {
  const totalSales = toNum(sale.totalSales);
  const totalCosts = toNum(sale.totalCosts);
  const cogs = toNum(sale.cogs);
  return totalSales - totalCosts - cogs;
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

  const avgSalePrice = totalQty > 0 ? totalRevenue / totalQty : 0;
  const sellThroughRate = totalQty > 0 ? "100%" : "N/A"; // local-only, no inventory base

  document.getElementById("totalRevenue").textContent = formatCurrency(totalRevenue);
  document.getElementById("totalCogs").textContent = formatCurrency(totalCogs);
  document.getElementById("totalProfit").textContent = formatCurrency(totalProfit);
  document.getElementById("avgSalePrice").textContent = formatCurrency(avgSalePrice);
  document.getElementById("sellThroughRate").textContent = sellThroughRate;

  // Update current month profit from all sales in this month
  const { id, data } = getCurrentMonth();
  const monthSales = sales.filter(s => s.monthId === id);
  let monthProfit = 0;
  monthSales.forEach(s => {
    monthProfit += computeSaleProfit(s);
  });

  data.profit = monthProfit;

  // 75/25 split after salary
  const salaryPaid = data.salaryPaid || 0;
  const remainingProfit = monthProfit - salaryPaid;
  const inventoryBudget = remainingProfit * 0.75;
  const businessSavings = remainingProfit * 0.25;

  data.inventoryBudget = inventoryBudget;
  data.businessSavings = businessSavings;

  saveJSON(STORAGE_KEYS.months, months);

  document.getElementById("monthProfit").textContent = formatCurrency(monthProfit);
  document.getElementById("salaryPaid").textContent = formatCurrency(salaryPaid);
  document.getElementById("remainingProfit").textContent = formatCurrency(remainingProfit);
  document.getElementById("inventoryBudget").textContent = formatCurrency(inventoryBudget);
  document.getElementById("inventorySpent").textContent = formatCurrency(data.inventorySpent || 0);
  document.getElementById("inventoryRemaining").textContent =
    formatCurrency((data.inventoryBudget || 0) - (data.inventorySpent || 0));
  document.getElementById("businessSavings").textContent = formatCurrency(data.businessSavings || 0);

  renderMonthArchive();
}

// ------------------------------
// RENDER SALES TABLE
// ------------------------------
function renderSalesTable() {
  const tbody = document.getElementById("salesTableBody");
  tbody.innerHTML = "";

  sales.forEach((sale, index) => {
    const tr = document.createElement("tr");

    const profit = computeSaleProfit(sale);

    tr.innerHTML = `
      <td>${sale.title || ""}</td>
      <td>${sale.qty || 1}</td>
      <td>${formatCurrency(toNum(sale.totalSales))}</td>
      <td>${formatCurrency(toNum(sale.totalCosts))}</td>
      <td>
        <input type="number" step="0.01" value="${toNum(sale.cogs).toFixed(2)}" data-index="${index}" class="cogs-input" />
      </td>
      <td>${formatCurrency(profit)}</td>
    `;

    tbody.appendChild(tr);
  });

  // Attach COGS change handlers
  tbody.querySelectorAll(".cogs-input").forEach(input => {
    input.addEventListener("change", e => {
      const idx = Number(e.target.dataset.index);
      const val = toNum(e.target.value);
      sales[idx].cogs = val;
      saveJSON(STORAGE_KEYS.sales, sales);
      recomputeGlobalSummary();
      renderSalesTable();
    });
  });
}

// ------------------------------
// RENDER PURCHASE TABLE
// ------------------------------
function renderPurchaseTable() {
  const tbody = document.getElementById("purchaseTableBody");
  tbody.innerHTML = "";

  const { id, data } = getCurrentMonth();

  const monthPurchases = purchases.filter(p => p.monthId === id);

  monthPurchases.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.desc || ""}</td>
      <td>${formatCurrency(toNum(p.amount))}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("inventorySpent").textContent =
    formatCurrency(data.inventorySpent || 0);
  document.getElementById("inventoryRemaining").textContent =
    formatCurrency((data.inventoryBudget || 0) - (data.inventorySpent || 0));
}

// ------------------------------
// MONTH ARCHIVE RENDER
// ------------------------------
function renderMonthArchive() {
  const tbody = document.getElementById("monthArchiveBody");
  tbody.innerHTML = "";

  const monthIds = Object.keys(months).sort(); // chronological

  monthIds.forEach(id => {
    const m = months[id];
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${id}</td>
      <td>${formatCurrency(m.profit || 0)}</td>
      <td>${formatCurrency(m.salaryPaid || 0)}</td>
      <td>${formatCurrency(m.inventoryBudget || 0)}</td>
      <td>${formatCurrency(m.inventorySpent || 0)}</td>
      <td>${formatCurrency(m.businessSavings || 0)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ------------------------------
// SETTINGS (SALARY GOAL)
// ------------------------------
function initSettingsUI() {
  document.getElementById("salaryGoalInput").value =
    settings.salaryGoal ? settings.salaryGoal : "";

  document.getElementById("updateSalaryGoalBtn").addEventListener("click", () => {
    const val = toNum(document.getElementById("salaryGoalInput").value);
    settings.salaryGoal = val;
    saveJSON(STORAGE_KEYS.settings, settings);

    const { id, data } = getCurrentMonth();
    // When salary goal is updated, we don't auto-pay salary.
    // You can later add a "Pay Salary" button if you want.
    document.getElementById("monthStatus").textContent =
      `Salary goal updated to ${formatCurrency(val)}.`;
    setTimeout(() => {
      document.getElementById("monthStatus").textContent = "";
    }, 2500);

    recomputeGlobalSummary();
  });
}

// ------------------------------
// CSV IMPORT
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
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
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


function initCsvImport() {
  const fileInput = document.getElementById("csvFileInput");
  const loadBtn = document.getElementById("loadCsvBtn");
  const statusEl = document.getElementById("uploadStatus");

  loadBtn.addEventListener("click", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      statusEl.textContent = "No file selected.";
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      const rows = parseCsv(text);

      if (rows.length === 0) {
        statusEl.textContent = "No valid rows found in CSV.";
        return;
      }

      sales = sales.concat(rows);
      saveJSON(STORAGE_KEYS.sales, sales);

      statusEl.textContent = `Loaded ${rows.length} sales from CSV.`;
      setTimeout(() => (statusEl.textContent = ""), 2500);

      recomputeGlobalSummary();
      renderSalesTable();
    };
    reader.readAsText(file);
  });
}

// ------------------------------
// MANUAL SALE ENTRY
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
// PURCHASE ENTRY
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

    purchases.push({
      desc,
      amount,
      monthId: id
    });

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
// CLEAR ALL SALES DATA
// ------------------------------
function initClearData() {
  const btn = document.getElementById("clearDataBtn");
  const statusEl = document.getElementById("clearStatus");

  btn.addEventListener("click", () => {
    if (!confirm("Clear ALL sales data? This cannot be undone.")) return;

    sales = [];
    saveJSON(STORAGE_KEYS.sales, sales);

    statusEl.textContent = "All sales data cleared.";
    setTimeout(() => (statusEl.textContent = ""), 2500);

    recomputeGlobalSummary();
    renderSalesTable();
  });
}

// ------------------------------
// CLOSE MONTH & CREATE NEXT
// ------------------------------
function initCloseMonth() {
  const btn = document.getElementById("closeMonthBtn");
  const statusEl = document.getElementById("monthStatus");

  btn.addEventListener("click", () => {
    const { id, data } = getCurrentMonth();

    if (data.isLocked) {
      statusEl.textContent = "This month is already closed.";
      setTimeout(() => (statusEl.textContent = ""), 2500);
      return;
    }

    data.isLocked = true;
    saveJSON(STORAGE_KEYS.months, months);

    statusEl.textContent = `Month ${id} closed. New month created.`;
    setTimeout(() => (statusEl.textContent = ""), 2500);

    // Create next month
    const [yearStr, monthStr] = id.split("-");
    let year = Number(yearStr);
    let month = Number(monthStr);

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }

    const nextId = `${year}-${String(month).padStart(2, "0")}`;
    ensureMonthExists(nextId);

    // Switch UI to new month
    document.getElementById("currentMonthName").textContent = nextId;

    // Recompute summary for new month
    recomputeGlobalSummary();
    renderPurchaseTable();

    // Scroll to Month Archive section
    const archiveSection = document.getElementById("monthArchiveSection");
    if (archiveSection) {
      archiveSection.scrollIntoView({ behavior: "smooth" });
    }
  });
}

// ------------------------------
// INIT
// ------------------------------
function init() {
  // Ensure current month exists
  getCurrentMonth();

  // Init UI pieces
  initSettingsUI();
  initCsvImport();
  initManualSaleEntry();
  initPurchases();
  initClearData();
  initCloseMonth();

  // Initial renders
  recomputeGlobalSummary();
  renderSalesTable();
  renderPurchaseTable();
  renderMonthArchive();
}

document.addEventListener("DOMContentLoaded", init);
