// ==================== EXPORT TO EXCEL ====================
function exportToExcel() {
  // Data header sesuai gambar
  const header = [
    "Tgl. / Date",
    "Kode Inv. (uraian) / Inv. Code (Description)",
    "Kode / Code",
    "Lokasi / Location¹",
    "Keterangan / Remarks",
    "Pengguna / User",
    "Durasi / Duration",
    "Kendali Mutu / Quality Assurance",
  ];

  // Ambil data dari tabel admin
  const rows = [];
  const trs = document.querySelectorAll("#ticketsTable tbody tr");
  trs.forEach((tr) => {
    const cells = [...tr.querySelectorAll("td")].map((td) =>
      td.innerText.trim()
    );
    // 🔹 Kolom ke-3 (index 3) = Lokasi
    if (cells[3]) {
      cells[3] = "Bintan / " + cells[3];
    }
    rows.push(cells);
  });

  // Gabungkan header + data
  const data = [header, ...rows];

  // Buat worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Buat workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tickets");

  // Export
  XLSX.writeFile(wb, "tickets.xlsx");
}



