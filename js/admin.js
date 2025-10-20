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
const actionByFilter = document.getElementById("actionByFilter");
const loginBtn = document.getElementById("loginBtn");
const goLoginBtn = document.getElementById("goLoginBtn");
const userInfo = document.getElementById("userInfo");
const userName = document.getElementById("userName");

// ==================== 🔹 State ====================
let isCardView = false;
let allTickets = [];
let loginInProgress = false;
let ticketsUnsubscribe = null;
let durationIntervalId = null;

// ==================== 🔹 Helper Functions ====================
function getAdminDisplayName(user) {
  if (!user || !user.email) return "IT Support";

  const userEmail = user.email.toLowerCase();

  // Cek mapping dulu
  const mappedName = window.CONFIG.ADMIN_NAME_MAPPING[userEmail];
  if (mappedName) {
    console.log("✅ Using mapped name:", mappedName);
    return mappedName;
  }

  // Jika tidak ada mapping, gunakan displayName dari Google
  if (user.displayName) {
    console.log("✅ Using Google displayName:", user.displayName);
    return user.displayName;
  }

  // Fallback: extract dari email (first part)
  const nameFromEmail = userEmail
    .split("@")[0]
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  console.log("✅ Using name from email:", nameFromEmail);
  return nameFromEmail;
}

// ✅ VALIDASI FUNCTION
function validateTicketBeforeSave(ticketData) {
  console.log("🔍 Validating ticket data:", ticketData);

  if (
    (ticketData.status_ticket === "Closed" ||
      ticketData.status_ticket === "Resolved") &&
    !ticketData.note
  ) {
    throw new Error("📝 Harap isi Technician Notes sebelum menutup ticket!");
  }

  return true;
}

// ✅ FUNCTION UNTUK POPULATE ACTION BY FILTER
function populateActionByFilter() {
  if (!actionByFilter) return;

  // Ambil daftar IT Staff dari CONFIG
  const itStaff = window.CONFIG.IT_STAFF || [];

  // Clear existing options kecuali "All"
  actionByFilter.innerHTML = '<option value="all">All IT Staff</option>';

  // Tambahkan setiap IT Staff sebagai option
  itStaff.forEach((staff) => {
    const option = document.createElement("option");
    option.value = staff;
    option.textContent = staff;
    actionByFilter.appendChild(option);
  });

  console.log("✅ Action By filter populated with:", itStaff);
}

// ==================== 🔹 Session Storage Management ====================
function setupSessionStorage() {
  const sessionData = sessionStorage.getItem("adminFirstLogin");
  if (sessionData) {
    // Optional: Check if session is too old (e.g., more than 8 hours)
    const sessionTime = sessionStorage.getItem("adminSessionTime");
    if (sessionTime) {
      const timeDiff = Date.now() - parseInt(sessionTime);
      const eightHours = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

      if (timeDiff > eightHours) {
        // Session terlalu lama, clear dan anggap sebagai login baru
        sessionStorage.removeItem("adminFirstLogin");
        sessionStorage.removeItem("adminSessionTime");
        console.log("🕒 Session expired - cleared storage");
      }
    } else {
      // Set session time jika belum ada
      sessionStorage.setItem("adminSessionTime", Date.now().toString());
    }
  }
}

// ==================== 🔹 Initialize App ====================
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing app...");
  initAdminApp();
});

