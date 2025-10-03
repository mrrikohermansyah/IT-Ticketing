// js/admin.js (rapih, siap pakai)
// 🔹 Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  updateDoc,
  addDoc,
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

// Simpan semua tiket agar bisa difilter ulang
let allTickets = [];

// ==================== 🔹 LOGIN / LOGOUT ====================
loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error("Login gagal:", err);
    alert("❌ Login gagal: " + err.message);
  }
});
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// ==================== 🔹 Helpers ====================
function formatTimestamp(ts) {
  if (!ts) return "-";
  // Firestore Timestamp has toDate()
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
}

function hitungDurasi(createdAt, updatedAt) {
  if (!createdAt || !updatedAt) return "-";
  const start = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  const end = updatedAt.toDate ? updatedAt.toDate() : new Date(updatedAt);
  if (isNaN(start) || isNaN(end)) return "-";
  const menit = Math.floor((end - start) / 60000);
  return `${menit} menit`;
}

// ==================== 🔹 Render Tiket ====================
function renderTickets(snapshot) {
  ticketsBody.innerHTML = "";
  allTickets = [];

  if (snapshot.empty) {
    ticketsBody.innerHTML = `<tr><td colspan="15">Belum ada tiket.</td></tr>`;
    return;
  }

  snapshot.forEach((docSnap) => {
    allTickets.push({ id: docSnap.id, ...docSnap.data() });
  });

  // isi dropdown filter hanya dengan nama unik
  const names = [...new Set(allTickets.map((t) => t.action_by).filter(Boolean))];
  filterSelect.innerHTML = `<option value="all">-- Semua --</option>`;
  names.forEach((name) => {
    filterSelect.innerHTML += `<option value="${name}">${name}</option>`;
  });

  applyFilter();
}

// ==================== 🔹 Apply Filter & render rows ====================
function applyFilter() {
  ticketsBody.innerHTML = "";
  const selected = filterSelect.value || "all";

  const filtered =
    selected === "all"
      ? allTickets
      : selected === "unassigned"
      ? allTickets.filter((t) => !t.action_by) // belum di-assign
      : allTickets.filter((t) => t.action_by === selected);

  if (filtered.length === 0) {
    ticketsBody.innerHTML = `<tr><td colspan="15">Tidak ada tiket untuk filter ini.</td></tr>`;
    return;
  }

  filtered.forEach((d) => {
    // warna status
    let statusColor = "red";
    if (d.status_ticket === "Close") statusColor = "green";
    else if (d.status_ticket === "Close with note") statusColor = "orange";

    const sentAt = formatTimestamp(d.createdAt || d.sent_at);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${sentAt}</td>
      <td>${d.inventory || "-"}</td>
      <td>
        <select class="codeSelect" data-id="${d.id}">
          <option value="">-- Pilih --</option>
          <option value="HW" ${d.code === "HW" ? "selected" : ""}>HW</option>
          <option value="SW" ${d.code === "SW" ? "selected" : ""}>SW</option>
          <option value="NW" ${d.code === "NW" ? "selected" : ""}>NW</option>
          <option value="HW&SW" ${d.code === "HW&SW" ? "selected" : ""}>HW&SW</option>
          <option value="HW&NW" ${d.code === "HW&NW" ? "selected" : ""}>HW&NW</option>
          <option value="KB" ${d.code === "KB" ? "selected" : ""}>KB</option>
          <option value="Other" ${d.code === "Other" ? "selected" : ""}>Lainnya</option>
        </select>
      </td>
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
          <option value="Riko Hermansyah" ${d.action_by === "Riko Hermansyah" ? "selected" : ""}>Riko Hermansyah</option>
          <option value="Abdurahman Hakim" ${d.action_by === "Abdurahman Hakim" ? "selected" : ""}>Abdurahman Hakim</option>
          <option value="Moch Wahyu Nugroho" ${d.action_by === "Moch Wahyu Nugroho" ? "selected" : ""}>Moch Wahyu Nugroho</option>
          <option value="Ade Reinalwi" ${d.action_by === "Ade Reinalwi" ? "selected" : ""}>Ade Reinalwi</option>
        </select>
      </td>
      <td>
        <div class="status-wrapper">
          <select class="statusSelect" data-id="${d.id}">
            <option value="Open" ${d.status_ticket === "Open" ? "selected" : ""}>Open</option>
            <option value="Close" ${d.status_ticket === "Close" ? "selected" : ""}>Close</option>
            <option value="Close with note" ${d.status_ticket === "Close with note" ? "selected" : ""}>Close with note</option>
          </select>
          <span class="dot" style="background-color: ${statusColor}"></span>
        </div>
      </td>
      <td>
        <textarea class="noteArea" data-id="${d.id}" rows="2" placeholder="Tulis catatan...">${d.note || ""}</textarea>
      </td>
    `;
    ticketsBody.appendChild(tr);

    // ---------- listeners ----------
    // update kode (code)
    tr.querySelector(".codeSelect").addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      try {
        await updateDoc(doc(db, "tickets", id), { code: e.target.value });
        console.log("✅ code updated", id, e.target.value);
      } catch (err) {
        console.error("Gagal update code:", err);
        alert("Gagal update code: " + (err.message || err));
      }
    });

    // update action_by (manual assign IT)
    tr.querySelector(".assignSelect").addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      try {
        await updateDoc(doc(db, "tickets", id), { action_by: e.target.value });
        console.log("✅ action_by updated", id);
      } catch (err) {
        console.error("Gagal update action_by:", err);
      }
    });

    // update status -> juga tulis updatedAt (serverTimestamp)
    tr.querySelector(".statusSelect").addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      const newStatus = e.target.value;
      try {
        const ticketRef = doc(db, "tickets", id);
        const payload = {
          status_ticket: newStatus,
          updatedAt: serverTimestamp(),
        };
        // ⚠️ TIDAK isi action_by dengan email user
        await updateDoc(ticketRef, payload);
        console.log(`✅ status updated ${id} -> ${newStatus}`);
      } catch (err) {
        console.error("Gagal update status:", err);
        alert("Gagal update status: " + (err.message || err));
      }
    });

    // update note
    tr.querySelector(".noteArea").addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      try {
        await updateDoc(doc(db, "tickets", id), { note: e.target.value });
        console.log("✅ Note updated", id);
      } catch (err) {
        console.error("Gagal update note:", err);
      }
    });
  });
}

// event listener untuk filter
filterSelect.addEventListener("change", applyFilter);

// ==================== 🔹 Monitor Login State ====================
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ Login sebagai:", user.email);
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";

    // Ambil tiket terbaru (paling atas = terbaru) — URUTKAN berdasar createdAt
    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
      allTickets = [];
      snapshot.forEach((docSnap) => {
        allTickets.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Daftar IT fix (whitelist)
      const IT_NAMES = [
        "Riko Hermansyah",
        "Abdurahman Hakim",
        "Moch Wahyu Nugroho",
        "Ade Reinalwi",
      ];

      // Ambil nama unik dari tiket (hanya IT_NAMES)
      const names = [
        ...new Set(allTickets.map((t) => t.action_by).filter((n) => IT_NAMES.includes(n))),
      ];

      // Isi filter
      filterSelect.innerHTML = `<option value="all">-- Semua --</option>
                                <option value="unassigned">-- Belum di-assign --</option>`;
      names.forEach((name) => {
        filterSelect.innerHTML += `<option value="${name}">${name}</option>`;
      });

      applyFilter();
    });
  } else {
    console.log("❌ Belum login");
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    ticketsBody.innerHTML = `<tr><td colspan="15">Silakan login untuk melihat tiket</td></tr>`;
  }
});


