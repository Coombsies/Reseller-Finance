// ------------------------------------------------------------
// Reseller Finance Dashboard with Monthly System
// ------------------------------------------------------------

const SALES_STORAGE_KEY = "reseller_finance_sales_v5";
const MONTH_STORAGE_KEY = "reseller_finance_month_v1";
const MONTH_ARCHIVE_KEY = "reseller_finance_month_archive_v1";

let sales = [];
let currentMonth = null;
let monthArchive = [];

// ---------------- Helpers ----------------

function loadSalesFromStorage() {
  try {
    const raw = localStorage.getItem(SALES_STORAGE_KEY);
    sales = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(sales)) sales = [];
  } catch {
    sales = [];
  }
}

function saveSalesToStorage() {
  localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales));
}

function loadMonthFromStorage() {
  try {
    const raw = localStorage.getItem(MONTH_STORAGE_KEY);
    currentMonth = raw ? JSON.parse(raw) : null;
  } catch {
    currentMonth = null;
  }

  if (!currentMonth) {
    const now = new Date();
    currentMonth = {
      id: `${now.getFullYear()}-${now.getMonth() + 1}`,
      name: now.toLocaleString("default", { month: "long", year: "numeric" }),
      salaryGoal: 4400,
      salaryPaid: 0,
      inventoryBudget: 0,
      inventorySpent: 0,
      businessSavings: 0,
      remainingProfit: 0,
      purchases: []
    };
    saveMonthToStorage();
  }

  try {
    const rawArchive = localStorage.getItem(MONTH_ARCHIVE_KEY);
    monthArchive = rawArchive ? JSON.parse(rawArchive) : [];
    if (!Array.isArray(monthArchive)) monthArchive = [];
  } catch {
    monthArchive = [];
  }
}

function saveMonthToStorage() {
  localStorage.setItem(MONTH_STORAGE_KEY, JSON.stringify(currentMonth));
}

