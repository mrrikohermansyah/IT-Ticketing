// ======================================================
// ?? js/admin.js — Responsive Admin Panel with Ticket Grab System
// ======================================================

// ==================== ?? Firebase Imports ====================
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
  getDocs,
  limit,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// ==================== ?? Firebase Config ====================
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

// ==================== ?? DOM Elements ====================
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
const userTicketBtn = document.getElementById("userTicketBtn");

// ==================== ?? State ====================
let isCardView = false;
let allTickets = [];
let loginInProgress = false;
let ticketsUnsubscribe = null;
let durationIntervalId = null;
let currentQuickFilter = "all";
let resizeTimeout = null;

// ==================== ?? Helper Functions ====================
function getAdminDisplayName(user) {
  if (!user || !user.email) return "IT Support";

  const userEmail = user.email.toLowerCase();

  // Cek mapping dulu
  if (window.CONFIG && window.CONFIG.ADMIN_NAME_MAPPING) {
    const mappedName = window.CONFIG.ADMIN_NAME_MAPPING[userEmail];
    if (mappedName) {
      console.log("? Using mapped name:", mappedName);
      return mappedName;
    }
  }

  // Jika tidak ada mapping, gunakan displayName dari Google
  if (user.displayName) {
    console.log("? Using Google displayName:", user.displayName);
    return user.displayName;
  }

  // Fallback: extract dari email (first part)
  const nameFromEmail = userEmail
    .split("@")[0]
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  console.log("? Using name from email:", nameFromEmail);
  return nameFromEmail;
}

// ? Format Ticket ID untuk display yang readable
function formatTicketId(ticket) {
  // Gunakan ticketId jika sudah ada dan sesuai format
  if (ticket.ticketId && ticket.ticketId.includes("-")) {
    return ticket.ticketId;
  }

  // Extract department code
  const getDeptCode = (dept) => {
    if (!dept) return "IT";
    const deptMap = {
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
      Lainlain: "GEN",
    };
    return deptMap[dept] || dept.substring(0, 3).toUpperCase();
  };

  // Extract location code
  const getLocCode = (location) => {
    if (!location) return "GEN";
    const locMap = {
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
      Lainlain: "GEN",
    };
    return locMap[location] || location.substring(0, 3).toUpperCase();
  };

  // Extract device code
  const getDeviceCode = (device) => {
    if (!device) return "OT";
    const deviceMap = {
      "PC Hardware": "HW",
      "PC Software": "SW",
      Laptop: "LP",
      Printer: "PR",
      Network: "NET",
      Projector: "PJ",
      "Backup Data": "BU",
      Others: "OT",
    };
    return deviceMap[device] || device.substring(0, 2).toUpperCase();
  };

  // Format date (YYMMDD)
  const getDateCode = (timestamp) => {
    if (!timestamp) {
      const now = new Date();
      return now.toISOString().slice(2, 8).replace(/-/g, "");
    }

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toISOString().slice(2, 8).replace(/-/g, "");
    } catch (error) {
      const now = new Date();
      return now.toISOString().slice(2, 8).replace(/-/g, "");
    }
  };

  // Generate random string (3 chars)
  const getRandomCode = (ticketId) => {
    // Use last 3 chars of Firebase ID for consistency
    return ticketId.substring(ticketId.length - 3).toUpperCase();
  };

  // Build the formatted ID: DEPT-LOC-DEVICE-DATE-RANDOM
  const deptCode = getDeptCode(ticket.department);
  const locCode = getLocCode(ticket.location);
  const deviceCode = getDeviceCode(ticket.device);
  const dateCode = getDateCode(ticket.createdAt);
  const randomCode = getRandomCode(ticket.id);

  return `${deptCode}-${locCode}-${deviceCode}-${dateCode}-${randomCode}`;
}

// ? VALIDASI FUNCTION
function validateTicketBeforeSave(ticketData) {
  console.log("?? Validating ticket data:", ticketData);

  if (
    (ticketData.status_ticket === "Closed" ||
      ticketData.status_ticket === "Resolved") &&
    !ticketData.note
  ) {
    throw new Error("?? Harap isi Technician Notes sebelum menutup ticket!");
  }

  return true;
}

// ? FUNCTION UNTUK POPULATE ACTION BY FILTER
function populateActionByFilter() {
  if (!actionByFilter) {
    console.error("? actionByFilter element not found");
    return;
  }

  // ? VALIDATE CONFIG
  if (!window.CONFIG || !Array.isArray(window.CONFIG.IT_STAFF)) {
    console.error("? IT_STAFF config invalid");
    actionByFilter.innerHTML = '<option value="all">No IT Staff</option>';
    return;
  }

  const itStaff = window.CONFIG.IT_STAFF;

  // Clear existing options kecuali "All"
  actionByFilter.innerHTML = '<option value="all">All IT Staff</option>';

  // Tambahkan setiap IT Staff sebagai option
  itStaff.forEach((staff) => {
    if (staff && typeof staff === "string") {
      const option = document.createElement("option");
      option.value = staff;
      option.textContent = staff;
      actionByFilter.appendChild(option);
    }
  });

  console.log("? Action By filter populated with:", itStaff.length, "staff");
}

// ==================== ?? TICKET GRAB SYSTEM ====================

// ? Cek apakah ticket available untuk diambil - FIXED!
function isTicketAvailable(ticket) {
  return (
    (!ticket.action_by || ticket.action_by === "") &&
    ticket.status_ticket === "Open"
  );
}

// ? Cek apakah ticket milik admin yang login
function isMyTicket(ticket) {
  const currentAdmin = getAdminDisplayName(auth.currentUser);
  return ticket.action_by === currentAdmin;
}

// ? Ambil ticket (assign ke admin yang login)
async function grabTicket(ticketId) {
  const currentAdmin = getAdminDisplayName(auth.currentUser);

  try {
    await updateDoc(doc(db, "tickets", ticketId), {
      action_by: currentAdmin,
      status_ticket: "On Progress",
      onProgressAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    Swal.fire({
      title: "Ticket Taken! ??",
      text: `You are now handling this ticket`,
      icon: "success",
      timer: 1500,
    });
  } catch (error) {
    console.error("? Grab ticket error:", error);
    Swal.fire("Error!", "Failed to take ticket", "error");
  }
}

// ? Lepaskan ticket (jadi available lagi)
async function releaseTicket(ticketId) {
  try {
    await updateDoc(doc(db, "tickets", ticketId), {
      action_by: "",
      status_ticket: "Open",
      onProgressAt: null,
      updatedAt: serverTimestamp(),
    });

    Swal.fire("Released!", "Ticket is now available for others", "info");
  } catch (error) {
    console.error("? Release ticket error:", error);
    Swal.fire("Error!", "Failed to release ticket", "error");
  }
}

// ? Inisialisasi Ticket Grab System
function initTicketGrabSystem() {
  console.log("?? Initializing Ticket Grab System...");
  // Set initial filter state
  currentQuickFilter = "all";
  // Tambahkan Quick Filter Buttons
  addQuickFilterButtons();
  setTimeout(() => {
    refreshFilterState();
  }, 100);
}

// ? Tambahkan Quick Filter Buttons
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

  // Sisipkan sebelum table wrapper
  const tableWrapper = document.querySelector(".table-wrapper");
  if (tableWrapper) {
    tableWrapper.parentNode.insertBefore(filterContainer, tableWrapper);
  }

  // Event listeners untuk filter buttons - IMPROVED
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const filter = e.target.dataset.filter;
      console.log("?? Quick filter clicked:", filter);

      // Update active state
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");

      // Apply filter
      applyQuickFilter(filter);
    });
  });
}

