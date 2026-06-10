// app.js — Firestore Synced Version
import { db } from "./firebase.js";
import {
  collection, doc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, onSnapshot, addDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Fixed user ID for now (upgradeable later)
const uid = "coombsies";

// Firestore paths
const salesCol = collection(db, "users", uid, "sales");
const purchasesCol = collection(db, "users", uid, "purchases");
const monthsCol = collection(db, "users", uid, "months");
const settingsDoc = doc(db, "users", uid, "settings", "salaryGoal");

// -----------------------------
// REAL-TIME LISTENERS
// -----------------------------

onSnapshot(salesCol, (snapshot) => {
  const sales = [];
  snapshot.forEach(doc => sales.push({ id: doc.id, ...doc.data() }));
  renderSales(sales);
  updateSummary(sales);
});

onSnapshot(purchasesCol, (snapshot) => {
  const purchases = [];
  snapshot.forEach(doc => purchases.push({ id: doc.id, ...doc.data() }));
  renderPurchases(purchases);
});

onSnapshot(settingsDoc, (snapshot) => {
  if (snapshot.exists()) {
    document.getElementById("salaryGoal").value = snapshot.data().value;
  }
});

onSnapshot(monthsCol, (snapshot) => {
  const months = [];
  snapshot.forEach(doc => months.push({ id: doc.id, ...doc.data() }));
  renderMonthArchive(months);
});

// -----------------------------
// SAVE FUNCTIONS
// -----------------------------

async function saveSale(sale) {
  await addDoc(salesCol, sale);
}

async function updateSale(id, data) {
  await updateDoc(doc(salesCol, id), data);
}

async function savePurchase(purchase) {
  await addDoc(purchasesCol, purchase);
}

async function saveSalaryGoal(value) {
  await setDoc(settingsDoc, { value });
}

async function saveMonth(monthId, data) {
  await setDoc(doc(monthsCol, monthId), data);
}

// -----------------------------
// CSV PARSER (your working version)
// -----------------------------

function parseCSV(csvText) {
  const rows = [];
  let current = "";
  let insideQuotes = false;
  let row = [];

  for (let char of csvText) {
    if (char === '"' && !insideQuotes) {
      insideQuotes = true;
    } else if (char === '"' && insideQuotes) {
      insideQuotes = false;
    } else if (char === "," && !insideQuotes) {
      row.push(current.trim());
      current = "";
    } else if (char === "\n" && !insideQuotes) {
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current.length > 0) row.push(current.trim());
  if (row.length > 0) rows.push(row);

  return rows;
}

// -----------------------------
// CSV IMPORT HANDLER
// -----------------------------

document.getElementById("csvFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const rows = parseCSV(text);

  rows.shift(); // remove header

  for (let r of rows) {
    const [title, qty, totalSales, totalCosts, cogs] = r;

    await saveSale({
      title,
      qty: Number(qty),
      totalSales: Number(totalSales),
      totalCosts: Number(totalCosts),
      cogs: Number(cogs || 0),
      profit: Number(totalSales) - Number(totalCosts) - Number(cogs || 0)
    });
  }
});

// -----------------------------
// MANUAL SALE ENTRY
// -----------------------------

document.getElementById("addSaleBtn").addEventListener("click", async () => {
  const title = document.getElementById("manualTitle").value;
  const totalSales = Number(document.getElementById("manualSales").value);
  const totalCosts = Number(document.getElementById("manualCosts").value);
  const cogs = Number(document.getElementById("manualCogs").value);

  await saveSale({
    title,
    qty: 1,
    totalSales,
    totalCosts,
    cogs,
    profit: totalSales - totalCosts - cogs
  });
});

// -----------------------------
// RENDER FUNCTIONS
// -----------------------------

function renderSales(sales) {
  const table = document.getElementById("salesTableBody");
  table.innerHTML = "";

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
    table.appendChild(row);
  });

  document.querySelectorAll(".cogsInput").forEach(input => {
    input.addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      const newCogs = Number(e.target.value);

      await updateSale(id, {
        cogs: newCogs,
        profit: (await getDoc(doc(salesCol, id))).data().totalSales
              - (await getDoc(doc(salesCol, id))).data().totalCosts
              - newCogs
      });
    });
  });
}

function renderPurchases(purchases) {
  const table = document.getElementById("purchaseTableBody");
  table.innerHTML = "";

  purchases.forEach(p => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.description}</td>
      <td>$${p.amount.toFixed(2)}</td>
    `;
    table.appendChild(row);
  });
}

function renderMonthArchive(months) {
  const table = document.getElementById("monthArchiveBody");
  table.innerHTML = "";

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
    table.appendChild(row);
  });
}

// -----------------------------
// SUMMARY CALCULATIONS
// -----------------------------

function updateSummary(sales) {
  const totalRevenue = sales.reduce((a, s) => a + s.totalSales, 0);
  const totalCogs = sales.reduce((a, s) => a + s.cogs, 0);
  const totalProfit = sales.reduce((a, s) => a + s.profit, 0);

  document.getElementById("totalRevenue").innerText = `$${totalRevenue.toFixed(2)}`;
  document.getElementById("totalCogs").innerText = `$${totalCogs.toFixed(2)}`;
  document.getElementById("totalProfit").innerText = `$${totalProfit.toFixed(2)}`;
}

// -----------------------------
// SALARY GOAL SAVE
// -----------------------------

document.getElementById("salaryGoal").addEventListener("change", async (e) => {
  await saveSalaryGoal(Number(e.target.value));
});
