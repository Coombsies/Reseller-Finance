document.getElementById("loadBtn").addEventListener("click", () => {
    const fileInput = document.getElementById("csvFile");
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a CSV file first.");
        return;
    reader.onload = function (e) {
        const text = e.target.result;
        const rows = text.split("\n").map(r => r.split(","));
        window.currentCSV = rows;
        renderTable(rows);
        // This triggers the math immediately after the table is built
        calculateFinancials(); 
    };

    const reader = new FileReader();

    reader.readAsText(file);
});

function renderTable(rows) {
    const table = document.getElementById("dataTable");
    table.innerHTML = "";

    rows.forEach((row, rowIndex) => {
        const tr = document.createElement("tr");

        row.forEach((cell, colIndex) => {
            const td = document.createElement(rowIndex === 0 ? "th" : "td");

            if (rowIndex === 0) {
                td.textContent = cell;
                if (colIndex === row.length - 1) {
                    const th = document.createElement("th");
                    th.textContent = "Manual Cost";
                    tr.appendChild(th);
                }
            } else {
                const input = document.createElement("input");
                input.value = cell;
                input.style.width = "100px";
                input.addEventListener("input", () => {
                    window.currentCSV[rowIndex][colIndex] = input.value;
                });
                td.appendChild(input);
            }
            tr.appendChild(td);
        });

        // Add the Manual Cost input for each row
        if (rowIndex > 0) {
            const td = document.createElement("td");
            const costInput = document.createElement("input");
            costInput.placeholder = "Enter Cost";
            costInput.type = "number";
            costInput.dataset.row = rowIndex;
            costInput.addEventListener("input", (e) => {
                // We store this in a new property in your data array
                window.currentCSV[rowIndex].manualCost = e.target.value;
            });
            td.appendChild(costInput);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    });
}
function calculateFinancials() {
    let totalNetSales = 0;
    let totalManualCosts = 0;
    const SALARY = 4400;

    // Start at 1 to skip the header row
    for (let i = 1; i < window.currentCSV.length; i++) {
        // Index 11 is 'Net Sales' from your eBay CSV
        totalNetSales += parseFloat(window.currentCSV[i][11]) || 0;
        
        // This targets the manual cost we added to the row object
        totalManualCosts += parseFloat(window.currentCSV[i].manualCost) || 0;
    }

    const netProfit = totalNetSales - (totalManualCosts + SALARY);
    const savings = netProfit * 0.20;
    const budget = netProfit * 0.80;

    document.getElementById("totalProfit").textContent = `$${netProfit.toFixed(2)}`;
    document.getElementById("savingsAmount").textContent = `$${savings.toFixed(2)}`;
    document.getElementById("budgetAmount").textContent = `$${budget.toFixed(2)}`;
}
document.getElementById("downloadBtn").addEventListener("click", () => {
    if (!window.currentCSV) {
        alert("No CSV loaded.");
        return;
    }

    const csvContent = window.currentCSV.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "updated.csv";
    a.click();

    URL.revokeObjectURL(url);
});
