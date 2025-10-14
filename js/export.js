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

  // 🔹 border tebal keliling A2:H2
  for (let col = 1; col <= 8; col++) {
    const cell = sheet.getCell(2, col);
    if (col === 1) cell.border = { left: { style: "thick" } };
    if (col === 8) cell.border = { right: { style: "thick" } };
    cell.border = {
      ...cell.border,
      top: { style: "thick" },
      bottom: { style: "thick" },
    };
  }

  // ===== BARIS PERIOD =====
  const now = new Date();
  const periodText = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

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
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thick" },
      left: { style: "thick" },
      bottom: { style: "thick" },
      right: { style: "thick" },
    };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
  });
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

      // Format tanggal
      if (i === 0 && value) {
        const cleanDate = value.split(",")[0].trim();
        const parts = cleanDate.split("/");
        if (parts.length === 3) {
          const [d, m, y] = parts;
          const fullYear = y.length === 2 ? "20" + y : y;
          const dateObj = new Date(`${fullYear}-${m}-${d}`);
          value = dateObj instanceof Date && !isNaN(dateObj) ? dateObj : cleanDate;
        }
      }

      // Lokasi → tambah "Bintan /"
      if (i === 3 && value) {
        value = "Bintan / " + value;
      }

      rowData.push(value);
    }

    const row = sheet.addRow(rowData);

    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.border = {
        top: { style: "hair" },
        left: { style: "hair" },
        bottom: { style: "hair" },
        right: { style: "hair" },
      };
      cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };

      if (colNumber === 1 && cell.value instanceof Date) {
        cell.numFmt = "dd/mm/yyyy";
        cell.alignment = { vertical: "top", horizontal: "right" };
      }
      if (colNumber === 3 || colNumber === 8) {
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      }
    });
  });

  // ===== TAMBAHKAN 2 BARIS KOSONG DI BAWAH =====
  for (let i = 0; i < 2; i++) {
    const extraRow = sheet.addRow(["", "", "", "", "", "", "", ""]);
    extraRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.border = {
        top: { style: "hair" },   // bukan tebal
        bottom: { style: "hair" },
        left: { style: "hair" },
        right: { style: "hair" },
      };
      if (colNumber === 1) cell.border.left = { style: "thick" };
      if (colNumber === 8) cell.border.right = { style: "thick" };
    });
  }

  // ===== TEBAL KELILING TABEL =====
  const lastRow = sheet.lastRow.number;
  const firstRow = headerRow.number;
  for (let r = firstRow; r <= lastRow; r++) {
    for (let c = 1; c <= 8; c++) {
      const cell = sheet.getCell(r, c);
      if (r === firstRow) cell.border.top = { style: "thick" };
      if (r === lastRow) cell.border.bottom = { style: "thick" };
      if (c === 1) cell.border.left = { style: "thick" };
      if (c === 8) cell.border.right = { style: "thick" };
    }
  }

  // ===== ATUR LEBAR KOLOM =====
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
