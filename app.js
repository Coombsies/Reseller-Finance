import { db } from "./firebase.js";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  getDocs,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// DOM elements – stats
const currentMonthLabel = document.getElementById("currentMonthLabel");
const totalSalesEl = document.getElementById("totalSales");
const totalCogsEl = document.getElementById("totalCogs");
const totalExpensesEl = document.getElementById("totalExpenses");
const netProfitEl = document.getElementById("netProfit");
const totalTimeEl = document.getElementById("totalTime");
const profitPerHourEl = document.getElementById("profitPerHour");

// DOM elements – breakdown
const salaryGoalLabel = document.getElementById("salaryGoalLabel");
const salaryPaidLabel = document.getElementById("salaryPaidLabel");
const breakdownNetProfitEl = document.getElementById("breakdownNetProfit");
const remainingProfitLabel = document.getElementById("remainingProfitLabel");
const safetyNetLabel = document.getElementById("safetyNetLabel");
const inventoryBudgetLabel = document.getElementById("inventoryBudgetLabel");
const salaryProgressFill = document.getElementById("salaryProgressFill");
const salaryProgressPercent = document.getElementById("salaryProgressPercent");

// DOM elements – inputs
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

// Timer state
let saleTimerStart = null;
let saleTimerMinutes = 0;

// Config
const SALARY_GOAL = 4400;
const SAFETY_NET_RATE = 0.2;

// Collections
const salesCol = collection(db, "sales");
const expensesCol = collection(db, "expenses");
const settingsDocRef = doc(db, "settings", "app");
const monthsCol = collection(db, "months");

