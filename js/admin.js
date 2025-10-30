// ======================================================
// 🚀 js/admin.js — Optimized Admin Panel with FAST Multiple Selection Delete
// ======================================================

// ==================== 🔥 Firebase Imports ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  updateDoc,
  deleteDoc,
  getDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// ==================== 🔥 Firebase Config ====================
const firebaseConfig = {
  apiKey: "AIzaSyCQR--hn0RDvDduCjA2Opa9HLzyYn_GFIs",
  authDomain: "itticketing-f926e.firebaseapp.com",
  projectId: "itticketing-f926e",
  storageBucket: "itticketing-f926e.firebasestorage.app",
  messagingSenderId: "896370077103",
  appId: "1:896370077103:web:1d692e88b611bff838935a",
  measurementId: "G-TJCHPXG7D5",
};

// ==================== 🎯 Application State ====================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// DOM Elements
const DOM = {
  ticketTableBody: document.getElementById("ticketTableBody"),
  cardContainer: document.getElementById("cardContainer"),
  switchViewBtn: document.getElementById("switchViewBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  exportBtn: document.getElementById("exportBtn"),
  filterSelect: document.getElementById("filterSelect"),
  actionByFilter: document.getElementById("actionByFilter"),
  loginBtn: document.getElementById("loginBtn"),
  goLoginBtn: document.getElementById("goLoginBtn"),
  userInfo: document.getElementById("userInfo"),
  userName: document.getElementById("userName"),
  userTicketBtn: document.getElementById("userTicketBtn"),
};

// Application State
const AppState = {
  isCardView: false,
  allTickets: [],
  loginInProgress: false,
  ticketsUnsubscribe: null,
  durationIntervalId: null,
  currentQuickFilter: "all",
  resizeTimeout: null,
  selectedTickets: new Set(),
};

// ==================== 🛠️ Utility Functions ====================

/**
 * Get admin display name with fallback logic
 */
function getAdminDisplayName(user) {
  if (!user?.email) {
    console.log("❌ getAdminDisplayName: No user email");
    return "IT Support";
  }

  const userEmail = user.email.toLowerCase();

  // Check config mapping first
  if (window.CONFIG?.ADMIN_NAME_MAPPING) {
    const mappedName = window.CONFIG.ADMIN_NAME_MAPPING[userEmail];
    if (mappedName) return mappedName;
  }

  // Fallback to Google display name
  if (user.displayName) return user.displayName;

  // Final fallback: extract from email
  return userEmail
    .split("@")[0]
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Format ticket ID for display
 */
function formatTicketId(ticket) {
  // Use existing ticketId if available
  if (ticket.ticketId && ticket.ticketId.includes("-")) {
    return ticket.ticketId;
  }

  const codeMaps = {
    departments: {
      IT: "IT",
      HR: "HR",
      HSE: "HSE",
      QC: "QC",
      Finance: "FIN",
      Maintenance: "MNT",
      Warehouse: "WH",
      Management: "MGT",
      Procurement: "PRO",
      Engineer: "ENG",
      "Document Control": "DOC",
      Completion: "COM",
      Vendor: "VEN",
      Clinic: "CLN",
      Lainlain: "OTH",
    },
    locations: {
      "Blue Office": "BLU",
      "White Office": "WHT",
      "Green Office": "GRN",
      "Red Office": "RED",
      "White Office 2nd Fl": "W2F",
      "White Office 3rd Fl": "W3F",
      "Control Room": "CTL",
      "Dark Room": "DRK",
      HRD: "HRD",
      "IT Store": "ITS",
      "HSE Yard": "HSY",
      Maintenance: "MNT",
      "Multi Purposes Building": "MPB",
      Security: "SEC",
      Warehouse: "WH",
      "Welding School": "WLD",
      Workshop9: "WS9",
      Workshop10: "WS10",
      Workshop11: "WS11",
      Workshop12: "WS12",
      Lainlain: "OTH",
    },
    devices: {
      "PC Hardware": "HW",
      "PC Software": "SW",
      Laptop: "LP",
      Printer: "PR",
      Network: "NET",
      Projector: "PJ",
      "Backup Data": "DR",
      Others: "OT",
    },
  };

  const getCode = (value, map) =>
    map[value] || (value ? value.substring(0, 3).toUpperCase() : "GEN");

  const deptCode = getCode(ticket.department, codeMaps.departments);
  const locCode = getCode(ticket.location, codeMaps.locations);
  const deviceCode = getCode(ticket.device, codeMaps.devices);

  const dateCode = (() => {
    try {
      const timestamp = ticket.createdAt;
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      return year + month;
    } catch {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      return year + month;
    }
  })();

  // Generate consistent random code
  const randomCode = generateConsistentRandomCode(ticket);

  return `${deptCode}-${locCode}-${deviceCode}-${dateCode}-${randomCode}`;
}

/**
 * Generate consistent random code based on ticket data
 */
function generateConsistentRandomCode(ticket) {
  const seed = (
    ticket.user_email +
    ticket.subject +
    ticket.department +
    ticket.location
  ).toLowerCase();

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash = hash & hash;
  }

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";

  for (let i = 0; i < 3; i++) {
    const index = Math.abs(hash + i * 123) % chars.length;
    result += chars.charAt(index);
  }

  return result;
}

/**
 * Validate ticket before save
 */
function validateTicketBeforeSave(ticketData) {
  const closedStatuses = ["Closed", "Resolved"];

  if (closedStatuses.includes(ticketData.status_ticket) && !ticketData.note) {
    throw new Error("🛑 Harap isi Technician Notes sebelum menutup ticket!");
  }

  return true;
}

/**
 * Format date for display
 */
function formatDate(ts) {
  if (!ts) return "-";

  try {
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "-";
  }
}

// ==================== 🎫 Ticket Management ====================

/**
 * Check if ticket is available for grabbing
 */
function isTicketAvailable(ticket) {
  return (
    (!ticket.action_by || ticket.action_by === "") &&
    ticket.status_ticket === "Open"
  );
}

/**
 * Check if ticket belongs to current admin
 */
/**
 * Check if ticket belongs to current admin - IMPROVED VERSION
 */
function isMyTicket(ticket) {
  if (!ticket || !ticket.action_by) return false;

  const currentAdmin = getAdminDisplayName(auth.currentUser);
  const currentEmail = auth.currentUser?.email?.toLowerCase();

  console.log("🔍 isMyTicket Check:", {
    ticketActionBy: ticket.action_by,
    currentAdmin,
    currentEmail,
    directMatch: ticket.action_by === currentAdmin,
    emailInActionBy: ticket.action_by.toLowerCase().includes(currentEmail),
  });

  // Cek direct match dulu
  if (ticket.action_by === currentAdmin) {
    return true;
  }

  // Cek jika email ada di action_by (fallback)
  if (currentEmail && ticket.action_by.toLowerCase().includes(currentEmail)) {
    return true;
  }

  // Cek mapping dari CONFIG
  if (window.CONFIG?.ADMIN_NAME_MAPPING) {
    const mappedName = window.CONFIG.ADMIN_NAME_MAPPING[currentEmail];
    if (mappedName && ticket.action_by === mappedName) {
      return true;
    }
  }

  return false;
}

/**
 * Check delete permission for ticket
 */
/**
 * Check delete permission for ticket - IMPROVED VERSION
 */
function canDeleteTicket(ticket) {
  if (!ticket) return false;

  const canDelete = isTicketAvailable(ticket) || isMyTicket(ticket);

  console.log("🔍 canDeleteTicket Check:", {
    ticketId: ticket.id.substring(0, 8),
    actionBy: ticket.action_by,
    isAvailable: isTicketAvailable(ticket),
    isMine: isMyTicket(ticket),
    canDelete: canDelete,
  });

  return canDelete;
}

/**
 * Grab ticket (assign to current admin)
 */
async function grabTicket(ticketId) {
  const currentAdmin = getAdminDisplayName(auth.currentUser);

  try {
    await updateDoc(doc(db, "tickets", ticketId), {
      action_by: currentAdmin,
      status_ticket: "On Progress",
      onProgressAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    showNotification(
      "Ticket Taken! 🎯",
      `You are now handling this ticket`,
      "success",
      1500
    );
  } catch (error) {
    console.error("Grab ticket error:", error);
    showNotification("Error!", "Failed to take ticket", "error");
  }
}

/**
 * Release ticket (make available again)
 */
async function releaseTicket(ticketId) {
  try {
    await updateDoc(doc(db, "tickets", ticketId), {
      action_by: "",
      status_ticket: "Open",
      onProgressAt: null,
      updatedAt: serverTimestamp(),
    });

    showNotification("Released!", "Ticket is now available for others", "info");
  } catch (error) {
    console.error("Release ticket error:", error);
    showNotification("Error!", "Failed to release ticket", "error");
  }
}

// ==================== ⏱️ Duration Calculation ====================

/**
 * Calculate duration between dates
 */
function calculateDuration(ticket) {
  try {
    if (!ticket) return "-";

    const ticketStatus = ticket.status_ticket || "Open";
    const hasClosedAt = !!ticket.closedAt;
    const hasOnProgressAt = !!ticket.onProgressAt;

    if (ticketStatus === "Open") return "-";

    let startDate, endDate;

    if (ticketStatus === "Closed" && hasClosedAt) {
      if (hasOnProgressAt) {
        startDate =
          ticket.onProgressAt.toDate?.() || new Date(ticket.onProgressAt);
      } else {
        startDate = ticket.createdAt.toDate?.() || new Date(ticket.createdAt);
      }
      endDate = ticket.closedAt.toDate?.() || new Date(ticket.closedAt);
    } else if (ticketStatus === "On Progress" && hasOnProgressAt) {
      startDate =
        ticket.onProgressAt.toDate?.() || new Date(ticket.onProgressAt);
      endDate = new Date();
    } else {
      return "-";
    }

    return formatDuration(startDate, endDate);
  } catch (error) {
    console.error("Duration calculation error:", error);
    return "-";
  }
}

/**
 * Format duration for display
 */
function formatDuration(startDate, endDate) {
  try {
    const diffMs = endDate - startDate;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes > 0) {
      return `${diffMinutes} Minute${diffMinutes > 1 ? "s" : ""}`;
    }
    return "Less than 1 Minute";
  } catch {
    return "-";
  }
}

/**
 * Get duration badge class
 */
function getDurationClass(ticket) {
  try {
    if (!ticket.onProgressAt && !ticket.closedAt) return "duration-neutral";

    const ticketStatus = ticket.status_ticket || "Open";
    if (ticketStatus !== "On Progress" && ticketStatus !== "Closed") {
      return "duration-neutral";
    }

    let startDate, endDate;

    if (ticketStatus === "Closed" && ticket.closedAt) {
      if (ticket.onProgressAt) {
        startDate =
          ticket.onProgressAt.toDate?.() || new Date(ticket.onProgressAt);
        endDate = ticket.closedAt.toDate?.() || new Date(ticket.closedAt);
      } else {
        startDate = ticket.createdAt.toDate?.() || new Date(ticket.createdAt);
        endDate = ticket.closedAt.toDate?.() || new Date(ticket.closedAt);
      }
    } else if (ticketStatus === "On Progress" && ticket.onProgressAt) {
      startDate =
        ticket.onProgressAt.toDate?.() || new Date(ticket.onProgressAt);
      endDate = new Date();
    } else {
      return "duration-neutral";
    }

    const diffHours = (endDate - startDate) / (1000 * 60 * 60);

    if (diffHours > 24) return "duration-long";
    if (diffHours > 4) return "duration-medium";
    return "duration-short";
  } catch {
    return "duration-neutral";
  }
}

/**
 * Get duration tooltip
 */
function getDurationTooltip(ticket) {
  const status = ticket.status_ticket || "Open";
  const hasOnProgressAt = !!ticket.onProgressAt;

  if (status === "On Progress") {
    return "Duration real-time sejak tiket di-take sampai sekarang";
  } else if (status === "Closed") {
    if (hasOnProgressAt) {
      return "Duration sejak tiket di-take sampai ditutup";
    }
    return "Duration sejak tiket dibuat sampai ditutup (langsung di-close tanpa di-take)";
  }
  return "Duration akan muncul ketika status On Progress atau Closed";
}

// ==================== 🔄 Real-time Updates ====================

/**
 * Start duration updates interval
 */
function startDurationUpdates() {
  if (AppState.durationIntervalId) {
    clearInterval(AppState.durationIntervalId);
  }

  AppState.durationIntervalId = setInterval(() => {
    const hasOnProgressTickets = AppState.allTickets.some(
      (ticket) => ticket.status_ticket === "On Progress" && ticket.onProgressAt
    );

    if (hasOnProgressTickets) {
      updateDurations();
    }
  }, 60000);
}

/**
 * Update duration displays
 */
function updateDurations() {
  try {
    // Update table view
    document.querySelectorAll("#ticketTableBody tr").forEach((row, index) => {
      const ticket = AppState.allTickets[index];
      if (
        ticket &&
        (ticket.status_ticket === "On Progress" ||
          ticket.status_ticket === "Closed")
      ) {
        const durationCell = row.cells[1];
        if (durationCell) {
          durationCell.innerHTML = createDurationBadge(ticket);
        }
      }
    });

    // Update card view
    document.querySelectorAll(".ticket-card").forEach((card, index) => {
      const ticket = AppState.allTickets[index];
      if (
        ticket &&
        (ticket.status_ticket === "On Progress" ||
          ticket.status_ticket === "Closed")
      ) {
        const durationField = card.querySelector(".card-field:nth-child(2)");
        if (durationField) {
          durationField.querySelector("span").innerHTML =
            createDurationBadge(ticket);
        }
      }
    });
  } catch (error) {
    console.error("Error updating durations:", error);
  }
}

/**
 * Create duration badge HTML
 */
function createDurationBadge(ticket) {
  return `<span class="duration-badge ${getDurationClass(ticket)}" title="${getDurationTooltip(ticket)}">
    ${calculateDuration(ticket)}
  </span>`;
}

// ==================== 🎯 Ticket Grab System ====================

/**
 * Initialize ticket grab system
 */
function initTicketGrabSystem() {
  console.log("🎯 Initializing Ticket Grab System...");
  AppState.currentQuickFilter = "all";
  addQuickFilterButtons();

  setTimeout(() => {
    refreshFilterState();
  }, 100);
}

/**
 * Add quick filter buttons
 */
function addQuickFilterButtons() {
  const filterContainer = document.createElement("div");
  filterContainer.className = "quick-filter-container";
  filterContainer.innerHTML = `
    <div class="quick-filters">
      <button class="filter-btn active" data-filter="all">All Tickets</button>
      <button class="filter-btn" data-filter="available">🟢 Ticket Available</button>
      <button class="filter-btn" data-filter="my_tickets">👤 My Tickets</button>
      <button class="filter-btn" data-filter="others">👥 Others' Tickets</button>
    </div>
  `;

  const tableWrapper = document.querySelector(".table-wrapper");
  if (tableWrapper) {
    tableWrapper.parentNode.insertBefore(filterContainer, tableWrapper);
  }

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const filter = e.target.dataset.filter;
      console.log("🎯 Quick filter clicked:", filter);

      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");

      applyQuickFilter(filter);
    });
  });
}

