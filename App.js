// Load saved data
let salesData = JSON.parse(localStorage.getItem("salesData")) || [];

// Render dashboard + table
function render() {
    const summary = document.getElementById("summary");
    const body = document.getElementById("inventoryBody");

    body.innerHTML = "";

    let totalSales = 0;
    let totalCost = 0;

    salesData.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.date}</td>
            <td>${row.item}</td>
            <td>$${row.cost}</td>
            <td>$${row.sale}</td>
            <td>${row.platform}</td>
        `;
        body.appendChild(tr);

        totalSales += Number(row.sale);
        totalCost += Number(row.cost);
    });

    summary.innerHTML = `
        <p><strong>Total Sales:</strong> $${totalSales.toFixed(2)}</p>
        <p><strong>Total Cost:</strong> $${totalCost.toFixed(2)}</p>
        <p><strong>Profit:</strong> $${(totalSales - totalCost).toFixed(2)}</p>
    `;
}

render();

// CSV Upload Handler
document.getElementById("uploadBtn").addEventListener("click", () => {
    const file = document.getElementById("csvUpload").files[0];
    if (!file) {
        alert("Please select a CSV file first.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        parseCSV(text);
    };
    reader.readAsText(file);
});

// Basic CSV parser
function parseCSV(text) {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");

        rows.push({
            date: cols[0],
            item: cols[1],
            cost: cols[2],
            sale: cols[3],
            platform: cols[4]
        });
    }

    salesData = [...salesData, ...rows];
    localStorage.setItem("salesData", JSON.stringify(salesData));
    render();

    alert("CSV uploaded successfully.");
}
