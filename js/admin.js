// Firebase Modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCQR--hn0RDvDduCjA2Opa9HLzyYn_GFIs",
  authDomain: "itticketing-f926e.firebaseapp.com",
  projectId: "itticketing-f926e",
  storageBucket: "itticketing-f926e.firebasestorage.app",
  messagingSenderId: "896370077103",
  appId: "1:896370077103:web:1d692e88b611bff838935a",
  measurementId: "G-TJCHPXG7D5"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
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

document.getElementById("loginBtn").addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error("Login gagal", e);
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Login sebagai", user.email);
    // coba load tiket
    try {
      const snap = await getDocs(collection(db, "tickets"));
      document.getElementById("tickets").innerHTML = "";
      snap.forEach(doc => {
        const d = doc.data();
        document.getElementById("tickets").innerHTML += `<div>${d.subject} - ${d.priority}</div>`;
      });
    } catch (err) {
      console.error("❌ Gagal load tiket:", err);
    }
  } else {
    console.log("Belum login");
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


async function loadTickets() {
  const tbody = document.getElementById("ticketsBody");
  tbody.innerHTML = "<tr><td colspan='7'>⏳ Memuat data...</td></tr>";

  try {
    const colRef = collection(db, "tickets");
    const q = query(colRef, orderBy("sent_at", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      tbody.innerHTML = "<tr><td colspan='7'>Belum ada tiket.</td></tr>";
      return;
    }

    tbody.innerHTML = "";
    snapshot.forEach(doc => {
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
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("❌ Gagal load tiket:", err);
    tbody.innerHTML = "<tr><td colspan='7'>Gagal memuat data.</td></tr>";
  }
}

// Load data saat halaman dibuka
loadTickets();
