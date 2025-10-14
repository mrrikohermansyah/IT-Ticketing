async function exportToExcel() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Aktivitas IT");

  // ===== FONTS & STYLE DASAR =====
  workbook.creator = "Riko Hermansyah";
  sheet.properties.defaultRowHeight = 20;

  // ===== JUDUL UTAMA =====
  sheet.mergeCells("A2:H2");
  const title = sheet.getCell("A2");
  title.value = "AKTIVITAS-AKTIVITAS IT / IT ACTIVITIES";
  title.font = { name: "Times New Roman", italic: true, size: 18 };
  title.alignment = { horizontal: "center", vertical: "middle" };

  // ===== BARIS PERIOD =====
  const now = new Date();
  const periodText = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  sheet.getCell("E4").value = "Period :";
  sheet.getCell("E4").font = { name: "Arial", size: 10 };
  sheet.getCell("E4").alignment = { horizontal: "right", vertical: "middle" };

  sheet.getCell("F4").value = periodText;
  sheet.getCell("F4").font = { name: "Arial", size: 10 };
  sheet.getCell("F4").alignment = { horizontal: "left", vertical: "middle" };

  // ===== BARIS KOSONG SEBELUM HEADER =====
  sheet.addRow([]);

  // ===== HEADER TABEL =====
  const headers = [
    "Tgl. / Date",
    "Kode Inv. (uraian) / Inv. Code (Description)",
    "Kode / Code",
    "Lokasi / Location¹",
    "Keterangan / Remarks",
    "Pengguna / User",
    "Durasi / Duration",
    "Kendali Mutu / Quality Assurance",
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, name: "Arial", size: 10 };
  headerRow.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  headerRow.eachCell((cell, colNumber) => {
    cell.border = {
      top: { style: "dotted" },
      left: { style: "dotted" },
      bottom: { style: "dotted" },
      right: { style: "dotted" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFEFEF" },
    };
    // header kolom tanggal rata kanan
    if (colNumber === 1) {
      cell.alignment = {
        vertical: "middle",
        horizontal: "right",
        wrapText: true,
      };
    }
  });

  // 🔹 TINGGI BARIS HEADER = 69 pixel (≈ 52 point)
  sheet.getRow(headerRow.number).height = 69 * 0.75;

  // ===== ISI DATA DARI TABEL HTML =====
  const trs = document.querySelectorAll("#ticketsTable tbody tr");
  trs.forEach((tr) => {
    const tds = tr.querySelectorAll("td");
    const rowData = [];

    for (let i = 0; i < 8; i++) {
      const td = tds[i];
      let value = "";
      if (td) {
        const select = td.querySelector("select");
        value = select
          ? select.options[select.selectedIndex]?.text.trim() || ""
          : td.innerText.trim();
      }

      // ===== FORMAT TANGGAL =====
      if (i === 0 && value) {
        const cleanDate = value.split(",")[0].trim();
        const parts = cleanDate.split("/");
        if (parts.length === 3) {
          const [d, m, y] = parts;
          const fullYear = y.length === 2 ? "20" + y : y;
          const dateObj = new Date(`${fullYear}-${m}-${d}`);
          value =
            dateObj instanceof Date && !isNaN(dateObj) ? dateObj : cleanDate;
        }
      }

      // ===== TAMBAHKAN “Bintan / ” UNTUK KOLOM LOKASI =====
      if (i === 3 && value) {
        value = "Bintan / " + value;
      }

      rowData.push(value);
    }

    const row = sheet.addRow(rowData);

    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.border = {
        top: { style: "dotted" },
        left: { style: "dotted" },
        bottom: { style: "dotted" },
        right: { style: "dotted" },
      };

      // Default rata atas & kiri
      cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };

      // Kolom tanggal = format tanggal + rata kanan
      if (colNumber === 1 && cell.value) {
        if (cell.value instanceof Date) {
          cell.numFmt = "dd/mm/yyyy";
        }
        cell.alignment = {
          vertical: "middle",
          horizontal: "right",
          wrapText: true,
        };
      }

      // Kolom ke-3 (Kode) & kolom ke-8 (Kendali Mutu) rata tengah
      if (colNumber === 3 || colNumber === 8) {
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
      }
    });
  });

  // ===== ATUR LEBAR KOLOM (pixel → karakter) =====
  const pxToChar = (px) => Math.round(px / 7);
  const widthsPx = [80, 113, 86, 181, 487, 126, 126, 124];
  widthsPx.forEach((px, i) => {
    sheet.getColumn(i + 1).width = pxToChar(px);
  });

  // ===== SIMPAN FILE =====
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "Aktivitas_IT_Report.xlsx"
  );
}
