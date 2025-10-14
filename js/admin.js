// js/admin.js (rapi & siap pakai)
// ==================== 🔹 Import Firebase SDK ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  updateDoc,
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

// ==================== 🔹 Init Firebase ====================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ==================== 🔹 DOM Elements ====================
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const ticketsBody = document.getElementById("ticketsBody");
const filterSelect = document.getElementById("filterActionBy");

// Redirect ke login.html
if (goLoginBtn) {
  goLoginBtn.addEventListener("click", () => {
    window.location.href = "../login/index.html";
  });
}

// 🔹 Tambahkan event listener di sini
filterSelect.addEventListener("change", () => {
  //console.log("Filter dipilih:", filterSelect.value);
  applyFilter();
});

// IT whitelist
const IT_NAMES = [
  "Riko Hermansyah",
  "Abdurahman Hakim",
  "Moch Wahyu Nugroho",
  "Ade Reinalwi",
];

// Global data cache
let allTickets = [];

// ====================  LOGIN  ====================
loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);

    Swal.fire({
      icon: "success",
      title: "Login Berhasil",
      text: "Selamat datang kembali!",
      showConfirmButton: false,
      timer: 1800,
    });
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "Login Gagal",
      text: err.message,
    });
  }
});

// ==================== LOGOUT ====================
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);

      Swal.fire({
        icon: "info",
        title: "Logout Berhasil",
        text: "Anda telah keluar dari sistem.",
        confirmButtonText: "OK",
      }).then(() => {
        window.location.replace("../login/index.html");
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal Logout",
        text: err.message,
      });
    }
  });
}

// ==================== 🔹 Helpers ====================
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

// mapping device → code
function mapDeviceToCode(device) {
  if (["PC", "Laptop", "Printer", "Projector"].includes(device)) return "HW";
  if (device === "Jaringan") return "NW";
  if (["MSOffice", "Software"].includes(device)) return "SW";
  if (device === "Lainlain") return "OT";
  return "OT";
}

// ==================== 🔹 Apply Filter & render rows ====================
function applyFilter() {
  ticketsBody.innerHTML = "";
  const selected = filterSelect.value || "all";

  const filtered =
    selected === "all"
      ? allTickets
      : selected === "unassigned"
      ? allTickets.filter((t) => !t.action_by)
      : allTickets.filter((t) => t.action_by === selected);

  // 🔍 Debug log
  //console.log("=== DEBUG FILTER ===");
  //console.log("Selected:", selected);
  //console.log(
  //  "All Tickets action_by:",
  //  allTickets.map((t) => t.action_by)
  // );
  // console.log(
  //  "Filtered Tickets:",
  //  filtered.map((t) => t.action_by)
  //);

  if (filtered.length === 0) {
    ticketsBody.innerHTML = `<tr><td colspan="15">Tidak ada tiket untuk filter ini.</td></tr>`;
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

    // gunakan d.code jika sudah tersimpan, fallback ke mapping otomatis dari device
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
      <td>${d.subject || "-"}</td>
      <td>
        <select class="assignSelect" data-id="${d.id}">
          <option value="">-- Pilih --</option>
          ${IT_NAMES.map(
            (it) =>
              `<option value="${it}" ${
                d.action_by === it ? "selected" : ""
              }>${it}</option>`
          ).join("")}
        </select>
      </td>
      <td>
        <div class="status-wrapper">
          <select class="statusSelect" data-id="${d.id}">
            <option value="Open" ${
              d.status_ticket === "Open" ? "selected" : ""
            }>Open</option>
            <option value="Close" ${
              d.status_ticket === "Close" ? "selected" : ""
            }>Close</option>
            <option value="Close with note" ${
              d.status_ticket === "Close with note" ? "selected" : ""
            }>Close with note</option>
          </select>
          <span class="dot" style="background-color:${statusColor}"></span>
        </div>
      </td>
      <td>
        <textarea class="noteArea" data-id="${
          d.id
        }" rows="2" placeholder="Tulis catatan...">${d.note || ""}</textarea>
      </td>
    `;
    ticketsBody.appendChild(tr);

    // ---------- Listeners ----------
    tr.querySelector(".assignSelect").addEventListener("change", (e) =>
      updateDoc(doc(db, "tickets", d.id), { action_by: e.target.value })
    );
    tr.querySelector(".statusSelect").addEventListener("change", (e) =>
      updateDoc(doc(db, "tickets", d.id), {
        status_ticket: e.target.value,
        updatedAt: serverTimestamp(),
      })
    );
    tr.querySelector(".noteArea").addEventListener("change", (e) =>
      updateDoc(doc(db, "tickets", d.id), { note: e.target.value })
    );
  });
}

// ==================== 🔹 Monitor Login State ====================
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";

    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
      allTickets = [];
      snapshot.forEach((docSnap) =>
        allTickets.push({ id: docSnap.id, ...docSnap.data() })
      );

      // Isi filter dengan IT whitelist
      const names = [
        ...new Set(
          allTickets.map((t) => t.action_by).filter((n) => IT_NAMES.includes(n))
        ),
      ];

      filterSelect.innerHTML = `<option value="all">-- Semua --</option>
                                <option value="unassigned">-- Belum di-assign --</option>`;
      names.forEach((name) => {
        filterSelect.innerHTML += `<option value="${name}">${name}</option>`;
      });

      applyFilter();
    });
  } else {
    // 🔹 redirect ke login kalau belum login
    window.location.replace("../login/index.html");
    // loginBtn.style.display = "inline-block";
    //logoutBtn.style.display = "none";
    //ticketsBody.innerHTML = `<tr><td colspan="15">Silakan login untuk melihat tiket</td></tr>`;
  }
});

// ==================== 🔹 Export PDF ====================
function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("l", "pt", "a4"); // landscape

  doc.setFontSize(14);
  doc.text("Daftar Tiket IT", 40, 40);

  const table = document.getElementById("ticketsTable");
  if (!table) return;

  // === Ambil header ===
  const headers = Array.from(table.querySelectorAll("thead th")).map(
    (th) => th.innerText
  );

  // === Ambil isi baris (tbody) ===
  const rows = Array.from(table.querySelectorAll("tbody tr")).map((tr) => {
    return Array.from(tr.querySelectorAll("td")).map((td, idx) => {
      // Khusus kolom Action By (index 12)
      if (idx === 12) {
        const select = td.querySelector("select");
        return select ? select.value || "-" : td.innerText;
      }
      // Khusus kolom Status Ticket (index 13)
      if (idx === 13) {
        const select = td.querySelector("select");
        return select ? select.value || "-" : td.innerText;
      }
      // Khusus kolom Note (index 14)
      if (idx === 14) {
        const textarea = td.querySelector("textarea");
        return textarea ? textarea.value || "-" : td.innerText;
      }
      // Default ambil teks
      return td.innerText;
    });
  });

  // Buat tabel ke PDF
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

document.addEventListener("DOMContentLoaded", () => {
  const btnExport = document.getElementById("btnExportPDF");
  if (btnExport) {
    btnExport.addEventListener("click", exportToPDF);
  }
});


