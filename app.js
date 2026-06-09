// Simple Reseller Finance Dashboard
// - CSV upload
// - LocalStorage persistence
// - Profit calculations
// - Manual add sale

const STORAGE_KEY = "reseller_finance_sales_v1";

let sales = [];

// ---------- Helpers ----------

function loadSalesFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      sales = [];
      return;
    }
    sales = JSON.parse(raw);
    if (!Array.isArray(sales)) sales = [];
  } catch (e) {
    console.error("Failed to load storage", e);
    sales = [];
  }
}

function saveSalesToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
  } catch (e) {
    console.error("Failed to save storage", e);
  }
}

function formatCurrency(value) {
  const num = Number(value) || 0;
  return `$${num.toFixed(2)}`;
}

// ---------- CSV Parsing ----------

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = lines[0].split(",");
  const mapIndex = (names) => {
    const lowerHeader = header.map((h) => h.trim().toLowerCase());
    for (const name of names) {
      const idx = lowerHeader.indexOf(name.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idxTitle = mapIndex(["item title", "title", "name"]);
  const idxSale = mapIndex(["sale", "sale price", "total sale", "sold price"]);
  const idxShipping = mapIndex(["shipping", "postage", "shipping and handling"]);
  const idxFees = mapIndex(["fees", "ebay fees", "total fees"]);
  const idxCogs = mapIndex(["cogs", "cost", "cost of goods", "purchase cost"]);

  const parsed = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length === 0) continue;

    const title =
      idxTitle !== -1 ? cols[idxTitle].trim() : `Item ${i.toString()}`;
    const sale = idxSale !== -1 ? Number(cols[idxSale]) || 0 : 0;
    const shipping =
      idxShipping !== -1 ? Number(cols[idxShipping]) || 0 : 0;
    const fees = idxFees !== -1 ? Number(cols[idxFees]) || 0 : 0;
    const cogs = idxCogs !== -1 ? Number(cols[idxCogs]) || 0 : 0;

    const profit = sale + shipping - fees - cogs;

    parsed.push({
      title,
      sale,
      shipping,
      fees,
      cogs,
      profit,
    });
  }

  return parsed;
}

// ---------- Rendering ----------

function renderSalesTable() {
  const tbody = document.getElementById("salesTableBody");
  tbody.innerHTML = "";

  sales.forEach((item) => {
    const tr = document.createElement("tr");

    const tdTitle = document.createElement("td");
    tdTitle.textContent = item.title;

    const tdSale = document.createElement("td");
    tdSale.textContent = formatCurrency(item.sale);

    const tdShipping = document.createElement("td");
    tdShipping.textContent = formatCurrency(item.shipping);

    const tdFees = document.createElement("td");
    tdFees.textContent = formatCurrency(item.fees);

    const tdCogs = document.createElement("td");
    tdCogs.textContent = formatCurrency(item.cogs);

    const tdProfit = document.createElement("td");
    tdProfit.textContent = formatCurrency(item.profit);

    tr.appendChild(tdTitle);
    tr.appendChild(tdSale);
    tr.appendChild(tdShipping);
    tr.appendChild(tdFees);
    tr.appendChild(tdCogs);
    tr.appendChild(tdProfit);

    tbody.appendChild(tr);
  });
}

function renderSummary() {
  let totalRevenue = 0;
  let totalCogs = 0;
  let totalProfit = 0;

  sales.forEach((item) => {
    totalRevenue += Number(item.sale) || 0;
    totalCogs += Number(item.cogs) || 0;
    totalProfit += Number(item.profit) || 0;
  });

  const sellThrough =
    sales.length > 0 ? (sales.length / sales.length) * 100 : 0; // placeholder
  const avgSalePrice =
    sales.length > 0 ? totalRevenue / sales.length : 0;

  document.getElementById("totalRevenue").textContent =
    formatCurrency(totalRevenue);
  document.getElementById("totalCogs").textContent =
    formatCurrency(totalCogs);
  document.getElementById("totalProfit").textContent =
    formatCurrency(totalProfit);
  document.getElementById("sellThrough").textContent =
    sellThrough.toFixed(1) + "%";
  document.getElementById("avgSalePrice").textContent =
    formatCurrency(avgSalePrice);
}

function renderAll() {
  renderSalesTable();
  renderSummary();
}

// ---------- Event Handlers ----------

function handleLoadCsv() {
  const fileInput = document.getElementById("csvFileInput");
  const status = document.getElementById("uploadStatus");

  status.textContent = "";

  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    status.textContent = "No file selected.";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        status.textContent =
          "CSV parsed but no rows found. Check header names.";
        return;
      }

      sales = sales.concat(parsed);
      saveSalesToStorage();
      renderAll();

      status.textContent = `Loaded ${parsed.length} rows from CSV and saved.`;
    } catch (err) {
      console.error(err);
      status.textContent = "Error parsing CSV.";
    }
  };
  reader.onerror = () => {
    status.textContent = "Error reading file.";
  };

  reader.readAsText(file);
}

function handleAddSale() {
  const titleInput = document.getElementById("manualTitle");
  const saleInput = document.getElementById("manualSale");
  const shippingInput = document.getElementById("manualShipping");
  const feesInput = document.getElementById("manualFees");
  const cogsInput = document.getElementById("manualCogs");
  const status = document.getElementById("manualStatus");

  const title = titleInput.value.trim() || "Manual Sale";
  const sale = Number(saleInput.value) || 0;
  const shipping = Number(shippingInput.value) || 0;
  const fees = Number(feesInput.value) || 0;
  const cogs = Number(cogsInput.value) || 0;
  const profit = sale + shipping - fees - cogs;

  sales.push({ title, sale, shipping, fees, cogs, profit });
  saveSalesToStorage();
  renderAll();

  status.textContent = "Manual sale added and saved.";

  titleInput.value = "";
  saleInput.value = "";
  shippingInput.value = "";
  feesInput.value = "";
  cogsInput.value = "";
}

function handleClearData() {
  const status = document.getElementById("clearStatus");
  if (!confirm("Clear all saved sales data?")) {
    status.textContent = "Clear cancelled.";
    return;
  }

  sales = [];
  saveSalesToStorage();
  renderAll();
  status.textContent = "All data cleared.";
}

// ---------- Init ----------

document.addEventListener("DOMContentLoaded", () => {
  loadSalesFromStorage();
  renderAll();

  document
    .getElementById("loadCsvBtn")
    .addEventListener("click", handleLoadCsv);
  document
    .getElementById("addSaleBtn")
    .addEventListener("click", handleAddSale);
  document
    .getElementById("clearDataBtn")
    .addEventListener("click", handleClearData);
});