/**
 * Apply quick filter
 */
function applyQuickFilter(filterType) {
  AppState.currentQuickFilter = filterType;
  let filtered = AppState.allTickets;
  const currentAdmin = getAdminDisplayName(auth.currentUser);

  switch (filterType) {
    case "available":
      filtered = filtered.filter((ticket) => isTicketAvailable(ticket));
      break;
    case "my_tickets":
      filtered = filtered.filter((ticket) => isMyTicket(ticket));
      break;
    case "others":
      filtered = filtered.filter(
        (ticket) => ticket.action_by && ticket.action_by !== currentAdmin
      );
      break;
    default:
      break;
  }

  console.log(`🎯 Quick Filter: ${filterType}`, {
    total: AppState.allTickets.length,
    filtered: filtered.length,
  });

  renderTickets(filtered);
}

/**
 * Refresh filter state
 */
function refreshFilterState() {
  console.log("🎯 Refreshing filter state:", AppState.currentQuickFilter);

  if (AppState.allTickets.length === 0) {
    showEmptyState();
    return;
  }

  if (AppState.currentQuickFilter && AppState.currentQuickFilter !== "all") {
    applyQuickFilter(AppState.currentQuickFilter);
  } else {
    renderTickets(AppState.allTickets);
  }

  // Update active filter button
  const activeBtn = document.querySelector(
    `.filter-btn[data-filter="${AppState.currentQuickFilter}"]`
  );
  if (activeBtn) {
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    activeBtn.classList.add("active");
  }
}

// ==================== ✅ Multiple Selection System ====================

/**
 * Initialize multiple selection system
 */
function initMultipleSelection() {
  console.log("✅ Initializing multiple selection system...");
  addBulkActionsContainer();
  updateBulkActions();
}

/**
 * Add floating bulk actions container
 */
function addBulkActionsContainer() {
  const existingBulkActions = document.querySelector(".bulk-actions");
  if (existingBulkActions) {
    existingBulkActions.remove();
  }

  const bulkActions = document.createElement("div");
  bulkActions.className = "bulk-actions hidden";
  bulkActions.innerHTML = `
    <div class="bulk-overlay"></div>
    <div class="bulk-actions-content">
      <div class="bulk-info">
        <i class="fa-solid fa-check-circle"></i>
        <span class="bulk-count">0 tickets selected</span>
      </div>
      <div class="bulk-buttons">
        <button class="bulk-delete-btn" disabled>
          <i class="fa-solid fa-trash"></i> Delete Selected (0)
        </button>
        <button class="bulk-cancel-btn">
          <i class="fa-solid fa-times"></i> Cancel
        </button>
      </div>
    </div>
  `;

  // 🔥 PERUBAHAN: Append ke body, bukan ke table wrapper
  document.body.appendChild(bulkActions);

  document
    .querySelector(".bulk-delete-btn")
    ?.addEventListener("click", handleBulkDelete);
  document
    .querySelector(".bulk-cancel-btn")
    ?.addEventListener("click", clearSelection);
  document
    .querySelector(".bulk-overlay")
    ?.addEventListener("click", clearSelection);
}

/**
 * Update bulk actions UI dengan animasi floating
 */
function updateBulkActions() {
  const bulkActions = document.querySelector(".bulk-actions");
  const bulkDeleteBtn = document.querySelector(".bulk-delete-btn");
  const bulkCount = document.querySelector(".bulk-count");

  if (!bulkActions || !bulkDeleteBtn || !bulkCount) return;

  const count = AppState.selectedTickets.size;

  if (count > 0) {
    // Show with animation
    bulkActions.classList.remove("hidden");
    setTimeout(() => {
      bulkActions.classList.add("visible");
    }, 10);

    bulkCount.textContent = `${count} ticket${count > 1 ? "s" : ""} selected`;
    bulkDeleteBtn.innerHTML = `<i class="fa-solid fa-trash"></i> Delete Selected (${count})`;
    bulkDeleteBtn.disabled = false;

    // Add body class to prevent scrolling
    document.body.classList.add("bulk-actions-active");
  } else {
    // Hide with animation
    bulkActions.classList.remove("visible");
    setTimeout(() => {
      bulkActions.classList.add("hidden");
      document.body.classList.remove("bulk-actions-active");
    }, 300);

    bulkDeleteBtn.disabled = true;
  }
}

/**
 * Toggle select all tickets
 */
function toggleSelectAll(checked) {
  const checkboxes = document.querySelectorAll(
    ".ticket-checkbox:not(:disabled)"
  );

  checkboxes.forEach((checkbox) => {
    const ticketId = checkbox.dataset.id;
    const ticket = AppState.allTickets.find((t) => t.id === ticketId);
    const row = document.querySelector(`tr[data-ticket-id="${ticketId}"]`);
    const card = document.querySelector(
      `.ticket-card[data-ticket-id="${ticketId}"]`
    );

    if (checked) {
      if (ticket && canDeleteTicket(ticket)) {
        checkbox.checked = true;
        AppState.selectedTickets.add(ticketId);
        checkbox.closest("tr").classList.add("selected-row");
        if (row) row.classList.add("selected-row");
        if (card) card.classList.add("selected-card");
      }
    } else {
      checkbox.checked = false;
      AppState.selectedTickets.delete(ticketId);
      if (row) row.classList.remove("selected-row");
      if (card) card.classList.remove("selected-card");
    }
  });

  updateBulkActions();
}

/**
 * Handle individual ticket selection
 */
