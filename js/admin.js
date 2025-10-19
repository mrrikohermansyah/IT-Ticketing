// ======================================================
// 🔹 js/admin.js — Responsive Admin Panel (Fixed Version)
// ======================================================

// ==================== 🔹 Firebase Imports ====================
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
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// ==================== 🔹 Firebase Config ====================
const firebaseConfig = {
  apiKey: "AIzaSyCQR--hn0RDvDduCjA2Opa9HLzyYn_GFIs",
  authDomain: "itticketing-f926e.firebaseapp.com",
  projectId: "itticketing-f926e",
  storageBucket: "itticketing-f926e.firebasestorage.app",
  messagingSenderId: "896370077103",
  appId: "1:896370077103:web:1d692e88b611bff838935a",
  measurementId: "G-TJCHPXG7D5",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ==================== 🔹 DOM Elements ====================
const ticketTableBody = document.getElementById("ticketTableBody");
const cardContainer = document.getElementById("cardContainer");
const switchViewBtn = document.getElementById("switchViewBtn");
const logoutBtn = document.getElementById("logoutBtn");
const exportBtn = document.getElementById("exportBtn");
const filterSelect = document.getElementById("filterSelect");
const loginBtn = document.getElementById("loginBtn");
const goLoginBtn = document.getElementById("goLoginBtn");

// ==================== 🔹 State ====================
let isCardView = false;
let allTickets = [];
let loginInProgress = false;
let ticketsUnsubscribe = null;
let durationIntervalId = null;

// ==================== 🔹 Admin Emails Whitelist ====================
const ADMIN_EMAILS = [
  "riko.hermansyah@meitech-ekabintan.com",
  "devi.armanda@meitech-ekabintan.com",
  "wahyu.nugroho@meitech-ekabintan.com",
  "abdurahman.hakim@meitech-ekabintan.com",
  "admin@meitech-ekabintan.com",
  "nimda@meitech-ekabintan.com",
];

// ==================== 🔹 IT Staff List ====================
const IT_STAFF = [
  "Riko Hermansyah",
  "Devi Armanda",
  "Wahyu Nugroho",
  "Abdurahman Hakim",
  "IT Support 1",
  "IT Support 2",
];

// ==================== 🔹 Device Type Mapping ====================
const deviceTypeMapping = {
  "PC Hardware": "HW",
  Laptop: "HW",
  Printer: "HW",
  Projector: "HW",
  "PC Software": "SW",
  Network: "NW",
  Others: "OT",
};

// ==================== 🔹 Initialize App ====================
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing app...");
  initAdminApp();
});

function initAdminApp() {
  console.log("🔄 Initializing admin application...");

  // Check if DOM elements exist
  if (!ticketTableBody) {
    console.error("❌ ticketTableBody not found");
  }
  if (!cardContainer) {
    console.error("❌ cardContainer not found");
  }

  // Add event listeners with null checks
  if (switchViewBtn) {
    switchViewBtn.addEventListener("click", toggleView);
  } else {
    console.warn("⚠️ switchViewBtn not found");
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", exportToExcel);
  }

  if (filterSelect) {
    filterSelect.addEventListener("change", handleFilterChange);
  }

  // Pisahkan event listener untuk kedua tombol login
  if (loginBtn) {
    loginBtn.addEventListener("click", handleGoogleLogin);
  }

  if (goLoginBtn) {
    goLoginBtn.addEventListener("click", redirectToLoginPage);
  }

  // Initialize responsive view
  handleResponsiveView();

  // Start auth state listener
  initAuth();
}

// ==================== 🔹 Redirect to Login Page ====================
function redirectToLoginPage() {
  console.log("🔀 Redirecting to login page...");
  window.location.href = "../login/index.html";
}

// ==================== 🔹 Check Admin Access ====================
function isAdminUser(user) {
  if (!user || !user.email) return false;

  const userEmail = user.email.toLowerCase();
  const isAdmin = ADMIN_EMAILS.some(
    (adminEmail) => adminEmail.toLowerCase() === userEmail
  );

  console.log("🔐 Admin Check:", {
    userEmail: userEmail,
    isAdmin: isAdmin,
    adminEmails: ADMIN_EMAILS,
  });

  return isAdmin;
}