function initAdminApp() {
  console.log("🔄 Initializing admin application...");

  // Setup session storage management
  setupSessionStorage();

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
    exportBtn.addEventListener("click", () => {
      console.log("📤 Export clicked, allTickets:", allTickets?.length);

      // ✅ FIX: Pastikan allTickets tersedia
      if (!allTickets || allTickets.length === 0) {
        Swal.fire({
          title: "No Data",
          text: "Tidak ada data tiket untuk diekspor. Silakan tunggu hingga data dimuat.",
          icon: "warning",
        });
        return;
      }

      // ✅ APPLY SAME FILTERS FOR EXPORT
      let filtered = allTickets;

      if (filterSelect && filterSelect.value !== "all") {
        filtered = filtered.filter(
          (t) => t.status_ticket === filterSelect.value,
        );
      }

      if (actionByFilter && actionByFilter.value !== "all") {
        filtered = filtered.filter((t) => t.action_by === actionByFilter.value);
      }

      exportToExcel(filtered, filterSelect);
    });
  }

  if (filterSelect) {
    filterSelect.addEventListener("change", handleFilterChange);
  }

  // ✅ TAMBAHKAN EVENT LISTENER UNTUK ACTION BY FILTER
  if (actionByFilter) {
    actionByFilter.addEventListener("change", handleFilterChange);
    // Populate filter options
    populateActionByFilter();
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
  const isAdmin = window.CONFIG.ADMIN_EMAILS.some(
    (adminEmail) => adminEmail.toLowerCase() === userEmail,
  );

  console.log("🔐 Admin Check:", {
    userEmail: userEmail,
    isAdmin: isAdmin,
    adminEmails: window.CONFIG.ADMIN_EMAILS,
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
        // Clear session storage pada logout
        sessionStorage.removeItem("adminFirstLogin");
        sessionStorage.removeItem("adminSessionTime");
        cleanup();
        showAuthButtons(false);
        showLoginScreen();
        return;
      }

      console.log("📧 User email:", user.email);
      console.log("👤 User displayName:", user.displayName);

      if (!isAdminUser(user)) {
        console.log("🚫 Access denied for email:", user.email);
        sessionStorage.removeItem("adminFirstLogin");
        sessionStorage.removeItem("adminSessionTime");
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
      showAuthButtons(true, user);
      initTickets();

      // ✅ CHECK: Apakah ini login pertama kali atau page refresh?
      const isFirstLogin = !sessionStorage.getItem("adminFirstLogin");

      if (isFirstLogin) {
        // Ini adalah login pertama kali, tampilkan welcome message
        const displayName = getAdminDisplayName(user);

        Swal.fire({
          title: "Login Successful!",
          html: `
            <div style="text-align: center;">
              <i class="fa-solid fa-check-circle" style="font-size: 3rem; color: #27ae60; margin-bottom: 1rem;"></i>
              <h3>Welcome Admin!</h3>
              <p>Selamat datang <strong>${displayName}</strong></p>
              <p style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">
                Anda login sebagai <strong>${user.email}</strong>
              </p>
            </div>
          `,
          icon: "success",
          timer: 3000,
          showConfirmButton: false,
        });

        // Set session storage untuk menandai sudah login
        sessionStorage.setItem("adminFirstLogin", "true");
        sessionStorage.setItem("adminSessionTime", Date.now().toString());
        console.log("🎉 First login - welcome message shown");
      } else {
        console.log("🔄 Page refresh - no welcome message");
      }
    },
    (error) => {
      console.error("❌ Auth state error:", error);
      sessionStorage.removeItem("adminFirstLogin");
      sessionStorage.removeItem("adminSessionTime");
      cleanup();
      showAuthButtons(false);
      showLoginScreen();
    },
  );
}

function showAuthButtons(isLoggedIn, user = null) {
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

  // Tampilkan user info jika login
  if (userInfo) {
    userInfo.style.display = isLoggedIn ? "flex" : "none";
  }

  // Set nama user menggunakan getAdminDisplayName
  if (userName && user) {
    const displayName = getAdminDisplayName(user);
    userName.textContent = displayName;

    console.log("👤 User display info:", {
      email: user.email,
      googleDisplayName: user.displayName,
      finalDisplayName: displayName,
    });
  }
}

