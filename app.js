let sales = [];
let purchases = [];

/* ===== UTIL ===== */
function money(n) {
  return `$${n.toFixed(2)}`;
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

/* ===== CSV PARSE (eBay-style) ===== */
function parseCsvFile(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
    if (lines.length < 2) return;

    const header = lines[0].split(",");
    const map = {};

    header.forEach((h, i) => {
      const key = h.toLowerCase();
      if (key.includes("date")) map.date = i;
      if (key.includes("title")) map.title = i;
      if (key.includes("sold") || key.includes("sale") || key.includes("amount")) map.sale = i;
      if (key.includes("shipping")) map.shipping = i;
      if (key.includes("fee")) map.fees = i;
      if (key.includes("cost") || key.includes("cogs")) map.cogs = i;
      if (key.includes("platform") || key.includes("site")) map.platform = i;
    });

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      if (cols.length < header.length) continue;

      sales.push({
        date: cols[map.date] || "",
        platform: map.platform !== undefined ? (cols[map.platform] || "eBay") : "eBay",
        title: cols[map.title] || "",
        saleAmount: num(cols[map.sale]),
        shipping: num(cols[map.shipping]),
        fees: num(cols[map.fees]),
        cogs: num(cols[map.cogs])
      });
    }

    render();
  };

  reader.readAsText(file);
}

/* ===== RENDER ===== */
function renderSales() {
  const body = document.getElementById("salesTableBody");
  body.innerHTML = "";

  sales.forEach((s, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.date}</td>
      <td>${s.platform}</td>
      <td>${s.title}</td>
      <td>${money(s.saleAmount)}</td>
      <td>${money(s.shipping)}</td>
      <td>${money(s.fees)}</td>
      <td>${money(s.cogs)}</td>
      <td>${money(s.saleAmount + s.shipping - s.fees - s.cogs)}</td>
      <td><button class="danger" data-del-sale="${i}">X</button></td>
    `;
    body.appendChild(tr);
  });
}

function renderPurchases() {
  const body = document.getElementById("purchasesTableBody");
  body.innerHTML = "";

  purchases.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.date}</td>
      <td>${p.source}</td>
      <td>${p.description}</td>
      <td>${money(p.amount)}</td>
      <td><button class="danger" data-del-purchase="${i}">X</button></td>
    `;
    body.appendChild(tr);
  });
}

function renderMetrics() {
  const revenue = sales.reduce((a, s) => a + s.saleAmount + s.shipping, 0);
  const cogs = sales.reduce((a, s) => a + s.cogs, 0);
  const fees = sales.reduce((a, s) => a + s.fees, 0);
  const profit = revenue - cogs - fees;

  document.getElementById("totalRevenue").textContent = money(revenue);
  document.getElementById("totalCOGS").textContent = money(cogs);
  document.getElementById("totalProfit").textContent = money(profit);

  const str = purchases.length ? (sales.length / purchases.length) * 100 : 0;
  document.getElementById("sellThroughRate").textContent = str.toFixed(1) + "%";

  const avgSale = sales.length ? sales.reduce((a, s) => a + s.saleAmount, 0) / sales.length : 0;
  const avgCogs = sales.length ? sales.reduce((a, s) => a + s.cogs, 0) / sales.length : 0;

  document.getElementById("avgSalePrice").textContent = money(avgSale);
  document.getElementById("avgCOGS").textContent = money(avgCogs);
}

function render() {
  renderSales();
  renderPurchases();
  renderMetrics();
}

/* ===== EVENTS ===== */
document.addEventListener("DOMContentLoaded", () => {
  const csvInput = document.getElementById("csvUpload");
  if (csvInput) {
    csvInput.addEventListener("change", e => {
      if (e.target.files.length) {
        parseCsvFile(e.target.files[0]);
      }
    });
  }

  document.getElementById("addSaleBtn").addEventListener("click", () => {
    sales.push({
      date: saleDate.value,
      platform: salePlatform.value || "Manual",
      title: saleTitle.value,
      saleAmount: num(saleAmount.value),
      shipping: num(saleShipping.value),
      fees: num(saleFees.value),
      cogs: num(saleCOGS.value)
    });
    render();
  });

  document.getElementById("clearSalesBtn").addEventListener("click", () => {
    sales = [];
    render();
  });

  document.getElementById("addPurchaseBtn").addEventListener("click", () => {
    purchases.push({
      date: purchaseDate.value,
      source: purchaseSource.value,
      description: purchaseDescription.value,
      amount: num(purchaseAmount.value)
    });
    render();
  });

  document.body.addEventListener("click", e => {
    if (e.target.dataset.delSale !== undefined) {
      sales.splice(Number(e.target.dataset.delSale), 1);
      render();
    }
    if (e.target.dataset.delPurchase !== undefined) {
      purchases.splice(Number(e.target.dataset.delPurchase), 1);
      render();
    }
  });

  render();
});