function handleTicketSelect(ticketId, checked) {
  const ticket = AppState.allTickets.find((t) => t.id === ticketId);
  const row = document.querySelector(`tr[data-ticket-id="${ticketId}"]`);
  const card = document.querySelector(
    `.ticket-card[data-ticket-id="${ticketId}"]`
  );

  // 🔥 DEBUG: Cek data user dan ticket
  const currentUser = auth.currentUser;
  const currentAdminName = getAdminDisplayName(currentUser);
  const currentEmail = currentUser?.email;

  console.log("🔍 DEBUG Ticket Selection:", {
    ticketId: ticketId.substring(0, 8),
    ticketActionBy: ticket?.action_by,
    currentAdminName,
    currentEmail,
    isMyTicket: isMyTicket(ticket),
    canDelete: canDeleteTicket(ticket),
    ticketData: ticket,
  });

  if (checked) {
    if (ticket && canDeleteTicket(ticket)) {
      AppState.selectedTickets.add(ticketId);
      if (row) row.classList.add("selected-row");
      if (card) card.classList.add("selected-card");
    } else {
      const checkboxes = document.querySelectorAll(
        `.ticket-checkbox[data-id="${ticketId}"]`
      );
      checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
      });

      if (card) card.classList.remove("selected-card");

      // 🔥 DEBUG: Tampilkan info lebih detail
      console.log("🚫 Selection blocked for ticket:", {
        actionBy: ticket?.action_by,
        currentUser: currentAdminName,
        email: currentEmail,
        isAvailable: isTicketAvailable(ticket),
        isMine: isMyTicket(ticket),
      });

      showNotification(
        "Cannot Select Ticket",
        `This ticket is handled by <strong>${ticket?.action_by || "another admin"}</strong><br>
        <small>You can only select available tickets or tickets assigned to you.</small>`,
        "warning"
      );
      return;
    }
  } else {
    AppState.selectedTickets.delete(ticketId);
    if (row) row.classList.remove("selected-row");
    if (card) card.classList.remove("selected-card");
  }

  updateSelectAllCheckbox();
  updateBulkActions();
}

/**
 * Update select all checkbox state
 */
function updateSelectAllCheckbox() {
  const selectAllCheckbox = document.getElementById("selectAllCheckbox");
  if (!selectAllCheckbox) return;

  const checkableTickets = document.querySelectorAll(
    ".ticket-checkbox:not(:disabled)"
  );
  const checkedTickets = document.querySelectorAll(
    ".ticket-checkbox:not(:disabled):checked"
  );

  if (checkableTickets.length === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
  } else if (checkedTickets.length === checkableTickets.length) {
    selectAllCheckbox.checked = true;
    selectAllCheckbox.indeterminate = false;
  } else if (checkedTickets.length > 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = true;
  } else {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
  }
}

/**
 * Clear all selections dengan animasi
 */
function clearSelection() {
  AppState.selectedTickets.clear();

  document.querySelectorAll(".ticket-checkbox").forEach((checkbox) => {
    checkbox.checked = false;
  });

  document.querySelectorAll(".selected-row").forEach((row) => {
    row.classList.remove("selected-row");
  });

  // Clear card selection
  document.querySelectorAll(".selected-card").forEach((card) => {
    card.classList.remove("selected-card");
  });

  updateSelectAllCheckbox();
  updateBulkActions();

  // Show feedback
  showNotification(
    "Selection Cleared",
    "All tickets have been unselected",
    "info",
    1500
  );
}

/**
 * Handle bulk delete operation
 */