// ==================== 🔹 Admin Auth Control ====================
function initAuth() {
  onAuthStateChanged(
    auth,
    (user) => {
      console.log("🔄 Auth state changed:", user ? "Logged in" : "Logged out");

      // Cleanup on logout
      if (!user) {
        cleanup();
        showAuthButtons(false);
        showLoginScreen();
        return;
      }

      console.log("📧 User email:", user.email);

      if (!isAdminUser(user)) {
        console.log("🚫 Access denied for email:", user.email);
        cleanup();
        showLoginScreen();

        Swal.fire({
          title: "Access Denied",
          html: `
            <div style="text-align: center;">
              <i class="fa-solid fa-ban" style="font-size: 3rem; color: #e74c3c; margin-bottom: 1rem;"></i>
              <h3>Admin Only Area</h3>
              <p>Email <strong>${user.email}</strong> tidak memiliki akses admin.</p>
              <p style="font-size: 0.9rem; color: #666;">Hubungi administrator untuk mendapatkan akses.</p>
            </div>
          `,
          icon: "error",
        }).then(() => {
          signOut(auth);
        });
        return;
      }

      // User is authenticated admin
      console.log("✅ Admin access granted for:", user.email);
      showAuthButtons(true);
      initTickets();

      // Show welcome message
      Swal.fire({
        title: "Login Successful!",
        html: `
          <div style="text-align: center;">
            <i class="fa-solid fa-check-circle" style="font-size: 3rem; color: #27ae60; margin-bottom: 1rem;"></i>
            <h3>Welcome Admin!</h3>
            <p>Selamat datang <strong>${
              user.displayName || user.email
            }</strong></p>
          </div>
        `,
        icon: "success",
        timer: 3000,
        showConfirmButton: false,
      });
    },
    (error) => {
      console.error("❌ Auth state error:", error);
      cleanup();
      showAuthButtons(false);
      showLoginScreen();
    }
  );
}

function showAuthButtons(isLoggedIn) {
  if (loginBtn) {
    loginBtn.style.display = isLoggedIn ? "none" : "flex";
    loginBtn.disabled = false;
  }
  if (goLoginBtn) {
    goLoginBtn.style.display = isLoggedIn ? "none" : "inline-flex";
    goLoginBtn.disabled = false;
  }
  if (logoutBtn) logoutBtn.style.display = isLoggedIn ? "inline-flex" : "none";
  if (exportBtn) exportBtn.style.display = isLoggedIn ? "inline-flex" : "none";
}

