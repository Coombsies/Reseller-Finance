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
// CSV UPLOAD HANDLER
// ------------------------------
document.getElementById("loadCsvBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("csvFileInput");
  const file = fileInput.files[0];
  if (!file) {
    document.getElementById("uploadStatus").textContent = "No file selected.";
    return;
  }

  const text = await file.text();
  const rows = parseCSV(text);
  rows.shift(); // remove header

  for (let r of rows) {
    const [title, qty, totalSales, totalCosts, cogs] = r;

    await addDoc(salesCol, {
      title,
      qty: Number(qty),
      totalSales: Number(totalSales),
      totalCosts: Number(totalCosts),
      cogs: Number(cogs || 0),
      profit: Number(totalSales) - Number(totalCosts) - Number(cogs || 0)
    });
  }

  document.getElementById("uploadStatus").textContent = "CSV imported successfully.";
});

// ------------------------------
// REAL-TIME LISTENERS
// ------------------------------
onSnapshot(salesCol, (snapshot) => {
  const sales = [];
  snapshot.forEach(doc => sales.push({ id: doc.id, ...doc.data() }));
  renderSales(sales);
  updateSummary(sales);
  updateMonthProfit(sales);
});

onSnapshot(purchasesCol, (snapshot) => {
  const purchases = [];
  snapshot.forEach(doc => purchases.push({ id: doc.id, ...doc.data() }));
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
  snapshot.forEach(doc => months.push({ id: doc.id, ...doc.data() }));
  renderMonthArchive(months);
});

// ------------------------------
// MANUAL SALE ENTRY
// ------------------------------
document.getElementById("addSaleBtn").addEventListener("click", async () => {
  const title = document.getElementById("manualTitle").value;
  const totalSales = Number(document.getElementById("manualSale").value);
  const totalCosts = Number(document.getElementById("manualCosts").value);
  const cogs = Number(document.getElementById("manualCogs").value);

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
  const desc = document.getElementById("purchaseDesc").value;
  const amount = Number(document.getElementById("purchaseAmount").value);

  await addDoc(purchasesCol, { description: desc, amount });

  document.getElementById("purchaseStatus").textContent = "Purchase added.";
});

// ------------------------------
// SALARY GOAL
// ------------------------------
document.getElementById("updateSalaryGoalBtn").addEventListener("click", async () => {
  const value = Number(document.getElementById("salaryGoalInput").value);
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
      <td>$${s.totalSales.toFixed(2)}</td>
      <td>$${s.totalCosts.toFixed(2)}</td>
      <td><input type="number" value="${s.cogs}" data-id="${s.id}" class="cogsInput"></td>
      <td>$${s.profit.toFixed(2)}</td>
    `;
    body.appendChild(row);
  });

  document.querySelectorAll(".cogsInput").forEach(input => {
    input.addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      const newCogs = Number(e.target.value);

      const snap = await getDoc(doc(salesCol, id));
      const data = snap.data();

      await updateDoc(doc(salesCol, id), {
        cogs: newCogs,
        profit: data.totalSales - data.totalCosts - newCogs
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
      <td>$${p.amount.toFixed(2)}</td>
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
      <td>$${m.profit.toFixed(2)}</td>
      <td>$${m.salaryPaid.toFixed(2)}</td>
      <td>$${m.inventoryBudget.toFixed(2)}</td>
      <td>$${m.inventorySpent.toFixed(2)}</td>
      <td>$${m.businessSavings.toFixed(2)}</td>
    `;
    body.appendChild(row);
  });
}

// ------------------------------
// SUMMARY CALCULATIONS
// ------------------------------
function updateSummary(sales) {
  const revenue = sales.reduce((a, s) => a + s.totalSales, 0);
  const cogs = sales.reduce((a, s) => a + s.cogs, 0);
  const profit = sales.reduce((a, s) => a + s.profit, 0);

  document.getElementById("totalRevenue").textContent = `$${revenue.toFixed(2)}`;
  document.getElementById("totalCogs").textContent = `$${cogs.toFixed(2)}`;
  document.getElementById("totalProfit").textContent = `$${profit.toFixed(2)}`;
}

function updateMonthProfit(sales) {
  const profit = sales.reduce((a, s) => a + s.profit, 0);
  document.getElementById("monthProfit").textContent = `$${profit.toFixed(2)}`;
}

function updateInventorySpent(purchases) {
  const spent = purchases.reduce((a, p) => a + p.amount, 0);
  document.getElementById("inventorySpent").textContent = `$${spent.toFixed(2)}`;
}