async function handleBulkDelete() {
  const ticketsToDelete = Array.from(AppState.selectedTickets);
  console.log("🗑️ Bulk delete requested for tickets:", ticketsToDelete);

  if (ticketsToDelete.length === 0) {
    showNotification("Error!", "No tickets selected for deletion.", "error");
    return;
  }

  // Validation
  const validTickets = [];
  const invalidTickets = [];

  ticketsToDelete.forEach((ticketId) => {
    const ticket = AppState.allTickets.find((t) => t.id === ticketId);
    if (ticket && canDeleteTicket(ticket)) {
      validTickets.push(ticketId);
    } else {
      invalidTickets.push({
        id: ticketId,
        reason: ticket ? `Handled by ${ticket.action_by}` : "Not found",
      });
    }
  });

  console.log("✅ Valid tickets for deletion:", validTickets.length);
  console.log("❌ Invalid tickets:", invalidTickets.length);

  if (validTickets.length === 0) {
    showNotification(
      "No tickets can be deleted",
      "Selected tickets are either not found or being handled by other admins.",
      "warning"
    );
    return;
  }

  // Show confirmation
  const confirmed = await Swal.fire({
    title: `Delete ${validTickets.length} Tickets?`,
    html: `
      <div style="text-align: center;">
        <i class="fa-solid fa-trash" style="font-size: 3rem; color: #dc3545; margin-bottom: 1rem;"></i>
        <p>You are about to delete <strong>${validTickets.length}</strong> tickets</p>
        ${
          invalidTickets.length > 0
            ? `<p style="color: #ffc107;"><small>${invalidTickets.length} tickets cannot be deleted (handled by others)</small></p>`
            : ""
        }
        <p style="color: #dc3545; font-weight: bold;">
          <i class="fa-solid fa-exclamation-triangle"></i> This action cannot be undone!
        </p>
      </div>
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: `Delete ${validTickets.length} Tickets`,
    cancelButtonText: "Cancel",
    confirmButtonColor: "#d33",
  });

  if (!confirmed.isConfirmed) return;

  // Execute deletion - USING FAST VERSION
  await executeFastBulkDelete(validTickets);
}

/**
 * Attach checkbox events
 */
function attachCheckboxEvents() {
  const selectAllCheckbox = document.getElementById("selectAllCheckbox");
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", (e) => {
      toggleSelectAll(e.target.checked);
    });
  }

  document.querySelectorAll(".ticket-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const ticketId = e.target.dataset.id;
      handleTicketSelect(ticketId, e.target.checked);
    });
  });
}

// ==================== 🗑️ BULK DELETE OPERATIONS - SIMPLE & WORKING ====================

/**
 * SIMPLE & RELIABLE BULK DELETE
 */
async function executeFastBulkDelete(validTickets) {
  console.log("🚀 SIMPLE bulk delete for", validTickets.length, "tickets");

  const loadingSwal = Swal.fire({
    title: `Deleting ${validTickets.length} Tickets`,
    html: `
      <div style="text-align: center;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: #2563eb;"></i>
        <p>Please wait...</p>
      </div>
    `,
    showConfirmButton: false,
    allowOutsideClick: false,
  });

  try {
    let successCount = 0;
    let errorCount = 0;
    const errorDetails = [];
    const successfullyDeleted = [];

    // Delete tickets satu per satu dengan error handling
    for (const ticketId of validTickets) {
      try {
        await deleteDoc(doc(db, "tickets", ticketId));
        successCount++;
        successfullyDeleted.push(ticketId);
        console.log(`✅ Deleted ticket: ${ticketId.substring(0, 8)}...`);
      } catch (error) {
        errorCount++;
        errorDetails.push({
          ticketId: ticketId.substring(0, 8) + "...",
          error: error.message,
        });
        console.error(
          `❌ Failed to delete ticket: ${ticketId.substring(0, 8)}...`,
          error
        );
      }
    }

    await loadingSwal.close();
    clearSelection();

    // Show results
    await showDeleteResults(
      successCount,
      errorCount,
      errorDetails,
      validTickets.length
    );

    // Refresh UI dengan yang berhasil dihapus
    refreshUIAfterDelete(successfullyDeleted);

    console.log(
      `🎉 Bulk delete completed: ${successCount} success, ${errorCount} failed`
    );
  } catch (error) {
    await loadingSwal.close();
    console.error("Bulk delete error:", error);
    showNotification(
      "Error",
      "Failed to delete tickets: " + error.message,
      "error"
    );
  }
}

/**
 * Show delete operation results
 */
async function showDeleteResults(
  successCount,
  errorCount,
  errorDetails,
  totalTickets
) {
  if (errorCount === 0) {
    await Swal.fire({
      title: "Success! 🎉",
      html: `
        <div style="text-align: center;">
          <i class="fa-solid fa-check-circle" style="font-size: 3rem; color: #28a745; margin-bottom: 1rem;"></i>
          <h3>All Tickets Deleted</h3>
          <p>Successfully deleted <strong>${successCount}</strong> tickets</p>
        </div>
      `,
      icon: "success",
      confirmButtonText: "Great!",
      timer: 3000,
    });
  } else {
    let errorMessage = `
      <div style="text-align: center;">
        <i class="fa-solid fa-exclamation-triangle" style="font-size: 3rem; color: #ffc107; margin-bottom: 1rem;"></i>
        <h3>Deletion Completed with Issues</h3>
        <p><strong>Successfully deleted:</strong> ${successCount} tickets</p>
        <p><strong>Failed to delete:</strong> ${errorCount} tickets</p>
    `;

    if (errorDetails.length > 0) {
      errorMessage += `
        <div style="margin-top: 15px; text-align: left; max-height: 150px; overflow-y: auto;">
          <p><strong>Errors:</strong></p>
          ${errorDetails
            .slice(0, 3)
            .map(
              (err) => `
            <div style="background: #f8d7da; padding: 5px; margin: 2px 0; border-radius: 3px; font-size: 0.8rem;">
              <strong>${err.ticketId}</strong>: ${err.error}
            </div>
          `
            )
            .join("")}
          ${errorDetails.length > 3 ? `<p style="color: #666;">... and ${errorDetails.length - 3} more errors</p>` : ""}
        </div>
      `;
    }

    errorMessage += `</div>`;

    await Swal.fire({
      title: "Completed with Issues",
      html: errorMessage,
      icon: "warning",
      confirmButtonText: "Understand",
    });
  }
}

/**
 * Refresh UI tanpa reload semua data - FIXED VERSION
 */
function refreshUIAfterDelete(deletedTicketIds) {
  console.log("🔄 Selective UI refresh after deletion", deletedTicketIds);

  // Update local state - HAPUS ticket yang berhasil didelete
  AppState.allTickets = AppState.allTickets.filter(
    (ticket) => !deletedTicketIds.includes(ticket.id)
  );

  // Clear selection
  AppState.selectedTickets.clear();

  // Re-render current view
  refreshFilterState();

  console.log("✅ UI refreshed after deletion");
}

// ==================== 🎨 Rendering Functions ====================

/**
 * Render tickets based on current view
 */
function renderTickets(tickets) {
  console.log("🎨 Rendering tickets:", tickets?.length);

  if (!tickets || tickets.length === 0) {
    showEmptyState();
    return;
  }

  const filtered = applyFilters(tickets);
  console.log("🎨 Filtered tickets:", filtered.length);

  if (filtered.length === 0) {
    showEmptyState();
    return;
  }

  if (AppState.isCardView) {
    renderCards(filtered);
  } else {
    renderTable(filtered);
  }

  // Always update bulk actions after rendering
  updateBulkActions();
}

/**
 * Apply all active filters
 */
function applyFilters(tickets) {
  let filtered = tickets;

  // Apply quick filter
  if (AppState.currentQuickFilter && AppState.currentQuickFilter !== "all") {
    const currentAdmin = getAdminDisplayName(auth.currentUser);

    switch (AppState.currentQuickFilter) {
      case "available":
        filtered = filtered.filter((ticket) => isTicketAvailable(ticket));
        break;
      case "my_tickets":
        filtered = filtered.filter((ticket) => isMyTicket(ticket));
        break;
      case "others":
        filtered = filtered.filter(
          (ticket) => ticket.action_by && ticket.action_by !== currentAdmin
        );
        break;
    }
  }

  // Filter by status
  if (DOM.filterSelect && DOM.filterSelect.value !== "all") {
    filtered = filtered.filter(
      (t) => t.status_ticket === DOM.filterSelect.value
    );
  }

  // Filter by Action By
  if (DOM.actionByFilter && DOM.actionByFilter.value !== "all") {
    filtered = filtered.filter((t) => t.action_by === DOM.actionByFilter.value);
  }

  return filtered;
}

/**
 * Render tickets in table view
 */
function renderTable(data) {
  if (!DOM.ticketTableBody) return;

  // Hide card container, show table
  if (DOM.cardContainer) DOM.cardContainer.style.display = "none";
  const tableWrapper = document.querySelector(".table-wrapper");
  if (tableWrapper) tableWrapper.style.display = "block";

  DOM.ticketTableBody.innerHTML = "";

  data.forEach((ticket) => {
    const displayQA = ticket.status_ticket === "Closed" ? "Finish" : "Continue";
    const isAvailable = isTicketAvailable(ticket);
    const isMine = isMyTicket(ticket);
    const canDelete = canDeleteTicket(ticket);
    const isSelected = AppState.selectedTickets.has(ticket.id); // 🔥 NEW

    const rowClass = isAvailable
      ? "ticket-available"
      : isMine
        ? "ticket-mine"
        : "ticket-others";

    const tr = document.createElement("tr");
    tr.className = rowClass;
    tr.setAttribute("data-ticket-id", ticket.id);

    // Add selected class jika ticket dipilih
    if (isSelected) {
      tr.classList.add("selected-row");
    }

    tr.innerHTML = createTableRowHTML(
      ticket,
      displayQA,
      isAvailable,
      isMine,
      canDelete,
      isSelected
    );
    DOM.ticketTableBody.appendChild(tr);
  });

  attachRowEvents();
  attachCheckboxEvents();
  updateSelectAllCheckbox();
}

/**
 * Create table row HTML
 */
function createTableRowHTML(ticket, displayQA, isAvailable, isMine, canDelete) {
  const actionButtons = getActionButtonsHTML(
    ticket,
    isAvailable,
    isMine,
    canDelete
  );

  return `
    <!-- Checkbox Column -->
    <td>
      <input 
        type="checkbox" 
        class="ticket-checkbox" 
        data-id="${ticket.id}"
        ${!canDelete ? `disabled title="Cannot delete - handled by ${ticket.action_by}"` : ""}
      >
    </td>
    
    <!-- Date -->
    <td>${formatDate(ticket.createdAt)}</td>
    
    <!-- Inventory -->
    <td>${ticket.inventory || "-"}</td>
    
    <!-- Device -->
    <td>${ticket.device || "-"}</td>
    
    <!-- Name -->
    <td>${ticket.name || "-"}</td>
    
    <!-- Email -->
    <td>
      <span class="email-cell" title="${ticket.user_email || "-"}">
        ${ticket.user_email || "-"}
      </span>
    </td>
    
    <!-- Phone -->
    <td>${ticket.user_phone || "-"}</td>
    
    <!-- Department -->
    <td>${ticket.department || "-"}</td>
    
    <!-- Location -->
    <td>${ticket.location || "-"}</td>
    
    <!-- Priority -->
    <td>
      <span class="priority-badge priority-${ticket.priority?.toLowerCase() || "medium"}">
        ${ticket.priority || "Medium"}
      </span>
    </td>
    
    <!-- Subject -->
    <td>${ticket.subject || "-"}</td>
    
    <!-- Message -->
    <td class="note-cell">${ticket.message || "-"}</td>
    
    <!-- Note -->
    <td class="note-cell">${ticket.note || "-"}</td>
    
    <!-- Code -->
    <td>${ticket.code || "-"}</td>
    
    <!-- Action By -->
    <td>
      ${
        ticket.action_by
          ? `<span class="assignee ${isMine ? "assignee-me" : ""}">${ticket.action_by}</span>`
          : '<span class="assignee available">Available</span>'
      }
    </td>
    
    <!-- QA -->
    <td>
      <span class="qa-badge qa-${displayQA.toLowerCase()}">
        ${displayQA}
      </span>
    </td>
    
    <!-- Status -->
    <td>
      <span class="status-badge status-${ticket.status_ticket?.replace(" ", "").toLowerCase() || "open"}">
        ${ticket.status_ticket || "Open"}
      </span>
    </td>
    
    <!-- Duration -->
    <td>
      <span class="duration-badge ${getDurationClass(ticket)}" title="${getDurationTooltip(ticket)}">
        ${calculateDuration(ticket)}
      </span>
    </td>
    
    <!-- Actions -->
    <td>
      <div class="action-buttons">
        ${actionButtons}
      </div>
    </td>
  `;
}

/**
 * Get action buttons HTML based on ticket state
 */
function getActionButtonsHTML(ticket, isAvailable, isMine, canDelete) {
  if (isAvailable) {
    return `
      <button class="grab-btn" data-id="${ticket.id}" title="Take this ticket">
        <i class="fa-solid fa-hand"></i>
      </button>
      <button class="delete-btn" data-id="${ticket.id}" title="Delete ticket">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;
  } else if (isMine) {
    return `
      <button class="edit-btn" data-id="${ticket.id}" title="Edit ticket">
        <i class="fa-solid fa-pen"></i>
      </button>
      <button class="release-btn" data-id="${ticket.id}" title="Release ticket">
        <i class="fa-solid fa-rotate-left"></i>
      </button>
      <button class="delete-btn" data-id="${ticket.id}" title="Delete ticket">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;
  } else {
    return `
      <button class="view-btn" data-id="${ticket.id}" title="View only (handled by ${ticket.action_by})">
        <i class="fa-solid fa-eye"></i>
      </button>
      <button class="delete-btn disabled-delete-btn" data-id="${ticket.id}" 
              title="Cannot delete - handled by ${ticket.action_by}" disabled>
        <i class="fa-solid fa-trash"></i>
      </button>
    `;
  }
}

/**
 * Render tickets in card view
 */
function renderCards(data) {
  if (!DOM.cardContainer) return;

  // Hide table, show card container
  const tableWrapper = document.querySelector(".table-wrapper");
  if (tableWrapper) tableWrapper.style.display = "none";
  DOM.cardContainer.style.display = "grid";

  DOM.cardContainer.innerHTML = "";

  data.forEach((ticket) => {
    const displayQA = ticket.status_ticket === "Closed" ? "Finish" : "Continue";
    const isAvailable = isTicketAvailable(ticket);
    const isMine = isMyTicket(ticket);
    const canDelete = canDeleteTicket(ticket);

    const cardClass = isAvailable
      ? "ticket-card ticket-available"
      : isMine
        ? "ticket-card ticket-mine"
        : "ticket-card ticket-others";
    const card = document.createElement("div");
    card.className = cardClass;
    card.setAttribute("data-ticket-id", ticket.id);

    // Add selected class jika ticket dipilih
    if (AppState.selectedTickets.has(ticket.id)) {
      card.classList.add("selected-card");
    }

    // 🔥 FIX: Pass canDelete parameter
    card.innerHTML = createCardHTML(
      ticket,
      displayQA,
      isAvailable,
      isMine,
      canDelete
    );
    DOM.cardContainer.appendChild(card);
  });

  attachRowEvents();
  attachCardCheckboxEvents();
}

/**
 * Attach checkbox events untuk card view
 */
function attachCardCheckboxEvents() {
  document.querySelectorAll(".card-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const ticketId = e.target.dataset.id;
      const card = e.target.closest(".ticket-card");

      if (e.target.checked) {
        handleTicketSelect(ticketId, true);
        if (card) card.classList.add("selected-card");
      } else {
        handleTicketSelect(ticketId, false);
        if (card) card.classList.remove("selected-card");
      }
    });
  });
}

/**
 * Create card HTML - FIXED VERSION
 */
function createCardHTML(ticket, displayQA, isAvailable, isMine, canDelete) {
  // 🔥 FIX: Pass canDelete ke getCardActionButtonsHTML
  const actionButtons = getCardActionButtonsHTML(
    ticket,
    isAvailable,
    isMine,
    canDelete
  );
  const isSelected = AppState.selectedTickets.has(ticket.id);

  return `
    <!-- Checkbox untuk card -->
    <div class="card-checkbox-container">
      <input 
        type="checkbox" 
        class="ticket-checkbox card-checkbox" 
        data-id="${ticket.id}"
        ${isSelected ? "checked" : ""}
        ${!canDelete ? `disabled title="Cannot delete - handled by ${ticket.action_by}"` : ""}
      >
    </div>
    
    <div class="card-header">
      <h3 title="Original ID: ${ticket.id}">${formatTicketId(ticket)}</h3>
      <span class="status-badge status-${ticket.status_ticket?.replace(" ", "").toLowerCase() || "open"}">
        ${ticket.status_ticket || "Open"}
      </span>
    </div>
    
    <div class="card-content">
      ${createCardField("calendar", "Date", formatDate(ticket.createdAt))}
      ${createCardField("barcode", "Inventory", ticket.inventory)}
      ${createCardField("computer", "Device", ticket.device)}
      ${createCardField("user", "Name", ticket.name)}
      ${createCardField("envelope", "Email", ticket.user_email, true)}
      ${createCardField("phone", "Phone", ticket.user_phone)}
      ${createCardField("building", "Department", ticket.department)}
      ${createCardField("location-dot", "Location", ticket.location)}
      ${createPriorityField(ticket.priority)}
      ${createCardField("tag", "Subject", ticket.subject)}
      ${createCardField("message", "Message", ticket.message)}
      ${createCardField("note-sticky", "Note", ticket.note)}
      ${createCardField("code", "Code", ticket.code)}
      ${createActionByField(ticket.action_by, isMine)}
      ${createDurationField(ticket)}
      ${createQAField(displayQA)}
    </div>
    
    <div class="card-actions">
      ${actionButtons}
    </div>
  `;
}

/**
 * Create card field HTML
 */
function createCardField(icon, label, value, isEmail = false) {
  if (!value) return "";

  const valueHTML = isEmail
    ? `<span class="email-cell" title="${value}">${value}</span>`
    : value;

  return `
    <div class="card-field">
      <strong><i class="fa-solid fa-${icon}"></i> ${label}</strong>
      <span>${valueHTML}</span>
    </div>
  `;
}

/**
 * Create priority field HTML
 */
function createPriorityField(priority) {
  if (!priority) return "";

  return `
    <div class="card-field">
      <strong><i class="fa-solid fa-flag"></i> Priority</strong>
      <span class="priority-badge priority-${priority.toLowerCase()}">
        ${priority}
      </span>
    </div>
  `;
}

/**
 * Create action by field HTML
 */
function createActionByField(actionBy, isMine) {
  if (!actionBy) {
    return `
      <div class="card-field">
        <strong><i class="fa-solid fa-user-gear"></i> Action By</strong>
        <span class="assignee available">Available</span>
      </div>
    `;
  }

  return `
    <div class="card-field">
      <strong><i class="fa-solid fa-user-gear"></i> Action By</strong>
      <span class="assignee ${isMine ? "assignee-me" : ""}">${actionBy}</span>
    </div>
  `;
}

/**
 * Create duration field HTML
 */
function createDurationField(ticket) {
  return `
    <div class="card-field">
      <strong><i class="fa-solid fa-clock"></i> Duration</strong>
      <span class="duration-badge ${getDurationClass(ticket)}" 
            title="${getDurationTooltip(ticket)}">
        ${calculateDuration(ticket)}
      </span>
    </div>
  `;
}

/**
 * Create QA field HTML
 */
function createQAField(qaValue) {
  return `
    <div class="card-field">
      <strong><i class="fa-solid fa-check-double"></i> QA</strong>
      <span class="qa-badge qa-${qaValue.toLowerCase()}">
        ${qaValue}
      </span>
    </div>
  `;
}

/**
 * Get card action buttons HTML - FIXED VERSION
 */
function getCardActionButtonsHTML(ticket, isAvailable, isMine, canDelete) {
  if (isAvailable) {
    return `
      <button class="grab-btn" data-id="${ticket.id}">
        <i class="fa-solid fa-hand"></i> Take
      </button>
      <button class="delete-btn" data-id="${ticket.id}">
        <i class="fa-solid fa-trash"></i> Delete
      </button>
    `;
  } else if (isMine) {
    return `
      <button class="edit-btn" data-id="${ticket.id}">
        <i class="fa-solid fa-pen"></i> Edit
      </button>
      <button class="release-btn" data-id="${ticket.id}">
        <i class="fa-solid fa-rotate-left"></i> Release
      </button>
      <button class="delete-btn" data-id="${ticket.id}">
        <i class="fa-solid fa-trash"></i> Delete
      </button>
    `;
  } else {
    // 🔥 FIX: Gunakan canDelete untuk menentukan tombol delete
    if (canDelete) {
      return `
        <button class="view-btn" data-id="${ticket.id}">
          <i class="fa-solid fa-eye"></i> View Only
        </button>
        <button class="delete-btn" data-id="${ticket.id}">
          <i class="fa-solid fa-trash"></i> Delete
        </button>
      `;
    } else {
      return `
        <button class="view-btn" data-id="${ticket.id}">
          <i class="fa-solid fa-eye"></i> View Only
        </button>
        <button class="delete-btn disabled-delete-btn" data-id="${ticket.id}" disabled>
          <i class="fa-solid fa-trash"></i> Delete
        </button>
      `;
    }
  }
}

// ==================== 🎛️ UI State Management ====================

/**
 * Show empty state
 */
function showEmptyState() {
  if (DOM.ticketTableBody) {
    DOM.ticketTableBody.innerHTML = `
      <tr>
        <td colspan="19" class="empty-state">
          <i class="fa-solid fa-inbox"></i>
          <p>No tickets found</p>
          <p style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">Belum ada tiket yang dibuat</p>
        </td>
      </tr>
    `;
  }

  if (DOM.cardContainer) {
    DOM.cardContainer.style.display = "none";
  }

  const tableWrapper = document.querySelector(".table-wrapper");
  if (tableWrapper) {
    tableWrapper.style.display = "block";
  }

  const bulkActions = document.querySelector(".bulk-actions");
  if (bulkActions) {
    bulkActions.classList.add("hidden");
  }
}

/**
 * Show error state
 */
function showErrorState(message) {
  if (DOM.ticketTableBody) {
    DOM.ticketTableBody.innerHTML = `
      <tr>
        <td colspan="19" class="error-state">
          <i class="fa-solid fa-exclamation-triangle"></i>
          <p>${message}</p>
          <button onclick="initTickets()" style="margin-top: 10px; padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">
            <i class="fa-solid fa-refresh"></i> Try Again
          </button>
        </td>
      </tr>
    `;
  }

  if (DOM.cardContainer) {
    DOM.cardContainer.style.display = "none";
  }

  const bulkActions = document.querySelector(".bulk-actions");
  if (bulkActions) {
    bulkActions.classList.add("hidden");
  }
}

/**
 * Show login screen
 */
function showLoginScreen() {
  AppState.allTickets = [];
  AppState.selectedTickets.clear();

  if (DOM.ticketTableBody) {
    DOM.ticketTableBody.innerHTML = `
      <tr>
        <td colspan="19" class="login-prompt">
          <div style="text-align: center; padding: 2rem;">
            <i class="fa-solid fa-lock" style="font-size: 3rem; color: #6c757d; margin-bottom: 1rem;"></i>
            <h3>Admin Login Required</h3>
            <p>Please login to access the admin panel</p>
            <div style="margin-top: 1rem;">
              <button onclick="redirectToLoginPage()" class="login-redirect-btn">
                <i class="fa-solid fa-right-to-bracket"></i> Go to Login Page
              </button>
            </div>
          </div>
        </td>
      </tr>
    `;
  }

  if (DOM.cardContainer) {
    DOM.cardContainer.style.display = "none";
  }

  const tableWrapper = document.querySelector(".table-wrapper");
  if (tableWrapper) {
    tableWrapper.style.display = "block";
  }

  const bulkActions = document.querySelector(".bulk-actions");
  if (bulkActions) {
    bulkActions.classList.add("hidden");
  }
}

// ==================== 🔐 Authentication ====================

/**
 * Check if user is admin
 */
function isAdminUser(user) {
  if (!user?.email) return false;

  const userEmail = user.email.toLowerCase();

  if (!window.CONFIG || !Array.isArray(window.CONFIG.ADMIN_EMAILS)) {
    console.error("ADMIN_EMAILS config invalid");
    return false;
  }

  const isAdmin = window.CONFIG.ADMIN_EMAILS.some(
    (adminEmail) => adminEmail.toLowerCase() === userEmail
  );

  console.log("🔐 Admin Check:", {
    userEmail,
    isAdmin,
    adminEmails: window.CONFIG.ADMIN_EMAILS,
  });

  return isAdmin;
}

/**
 * Initialize authentication
 */
function initAuth() {
  onAuthStateChanged(
    auth,
    (user) => {
      console.log("🔐 Auth state changed:", user ? "Logged in" : "Logged out");

      if (!user) {
        cleanup();
        showAuthButtons(false);
        showLoginScreen();
        return;
      }

      if (!isAdminUser(user)) {
        console.log("🔐 Access denied for email:", user.email);
        cleanup();
        showLoginScreen();

        showNotification(
          "Access Denied",
          `Email <strong>${user.email}</strong> tidak memiliki akses admin.<br>
        <small>Hubungi administrator untuk mendapatkan akses.</small>`,
          "error"
        ).then(() => {
          signOut(auth);
        });
        return;
      }

      // User is authenticated admin
      console.log("🔐 Admin access granted for:", user.email);
      showAuthButtons(true, user);
      initTickets();
      initTicketGrabSystem();

      handleFirstLogin(user);
    },
    (error) => {
      console.error("🔐 Auth state error:", error);
      cleanup();
      showAuthButtons(false);
      showLoginScreen();
    }
  );
}

/**
 * Handle first login welcome message
 */
function handleFirstLogin(user) {
  const isFirstLogin = !sessionStorage.getItem("adminFirstLogin");

  if (isFirstLogin) {
    const displayName = getAdminDisplayName(user);

    showNotification(
      "Login Successful!",
      `Selamat datang <strong>${displayName}</strong><br>
      <small>Anda login sebagai ${user.email}</small>`,
      "success",
      3000
    );

    sessionStorage.setItem("adminFirstLogin", "true");
    sessionStorage.setItem("adminSessionTime", Date.now().toString());
    console.log("🔐 First login - welcome message shown");
  } else {
    console.log("🔐 Page refresh - no welcome message");
  }
}

/**
 * Show authentication buttons based on login state
 */
function showAuthButtons(isLoggedIn, user = null) {
  if (DOM.userTicketBtn) {
    DOM.userTicketBtn.style.display = isLoggedIn ? "flex" : "none";
  }
  if (DOM.loginBtn) {
    DOM.loginBtn.style.display = isLoggedIn ? "none" : "flex";
    DOM.loginBtn.disabled = false;
  }
  if (DOM.goLoginBtn) {
    DOM.goLoginBtn.style.display = isLoggedIn ? "none" : "inline-flex";
    DOM.goLoginBtn.disabled = false;
  }
  if (DOM.logoutBtn)
    DOM.logoutBtn.style.display = isLoggedIn ? "inline-flex" : "none";
  if (DOM.exportBtn)
    DOM.exportBtn.style.display = isLoggedIn ? "inline-flex" : "none";

  if (DOM.userInfo) {
    DOM.userInfo.style.display = isLoggedIn ? "flex" : "none";
  }

  if (DOM.userName && user) {
    const displayName = getAdminDisplayName(user);
    DOM.userName.textContent = displayName;
  }
}

/**
 * Handle Google login
 */
async function handleGoogleLogin() {
  if (AppState.loginInProgress) {
    console.log("🔐 Login already in progress...");
    return;
  }

  AppState.loginInProgress = true;

  try {
    console.log("🔐 Attempting Google login...");

    if (DOM.loginBtn) DOM.loginBtn.disabled = true;
    if (DOM.goLoginBtn) DOM.goLoginBtn.disabled = true;

    const result = await signInWithPopup(auth, provider);
    console.log("🔐 Login successful:", result.user.email);

    sessionStorage.setItem("adminFirstLogin", "true");
    sessionStorage.setItem("adminSessionTime", Date.now().toString());
  } catch (error) {
    console.error("🔐 Login error details:", error);
    await handleLoginError(error);
  } finally {
    AppState.loginInProgress = false;
    if (DOM.loginBtn) DOM.loginBtn.disabled = false;
    if (DOM.goLoginBtn) DOM.goLoginBtn.disabled = false;
  }
}

/**
 * Handle login errors
 */
async function handleLoginError(error) {
  const errorMessages = {
    "auth/popup-blocked":
      "Popup login blocked by browser. Please allow popups for this site and try again.",
    "auth/popup-closed-by-user": "Login popup was closed. Please try again.",
    "auth/cancelled-popup-request": "Login request cancelled.",
    "auth/network-request-failed":
      "There is a network connection problem. Please check your internet and try again.",
  };

  const message = errorMessages[error.code] || error.message;

  if (
    error.code !== "auth/popup-closed-by-user" &&
    error.code !== "auth/cancelled-popup-request"
  ) {
    await showNotification("Login Failed", message, "error");
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  try {
    console.log("🔐 Logging out...");

    cleanup();
    sessionStorage.removeItem("adminFirstLogin");
    sessionStorage.removeItem("adminSessionTime");
    AppState.allTickets = [];
    AppState.selectedTickets.clear();

    await showNotification("Logging Out", "Please wait...", "info", 1000);
    await signOut(auth);

    console.log("🔐 Logout successful");
  } catch (error) {
    console.error("🔐 Logout error:", error);
    cleanup();
    sessionStorage.removeItem("adminFirstLogin");
    sessionStorage.removeItem("adminSessionTime");
    AppState.allTickets = [];
    AppState.selectedTickets.clear();
    showLoginScreen();

    showNotification(
      "Logged Out",
      "You have been logged out of the admin panel.",
      "info",
      2000
    );
  }
}

// ==================== 📊 Data Management ====================

/**
 * Initialize tickets data
 */
function initTickets() {
  console.log("📊 Initializing tickets...");

  // Clear previous data
  AppState.allTickets = [];
  AppState.selectedTickets.clear();

  // Check authentication
  if (!auth.currentUser) {
    console.log("📊 User not authenticated, showing login screen");
    showLoginScreen();
    return;
  }

  showLoadingState();

  const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));

  // Unsubscribe previous listener if exists
  if (AppState.ticketsUnsubscribe) {
    AppState.ticketsUnsubscribe();
  }

  AppState.ticketsUnsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (!auth.currentUser) {
        console.log("📊 User logged out during data fetch");
        showLoginScreen();
        return;
      }

      const tickets = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("📊 Tickets loaded:", tickets.length);
      AppState.allTickets = tickets;

      // Hide loading state and render tickets
      renderTickets(tickets);
      startDurationUpdates();

      // Update global variable for export.js
      if (typeof window.updateAllTickets === "function") {
        window.updateAllTickets(tickets);
      }

      console.log("✅ Tickets rendering completed");
    },
    (error) => {
      console.error("📊 Error loading tickets:", error);

      // Always hide loading state on error
      if (DOM.ticketTableBody) {
        DOM.ticketTableBody.innerHTML = "";
      }

      if (
        error.code === "permission-denied" ||
        error.code === "missing-or-insufficient-permissions"
      ) {
        console.log(
          "📊 Permission denied - user might be logged out or not admin"
        );
        showLoginScreen();
      } else {
        showErrorState("Failed to load tickets: " + error.message);
      }
    }
  );
}

/**
 * Show loading state
 */
function showLoadingState() {
  if (DOM.ticketTableBody) {
    DOM.ticketTableBody.innerHTML = `
      <tr>
        <td colspan="19" class="loading">
          <div style="text-align: center; padding: 2rem;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: #2563eb; margin-bottom: 1rem;"></i>
            <p>Loading tickets...</p>
          </div>
        </td>
      </tr>
    `;
  }

  if (DOM.cardContainer) {
    DOM.cardContainer.style.display = "none";
  }

  const tableWrapper = document.querySelector(".table-wrapper");
  if (tableWrapper) {
    tableWrapper.style.display = "block";
  }

  const bulkActions = document.querySelector(".bulk-actions");
  if (bulkActions) {
    bulkActions.classList.add("hidden");
  }
}

// ==================== 🎛️ Event Handlers ====================

/**
 * Handle grab ticket button click
 */
async function handleGrabTicket(e) {
  const ticketId = e.currentTarget.dataset.id;
  await grabTicket(ticketId);
}

/**
 * Handle release ticket button click
 */
async function handleReleaseTicket(e) {
  const ticketId = e.currentTarget.dataset.id;

  const confirmed = await Swal.fire({
    title: "Release Ticket?",
    text: "This ticket will become available for other admins",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, Release",
    cancelButtonText: "Keep It",
  });

  if (confirmed.isConfirmed) {
    await releaseTicket(ticketId);
  }
}

/**
 * Handle view ticket button click
 */
async function handleViewTicket(e) {
  const ticketId = e.currentTarget.dataset.id;
  const ticket = AppState.allTickets.find((t) => t.id === ticketId);

  if (ticket) {
    Swal.fire({
      title: "View Only 👀",
      html: `
        <div style="text-align: left;">
          <p><strong>This ticket is being handled by:</strong> ${ticket.action_by}</p>
          <p>You can only view this ticket until it's released or completed.</p>
          <hr>
          <p><strong>Subject:</strong> ${ticket.subject}</p>
          <p><strong>Message:</strong> ${ticket.message}</p>
          ${ticket.note ? `<p><strong>Current Notes:</strong> ${ticket.note}</p>` : ""}
        </div>
      `,
      icon: "info",
    });
  }
}

/**
 * Handle individual ticket delete
 */
async function handleDelete(e) {
  const id = e.currentTarget.dataset.id;
  const ticket = AppState.allTickets.find((t) => t.id === id);

  if (!ticket) {
    showNotification("Error!", "Ticket not found.", "error");
    return;
  }

  if (!canDeleteTicket(ticket)) {
    showNotification(
      "Permission Denied! 🚫",
      `This ticket is currently being handled by <strong>${ticket.action_by}</strong><br>
      <small>You can only delete tickets that are available or assigned to you.</small>`,
      "error"
    );
    return;
  }

  const confirmed = await Swal.fire({
    title: "Delete this ticket?",
    html: `
      <div style="text-align: left;">
        <p>Are you sure you want to delete this ticket?</p>
        <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 10px;">
          <p><strong>Ticket Details:</strong></p>
          <p><strong>Subject:</strong> ${ticket.subject || "No subject"}</p>
          <p><strong>Status:</strong> ${ticket.status_ticket || "Open"}</p>
          <p><strong>Action By:</strong> ${ticket.action_by || "Available"}</p>
          ${ticket.createdAt ? `<p><strong>Created:</strong> ${formatDate(ticket.createdAt)}</p>` : ""}
        </div>
      </div>
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete it",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#d33",
  });

  if (!confirmed.isConfirmed) return;

  try {
    // Show loading
    Swal.fire({
      title: "Deleting...",
      text: "Please wait while we delete the ticket",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    await deleteDoc(doc(db, "tickets", id));

    Swal.close();

    // Remove from local state immediately
    AppState.allTickets = AppState.allTickets.filter((t) => t.id !== id);
    AppState.selectedTickets.delete(id);

    // Refresh the view
    refreshFilterState();

    showNotification(
      "Deleted!",
      "Ticket has been permanently removed.",
      "success",
      2000
    );
  } catch (error) {
    Swal.close();
    console.error("Delete error:", error);
    showNotification(
      "Error!",
      "Failed to delete ticket: " + error.message,
      "error"
    );
  }
}

// ==================== ✏️ Edit Ticket Functions ====================

/**
 * Handle ticket edit
 */
async function handleEdit(e) {
  const id = e.currentTarget.dataset.id;

  try {
    const docRef = doc(db, "tickets", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      showNotification("Error!", "Ticket not found.", "error");
      return;
    }

    const data = docSnap.data();
    await showEditForm(data, id, docRef);
  } catch (error) {
    console.error("Edit error:", error);
    showNotification(
      "Error!",
      error.message || "Failed to update ticket.",
      "error"
    );
  }
}

/**
 * Show edit form
 */
async function showEditForm(data, id, docRef) {
  const currentUser = auth.currentUser;
  const currentAdminName = getAdminDisplayName(currentUser);
  const currentStatus = data.status_ticket || "Open";

  const { value: formValues } = await Swal.fire({
    title: "Edit Ticket",
    html: createEditFormHTML(data, id, currentAdminName, currentStatus),
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Update Ticket",
    cancelButtonText: "Cancel",
    preConfirm: () => {
      const formData = getFormData();

      try {
        validateTicketBeforeSave(formData);
      } catch (error) {
        Swal.showValidationMessage(error.message);
        return false;
      }

      return formData;
    },
    didOpen: () => {
      addFormStyles();
    },
  });

  if (!formValues) return;

  await updateTicketData(docRef, formValues, currentStatus, data);
}

/**
 * Create edit form HTML
 */
function createEditFormHTML(data, id, currentAdminName, currentStatus) {
  const getAutoQA = (status) => (status === "Closed" ? "Finish" : "Continue");
  const currentQA = getAutoQA(currentStatus);

  return `
    <div class="form-grid">
      <!-- Ticket ID -->
      <div class="form-group full-width">
        <label><i class="fa-solid fa-ticket"></i> Ticket ID</label>
        <input type="text" id="ticketId" class="swal2-input" value="${data.ticketId || id}" readonly>
        <small><i class="fa-solid fa-info-circle"></i> Format: DEPT-LOC-DEVICE-DATE-RANDOM</small>
      </div>
      
      <!-- Basic Information -->
      <div class="form-group">
        <label><i class="fa-solid fa-barcode"></i> Inventory Number</label>
        <input type="text" id="inventory" class="swal2-input" value="${data.inventory || ""}" placeholder="Inventory Number">
      </div>
      
      <div class="form-group">
        <label><i class="fa-solid fa-user"></i> Name</label>
        <input type="text" id="name" class="swal2-input" value="${data.name || ""}" placeholder="User Name">
      </div>

      <div class="form-group">
        <label><i class="fa-solid fa-envelope"></i> User Email</label>
        <input type="email" id="user_email" class="swal2-input" value="${data.user_email || ""}" placeholder="user@company.com">
      </div>
      
      <div class="form-group">
        <label><i class="fa-solid fa-user-gear"></i> Action By</label>
        <select id="action_by" class="swal2-select">
          <option value="">-- Select IT Staff --</option>
          ${getActionByOptions(data.action_by || currentAdminName)}
        </select>
      </div>
      
      <div class="form-group">
        <label><i class="fa-solid fa-phone"></i> Phone Number</label>
        <input type="tel" id="user_phone" class="swal2-input" value="${data.user_phone || ""}" placeholder="+62 XXX-XXXX-XXXX">
      </div>
        
      <!-- Device & Location -->
      <div class="form-group">
        <label><i class="fa-solid fa-computer"></i> Device Type</label>
        <select id="device" class="swal2-select" required>
          <option value="" disabled>Select Device Type</option>
          ${getDeviceOptions(data.device)}
        </select>
      </div>
      
      <div class="form-group">
        <label><i class="fa-solid fa-location-dot"></i> Location</label>
        <select id="location" class="swal2-select">${getLocationOptions(data.location)}</select>
      </div>
      
      <div class="form-group">
        <label><i class="fa-solid fa-building"></i> Department</label>
        <select id="department" class="swal2-select">${getDepartmentOptions(data.department)}</select>
      </div>
      
      <!-- Priority & Status -->
      <div class="form-group">
        <label><i class="fa-solid fa-flag"></i> Priority</label>
        <select id="priority" class="swal2-select">${getPriorityOptions(data.priority)}</select>
      </div>
      
      <div class="form-group">
        <label><i class="fa-solid fa-circle-check"></i> Status</label>
        <select id="status_ticket" class="swal2-select">${getStatusOptions(currentStatus)}</select>
      </div>
      
      <!-- Note -->
      <div class="form-group full-width">
        <label><i class="fa-solid fa-note-sticky"></i> IT Remarks / Note *</label>
        <textarea id="note" class="swal2-textarea" placeholder="Describe what have you fix or what you did ?">${data.note || ""}</textarea>
        <small><i class="fa-solid fa-info-circle"></i> Wajib diisi jika status diubah ke "Closed"</small>
      </div>
    </div>
    
    <!-- Info Sections -->
    <div class="info-section">
      <div class="info-item">
        <i class="fa-solid fa-info-circle"></i>
        ${getDurationInfo(currentStatus)}
      </div>
      <div class="info-item">
        <i class="fa-solid fa-info-circle"></i>
        QA akan otomatis di-set ke "${currentQA}" berdasarkan status ticket.
      </div>
    </div>
    
    <input type="hidden" id="code" value="${data.code || ""}">
  `;
}

// Helper functions
function getDeviceOptions(currentDevice) {
  const devices = [
    "PC Hardware",
    "PC Software",
    "Laptop",
    "Printer",
    "Network",
    "Projector",
    "Backup Data",
    "Others",
  ];
  return devices
    .map(
      (device) =>
        `<option value="${device}" ${currentDevice === device ? "selected" : ""}>${device}</option>`
    )
    .join("");
}

function getDurationInfo(status) {
  const messages = {
    Closed: "Duration sudah terkalkulasi",
    "On Progress": "Duration sedang berjalan real-time",
    default:
      'Duration akan terkalkulasi ketika status diubah ke "On Progress" atau "Closed"',
  };

  const message = messages[status] || messages.default;
  const action =
    status === "Closed" || status === "On Progress"
      ? `Ubah status ke "Open" untuk reset duration.`
      : "";

  return `${message}. ${action}`;
}

/**
 * Get form data from edit form
 */
function getFormData() {
  return {
    user_email: document.getElementById("user_email").value,
    inventory: document.getElementById("inventory").value,
    name: document.getElementById("name").value,
    note: document.getElementById("note").value,
    action_by: document.getElementById("action_by").value,
    user_phone: document.getElementById("user_phone").value,
    device: document.getElementById("device").value,
    location: document.getElementById("location").value,
    department: document.getElementById("department").value,
    priority: document.getElementById("priority").value,
    status_ticket: document.getElementById("status_ticket").value,
  };
}

/**
 * Add form styles
 */
function addFormStyles() {
  const styles = `
    <style>
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        max-width: 600px;
      }
      .form-group {
        display: flex;
        flex-direction: column;
      }
      .form-group label {
        font-weight: 600;
        margin-bottom: 5px;
        color: #374151;
        font-size: 14px;
      }
      .form-group:first-child {
        grid-column: 1 / -1;
      }
      .swal2-select, .swal2-input, .swal2-textarea {
        width: 100% !important;
        margin: 0 !important;
      }
      .swal2-textarea {
        min-height: 80px;
        resize: vertical;
      }
    </style>
  `;
  document.head.insertAdjacentHTML("beforeend", styles);
}

/**
 * Update ticket data in Firestore
 */
async function updateTicketData(docRef, formValues, currentStatus, data) {
  // Determine QA based on new status
  const getAutoQA = (status) => (status === "Closed" ? "Finish" : "Continue");
  const newQA = getAutoQA(formValues.status_ticket);

  // Get updated code
  const codeField = document.getElementById("code");
  const updatedCode = codeField
    ? codeField.value
    : window.CONFIG?.DEVICE_TYPE_MAPPING?.[formValues.device] || "OT";

  // Logic for handling timestamps
  const updateData = {
    ...formValues,
    code: updatedCode,
    qa: newQA,
    updatedAt: serverTimestamp(),
  };

  // Handle timestamp based on status changes
  if (
    formValues.status_ticket === "On Progress" &&
    currentStatus !== "On Progress"
  ) {
    // Status changed to On Progress for the first time
    updateData.onProgressAt = serverTimestamp();
  } else if (
    formValues.status_ticket === "Closed" &&
    currentStatus !== "Closed"
  ) {
    // Status changed to Closed for the first time
    updateData.closedAt = serverTimestamp();

    // If previously On Progress, keep onProgressAt for history
    if (currentStatus === "On Progress" && data.onProgressAt) {
      updateData.onProgressAt = data.onProgressAt;
    }
  } else if (formValues.status_ticket === "Open") {
    // Status back to Open - reset all timestamps
    updateData.onProgressAt = null;
    updateData.closedAt = null;
  }

  await updateDoc(docRef, updateData);
  showNotification("Updated!", "Ticket updated successfully.", "success");

  // Refresh durations after status change
  updateDurations();
}

/**
 * Attach row events
 */
function attachRowEvents() {
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", handleEdit);
  });
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", handleDelete);
  });
  document.querySelectorAll(".grab-btn").forEach((btn) => {
    btn.addEventListener("click", handleGrabTicket);
  });
  document.querySelectorAll(".release-btn").forEach((btn) => {
    btn.addEventListener("click", handleReleaseTicket);
  });
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", handleViewTicket);
  });
}

