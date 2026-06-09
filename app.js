// Simple storage helpers
const STORAGE_KEY = "resellerFinanceData";

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      salaryGoal: 4400,
      fixedCosts: 0,
      sales: [],
      purchases: []
    };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {
      salaryGoal: 4400,
      fixedCosts: 0,
      sales: [],
      purchases: []
    };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

// DOM refs
const monthSelect = document.getElementById("month-select");
const salaryGoalInput = document.getElementById("salary-goal");
const fixedCostsInput = document.getElementById("fixed-costs");
const saveSalaryBtn = document.getElementById("save-salary-goal");
const saveFixedBtn = document.getElementById("save-fixed-costs");

const totalSalesEl = document.getElementById("total-sales");
const totalCogsEl = document.getElementById("total-cogs");
const totalPurchasesEl = document.getElementById("total-purchases");
const totalFixedEl = document.getElementById("total-fixed");
const netProfitEl = document.getElementById("net-profit");

const salaryGoalDisplay = document.getElementById("salary-goal-display");
const salaryEarnedEl = document.getElementById("salary-earned");
const salaryProgressEl = document.getElementById("salary-progress");

const finalProfitEl = document.getElementById("final-profit");
const sourcingAllocationEl = document.getElementById("sourcing-allocation");
const savingsAllocationEl = document.getElementById("savings-allocation");

const salesCsvInput = document.getElementById("sales-csv");
const clearSalesBtn = document.getElementById("clear-sales");
const salesTableBody = document.getElementById("sales-table-body");

const manualSaleDate = document.getElementById("manual-sale-date");
const manualSaleSource = document.getElementById("manual-sale-source");
const manualSaleAmount = document.getElementById("manual-sale-amount");
const manualSaleCogs = document.getElementById("manual-sale-cogs");
const addManualSaleBtn = document.getElementById("add-manual-sale");

const purchaseDate = document.getElementById("purchase-date");
const purchaseNote = document.getElementById("purchase-note");
const purchaseAmount = document.getElementById("purchase-amount");
const addPurchaseBtn = document.getElementById("add-purchase");
const purchasesTableBody = document.getElementById("purchases-table-body");

// Breakdown refs
const breakdownSalesEl = document.getElementById("breakdown-sales");
const breakdownCogsEl = document.getElementById("breakdown-cogs");
const breakdownPurchasesEl = document.getElementById("breakdown-purchases");
const breakdownFixedEl = document.getElementById("breakdown-fixed");
const breakdownSalaryGoalEl = document.getElementById("breakdown-salary-goal");
const breakdownSalaryEarnedEl = document.getElementById("breakdown-salary-earned");
const breakdownFinalProfitEl = document.getElementById("breakdown-final-profit");
const breakdownSourcingEl = document.getElementById("breakdown-sourcing");
const breakdownSavingsEl = document.getElementById("breakdown-savings");

// Init inputs
salaryGoalInput.value = state.salaryGoal;
fixedCostsInput.value = state.fixedCosts;
salaryGoalDisplay.textContent = formatCurrency(state.salaryGoal);
breakdownSalaryGoalEl.textContent = formatCurrency(state.salaryGoal);
totalFixedEl.textContent = formatCurrency(state.fixedCosts);
breakdownFixedEl.textContent = formatCurrency(state.fixedCosts);

// Default month = current
const now = new Date();
monthSelect.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

// Helpers
function formatCurrency(num) {
  return `$${(num || 0).toFixed(2)}`;
}

function parseNumber(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function getMonthFilter() {
  return monthSelect.value; // "YYYY-MM"
}

function isInMonth(dateStr, monthStr) {
  if (!monthStr) return true;
  if (!dateStr) return false;
  return dateStr.startsWith(monthStr);
}

// CSV parsing: expects columns with at least date, sale, cogs
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(",");
  const dateIdx = header.findIndex(h => /date/i.test(h));
  const saleIdx = header.findIndex(h => /(sale|amount|total)/i.test(h));
  const cogsIdx = header.findIndex(h => /(cogs|cost)/i.test(h));

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const date = cols[dateIdx] || "";
    const sale = parseNumber(cols[saleIdx]);
    const cogs = cogsIdx >= 0 ? parseNumber(cols[cogsIdx]) : 0;
    if (!date || sale === 0) continue;
    results.push({
      date,
      source: "CSV",
      amount: sale,
      cogs
    });
  }
  return results;
}

