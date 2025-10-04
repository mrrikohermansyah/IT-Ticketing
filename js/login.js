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
    alert(`✅ Selamat datang ${user.displayName}`);
    window.location.href = "admin.html";
  } catch (error) {
    console.error("Login Google gagal:", error);
    alert("❌ Login Google gagal: " + error.message);
  }
});

// ==================== Email Login ====================
async function handleEmailLogin(e) {
  e.preventDefault(); // cegah reload form bawaan browser

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Email dan password wajib diisi!");
    return;
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user;
    console.log("Login Email sukses:", user);
    alert(`✅ Selamat datang ${user.email}`);
    window.location.href = "admin.html";
  } catch (error) {
    console.error("Login Email gagal:", error);
    alert("❌ Login gagal, periksa kembali email atau password Anda.");
  }
}

// klik tombol
emailBtn?.addEventListener("click", handleEmailLogin);

// tekan ENTER dalam form
loginForm?.addEventListener("submit", handleEmailLogin);