// ? Apply Quick Filter - FIXED!
function applyQuickFilter(filterType) {
  currentQuickFilter = filterType;
  let filtered = allTickets;
  const currentAdmin = getAdminDisplayName(auth.currentUser);

  switch (filterType) {
    case "available":
      filtered = filtered.filter((ticket) => isTicketAvailable(ticket));
      console.log(
        "?? Available tickets:",
        filtered.map((t) => ({
          id: t.id,
          status: t.status_ticket,
          action_by: t.action_by,
        })),
      );
      break;

    case "my_tickets":
      filtered = filtered.filter((ticket) => isMyTicket(ticket));
      break;

    case "others":
      filtered = filtered.filter(
        (ticket) => ticket.action_by && ticket.action_by !== currentAdmin,
      );
      break;

    case "all":
    default:
      // No additional filtering
      break;
  }

  console.log(`?? Quick Filter: ${filterType}`, {
    total: allTickets.length,
    filtered: filtered.length,
  });

  renderTickets(filtered);
}

// ? Function untuk refresh filter state
function refreshFilterState() {
  console.log("?? Refreshing filter state:", currentQuickFilter);

  if (currentQuickFilter && currentQuickFilter !== "all") {
    // Re-apply quick filter
    applyQuickFilter(currentQuickFilter);
  } else {
    // Just re-render with current filters
    renderTickets(allTickets);
  }

  // Update button active state
  const activeBtn = document.querySelector(
    `.filter-btn[data-filter="${currentQuickFilter}"]`,
  );
  if (activeBtn) {
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    activeBtn.classList.add("active");
  }
}

// ==================== ?? Session Storage Management ====================
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
        console.log("?? Session expired - cleared storage");
      }
    } else {
      // Set session time jika belum ada
      sessionStorage.setItem("adminSessionTime", Date.now().toString());
    }
  }
}

// ==================== ?? Initialize App ====================
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing app...");
  initAdminApp();
});

function initAdminApp() {
  console.log("?? Initializing admin application...");
  // Debug DOM elements
  console.log("?? DOM Elements Check:", {
    userTicketBtn: !!userTicketBtn,
    loginBtn: !!loginBtn,
    logoutBtn: !!logoutBtn,
    exportBtn: !!exportBtn
  });

  // ? CHECK CONFIG FIRST
  if (!window.CONFIG) {
    console.error("? CONFIG not loaded");
    showErrorState("Configuration not loaded. Please refresh the page.");
    return;
  }

  // ? VALIDATE REQUIRED CONFIG
  if (!window.CONFIG.ADMIN_EMAILS || !window.CONFIG.IT_STAFF) {
    console.error("? Required config missing");
    showErrorState("Required configuration missing. Please check config.js");
    return;
  }

  // Setup session storage management
  setupSessionStorage();

  // Check if DOM elements exist
  if (!ticketTableBody) {
    console.error("? ticketTableBody not found");
  }
  if (!cardContainer) {
    console.error("? cardContainer not found");
  }

  // Add event listeners with null checks
  if (switchViewBtn) {
    switchViewBtn.addEventListener("click", toggleView);
  } else {
    console.warn("?? switchViewBtn not found");
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }
  

  // ==================== ?? Export Handler ====================
  if (exportBtn) {
    exportBtn.addEventListener("click", async () => {
      console.log("?? Export clicked, allTickets:", allTickets?.length);

      // ? FIX: Pastikan allTickets tersedia
      if (!allTickets || allTickets.length === 0) {
        Swal.fire({
          title: "No Data",
          text: "Tidak ada data tiket untuk diekspor. Silakan tunggu hingga data dimuat.",
          icon: "warning",
        });
        return;
      }

      try {
        // ? GUNAKAN FUNGSI EXPORT DARI export.js
        if (typeof window.handleExportToExcel === "function") {
          console.log("? Using export.js handleExportToExcel function");
          await window.handleExportToExcel();
        } else {
          // Fallback jika export.js tidak tersedia
          await handleBuiltInExport();
        }
      } catch (error) {
        console.error("? Export error:", error);
        Swal.fire({
          title: "Export Failed",
          text: "Terjadi kesalahan saat mengekspor. Silakan coba lagi.",
          icon: "error",
        });
      }
    });
  }

  if (filterSelect) {
    filterSelect.addEventListener("change", handleFilterChange);
  }

  // ? TAMBAHKAN EVENT LISTENER UNTUK ACTION BY FILTER
  if (actionByFilter) {
    actionByFilter.addEventListener("change", handleFilterChange);
    // Populate filter options
    populateActionByFilter();
  }

  if (userTicketBtn) {
    userTicketBtn.addEventListener("click", redirectToUserTicket);
    console.log("✅ User ticket button event listener added");
  } else {
    console.error("❌ userTicketBtn element not found");
  }

  // Pisahkan event listener untuk kedua tombol login
  if (loginBtn) {
    loginBtn.addEventListener("click", handleGoogleLogin);
  }

  if (goLoginBtn) {
    goLoginBtn.addEventListener("click", redirectToLoginPage);
  }

  // Initialize auth
  initAuth();

  // Initialize responsive view
  handleResponsiveView();
}

// ==================== ?? Redirect to Login Page ====================
function redirectToLoginPage() {
  console.log("?? Redirecting to login page...");
  window.open("../login/index.html", "_blank", "noopener,noreferrer");
}

// ==================== ?? Check Admin Access ====================
function isAdminUser(user) {
  if (!user || !user.email) return false;

  const userEmail = user.email.toLowerCase();

  // ? VALIDATE CONFIG
  if (!window.CONFIG || !Array.isArray(window.CONFIG.ADMIN_EMAILS)) {
    console.error("? ADMIN_EMAILS config invalid");
    return false;
  }

  const isAdmin = window.CONFIG.ADMIN_EMAILS.some(
    (adminEmail) => adminEmail.toLowerCase() === userEmail,
  );

  console.log("?? Admin Check:", {
    userEmail: userEmail,
    isAdmin: isAdmin,
    adminEmails: window.CONFIG.ADMIN_EMAILS,
  });

  return isAdmin;
}