// ==================== 🔹 Show Login Screen ====================
function showLoginScreen() {
  // Cleanup data
  allTickets = [];

  if (ticketTableBody) {
    ticketTableBody.innerHTML = `
      <tr>
        <td colspan="18" class="login-prompt">
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

    // Set session storage untuk menandai first login
    sessionStorage.setItem("adminFirstLogin", "true");
    sessionStorage.setItem("adminSessionTime", Date.now().toString());
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

    // Clear session storage
    sessionStorage.removeItem("adminFirstLogin");
    sessionStorage.removeItem("adminSessionTime");

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
    sessionStorage.removeItem("adminFirstLogin");
    sessionStorage.removeItem("adminSessionTime");
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
        <td colspan="18" class="loading">
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
      if (typeof updateAllTickets === "function") {
        updateAllTickets(tickets);
      }
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
          "🔐 Permission denied - user might be logged out or not admin",
        );
        showLoginScreen();
      } else {
        showErrorState("Failed to load tickets: " + error.message);
      }
    },
  );
}

// ==================== 🔹 Duration Calculation ====================
function calculateDuration(ticket) {
  console.log("🔍 Debug calculateDuration - RAW TICKET:", ticket);

  // Handle missing fields dengan default values
  const ticketStatus = ticket.status_ticket || "Open";
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
      hasClosedAt,
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
  const diffMinutes = Math.floor(diffMs / (1000 * 60)); // Konversi langsung ke menit

  if (diffMinutes > 0) {
    return `${diffMinutes} Minute${diffMinutes > 1 ? "s" : ""}`;
  } else {
    return "Less than 1 Minute";
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
    if (ticket && ticket.status_ticket === "Closed") {
      const durationCell = row.cells[1]; // Kolom ke-2 (Duration)
      if (durationCell) {
        durationCell.innerHTML = `<span class="duration-badge ${getDurationClass(
          ticket,
        )}" title="Duration sejak tiket dibuat sampai pertama kali ditutup">
          ${calculateDuration(ticket)}
        </span>`;
      }
    }
  });

  // Update card view - hanya untuk ticket yang closed
  document.querySelectorAll(".ticket-card").forEach((card, index) => {
    const ticket = allTickets[index];
    if (ticket && ticket.status_ticket === "Closed") {
      const durationField = card.querySelector(".card-field:nth-child(2)"); // Field duration ke-2
      if (durationField) {
        durationField.querySelector("span").innerHTML =
          `<span class="duration-badge ${getDurationClass(
            ticket,
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
  const ticketStatus = ticket.status_ticket || "Open";

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

  // ✅ APPLY MULTIPLE FILTERS
  let filtered = tickets;

  // Filter by status
  if (filterSelect && filterSelect.value !== "all") {
    filtered = filtered.filter((t) => t.status_ticket === filterSelect.value);
  }

  // Filter by Action By
  if (actionByFilter && actionByFilter.value !== "all") {
    filtered = filtered.filter((t) => t.action_by === actionByFilter.value);
  }

  console.log("🔍 Filtered tickets:", {
    original: tickets.length,
    filtered: filtered.length,
    statusFilter: filterSelect?.value,
    actionByFilter: actionByFilter?.value,
  });

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
      status: ticket.status_ticket,
      closedAt: ticket.closedAt,
      duration: calculateDuration(ticket),
    });

    // ✅ AUTO QA: Tentukan nilai QA untuk display
    const displayQA = ticket.status_ticket === "Closed" ? "Finish" : "Continue";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <!-- ✅ Date -->
      <td>${formatDate(ticket.createdAt)}</td>
      
      <!-- ✅ Duration (NEW) -->
      <td>
        <span class="duration-badge ${getDurationClass(ticket)}" title="${
          ticket.status_ticket === "Closed"
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

      <!-- ✅ Email (UPDATED - bisa diedit) -->
      <td>
        <span class="email-cell" title="${ticket.user_email || "-"}">
          ${ticket.user_email || "-"}
        </span>
      </td>

      <!-- ✅ Phone -->
      <td>${ticket.user_phone || "-"}</td>
      
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

      <!-- ✅ Code -->
      <td>${ticket.code || "-"}</td>
      
      <!-- ✅ Action By -->
      <td>${ticket.action_by || "-"}</td>

      <!-- ✅ QA (Auto) -->
      <td>
        <span class="qa-badge qa-${displayQA.toLowerCase()}">
          ${displayQA}
        </span>
      </td>
      
      <!-- ✅ Status -->
      <td>
        <span class="status-badge status-${
          ticket.status_ticket?.replace(" ", "").toLowerCase() || "open"
        }">
          ${ticket.status_ticket || "Open"}
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
    // ✅ AUTO QA: Tentukan nilai QA untuk display
    const displayQA = ticket.status_ticket === "Closed" ? "Finish" : "Continue";

    const card = document.createElement("div");
    card.className = "ticket-card";
    card.innerHTML = `
      <div class="card-header">
        <h3>Ticket</h3>
        <span class="status-badge status-${
          ticket.status_ticket?.replace(" ", "").toLowerCase() || "open"
        }">
          ${ticket.status_ticket || "Open"}
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
                  ticket.status_ticket === "Closed"
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

        <!-- ✅ Email (UPDATED - bisa diedit) -->
        <div class="card-field">
          <strong><i class="fa-solid fa-envelope"></i> Email</strong>
          <span class="email-cell" title="${ticket.user_email || "-"}">
            ${ticket.user_email || "-"}
          </span>
        </div>

        <!-- ✅ Phone -->
        <div class="card-field">
          <strong><i class="fa-solid fa-phone"></i> Phone</strong>
          <span>${ticket.user_phone || "-"}</span>
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

        <!-- ✅ Code -->
        <div class="card-field">
          <strong><i class="fa-solid fa-code"></i> Code</strong>
          <span>${ticket.code || "-"}</span>
        </div>
        
        <!-- ✅ Action By -->
        <div class="card-field">
          <strong><i class="fa-solid fa-user-gear"></i> Action By</strong>
          <span>${ticket.action_by || "-"}</span>
        </div>

        <!-- ✅ QA (Auto) -->
        <div class="card-field">
          <strong><i class="fa-solid fa-check-double"></i> QA</strong>
          <span class="qa-badge qa-${displayQA.toLowerCase()}">
            ${displayQA}
          </span>
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
        <td colspan="18" class="empty-state">
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
        <td colspan="18" class="error-state">
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
    const currentUser = auth.currentUser;

    // Dapatkan nama admin yang sedang login untuk default actionBy
    const currentAdminName = getAdminDisplayName(currentUser);

    // Handle missing fields in existing data
    const currentStatus = data.status_ticket || "Open";
    const hasClosedAt = !!data.closedAt;

    // ✅ AUTO QA: Tentukan nilai QA berdasarkan status
    const getAutoQA = (status) => {
      return status === "Closed" ? "Finish" : "Continue";
    };

    const currentQA = getAutoQA(currentStatus);

    const { value: formValues } = await Swal.fire({
      title: "Edit Ticket",
      html: `
        <div class="form-grid">
        <!-- ✅ TAMBAH FIELD EMAIL -->
          <div class="form-group">
            <label><i class="fa-solid fa-envelope"></i> User Email</label>
            <input type="email" id="user_email" class="swal2-input" value="${
              data.user_email || ""
            }" placeholder="user@company.com">
          </div>
