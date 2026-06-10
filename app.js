// ------------------------------------------------------------
// Reseller Finance Dashboard (Clean Rebuild)
// - CSV upload (5-column structure)
// - LocalStorage persistence
// - Profit calculations
// - Manual add sale
// ------------------------------------------------------------

const STORAGE_KEY = "reseller_finance_sales_v2";
let sales = [];

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function loadSalesFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    sales = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(sales)) sales = [];
  } catch (e) {
    console.error("Failed to load storage", e);
    sales = [];
  }
}

function saveSalesToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
  } catch (e) {
    console.error("Failed to save storage", e);
  }
}

function formatCurrency(value) {
  const num = Number(value) || 0;
  return `$${num.toFixed(2)}`;
}

function cleanNumber(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[^0-9.-]+/g, "")) || 0;
}

// ------------------------------------------------------------
// CSV Parsing (New 5-Column Structure)
// ------------------------------------------------------------
// A: Title
// B: Quantity Sold
// C: Total Sales (includes taxes + shipping)
// D: Total Selling Costs
// E: COGS (default 0)

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length < 2) return [];

  const rows = lines.map(line => {
    // simple split is fine because your CSV has no quoted commas
    return line.split(",").map(col => col.trim());
  });

  // Remove header
  rows.shift();

  const parsed = [];

  for (const cols of rows) {
    if (cols.length < 4) continue;

    const title = cols[0] || "Untitled";
    const qty = Number(cols[1]) || 1;

    const totalSales = cleanNumber(cols[2]);
    const sellingCosts = cleanNumber(cols[3]);

    // Column E = COGS (default 0)
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

  sales.forEach((item) => {
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

  sales.forEach((item) => {
    totalRevenue += item.totalSales || 0;
    totalCogs += item.cogs || 0;
    totalProfit += item.profit || 0;
  });

  const avgSalePrice =
    sales.length > 0 ? totalRevenue / sales.length : 0;

  document.getElementById("totalRevenue").textContent =
    formatCurrency(totalRevenue);
  document.getElementById("totalCogs").textContent =
    formatCurrency(totalCogs);
  document.getElementById("totalProfit").textContent =
    formatCurrency(totalProfit);
  document.getElementById("sellThroughRate").textContent =
    "N/A"; // not used in this version
  document.getElementById("avgSalePrice").textContent =
    formatCurrency(avgSalePrice);
}

function renderAll() {
  renderSalesTable();
  renderSummary();
}

// ------------------------------------------------------------
// Event Handlers
// ------------------------------------------------------------

function handleLoadCsv() {
  const fileInput = document.getElementById("csvFileInput");
  const status = document.getElementById("uploadStatus");

  status.textContent = "";

  const file = fileInput.files?.[0];
  if (!file) {
    status.textContent = "No file selected.";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result
