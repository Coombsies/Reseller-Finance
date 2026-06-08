import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const totalSalesEl = document.getElementById("totalSales");
const totalExpensesEl = document.getElementById("totalExpenses");
const netProfitEl = document.getElementById("netProfit");
const totalTimeEl = document.getElementById("totalTime");
const profitPerHourEl = document.getElementById("profitPerHour");

const saleItemEl = document.getElementById("saleItem");
const salePriceEl = document.getElementById("salePrice");
const saleCostEl = document.getElementById("saleCost");
const startSaleTimerBtn = document.getElementById("startSaleTimer");
const stopSaleTimerBtn = document.getElementById("stopSaleTimer");
const saleTimerDisplayEl = document.getElementById("saleTimerDisplay");
const addSaleBtn = document.getElementById("addSaleBtn");

const expenseLabelEl = document.getElementById("expenseLabel");
const expenseAmountEl = document.getElementById("expenseAmount");
const addExpenseBtn = document.getElementById("addExpenseBtn");

const csvFileEl = document.getElementById("csvFile");
const uploadCsvBtn = document.getElementById("uploadCsvBtn");

const salesTableBody = document.getElementById("salesTableBody");
const expensesTableBody = document.getElementById("expensesTableBody");
const resetMonthBtn = document.getElementById("resetMonthBtn");

let saleTimerStart = null;
let saleTimerMinutes = 0;

const salesCol = collection(db, "sales");
const expensesCol = collection(db, "expenses");

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function formatTimeFromMinutes(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}h ${mins}m`;
}

startSaleTimerBtn.addEventListener("click", () => {
  saleTimerStart = Date.now();
  saleTimerDisplayEl.textContent = "Time: 0m";
});

stopSaleTimerBtn.addEventListener("click", () => {
  if (!saleTimerStart) return;
  const diffMs = Date.now() - saleTimerStart;
  saleTimerMinutes = diffMs / 1000 / 60;
  saleTimerDisplayEl.textContent = `Time: ${saleTimerMinutes.toFixed(1)}m`;
  saleTimerStart = null;
});

addSaleBtn.addEventListener("click", async () => {
  const item = saleItemEl.value.trim();
  const salePrice = parseFloat(salePriceEl.value);
  const cost = parseFloat(saleCostEl.value);

  if (!item || isNaN(salePrice) || isNaN(cost)) return;

  const profit = salePrice - cost;

  await addDoc(salesCol, {
    item,
    salePrice,
    cost,
    profit,
    minutes: saleTimerMinutes || 0,
    createdAt: Date.now()
  });

  saleItemEl.value = "";
  salePriceEl.value = "";
  saleCostEl.value = "";
  saleTimerMinutes = 0;
  saleTimerDisplayEl.textContent = "Time: 0m";

  await refreshData();
});

addExpenseBtn.addEventListener("click", async () => {
  const label = expenseLabelEl.value.trim();
  const amount = parseFloat(expenseAmountEl.value);

  if (!label || isNaN(amount)) return;

  await addDoc(expensesCol, {
    label,
    amount,
    createdAt: Date.now()
  });

  expenseLabelEl.value = "";
  expenseAmountEl.value = "";

  await refreshData();
});

uploadCsvBtn.addEventListener("click", async () => {
  const file = csvFileEl.files[0];
  if (!file) return;

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);

  for (const line of lines) {
    const [item, salePriceStr, costStr] = line.split(",");
    const salePrice = parseFloat(salePriceStr);
    const cost = parseFloat(costStr);
    if (!item || isNaN(salePrice) || isNaN(cost)) continue;

    const profit = salePrice - cost;

    await addDoc(salesCol, {
      item: item.trim(),
      salePrice,
      cost,
      profit,
      minutes: 0,
      createdAt: Date.now()
    });
  }

  csvFileEl.value = "";
  await refreshData();
});

resetMonthBtn.addEventListener("click", async () => {
  if (!confirm("Reset month? This will delete all sales and expenses.")) return;

  const salesSnap = await getDocs(salesCol);
  for (const d of salesSnap.docs) {
    await deleteDoc(doc(db, "sales", d.id));
  }

  const expensesSnap = await getDocs(expensesCol);
  for (const d of expensesSnap.docs) {
    await deleteDoc(doc(db, "expenses", d.id));
  }

  await refreshData();
});

async function refreshData() {
  const salesSnap = await getDocs(salesCol);
  const expensesSnap = await getDocs(expensesCol);

  const sales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const expenses = expensesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderSales(sales);
  renderExpenses(expenses);
  updateStats(sales, expenses);
}

function renderSales(sales) {
  salesTableBody.innerHTML = "";
  for (const s of sales) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.item}</td>
      <td>${formatCurrency(s.salePrice)}</td>
      <td>${formatCurrency(s.cost)}</td>
      <td>${formatCurrency(s.profit)}</td>
      <td>${(s.minutes || 0).toFixed(1)}</td>
    `;
    salesTableBody.appendChild(tr);
  }
}