// ==================== 🧹 Cleanup & Utilities ====================

/**
 * Cleanup resources
 */
function cleanup() {
  console.log("🧹 Cleaning up resources...");

  try {
    AppState.selectedTickets.clear();

    if (AppState.ticketsUnsubscribe) {
      AppState.ticketsUnsubscribe();
      AppState.ticketsUnsubscribe = null;
    }

    if (AppState.durationIntervalId) {
      clearInterval(AppState.durationIntervalId);
      AppState.durationIntervalId = null;
    }

    if (AppState.resizeTimeout) {
      clearTimeout(AppState.resizeTimeout);
      AppState.resizeTimeout = null;
    }
  } catch (error) {
    console.error("🧹 Error during cleanup:", error);
  }
}

/**
 * Setup session storage management
 */
function setupSessionStorage() {
  const sessionData = sessionStorage.getItem("adminFirstLogin");
  if (sessionData) {
    const sessionTime = sessionStorage.getItem("adminSessionTime");
    if (sessionTime) {
      const timeDiff = Date.now() - parseInt(sessionTime);
      const eightHours = 8 * 60 * 60 * 1000;

      if (timeDiff > eightHours) {
        sessionStorage.removeItem("adminFirstLogin");
        sessionStorage.removeItem("adminSessionTime");
        console.log("🧹 Session expired - cleared storage");
      }
    } else {
      sessionStorage.setItem("adminSessionTime", Date.now().toString());
    }
  }
}