// ==================== ?? Admin Auth Control ====================
function initAuth() {
  onAuthStateChanged(
    auth,
    (user) => {
      console.log("?? Auth state changed:", user ? "Logged in" : "Logged out");

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

      console.log("?? User email:", user.email);
      console.log("?? User displayName:", user.displayName);

      if (!isAdminUser(user)) {
        console.log("?? Access denied for email:", user.email);
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
      console.log("? Admin access granted for:", user.email);
      showAuthButtons(true, user);
      initTickets();

      // ? INIT TICKET GRAB SYSTEM
      initTicketGrabSystem();

      // ? CHECK: Apakah ini login pertama kali atau page refresh?
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
        console.log("?? First login - welcome message shown");
      } else {
        console.log("?? Page refresh - no welcome message");
      }
    },
    (error) => {
      console.error("? Auth state error:", error);
      sessionStorage.removeItem("adminFirstLogin");
      sessionStorage.removeItem("adminSessionTime");
      cleanup();
      showAuthButtons(false);
      showLoginScreen();
    },
  );
}

function showAuthButtons(isLoggedIn, user = null) {
   if (userTicketBtn) {
    userTicketBtn.style.display = isLoggedIn ? "flex" : "none";
    console.log("?? User ticket button display:", userTicketBtn.style.display);
  }
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

    console.log("?? User display info:", {
      email: user.email,
      googleDisplayName: user.displayName,
      finalDisplayName: displayName,
    });
  }
}

// ==================== ?? Redirect Functions ====================
function redirectToUserTicket() {
  console.log("?? Redirecting to user ticket page...");
  window.open("../index.html", "_blank", "noopener,noreferrer");
}

// ==================== ?? Show Login Screen ====================
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