// ==================== 🔹 Show Login Screen ====================
function showLoginScreen() {
  // Cleanup data
  allTickets = [];

  if (ticketTableBody) {
    ticketTableBody.innerHTML = `
      <tr>
        <td colspan="15" class="login-prompt">
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

  // Untuk card container, kita HIDE saja, tidak perlu tampilkan login prompt
  if (cardContainer) {
    cardContainer.style.display = "none";
  }

  // Pastikan table wrapper visible
  const tableWrapper = document.querySelector(".table-wrapper");
  if (tableWrapper) {
    tableWrapper.style.display = "block";
  }
}

// ==================== 🔹 Google Login Handler ====================
async function handleGoogleLogin() {
  if (loginInProgress) {
    console.log("⏳ Login already in progress...");
    return;
  }

  loginInProgress = true;

  try {
    console.log("🔄 Attempting Google login...");

    if (loginBtn) loginBtn.disabled = true;
    if (goLoginBtn) goLoginBtn.disabled = true;

    const result = await signInWithPopup(auth, provider);
    console.log("✅ Login successful:", result.user.email);
  } catch (error) {
    console.error("❌ Login error details:", error);

    if (error.code === "auth/popup-blocked") {
      await Swal.fire({
        title: "Popup Blocked",
        text: "Popup login blocked by browser. Please allow popups for this site and try again.",
        icon: "warning",
      });
    } else if (error.code === "auth/popup-closed-by-user") {
      console.log("👤 User closed the popup");
    } else if (error.code === "auth/cancelled-popup-request") {
      console.log("🔄 Popup request cancelled");
    } else if (error.code === "auth/network-request-failed") {
      await Swal.fire({
        title: "Network Error",
        text: "There is a network connection problem. Please check your internet and try again.",
        icon: "error",
      });
    } else {
      await Swal.fire({
        title: "Login Failed",
        text: error.message,
        icon: "error",
      });
    }
  } finally {
    loginInProgress = false;
    if (loginBtn) loginBtn.disabled = false;
    if (goLoginBtn) goLoginBtn.disabled = false;
  }
}

// ==================== 🔹 Handle Logout dengan Cleanup ====================
async function handleLogout() {
  try {
    console.log("🚪 Logging out...");

    // Cleanup first
    cleanup();

    // Clear local data
    allTickets = [];

    // Show logout confirmation
    await Swal.fire({
      title: "Logging Out",
      text: "Please wait...",
      icon: "info",
      showConfirmButton: false,
      allowOutsideClick: false,
      timer: 1000,
    });

    // Perform logout
    await signOut(auth);

    console.log("✅ Logout successful");
  } catch (error) {
    console.error("❌ Logout error:", error);

    // Even if logout fails, clear local data and show login screen
    cleanup();
    allTickets = [];
    showLoginScreen();

    Swal.fire({
      title: "Logged Out",
      text: "You have been logged out of the admin panel.",
      icon: "info",
      timer: 2000,
      showConfirmButton: false,
    });
  }
}

// ==================== 🔹 Cleanup Function ====================
function cleanup() {
  console.log("🧹 Cleaning up resources...");

  // Unsubscribe from real-time listeners
  if (ticketsUnsubscribe) {
    ticketsUnsubscribe();
    ticketsUnsubscribe = null;
  }

  // Clear intervals
  if (durationIntervalId) {
    clearInterval(durationIntervalId);
    durationIntervalId = null;
  }
}

// ==================== 🔹 Load Tickets ====================
function initTickets() {
  console.log("🔄 Initializing tickets...");

  // Clear previous data
  allTickets = [];

  // Check authentication first
  if (!auth.currentUser) {
    console.log("🚫 User not authenticated, showing login screen");
    showLoginScreen();
    return;
  }

  // Show loading state - hanya di table, hide card container
  if (ticketTableBody) {
    ticketTableBody.innerHTML = `
      <tr>
        <td colspan="15" class="loading">
          <div style="text-align: center; padding: 2rem;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: #2563eb; margin-bottom: 1rem;"></i>
            <p>Loading tickets...</p>
          </div>
        </td>
      </tr>
    `;
  }

  // Pastikan card container hidden selama loading
  if (cardContainer) {
    cardContainer.style.display = "none";
  }

  // Pastikan table wrapper visible
  const tableWrapper = document.querySelector(".table-wrapper");
  if (tableWrapper) {
    tableWrapper.style.display = "block";
  }

  const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));

  ticketsUnsubscribe = onSnapshot(
    q,
    (snapshot) => {
      // Check if user is still logged in
      if (!auth.currentUser) {
        console.log("🚫 User logged out during data fetch");
        showLoginScreen();
        return;
      }

      const tickets = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("✅ Tickets loaded:", tickets.length);
      allTickets = tickets;
      renderTickets(tickets);

      // Start auto-updating durations
      startDurationUpdates();

      setTimeout(addDataLabels, 100);
    },
    (error) => {
      console.error("❌ Error loading tickets:", error);

      // Handle permission errors gracefully
      if (
        error.code === "permission-denied" ||
        error.code === "missing-or-insufficient-permissions"
      ) {
        console.log(
          "🔐 Permission denied - user might be logged out or not admin"
        );
        showLoginScreen();
      } else {
        showErrorState("Failed to load tickets: " + error.message);
      }
    }
  );
}

// ==================== 🔹 Duration Calculation ====================
function calculateDuration(ticket) {
  console.log("🔍 Debug calculateDuration - RAW TICKET:", ticket);

  // Handle missing fields dengan default values
  const ticketStatus = ticket.status || "Open";
  const hasClosedAt = !!ticket.closedAt;

  console.log("🔍 Debug calculateDuration - PROCESSED:", {
    ticketId: ticket.id,
    status: ticketStatus,
    closedAt: ticket.closedAt,
    createdAt: ticket.createdAt,
    hasClosedAt: hasClosedAt,
  });

  if (!ticket.createdAt) {
    console.log("❌ No createdAt found");
    return "-";
  }

  // Jika ticket belum closed atau tidak ada closedAt, tampilkan "-"
  if (ticketStatus !== "Closed" || !hasClosedAt) {
    console.log(
      "❌ Condition failed - status:",
      ticketStatus,
      "closedAt exists:",
      hasClosedAt
    );
    return "-";
  }

  const createdDate = ticket.createdAt.toDate
    ? ticket.createdAt.toDate()
    : new Date(ticket.createdAt);

  // HANYA gunakan closedAt (timestamp ketika pertama kali di-close)
  const endDate = ticket.closedAt.toDate
    ? ticket.closedAt.toDate()
    : new Date(ticket.closedAt);

  console.log("✅ Dates:", { createdDate, endDate });

  const duration = formatDuration(createdDate, endDate);
  console.log("✅ Calculated duration:", duration);

  return duration;
}

function formatDuration(startDate, endDate) {
  const diffMs = endDate - startDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 0) {
    return `${diffDays}d ${diffHours}h`;
  } else if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m`;
  } else {
    return "< 1m";
  }
}

