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
    const month = now.getMonth() + 1;

    const grace = new Date(year, month, 1, 23, 59, 59);

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
// CSV PARSER
// ------------------------------
function parseCSV(text) {
  const rows = [];
  let current = "";
  let insideQuotes = false;
  let row = [];

  for (let char of text) {
    if (char === '"' && !insideQuotes) insideQuotes = true;
    else if (char === '"' && insideQuotes) insideQuotes = false;
    else if (char === "," && !insideQuotes) {
      row.push(current.trim());
      current = "";
    } else if (char === "\n" && !insideQuotes) {
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = "";
    } else current += char;
  }

  if (current.length > 0) row.push(current.trim());
  if (row.length > 0) rows.push(row);

  return rows;
}

// ------------------------------
// CSV UPLOAD
// ------------------------------
document.getElementById("loadCsvBtn").addEventListener("click", async () => {
  if (await isMonthLocked()) {
    alert("This month is locked.");
    return;
  }

  const file = document.getElementById("csvFileInput").files[0];
  if (!file) {
    document.getElementById("uploadStatus").textContent = "No file selected.";
    return;
  }

  const text = await file.text();
  const rows = parseCSV(text);
  rows.shift();

  for (let r of rows) {
    const [title, qty, totalSales, totalCosts, cogs] = r;

    const nQty = toNum(qty);
    const nSales = toNum(totalSales);
    const nCosts = toNum(totalCosts);
    const nCogs = toNum(cogs);

    await addDoc(salesCol, {
      title,
      qty: nQty,
      totalSales: nSales,
      totalCosts: nCosts,
      cogs: nCogs,
      profit: nSales - nCosts - nCogs
    });
  }

  document.getElementById("uploadStatus").textContent = "CSV imported successfully.";
});

// ------------------------------
// REAL-TIME LISTENERS
// ------------------------------
onSnapshot(salesCol, (snapshot) => {
  const sales = [];
  snapshot.forEach(docSnap => sales.push({ id: docSnap.id, ...docSnap.data() }));
  renderSales(sales);
  updateSummary(sales);
  updateMonthProfit(sales);
});

onSnapshot(purchasesCol, (snapshot) => {
  const purchases = [];
  snapshot.forEach(docSnap => purchases.push({ id: docSnap.id, ...docSnap.data() }));
  renderPurchases(purchases);
  updateInventorySpent(purchases);
});

onSnapshot(settingsDoc, (snapshot) => {
  if (snapshot.exists()) {
    document.getElementById("salaryGoalInput").value = snapshot.data().value;
  }
});

onSnapshot(monthsCol, (snapshot) => {
  const months = [];
  snapshot.forEach(docSnap => months.push({ id: docSnap.id, ...docSnap.data() }));
  renderMonthArchive(months);
});

// ------------------------------
// MANUAL SALE
// ------------------------------
document.getElementById("addSaleBtn").addEventListener("click", async () => {
  if (await isMonthLocked()) {
    alert("This month is locked.");
    return;
  }

  const title = document.getElementById("manualTitle").value;
  const totalSales = toNum(document.getElementById("manualSale").value);
  const totalCosts = toNum(document.getElementById("manualCosts").value);
  const cogs = toNum(document.getElementById("manualCogs").value);

  await addDoc(salesCol, {
    title,
    qty: 1,
    totalSales,
    totalCosts,
    cogs,
    profit: totalSales - totalCosts - cogs
  });

  document.getElementById("manualStatus").textContent = "Sale added.";
});

// ------------------------------
// PURCHASE ENTRY
// ------------------------------
document.getElementById("addPurchaseBtn").addEventListener("click", async () => {
  if (await isMonthLocked()) {
    alert("This month is locked.");
    return;
  }

  const desc = document.getElementById("purchaseDesc").value;
  const amount = toNum(document.getElementById("purchaseAmount").value);

  await addDoc(purchasesCol, { description: desc, amount });

  document.getElementById("purchaseStatus").textContent = "Purchase added.";
});