// ==================== ?? Google Login Handler ====================
async function handleGoogleLogin() {
  if (loginInProgress) {
    console.log("? Login already in progress...");
    return;
  }

  loginInProgress = true;

  try {
    console.log("?? Attempting Google login...");

    if (loginBtn) loginBtn.disabled = true;
    if (goLoginBtn) goLoginBtn.disabled = true;

    const result = await signInWithPopup(auth, provider);
    console.log("? Login successful:", result.user.email);

    // Set session storage untuk menandai first login
    sessionStorage.setItem("adminFirstLogin", "true");
    sessionStorage.setItem("adminSessionTime", Date.now().toString());
  } catch (error) {
    console.error("? Login error details:", error);

    if (error.code === "auth/popup-blocked") {
      await Swal.fire({
        title: "Popup Blocked",
        text: "Popup login blocked by browser. Please allow popups for this site and try again.",
        icon: "warning",
      });
    } else if (error.code === "auth/popup-closed-by-user") {
      console.log("?? User closed the popup");
    } else if (error.code === "auth/cancelled-popup-request") {
      console.log("?? Popup request cancelled");
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

// ==================== ?? Handle Logout dengan Cleanup ====================
async function handleLogout() {
  try {
    console.log("?? Logging out...");

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

    console.log("? Logout successful");
  } catch (error) {
    console.error("? Logout error:", error);

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

// ==================== ?? Cleanup Function ====================
function cleanup() {
  console.log("?? Cleaning up resources...");

  try {
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

    // Clear any pending timeouts
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
      resizeTimeout = null;
    }
  } catch (error) {
    console.error("? Error during cleanup:", error);
  }
}

// ==================== ?? Load Tickets ====================
function initTickets() {
  console.log("?? Initializing tickets...");

  // Clear previous data
  allTickets = [];

  // Check authentication first
  if (!auth.currentUser) {
    console.log("?? User not authenticated, showing login screen");
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
        console.log("?? User logged out during data fetch");
        showLoginScreen();
        return;
      }

      const tickets = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("? Tickets loaded:", tickets.length);
      allTickets = tickets;

      // ? UPDATE GLOBAL VARIABLE UNTUK EXPORT.JS
      if (typeof window.updateAllTickets === "function") {
        window.updateAllTickets(tickets);
      }

      // ? GUNAKAN refreshFilterState DARIPADA renderTickets LANGSUNG
      refreshFilterState();

      // Start auto-updating durations
      startDurationUpdates();

      setTimeout(addDataLabels, 100);
    },
    (error) => {
      console.error("? Error loading tickets:", error);

      // Handle permission errors gracefully
      if (
        error.code === "permission-denied" ||
        error.code === "missing-or-insufficient-permissions"
      ) {
        console.log(
          "?? Permission denied - user might be logged out or not admin",
        );
        showLoginScreen();
      } else {
        showErrorState("Failed to load tickets: " + error.message);
      }
    },
  );
}

// ==================== ?? Duration Calculation ====================
function calculateDuration(ticket) {
  try {
    // ? VALIDASI INPUT
    if (!ticket) {
      console.error("? Ticket is null or undefined");
      return "-";
    }

    // Handle missing fields dengan default values
    const ticketStatus = ticket.status_ticket || "Open";
    const hasClosedAt = !!ticket.closedAt;
    const hasOnProgressAt = !!ticket.onProgressAt;

    // ? Untuk ticket Open, tidak ada duration
    if (ticketStatus === "Open") {
      return "-";
    }

    // ? LOGIC BARU: Handle berbagai skenario
    let startDate;
    let endDate;

    if (ticketStatus === "Closed" && hasClosedAt) {
      // ? SKENARIO 1: Ticket di-close (dengan atau tanpa onProgressAt)
      if (hasOnProgressAt) {
        // Case A: Normal flow - dari On Progress ke Closed
        startDate = ticket.onProgressAt.toDate
          ? ticket.onProgressAt.toDate()
          : new Date(ticket.onProgressAt);
      } else {
        // Case B: Langsung di-close tanpa On Progress - gunakan createdAt
        startDate = ticket.createdAt.toDate
          ? ticket.createdAt.toDate()
          : new Date(ticket.createdAt);
      }
      endDate = ticket.closedAt.toDate
        ? ticket.closedAt.toDate()
        : new Date(ticket.closedAt);
    } else if (ticketStatus === "On Progress" && hasOnProgressAt) {
      // ? SKENARIO 2: Masih On Progress (real-time)
      startDate = ticket.onProgressAt.toDate
        ? ticket.onProgressAt.toDate()
        : new Date(ticket.onProgressAt);
      endDate = new Date(); // Waktu sekarang untuk real-time duration
    } else {
      // ? Kondisi tidak memenuhi syarat
      return "-";
    }

    const duration = formatDuration(startDate, endDate);
    return duration;
  } catch (error) {
    console.error("? Error in calculateDuration:", error);
    return "-";
  }
}

// ? ADD MISSING FUNCTION: formatDuration
function formatDuration(startDate, endDate) {
  try {
    const diffMs = endDate - startDate;
    const diffMinutes = Math.floor(diffMs / (1000 * 60)); // Konversi langsung ke menit

    if (diffMinutes > 0) {
      return `${diffMinutes} Minute${diffMinutes > 1 ? "s" : ""}`;
    } else {
      return "Less than 1 Minute";
    }
  } catch (error) {
    console.error("? Error in formatDuration:", error);
    return "-";
  }
}

// Helper function untuk duration badge color
function getDurationClass(ticket) {
  try {
    if (!ticket.onProgressAt && !ticket.closedAt) return "duration-neutral";

    const ticketStatus = ticket.status_ticket || "Open";

    // Untuk ticket yang belum On Progress atau Closed, gunakan class neutral
    if (ticketStatus !== "On Progress" && ticketStatus !== "Closed") {
      return "duration-neutral";
    }

    let startDate;
    let endDate;

    if (ticketStatus === "Closed" && ticket.closedAt) {
      if (ticket.onProgressAt) {
        // Normal flow: dari On Progress ke Closed
        startDate = ticket.onProgressAt.toDate
          ? ticket.onProgressAt.toDate()
          : new Date(ticket.onProgressAt);
        endDate = ticket.closedAt.toDate
          ? ticket.closedAt.toDate()
          : new Date(ticket.closedAt);
      } else {
        // Direct close: dari Created ke Closed
        startDate = ticket.createdAt.toDate
          ? ticket.createdAt.toDate()
          : new Date(ticket.createdAt);
        endDate = ticket.closedAt.toDate
          ? ticket.closedAt.toDate()
          : new Date(ticket.closedAt);
      }
    } else if (ticketStatus === "On Progress" && ticket.onProgressAt) {
      startDate = ticket.onProgressAt.toDate
        ? ticket.onProgressAt.toDate()
        : new Date(ticket.onProgressAt);
      endDate = new Date(); // Real-time untuk On Progress
    } else {
      return "duration-neutral";
    }

    const diffHours = (endDate - startDate) / (1000 * 60 * 60);

    if (diffHours > 24) return "duration-long";
    if (diffHours > 4) return "duration-medium";
    return "duration-short";
  } catch (error) {
    console.error("? Error in getDurationClass:", error);
    return "duration-neutral";
  }
}

// Helper function untuk duration tooltip
function getDurationTooltip(ticket) {
  const status = ticket.status_ticket || "Open";
  const hasOnProgressAt = !!ticket.onProgressAt;

  if (status === "On Progress") {
    return "Duration real-time sejak tiket di-take sampai sekarang";
  } else if (status === "Closed") {
    if (hasOnProgressAt) {
      return "Duration sejak tiket di-take sampai ditutup";
    } else {
      return "Duration sejak tiket dibuat sampai ditutup (langsung di-close tanpa di-take)";
    }
  } else {
    return "Duration akan muncul ketika status On Progress atau Closed";
  }
}

// ==================== ?? Start Duration Updates ====================
function startDurationUpdates() {
  // Clear existing interval
  if (durationIntervalId) {
    clearInterval(durationIntervalId);
  }

  // ? INTERVAL untuk update real-time On Progress tickets
  durationIntervalId = setInterval(() => {
    const hasOnProgressTickets = allTickets.some(
      (ticket) => ticket.status_ticket === "On Progress" && ticket.onProgressAt,
    );

    if (hasOnProgressTickets) {
      updateDurations();
    }
  }, 60000); // Update setiap 1 menit
}

function updateDurations() {
  try {
    // Update table view - hanya untuk ticket yang On Progress atau Closed
    document.querySelectorAll("#ticketTableBody tr").forEach((row, index) => {
      const ticket = allTickets[index];
      if (
        ticket &&
        (ticket.status_ticket === "On Progress" ||
          ticket.status_ticket === "Closed")
      ) {
        const durationCell = row.cells[1]; // Kolom ke-2 (Duration)
        if (durationCell) {
          durationCell.innerHTML = `<span class="duration-badge ${getDurationClass(
            ticket,
          )}" title="${getDurationTooltip(ticket)}">
            ${calculateDuration(ticket)}
          </span>`;
        }
      }
    });

    // Update card view - hanya untuk ticket yang On Progress atau Closed
    document.querySelectorAll(".ticket-card").forEach((card, index) => {
      const ticket = allTickets[index];
      if (
        ticket &&
        (ticket.status_ticket === "On Progress" ||
          ticket.status_ticket === "Closed")
      ) {
        const durationField = card.querySelector(".card-field:nth-child(2)"); // Field duration ke-2
        if (durationField) {
          durationField.querySelector("span").innerHTML =
            `<span class="duration-badge ${getDurationClass(
              ticket,
            )}" title="${getDurationTooltip(ticket)}">
            ${calculateDuration(ticket)}
          </span>`;
        }
      }
    });
  } catch (error) {
    console.error("? Error in updateDurations:", error);
  }
}

// ==================== ?? Render Functions ====================
function renderTickets(tickets) {
  if (!tickets || tickets.length === 0) {
    showEmptyState();
    return;
  }

  // ? APPLY MULTIPLE FILTERS + QUICK FILTER
  let filtered = tickets;

  // ? TERAPKAN QUICK FILTER JIKA ADA
  if (currentQuickFilter && currentQuickFilter !== "all") {
    const currentAdmin = getAdminDisplayName(auth.currentUser);

    switch (currentQuickFilter) {
      case "available":
        filtered = filtered.filter((ticket) => isTicketAvailable(ticket));
        break;
      case "my_tickets":
        filtered = filtered.filter((ticket) => isMyTicket(ticket));
        break;
      case "others":
        filtered = filtered.filter(
          (ticket) => ticket.action_by && ticket.action_by !== currentAdmin,
        );
        break;
    }
  }

  // Filter by status (dropdown)
  if (filterSelect && filterSelect.value !== "all") {
    filtered = filtered.filter((t) => t.status_ticket === filterSelect.value);
  }

  // Filter by Action By (dropdown)
  if (actionByFilter && actionByFilter.value !== "all") {
    filtered = filtered.filter((t) => t.action_by === actionByFilter.value);
  }

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
    // ? AUTO QA: Tentukan nilai QA untuk display
    const displayQA = ticket.status_ticket === "Closed" ? "Finish" : "Continue";

    // ? TICKET GRAB SYSTEM: Tentukan status ticket
    const isAvailable = isTicketAvailable(ticket);
    const isMine = isMyTicket(ticket);

    // Tentukan class untuk row styling
    const rowClass = isAvailable
      ? "ticket-available"
      : isMine
        ? "ticket-mine"
        : "ticket-others";

    const tr = document.createElement("tr");
    tr.className = rowClass;

    tr.innerHTML = `
      <!-- ? Date -->
      <td>${formatDate(ticket.createdAt)}</td>
      
      
      <!-- ? Inventory -->
      <td>${ticket.inventory || "-"}</td>
      
      <!-- ? Device -->
      <td>${ticket.device || "-"}</td>
      
      <!-- ? Name -->
      <td>${ticket.name || "-"}</td>
      
      <!-- ? Email -->
      <td>
      <span class="email-cell" title="${ticket.user_email || "-"}">
      ${ticket.user_email || "-"}
      </span>
      </td>
      
      <!-- ? Phone -->
      <td>${ticket.user_phone || "-"}</td>
      
      <!-- ? Department -->
      <td>${ticket.department || "-"}</td>
      
      <!-- ? Location -->
      <td>${ticket.location || "-"}</td>
      
      <!-- ? Priority -->
      <td>
      <span class="priority-badge priority-${
        ticket.priority?.toLowerCase() || "medium"
      }">
          ${ticket.priority || "Medium"}
        </span>
        </td>
        
        <!-- ? Subject -->
        <td>${ticket.subject || "-"}</td>
        
        <!-- ? Message -->
        <td class="note-cell">${ticket.message || "-"}</td>
        
        <!-- ? Note -->
        <td class="note-cell">${ticket.note || "-"}</td>
        
        <!-- ? Code -->
        <td>${ticket.code || "-"}</td>
        
        <!-- ? Action By -->
        <td>
        ${
          ticket.action_by
            ? `<span class="assignee ${isMine ? "assignee-me" : ""}">${ticket.action_by}</span>`
            : '<span class="assignee available">Available</span>'
        }
        </td>
        
        <!-- ? QA (Auto) -->
        <td>
        <span class="qa-badge qa-${displayQA.toLowerCase()}">
        ${displayQA}
        </span>
        </td>
        
        <!-- ? Status -->
        <td>
        <span class="status-badge status-${
          ticket.status_ticket?.replace(" ", "").toLowerCase() || "open"
        }">
        ${ticket.status_ticket || "Open"}
        </span>
        </td>
        
        <!-- ? Duration -->
        <td>
          <span class="duration-badge ${getDurationClass(ticket)}" title="${getDurationTooltip(ticket)}">
            ${calculateDuration(ticket)}
          </span>
        </td>
      <!-- ? ACTIONS -->
      <td>
        <div class="action-buttons">
          ${
            isAvailable
              ? `
            <!-- ? TICKET AVAILABLE: Tombol GRAB & DELETE -->
            <button class="grab-btn" data-id="${ticket.id}" title="Take this ticket">
              <i class="fa-solid fa-hand"></i> Take
            </button>
            <button class="delete-btn" data-id="${ticket.id}" title="Delete ticket">
              <i class="fa-solid fa-trash"></i>
            </button>
          `
              : isMine
                ? `
            <!-- ? MY TICKET: Bisa Edit, Release & Delete -->
            <button class="edit-btn" data-id="${ticket.id}" title="Edit ticket">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="release-btn" data-id="${ticket.id}" title="Release ticket">
              <i class="fa-solid fa-rotate-left"></i>
            </button>
            <button class="delete-btn" data-id="${ticket.id}" title="Delete ticket">
              <i class="fa-solid fa-trash"></i>
            </button>
          `
                : `
            <!-- ? TICKET ORANG: Hanya View, TIDAK BISA DELETE -->
            <button class="view-btn" data-id="${ticket.id}" title="View only (handled by ${ticket.action_by})">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="delete-btn disabled-delete-btn" data-id="${ticket.id}" title="Cannot delete - handled by ${ticket.action_by}" disabled>
              <i class="fa-solid fa-trash"></i>
            </button>
          `
          }
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
    // ? AUTO QA: Tentukan nilai QA untuk display
    const displayQA = ticket.status_ticket === "Closed" ? "Finish" : "Continue";

    // ? TICKET GRAB SYSTEM: Tentukan status ticket
    const isAvailable = isTicketAvailable(ticket);
    const isMine = isMyTicket(ticket);

    // Tentukan class untuk card styling
    const cardClass = isAvailable
      ? "ticket-card ticket-available"
      : isMine
        ? "ticket-card ticket-mine"
        : "ticket-card ticket-others";

    const card = document.createElement("div");
    card.className = cardClass;
    card.innerHTML = `
      <div class="card-header">
        <h3 title="Original ID: ${ticket.id}">${formatTicketId(ticket)}</h3>
        <span class="status-badge status-${
          ticket.status_ticket?.replace(" ", "").toLowerCase() || "open"
        }">
          ${ticket.status_ticket || "Open"}
        </span>
      </div>
      
      <div class="card-content">
        <!-- ? Date -->
        <div class="card-field">
          <strong><i class="fa-solid fa-calendar"></i> Date</strong>
          <span>${formatDate(ticket.createdAt)}</span>
        </div>
        
        
        <!-- ? Inventory -->
        <div class="card-field">
        <strong><i class="fa-solid fa-barcode"></i> Inventory</strong>
        <span>${ticket.inventory || "-"}</span>
        </div>
        
        <!-- ? Device -->
        <div class="card-field">
        <strong><i class="fa-solid fa-computer"></i> Device</strong>
        <span>${ticket.device || "-"}</span>
        </div>
        
        <!-- ? Name -->
        <div class="card-field">
        <strong><i class="fa-solid fa-user"></i> Name</strong>
        <span>${ticket.name || "-"}</span>
        </div>
        
        <!-- ? Email -->
        <div class="card-field">
        <strong><i class="fa-solid fa-envelope"></i> Email</strong>
        <span class="email-cell" title="${ticket.user_email || "-"}">
        ${ticket.user_email || "-"}
        </span>
        </div>
        
        <!-- ? Phone -->
        <div class="card-field">
        <strong><i class="fa-solid fa-phone"></i> Phone</strong>
        <span>${ticket.user_phone || "-"}</span>
        </div>
        
        <!-- ? Department -->
        <div class="card-field">
        <strong><i class="fa-solid fa-building"></i> Department</strong>
        <span>${ticket.department || "-"}</span>
        </div>
        
        <!-- ? Location -->
        <div class="card-field">
        <strong><i class="fa-solid fa-location-dot"></i> Location</strong>
        <span>${ticket.location || "-"}</span>
        </div>
        
        <!-- ? Priority -->
        <div class="card-field">
        <strong><i class="fa-solid fa-flag"></i> Priority</strong>
        <span class="priority-badge priority-${
          ticket.priority?.toLowerCase() || "medium"
        }">
          ${ticket.priority || "Medium"}
          </span>
          </div>
          
          <!-- ? Subject -->
          <div class="card-field">
          <strong><i class="fa-solid fa-tag"></i> Subject</strong>
          <span>${ticket.subject || "-"}</span>
          </div>
          
          <!-- ? Message -->
          <div class="card-field">
          <strong><i class="fa-solid fa-message"></i> Message</strong>
          <span>${ticket.message || "-"}</span>
          </div>
          
          <!-- ? Note -->
          <div class="card-field">
          <strong><i class="fa-solid fa-note-sticky"></i> Note</strong>
          <span>${ticket.note || "-"}</span>
          </div>
          
          <!-- ? Code -->
          <div class="card-field">
          <strong><i class="fa-solid fa-code"></i> Code</strong>
          <span>${ticket.code || "-"}</span>
          </div>
          
          <!-- ? Action By -->
          <div class="card-field">
          <strong><i class="fa-solid fa-user-gear"></i> Action By</strong>
          <span>
          ${
            ticket.action_by
              ? `<span class="assignee ${isMine ? "assignee-me" : ""}">${ticket.action_by}</span>`
              : '<span class="assignee available">Available</span>'
          }
            </span>
            </div>
            <!-- ? Duration -->
            <div class="card-field">
              <strong><i class="fa-solid fa-clock"></i> Duration</strong>
              <span class="duration-badge ${getDurationClass(ticket)}" 
                    title="${getDurationTooltip(ticket)}">
                ${calculateDuration(ticket)}
              </span>
            </div>
            
            <!-- ? QA (Auto) -->
            <div class="card-field">
            <strong><i class="fa-solid fa-check-double"></i> QA</strong>
            <span class="qa-badge qa-${displayQA.toLowerCase()}">
            ${displayQA}
            </span>
            </div>
            </div>
            
            <!-- ? CARD ACTIONS -->
            <div class="card-actions">
            ${
              isAvailable
                ? `
            <!-- ? TICKET AVAILABLE: Tombol GRAB & DELETE -->
            <button class="grab-btn" data-id="${ticket.id}">
            <i class="fa-solid fa-hand"></i> Take
          </button>
          <button class="delete-btn" data-id="${ticket.id}">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        `
                : isMine
                  ? `
          <!-- ? MY TICKET: Bisa Edit, Release & Delete -->
          <button class="edit-btn" data-id="${ticket.id}">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
          <button class="release-btn" data-id="${ticket.id}">
            <i class="fa-solid fa-rotate-left"></i> Release
          </button>
          <button class="delete-btn" data-id="${ticket.id}">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        `
                  : `
          <!-- ? TICKET ORANG: Hanya View, TIDAK BISA DELETE -->
          <button class="view-btn" data-id="${ticket.id}">
            <i class="fa-solid fa-eye"></i> View Only
          </button>
          <button class="delete-btn disabled-delete-btn" data-id="${ticket.id}" disabled>
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        `
            }
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

// ==================== ?? View Controls ====================
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

// ==================== ?? Responsive Auto Mode ====================
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

// ? GANTI event listener dengan debounce untuk hindari re-render berlebihan
window.addEventListener("resize", function () {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    console.log("?? Responsive view adjusted");
    handleResponsiveView();
  }, 250); // Debounce 250ms
});

