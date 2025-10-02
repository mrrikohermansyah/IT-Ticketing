// js/admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
  getFirestore, collection, query, orderBy, onSnapshot, updateDoc, doc 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// 🔹 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCQR--hn0RDvDduCjA2Opa9HLzyYn_GFIs",
  authDomain: "itticketing-f926e.firebaseapp.com",
  projectId: "itticketing-f926e",
  storageBucket: "itticketing-f926e.firebasestorage.app",
  messagingSenderId: "896370077103",
  appId: "1:896370077103:web:1d692e88b611bff838935a",
  measurementId: "G-TJCHPXG7D5"
};

// 🔹 Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// 🔹 Elemen DOM
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const ticketsBody = document.getElementById("ticketsBody");

// --- LOGIN ---
loginBtn.addEventListener("click", async () => {
  loginBtn.disabled = true;
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error("Login gagal:", err);
    alert("❌ Login gagal: " + err.message);
  } finally {
    loginBtn.disabled = false;
  }
});

// --- LOGOUT ---
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// --- Render Tiket ---
function renderTickets(snapshot) {
  ticketsBody.innerHTML = "";

  if (snapshot.empty) {
    ticketsBody.innerHTML = `<tr><td colspan="8">Belum ada tiket.</td></tr>`;
    return;
  }

  snapshot.forEach(docSnap => {
    const d = docSnap.data();
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${d.sent_at ? new Date(d.sent_at).toLocaleString() : "-"}</td>
      <td>${d.name || "-"}</td>
      <td>${d.user_email || "-"}</td>
      <td>${d.department || "-"}</td>
      <td>${d.priority || "-"}</td>
      <td>${d.subject || "-"}</td>
      <td>${d.message || "-"}</td>
      <td>
        <select class="assignSelect">
          <option value="">-- Pilih --</option>
          <option value="Riko Hermansyah" ${d.action_by === "Riko Hermansyah" ? "selected" : ""}>Riko Hermansyah</option>
          <option value="Abdurahman Hakim" ${d.action_by === "Abdurahman Hakim" ? "selected" : ""}>Abdurahman Hakim</option>
          <option value="Moch Wahyu Nugroho" ${d.action_by === "Moch Wahyu Nugroho" ? "selected" : ""}>Moch Wahyu Nugroho</option>
          <option value="Ade Reinalwi" ${d.action_by === "Ade Reinalwi" ? "selected" : ""}>Ade Reinalwi</option>
        </select>
      </td>
      <td>
        <span style="display:inline-flex;align-items:center;gap:6px;">
          <span style="width:12px;height:12px;border-radius:50%;background:${color};display:inline-block;"></span>
          <select class="statusSelect" data-id="${docSnap.id}">
            <option value="Open" ${d.status_ticket === "Open" ? "selected" : ""}>Open</option>
            <option value="Close" ${d.status_ticket === "Close" ? "selected" : ""}>Close</option>
            <option value="Close with Note" ${d.status_ticket === "Close with Note" ? "selected" : ""}>Close with Note</option>
          </select>
        </span>
      </td>
    `;
    ticketsBody.appendChild(tr);
  });
    if (snapshot.empty) {
    ticketsBody.innerHTML = `<tr><td colspan="9">Belum ada tiket.</td></tr>`;
  }

    // 🔹 Event listener assign IT
  document.querySelectorAll(".assignSelect").forEach(select => {
    select.addEventListener("change", async (e) => {
      const ticketId = e.target.dataset.id;
      try {
        await updateDoc(doc(db, "tickets", ticketId), {
          action_by: e.target.value
        });
        console.log("✅ Berhasil update action_by");
      } catch (err) {
        console.error("Gagal update action_by:", err);
        alert("❌ Gagal update action_by: " + err.message);
      }
    });
  });

  // 🔹 Event listener status ticket
  document.querySelectorAll(".statusSelect").forEach(select => {
    select.addEventListener("change", async (e) => {
      const ticketId = e.target.dataset.id;
      try {
        await updateDoc(doc(db, "tickets", ticketId), {
          status_ticket: e.target.value
        });
        console.log("✅ Berhasil update status_ticket");
      } catch (err) {
        console.error("Gagal update status_ticket:", err);
        alert("❌ Gagal update status_ticket: " + err.message);
      }
    });
  });
}

// --- MONITOR LOGIN STATE ---
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
    ticketsBody.innerHTML = `<tr><td colspan="8">Silakan login untuk melihat tiket</td></tr>`;
  }
});
