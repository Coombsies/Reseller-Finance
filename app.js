/* ================================
   Reseller Finance Dashboard (NEW SCHEMA)
   Full Rebuild app.js
   ================================ */

/*  
   DATA STRUCTURE (NEW SCHEMA)

   sales: [
     {
       title: "",
       qty: number,
       totalSales: number,
       totalSellingCosts: number,
       cogs: number,
       profit: number,
       date: "YYYY-MM-DD",
       monthId: "YYYY-MM"
     }
   ]

   purchases: [
     {
       date: "YYYY-MM-DD",
       desc: "",
       amount: number,
       itemCount: number,
       costPerItem: number,
       monthId: "YYYY-MM"
     }
   ]

   salaryPayments: [
     {
       date: "YYYY-MM-DD",
       amount: number,
       monthId: "YYYY-MM"
     }
   ]

   monthArchive: {
     "YYYY-MM": {
       profit: number,
       salaryPaid: number,
       inventoryBudget: number,
       inventorySpent: number,
       businessSavings: number
     }
   }

   salaryGoal: number
*/

let sales = [];
let purchases = [];
let salaryPayments = [];
let monthArchive = {};
let salaryGoal = 0;

let currentMonthId = "";
let lastUpdated = "";

/* ================================
   SAVE + LOAD
   ================================ */

function saveData() {
  const data = {
    sales,
    purchases,
    salaryPayments,
    monthArchive,
    salaryGoal,
    currentMonthId,
    lastUpdated
  };
  localStorage.setItem("resellerFinanceData", JSON.stringify(data));
}

function loadData() {
  const raw = localStorage.getItem("resellerFinanceData");
  if (!raw) return;

  try {
    const data = JSON.parse(raw);

    sales = data.sales || [];
    purchases = data.purchases || [];
    salaryPayments = data.salaryPayments || [];
    monthArchive = data.monthArchive || {};
    salaryGoal = data.salaryGoal || 0;
    currentMonthId = data.currentMonthId || "";
    lastUpdated = data.lastUpdated || "";

  } catch (e) {
    console.error("Error loading data:", e);
  }
}

/* ================================
   HELPERS
   ================================ */

function getMonthIdFromDate(dateStr) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function formatCurrency(num) {
  if (isNaN(num)) num = 0;
  return "$" + num.toFixed(2);
}

function getCurrentMonthTotals() {
  const monthSales = sales.filter(s => s.monthId === currentMonthId);
  const monthPurchases = purchases.filter(p => p.monthId === currentMonthId);
  const monthSalary = salaryPayments.filter(sp => sp.monthId === currentMonthId);

  const revenue = monthSales.reduce((t, s) => t + s.totalSales, 0);
  const cogs = monthSales.reduce((t, s) => t + s.cogs, 0);
  const sellingCosts = monthSales.reduce((t, s) => t + s.totalSellingCosts, 0);
  const profit = monthSales.reduce((t, s) => t + s.profit, 0);

  const inventorySpent = monthPurchases.reduce((t, p) => t + p.amount, 0);
  const salaryPaid = monthSalary.reduce((t, sp) => t + sp.amount, 0);

  return {
    revenue,
    cogs,
    sellingCosts,
    profit,
    inventorySpent,
    salaryPaid
  };
}

/* ================================
   RENDER UI
   ================================ */

function renderDashboard() {
  const totals = getCurrentMonthTotals();

  const totalRevenueEl = document.getElementById("totalRevenue");
  const totalCogsEl = document.getElementById("totalCogs");
  const totalProfitEl = document.getElementById("totalProfit");
  const inventorySpentEl = document.getElementById("inventorySpent");
  const salaryPaidEl = document.getElementById("salaryPaid");
  const salaryGoalDisplayEl = document.getElementById("salaryGoalDisplay");
  const currentMonthLabelEl = document.getElementById("currentMonthLabel");
  const lastUpdatedEl = document.getElementById("lastUpdated");

  if (!totalRevenueEl) return; // hard guard if HTML not loaded

  totalRevenueEl.textContent = formatCurrency(totals.revenue);
  totalCogsEl.textContent = formatCurrency(totals.cogs);
  totalProfitEl.textContent = formatCurrency(totals.profit);
  inventorySpentEl.textContent = formatCurrency(totals.inventorySpent);
  salaryPaidEl.textContent = formatCurrency(totals.salaryPaid);

  salaryGoalDisplayEl.textContent = formatCurrency(salaryGoal);
  currentMonthLabelEl.textContent = currentMonthId;
  lastUpdatedEl.textContent = lastUpdated || "N/A";

  renderSalesTable();
  renderPurchasesTable();
  renderSalaryTable();
  renderArchiveSnapshot();
}