// ==================== ?? Format Date ====================
function formatDate(ts) {
  if (!ts) return "-";
  try {
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (error) {
    console.error("? Error formatting date:", error);
    return "-";
  }
}

// ==================== ?? Attach Edit/Delete Events ====================
function attachRowEvents() {
  // Existing events
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", handleEdit);
  });
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", handleDelete);
  });

  // ? NEW: Grab ticket events
  document.querySelectorAll(".grab-btn").forEach((btn) => {
    btn.addEventListener("click", handleGrabTicket);
  });

  // ? NEW: Release ticket events
  document.querySelectorAll(".release-btn").forEach((btn) => {
    btn.addEventListener("click", handleReleaseTicket);
  });

  // ? NEW: View only events
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", handleViewTicket);
  });
}

// ? Handle Grab Ticket
async function handleGrabTicket(e) {
  const ticketId = e.currentTarget.dataset.id;
  await grabTicket(ticketId);
}

// ? Handle Release Ticket
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

// ? Handle View Ticket (Read Only)
async function handleViewTicket(e) {
  const ticketId = e.currentTarget.dataset.id;
  const ticket = allTickets.find((t) => t.id === ticketId);

  if (ticket) {
    Swal.fire({
      title: "View Only ??",
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

// ? CHECK DELETE PERMISSION
function canDeleteTicket(ticket) {
  if (!ticket) return false;

  const currentAdmin = getAdminDisplayName(auth.currentUser);
  const isMyTicket = ticket.action_by === currentAdmin;
  const isAvailable = isTicketAvailable(ticket);

  return isAvailable || isMyTicket;
}

// ==================== ?? Handle Delete dengan Permission Check ====================
async function handleDelete(e) {
  const id = e.currentTarget.dataset.id;

  // Cari ticket yang akan dihapus
  const ticket = allTickets.find((t) => t.id === id);
  if (!ticket) {
    Swal.fire("Error!", "Ticket not found.", "error");
    return;
  }

  const currentAdmin = getAdminDisplayName(auth.currentUser);
  const isMyTicket = ticket.action_by === currentAdmin;
  const isAvailable = isTicketAvailable(ticket);

  // ? CHECK PERMISSION: Hanya boleh hapus jika:
  // 1. Ticket available (belum diambil siapa pun), ATAU
  // 2. Ticket milik sendiri (yang login)
  if (!isAvailable && !isMyTicket) {
    Swal.fire({
      title: "Permission Denied! ??",
      html: `
        <div style="text-align: center;">
          <i class="fa-solid fa-ban" style="font-size: 3rem; color: #e74c3c; margin-bottom: 1rem;"></i>
          <h3>Cannot Delete Ticket</h3>
          <p>This ticket is currently being handled by <strong>${ticket.action_by}</strong></p>
          <p style="font-size: 0.9rem; color: #666;">
            You can only delete tickets that are available or assigned to you.
          </p>
        </div>
      `,
      icon: "error",
      confirmButtonText: "Understand",
    });
    return;
  }

  // Tampilkan konfirmasi delete dengan info tambahan
  let confirmationMessage = `Are you sure you want to delete this ticket?`;
  let confirmationTitle = "Delete this ticket?";

  if (isMyTicket) {
    confirmationMessage = `You are about to delete a ticket that you're currently handling. This action cannot be undone.`;
    confirmationTitle = "Delete Your Ticket?";
  }

  const confirmed = await Swal.fire({
    title: confirmationTitle,
    html: `
      <div style="text-align: left;">
        <p>${confirmationMessage}</p>
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
    await deleteDoc(doc(db, "tickets", id));

    Swal.fire({
      title: "Deleted!",
      text: "Ticket has been permanently removed.",
      icon: "success",
      timer: 2000,
    });
  } catch (error) {
    console.error("Delete error:", error);
    Swal.fire("Error!", "Failed to delete ticket.", "error");
  }
}

// ==================== ?? Handle Edit ====================
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
    const hasOnProgressAt = !!data.onProgressAt;

    // ? AUTO QA: Tentukan nilai QA berdasarkan status
    const getAutoQA = (status) => {
      return status === "Closed" ? "Finish" : "Continue";
    };

    const currentQA = getAutoQA(currentStatus);

    const { value: formValues } = await Swal.fire({
      title: "Edit Ticket",
      html: `
        <div class="form-grid">
          <!-- ? TICKET ID (Readonly) -->
          <div class="form-group" style="grid-column: 1 / -1;">
            <label><i class="fa-solid fa-ticket"></i> Ticket ID</label>
            <input type="text" id="ticketId" class="swal2-input" value="${data.ticketId || id}" readonly style="background: #f3f4f6; font-family: monospace; font-weight: bold;">
            <small style="color: #666; font-size: 0.8rem;">
              <i class="fa-solid fa-info-circle"></i> Format: DEPT-LOC-DEVICE-DATE-RANDOM
            </small>
          </div>
          
          <!-- ? FIELD INVENTORY -->
          <div class="form-group">
            <label><i class="fa-solid fa-barcode"></i> Inventory Number</label>
            <input type="text" id="inventory" class="swal2-input" value="${
              data.inventory || ""
            }" placeholder="Inventory Number">
          </div>
          
          <!-- ? FIELD NAME -->
          <div class="form-group">
            <label><i class="fa-solid fa-user"></i> Name</label>
            <input type="text" id="name" class="swal2-input" value="${
              data.name || ""
            }" placeholder="User Name">
          </div>

          <!-- ? FIELD EMAIL -->
          <div class="form-group">
            <label><i class="fa-solid fa-envelope"></i> User Email</label>
            <input type="email" id="user_email" class="swal2-input" value="${
              data.user_email || ""
            }" placeholder="user@company.com">
          </div>
          
          <!-- ? FIELD ACTION By -->
          <div class="form-group">
            <label><i class="fa-solid fa-user-gear"></i> Action By</label>
            <select id="action_by" class="swal2-select">
              <option value="">-- Select IT Staff --</option>
              ${getActionByOptions(data.action_by || currentAdminName)}
            </select>
          </div>
          
          <!-- ? FIELD PHONE -->
          <div class="form-group">
            <label><i class="fa-solid fa-phone"></i> Phone Number</label>
            <input type="tel" id="user_phone" class="swal2-input" value="${
              data.user_phone || ""
            }" placeholder="+62 XXX-XXXX-XXXX">
          </div>
            
          <!-- ? FIELD DEVICE TYPE -->
          <div class="form-group">
            <label><i class="fa-solid fa-computer"></i> Device Type</label>
            <select id="device" class="swal2-select" required>
              <option value="" disabled>Select Device Type</option>
              <option value="PC Hardware" ${
                data.device === "PC Hardware" ? "selected" : ""
              }>PC Hardware</option>
              <option value="PC Software" ${
                data.device === "PC Software" ? "selected" : ""
              }>PC Software</option>
              <option value="Laptop" ${
                data.device === "Laptop" ? "selected" : ""
              }>Laptop</option>
              <option value="Printer" ${
                data.device === "Printer" ? "selected" : ""
              }>Printer</option>
              <option value="Network" ${
                data.device === "Network" ? "selected" : ""
              }>Network</option>
              <option value="Projector" ${
                data.device === "Projector" ? "selected" : ""
              }>Projector</option>
              <option value="Backup Data" ${
                data.device === "Backup Data" ? "selected" : ""
              }>Backup Data</option>
              <option value="Others" ${
                data.device === "Others" ? "selected" : ""
              }>Others</option>
            </select>
          </div>
          
          <!-- ? FIELD LOCATION -->
          <div class="form-group">
            <label><i class="fa-solid fa-location-dot"></i> Location</label>
            <select id="location" class="swal2-select">
              ${getLocationOptions(data.location)}
            </select>
          </div>
          
          <!-- ? FIELD DEPARTMENT -->
          <div class="form-group">
            <label><i class="fa-solid fa-building"></i> Department</label>
            <select id="department" class="swal2-select">
              ${getDepartmentOptions(data.department)}
            </select>
          </div>
          
          <!-- ? FIELD PRIORITY -->
          <div class="form-group">
            <label><i class="fa-solid fa-flag"></i> Priority</label>
            <select id="priority" class="swal2-select">
              ${getPriorityOptions(data.priority)}
            </select>
          </div>
          
          <!-- ? FIELD STATUS -->
          <div class="form-group">
            <label><i class="fa-solid fa-circle-check"></i> Status</label>
            <select id="status_ticket" class="swal2-select">
              ${getStatusOptions(currentStatus)}
            </select>
          </div>
          
          <!-- ? FIELD NOTE -->
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
        
        <div style="margin-top: 10px; font-size: 0.8rem; color: #666;">
          <i class="fa-solid fa-info-circle"></i> 
          ${
            currentStatus === "Closed" || currentStatus === "On Progress"
              ? `Duration ${currentStatus === "Closed" ? "sudah terkalkulasi" : "sedang berjalan real-time"}. Ubah status ke "Open" untuk reset duration.`
              : 'Duration akan terkalkulasi ketika status diubah ke "On Progress" atau "Closed"'
          }
        </div>
        <div style="margin-top: 5px; font-size: 0.8rem; color: #666;">
          <i class="fa-solid fa-info-circle"></i> 
          QA akan otomatis di-set ke "Finish" ketika status Closed, "Continue" untuk status lainnya.
        </div>
        
        <!-- ? HIDDEN FIELD UNTUK AUTO CODE -->
        <input type="hidden" id="code" value="${data.code || ""}">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Update Ticket",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        const formData = {
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

        // ? VALIDASI
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

    // ? Tentukan QA berdasarkan status baru
    const newQA = getAutoQA(formValues.status_ticket);

    // ? Dapatkan code yang sudah di-update
    const codeField = document.getElementById("code");
    const updatedCode = codeField
      ? codeField.value
      : window.CONFIG.DEVICE_TYPE_MAPPING[formValues.device] || "OT";

    // Logic untuk menangani timestamp
    const updateData = {
      ...formValues,
      code: updatedCode,
      qa: newQA,
      updatedAt: serverTimestamp(),
    };

    // ? LOGIC BARU: Handle timestamp berdasarkan status perubahan
    if (
      formValues.status_ticket === "On Progress" &&
      currentStatus !== "On Progress"
    ) {
      // Status berubah ke On Progress untuk pertama kali
      updateData.onProgressAt = serverTimestamp();
    } else if (
      formValues.status_ticket === "Closed" &&
      currentStatus !== "Closed"
    ) {
      // Status berubah ke Closed untuk pertama kali
      updateData.closedAt = serverTimestamp();

      // Jika sebelumnya On Progress, pertahankan onProgressAt untuk history
      if (currentStatus === "On Progress" && data.onProgressAt) {
        updateData.onProgressAt = data.onProgressAt;
      }
    } else if (formValues.status_ticket === "Open") {
      // Status kembali ke Open - reset semua timestamp
      updateData.onProgressAt = null;
      updateData.closedAt = null;
    }

    await updateDoc(docRef, updateData);

    Swal.fire("Updated!", "Ticket updated successfully.", "success");

    // Refresh durations setelah perubahan status
    updateDurations();
  } catch (error) {
    console.error("Edit error:", error);
    Swal.fire("Error!", error.message || "Failed to update ticket.", "error");
  }
}

// ==================== ?? Dropdown Option Generators ====================
function getActionByOptions(selected) {
  if (!window.CONFIG || !window.CONFIG.IT_STAFF) {
    console.error("? IT_STAFF config not found");
    return '<option value="">No IT Staff</option>';
  }

  const options = window.CONFIG.IT_STAFF.map(
    (staff) =>
      `<option value="${staff}" ${staff === selected ? "selected" : ""}>${staff}</option>`,
  );

  return options.join("");
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

// ==================== ?? BUILT-IN EXPORT FUNCTION (Fallback) ====================
async function handleBuiltInExport() {
  // Apply current filters sama seperti di renderTickets
  let filteredTickets = allTickets;

  // Filter by status
  if (filterSelect && filterSelect.value !== "all") {
    filteredTickets = filteredTickets.filter(
      (t) => t.status_ticket === filterSelect.value,
    );
  }

  // Filter by Action By
  if (actionByFilter && actionByFilter.value !== "all") {
    filteredTickets = filteredTickets.filter(
      (t) => t.action_by === actionByFilter.value,
    );
  }

  const filterInfo = getCurrentFilterInfo();

  console.log("?? Built-in export:", {
    tickets: filteredTickets.length,
    filter: filterInfo,
  });

  // Tampilkan konfirmasi dengan info filter
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

  // Lanjutkan dengan exportToExcel
  await exportToExcel(filteredTickets, filterInfo);
}

// ? ADD MISSING FUNCTION: exportToExcel (Fallback)
async function exportToExcel(tickets, filterInfo) {
  try {
    // Simple fallback export
    const csvContent = convertToCSV(tickets);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `tickets_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire(
      "Exported!",
      `${tickets.length} tickets exported successfully.`,
      "success",
    );
  } catch (error) {
    console.error("Export error:", error);
    Swal.fire("Export Failed", "Failed to export tickets.", "error");
  }
}

// ? ADD MISSING FUNCTION: convertToCSV
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
        .join(","),
    )
    .join("\n");
}

// ==================== ?? Export Helper Functions ====================
function getDisplayedTickets() {
  try {
    // ? APPLY SAME FILTERS SEPERTI DI renderTickets()
    let filteredTickets = allTickets;

    // Filter by status
    if (filterSelect && filterSelect.value !== "all") {
      filteredTickets = filteredTickets.filter(
        (t) => t.status_ticket === filterSelect.value,
      );
    }

    // Filter by Action By
    if (actionByFilter && actionByFilter.value !== "all") {
      filteredTickets = filteredTickets.filter(
        (t) => t.action_by === actionByFilter.value,
      );
    }

    return filteredTickets;
  } catch (error) {
    console.error("? Error getting displayed tickets:", error);
    return allTickets; // Fallback ke semua tickets
  }
}

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
    console.error("? Error getting filter info:", error);
    return "All Tickets";
  }
}

// ==================== ?? Utility Functions ====================
function addDataLabels() {
  const table = document.getElementById("ticketsTable");
  if (!table) return;

  try {
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
  } catch (error) {
    console.error("? Error in addDataLabels:", error);
  }
}

// Add CSS untuk Ticket Grab System
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

  .email-cell {
    word-break: break-all;
    max-width: 150px;
    display: inline-block;
    vertical-align: middle;
  }

  /* ? TICKET GRAB SYSTEM STYLES */
  .quick-filter-container {
    margin-bottom: 20px;
    padding: 15px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .quick-filters {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .filter-btn {
    padding: 8px 16px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-btn:hover {
    background: #f3f4f6;
  }

  .filter-btn.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  /* Ticket Status Colors */
  .ticket-available {
    background: #f0fdf4 !important;
    border-left: 4px solid #22c55e !important;
  }

  .ticket-mine {
    background: #f0f9ff !important;
    border-left: 4px solid #3b82f6 !important;
  }

  .ticket-others {
    background: #f8fafc !important;
    opacity: 0.8;
  }

  /* Assignee Badges */
  .assignee.available {
    color: #16a34a;
    font-weight: bold;
  }

  .assignee.assignee-me {
    color: #3b82f6;
    font-weight: bold;
  }

  /* Action Buttons */
  .grab-btn {
    background: #22c55e;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 5px;
  }

  .grab-btn:hover {
    background: #16a34a;
  }

  .release-btn {
    background: #f59e0b;
    color: white;
    border: none;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 5px;
  }

  .release-btn:hover {
    background: #d97706;
  }

  .view-btn {
    background: #6b7280;
    color: white;
    border: none;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: not-allowed;
    opacity: 0.6;
    margin-right: 5px;
  }

  /* Card specific styles */
  .ticket-card.ticket-available {
    border-left: 4px solid #22c55e !important;
    background: #f0fdf4 !important;
  }

  .ticket-card.ticket-mine {
    border-left: 4px solid #3b82f6 !important;
    background: #f0f9ff !important;
  }

  .ticket-card.ticket-others {
    border-left: 4px solid #6b7280 !important;
    background: #f8fafc !important;
    opacity: 0.8;
  }
`;
document.head.appendChild(style);

// Export functions for global access
window.handleResponsiveView = handleResponsiveView;
window.addDataLabels = addDataLabels;
window.redirectToUserTicket = redirectToUserTicket;
window.redirectToLoginPage = redirectToLoginPage;
window.initTickets = initTickets;
window.getDisplayedTickets = getDisplayedTickets;
window.getCurrentFilterInfo = getCurrentFilterInfo;

// Cleanup on page unload
window.addEventListener("beforeunload", cleanup);

console.log("? Admin JS with Ticket Grab System loaded successfully");