// ==================== 🚀 Application Initialization ====================

/**
 * Initialize admin application
 */
function initAdminApp() {
  console.log("🚀 Initializing admin application...");

  // Check DOM elements
  console.log("🚀 DOM Elements Check:", {
    userTicketBtn: !!DOM.userTicketBtn,
    loginBtn: !!DOM.loginBtn,
    logoutBtn: !!DOM.logoutBtn,
    exportBtn: !!DOM.exportBtn,
  });

  // Validate config
  if (!window.CONFIG) {
    console.error("🚀 CONFIG not loaded");
    showErrorState("Configuration not loaded. Please refresh the page.");
    return;
  }

  if (!window.CONFIG.ADMIN_EMAILS || !window.CONFIG.IT_STAFF) {
    console.error("🚀 Required config missing");
    showErrorState("Required configuration missing. Please check config.js");
    return;
  }

  setupSessionStorage();

  // Add event listeners
  if (DOM.switchViewBtn) {
    DOM.switchViewBtn.addEventListener("click", toggleView);
  }
  if (DOM.logoutBtn) {
    DOM.logoutBtn.addEventListener("click", handleLogout);
  }
  if (DOM.exportBtn) {
    DOM.exportBtn.addEventListener("click", handleExport);
  }
  if (DOM.filterSelect) {
    DOM.filterSelect.addEventListener("change", handleFilterChange);
  }
  if (DOM.actionByFilter) {
    DOM.actionByFilter.addEventListener("change", handleFilterChange);
    populateActionByFilter();
  }
  if (DOM.userTicketBtn) {
    DOM.userTicketBtn.addEventListener("click", redirectToUserTicket);
  }
  if (DOM.loginBtn) {
    DOM.loginBtn.addEventListener("click", handleGoogleLogin);
  }
  if (DOM.goLoginBtn) {
    DOM.goLoginBtn.addEventListener("click", redirectToLoginPage);
  }

  // Initialize systems
  initAuth();
  handleResponsiveView();
  initMultipleSelection();
}

