// ------------------------------------------------------------
// Reseller Finance Dashboard (Header-based, COGS editable)
// ------------------------------------------------------------

const STORAGE_KEY = "reseller_finance_sales_v5";
let sales = [];

// ---------------- Helpers ----------------

function loadSalesFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    sales = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(sales)) sales = [];
  } catch {
    sales = [];
  }
}

function saveSalesToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
}

function formatCurrency(value) {
  return `$${(Number(value) || 0).toFixed(2)}`;
}

function cleanNumber(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[^0-9.-]+/g, "")) || 0;
}

function recalcProfit(item) {
  item.profit =
    (item.totalSales || 0) -
    (item.sellingCosts || 0) -
    (item.cogs || 0);
}

// ---------------- CSV Parsing ----------------

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length < 2) return [];

  const rows = lines.map(line => line.split(",").map(col => col.trim()));

  const header = rows[0].map(h => h.toLowerCase());
  rows.shift();

  const idxTitle = header.indexOf("listing title");
  const idxQty = header.indexOf("quantity sold");
  const idxTotalSales = header.indexOf("total sales (includes taxes)");
  const idxSellingCosts = header.indexOf("total selling costs");
  const idxCogs = header.indexOf("cogs");

  const parsed = [];

  for (const cols of rows) {
    if (!cols.length || !cols[idxTitle]) continue;

    const title = cols[idxTitle];
    const qty = idxQty !== -1 ? Number(cols[idxQty]) || 0 : 0;

    const totalSales =
      idxTotalSales !== -1 ? cleanNumber(cols[idxTotalSales]) : 0;

    const sellingCosts =
      idxSellingCosts !== -1 ? cleanNumber(cols[idxSellingCosts]) : 0;

    const cogs =
      idxCogs !== -1 && cols[idxCogs]
        ? cleanNumber(cols[idxCogs])
        : 0;

    const item = { title, qty, totalSales, sellingCosts, cogs, profit: 0 };
    recalcProfit(item);

    parsed.push(item);
  }

  return parsed;
}

// ---------------- Rendering ----------------

function renderSalesTable() {
  const tbody = document.getElementById("salesTableBody");
  tbody.innerHTML = "";

  sales.forEach((item, index) => {
    const tr = document.createElement("tr");

    const tdTitle = document.createElement("td");
    tdTitle.textContent = item.title;

    const tdQty = document.createElement("td");
    tdQty.textContent = item.qty;

    const tdTotalSales = document.createElement("td");
    tdTotalSales.textContent = formatCurrency(item.totalSales);

    const tdSellingCosts = document.createElement("td");
    tdSellingCosts.textContent = formatCurrency(item.sellingCosts);

    const tdProfit = document.createElement("td");
    tdProfit.textContent = formatCurrency(item.profit);

    const tdCogs = document.createElement("td");
    const cogsInput = document.createElement("input");
    cogsInput.type = "number";
    cogsInput.step = "0.01";
    cogsInput.value = item.cogs || 0;

    cogsInput.addEventListener("change", () => {
      item.cogs = Number(cogsInput.value) || 0;
      recalcProfit(item);
      saveSalesToStorage();
      tdProfit.textContent = formatCurrency(item.profit);
      renderSummary();
    });

    tdCogs.appendChild(cogsInput);

    tr.appendChild(tdTitle);
    tr.appendChild(tdQty);
    tr.appendChild(tdTotalSales);
    tr.appendChild(tdSellingCosts);
    tr.appendChild(tdCogs);
    tr.appendChild(tdProfit);

    tbody.appendChild(tr);
  });
}

function renderSummary() {
  let totalRevenue = 0;
  let totalCogs = 0;
  let totalProfit = 0;

  sales.forEach(item => {
    totalRevenue += item.totalSales || 0;
    totalCogs += item.cogs || 0;
    totalProfit += item.profit || 0;
  });

  const avgSalePrice = sales.length ? totalRevenue / sales.length : 0;

  document.getElementById("totalRevenue").textContent = formatCurrency(totalRevenue);
  document.getElementById("totalCogs").textContent = formatCurrency(totalCogs);
  document.getElementById("totalProfit").textContent = formatCurrency(totalProfit);
  document.getElementById("sellThroughRate").textContent = "N/A";
  document.getElementById("avgSalePrice").textContent = formatCurrency(avgSalePrice);
}

function renderAll() {
  renderSalesTable();
  renderSummary();
}

// ---------------- Event Handlers ----------------

function handleLoadCsv() {
  const file = document.getElementById("csvFileInput").files?.[0];
  const status = document.getElementById("uploadStatus");

  if (!file) {
    status.textContent = "No file selected.";
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const parsed = parseCsv(e.target.result);

    if (!parsed.length) {
      status.textContent = "CSV parsed but no valid rows found.";
      return;
    }

    sales = sales.concat(parsed);
    saveSalesToStorage();
    renderAll();

    status.textContent = `Loaded ${parsed.length} rows.`;
  };

  reader.readAsText(file);
}

function handleAddSale() {
  const title = document.getElementById("manualTitle").value.trim() || "Manual Sale";
  const totalSales = Number(document.getElementById("manualSale").value) || 0;
  const sellingCosts = Number(document.getElementById("manualCosts").value) || 0;
  const cogs = Number(document.getElementById("manualCogs").value) || 0;

  const item = { title, qty: 1, totalSales, sellingCosts, cogs, profit: 0 };
  recalcProfit(item);

  sales.push(item);
  saveSalesToStorage();
  renderAll();

  document.getElementById("manualStatus").textContent = "Manual sale added.";
}

function handleClearData() {
  if (!confirm("Clear all saved sales data?")) return;

  sales = [];
  saveSalesToStorage();
  renderAll();

  document.getElementById("clearStatus").textContent = "All data cleared.";
}

// ---------------- Init ----------------

document.addEventListener("DOMContentLoaded", () => {
  loadSalesFromStorage();
  renderAll();

  document.getElementById("loadCsvBtn").addEventListener("click", handleLoadCsv);
  document.getElementById("addSaleBtn").addEventListener("click", handleAddSale);
  document.getElementById("clearDataBtn").addEventListener("click", handleClearData);
});
