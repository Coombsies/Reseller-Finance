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
  let