// ==================== 🔹 Start Duration Updates ====================
function startDurationUpdates() {
  // Clear existing interval
  if (durationIntervalId) {
    clearInterval(durationIntervalId);
  }

  // Sekarang tidak perlu auto-update karena duration hanya untuk closed tickets
  // Interval dihapus karena tidak diperlukan lagi
  durationIntervalId = null;
}

function updateDurations() {
  // Update table view - hanya untuk ticket yang closed
  document.querySelectorAll("#ticketTableBody tr").forEach((row, index) => {
    const ticket = allTickets[index];
    if (ticket && ticket.status === "Closed") {
      const durationCell = row.cells[1]; // Kolom ke-2 (Duration)
      if (durationCell) {
        durationCell.innerHTML = `<span class="duration-badge ${getDurationClass(
          ticket
        )}" title="Duration sejak tiket dibuat sampai pertama kali ditutup">
          ${calculateDuration(ticket)}
        </span>`;
      }
    }
  });

  // Update card view - hanya untuk ticket yang closed
  document.querySelectorAll(".ticket-card").forEach((card, index) => {
    const ticket = allTickets[index];
    if (ticket && ticket.status === "Closed") {
      const durationField = card.querySelector(".card-field:nth-child(2)"); // Field duration ke-2
      if (durationField) {
        durationField.querySelector(
          "span"
        ).innerHTML = `<span class="duration-badge ${getDurationClass(
          ticket
        )}" title="Duration sejak tiket dibuat sampai pertama kali ditutup">
          ${calculateDuration(ticket)}
        </span>`;
      }
    }
  });
}

// Helper function untuk duration badge color
function getDurationClass(ticket) {
  if (!ticket.createdAt) return "duration-neutral";

  // Handle missing status
  const ticketStatus = ticket.status || "Open";

  // Untuk ticket yang belum closed, gunakan class neutral
  if (ticketStatus !== "Closed" || !ticket.closedAt) {
    return "duration-neutral";
  }

  const createdDate = ticket.createdAt.toDate
    ? ticket.createdAt.toDate()
    : new Date(ticket.createdAt);

  const endDate = ticket.closedAt.toDate
    ? ticket.closedAt.toDate()
    : new Date(ticket.closedAt);

  const diffHours = (endDate - createdDate) / (1000 * 60 * 60);

  if (diffHours > 24) return "duration-long";
  if (diffHours > 4) return "duration-medium";
  return "duration-short";
}

// ==================== 🔹 Render Functions ====================
function renderTickets(tickets) {
  if (!tickets || tickets.length === 0) {
    showEmptyState();
    return;
  }

  const filtered =
    filterSelect && filterSelect.value !== "all"
      ? tickets.filter((t) => t.status === filterSelect.value)
      : tickets;

  if (isCardView) {
    renderCards(filtered);
  } else {
    renderTable(filtered);
  }
}

