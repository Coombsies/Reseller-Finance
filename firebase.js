import { db } from "./firebase.js";

document.getElementById("csvFile").addEventListener("change", handleCSV);
document.getElementById("clearBtn").addEventListener("click", clearResults);

function handleCSV(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    processCSV(text);
  };
  reader.readAsText(file);
}

function processCSV(csv) {
  const rows = csv.split("\n").map(r => r.split(","));
  let total = 0;

  rows.forEach(row => {
    const value = parseFloat(row[1]);
    if (!isNaN(value)) total += value;
  });

  document.getElementById("results").innerHTML = `
    <p><strong>Total:</strong> $${total.toFixed(2)}</p>
  `;
}

function clearResults() {
  document.getElementById("results").innerHTML = "";
  document.getElementById("csvFile").value = "";
}
