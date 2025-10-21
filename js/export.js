// ======================================================
// 🔹 js/export.js - Excel Export with Empty Rows (Dotted Borders)
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

// ==================== 🔹 Get Currently Displayed Tickets ====================
function getCurrentlyDisplayedTickets() {
  try {
    console.log("🔍 Getting currently displayed tickets...");

    // ✅ OPTION 1: Jika ada admin.js dengan function getDisplayedTickets
    if (typeof window.getDisplayedTickets === "function") {
      const tickets = window.getDisplayedTickets();
      console.log("✅ Using admin.js getDisplayedTickets:", tickets.length);
      return tickets;
    }

    // ✅ OPTION 2: Coba deteksi filter dari DOM dan apply manual
    const filterSelect = document.getElementById("filterSelect");
    const actionByFilter = document.getElementById("actionByFilter");
    const allTickets = window.allTickets || [];

    if (allTickets.length === 0) {
      console.warn("⚠️ No tickets available");
      return [];
    }

    let filteredTickets = allTickets;

    // Apply status filter
    if (filterSelect && filterSelect.value !== "all") {
      filteredTickets = filteredTickets.filter(
        (t) => t.status_ticket === filterSelect.value,
      );
    }

    // Apply action_by filter
    if (actionByFilter && actionByFilter.value !== "all") {
      filteredTickets = filteredTickets.filter(
        (t) => t.action_by === actionByFilter.value,
      );
    }

    console.log("✅ Applied filters manually:", {
      original: allTickets.length,
      filtered: filteredTickets.length,
      statusFilter: filterSelect?.value,
      actionByFilter: actionByFilter?.value,
    });

    return filteredTickets;
  } catch (error) {
    console.error("❌ Error getting displayed tickets:", error);
    return window.allTickets || [];
  }
}

// ==================== 🔹 Get Current Filter Info ====================
function getCurrentFilterInfo() {
  try {
    const filterSelect = document.getElementById("filterSelect");
    const actionByFilter = document.getElementById("actionByFilter");

    const activeFilters = [];

    if (filterSelect && filterSelect.value !== "all") {
      activeFilters.push(
        `Status: ${filterSelect.options[filterSelect.selectedIndex].text}`,
      );
    }

    if (actionByFilter && actionByFilter.value !== "all") {
      activeFilters.push(
        `IT Staff: ${actionByFilter.options[actionByFilter.selectedIndex].text}`,
      );
    }

    return activeFilters.length > 0 ? activeFilters.join(", ") : "All Tickets";
  } catch (error) {
    console.error("❌ Error getting filter info:", error);
    return "All Tickets";
  }
}

