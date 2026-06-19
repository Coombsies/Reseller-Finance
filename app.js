/* ============================================================
   LOCAL STORAGE KEYS
============================================================ */
const STORAGE_KEYS = {
  sales: "rf_sales",
  purchases: "rf_purchases",
  settings: "rf_settings",
  months: "rf_months"
};

/* ============================================================
   HELPERS
============================================================ */
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function toNum(v) {
  return Number(String(v || "0").replace(/[^0-9.-]/g, ""));
}

function formatCurrency(n) {
  return `$${(n || 0).toFixed(2)}`;
}

function getCurrentMonthId() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/* ============================================================
   LOAD DATA
============================================================ */
let sales = loadJSON(STORAGE_KEYS.sales, []);
let purchases = loadJSON(STORAGE_KEYS.purchases, []);
let settings = loadJSON(STORAGE_KEYS.settings, { salaryGoal: 0 });
let months = loadJSON(STORAGE_KEYS.months, {});

/* ============================================================
   MONTH LOGIC
============================================================ */
function ensureMonthExists(monthId) {
  if (!months[monthId]) {
    months[monthId] = {
      profit: 0,
      salaryPaid: 0,
      inventoryBudget: 0,
      inventorySpent: 0,
      businessSavings: 0,
      salaryPayments: [],
      isLocked: false
    };
    saveJSON(STORAGE_KEYS.months, months);
  }
}

function getCurrentMonth() {
  const id = getCurrentMonthId();
  ensureMonthExists(id);
  document.getElementById("currentMonthName").textContent = id;
  return { id, data: months[id] };
}

/* ============================================================
   CSV PARSER
============================================================ */
function parseCsv(text) {
  const rows = [];
  let current = "";
  let insideQuotes = false;
  let row = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (current.length > 0 || row.length > 0) {
        row.push(current);
        rows.push(row);
        row = [];
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current
