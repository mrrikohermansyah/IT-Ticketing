// ==================== 🔹 Export to Excel Function ====================
async function exportToExcel() {
  try {
    // Show loading state
    const { value: accept } = await Swal.fire({
      title: "Export to Excel",
      html: `
        <div style="text-align: center; padding: 1rem;">
          <i class="fa-solid fa-file-excel" style="font-size: 3rem; color: #217346; margin-bottom: 1rem;"></i>
          <p>Export ${allTickets.length} tickets to Excel format?</p>
          <p style="font-size: 0.9rem; color: #666;">File akan berisi semua data tiket yang terlihat.</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Export Now",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#217346",
    });

    if (!accept) return;

    // Load ExcelJS library dynamically
    await loadExcelJS();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Aktivitas IT");

    // ===== FONTS & STYLE DASAR =====
    workbook.creator = "Riko Hermansyah";
    sheet.properties.defaultRowHeight = 20;

    // ===== JUDUL UTAMA dengan border tebal =====
    sheet.mergeCells("A1:H1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "AKTIVITAS-AKTIVITAS IT / IT ACTIVITIES";
    titleCell.font = {
      name: "Times New Roman",
      italic: true,
      size: 18,
      bold: true,
    };
    titleCell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    titleCell.border = {
      top: { style: "medium" },
      left: { style: "medium" },
      bottom: { style: "medium" },
      right: { style: "medium" },
    };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE6E6E6" },
    };

    // ===== BARIS KOSONG =====
    sheet.addRow([]);

    // ===== BARIS PERIOD dengan border tebal =====
    const now = new Date();
    const periodText = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    // Merge cells untuk period
    sheet.mergeCells("A3:H3");
    const periodCell = sheet.getCell("A3");
    periodCell.value = `Period: ${periodText}`;
    periodCell.font = { name: "Arial", size: 11, bold: true };
    periodCell.alignment = { horizontal: "left", vertical: "middle" };
    periodCell.border = {
      top: { style: "medium" },
      left: { style: "medium" },
      bottom: { style: "thin" },
      right: { style: "medium" },
    };

    // ===== BARIS KOSONG =====
    sheet.addRow([]);

    // ===== HEADER TABEL dengan border tebal =====
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
    headerRow.font = {
      bold: true,
      name: "Arial",
      size: 10,
      color: { argb: "FF000000" },
    };
    headerRow.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    // Set border tebal untuk header
    headerRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "medium" },
        left: { style: "medium" },
        bottom: { style: "medium" },
        right: { style: "medium" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFEFEF" },
      };
    });

    // 🔹 TINGGI BARIS HEADER
    sheet.getRow(headerRow.number).height = 69 * 0.75;

    // ===== DEVICE TYPE MAPPING =====
    const deviceTypeMapping = {
      // Hardware devices → HW
      "PC Hardware": "HW",
      Laptop: "HW",
      Printer: "HW",
      Projector: "HW",
      // Software devices → SW
      "PC Software": "SW",
      // Network devices → NW
      Network: "NW",
      // Default untuk device lain
      Others: "OT",
    };

    // ===== ISI DATA DARI TICKETS =====
    const filteredTickets =
      filterSelect && filterSelect.value !== "all"
        ? allTickets.filter((t) => t.status === filterSelect.value)
        : allTickets;

    filteredTickets.forEach((ticket) => {
      // Format duration untuk Excel (dalam menit saja)
      const durationText = formatDurationForExcel(ticket);

      // Kendali Mutu: Finish jika status Closed, Continue untuk status lain
      const kendaliMutu = ticket.status === "Closed" ? "Finish" : "Continue";

      // Map device type ke kode yang sesuai
      const deviceCode = deviceTypeMapping[ticket.device] || "OT";

      const rowData = [
        // Tgl. / Date
        formatDateForExcel(ticket.createdAt),
        // Kode Inv. (uraian) / Inv. Code (Description)
        ticket.inventory || "-",
        // Kode / Code - MAPPED DEVICE CODE
        deviceCode,
        // Lokasi / Location¹
        ticket.location ? "Bintan / " + ticket.location : "Bintan / -",
        // Keterangan / Remarks
        ticket.subject || "-",
        // Pengguna / User
        ticket.name || "-",
        // Durasi / Duration (dalam menit)
        durationText,
        // Kendali Mutu / Quality Assurance
        kendaliMutu,
      ];

      const row = sheet.addRow(rowData);

      // Set border dotted untuk data rows
      row.eachCell((cell, colNumber) => {
        cell.font = {
          name: "Arial",
          size: 10,
        };

        // Border dotted untuk data
        cell.border = {
          top: { style: "dotted" },
          left: { style: "dotted" },
          bottom: { style: "dotted" },
          right: { style: "dotted" },
        };

        // Default alignment
        cell.alignment = {
          vertical: "top",
          horizontal: "left",
          wrapText: true,
        };

        // Kolom tanggal = format tanggal
        if (colNumber === 1 && cell.value instanceof Date) {
          cell.numFmt = "dd/mm/yyyy";
        }

        // Kolom ke-3 (Kode) & kolom ke-8 (Kendali Mutu) rata tengah
        if (colNumber === 3 || colNumber === 8) {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
          };
        }

        // Kolom Duration rata tengah
        if (colNumber === 7) {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
          };
        }
      });
    });

    // ===== BORDER BAGIAN BAWAH TABEL =====
    if (filteredTickets.length > 0) {
      const lastRow = sheet.getRow(headerRow.number + filteredTickets.length);
      lastRow.eachCell((cell, colNumber) => {
        cell.border = {
          ...cell.border,
          bottom: { style: "medium" },
        };
      });
    }

    // ===== ATUR LEBAR KOLOM =====
    const pxToChar = (px) => Math.round(px / 7);
    const widthsPx = [80, 113, 86, 181, 487, 126, 126, 124];
    widthsPx.forEach((px, i) => {
      sheet.getColumn(i + 1).width = pxToChar(px);
    });

    // ===== SIMPAN FILE =====
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Aktivitas_IT_Report_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show success message
    Swal.fire({
      title: "Export Successful!",
      html: `
        <div style="text-align: center; padding: 1rem;">
          <i class="fa-solid fa-check-circle" style="font-size: 3rem; color: #28a745; margin-bottom: 1rem;"></i>
          <p>${filteredTickets.length} tickets exported successfully!</p>
          <p style="font-size: 0.9rem; color: #666;">File telah didownload ke perangkat Anda.</p>
        </div>
      `,
      icon: "success",
      timer: 3000,
      showConfirmButton: false,
    });
  } catch (error) {
    console.error("Export error:", error);
    Swal.fire({
      title: "Export Failed",
      text: "Terjadi kesalahan saat mengekspor data. Silakan coba lagi.",
      icon: "error",
    });
  }
}
