// ======================================================
// 🔹 js/admin.js — Clean & Organized Version
// ======================================================

// ==================== 🔹 Firebase Imports ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
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

// ==================== 🔹 Initialize Firebase ====================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ==================== 🔹 DOM Elements ====================
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const ticketsBody = document.getElementById("ticketsBody");
const filterSelect = document.getElementById("filterActionBy");
const goLoginBtn = document.getElementById("goLoginBtn");
const userInfo = document.getElementById("userInfo");

// ==================== 🔹 Constants ====================
const IT_NAMES = ["Riko Hermansyah", "Abdurahman Hakim", "Moch Wahyu Nugroho", "Ade Reinalwi"];
let allTickets = [];
let isLoggingOut = false;

// ======================================================
// 🔹 LOGIN / LOGOUT HANDLING
// ======================================================

// Redirect ke login page manual
if (goLoginBtn) {
  goLoginBtn.addEventListener("click", () => {
    window.location.href = "../login/index.html";
  });
}

// Login with Google
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, provider);
      Swal.fire({
        icon: "success",
        title: "Login Success",
        text: "Welcome Back!",
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: err.message,
      });
    }
  });
}

// Logout user
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      isLoggingOut = true;
      await signOut(auth);

      Swal.fire({
        icon: "info",
        title: "Logout Success",
        text: "You're Logged Out",
        confirmButtonText: "OK",
      }).then(() => {
        window.location.replace("../login/index.html");
      });
    } catch (err) {
      isLoggingOut = false;
      Swal.fire({
        icon: "error",
        title: "Logout Failed",
        text: err.message,
      });
    }
  });
}

// ======================================================
// 🔹 HELPER FUNCTIONS
// ======================================================

function formatTimestamp(ts) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
}

function hitungDurasi(createdAt, updatedAt) {
  if (!createdAt || !updatedAt) return "-";
  const start = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  const end = updatedAt.toDate ? updatedAt.toDate() : new Date(updatedAt);
  const menit = Math.floor((end - start) / 60000);
  return isNaN(menit) ? "-" : `${menit} Menit`;
}

function mapDeviceToCode(device) {
  if (["PC", "Laptop", "Printer", "Projector"].includes(device)) return "HW";
  if (device === "Jaringan") return "NW";
  if (["MSOffice", "Software"].includes(device)) return "SW";
  if (device === "Lainlain") return "OT";
  return "OT";
}

// ======================================================
// 🔹 APPLY FILTER & RENDER TABLE
// ======================================================

