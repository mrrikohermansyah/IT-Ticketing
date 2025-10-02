// ==================== Export Excel ====================
function exportToExcel() {
  const table = document.getElementById("ticketsTable");
  if (!table) {
    alert("❌ Tabel tidak ditemukan!");
    return;
  }
  const wb = XLSX.utils.table_to_book(table, { sheet: "Tickets" });
  XLSX.writeFile(wb, "tickets.xlsx");
}

// ==================== Export PDF ====================
function exportToPDF() {
  const table = document.getElementById("ticketsTable");
  if (!table) {
    alert("❌ Tabel tidak ditemukan!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("l", "pt", "a4"); // landscape, point, A4

  doc.text("📋 Laporan Tiket IT", 40, 40);

  doc.autoTable({
    html: "#ticketsTable",
    startY: 60,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] }, // biru untuk header
  });

  doc.save("tickets.pdf");
}