function renderExpenses(expenses) {
  expensesTableBody.innerHTML = "";
  for (const e of expenses) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.label}</td>
      <td>${formatCurrency(e.amount)}</td>
    `;
    expensesTableBody.appendChild(tr);
  }
}

function updateStats(sales, expenses) {
  const totalSales = sales.reduce((sum, s) => sum + (s.salePrice || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0) - totalExpenses;
  const totalMinutes = sales.reduce((sum, s) => sum + (s.minutes || 0), 0);
  const totalHours = totalMinutes / 60 || 0;
  const profitPerHour = totalHours > 0 ? totalProfit / totalHours : 0;

  totalSalesEl.textContent = formatCurrency(totalSales);
  totalExpensesEl.textContent = formatCurrency(totalExpenses);
  netProfitEl.textContent = formatCurrency(totalProfit);
  totalTimeEl.textContent = formatTimeFromMinutes(totalMinutes);
  profitPerHourEl.textContent = formatCurrency(profitPerHour) + "/hr";
}

refreshData().catch(console.error);
// ===============================
// MONTHLY ALLOCATION ENGINE
// ===============================

// Load saved salary goal
const salaryGoalInput = document.getElementById("salaryGoal");
salaryGoalInput.value = localStorage.getItem("salaryGoal") || 4400;

// Update salary goal when changed
salaryGoalInput.addEventListener("input", () => {
    localStorage.setItem("salaryGoal", salaryGoalInput.value);
    updateAllocationPanel();
});

// Main update function
function updateAllocationPanel() {
    const salaryGoal = Number(salaryGoalInput.value);
    const netProfit = totalSales - totalExpenses;

    // Salary progress
    const progress = Math.max(0, Math.min(1, netProfit / salaryGoal));
    document.getElementById("salaryProgressFill").style.width = (progress * 100) + "%";
    document.getElementById("salaryProgressPercent").textContent = Math.round(progress * 100) + "%";

    // Remaining profit after salary
    const remaining = Math.max(0, netProfit - salaryGoal);
    document.getElementById("remainingProfit").textContent = "$" + remaining.toFixed(2);

    // 75/25 split
    const sourcing = remaining * 0.75;
    const savings = remaining * 0.25;

    document.getElementById("sourcingFund").textContent = "$" + sourcing.toFixed(2);
    document.getElementById("businessSavings").textContent = "$" + savings.toFixed(2);
}

// Hook into your existing updateTotals() function
const originalUpdateTotals = updateTotals;
updateTotals = function() {
    originalUpdateTotals();
    updateAllocationPanel();
};

// ===============================
// MONTHLY REPORT MODAL
// ===============================

document.getElementById("generateReportBtn").addEventListener("click", () => {
    const salaryGoal = Number(salaryGoalInput.value);
    const netProfit = totalSales - totalExpenses;
    const remaining = Math.max(0, netProfit - salaryGoal);

    const reportHTML = `
        <p><strong>Total Sales:</strong> $${totalSales.toFixed(2)}</p>
        <p><strong>Total Expenses:</strong> $${totalExpenses.toFixed(2)}</p>
        <p><strong>Net Profit:</strong> $${netProfit.toFixed(2)}</p>
        <p><strong>Salary Goal:</strong> $${salaryGoal.toFixed(2)}</p>
        <p><strong>Remaining Profit:</strong> $${remaining.toFixed(2)}</p>
        <p><strong>Sourcing Fund (75%):</strong> $${(remaining * 0.75).toFixed(2)}</p>
        <p><strong>Business Savings (25%):</strong> $${(remaining * 0.25).toFixed(2)}</p>
    `;

    document.getElementById("reportBody").innerHTML = reportHTML;
    document.getElementById("reportModal").style.display = "block";
});

document.getElementById("closeReport").addEventListener("click", () => {
    document.getElementById("reportModal").style.display = "none";
});
// ===============================
// MONTH DISPLAY
// ===============================

function getCurrentMonthString() {
    const now = new Date();
    const month = now.toLocaleString("default", { month: "long" });
    const year = now.getFullYear();
    return `${month} ${year}`;
}

// Load month on startup
if (!localStorage.getItem("currentMonth")) {
    localStorage.setItem("currentMonth", getCurrentMonthString());
}

document.getElementById("currentMonth").textContent =
    "Current Month: " + localStorage.getItem("currentMonth");

// Reset month
document.getElementById("resetMonth").addEventListener("click", () => {
    if (!confirm("Are you sure you want to reset the month?")) return;

    // Clear tables
    sales = [];
    expenses = [];
    totalTime = 0;

    localStorage.removeItem("sales");
    localStorage.removeItem("expenses");
    localStorage.removeItem("totalTime");

    // Update month
    const newMonth = getCurrentMonthString();
    localStorage.setItem("currentMonth", newMonth);
    document.getElementById("currentMonth").textContent =
        "Current Month: " + newMonth;

    updateTotals();
    updateAllocationPanel();
});