function renderTable(data) {
  if (!ticketTableBody) return;

  // Hide card container, show table
  if (cardContainer) cardContainer.style.display = "none";
  const tableWrapper = document.querySelector(".table-wrapper");
  if (tableWrapper) tableWrapper.style.display = "block";

  ticketTableBody.innerHTML = "";

  data.forEach((ticket) => {
    console.log("🔍 Render Ticket:", {
      id: ticket.id,
      status: ticket.status,
      closedAt: ticket.closedAt,
      duration: calculateDuration(ticket),
    });

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <!-- ✅ Date -->
      <td>${formatDate(ticket.createdAt)}</td>
      
      <!-- ✅ Duration (NEW) -->
      <td>
        <span class="duration-badge ${getDurationClass(ticket)}" title="${
      ticket.status === "Closed"
        ? "Duration sejak tiket dibuat sampai pertama kali ditutup"
        : "Duration akan muncul ketika tiket ditutup"
    }">
          ${calculateDuration(ticket)}
        </span>
      </td>
      
      <!-- ✅ Inventory -->
      <td>${ticket.inventory || "-"}</td>
      
      <!-- ✅ Device -->
      <td>${ticket.device || "-"}</td>
      
      <!-- ✅ Name -->
      <td>${ticket.name || "-"}</td>
      
      <!-- ✅ Email -->
      <td>${ticket.user_email || "-"}</td>
      
      <!-- ✅ Department -->
      <td>${ticket.department || "-"}</td>
      
      <!-- ✅ Location -->
      <td>${ticket.location || "-"}</td>
      
      <!-- ✅ Priority -->
      <td>
        <span class="priority-badge priority-${
          ticket.priority?.toLowerCase() || "medium"
        }">
          ${ticket.priority || "Medium"}
        </span>
      </td>
      
      <!-- ✅ Subject -->
      <td>${ticket.subject || "-"}</td>
      
      <!-- ✅ Message -->
      <td class="note-cell">${ticket.message || "-"}</td>
      
      <!-- ✅ Note -->
      <td class="note-cell">${ticket.note || "-"}</td>
      
      <!-- ✅ Action By -->
      <td>${ticket.actionBy || "-"}</td>
      
      <!-- ✅ Status -->
      <td>
        <span class="status-badge status-${
          ticket.status?.replace(" ", "").toLowerCase() || "open"
        }">
          ${ticket.status || "Open"}
        </span>
      </td>
      
      <!-- ✅ Actions -->
      <td>
        <div class="action-buttons">
          <button class="edit-btn" data-id="${
            ticket.id
          }" aria-label="Edit ticket ${ticket.id}">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="delete-btn" data-id="${
            ticket.id
          }" aria-label="Delete ticket ${ticket.id}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    ticketTableBody.appendChild(tr);
  });

  attachRowEvents();
}

function renderCards(data) {
  if (!cardContainer) return;

  // Hide table, show card container
  const tableWrapper = document.querySelector(".table-wrapper");
  if (tableWrapper) tableWrapper.style.display = "none";
  cardContainer.style.display = "grid";

  cardContainer.innerHTML = "";

  data.forEach((ticket) => {
    const card = document.createElement("div");
    card.className = "ticket-card";
    card.innerHTML = `
      <div class="card-header">
        <h3>Ticket</h3>
        <span class="status-badge status-${
          ticket.status?.replace(" ", "").toLowerCase() || "open"
        }">
          ${ticket.status || "Open"}
        </span>
      </div>
      
      <div class="card-content">
        <!-- ✅ Date -->
        <div class="card-field">
          <strong><i class="fa-solid fa-calendar"></i> Date</strong>
          <span>${formatDate(ticket.createdAt)}</span>
        </div>
        
        <!-- ✅ Duration (NEW) -->
        <div class="card-field">
          <strong><i class="fa-solid fa-clock"></i> Duration</strong>
          <span class="duration-badge ${getDurationClass(ticket)}" 
                title="${
                  ticket.status === "Closed"
                    ? "Duration sejak tiket dibuat sampai pertama kali ditutup"
                    : "Duration akan muncul ketika tiket ditutup"
                }">
            ${calculateDuration(ticket)}
          </span>
        </div>
        
        <!-- ✅ Inventory -->
        <div class="card-field">
          <strong><i class="fa-solid fa-barcode"></i> Inventory</strong>
          <span>${ticket.inventory || "-"}</span>
        </div>
        
        <!-- ✅ Device -->
        <div class="card-field">
          <strong><i class="fa-solid fa-computer"></i> Device</strong>
          <span>${ticket.device || "-"}</span>
        </div>
        
        <!-- ✅ Name -->
        <div class="card-field">
          <strong><i class="fa-solid fa-user"></i> Name</strong>
          <span>${ticket.name || "-"}</span>
        </div>
        
        <!-- ✅ Email -->
        <div class="card-field">
          <strong><i class="fa-solid fa-envelope"></i> Email</strong>
          <span>${ticket.user_email || "-"}</span>
        </div>
        
        <!-- ✅ Department -->
        <div class="card-field">
          <strong><i class="fa-solid fa-building"></i> Department</strong>
          <span>${ticket.department || "-"}</span>
        </div>
        
        <!-- ✅ Location -->
        <div class="card-field">
          <strong><i class="fa-solid fa-location-dot"></i> Location</strong>
          <span>${ticket.location || "-"}</span>
        </div>
        
        <!-- ✅ Priority -->
        <div class="card-field">
          <strong><i class="fa-solid fa-flag"></i> Priority</strong>
          <span class="priority-badge priority-${
            ticket.priority?.toLowerCase() || "medium"
          }">
            ${ticket.priority || "Medium"}
          </span>
        </div>
        
        <!-- ✅ Subject -->
        <div class="card-field">
          <strong><i class="fa-solid fa-tag"></i> Subject</strong>
          <span>${ticket.subject || "-"}</span>
        </div>
        
        <!-- ✅ Message -->
        <div class="card-field">
          <strong><i class="fa-solid fa-message"></i> Message</strong>
          <span>${ticket.message || "-"}</span>
        </div>
        
        <!-- ✅ Note -->
        <div class="card-field">
          <strong><i class="fa-solid fa-note-sticky"></i> Note</strong>
          <span>${ticket.note || "-"}</span>
        </div>
        
        <!-- ✅ Action By -->
        <div class="card-field">
          <strong><i class="fa-solid fa-user-gear"></i> Action By</strong>
          <span>${ticket.actionBy || "-"}</span>
        </div>
      </div>
      
      <div class="card-actions">
        <button class="edit-btn" data-id="${ticket.id}">
          <i class="fa-solid fa-pen"></i> Edit
        </button>
        <button class="delete-btn" data-id="${ticket.id}">
          <i class="fa-solid fa-trash"></i> Delete
        </button>
      </div>
    `;
    cardContainer.appendChild(card);
  });

  attachRowEvents();
}

