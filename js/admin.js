// js/admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// ==================== 🔹 DOM Elements ====================
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const ticketsBody = document.getElementById("ticketsBody");
const filterSelect = document.getElementById("filterActionBy");

// simpan semua tiket agar bisa difilter ulang
let allTickets = [];

// ==================== 🔹 LOGIN ====================
loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error("Login gagal:", err);
    alert("❌ Login gagal: " + err.message);
  }
});

// ==================== 🔹 LOGOUT ====================
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// ==================== 🔹 Render Tiket ====================
function renderTickets(snapshot) {
  ticketsBody.innerHTML = "";
  allTickets = [];

  if (snapshot.empty) {
    ticketsBody.innerHTML = `<tr><td colspan="11">Belum ada tiket.</td></tr>`;
    return;
  }

  snapshot.forEach((docSnap) => {
    allTickets.push({ id: docSnap.id, ...docSnap.data() });
  });

  // 🔹 isi dropdown filter (hanya nama unik)
  const names = [
    ...new Set(allTickets.map((t) => t.action_by).filter(Boolean)),
  ];
  filterSelect.innerHTML = `<option value="all">-- Semua --</option>`;
  names.forEach((name) => {
    filterSelect.innerHTML += `<option value="${name}">${name}</option>`;
  });

  applyFilter();
}

// ==================== 🔹 Apply Filter ====================
function applyFilter() {
  ticketsBody.innerHTML = "";
  const selected = filterSelect.value;

  const filtered =
    selected === "all"
      ? allTickets
      : allTickets.filter((t) => t.action_by === selected);

  if (filtered.length === 0) {
    ticketsBody.innerHTML = `<tr><td colspan="15">Tidak ada tiket untuk filter ini.</td></tr>`;
    return;
  }

  filtered.forEach((d) => {
    let statusColor = "red";
    if (d.status_ticket === "Close") statusColor = "green";
    else if (d.status_ticket === "Close with note") statusColor = "orange";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.sent_at ? new Date(d.sent_at).toLocaleString() : "-"}</td>
      <td>${d.inventory || "-"}</td>
      <td>${d.code || "-"}</td>
      <td>${d.location || "-"}</td>
      <td>${d.message || "-"}</td>
      <td>${d.name || "-"}</td>
      <td>${d.duration || "-"}</td>
        <td>
    ${
      d.status_ticket === "Open"
        ? "Continue"
        : d.status_ticket === "Close"
        ? "Finish"
        : d.status_ticket === "Close with note"
        ? "Finish (note)"
        : "-"
    }
  </td>
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

    // --- Event listener update "action_by"
    tr.querySelector(".assignSelect").addEventListener("change", async (e) => {
      try {
        await updateDoc(doc(db, "tickets", d.id), {
          action_by: e.target.value,
        });
      } catch (err) {
        console.error("Gagal update action_by:", err);
      }
    });

    // --- Event listener update "status_ticket"
    tr.querySelector(".statusSelect").addEventListener("change", async (e) => {
      try {
        await updateDoc(doc(db, "tickets", d.id), {
          status_ticket: e.target.value,
        });
      } catch (err) {
        console.error("Gagal update status:", err);
      }
    });

    // --- Event listener update "note"
    tr.querySelector(".noteArea").addEventListener("change", async (e) => {
      try {
        await updateDoc(doc(db, "tickets", d.id), {
          note: e.target.value,
        });
      } catch (err) {
        console.error("Gagal update note:", err);
      }
    });
  });
}

// event listener untuk filter
filterSelect.addEventListener("change", applyFilter);

// ==================== 🔹 MONITOR LOGIN STATE ====================
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ Login sebagai:", user.email);
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";

    const q = query(collection(db, "tickets"), orderBy("sent_at", "desc"));
    onSnapshot(q, renderTickets);
  } else {
    console.log("❌ Belum login");
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    ticketsBody.innerHTML = `<tr><td colspan="15">Silakan login untuk melihat tiket</td></tr>`;
  }
});