function applyFilter() {
  ticketsBody.innerHTML = "";

  const selected = filterSelect.value || "all";
  const filtered =
    selected === "all"
      ? allTickets
      : selected === "unassigned"
      ? allTickets.filter((t) => !t.action_by)
      : allTickets.filter((t) => t.action_by === selected);

  if (filtered.length === 0) {
    ticketsBody.innerHTML = `<tr><td colspan="16">There's no ticket with this filter</td></tr>`;
    return;
  }

  filtered.forEach((d) => {
    const statusColor =
      d.status_ticket === "Close"
        ? "green"
        : d.status_ticket === "Close with note"
        ? "orange"
        : "red";

    const sentAt = formatTimestamp(d.createdAt || d.sent_at);
    const codeValue = d.code || mapDeviceToCode(d.device);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${sentAt}</td>
      <td>${d.inventory || "-"}</td>
      <td>${codeValue || "-"}</td>
      <td>${d.location || "-"}</td>
      <td>${d.message || "-"}</td>
      <td>${d.name || "-"}</td>
      <td>${hitungDurasi(d.createdAt, d.updatedAt)}</td>
      <td>${
        d.status_ticket === "Open"
          ? "Continue"
          : d.status_ticket === "Close"
          ? "Finish"
          : d.status_ticket === "Close with note"
          ? "Finish (note)"
          : "-"
      }</td>
      <td>${d.user_email || "-"}</td>
      <td>${d.department || "-"}</td>
      <td>${d.priority || "-"}</td>
      <td style="display:none">${d.subject || "-"}</td>
      <td>
        <select class="assignSelect" data-id="${d.id}">
          <option value="">-- Pilih --</option>
          ${IT_NAMES.map(
            (it) =>
              `<option value="${it}" ${d.action_by === it ? "selected" : ""}>${it}</option>`
          ).join("")}
        </select>
      </td>
      <td>
        <div class="status-wrapper">
          <select class="statusSelect" data-id="${d.id}">
            <option value="Open" ${d.status_ticket === "Open" ? "selected" : ""}>Open</option>
            <option value="Close" ${d.status_ticket === "Close" ? "selected" : ""}>Close</option>
            <option value="Close with note" ${
              d.status_ticket === "Close with note" ? "selected" : ""
            }>Close with note</option>
          </select>
          <span class="dot" style="background-color:${statusColor}"></span>
        </div>
      </td>
      <td>
        ${
          d.status_ticket === "Close with note"
            ? `<textarea class="noteArea" data-id="${d.id}" rows="2" placeholder="Write your note...">${
                d.note || ""
              }</textarea>`
            : "-"
        }
      </td>
      <td>
        <button class="delete-btn" data-id="${d.id}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;

    ticketsBody.appendChild(tr);

    // ========== Event Listeners per baris ==========

    // Update action_by
    tr.querySelector(".assignSelect").addEventListener("change", (e) =>
      updateDoc(doc(db, "tickets", d.id), { action_by: e.target.value })
    );

    // Update status_ticket
    tr.querySelector(".statusSelect").addEventListener("change", async (e) => {
      const newStatus = e.target.value;

      await updateDoc(doc(db, "tickets", d.id), {
        status_ticket: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Update kolom Note
      const noteCell = tr.querySelector("td:nth-last-child(2)");
      if (newStatus === "Close with note") {
        noteCell.innerHTML = `<textarea class="noteArea" data-id="${d.id}" rows="2" placeholder="Write your note...">${
          d.note || ""
        }</textarea>`;
        noteCell
          .querySelector(".noteArea")
          .addEventListener("change", (e) =>
            updateDoc(doc(db, "tickets", d.id), { note: e.target.value })
          );
      } else {
        noteCell.innerHTML = "-";
      }
    });

    // Note listener
    const noteArea = tr.querySelector(".noteArea");
    if (noteArea) {
      noteArea.addEventListener("change", (e) =>
        updateDoc(doc(db, "tickets", d.id), { note: e.target.value })
      );
    }
  });
}

// ======================================================
// 🔹 DELETE BUTTON HANDLING
// ======================================================

ticketsBody.addEventListener("click", async (e) => {
  if (e.target.closest(".delete-btn")) {
    const btn = e.target.closest(".delete-btn");
    const ticketId = btn.dataset.id;

    const confirm = await Swal.fire({
      title: "Hapus tiket ini?",
      text: "Tindakan ini tidak dapat dibatalkan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });

    if (confirm.isConfirmed) {
      try {
        await deleteDoc(doc(db, "tickets", ticketId));
        Swal.fire("Terhapus!", "Tiket telah dihapus.", "success");
      } catch (err) {
        console.error("Error deleting document:", err);
        Swal.fire("Gagal!", "Terjadi kesalahan saat menghapus data.", "error");
      }
    }
  }
});

// ======================================================
// 🔹 MONITOR LOGIN STATE
// ======================================================

onAuthStateChanged(auth, (user) => {
  if (!user && !isLoggingOut) {
    return window.location.replace("../login/index.html");
  }

  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";

    if (userInfo) {
      userInfo.style.display = "inline-block";
      userInfo.textContent = user.displayName || user.email || "Unknown User";
    }

    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
      allTickets = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const names = [
        ...new Set(
          allTickets.map((t) => t.action_by).filter((n) => IT_NAMES.includes(n))
        ),
      ];

      filterSelect.innerHTML = `
        <option value="all">-- All --</option>
        <option value="unassigned">-- Not Assigned --</option>
      `;
      names.forEach((name) => {
        filterSelect.innerHTML += `<option value="${name}">${name}</option>`;
      });

      applyFilter();
    });
  }
});

// ======================================================
// 🔹 EXPORT TO PDF
// ======================================================

function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("l", "pt", "a4");

  doc.setFontSize(14);
  doc.text("List IT Tickets", 40, 40);

  const table = document.getElementById("ticketsTable");
  if (!table) return;

  const headers = Array.from(table.querySelectorAll("thead th")).map(
    (th) => th.innerText
  );

  const rows = Array.from(table.querySelectorAll("tbody tr")).map((tr) =>
    Array.from(tr.querySelectorAll("td")).map((td, idx) => {
      if ([12, 13].includes(idx)) {
        const select = td.querySelector("select");
        return select ? select.value || "-" : td.innerText;
      }
      if (idx === 14) {
        const textarea = td.querySelector("textarea");
        return textarea ? textarea.value || "-" : td.innerText;
      }
      return td.innerText;
    })
  );

  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 60,
    styles: { fontSize: 8, cellPadding: 4, valign: "middle" },
    headStyles: { fillColor: [41, 128, 185], halign: "center" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save("tickets.pdf");
}

// ======================================================
// 🔹 EVENT EXPORT PDF
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
  const btnExport = document.getElementById("btnExportPDF");
  if (btnExport) btnExport.addEventListener("click", exportToPDF);
});

