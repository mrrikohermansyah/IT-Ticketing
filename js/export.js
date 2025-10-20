// ======================================================
// 🔹 js/export.js - Excel Export Functionality (Updated Borders)
// ======================================================

// ==================== 🔹 ExcelJS Loader ====================
function loadExcelJS() {
  return new Promise((resolve, reject) => {
    if (window.ExcelJS) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ==================== 🔹 Helper Functions ====================
function formatDateForExcel(ts) {
  if (!ts) return "-";
  const date = ts.toDate ? ts.toDate() : new Date(ts);

  if (isNaN(date.getTime())) {
    return "-";
  }

  return date;
}

function calculateDurationForExport(ticket) {
  if (!ticket.createdAt) {
    return "-";
  }

  const ticketStatus = ticket.status_ticket || "Open";
  const hasClosedAt = !!ticket.closedAt;

  if (ticketStatus !== "Closed" || !hasClosedAt) {
    return "-";
  }

  const createdDate = ticket.createdAt.toDate
    ? ticket.createdAt.toDate()
    : new Date(ticket.createdAt);

  const endDate = ticket.closedAt.toDate
    ? ticket.closedAt.toDate()
    : new Date(ticket.closedAt);

  const diffMs = endDate - createdDate;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes > 0) {
    return `${diffMinutes} Minute${diffMinutes > 1 ? "s" : ""}`;
  } else {
    return "Less than 1 Minute";
  }
}

// ==================== 🔹 Wrapper Function for HTML Button ====================
async function handleExportToExcel() {
  try {
    console.log("🔍 Debug export state:");
    console.log("window.allTickets:", window.allTickets);
    console.log("Type:", typeof window.allTickets);
    console.log("Is Array:", Array.isArray(window.allTickets));

    const allTickets = window.allTickets || (await recoverTicketsData());
    const filterSelect = document.getElementById("filterSelect");

    if (!allTickets || !Array.isArray(allTickets)) {
      await Swal.fire({
        title: "Data Not Available",
        html: `
          <div style="text-align: left;">
            <p>Tickets data is not available for export.</p>
            <p><strong>Possible solutions:</strong></p>
            <ul>
              <li>Refresh the page and try again</li>
              <li>Wait for data to load completely</li>
              <li>Check if you have any tickets created</li>
            </ul>
          </div>
        `,
        icon: "warning",
      });
      return;
    }

    await exportToExcel(allTickets, filterSelect);
  } catch (error) {
    console.error("❌ Export handler error:", error);
    await Swal.fire({
      title: "Export Failed",
      text: "Could not start export process. Please try again.",
      icon: "error",
    });
  }
}

// ==================== 🔹 Data Recovery Function ====================
async function recoverTicketsData() {
  try {
    const savedTickets = localStorage.getItem("tickets-backup");
    if (savedTickets) {
      const parsedTickets = JSON.parse(savedTickets);
      console.log("🔄 Recovered tickets from backup:", parsedTickets.length);
      return parsedTickets;
    }

    const possibleSources = [
      window.ticketData,
      window.tickets,
      window.allTicketsArray,
      window.appState?.tickets,
      window.data?.tickets,
    ];

    for (const source of possibleSources) {
      if (source && Array.isArray(source)) {
        console.log("🔄 Found tickets in alternative source:", source.length);
        return source;
      }
    }

    return null;
  } catch (error) {
    console.error("❌ Recovery failed:", error);
    return null;
  }
}

// ==================== 🔹 Main Export Function ====================
async function exportToExcel(allTickets, filterSelect) {
  try {
    if (!allTickets) {
      console.error("❌ allTickets is undefined or null");
      throw new Error("Tickets data is not available (undefined)");
    }

    if (!Array.isArray(allTickets)) {
      console.error(
        "❌ allTickets is not an array:",
        typeof allTickets,
        allTickets
      );
      throw new Error("Tickets data is not a valid array");
    }

    console.log("📊 Exporting tickets:", allTickets.length);
    console.log("🔍 Sample ticket:", allTickets[0]);

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

    await loadExcelJS();

    if (!allTickets || allTickets.length === 0) {
      await Swal.fire({
        title: "No Data",
        text: "Tidak ada data tiket untuk diekspor.",
        icon: "warning",
      });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Aktivitas IT");

    // ===== FONTS & STYLE DASAR =====
    workbook.creator = "Riko Hermansyah";
    sheet.properties.defaultRowHeight = 20;

    // ===== JUDUL UTAMA =====
    sheet.mergeCells("A1:H1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "AKTIVITAS-AKTIVITAS IT / IT ACTIVITIES";
    titleCell.font = {
      name: "Times New Roman",
      italic: true,
      size: 18,
      bold: true,
    };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    
    // BORDER TEBAAL untuk judul utama
    titleCell.border = {
      top: { style: "thick" },
      left: { style: "thick" },
      bottom: { style: "thick" },
      right: { style: "thick" },
    };
    
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE6E6E6" },
    };

    // ===== BARIS KOSONG =====
    sheet.addRow([]);

    // ===== BARIS PERIOD =====
    const now = new Date();
    const periodText = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    sheet.mergeCells("A3:H3");
    const periodCell = sheet.getCell("A3");
    periodCell.value = `Period: ${periodText}`;
    periodCell.font = { name: "Arial", size: 11, bold: true };
    periodCell.alignment = { horizontal: "left", vertical: "middle" };
    
    // BORDER TEBAAL untuk period
    periodCell.border = {
      top: { style: "thick" },
      left: { style: "thick" },
      bottom: { style: "thick" },
      right: { style: "thick" },
    };

    // ===== BARIS KOSONG =====
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

    // BORDER TEBAAL untuk semua header
    headerRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thick" },
        left: { style: "thick" },
        bottom: { style: "thick" },
        right: { style: "thick" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFEFEF" },
      };
    });

    sheet.getRow(headerRow.number).height = 69 * 0.75;

    // ===== ISI DATA DARI TICKETS =====
    const filteredTickets =
      filterSelect && filterSelect.value !== "all"
        ? allTickets.filter((t) => t.status_ticket === filterSelect.value)
        : allTickets;

    console.log("🔍 Filtered tickets for export:", filteredTickets.length);

    const deviceMapping = window.CONFIG
      ? window.CONFIG.DEVICE_TYPE_MAPPING
      : {
          "PC Hardware": "HW",
          Laptop: "HW",
          Printer: "HW",
          Projector: "HW",
          "PC Software": "SW",
          Network: "NW",
          Others: "OT",
        };

    filteredTickets.forEach((ticket) => {
      const durationText = calculateDurationForExport(ticket);
      const kendaliMutu =
        ticket.qa ||
        (ticket.status_ticket === "Closed" ? "Finish" : "Continue");

      const deviceCode = ticket.code || deviceMapping[ticket.device] || "OT";

      const rowData = [
        formatDateForExcel(ticket.createdAt),
        ticket.inventory || "-",
        deviceCode,
        ticket.location ? "Bintan / " + ticket.location : "Bintan / -",
        ticket.subject || "-",
        ticket.name || "-",
        durationText,
        kendaliMutu,
      ];

      const row = sheet.addRow(rowData);

      // BORDER TITIK-TITIK KECIL untuk data rows
      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Arial", size: 10 };
        
        // Gunakan dotted yang lebih kecil/halus
        cell.border = {
          top: { style: "dotted" },
          left: { style: "dotted" },
          bottom: { style: "dotted" },
          right: { style: "dotted" },
        };
        
        cell.alignment = {
          vertical: "top",
          horizontal: "left",
          wrapText: true,
        };

        // Format khusus per kolom
        if (colNumber === 1 && cell.value instanceof Date) {
          cell.numFmt = "dd/mm/yyyy";
        }

        if (colNumber === 3 || colNumber === 8) {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
          };
        }

        if (colNumber === 7) {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
          };
        }
      });
    });

    // ===== BORDER TEBAAL UNTUK SELURUH TABEL =====
    const totalRows = headerRow.number + filteredTickets.length;
    
    // Border tebal kiri untuk semua baris
    for (let i = headerRow.number; i <= totalRows; i++) {
      const leftCell = sheet.getCell(`A${i}`);
      leftCell.border = { ...leftCell.border, left: { style: "thick" } };
    }
    
    // Border tebal kanan untuk semua baris
    for (let i = headerRow.number; i <= totalRows; i++) {
      const rightCell = sheet.getCell(`H${i}`);
      rightCell.border = { ...rightCell.border, right: { style: "thick" } };
    }
    
    // Border tebal atas untuk header (sudah ada)
    // Border tebal bawah untuk baris terakhir
    if (filteredTickets.length > 0) {
      const lastRow = sheet.getRow(totalRows);
      lastRow.eachCell((cell, colNumber) => {
        cell.border = { ...cell.border, bottom: { style: "thick" } };
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
    await Swal.fire({
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
    console.error("❌ Export error:", error);
    await Swal.fire({
      title: "Export Failed",
      text:
        error.message ||
        "Terjadi kesalahan saat mengekspor data. Silakan coba lagi.",
      icon: "error",
    });
  }
}

// ==================== 🔹 Global Initialization ====================
window.allTickets = window.allTickets || [];

function updateAllTickets(newTickets) {
  if (Array.isArray(newTickets)) {
    window.allTickets = newTickets;
    try {
      localStorage.setItem("tickets-backup", JSON.stringify(newTickets));
    } catch (e) {
      console.warn("⚠️ Could not backup tickets to localStorage:", e);
    }
    console.log("✅ Updated allTickets with", newTickets.length, "tickets");
  } else {
    console.error("❌ Cannot update allTickets: invalid data");
  }
}

// Export functions for global usage
window.exportToExcel = exportToExcel;
window.handleExportToExcel = handleExportToExcel;
window.updateAllTickets = updateAllTickets;