// Helpers
function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function formatTimeFromMinutes(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}h ${mins}m`;
}

function getCurrentMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthLabelFromKey(key) {
  const [year, month] = key.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleString("default", { month: "long", year: "numeric" });
}

// Timer logic
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

// Add sale
addSaleBtn.addEventListener("click", async () => {
  const item = saleItemEl.value.trim();
  const salePrice = parseFloat(salePriceEl.value);
  const cost = parseFloat(saleCostEl.value);

  if (!item || isNaN(salePrice) || isNaN(cost)) return;

  const profit = salePrice - cost;
  const monthKey = getCurrentMonthKey();

  await addDoc(salesCol, {
    item,
    salePrice,
    cost,
    profit,
    minutes: saleTimerMinutes || 0,
    monthKey,
    createdAt: Date.now()
  });

  saleItemEl.value = "";
  salePriceEl.value = "";
  saleCostEl.value = "";
  saleTimerMinutes = 0;
  saleTimerDisplayEl.textContent = "Time: 0m";

  await refreshData();
});

// Add expense
addExpenseBtn.addEventListener("click", async () => {
  const label = expenseLabelEl.value.trim();
  const amount = parseFloat(expenseAmountEl.value);

  if (!label || isNaN(amount)) return;

  const monthKey = getCurrentMonthKey();

  await addDoc(expensesCol, {
    label,
    amount,
    monthKey,
    createdAt: Date.now()
  });

  expenseLabelEl.value = "";
  expenseAmountEl.value = "";

  await refreshData();
});

// CSV upload
uploadCsvBtn.addEventListener("click", async () => {
  const file = csvFileEl.files[0];
  if (!file) return;

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const monthKey = getCurrentMonthKey();

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
      monthKey,
      createdAt: Date.now()
    });
  }

  csvFileEl.value = "";
  await refreshData();
});

// Force reset month (manual)
resetMonthBtn.addEventListener("click", async () => {
  if (!confirm("Force reset month? This will delete all current sales and expenses.")) return;

  const currentMonthKey = getCurrentMonthKey();
  await archiveAndClearMonth(currentMonthKey);
  await setDoc(settingsDocRef, { currentMonthKey }, { merge: true });
  await refreshData();
});

// Month rollover logic
async function ensureMonthState() {
  const today = new Date();
  const currentMonthKey = getCurrentMonthKey(today);

  const settingsSnap = await getDoc(settingsDocRef);
  let storedMonthKey = settingsSnap.exists()
    ? settingsSnap.data().currentMonthKey
    : null;

  if (!storedMonthKey) {
    // First run: set current month
    await setDoc(settingsDocRef, { currentMonthKey }, { merge: true });
    storedMonthKey = currentMonthKey;
  }

  // If month changed, archive previous month and reset
  if (storedMonthKey !== currentMonthKey) {
    await archiveAndClearMonth(storedMonthKey);
    await setDoc(settingsDocRef, { currentMonthKey }, { merge: true });
  }

  currentMonthLabel.textContent = getMonthLabelFromKey(currentMonthKey);
}

// Archive previous month and clear its sales/expenses
async function archiveAndClearMonth(monthKey) {
  if (!monthKey) return;

  const salesSnap = await getDocs(salesCol);
  const expensesSnap = await getDocs(expensesCol);

  const monthSales = salesSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => s.monthKey === monthKey);

  const monthExpenses = expensesSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(e => e.monthKey === monthKey);

  const totals = calculateTotals(monthSales, monthExpenses);

  const monthDocRef = doc(monthsCol, monthKey);
  await setDoc(monthDocRef, {
    monthKey,
    archivedAt: Date.now(),
    ...totals
  });

  // Delete archived docs
  for (const s of monthSales) {
    await deleteDoc(doc(db, "sales", s.id));
  }
  for (const e of monthExpenses) {
    await deleteDoc(doc(db, "expenses", e.id));
  }
}

// Totals + breakdown
function calculateTotals(sales, expenses) {
  const totalSales = sales.reduce((sum, s) => sum + (s.salePrice || 0), 0);
  const totalCogs = sales.reduce((sum, s) => sum + (s.cost || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalProfit = totalSales - totalCogs - totalExpenses;
  const totalMinutes = sales.reduce((sum, s) => sum + (s.minutes || 0), 0);
  const totalHours = totalMinutes / 60 || 0;
  const profitPerHour = totalHours > 0 ? totalProfit / totalHours : 0;

  const salaryPaid = Math.max(0, Math.min(totalProfit, SALARY_GOAL));
  const remaining = totalProfit - salaryPaid;
  const safetyNet = remaining > 0 ? remaining * SAFETY_NET_RATE : 0;
  const inventoryBudget = remaining - safetyNet;

  return {
    totalSales,
    totalCogs,
    totalExpenses,
    totalProfit,
    totalMinutes,
    profitPerHour,
    salaryPaid,
    remaining,
    safetyNet,
    inventoryBudget
  };
}

// Render functions
async function refreshData() {
  await ensureMonthState();

  const currentMonthKey = getCurrentMonthKey();

  const salesSnap = await getDocs(salesCol);
  const expensesSnap = await getDocs(expensesCol);

  const sales = salesSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => s.monthKey === currentMonthKey);

  const expenses = expensesSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(e => e.monthKey === currentMonthKey);

  renderSales(sales);
  renderExpenses(expenses);
  updateStatsAndBreakdown(sales, expenses);
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

function updateStatsAndBreakdown(sales, expenses) {
  const totals = calculateTotals(sales, expenses);

  totalSalesEl.textContent = formatCurrency(totals.totalSales);
  totalCogsEl.textContent = formatCurrency(totals.totalCogs);
  totalExpensesEl.textContent = formatCurrency(totals.totalExpenses);
  netProfitEl.textContent = formatCurrency(totals.totalProfit);
  totalTimeEl.textContent = formatTimeFromMinutes(totals.totalMinutes);
  profitPerHourEl.textContent = formatCurrency(totals.profitPerHour) + "/hr";

  salaryGoalLabel.textContent = formatCurrency(SALARY_GOAL);
  salaryPaidLabel.textContent = formatCurrency(totals.salaryPaid);
  breakdownNetProfitEl.textContent = formatCurrency(totals.totalProfit);
  remainingProfitLabel.textContent = formatCurrency(totals.remaining);
  safetyNetLabel.textContent = formatCurrency(totals.safetyNet);
  inventoryBudgetLabel.textContent = formatCurrency(
    totals.inventoryBudget < 0 ? 0 : totals.inventoryBudget
  );

  const progress =
    SALARY_GOAL > 0
      ? Math.max(0, Math.min(1, totals.salaryPaid / SALARY_GOAL))
      : 0;
  salaryProgressFill.style.width = `${progress * 100}%`;
  salaryProgressPercent.textContent = `${Math.round(progress * 100)}%`;
}

// Initial load
refreshData().catch(console.error);