function showEmptyState() {
  if (ticketTableBody) {
    ticketTableBody.innerHTML = `
      <tr>
        <td colspan="15" class="empty-state">
          <i class="fa-solid fa-inbox"></i>
          <p>No tickets found</p>
          <p style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">Belum ada tiket yang dibuat</p>
        </td>
      </tr>
    `;
  }

  // Untuk card container, hide saja ketika empty state
  if (cardContainer) {
    cardContainer.style.display = "none";
  }

  // Pastikan table wrapper visible
  const tableWrapper = document.querySelector(".table-wrapper");
  if (tableWrapper) {
    tableWrapper.style.display = "block";
  }
}

function showErrorState(message) {
  if (ticketTableBody) {
    ticketTableBody.innerHTML = `
      <tr>
        <td colspan="15" class="error-state">
          <i class="fa-solid fa-exclamation-triangle"></i>
          <p>${message}</p>
          <button onclick="initTickets()" style="margin-top: 10px; padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">
            <i class="fa-solid fa-refresh"></i> Try Again
          </button>
        </td>
      </tr>
    `;
  }

  // Untuk card container, hide saja ketika error state
  if (cardContainer) {
    cardContainer.style.display = "none";
  }
}

// ==================== 🔹 View Controls ====================
function toggleView() {
  isCardView = !isCardView;

  if (switchViewBtn) {
    switchViewBtn.innerHTML = isCardView
      ? '<i class="fa-solid fa-table"></i> Switch to Table View'
      : '<i class="fa-solid fa-id-card"></i> Switch to Card View';
  }

  renderTickets(allTickets);
}

function handleFilterChange() {
  renderTickets(allTickets);
}

// ==================== 🔹 Responsive Auto Mode ====================
function handleResponsiveView() {
  if (window.innerWidth <= 768) {
    isCardView = true;
    if (switchViewBtn) switchViewBtn.style.display = "none";
  } else {
    isCardView = false;
    if (switchViewBtn) switchViewBtn.style.display = "inline-flex";
  }

  if (allTickets.length > 0) {
    renderTickets(allTickets);
  }
}

window.addEventListener("resize", handleResponsiveView);

// ==================== 🔹 Format Date ====================
function formatDate(ts) {
  if (!ts) return "-";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ==================== 🔹 Attach Edit/Delete Events ====================
function attachRowEvents() {
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", handleEdit);
  });
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", handleDelete);
  });
}