function saveMonthArchive() {
  localStorage.setItem(MONTH_ARCHIVE_KEY, JSON.stringify(monthArchive));
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
    } else if (char === "," && !insideQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (current.length > 0 || row.length > 0) {
        row.push(current.trim());
        rows.push(row);
      }
      current = "";
      row = [];
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

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
    const qty = Number(cols[idxQty]) || 0;
    const totalSales = parseFloat((cols[idxTotalSales] || "").replace(/[^0-9.-]+/g, "")) || 0;
    const sellingCosts = parseFloat((cols[idxSellingCosts] || "").replace(/[^0-9.-]+/g, "")) || 0;
    const cogs = parseFloat((cols[idxCogs] || "").replace(/[^0-9.-]+/g, "")) || 0;

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


// ---------------- Sales Rendering ----------------

function renderSalesTable() {
  const tbody = document.getElementById("salesTableBody");
  tbody.innerHTML = "";

  sales.forEach((item) => {
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
      renderMonthSummary();
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

// ---------------- Monthly System ----------------

function computeMonthProfit() {
  let profit = 0;
  sales.forEach(item => {
    profit += item.profit || 0;
  });
  return profit;
}

function renderMonthSummary() {
  document.getElementById("currentMonthName").textContent = currentMonth.name;
  document.getElementById("salaryGoalInput").value = currentMonth.salaryGoal;

  const monthProfit = computeMonthProfit();
  currentMonth.remainingProfit = monthProfit - currentMonth.salaryPaid;

  const remainingAfterSalary = Math.max(currentMonth.remainingProfit, 0);
  const inventoryBudget = remainingAfterSalary * 0.75;
  const businessSavings = remainingAfterSalary * 0.25;

  currentMonth.inventoryBudget = inventoryBudget;
  currentMonth.businessSavings = businessSavings;

  const inventoryRemaining = inventoryBudget - currentMonth.inventorySpent;

  document.getElementById("monthProfit").textContent = formatCurrency(monthProfit);
  document.getElementById("salaryPaid").textContent = formatCurrency(currentMonth.salaryPaid);
  document.getElementById("remainingProfit").textContent = formatCurrency(remainingAfterSalary);
  document.getElementById("inventoryBudget").textContent = formatCurrency(inventoryBudget);
  document.getElementById("inventorySpent").textContent = formatCurrency(currentMonth.inventorySpent);
  document.getElementById("inventoryRemaining").textContent = formatCurrency(inventoryRemaining);
  document.getElementById("businessSavings").textContent = formatCurrency(businessSavings);

  renderPurchaseTable();
  saveMonthToStorage();
}

function renderPurchaseTable() {
  const tbody = document.getElementById("purchaseTableBody");
  tbody.innerHTML = "";

  currentMonth.purchases.forEach(p => {
    const tr = document.createElement("tr");
    const tdDesc = document.createElement("td");
    const tdAmount = document.createElement("td");

    tdDesc.textContent = p.desc;
    tdAmount.textContent = formatCurrency(p.amount);

    tr.appendChild(tdDesc);
    tr.appendChild(tdAmount);
    tbody.appendChild(tr);
  });
}

function renderMonthArchive() {
  const tbody = document.getElementById("monthArchiveBody");
  tbody.innerHTML = "";

  monthArchive.forEach(m => {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = m.name;

    const tdProfit = document.createElement("td");
    tdProfit.textContent = formatCurrency(m.monthProfit);

    const tdSalary = document.createElement("td");
    tdSalary.textContent = formatCurrency(m.salaryPaid);

    const tdInvBudget = document.createElement("td");
    tdInvBudget.textContent = formatCurrency(m.inventoryBudget);

    const tdInvSpent = document.createElement("td");
    tdInvSpent.textContent = formatCurrency(m.inventorySpent);

    const tdSavings = document.createElement("td");
    tdSavings.textContent = formatCurrency(m.businessSavings);

    tr.appendChild(tdName);
    tr.appendChild(tdProfit);
    tr.appendChild(tdSalary);
    tr.appendChild(tdInvBudget);
    tr.appendChild(tdInvSpent);
    tr.appendChild(tdSavings);

    tbody.appendChild(tr);
  });
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
    renderSalesTable();
    renderSummary();
    renderMonthSummary();

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
  renderSalesTable();
  renderSummary();
  renderMonthSummary();

  document.getElementById("manualStatus").textContent = "Manual sale added.";
}

function handleClearData() {
  if (!confirm("Clear all sales data?")) return;

  sales = [];
  saveSalesToStorage();
  renderSalesTable();
  renderSummary();
  renderMonthSummary();

  document.getElementById("clearStatus").textContent = "All sales data cleared.";
}

function handleUpdateSalaryGoal() {
  const val = Number(document.getElementById("salaryGoalInput").value) || 0;
  currentMonth.salaryGoal = val;
  saveMonthToStorage();
  renderMonthSummary();
}

function handleAddPurchase() {
  const desc = document.getElementById("purchaseDesc").value.trim() || "Purchase";
  const amount = Number(document.getElementById("purchaseAmount").value) || 0;

  if (amount <= 0) {
    document.getElementById("purchaseStatus").textContent = "Enter a valid purchase amount.";
    return;
  }

  currentMonth.purchases.push({ desc, amount });
  currentMonth.inventorySpent += amount;
  saveMonthToStorage();
  renderMonthSummary();

  document.getElementById("purchaseStatus").textContent = "Purchase added.";
  document.getElementById("purchaseDesc").value = "";
  document.getElementById("purchaseAmount").value = "";
}

function handleCloseMonth() {
  const monthProfit = computeMonthProfit();
  const remainingAfterSalary = Math.max(monthProfit - currentMonth.salaryPaid, 0);
  const inventoryBudget = remainingAfterSalary * 0.75;
  const businessSavings = remainingAfterSalary * 0.25;

  const archiveEntry = {
    id: currentMonth.id,
    name: currentMonth.name,
    monthProfit,
    salaryPaid: currentMonth.salaryPaid,
    inventoryBudget,
    inventorySpent: currentMonth.inventorySpent,
    businessSavings
  };

  monthArchive.push(archiveEntry);
  saveMonthArchive();

  const now = new Date();
  currentMonth = {
    id: `${now.getFullYear()}-${now.getMonth() + 1}`,
    name: now.toLocaleString("default", { month: "long", year: "numeric" }),
    salaryGoal: archiveEntry.salaryPaid > 0 ? archiveEntry.salaryPaid : 4400,
    salaryPaid: 0,
    inventoryBudget: 0,
    inventorySpent: 0,
    businessSavings: 0,
    remainingProfit: 0,
    purchases: []
  };
  saveMonthToStorage();

  sales = [];
  saveSalesToStorage();

  renderSalesTable();
  renderSummary();
  renderMonthSummary();
  renderMonthArchive();

  document.getElementById("monthStatus").textContent = "Month closed and new month started.";
}

// ---------------- Init ----------------

document.addEventListener("DOMContentLoaded", () => {
  loadSalesFromStorage();
  loadMonthFromStorage();

  renderSalesTable();
  renderSummary();
  renderMonthSummary();
  renderMonthArchive();

  document.getElementById("loadCsvBtn").addEventListener("click", handleLoadCsv);
  document.getElementById("addSaleBtn").addEventListener("click", handleAddSale);
  document.getElementById("clearDataBtn").addEventListener("click", handleClearData);
  document.getElementById("updateSalaryGoalBtn").addEventListener("click", handleUpdateSalaryGoal);
  document.getElementById("addPurchaseBtn").addEventListener("click", handleAddPurchase);
  document.getElementById("closeMonthBtn").addEventListener("click", handleCloseMonth);
});