// Render functions
function render() {
  const month = getMonthFilter();

  const sales = state.sales.filter(s => isInMonth(s.date, month));
  const purchases = state.purchases.filter(p => isInMonth(p.date, month));

  const totalSales = sales.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalCogs = sales.reduce((sum, s) => sum + (s.cogs || 0), 0);
  const totalPurchases = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
  const fixedCosts = state.fixedCosts;

  const grossProfit = totalSales - totalCogs;
  const netBeforeSalary = grossProfit - totalPurchases - fixedCosts;

  // Salary earned = min(netBeforeSalary, salaryGoal)
  const salaryGoal = state.salaryGoal;
  const salaryEarned = Math.max(0, Math.min(netBeforeSalary, salaryGoal));
  const remainingAfterSalary = netBeforeSalary - salaryEarned;

  const finalProfit = Math.max(0, remainingAfterSalary);
  const sourcing = finalProfit * 0.75;
  const savings = finalProfit * 0.25;

  // Summary cards
  totalSalesEl.textContent = formatCurrency(totalSales);
  totalCogsEl.textContent = formatCurrency(totalCogs);
  totalPurchasesEl.textContent = formatCurrency(totalPurchases);
  totalFixedEl.textContent = formatCurrency(fixedCosts);
  netProfitEl.textContent = formatCurrency(netBeforeSalary);

  salaryGoalDisplay.textContent = formatCurrency(salaryGoal);
  salaryEarnedEl.textContent = `Earned: ${formatCurrency(salaryEarned)}`;
  const progressPct = salaryGoal > 0 ? Math.min(100, (salaryEarned / salaryGoal) * 100) : 0;
  salaryProgressEl.style.width = `${progressPct}%`;

  finalProfitEl.textContent = formatCurrency(finalProfit);
  sourcingAllocationEl.textContent = formatCurrency(sourcing);
  savingsAllocationEl.textContent = formatCurrency(savings);

  // Breakdown
  breakdownSalesEl.textContent = formatCurrency(totalSales);
  breakdownCogsEl.textContent = formatCurrency(totalCogs);
  breakdownPurchasesEl.textContent = formatCurrency(totalPurchases);
  breakdownFixedEl.textContent = formatCurrency(fixedCosts);
  breakdownSalaryGoalEl.textContent = formatCurrency(salaryGoal);
  breakdownSalaryEarnedEl.textContent = formatCurrency(salaryEarned);
  breakdownFinalProfitEl.textContent = formatCurrency(finalProfit);
  breakdownSourcingEl.textContent = formatCurrency(sourcing);
  breakdownSavingsEl.textContent = formatCurrency(savings);

  // Tables
  renderSalesTable(sales);
  renderPurchasesTable(purchases);
}

function renderSalesTable(sales) {
  salesTableBody.innerHTML = "";
  if (sales.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.className = "empty-row";
    td.textContent = "No sales for this month.";
    tr.appendChild(td);
    salesTableBody.appendChild(tr);
    return;
  }
  sales.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.date}</td>
      <td>${s.source || ""}</td>
      <td>${formatCurrency(s.amount || 0)}</td>
      <td>${formatCurrency(s.cogs || 0)}</td>
    `;
    salesTableBody.appendChild(tr);
  });
}

function renderPurchasesTable(purchases) {
  purchasesTableBody.innerHTML = "";
  if (purchases.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.className = "empty-row";
    td.textContent = "No purchases for this month.";
    tr.appendChild(td);
    purchasesTableBody.appendChild(tr);
    return;
  }
  purchases.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.date}</td>
      <td>${p.note || ""}</td>
      <td>${formatCurrency(p.amount || 0)}</td>
    `;
    purchasesTableBody.appendChild(tr);
  });
}

// Event handlers
monthSelect.addEventListener("change", () => {
  render();
});

saveSalaryBtn.addEventListener("click", () => {
  const val = parseNumber(salaryGoalInput.value);
  state.salaryGoal = val > 0 ? val : 0;
  saveState(state);
  salaryGoalDisplay.textContent = formatCurrency(state.salaryGoal);
  breakdownSalaryGoalEl.textContent = formatCurrency(state.salaryGoal);
  render();
});

saveFixedBtn.addEventListener("click", () => {
  const val = parseNumber(fixedCostsInput.value);
  state.fixedCosts = val > 0 ? val : 0;
  saveState(state);
  totalFixedEl.textContent = formatCurrency(state.fixedCosts);
  breakdownFixedEl.textContent = formatCurrency(state.fixedCosts);
  render();
});

salesCsvInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const text = evt.target.result;
    const parsed = parseCsv(text);
    state.sales = state.sales.concat(parsed);
    saveState(state);
    render();
  };
  reader.readAsText(file);
});

clearSalesBtn.addEventListener("click", () => {
  state.sales = [];
  saveState(state);
  render();
});

addManualSaleBtn.addEventListener("click", () => {
  const date = manualSaleDate.value || monthSelect.value + "-01";
  const source = manualSaleSource.value || "Manual";
  const amount = parseNumber(manualSaleAmount.value);
  const cogs = parseNumber(manualSaleCogs.value);

  if (!date || amount <= 0) return;

  state.sales.push({ date, source, amount, cogs });
  saveState(state);

  manualSaleAmount.value = "";
  manualSaleCogs.value = "";
  manualSaleSource.value = "";

  render();
});

addPurchaseBtn.addEventListener("click", () => {
  const date = purchaseDate.value || monthSelect.value + "-01";
  const note = purchaseNote.value || "Inventory";
  const amount = parseNumber(purchaseAmount.value);

  if (!date || amount <= 0) return;

  state.purchases.push({ date, note, amount });
  saveState(state);

  purchaseAmount.value = "";
  purchaseNote.value = "";

  render();
});

// Initial render
render();
