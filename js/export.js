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
    const tds = tr.querySelectorAll("td");
    const rowData = [];

    tds.forEach((td) => {
      const select = td.querySelector("select");
      let value = "";

      if (select) {
        // Ambil teks dari option yang dipilih
        const selectedOption = select.options[select.selectedIndex];
        value = selectedOption ? selectedOption.text.trim() : "";
      } else {
        // Ambil teks biasa dari cell
        value = td.innerText.trim();
      }

      rowData.push(value);
    });

    // Kolom ke-3 (index 3) = Lokasi
    if (rowData[3]) {
      rowData[3] = "Bintan / " + rowData[3];
    }

    rows.push(rowData);
  });

  // Gabungkan header + data
  const data = [header, ...rows];

  // 🔹 Tambahkan ini
  console.log("Data untuk Excel:", data);

  // Buat worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Buat workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tickets");

  // Export
  XLSX.writeFile(wb, "tickets.xlsx");
}
