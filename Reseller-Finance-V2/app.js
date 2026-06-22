/******************************************************
 *  RESELLER FINANCE DASHBOARD — FULL UPGRADED VERSION
 *  PART 1 OF 3
 *  Includes:
 *   - Storage system
 *   - Utilities
 *   - Month system
 *   - Salary system
 *   - Purchase system
 *   - CSV import + parser
 ******************************************************/

/* ====================================================
   STORAGE KEYS
==================================================== */
export const STORAGE_KEYS = {
  sales: "salesData",
  purchases: "purchaseData",
  salaryPayments: "salaryPayments",
  months: "months",
  currentMonthId: "currentMonthId",
  salaryGoal: "salaryGoal"
};

/* ====================================================
   GLOBAL STATE ARRAYS
==================================================== */
export let sales = loadJSON(STORAGE_KEYS.sales, []);
export let purchases = loadJSON(STORAGE_KEYS.purchases, []);
export let salaryPayments = loadJSON(STORAGE_KEYS.salaryPayments, []);
export let months = loadJSON(STORAGE_KEYS.months, []);
export let salaryGoal = loadJSON(STORAGE_KEYS.salaryGoal, 0);

/* ====================================================
   UTILITY FUNCTIONS
==================================================== */

// Safe number conversion
export function toNum(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// Currency formatting
export function formatCurrency(num) {
  return "$" + toNum(num).toFixed(2);
}

// Save JSON to localStorage
export function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Load JSON from localStorage
export function loadJSON(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/* ====================================================
   MONTH SYSTEM
==================================================== */

// Create a new month object
export function createNewMonth() {
  const now = new Date();
  const monthName = now.toLocaleString("default", { month: "long" });
  const year = now.getFullYear();

  const id = `${monthName}-${year}-${Date.now()}`;

  const newMonth = {
    id,
    name: `${monthName} ${year}`,
    profit: 0,
    salaryPaid: 0,
    inventoryBudget: 0,
    inventorySpent: 0,
    businessSavings: 0
  };

  months.push(newMonth);
  saveJSON(STORAGE_KEYS.months, months);
  saveJSON(STORAGE_KEYS.currentMonthId, id);

  return newMonth;
}

// Get current month object
export function getCurrentMonth() {
  let id = localStorage.getItem(STORAGE_KEYS.currentMonthId);

  if (!id) {
    const m = createNewMonth();
    return m;
  }

  const found = months.find(m => m.id === id);
  if (!found) {
    const m = createNewMonth();
    return m;
  }

  return found;
}

// Close current month and create next
export function closeCurrentMonth() {
  const month = getCurrentMonth();

  // Compute month totals
  month.profit = computeTotalProfit();
  month.salaryPaid = computeTotalSalaryPaid();
  month.inventoryBudget = month.profit * 0.75;
  month.businessSavings = month.profit * 0.25;

  // Inventory spent = sum of purchases in this month
  month.inventorySpent = purchases
    .filter(p => p.monthId === month.id)
    .reduce((sum, p) => sum + toNum(p.price), 0);

  saveJSON(STORAGE_KEYS.months, months);

  // Create next month
  const newMonth = createNewMonth();
  return newMonth;
}

/* ====================================================
   SUMMARY CALCULATIONS
==================================================== */

// Total revenue
export function computeTotalRevenue() {
  return sales.reduce((sum, s) => sum + toNum(s.totalSales), 0);
}

// Total COGS
export function computeTotalCogs() {
  return sales.reduce((sum, s) => sum + toNum(s.cogs), 0);
}

// Total profit
export function computeTotalProfit() {
  return sales.reduce((sum, s) => sum + computeSaleProfit(s), 0);
}

// Profit for a single sale
export function computeSaleProfit(sale) {
  return toNum(sale.totalSales) - toNum(sale.totalCosts) - toNum(sale.cogs);
}

// Sell-through rate
export function computeSellThroughRate() {
  const totalQty = sales.reduce((sum, s) => sum + toNum(s.qty), 0);
  const totalListings = sales.length;
  if (totalListings === 0) return 0;
  return (totalQty / totalListings) * 100;
}

// Average sale price
export function computeAvgSalePrice() {
  if (sales.length === 0) return 0;
  return computeTotalRevenue() / sales.length;
}

/* ====================================================
   SALARY SYSTEM
==================================================== */

// Add salary payment
export function addSalaryPayment(amount, date) {
  const month = getCurrentMonth();

  salaryPayments.push({
    id: Date.now(),
    amount: toNum(amount),
    date,
    monthId: month.id
  });

  saveJSON(STORAGE_KEYS.salaryPayments, salaryPayments);
}

// Total salary paid this month
export function computeTotalSalaryPaid() {
  const month = getCurrentMonth();
  return salaryPayments
    .filter(p => p.monthId === month.id)
    .reduce((sum, p) => sum + toNum(p.amount), 0);
}

/* ====================================================
   PURCHASE SYSTEM
==================================================== */

// Add purchase
export function addPurchase(date, desc, price, qty) {
  const month = getCurrentMonth();

  const totalPrice = toNum(price);
  const quantity = toNum(qty);
  const cogsPerItem = quantity > 0 ? totalPrice / quantity : 0;

  purchases.push({
    id: Date.now().toString(),
    date,
    desc,
    price: totalPrice,
    qty: quantity,
    cogsPerItem,
    remainingQty: quantity,
    monthId: month.id
  });

  saveJSON(STORAGE_KEYS.purchases, purchases);
}

// Delete purchase
export function deletePurchase(id) {
  purchases = purchases.filter(p => p.id !== id);
  saveJSON(STORAGE_KEYS.purchases, purchases);
}

/* ====================================================
   CSV IMPORT + PARSER
==================================================== */

// Parse CSV text into rows
export function parseCsv(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    const row = {};

    headers.forEach((h, idx) => {
      row[h] = cols[idx] || "";
    });

    rows.push(row);
  }

  return rows;
}

// Convert CSV rows into sale objects
export function importCsvRows(rows) {
  const month = getCurrentMonth();

  rows.forEach(r => {
    const title = r["listing title"] || "Untitled";
    const qty = toNum(r["quantity sold"]);
    const totalSales = toNum(r["total sales (includes taxes)"]);
    const totalCosts = toNum(r["total selling costs"]);
    const cogs = toNum(r["cogs"]);

    sales.push({
      id: Date.now().toString() + Math.random(),
      title,
      qty,
      totalSales,
      totalCosts,
      cogs,
      linkedPurchaseId: null,
      linkedQty: null,
      monthId: month.id
    });
  });

  saveJSON(STORAGE_KEYS.sales, sales);
}
/******************************************************
 *  PART 2 OF 3 — SALES ENGINE + LINKING ENGINE + UI
 ******************************************************/

/* ====================================================
   SALES SYSTEM
==================================================== */

// Add manual sale
export function addManualSale(title, qty, totalSales, totalCosts, cogs, linkedPurchaseId) {
  const month = getCurrentMonth();

  const sale = {
    id: Date.now().toString(),
    title,
    qty: toNum(qty),
    totalSales: toNum(totalSales),
    totalCosts: toNum(totalCosts),
    cogs: toNum(cogs),
    linkedPurchaseId: linkedPurchaseId || null,
    linkedQty: linkedPurchaseId ? toNum(qty) : null,
    monthId: month.id
  };

  // If linked, reduce inventory
  if (linkedPurchaseId) {
    const p = purchases.find(p => p.id === linkedPurchaseId);
    if (p) {
      p.remainingQty -= sale.qty;
      if (p.remainingQty < 0) p.remainingQty = 0;
      saveJSON(STORAGE_KEYS.purchases, purchases);
    }
  }

  sales.push(sale);
  saveJSON(STORAGE_KEYS.sales, sales);
}

// Delete sale
export function deleteSale(index) {
  const sale = sales[index];

  // Restore inventory if linked
  if (sale.linkedPurchaseId) {
    const p = purchases.find(p => p.id === sale.linkedPurchaseId);
    if (p) {
      p.remainingQty += sale.qty;
      saveJSON(STORAGE_KEYS.purchases, purchases);
    }
  }

  sales.splice(index, 1);
  saveJSON(STORAGE_KEYS.sales, sales);

  renderSalesTable();
  recomputeGlobalSummary();
}

/* ====================================================
   LINKING ENGINE — INLINE DROPDOWN
==================================================== */

// Build purchase dropdown options
export function buildPurchaseOptions() {
  let html = `<option value="">-- None / Manual COGS --</option>`;

  purchases.forEach(p => {
    html += `
      <option value="${p.id}">
        ${p.desc} — $${p.cogsPerItem.toFixed(2)} — ${p.remainingQty} left
      </option>
    `;
  });

  return html;
}

// Handle dropdown change
export function handleInlineLinkChange(saleIndex, purchaseId) {
  const sale = sales[saleIndex];

  // If unlinking
  if (!purchaseId) {
    // Restore inventory
    if (sale.linkedPurchaseId) {
      const old = purchases.find(p => p.id === sale.linkedPurchaseId);
      if (old) {
        old.remainingQty += sale.qty;
        saveJSON(STORAGE_KEYS.purchases, purchases);
      }
    }

    sale.linkedPurchaseId = null;
    sale.linkedQty = null;
    saveJSON(STORAGE_KEYS.sales, sales);

    renderSalesTable();
    recomputeGlobalSummary();
    return;
  }

  // Linking to a purchase
  const p = purchases.find(p => p.id === purchaseId);
  if (!p) return;

  // Restore old inventory if previously linked
  if (sale.linkedPurchaseId) {
    const old = purchases.find(p => p.id === sale.linkedPurchaseId);
    if (old) {
      old.remainingQty += sale.qty;
    }
  }

  // Apply new link
  sale.linkedPurchaseId = purchaseId;
  sale.linkedQty = sale.qty;
  sale.cogs = p.cogsPerItem * sale.qty;

  // Reduce inventory
  p.remainingQty -= sale.qty;
  if (p.remainingQty < 0) p.remainingQty = 0;

  saveJSON(STORAGE_KEYS.purchases, purchases);
  saveJSON(STORAGE_KEYS.sales, sales);

  renderSalesTable();
  recomputeGlobalSummary();
}

/* ====================================================
   BULK LINKING ENGINE
==================================================== */

export function bulkLinkCsvSales() {
  let linkedCount = 0;

  sales.forEach(sale => {
    if (sale.linkedPurchaseId) return; // skip already linked

    // Find a purchase with enough remaining qty
    const p = purchases.find(p => p.remainingQty >= sale.qty);
    if (!p) return;

    // Link it
    sale.linkedPurchaseId = p.id;
    sale.linkedQty = sale.qty;
    sale.cogs = p.cogsPerItem * sale.qty;

    p.remainingQty -= sale.qty;
    linkedCount++;
  });

  saveJSON(STORAGE_KEYS.sales, sales);
  saveJSON(STORAGE_KEYS.purchases, purchases);

  return linkedCount;
}

/* ====================================================
   UNLINK ALL SALES
==================================================== */

export function unlinkAllSales() {
  sales.forEach(sale => {
    if (sale.linkedPurchaseId) {
      const p = purchases.find(p => p.id === sale.linkedPurchaseId);
      if (p) {
        p.remainingQty += sale.qty;
      }
    }

    sale.linkedPurchaseId = null;
    sale.linkedQty = null;
  });

  saveJSON(STORAGE_KEYS.sales, sales);
  saveJSON(STORAGE_KEYS.purchases, purchases);
}

/* ====================================================
   SALES FILTERS
==================================================== */

let salesFilterMode = "all"; // all | linked | unlinked

export function setSalesFilter(mode) {
  salesFilterMode = mode;
  renderSalesTable();
}

/* ====================================================
   SALES TABLE RENDERING (UPGRADED)
==================================================== */

export function renderSalesTable() {
  const tbody = document.getElementById("salesTableBody");
  tbody.innerHTML = "";

  sales.forEach((sale, index) => {
    const isLinked = !!sale.linkedPurchaseId;

    // Apply filter
    if (salesFilterMode === "linked" && !isLinked) return;
    if (salesFilterMode === "unlinked" && isLinked) return;

    const profit = computeSaleProfit(sale);

    const tr = document.createElement("tr");

    // Row highlighting
    if (isLinked) {
      tr.classList.add("linked-row");
    } else {
      tr.classList.add("unlinked-row");
    }

    // Build row
    tr.innerHTML = `
      <td>
        ${sale.title}
        ${
          isLinked
            ? `<div class="linked-note">Linked to: ${sale.linkedPurchaseId} (${sale.linkedQty})</div>`
            : ""
        }
      </td>
      <td>${sale.qty}</td>
      <td>${formatCurrency(sale.totalSales)}</td>
      <td>${formatCurrency(sale.totalCosts)}</td>
      <td>
        <input type="number" class="cogs-input" data-index="${index}"
          value="${toNum(sale.cogs).toFixed(2)}" step="0.01" />
      </td>
      <td>${formatCurrency(profit)}</td>
      <td>
        <select class="csv-link-select" data-index="${index}">
          ${buildPurchaseOptions()}
        </select>
      </td>
      <td>
        ${
          sale.linkedPurchaseId
            ? purchases.find(p => p.id === sale.linkedPurchaseId)?.remainingQty ?? 0
            : "-"
        }
      </td>
      <td>
        <button class="delete-btn" data-index="${index}">Delete</button>
      </td>
    `;

    tbody.appendChild(tr);

    // Set dropdown selection
    const selectEl = tr.querySelector(".csv-link-select");
    if (selectEl) selectEl.value = sale.linkedPurchaseId || "";

    // COGS input handler
    tr.querySelector(".cogs-input").addEventListener("change", e => {
      const idx = Number(e.target.dataset.index);
      sales[idx].cogs = toNum(e.target.value);
      saveJSON(STORAGE_KEYS.sales, sales);
      recomputeGlobalSummary();
      renderSalesTable();
    });

    // Dropdown handler
    selectEl.addEventListener("change", e => {
      const idx = Number(e.target.dataset.index);
      handleInlineLinkChange(idx, e.target.value);
    });

    // Delete handler
    tr.querySelector(".delete-btn").addEventListener("click", e => {
      deleteSale(Number(e.target.dataset.index));
    });
  });
}
/******************************************************
 *  PART 3 OF 3 — INIT + EVENT LISTENERS + FINAL GLUE
 ******************************************************/

/* ====================================================
   GLOBAL SUMMARY RENDER
==================================================== */

export function recomputeGlobalSummary() {
  document.getElementById("totalRevenue").textContent =
    formatCurrency(computeTotalRevenue());

  document.getElementById("totalCogs").textContent =
    formatCurrency(computeTotalCogs());

  document.getElementById("totalProfit").textContent =
    formatCurrency(computeTotalProfit());

  document.getElementById("sellThroughRate").textContent =
    computeSellThroughRate().toFixed(1) + "%";

  document.getElementById("avgSalePrice").textContent =
    formatCurrency(computeAvgSalePrice());

  renderMonthSummary();
}

/* ====================================================
   MONTH SUMMARY RENDER
==================================================== */

export function renderMonthSummary() {
  const month = getCurrentMonth();

  document.getElementById("currentMonthName").textContent = month.name;

  const profit = computeTotalProfit();
  const salaryPaid = computeTotalSalaryPaid();
  const remaining = profit - salaryPaid;

  document.getElementById("monthProfit").textContent = formatCurrency(profit);
  document.getElementById("salaryPaid").textContent = formatCurrency(salaryPaid);
  document.getElementById("remainingProfit").textContent = formatCurrency(remaining);

  document.getElementById("inventoryBudget").textContent =
    formatCurrency(profit * 0.75);

  const inventorySpent = purchases
    .filter(p => p.monthId === month.id)
    .reduce((sum, p) => sum + toNum(p.price), 0);

  document.getElementById("inventorySpent").textContent =
    formatCurrency(inventorySpent);

  document.getElementById("inventoryRemaining").textContent =
    formatCurrency(profit * 0.75 - inventorySpent);

  document.getElementById("businessSavings").textContent =
    formatCurrency(profit * 0.25);

  renderMonthArchive();
}

/* ====================================================
   MONTH ARCHIVE RENDER
==================================================== */

export function renderMonthArchive() {
  const tbody = document.getElementById("monthArchiveBody");
  tbody.innerHTML = "";

  months.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.name}</td>
      <td>${formatCurrency(m.profit)}</td>
      <td>${formatCurrency(m.salaryPaid)}</td>
      <td>${formatCurrency(m.inventoryBudget)}</td>
      <td>${formatCurrency(m.inventorySpent)}</td>
      <td>${formatCurrency(m.businessSavings)}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ====================================================
   PURCHASE TABLE RENDER
==================================================== */

export function renderPurchaseTable() {
  const tbody = document.getElementById("purchaseTableBody");
  tbody.innerHTML = "";

  purchases.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.date}</td>
      <td>${p.desc}</td>
      <td>${formatCurrency(p.price)}</td>
      <td>${p.qty}</td>
      <td>${formatCurrency(p.cogsPerItem)}</td>
      <td>${p.remainingQty}</td>
      <td><button class="delete-purchase-btn" data-id="${p.id}">Delete</button></td>
    `;
    tbody.appendChild(tr);

    tr.querySelector(".delete-purchase-btn").addEventListener("click", e => {
      deletePurchase(e.target.dataset.id);
      renderPurchaseTable();
      renderSalesTable();
      recomputeGlobalSummary();
    });
  });
}

/* ====================================================
   SALARY TABLE RENDER
==================================================== */

export function renderSalaryPayments() {
  const tbody = document.getElementById("salaryPaymentsBody");
  tbody.innerHTML = "";

  salaryPayments.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.date}</td>
      <td>${formatCurrency(p.amount)}</td>
      <td><button class="delete-salary-btn" data-id="${p.id}">Delete</button></td>
    `;
    tbody.appendChild(tr);

    tr.querySelector(".delete-salary-btn").addEventListener("click", e => {
      const id = e.target.dataset.id;
      salaryPayments = salaryPayments.filter(x => x.id != id);
      saveJSON(STORAGE_KEYS.salaryPayments, salaryPayments);
      renderSalaryPayments();
      recomputeGlobalSummary();
    });
  });
}

