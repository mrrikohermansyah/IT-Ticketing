// ==================== Firebase SDK ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// ==================== Konfigurasi Firebase ====================
const firebaseConfig = {
  apiKey: "AIzaSyCQR--hn0RDvDduCjA2Opa9HLzyYn_GFIs",
  authDomain: "itticketing-f926e.firebaseapp.com",
  projectId: "itticketing-f926e",
  storageBucket: "itticketing-f926e.firebasestorage.app",
  messagingSenderId: "896370077103",
  appId: "1:896370077103:web:1d692e88b611bff838935a",
  measurementId: "G-TJCHPXG7D5",
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ==================== Element DOM ====================
const googleBtn = document.getElementById("loginGoogle");
const emailBtn = document.getElementById("loginEmailBtn");
const emailInput = document.getElementById("loginEmail");
const passwordInput = document.getElementById("loginPassword");
const loginForm = document.getElementById("loginForm"); // form wrapper

// ==================== Google Login ====================
googleBtn?.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Ganti alert dengan SweetAlert2
    Swal.fire({
      icon: "success",
      title: "Selamat Datang!",
      text: `✅ Halo ${user.displayName}`,
      confirmButtonText: "Lanjut",
    }).then(() => {
      window.location.href = "../admin/index.html";
    });
  } catch (error) {
    console.error("Login Google gagal:", error);
    Swal.fire({
      icon: "error",
      title: "Login Gagal",
      text: "❌ " + error.message,
    });
  }
});

// ==================== Email Login ====================
async function handleEmailLogin(e) {
  e.preventDefault(); // cegah reload form bawaan browser

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    Swal.fire({
      icon: "warning",
      title: "Form tidak lengkap",
      text: "Email dan password wajib diisi!",
    });
    return;
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user;
    console.log("Login Email sukses:", user);

    Swal.fire({
      icon: "success",
      title: "Selamat Datang!",
      text: `✅ Halo ${user.email}`,
      confirmButtonText: "Lanjut",
    }).then(() => {
      window.location.href = "../admin/index.html";
    });
  } catch (error) {
    console.error("Login Email gagal:", error);
    Swal.fire({
      icon: "error",
      title: "Login Gagal",
      text: "❌ Periksa kembali email atau password Anda.",
    });
  }
}

// klik tombol
emailBtn?.addEventListener("click", handleEmailLogin);

// tekan ENTER dalam form
loginForm?.addEventListener("submit", handleEmailLogin);

// Buat elemen <a>
const backLink = document.createElement("a");
backLink.href = "https://mrrikohermansyah.github.io/IT-Ticketing/"; // ganti sesuai target halamanmu
backLink.textContent = "← Go to Input Ticket";
backLink.classList.add("back-link");

// Sisipkan ke container
document.getElementById("backLinkContainer").appendChild(backLink);