// ==================== 🔹 Handle Delete ====================
async function handleDelete(e) {
  const id = e.currentTarget.dataset.id;

  const confirmed = await Swal.fire({
    title: "Delete this ticket?",
    text: `Are you sure you want to delete this ticket?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete it",
    cancelButtonText: "Cancel",
  });

  if (!confirmed.isConfirmed) return;

  try {
    await deleteDoc(doc(db, "tickets", id));
    Swal.fire("Deleted!", "Ticket has been removed.", "success");
  } catch (error) {
    console.error("Delete error:", error);
    Swal.fire("Error!", "Failed to delete ticket.", "error");
  }
}

// ==================== 🔹 Handle Edit ====================
async function handleEdit(e) {
  const id = e.currentTarget.dataset.id;

  try {
    const docRef = doc(db, "tickets", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      Swal.fire("Error!", "Ticket not found.", "error");
      return;
    }

    const data = docSnap.data();

    // Handle missing fields in existing data
    const currentStatus = data.status || "Open";
    const hasClosedAt = !!data.closedAt;

    const { value: formValues } = await Swal.fire({
      title: "Edit Ticket",
      html: `
        <div class="form-grid">
          <div class="form-group">
            <label><i class="fa-solid fa-note-sticky"></i> Note</label>
            <textarea id="note" class="swal2-textarea" placeholder="Add notes or updates...">${
              data.note || ""
            }</textarea>
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-user-gear"></i> Action By</label>
            <select id="actionBy" class="swal2-select">
              <option value="">-- Select IT Staff --</option>
              ${getActionByOptions(data.actionBy)}
            </select>
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-computer"></i> Device Type</label>
            <select id="device" class="swal2-select">
              ${getDeviceOptions(data.device)}
            </select>
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-location-dot"></i> Location</label>
            <select id="location" class="swal2-select">
              ${getLocationOptions(data.location)}
            </select>
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-building"></i> Department</label>
            <select id="department" class="swal2-select">
              ${getDepartmentOptions(data.department)}
            </select>
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-flag"></i> Priority</label>
            <select id="priority" class="swal2-select">
              ${getPriorityOptions(data.priority)}
            </select>
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-circle-check"></i> Status</label>
            <select id="status" class="swal2-select">
              ${getStatusOptions(currentStatus)}
            </select>
          </div>
        </div>
        <div style="margin-top: 10px; font-size: 0.8rem; color: #666;">
          <i class="fa-solid fa-info-circle"></i> 
          ${
            currentStatus === "Closed"
              ? 'Duration sudah terkalkulasi. Ubah status ke "Open" untuk reset duration.'
              : 'Duration akan terkalkulasi ketika status diubah ke "Closed"'
          }
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Update Ticket",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        return {
          note: document.getElementById("note").value,
          actionBy: document.getElementById("actionBy").value,
          device: document.getElementById("device").value,
          location: document.getElementById("location").value,
          department: document.getElementById("department").value,
          priority: document.getElementById("priority").value,
          status: document.getElementById("status").value,
        };
      },
      didOpen: () => {
        // Add styling for the form
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
      },
    });

    if (!formValues) return;

    // Logic untuk menangani closedAt timestamp
    const updateData = {
      ...formValues,
      updatedAt: serverTimestamp(),
    };

    // Update code berdasarkan device type yang baru
    if (formValues.device) {
      updateData.code = deviceTypeMapping[formValues.device] || "OT";
    }

    console.log("🔍 Edit Debug:", {
      currentStatus: currentStatus,
      newStatus: formValues.status,
      hasClosedAt: hasClosedAt,
      device: formValues.device,
      code: updateData.code,
    });

    // HANYA jika status berubah dari non-Closed ke Closed
    if (formValues.status === "Closed" && currentStatus !== "Closed") {
      updateData.closedAt = serverTimestamp();
      console.log("🔄 First time closed - setting closedAt timestamp");
    }
    // Jika status berubah dari Closed ke non-Closed, hapus closedAt untuk reset
    else if (formValues.status !== "Closed" && currentStatus === "Closed") {
      updateData.closedAt = null;
      console.log("🔄 Reopened ticket - clearing closedAt timestamp");
    }
    // Jika sudah closed dan tetap closed, JANGAN ubah closedAt
    else if (formValues.status === "Closed" && currentStatus === "Closed") {
      console.log("🔒 Ticket tetap closed - closedAt tidak diubah");
    }

    console.log("📤 Update data:", updateData);
    await updateDoc(docRef, updateData);

    Swal.fire("Updated!", "Ticket updated successfully.", "success");

    // Refresh durations setelah perubahan status
    updateDurations();
  } catch (error) {
    console.error("Edit error:", error);
    Swal.fire("Error!", "Failed to update ticket.", "error");
  }
}