/**
 * Toggle view between table and card
 */
function toggleView() {
  AppState.isCardView = !AppState.isCardView;

  if (DOM.switchViewBtn) {
    DOM.switchViewBtn.innerHTML = AppState.isCardView
      ? '<i class="fa-solid fa-table"></i> Switch to Table View'
      : '<i class="fa-solid fa-id-card"></i> Switch to Card View';
  }

  renderTickets(AppState.allTickets);
}

/**
 * Handle filter changes
 */
function handleFilterChange() {
  renderTickets(AppState.allTickets);
}

/**
 * Handle responsive view
 */
function handleResponsiveView() {
  if (window.innerWidth <= 768) {
    AppState.isCardView = true;
    if (DOM.switchViewBtn) DOM.switchViewBtn.style.display = "none";
  } else {
    AppState.isCardView = false;
    if (DOM.switchViewBtn) DOM.switchViewBtn.style.display = "inline-flex";
  }

  if (AppState.allTickets.length > 0) {
    renderTickets(AppState.allTickets);
  }
}

// ==================== 🌐 Global Functions ====================

/**
 * Redirect to user ticket page
 */
function redirectToUserTicket() {
  console.log("🌐 Redirecting to user ticket page...");
  window.open("../index.html", "_blank", "noopener,noreferrer");
}