/* ====================================================
   CSV IMPORT HANDLER
==================================================== */

export function handleCsvImport(file) {
  const reader = new FileReader();

  reader.onload = e => {
    const text = e.target.result;
    const rows = parseCsv(text);
    importCsvRows(rows);

    renderSalesTable();
    recomputeGlobalSummary();

    document.getElementById("uploadStatus").textContent =
      `Imported ${rows.length} rows successfully.`;
  };

  reader.readAsText(file);
}

/* ====================================================
   INIT — EVENT LISTENERS + FIRST RENDER
==================================================== */

export function init() {
  /* CSV IMPORT */
  document.getElementById("loadCsvBtn").addEventListener("click", () => {
    const file = document.getElementById("csvFileInput").files[0];
    if (!file) {
      document.getElementById("uploadStatus").textContent =
        "Please select a CSV file first.";
      return;
    }
    handleCsvImport(file);
  });

  /* MANUAL SALE */
  document.getElementById("addSaleBtn").addEventListener("click", () => {
    const title = document.getElementById("manualTitle").value;
    const qty = document.getElementById("manualQty").value;
    const sale = document.getElementById("manualSale").value;
    const costs = document.getElementById("manualCosts").value;
    const cogs = document.getElementById("manualCogs").value;
    const linked = document.getElementById("linkedPurchaseSelect").value;

    addManualSale(title, qty, sale, costs, cogs, linked);

    renderSalesTable();
    recomputeGlobalSummary();

    document.getElementById("manualStatus").textContent = "Sale added.";
  });

  /* PURCHASES */
  document.getElementById("addPurchaseBtn").addEventListener("click", () => {
    const date = document.getElementById("purchaseDate").value;
    const desc = document.getElementById("purchaseDesc").value;
    const price = document.getElementById("purchasePrice").value;
    const qty = document.getElementById("purchaseQty").value;

    addPurchase(date, desc, price, qty);

    renderPurchaseTable();
    recomputeGlobalSummary();

    document.getElementById("purchaseStatus").textContent = "Purchase added.";
  });

  /* SALARY */
  document.getElementById("paySalaryBtn").addEventListener("click", () => {
    const amount = document.getElementById("salaryPayInput").value;
    const date = document.getElementById("salaryDateInput").value;

    addSalaryPayment(amount, date);

    renderSalaryPayments();
    recomputeGlobalSummary();

    document.getElementById("salaryStatus").textContent = "Salary paid.";
  });

  /* PAY FULL SALARY GOAL */
  document.getElementById("payFullSalaryBtn").addEventListener("click", () => {
    const month = getCurrentMonth();
    const profit = computeTotalProfit();
    const salaryPaid = computeTotalSalaryPaid();
    const remaining = profit - salaryPaid;

    if (remaining <= 0) {
      document.getElementById("salaryStatus").textContent =
        "No remaining profit to pay salary.";
      return;
    }

    addSalaryPayment(remaining, new Date().toISOString().slice(0, 10));

    renderSalaryPayments();
    recomputeGlobalSummary();

    document.getElementById("salaryStatus").textContent =
      "Full remaining salary paid.";
  });

  /* CLOSE MONTH */
  document.getElementById("closeMonthBtn").addEventListener("click", () => {
    closeCurrentMonth();
    renderMonthSummary();
    renderMonthArchive();
    renderPurchaseTable();
    renderSalesTable();
    renderSalaryPayments();

    document.getElementById("monthStatus").textContent =
      "Month closed and new month created.";
  });

  /* CLEAR ALL SALES */
  document.getElementById("clearDataBtn").addEventListener("click", () => {
    sales = [];
    saveJSON(STORAGE_KEYS.sales, sales);
    renderSalesTable();
    recomputeGlobalSummary();
    document.getElementById("clearStatus").textContent = "All sales cleared.";
  });

  /* BULK LINK */
  document.getElementById("bulkLinkBtn").addEventListener("click", () => {
    const count = bulkLinkCsvSales();
    renderSalesTable();
    recomputeGlobalSummary();
    document.getElementById("bulkLinkStatus").textContent =
      `Linked ${count} sales automatically.`;
  });

  /* UNLINK ALL */
  document.getElementById("unlinkAllBtn").addEventListener("click", () => {
    unlinkAllSales();
    renderSalesTable();
    recomputeGlobalSummary();
  });

  /* FILTERS */
  document.getElementById("filterAll").addEventListener("click", () => {
    setSalesFilter("all");
  });

  document.getElementById("filterLinked").addEventListener("click", () => {
    setSalesFilter("linked");
  });

  document.getElementById("filterUnlinked").addEventListener("click", () => {
    setSalesFilter("unlinked");
  });

  /* INITIAL RENDER */
  renderPurchaseTable();
  renderSalesTable();
  renderSalaryPayments();
  renderMonthSummary();
  renderMonthArchive();
  recomputeGlobalSummary();
}

/* ====================================================
   START APP
==================================================== */

init();
