// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// 🔧 Firebase config kamu
const firebaseConfig = {
  apiKey: "AIzaSyCQR--hn0RDvDduCjA2Opa9HLzyYn_GFIs",
  authDomain: "itticketing-f926e.firebaseapp.com",
  projectId: "itticketing-f926e",
  storageBucket: "itticketing-f926e.firebasestorage.app",
  messagingSenderId: "896370077103",
  appId: "1:896370077103:web:1d692e88b611bff838935a",
  measurementId: "G-TJCHPXG7D5"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// DOM
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const ticketsBody = document.getElementById("ticketsBody");

// Login
loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    alert("Login gagal: " + err.message);
    console.error(err);
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Logout gagal", err);
  }
});

// Pantau status login
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("✅ Login sebagai:", user.email);

    // Tampilkan tombol logout, sembunyikan login
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";

    // Hanya admin yang boleh baca
    if (user.email === "mr.rikohermansyah@gmail.com") {
      loadTickets();
    } else {
      ticketsBody.innerHTML = `<tr><td colspan="7">❌ Akses ditolak: bukan admin</td></tr>`;
    }
  } else {
    console.log("❌ Belum login");

    // Reset UI
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    ticketsBody.innerHTML = `<tr><td colspan="7">Silakan login untuk melihat tiket.</td></tr>`;
  }
});

// Fungsi ambil tiket
async function loadTickets() {
  try {
    ticketsBody.innerHTML = `<tr><td colspan="7" class="loading">Memuat...</td></tr>`;

    const q = query(collection(db, "tickets"), orderBy("sent_at", "desc"));
    const snap = await getDocs(q);

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

    if (snap.empty) {
      ticketsBody.innerHTML = `<tr><td colspan="7">Belum ada tiket.</td></tr>`;
    }
  } catch (err) {
    console.error(err);
    ticketsBody.innerHTML = `<tr><td colspan="7">❌ Gagal load tiket: ${err.message}</td></tr>`;
  }
}
