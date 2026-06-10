// ------------------------------
// FIREBASE IMPORTS
// ------------------------------
import { db } from "./firebase.js";
import {
  collection, doc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, onSnapshot, addDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ------------------------------
// FIXED USER ID
// ------------------------------
const uid = "coombsies";

// Firestore paths
const salesCol = collection(db, "users", uid, "sales");
const purchasesCol = collection(db, "users", uid, "purchases");
const monthsCol = collection(db, "users", uid, "months");
const settingsDoc = doc(db, "users", uid, "settings", "salaryGoal");

// ------------------------------
// HELPERS
// ------------------------------
function toNum(v) {
  return Number(String(v || "0").replace(/[^0-9.-]/g, ""));
}

function fmt(n) {
  return `$${(n || 0).toFixed(2)}`;
}

// ------------------------------
// MONTH LOGIC
// ------------------------------
async function getCurrentMonthDoc() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const id = `${year}-${month}`;

  document.getElementById("currentMonthName").textContent = id;
  return doc(monthsCol, id);
}

async function ensureMonthExists() {
  const monthDoc = await getCurrentMonthDoc();
  const snap = await getDoc(monthDoc);

  if (!snap.exists()) {
    const now = new Date();
    const year = now.getFullYear();
    const grace = new Date(year, now.getMonth() + 1, 1, 23, 59, 59);

    await setDoc(monthDoc, {
      profit: 0,
      salaryPaid: 0,
      inventoryBudget: 0,
      inventorySpent: 0,
      businessSavings: 0,
      isLocked: false,
      gracePeriodEnds: grace.toISOString()
    });
  }
}

async function isMonthLocked() {
  const monthDoc = await getCurrentMonthDoc();
  const snap = await getDoc(monthDoc);
  if (!snap.exists()) return false;

  const data = snap.data();
  const now = new Date();
  const grace = new Date(data.gracePeriodEnds);

  if (now > grace && !data.isLocked) {
    await updateDoc(monthDoc, { isLocked: true });
    return true;
  }

  return data.isLocked;
}

async function closeMonthManually() {
  const monthDoc = await getCurrentMonthDoc();
  const snap = await getDoc(monthDoc);
  if (!snap.exists()) return;

  await updateDoc(monthDoc, { isLocked: true });

  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextId = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  const grace = new Date(next.getFullYear(), next.getMonth() + 1, 1, 23, 59, 59);

  await setDoc(doc(monthsCol, nextId), {
    profit: 0,
    salaryPaid: 0,
    inventoryBudget: 0,
    inventorySpent: 0,
    businessSavings: 0,
    isLocked: false,
    gracePeriodEnds: grace.toISOString()
  });

  document.getElementById("monthStatus").textContent = "Month closed and next month created.";
}

// ------------------------------
// MONTH FINANCIALS
// ------------------------------
async function updateMonthFinancials(sales, purchases) {
  const monthDoc = await getCurrentMonthDoc();

  const profit = sales.reduce((a, s) => a + (s.profit || 0), 0);
  const spent = purchases.reduce((a, p) => a + (p.amount || 0), 0);

  const salarySnap = await getDoc(settingsDoc);
  const salaryGoal = salarySnap.exists() ? (salarySnap.data().value || 0) : 0;

  const remaining = profit - salaryGoal;
  const inventoryBudget = remaining > 0 ? remaining * 0.75 : 0;
  const businessSavings = remaining > 0 ? remaining * 0.25 : 0;

  await updateDoc(monthDoc, {
    profit,
    salaryPaid: salaryGoal,
    inventoryBudget,
    inventorySpent: spent,
    businessSavings
  });

  // Update UI
  document.getElementById("monthProfit").textContent = fmt(profit);
  document.getElementById("salaryPaid").textContent = fmt(salaryGoal);
  document.getElementById("remainingProfit").textContent = fmt(remaining);
  document.getElementById("inventoryBudget").textContent = fmt(inventoryBudget);
  document.getElementById("inventorySpent").textContent = fmt(spent);
  document.getElementById("businessSavings").textContent = fmt(businessSavings);

  const inventoryRemaining = inventoryBudget - spent;
  document.getElementById("inventoryRemaining").textContent = fmt(inventoryRemaining);
}

// ------------------------------
// EXTRA METRICS (SELL-THROUGH, AVG SALE)
// ------------------------------
function updateExtraMetrics(sales) {
  const totalQty = sales.reduce((a, s) => a + (s.qty || 0), 0);
  const totalRevenue = sales.reduce((a, s) => a + (s.totalSales || 