<!-- ✅ TAMBAH FIELD NAME YANG HILANG -->
      <div class="form-group">
        <label><i class="fa-solid fa-user"></i> Name</label>
        <input type="text" id="name" class="swal2-input" value="${
          data.name || ""
        }" placeholder="User Name">
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
          <input type="tel" id="user_phone" class="swal2-select" value="${
            data.user_phone || ""
          }" placeholder="+62 XXX-XXXX-XXXX">
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
            <select id="status_ticket" class="swal2-select">
            ${getStatusOptions(currentStatus)}
            </select>
            </div>

              <div class="form-group" style="grid-column: 1 / -1;">
                <label><i class="fa-solid fa-note-sticky"></i> IT Remarks / Note *</label>
                <textarea id="note" class="swal2-textarea" placeholder="Describe what have you fix or what you did ?">${
                  data.note || ""
                }</textarea>
                  <small style="color: #666; font-size: 0.8rem; margin-top: 5px;">
                <i class="fa-solid fa-info-circle"></i> Wajib diisi jika status diubah ke "Closed"
              </small>
              </div>
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
        <div style="margin-top: 5px; font-size: 0.8rem; color: #666;">
          <i class="fa-solid fa-info-circle"></i> 
          QA akan otomatis di-set ke "Finish" ketika status Closed, "Continue" untuk status lainnya.
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Update Ticket",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        const formData = {
          user_email: document.getElementById("user_email").value,
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

        // ✅ VALIDASI
        try {
          validateTicketBeforeSave(formData);
        } catch (error) {
          Swal.showValidationMessage(error.message);
          return false;
        }

        return formData;
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

    // Validasi ulang sebelum update
    validateTicketBeforeSave(formValues);

    // ✅ Tentukan QA berdasarkan status baru
    const newQA = getAutoQA(formValues.status_ticket);

    // Logic untuk menangani closedAt timestamp
    const updateData = {
      ...formValues,
      qa: newQA, // ✅ SET QA OTOMATIS
      updatedAt: serverTimestamp(),
    };

    // Update code berdasarkan device type yang baru
    if (formValues.device) {
      updateData.code =
        window.CONFIG.DEVICE_TYPE_MAPPING[formValues.device] || "OT";
    }

    console.log("🔍 Edit Debug:", {
      currentStatus: currentStatus,
      newStatus: formValues.status_ticket,
      newQA: newQA,
      hasClosedAt: hasClosedAt,
      device: formValues.device,
      code: updateData.code,
      user_phone: formValues.user_phone,
      user_email: formValues.user_email,
      note: formValues.note,
    });

    // HANYA jika status berubah dari non-Closed ke Closed
    if (formValues.status_ticket === "Closed" && currentStatus !== "Closed") {
      updateData.closedAt = serverTimestamp();
      console.log("🔄 First time closed - setting closedAt timestamp");
    }
    // Jika status berubah dari Closed ke non-Closed, hapus closedAt untuk reset
    else if (
      formValues.status_ticket !== "Closed" &&
      currentStatus === "Closed"
    ) {
      updateData.closedAt = null;
      console.log("🔄 Reopened ticket - clearing closedAt timestamp");
    }
    // Jika sudah closed dan tetap closed, JANGAN ubah closedAt
    else if (
      formValues.status_ticket === "Closed" &&
      currentStatus === "Closed"
    ) {
      console.log("🔒 Ticket tetap closed - closedAt tidak diubah");
    }

    console.log("📤 Update data:", updateData);
    await updateDoc(docRef, updateData);

    Swal.fire("Updated!", "Ticket updated successfully.", "success");

    // Refresh durations setelah perubahan status
    updateDurations();
  } catch (error) {
    console.error("Edit error:", error);
    Swal.fire("Error!", error.message || "Failed to update ticket.", "error");
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
        }>${device}</option>`,
    )
    .join("");
}

function getActionByOptions(selected) {
  return window.CONFIG.IT_STAFF.map(
    (staff) =>
      `<option value="${staff}" ${
        staff === selected ? "selected" : ""
      }>${staff}</option>`,
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
        `<option value="${opt}" ${
          opt === selected ? "selected" : ""
        }>${opt}</option>`,
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
        `<option value="${opt}" ${
          opt === selected ? "selected" : ""
        }>${opt}</option>`,
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
        }>${opt}</option>`,
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
        }>${opt}</option>`,
    )
    .join("");
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

// Helper function untuk format date Excel
function formatDateForExcel(ts) {
  if (!ts) return "-";
  const date = ts.toDate ? ts.toDate() : new Date(ts);

  // Validasi tanggal
  if (isNaN(date.getTime())) {
    return "-";
  }

  return date;
}

// ==================== 🔹 Utility Functions ====================
function addDataLabels() {
  const table = document.getElementById("ticketsTable");
  if (!table) return;

  const headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
    th.innerText.trim(),
  );

  table.querySelectorAll("tbody tr").forEach((row) => {
    row.querySelectorAll("td").forEach((td, i) => {
      if (headers[i]) {
        td.setAttribute("data-label", headers[i]);
      }
    });
  });
}

// Add CSS untuk Duration Badge, QA Badge dan Login Button
const style = document.createElement("style");
style.textContent = `
  
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
    /* ✅ STYLE BARU UNTUK EMAIL CELL */
  .email-cell {
    word-break: break-all;
    max-width: 150px;
    display: inline-block;
    vertical-align: middle;
  }

/* CSS khusus untuk hide kolom DEVICE dengan colgroup */
#ticketsTable th:nth-of-type(4),
#ticketsTable td:nth-of-type(4),
#ticketsTable th:nth-of-type(11),
#ticketsTable td:nth-of-type(11)  {
    display: none !important;
    width: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
    visibility: hidden !important;
}

/* Juga hide col ke-4 di colgroup */
#ticketsTable col:nth-child(4) {
    width: 0 !important;
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
