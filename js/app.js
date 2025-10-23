// ==================== 🔹 Import Firebase SDK ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
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
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ==================== 🔹 DOM Elements ====================
let loginForm, loginEmail, loginPassword, loginEmailBtn, loginGoogleBtn;

// ==================== 🔹 Utility Functions ====================
function showAlert(icon, title, text, timer = 3000) {
  return Swal.fire({
    icon: icon,
    title: title,
    text: text,
    timer: timer,
    timerProgressBar: true,
    showConfirmButton: false,
    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
  });
}

function setLoading(button, isLoading) {
  if (isLoading) {
    button.innerHTML = '<span class="loading"></span> Signing in...';
    button.disabled = true;
  } else {
    button.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Sign In</span>';
    button.disabled = false;
  }
}

// ==================== 🔹 Initialize App ====================
function initApp() {
  // Get DOM elements setelah DOM siap
  loginForm = document.getElementById("loginForm");
  loginEmail = document.getElementById("loginEmail");
  loginPassword = document.getElementById("loginPassword");
  loginEmailBtn = document.getElementById("loginEmailBtn");
  loginGoogleBtn = document.getElementById("loginGoogle");

  // Check if elements exist sebelum add event listeners
  if (!loginForm || !loginEmailBtn || !loginGoogleBtn) {
    console.error("Some DOM elements not found:", {
      loginForm: !!loginForm,
      loginEmailBtn: !!loginEmailBtn,
      loginGoogleBtn: !!loginGoogleBtn
    });
    return;
  }

  // ==================== 🔹 Email/Password Login ====================
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
      showAlert("warning", "Missing Information", "Please fill in all fields");
      return;
    }

    setLoading(loginEmailBtn, true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      await showAlert(
        "success",
        "Login Successful!",
        "Redirecting to admin panel...",
      );

      // Redirect to admin index page
      window.location.href = "../admin/index.html";
    } catch (error) {
      console.error("Login error:", error);

      let errorMessage = "Login failed. Please try again.";

      switch (error.code) {
        case "auth/invalid-email":
          errorMessage = "Invalid email address.";
          break;
        case "auth/user-disabled":
          errorMessage = "This account has been disabled.";
          break;
        case "auth/user-not-found":
          errorMessage = "No account found with this email.";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later.";
          break;
      }

      await showAlert("error", "Login Failed", errorMessage);
    } finally {
      setLoading(loginEmailBtn, false);
    }
  });

  // ==================== 🔹 Google Login ====================
  loginGoogleBtn.addEventListener("click", async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      await showAlert(
        "success",
        "Login Successful!",
        "Redirecting to admin panel...",
      );

      // Redirect to admin index page
      window.location.href = "../admin/index.html";
    } catch (error) {
      console.error("Google login error:", error);

      let errorMessage = "Google login failed. Please try again.";

      if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Login popup was closed. Please try again.";
      } else if (error.code === "auth/popup-blocked") {
        errorMessage =
          "Login popup was blocked. Please allow popups for this site.";
      }

      await showAlert("error", "Google Login Failed", errorMessage);
    }
  });

  console.log("✅ Login app initialized successfully");
}

// ==================== 🔹 Wait for DOM to be ready ====================
document.addEventListener('DOMContentLoaded', initApp);

// Fallback untuk older browsers
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