// ==================== 🔹 Dropdown Option Generators ====================
function getDeviceOptions(selected) {
  const devices = [
    "PC Hardware",
    "PC Software",
    "Laptop",
    "Printer",
    "Network",
    "Projector",
    "Others",
  ];

  return devices
    .map(
      (device) =>
        `<option value="${device}" ${
          device === selected ? "selected" : ""
        }>${device}</option>`
    )
    .join("");
}

function getActionByOptions(selected) {
  return IT_STAFF.map(
    (staff) =>
      `<option value="${staff}" ${
        staff === selected ? "selected" : ""
      }>${staff}</option>`
  ).join("");
}

function getLocationOptions(selected) {
  const list = [
    "Blue Office",
    "Clinic",
    "Control Room",
    "Dark Room",
    "Green Office",
    "HRD",
    "HSE Yard",
    "Multi Purposes Building",
    "Red Office",
    "Security",
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
        `<option value="${opt}" ${
          opt === selected ? "selected" : ""
        }>${opt}</option>`
    )
    .join("");
}

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
    "Management",
    "Procurement",
    "QC",
    "Vendor",
    "Lainlain",
  ];
  return list
    .map(
      (opt) =>
        `<option value="${opt}" ${
          opt === selected ? "selected" : ""
        }>${opt}</option>`
    )
    .join("");
}

function getPriorityOptions(selected) {
  const list = ["Low", "Medium", "High"];
  return list
    .map(
      (opt) =>
        `<option value="${opt}" ${
          opt === selected ? "selected" : ""
        }>${opt}</option>`
    )
    .join("");
}

function getStatusOptions(selected) {
  const list = ["Open", "On Progress", "Closed"];
  return list
    .map(
      (opt) =>
        `<option value="${opt}" ${
          opt === selected ? "selected" : ""
        }>${opt}</option>`
    )
    .join("");
}

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

      // Map device type ke kode yang sesuai - GUNAKAN MAPPING YANG SAMA
      const deviceCode = deviceTypeMapping[ticket.device] || "OT";

      const rowData = [
        // Tgl. / Date
        formatDateForExcel(ticket.createdAt),
        // Kode Inv. (uraian) / Inv. Code (Description)
        ticket.inventory || "-",
        // Kode / Code - MAPPED DEVICE CODE (HW/SW/NW/OT)
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

// Helper function untuk format duration Excel (dalam menit saja)
function formatDurationForExcel(ticket) {
  if (!ticket.createdAt) return "-";

  const ticketStatus = ticket.status || "Open";
  const hasClosedAt = !!ticket.closedAt;

  // Jika ticket belum closed, return "-"
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
  const totalMinutes = Math.floor(diffMs / (1000 * 60));

  // Format dalam menit saja
  if (totalMinutes === 0) {
    return "Less than 1 Minute";
  } else if (totalMinutes === 1) {
    return "1 Minute";
  } else {
    return `${totalMinutes.toLocaleString()} Minutes`;
  }
}

// Helper function untuk format date Excel
function formatDateForExcel(ts) {
  if (!ts) return "-";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date;
}

// Dynamic load ExcelJS
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

// ==================== 🔹 Utility Functions ====================
function addDataLabels() {
  const table = document.getElementById("ticketsTable");
  if (!table) return;

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
}

// Add CSS untuk Duration Badge dan Login Button
const style = document.createElement("style");
style.textContent = `
  .duration-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
  }
  
  .duration-short {
    background: #d1fae5;
    color: #065f46;
  }
  
  .duration-medium {
    background: #fef3c7;
    color: #92400e;
  }
  
  .duration-long {
    background: #fee2e2;
    color: #991b1b;
  }
  
  .duration-closed {
    background: #e0e7ff;
    color: #3730a3;
  }
  
  .duration-neutral {
    background: #f3f4f6;
    color: #6b7280;
  }
  
  .login-redirect-btn {
    padding: 10px 20px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
  }
  
  .login-redirect-btn:hover {
    background: #1d4ed8;
  }
`;
document.head.appendChild(style);

// Export functions for global access (if needed)
window.handleResponsiveView = handleResponsiveView;
window.addDataLabels = addDataLabels;
window.redirectToLoginPage = redirectToLoginPage;
window.initTickets = initTickets;
window.exportToExcel = exportToExcel;

// Cleanup on page unload
window.addEventListener("beforeunload", cleanup);

console.log("✅ Admin JS loaded successfully");