// ==================== 🔹 Wrapper Function for HTML Button ====================
async function handleExportToExcel() {
  try {
    console.log("🔍 Starting export process...");

    // ✅ GUNAKAN TICKETS YANG SEDANG DITAMPILKAN
    const displayedTickets = getCurrentlyDisplayedTickets();
    const filterInfo = getCurrentFilterInfo();

    if (
      !displayedTickets ||
      !Array.isArray(displayedTickets) ||
      displayedTickets.length === 0
    ) {
      // Fallback ke semua tickets jika tidak ada yang ditampilkan
      const allTickets = window.allTickets || [];

      if (
        !allTickets ||
        !Array.isArray(allTickets) ||
        allTickets.length === 0
      ) {
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

      console.log("🔄 Using all tickets as fallback:", allTickets.length);
      await exportToExcel(allTickets, "All Tickets");
    } else {
      console.log(
        "📊 Exporting currently displayed tickets:",
        displayedTickets.length,
      );
      await exportToExcel(displayedTickets, filterInfo);
    }
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
async function exportToExcel(displayedTickets, filterInfo = "All Tickets") {
  try {
    if (!displayedTickets) {
      console.error("❌ displayedTickets is undefined or null");
      throw new Error("Tickets data is not available (undefined)");
    }

    if (!Array.isArray(displayedTickets)) {
      console.error(
        "❌ displayedTickets is not an array:",
        typeof displayedTickets,
        displayedTickets,
      );
      throw new Error("Tickets data is not a valid array");
    }

    console.log("📊 Exporting tickets:", displayedTickets.length);
    console.log("🔍 Active filter:", filterInfo);

    const { value: accept } = await Swal.fire({
      title: "Export to Excel",
      html: `
        <div style="text-align: center; padding: 1rem;">
          <i class="fa-solid fa-file-excel" style="font-size: 3rem; color: #217346; margin-bottom: 1rem;"></i>
          <p>Export ${displayedTickets.length} tickets to Excel format?</p>
          <p style="font-size: 0.9rem; color: #666;"><strong>Filter:</strong> ${filterInfo}</p>
          <p style="font-size: 0.8rem; color: #888;">Hanya data yang sedang ditampilkan yang akan diekspor</p>
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

    if (!displayedTickets || displayedTickets.length === 0) {
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

    // ===== BARIS PERIOD & FILTER INFO =====
    const now = new Date();
    const periodText = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}`;

    // Baris Period
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

    // Baris Filter Info (baris baru)
    sheet.mergeCells("A4:H4");
    const filterCell = sheet.getCell("A4");
    filterCell.value = `Filter: ${filterInfo}`;
    filterCell.font = { name: "Arial", size: 10, italic: true };
    filterCell.alignment = { horizontal: "left", vertical: "middle" };

    // BORDER TEBAAL untuk filter info
    filterCell.border = {
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

    // ===== KOLOM KOSONG ATAS (2 BARIS) =====
    const emptyRow1 = sheet.addRow(Array(8).fill(""));
    const emptyRow2 = sheet.addRow(Array(8).fill(""));

    // Border DOTTED untuk kolom kosong atas
    [emptyRow1, emptyRow2].forEach((row) => {
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "hair" },
          left: { style: "hair" },
          bottom: { style: "hair" },
          right: { style: "hair" },
        };
      });
    });

    // ===== ISI DATA DARI TICKETS YANG DITAMPILKAN =====
    const deviceMapping = window.CONFIG
      ? window.CONFIG.DEVICE_TYPE_MAPPING
      : {
          "PC Hardware": "HW",
          Laptop: "HW",
          Printer: "HW",
          Projector: "HW",
          "PC Software": "SW",
          Network: "NW",
          "Backup Data": "DR",
          Others: "OT",
        };

    displayedTickets.forEach((ticket) => {
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
        ticket.note || "-",
        ticket.name || "-",
        durationText,
        kendaliMutu,
      ];

      const row = sheet.addRow(rowData);

      // BORDER DOTTED untuk data rows
      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Arial", size: 10 };

        cell.border = {
          top: { style: "hair" },
          left: { style: "hair" },
          bottom: { style: "hair" },
          right: { style: "hair" },
        };

        cell.alignment = {
          vertical: "top",
          horizontal: "left",
          wrapText: false,
        };

        // Format khusus per kolom
        if (colNumber === 1 && cell.value instanceof Date) {
          cell.numFmt = "dd/mm/yyyy";
          cell.alignment = {
            vertical: "middle",
            horizontal: "right",
            wrapText: true,
          };
        }

        if (colNumber === 2) {
          cell.alignment = {
            vertical: "middle",
            horizontal: "left",
            wrapText: false,
          };
        }

        if (colNumber === 3) {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
          };
        }
        if (colNumber === 8) {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
          };
        }

        if (colNumber === 7) {
          cell.alignment = {
            vertical: "middle",
            horizontal: "left",
            wrapText: true,
          };
        }
      });
    });

    // ===== KOLOM KOSONG BAWAH (2 BARIS) =====
    const emptyRowBottom1 = sheet.addRow(Array(8).fill(""));
    const emptyRowBottom2 = sheet.addRow(Array(8).fill(""));

    // Border DOTTED untuk kolom kosong bawah
    [emptyRowBottom1, emptyRowBottom2].forEach((row) => {
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "hair" },
          left: { style: "hair" },
          bottom: { style: "hair" },
          right: { style: "hair" },
        };
      });
    });

    // ===== BORDER TEBAAL UNTUK SELURUH TABEL =====
    const totalRows = headerRow.number + displayedTickets.length + 4; // +4 untuk 2 baris kosong atas + 2 baris kosong bawah

    // Border tebal kiri untuk semua baris (dari header sampai baris kosong bawah terakhir)
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
    // Border tebal bawah untuk baris terakhir (baris kosong bawah ke-2)
    const lastRow = sheet.getRow(totalRows);
    lastRow.eachCell((cell, colNumber) => {
      cell.border = { ...cell.border, bottom: { style: "thick" } };
    });

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

    // Buat nama file yang mencerminkan filter
    const filterSuffix =
      filterInfo !== "All Tickets"
        ? `_${filterInfo.replace(/[^a-zA-Z0-9]/g, "_")}`
        : "";
    a.download = `Aktivitas_IT_Report_${
      new Date().toISOString().split("T")[0]
    }${filterSuffix}.xlsx`;

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
          <p>${displayedTickets.length} tickets exported successfully!</p>
          <p style="font-size: 0.9rem; color: #666;"><strong>Filter:</strong> ${filterInfo}</p>
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
window.getCurrentFilterInfo = getCurrentFilterInfo;

console.log("✅ Export JS loaded successfully");
