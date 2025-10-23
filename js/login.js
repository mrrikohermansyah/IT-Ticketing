// ==================== 🔹 Firebase Configuration ====================
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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

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
    button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login Email';
    button.disabled = false;
  }
}

function setGoogleLoading(button, isLoading) {
  if (isLoading) {
    button.innerHTML = '<span class="loading"></span> Connecting...';
    button.disabled = true;
  } else {
    button.innerHTML = '<i class="fab fa-google"></i> Login Google';
    button.disabled = false;
  }
}

// ==================== 🔹 Initialize App ====================
function initLoginApp() {
  console.log("?? Initializing login application...");

  // Initialize DOM elements
  loginForm = document.getElementById("loginForm");
  loginEmail = document.getElementById("loginEmail");
  loginPassword = document.getElementById("loginPassword");
  loginEmailBtn = document.getElementById("loginEmailBtn");
  loginGoogleBtn = document.getElementById("loginGoogle");

  // Debug DOM elements
  console.log("?? DOM Elements:", {
    loginForm: !!loginForm,
    loginEmail: !!loginEmail,
    loginPassword: !!loginPassword,
    loginEmailBtn: !!loginEmailBtn,
    loginGoogleBtn: !!loginGoogleBtn,
  });

  // Add event listeners
  if (loginForm) {
    loginForm.addEventListener("submit", handleEmailLogin);
  }

  if (loginGoogleBtn) {
    loginGoogleBtn.addEventListener("click", handleGoogleLogin);
  }

  // Add input validation
  if (loginEmail) loginEmail.addEventListener("blur", validateEmail);
  if (loginPassword) loginPassword.addEventListener("blur", validatePassword);

  console.log("✅ Login system initialized successfully");
}

// ==================== 🔹 Email/Password Login ====================
async function handleEmailLogin(e) {
  e.preventDefault();

  const email = loginEmail ? loginEmail.value.trim() : "";
  const password = loginPassword ? loginPassword.value : "";

  if (!email || !password) {
    showAlert("warning", "Missing Information", "Please fill in all fields");
    return;
  }

  if (!validateEmailInput(email)) {
    showAlert("warning", "Invalid Email", "Please enter a valid email address");
    return;
  }

  if (loginEmailBtn) setLoading(loginEmailBtn, true);

  try {
    const userCredential = await firebase
      .auth()
      .signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    console.log("✅ Email login successful:", user.email);
    await showAlert(
      "success",
      "Login Successful!",
      "Redirecting to admin panel...",
    );
    window.location.href = "../admin/index.html";
  } catch (error) {
    console.error("❌ Login error:", error);

    let errorMessage = "Login failed. Please try again.";

    switch (error.code) {
      case "auth/invalid-email":
        errorMessage = "Invalid email address.";
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
    if (loginEmailBtn) setLoading(loginEmailBtn, false);
  }
}

// ==================== 🔹 Google Login ====================
async function handleGoogleLogin() {
  try {
    console.log("?? Attempting Google login...");

    if (loginGoogleBtn) setGoogleLoading(loginGoogleBtn, true);

    // Gunakan popup dengan error handling
    const result = await firebase.auth().signInWithPopup(googleProvider);
    const user = result.user;

    console.log("✅ Google login successful:", user.email);
    await showAlert(
      "success",
      "Login Successful!",
      "Redirecting to admin panel...",
    );
    window.location.href = "../admin/index.html";
  } catch (error) {
    console.error("❌ Google login error:", error);

    let errorMessage = "Google login failed. Please try again.";

    if (error.code === "auth/popup-closed-by-user") {
      errorMessage = "Login popup was closed. Please try again.";
    } else if (error.code === "auth/popup-blocked") {
      errorMessage =
        "Popup blocked by browser. Please allow popups and try again.";
    } else if (error.code === "auth/unauthorized-domain") {
      errorMessage =
        "This domain is not authorized. Please contact administrator.";
    }

    await Swal.fire({
      title: "Google Login Failed",
      text: errorMessage,
      icon: "error",
      confirmButtonText: "Try Again",
    });
  } finally {
    if (loginGoogleBtn) setGoogleLoading(loginGoogleBtn, false);
  }
}

// ==================== 🔹 Input Validation ====================
function validateEmail() {
  const email = this.value.trim();
  const isValid = validateEmailInput(email);

  if (this.parentElement) {
    if (email && !isValid) {
      this.parentElement.classList.add("input-error");
      this.parentElement.classList.remove("input-success");
    } else if (email && isValid) {
      this.parentElement.classList.remove("input-error");
      this.parentElement.classList.add("input-success");
    } else {
      this.parentElement.classList.remove("input-error", "input-success");
    }
  }
}

function validatePassword() {
  const password = this.value;

  if (this.parentElement) {
    if (password && password.length > 0) {
      this.parentElement.classList.remove("input-error");
      this.parentElement.classList.add("input-success");
    } else {
      this.parentElement.classList.remove("input-error", "input-success");
    }
  }
}

function validateEmailInput(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ==================== 🔹 Check Admin Access ====================
function isAdminUser(user) {
  if (!user || !user.email) {
    console.error("❌ No user or email provided");
    return false;
  }

  const userEmail = user.email.toLowerCase();

  console.log("🔍 DEBUG Admin Check:", {
    userEmail: userEmail,
    CONFIG_LOADED: !!window.CONFIG,
    ADMIN_EMAILS: window.CONFIG?.ADMIN_EMAILS,
    ALL_EMAILS: window.CONFIG?.ADMIN_EMAILS?.map((email) =>
      email.toLowerCase(),
    ),
  });

  // ? VALIDATE CONFIG
  if (!window.CONFIG || !Array.isArray(window.CONFIG.ADMIN_EMAILS)) {
    console.error("❌ ADMIN_EMAILS config invalid or not loaded");
    return false;
  }

  // Check case-insensitive match
  const isAdmin = window.CONFIG.ADMIN_EMAILS.some(
    (adminEmail) => adminEmail.toLowerCase() === userEmail,
  );

  console.log("🎯 FINAL Admin Check Result:", {
    userEmail: userEmail,
    isAdmin: isAdmin,
    matchedEmail: window.CONFIG.ADMIN_EMAILS.find(
      (adminEmail) => adminEmail.toLowerCase() === userEmail,
    ),
  });

  return isAdmin;
}

// ==================== 🔹 Initialize on DOM Load ====================
document.addEventListener("DOMContentLoaded", function () {
  console.log("?? DOM loaded, initializing login app...");
  initLoginApp();
});