// ------------------------------
// SALARY GOAL
// ------------------------------
document.getElementById("updateSalaryGoalBtn").addEventListener("click", async () => {
  const value = toNum(document.getElementById("salaryGoalInput").value);
  await setDoc(settingsDoc, { value });
});

// ------------------------------
// RENDER FUNCTIONS
// ------------------------------
function renderSales(sales) {
  const body = document.getElementById("salesTableBody");
  body.innerHTML = "";

  sales.forEach(s => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${s.title}</td>
      <td>${s.qty}</td>
      <td>$${(s.totalSales || 0).toFixed(2)}</td>
      <td>$${(s.totalCosts || 0).toFixed(2)}</td>
      <td><input type="number" value="${s.cogs || 0}" data-id="${s.id}" class="cogsInput"></td>
      <td>$${(s.profit || 0).toFixed(2)}</td>
    `;
    body.appendChild(row);
  });

  document.querySelectorAll(".cogsInput").forEach(input => {
    input.addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      const newCogs = toNum(e.target.value);

      const snap = await getDoc(doc(salesCol, id));
      const data = snap.data();

      const nSales = data.totalSales || 0;
      const nCosts = data.totalCosts || 0;

      await updateDoc(doc(salesCol, id), {
        cogs: newCogs,
        profit: nSales - nCosts - newCogs
      });
    });
  });
}

function renderPurchases(purchases) {
  const body = document.getElementById("purchaseTableBody");
  body.innerHTML = "";

  purchases.forEach(p => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.description}</td>
      <td>$${(p.amount || 0).toFixed(2)}</td>
    `;
    body.appendChild(row);
  });
}

function renderMonthArchive(months) {
  const body = document.getElementById("monthArchiveBody");
  body.innerHTML = "";

  months.forEach(m => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${m.id}</td>
      <td>$${(m.profit || 0).toFixed(2)}</td>
      <td>$${(m.salaryPaid || 0).toFixed(2)}</td>
      <td>$${(m.inventoryBudget || 0).toFixed(2)}</td>
      <td>$${(m.inventorySpent || 0).toFixed(2)}</td>
      <td>$${(m.businessSavings || 0).toFixed(2)}</td>
    `;
    body.appendChild(row);
  });
}

// ------------------------------
// SUMMARY
// ------------------------------
function updateSummary(sales) {
  const revenue = sales.reduce((a, s) => a + (s.totalSales || 0), 0);
  const cogs = sales.reduce((a, s) => a + (s.cogs || 0), 0);
  const profit = sales.reduce((a, s) => a + (s.profit || 0), 0);

  document.getElementById("totalRevenue").textContent = `$${revenue.toFixed(2)}`;
  document.getElementById("totalCogs").textContent = `$${cogs.toFixed(2)}`;
  document.getElementById("totalProfit").textContent = `$${profit.toFixed(2)}`;
}

function updateMonthProfit(sales) {
  const profit = sales.reduce((a, s) => a + (s.profit || 0), 0);
  document.getElementById("monthProfit").textContent = `$${profit.toFixed(2)}`;
}

function updateInventorySpent(purchases) {
  const spent = purchases.reduce((a, p) => a + (p.amount || 0), 0);
  document.getElementById("inventorySpent").textContent = `$${spent.toFixed(2)}`;
}

// ------------------------------
// CLEAR ALL SALES DATA
// ------------------------------
document.getElementById("clearDataBtn").addEventListener("click", async () => {
  const snap = await getDocs(salesCol);
  const deletions = [];
  snap.forEach(d => deletions.push(deleteDoc(doc(salesCol, d.id))));
  await Promise.all(deletions);

  document.getElementById("clearStatus").textContent = "All sales data cleared.";
});

// ------------------------------
// STARTUP
// ------------------------------
document.getElementById("closeMonthBtn").addEventListener("click", closeMonthManually);
ensureMonthExists();