function renderSalesTable() {
  const tbody = document.getElementById("salesTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const monthSales = sales.filter(s => s.monthId === currentMonthId);

  monthSales.forEach(s => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${s.title}</td>
      <td>${s.qty}</td>
      <td>${formatCurrency(s.totalSales)}</td>
      <td>${formatCurrency(s.totalSellingCosts)}</td>
      <td>${formatCurrency(s.cogs)}</td>
      <td>${formatCurrency(s.profit)}</td>
      <td>${s.date}</td>
    `;

    tbody.appendChild(tr);
  });
}

function renderPurchasesTable() {
  const tbody = document.getElementById("purchasesTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const monthPurchases = purchases.filter(p => p.monthId === currentMonthId);

  monthPurchases.forEach(p => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.date}</td>
      <td>${p.desc}</td>
      <td>${formatCurrency(p.amount)}</td>
      <td>${p.itemCount}</td>
      <td>${formatCurrency(p.costPerItem)}</td>
    `;

    tbody.appendChild(tr);
  });
}

function renderSalaryTable() {
  const tbody = document.getElementById("salaryTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const monthSalary = salaryPayments.filter(sp => sp.monthId === currentMonthId);

  monthSalary.forEach(sp => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${sp.date}</td>
      <td>${formatCurrency(sp.amount)}</td>
    `;

    tbody.appendChild(tr);
  });
}

function renderArchiveSnapshot() {
  const archived = monthArchive[currentMonthId] || {
    profit: 0,
    salaryPaid: 0,
    inventoryBudget: salaryGoal,
    inventorySpent: 0,
    businessSavings: 0
  };

  const ap = document.getElementById("archivedProfit");
  const as = document.getElementById("archivedSalaryPaid");
  const ab = document.getElementById("archivedInventoryBudget");
  const ai = document.getElementById("archivedInventorySpent");
  const bs = document.getElementById("archivedBusinessSavings");

  if (!ap) return;

  ap.textContent = formatCurrency(archived.profit);
  as.textContent = formatCurrency(archived.salaryPaid);
  ab.textContent = formatCurrency(archived.inventoryBudget);
  ai.textContent = formatCurrency(archived.inventorySpent);
  bs.textContent = formatCurrency(archived.businessSavings);
}

/* ================================
   ADDING SALES
   ================================ */

function addSale(saleObj) {
  saleObj.monthId = getMonthIdFromDate(saleObj.date);
  saleObj.profit = saleObj.totalSales - saleObj.totalSellingCosts - saleObj.cogs;

  sales.push(saleObj);
  lastUpdated = new Date().toISOString().slice(0, 10);

  saveData();
  renderDashboard();
}

/* ================================
   ADDING PURCHASES
   ================================ */

function addPurchase(purchaseObj) {
  purchaseObj.monthId = getMonthIdFromDate(purchaseObj.date);

  purchases.push(purchaseObj);
  lastUpdated = new Date().toISOString().slice(0, 10);

  saveData();
  renderDashboard();
}

/* ================================
   SALARY PAYMENTS
   ================================ */

function paySalary(amount) {
  const today = new Date().toISOString().slice(0, 10);

  salaryPayments.push({
    date: today,
    amount,
    monthId: getMonthIdFromDate(today)
  });

  lastUpdated = today;

  saveData();
  renderDashboard();
}

function payFullSalaryGoal() {
  if (salaryGoal > 0) {
    paySalary(salaryGoal);
  }
}

/* ================================
   CSV IMPORT / EXPORT
   ================================ */

function parseCsv(text) {
  const rows = text.trim().split("\n").map(r => r.split(","));
  const parsed = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];

    if (r.length < 6) continue;

    const title = r[0].trim();
    const qty = Number(r[1]);
    const totalSales = Number(r[2]);
    const totalSellingCosts = Number(r[3]);
    const cogs = Number(r[4]);
    const date = r[5].trim();

    parsed.push({
      title,
      qty,
      totalSales,
      totalSellingCosts,
      cogs,
      date,
      monthId: getMonthIdFromDate(date),
      profit: totalSales - totalSellingCosts - cogs
    });
  }

  return parsed;
}

function handleCsvUpload(file) {
  const reader = new FileReader();

  reader.onload = e => {
    const text = e.target.result;
    const parsedSales = parseCsv(text);

    sales = sales.concat(parsedSales);
    lastUpdated = new Date().toISOString().slice(0, 10);

    saveData();
    renderDashboard();
  };

  reader.readAsText(file);
}

function buildSalesCsv() {
  const headers = [
    "Title",
    "Qty",
    "TotalSales",
    "TotalSellingCosts",
    "COGS",
    "Date"
  ];

  const rows = [headers.join(",")];

  sales.forEach(s => {
    rows.push([
      s.title,
      s.qty,
      s.totalSales,
      s.totalSellingCosts,
      s.cogs,
      s.date
    ].join(","));
  });

  return rows.join("\n");
}

function downloadSalesCsv() {
  const csv = buildSalesCsv();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `sales_${currentMonthId || "all"}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ================================
   MONTH CLOSING
   ================================ */

function closeMonth() {
  const totals = getCurrentMonthTotals();

  monthArchive[currentMonthId] = {
    profit: totals.profit,
    salaryPaid: totals.salaryPaid,
    inventoryBudget: salaryGoal,
    inventorySpent: totals.inventorySpent,
    businessSavings: totals.profit - totals.salaryPaid
  };

  lastUpdated = new Date().toISOString().slice(0, 10);

  saveData();
  renderDashboard();
}

/* ================================
   EVENT LISTENERS
   ================================ */

function initEventHandlers() {
  /* ---- CSV Upload ---- */
  const csvInput = document.getElementById("csvFileInput");
  const csvBtn = document.getElementById("loadCsvBtn");
  const downloadCsvBtn = document.getElementById("downloadCsvBtn");

  if (csvBtn && csvInput) {
    csvBtn.addEventListener("click", () => csvInput.click());
    csvInput.addEventListener("change", e => {
      if (e.target.files.length > 0) {
        handleCsvUpload(e.target.files[0]);
      }
    });
  }

  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener("click", () => {
      downloadSalesCsv();
    });
  }

  /* ---- Add Purchase ---- */
  const purchaseBtn = document.getElementById("addPurchaseBtn");
  if (purchaseBtn) {
    purchaseBtn.addEventListener("click", () => {
      const desc = document.getElementById("purchaseDesc").value.trim();
      const amount = Number(document.getElementById("purchaseAmount").value);
      const itemCount = Number(document.getElementById("purchaseItemCount").value);
      const date = document.getElementById("purchaseDate").value;

      if (!desc || !amount || !itemCount || !date) return;

      addPurchase({
        desc,
        amount,
        itemCount,
        costPerItem: amount / itemCount,
        date
      });

      document.getElementById("purchaseDesc").value = "";
      document.getElementById("purchaseAmount").value = "";
      document.getElementById("purchaseItemCount").value = "";
      document.getElementById("purchaseDate").value = "";
    });
  }

  /* ---- Salary Goal ---- */
  const salaryGoalInput = document.getElementById("salaryGoalInput");
  const setSalaryGoalBtn = document.getElementById("setSalaryGoalBtn");

  if (setSalaryGoalBtn && salaryGoalInput) {
    setSalaryGoalBtn.addEventListener("click", () => {
      const val = Number(salaryGoalInput.value);
      if (val >= 0) {
        salaryGoal = val;
        lastUpdated = new Date().toISOString().slice(0, 10);
        saveData();
        renderDashboard();
      }
    });
  }

  /* ---- Salary Buttons ---- */
  const paySalaryBtn = document.getElementById("paySalaryBtn");
  const payFullSalaryBtn = document.getElementById("payFullSalaryBtn");

  if (paySalaryBtn) {
    paySalaryBtn.addEventListener("click", () => {
      const amt = Number(document.getElementById("salaryAmount").value);
      if (amt > 0) paySalary(amt);
    });
  }

  if (payFullSalaryBtn) {
    payFullSalaryBtn.addEventListener("click", () => {
      payFullSalaryGoal();
    });
  }

  /* ---- Close Month ---- */
  const closeMonthBtn = document.getElementById("closeMonthBtn");
  if (closeMonthBtn) {
    closeMonthBtn.addEventListener("click", () => {
      closeMonth();
    });
  }
}

/* ================================
   INITIALIZATION
   ================================ */

document.addEventListener("DOMContentLoaded", () => {
  loadData();

  if (!currentMonthId) {
    const today = new Date().toISOString().slice(0, 10);
    currentMonthId = getMonthIdFromDate(today);
  }

  initEventHandlers();
  renderDashboard();
});

/* ================================
   END OF FILE
   ================================ */
