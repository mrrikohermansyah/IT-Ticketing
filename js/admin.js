// js/admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// 🔹 Firebase Config (ganti dengan punyamu)
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
  loginBtn.disabled = true; // cegah klik berkali-kali
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error("Login gagal:", err);
    alert("❌ Login gagal: " + err.message);
  } finally {
    loginBtn.disabled = false; // aktifkan kembali tombol
  }
});

// --- LOGOUT ---
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// --- MONITOR LOGIN STATE ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ Login sebagai:", user.email);
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    loadTickets(); // hanya load tiket kalau admin sudah login
  } else {
    console.log("❌ Belum login");
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    ticketsBody.innerHTML = `<tr><td colspan="7">Silakan login untuk melihat tiket</td></tr>`;
  }
});

// --- AMBIL DATA TIKET ---
async function loadTickets() {
  try {
    ticketsBody.innerHTML = `<tr><td colspan="7">⏳ Memuat tiket...</td></tr>`;
    const q = query(collection(db, "tickets"), orderBy("sent_at", "desc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      ticketsBody.innerHTML = `<tr><td colspan="7">Belum ada tiket.</td></tr>`;
      return;
    }

    ticketsBody.innerHTML = "";
    snap.forEach((doc) => {
      const d = doc.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${new Date(d.sent_at).toLocaleString()}</td>
        <td>${d.name}</td>
        <td>${d.user_email}</td>
        <td>${d.department}</td>
        <td>${d.priority}</td>
        <td>${d.subject}</td>
        <td>${d.message}</td>
      `;
      ticketsBody.appendChild(tr);
    });
  } catch (err) {
    console.error("❌ Gagal load tiket:", err);
    ticketsBody.innerHTML = `<tr><td colspan="7">❌ Gagal load tiket: ${err.message}</td></tr>`;
  }
}
