// ------------------------------------------------------------
// Reseller Finance Dashboard (Final Rebuild)
// ------------------------------------------------------------

const STORAGE_KEY = "reseller_finance_sales_v3";
let sales = [];

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// CSV Parsing (Matches EXACT CSV Structure)
// ------------------------------------------------------------
// A: Title
// B: Quantity Sold
// C: Total Sales
// D: Selling Costs
// E: COGS
// F: Profit (calculated)

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length < 2) return [];

  const rows = lines.map(line => line.split(",").map(col => col.trim()));

  rows.shift(); // remove header

  const parsed = [];

  for (const cols of rows) {
    if (cols.length < 4) continue;

    const title = cols[0] || "Untitled";
    const qty = Number(cols[1]) || 0;

    const totalSales = cleanNumber(cols[2]);
    const sellingCosts = cleanNumber(cols[3]);
    const cogs = cols[4] ? cleanNumber(cols[4]) : 0;

    const profit = totalSales - sellingCosts - cogs;

    parsed.push({
      title,
      qty,
      totalSales,
      sellingCosts,
      cogs,
      profit
    });
  }

  return parsed;
}

// ------------------------------------------------------------
// Rendering
// ------------------------------------------------------------

function renderSalesTable() {
  const tbody = document.getElementById("salesTableBody");
  tbody.innerHTML = "";

  sales.forEach(item => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.title}</td>
      <td>${item.qty}</td>
      <td>${formatCurrency(item.totalSales)}</td>
      <td>${formatCurrency(item.sellingCosts)}</td>
      <td>${formatCurrency(item.cogs)}</td>
      <td>${formatCurrency(item.profit)}</td>
    `;

    tbody.appendChild(tr);
  });
}

function renderSummary() {
  let totalRevenue = 0;
  let totalCogs = 0;
  let totalProfit = 0;

  sales.forEach(item => {
    totalRevenue += item.totalSales;
    totalCogs += item.cogs;
    totalProfit += item.profit;
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

// ------------------------------------------------------------
// Event Handlers
// ------------------------------------------------------------

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

  const profit = totalSales - sellingCosts - cogs;

  sales.push({ title, qty: 1, totalSales, sellingCosts, cogs, profit });

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

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  loadSalesFromStorage();
  renderAll();

  document.getElementById("loadCsvBtn").addEventListener("click", handleLoadCsv);
  document.getElementById("addSaleBtn").addEventListener("click", handleAddSale);
  document.getElementById("clearDataBtn").addEventListener("click", handleClearData);
});
