document.getElementById("loadBtn").addEventListener("click", () => {
    const fileInput = document.getElementById("csvFile");
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a CSV file first.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const rows = text.split("\n").map(r => r.split(","));
        renderTable(rows);
        window.currentCSV = rows;
    };
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
            } else {
                const input = document.createElement("input");
                input.value = cell;
                input.addEventListener("input", () => {
                    window.currentCSV[rowIndex][colIndex] = input.value;
                });
                td.appendChild(input);
            }

            tr.appendChild(td);
        });

        table.appendChild(tr);
    });
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