/**
 * Redirect to login page
 */
function redirectToLoginPage() {
  console.log("🌐 Redirecting to login page...");
  window.open("../login/index.html", "_blank", "noopener,noreferrer");
}

/**
 * Add data labels for responsive table
 */
function addDataLabels() {
  const table = document.getElementById("ticketsTable");
  if (!table) return;

  try {
    const headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
      th.innerText.trim()
    );

    table.querySelectorAll("tbody tr").forEach((row) => {
      row.querySelectorAll("td").forEach((td, i) => {
        if (headers[i]) {
          td.setAttribute("data-label", headers[i]);
        }
      });
    });
  } catch (error) {
    console.error("🌐 Error in addDataLabels:", error);
  }
}

/**
 * Show notification
 */
async function showNotification(title, html, icon, timer = null) {
  const config = {
    title,
    html,
    icon,
    showConfirmButton: !timer,
    timer: timer || undefined,
  };

  return Swal.fire(config);
}

// ==================== 📤 Export Functions ====================

/**
 * Handle export
 */
async function handleExport() {
  console.log("📤 Export clicked, allTickets:", AppState.allTickets?.length);

  if (!AppState.allTickets || AppState.allTickets.length === 0) {
    showNotification(
      "No Data",
      "Tidak ada data tiket untuk diekspor. Silakan tunggu hingga data dimuat.",
      "warning"
    );
    return;
  }

  try {
    if (typeof window.handleExportToExcel === "function") {
      console.log("📤 Using export.js handleExportToExcel function");
      await window.handleExportToExcel();
    } else {
      await handleBuiltInExport();
    }
  } catch (error) {
    console.error("📤 Export error:", error);
    showNotification(
      "Export Failed",
      "Terjadi kesalahan saat mengekspor. Silakan coba lagi.",
      "error"
    );
  }
}

/**
 * Built-in export fallback
 */
async function handleBuiltInExport() {
  const filteredTickets = getDisplayedTickets();
  const filterInfo = getCurrentFilterInfo();

  console.log("📤 Built-in export:", {
    tickets: filteredTickets.length,
    filter: filterInfo,
  });

  const { value: accept } = await Swal.fire({
    title: "Export to Excel",
    html: `
      <div style="text-align: center; padding: 1rem;">
        <i class="fa-solid fa-file-excel" style="font-size: 3rem; color: #217346; margin-bottom: 1rem;"></i>
        <p>Export ${filteredTickets.length} tickets to Excel?</p>
        <p style="font-size: 0.9rem; color: #666;"><strong>Filter:</strong> ${filterInfo}</p>
      </div>
    `,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Export Now",
    cancelButtonText: "Cancel",
  });

  if (!accept) return;

  await exportToExcel(filteredTickets, filterInfo);
}

/**
 * Get displayed tickets with filters applied
 */
function getDisplayedTickets() {
  try {
    return applyFilters(AppState.allTickets);
  } catch (error) {
    console.error("📤 Error getting displayed tickets:", error);
    return AppState.allTickets;
  }
}

/**
 * Get current filter info
 */
function getCurrentFilterInfo() {
  try {
    const activeFilters = [];

    if (DOM.filterSelect && DOM.filterSelect.value !== "all") {
      activeFilters.push(
        `Status: ${DOM.filterSelect.options[DOM.filterSelect.selectedIndex].text}`
      );
    }

    if (DOM.actionByFilter && DOM.actionByFilter.value !== "all") {
      activeFilters.push(
        `IT Staff: ${DOM.actionByFilter.options[DOM.actionByFilter.selectedIndex].text}`
      );
    }

    return activeFilters.length > 0 ? activeFilters.join(", ") : "All Tickets";
  } catch (error) {
    console.error("📤 Error getting filter info:", error);
    return "All Tickets";
  }
}

// ==================== 🎨 Form Helpers ====================

/**
 * Populate action by filter
 */
function populateActionByFilter() {
  if (!DOM.actionByFilter) {
    console.error("actionByFilter element not found");
    return;
  }

  if (!window.CONFIG || !Array.isArray(window.CONFIG.IT_STAFF)) {
    console.error("IT_STAFF config invalid");
    DOM.actionByFilter.innerHTML = '<option value="all">No IT Staff</option>';
    return;
  }

  const itStaff = window.CONFIG.IT_STAFF;
  DOM.actionByFilter.innerHTML = '<option value="all">All IT Staff</option>';

  itStaff.forEach((staff) => {
    if (staff && typeof staff === "string") {
      const option = document.createElement("option");
      option.value = staff;
      option.textContent = staff;
      DOM.actionByFilter.appendChild(option);
    }
  });

  console.log("🎨 Action By filter populated with:", itStaff.length, "staff");
}

// ==================== 📝 Dropdown Option Generators ====================

/**
 * Get action by options for dropdown
 */
function getActionByOptions(selected) {
  if (!window.CONFIG || !window.CONFIG.IT_STAFF) {
    console.error("IT_STAFF config not found");
    return '<option value="">No IT Staff</option>';
  }

  const options = window.CONFIG.IT_STAFF.map(
    (staff) =>
      `<option value="${staff}" ${staff === selected ? "selected" : ""}>${staff}</option>`
  );

  return options.join("");
}

/**
 * Get location options for dropdown
 */
function getLocationOptions(selected) {
  const list = [
    "Blue Office",
    "Clinic",
    "Control Room",
    "Dark Room",
    "Green Office",
    "HRD",
    "IT Store",
    "HSE Yard",
    "Maintenance",
    "Multi Purposes Building",
    "Red Office",
    "Security",
    "Warehouse",
    "White Office",
    "White Office 2nd Fl",
    "White Office 3rd Fl",
    "Welding School",
    "Workshop9",
    "Workshop10",
    "Workshop11",
    "Workshop12",
    "Lainlain",
  ];

  return list
    .map(
      (opt) =>
        `<option value="${opt}" ${opt === selected ? "selected" : ""}>${opt}</option>`
    )
    .join("");
}

/**
 * Get department options for dropdown
 */
function getDepartmentOptions(selected) {
  const list = [
    "Clinic",
    "Completion",
    "Document Control",
    "Engineer",
    "Finance",
    "HR",
    "HSE",
    "IT",
    "Maintenance",
    "Management",
    "Procurement",
    "QC",
    "Vendor",
    "Warehouse",
    "Lainlain",
  ];

  return list
    .map(
      (opt) =>
        `<option value="${opt}" ${opt === selected ? "selected" : ""}>${opt}</option>`
    )
    .join("");
}

/**
 * Get priority options for dropdown
 */
function getPriorityOptions(selected) {
  const list = ["Low", "Medium", "High"];
  return list
    .map(
      (opt) =>
        `<option value="${opt}" ${opt === selected ? "selected" : ""}>${opt}</option>`
    )
    .join("");
}

/**
 * Get status options for dropdown
 */
function getStatusOptions(selected) {
  const list = ["Open", "On Progress", "Closed"];
  return list
    .map(
      (opt) =>
        `<option value="${opt}" ${opt === selected ? "selected" : ""}>${opt}</option>`
    )
    .join("");
}

// ==================== 📤 Export Functions ====================

/**
 * Export to Excel (fallback)
 */
async function exportToExcel(tickets, filterInfo) {
  try {
    const csvContent = convertToCSV(tickets);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `tickets_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification(
      "Exported!",
      `${tickets.length} tickets exported successfully.`,
      "success"
    );
  } catch (error) {
    console.error("Export error:", error);
    showNotification("Export Failed", "Failed to export tickets.", "error");
  }
}

/**
 * Convert tickets to CSV format
 */
function convertToCSV(tickets) {
  const headers = [
    "Date",
    "Duration",
    "Inventory",
    "Device",
    "Name",
    "Email",
    "Phone",
    "Department",
    "Location",
    "Priority",
    "Subject",
    "Message",
    "Note",
    "Code",
    "Action By",
    "QA",
    "Status",
  ];

  const rows = tickets.map((ticket) => [
    formatDate(ticket.createdAt),
    calculateDuration(ticket),
    ticket.inventory || "",
    ticket.device || "",
    ticket.name || "",
    ticket.user_email || "",
    ticket.user_phone || "",
    ticket.department || "",
    ticket.location || "",
    ticket.priority || "",
    ticket.subject || "",
    ticket.message || "",
    ticket.note || "",
    ticket.code || "",
    ticket.action_by || "",
    ticket.qa || "",
    ticket.status_ticket || "",
  ]);

  return [headers, ...rows]
    .map((row) =>
      row
        .map((field) => `"${String(field || "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
}

// ==================== 📝 Initialize Application ====================

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("📝 DOM loaded, initializing app...");
  initAdminApp();
});

// Add responsive event listener with debounce
window.addEventListener("resize", function () {
  clearTimeout(AppState.resizeTimeout);
  AppState.resizeTimeout = setTimeout(() => {
    console.log("📝 Responsive view adjusted");
    handleResponsiveView();
  }, 250);
});

// Cleanup on page unload
window.addEventListener("beforeunload", cleanup);

// Export functions for global access
window.handleResponsiveView = handleResponsiveView;
window.addDataLabels = addDataLabels;
window.redirectToUserTicket = redirectToUserTicket;
window.redirectToLoginPage = redirectToLoginPage;
window.initTickets = initTickets;
window.getDisplayedTickets = getDisplayedTickets;
window.getCurrentFilterInfo = getCurrentFilterInfo;

console.log(
  "🚀 Admin JS with FAST Multiple Selection Delete loaded successfully"
);
