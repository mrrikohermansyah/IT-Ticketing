// ==================== 🔹 Import Firebase SDK ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ==================== 🔹 Firebase Config ====================
const firebaseConfig = {
  apiKey: "AIzaSyCQR--hn0RDvDvCjA2Opa9HLzyYn_GFIs",
  authDomain: "itticketing-f926e.firebaseapp.com",
  projectId: "itticketing-f926e",
  storageBucket: "itticketing-f926e.firebasestorage.app",
  messagingSenderId: "896370077103",
  appId: "1:896370077103:web:1d692e88b611bff838935a",
  measurementId: "G-TJCHPXG7D5",
};

// ==================== 🔹 Google Apps Script Configuration ====================
const GAS_CONFIG = {
  WEB_APP_URL:
    "https://script.google.com/macros/s/AKfycbyFFVbuWQrHVbUdO4cXkJ4Qh_Yy02XjTjVKwb43V5PyCya7PaG9Jys25C-zrfx984iXGg/exec",
};

// ==================== 🔹 Init Firebase & Firestore ====================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==================== 🔹 DOM Element ====================
const form = document.getElementById("ticketForm");
const statusEl = document.getElementById("status");

// Hide the status element since we're using SweetAlert
if (statusEl) statusEl.style.display = "none";

// ==================== 🔹 Device Type Mapping ====================
const deviceTypeMapping = {
  "PC Hardware": "HW",
  Laptop: "HW",
  Printer: "HW",
  Projector: "HW",
  "PC Software": "SW",
  Network: "NW",
  Others: "OT",
};

// ==================== 🔹 Global Variables ====================
let formData = {};
let isSubmitting = false;

// ==================== 🔹 Platform Detection ====================
const platform = {
  isMobile:
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ),
  isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
  isAndroid: /Android/i.test(navigator.userAgent),
  isTouch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
};

// ==================== 🔹 Enhanced Submit Handler ====================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Prevent multiple simultaneous submissions
  if (isSubmitting) {
    await showAlert(
      "warning",
      "Please Wait",
      "Your ticket is being submitted..."
    );
    return;
  }

  if (!form.checkValidity()) {
    // Enhanced validation feedback for mobile
    showValidationErrors();
    form.reportValidity();

    // Scroll to first error on mobile
    if (platform.isMobile) {
      const firstInvalid = form.querySelector(":invalid");
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    return;
  }

  isSubmitting = true;
  const submitBtn = document.getElementById("submitBtn");
  const originalText = submitBtn.innerHTML;

  // Show loading state with platform-appropriate feedback
  submitBtn.innerHTML = platform.isMobile
    ? '<span class="loading"></span> Submitting...'
    : '<span class="loading"></span> Submitting Ticket...';
  submitBtn.disabled = true;

  // Disable form inputs during submission
  disableFormInputs(true);

  try {
    // Collect form data
    formData = collectFormData();

    // 🔥 STEP 1: Kirim ke Google Script untuk generate Ticket ID dan kirim email
    const googleScriptResponse = await submitToGoogleScript(formData);

    // 🔥 STEP 2: Handle response dari Google Script
    await handleFormSubmitSuccess(googleScriptResponse);

    // Reset form
    form.reset();
    clearDraft();

    // Reset validation styles
    resetValidationStyles();
  } catch (error) {
    console.error("Submission Error:", error);

    // Enhanced error messaging based on platform
    const errorMessage = platform.isMobile
      ? "Submission failed. Please check your connection and try again."
      : "There was an error submitting your ticket. Please try again or contact IT support directly.";

    await showAlert("error", "Submission Failed", errorMessage);
  } finally {
    // Reset button and form state
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    disableFormInputs(false);
    isSubmitting = false;
  }
});

// ==================== 🔹 Enhanced Form Input Handling ====================
function disableFormInputs(disabled) {
  const inputs = form.querySelectorAll("input, select, textarea, button");
  inputs.forEach((input) => {
    if (input.type !== "submit") {
      input.disabled = disabled;
    }

    // Add visual feedback for disabled state
    if (disabled) {
      input.style.opacity = "0.7";
      input.style.cursor = "not-allowed";
    } else {
      input.style.opacity = "1";
      input.style.cursor = "";
    }
  });
}

// ==================== 🔹 Enhanced Validation ====================
function showValidationErrors() {
  const inputs = form.querySelectorAll("input, select, textarea");

  inputs.forEach((input) => {
    if (!input.checkValidity()) {
      input.style.borderColor = "#dc2626";
      input.style.backgroundColor = "#fef2f2";

      // Add shake animation for mobile
      if (platform.isMobile) {
        input.classList.add("shake-animation");
        setTimeout(() => input.classList.remove("shake-animation"), 600);
      }
    }
  });
}

function resetValidationStyles() {
  const inputs = form.querySelectorAll("input, select, textarea");
  inputs.forEach((input) => {
    input.style.borderColor = "";
    input.style.backgroundColor = "";
  });
}

// ==================== 🔹 Enhanced Collect Form Data ====================
function collectFormData() {
  const data = new FormData(form);
  const device = data.get("device");
  const code = deviceTypeMapping[device] || "OT";

  // Enhanced phone number formatting for mobile
  let userPhone = data.get("user_phone") || "";
  if (platform.isMobile) {
    userPhone = userPhone
      .replace(/\s+/g, "")
      .replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  }

  return {
    user_email: (data.get("user_email") || "").trim().toLowerCase(),
    inventory: (data.get("inventory") || "").toUpperCase().trim(),
    name: (data.get("name") || "").trim(),
    user_phone: userPhone,
    department: data.get("department") || "",
    location: data.get("location") || "",
    device: device,
    priority: data.get("priority") || "Medium",
    subject: (data.get("subject") || "").trim(),
    message: (data.get("message") || "").trim(),
    code: code,
    status_ticket: "Open",
    user_agent: navigator.userAgent,
    platform: platform.isMobile
      ? platform.isIOS
        ? "iOS"
        : "Android"
      : "Desktop",
  };
}

// ==================== 🔹 Enhanced Google Apps Script Submission ====================
async function submitToGoogleScript(formData) {
  try {
    console.log("🚀 Sending data to Google Script...", formData);

    // Use POST method instead of GET for better reliability
    const response = await fetch(GAS_CONFIG.WEB_APP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "submitTicket",
        data: formData,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Google Script response:", result);

    return result;
  } catch (error) {
    console.error("❌ Google Script submission error:", error);

    // Fallback: generate ticket ID locally
    return {
      status: "success",
      ticketId: generateSimpleTicketId(formData),
      message: "Using fallback due to network issue",
    };
  }
}

// ==================== 🔹 Enhanced Ticket ID Generation ====================
function generateSimpleTicketId(ticket) {
  const codeMaps = {
    departments: {
      IT: "IT",
      HR: "HR",
      HSE: "HSE",
      QC: "QC",
      Finance: "FIN",
      Maintenance: "MNT",
      Warehouse: "WH",
      Management: "MGT",
      Procurement: "PRO",
      Engineer: "ENG",
      "Document Control": "DOC",
      Completion: "COM",
      Vendor: "VEN",
      Clinic: "CLN",
      Lainlain: "OTH",
    },
    locations: {
      "Blue Office": "BLU",
      "White Office": "WHT",
      "Green Office": "GRN",
      "Red Office": "RED",
      "White Office 2nd Fl": "W2F",
      "White Office 3rd Fl": "W3F",
      "Control Room": "CTL",
      "Dark Room": "DRK",
      HRD: "HRD",
      "IT Store": "ITS",
      "HSE Yard": "HSY",
      Maintenance: "MNT",
      "Multi Purposes Building": "MPB",
      Security: "SEC",
      Warehouse: "WH",
      "Welding School": "WLD",
      Workshop9: "WS9",
      Workshop10: "WS10",
      Workshop11: "WS11",
      Workshop12: "WS12",
      Lainlain: "OTH",
    },
    devices: {
      "PC Hardware": "HW",
      "PC Software": "SW",
      Laptop: "LP",
      Printer: "PR",
      Network: "NET",
      Projector: "PJ",
      "Backup Data": "DR",
      Others: "OT",
    },
  };

  const getCode = (value, map) =>
    map[value] || (value ? value.substring(0, 3).toUpperCase() : "GEN");

  const deptCode = getCode(ticket.department, codeMaps.departments);
  const locCode = getCode(ticket.location, codeMaps.locations);
  const deviceCode = getCode(ticket.device, codeMaps.devices);

  // Format date YYMM (4 digit)
  const dateCode = (() => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    return year + month;
  })();

  const randomCode = generateConsistentRandomCode(ticket);

  return `${deptCode}-${locCode}-${deviceCode}-${dateCode}-${randomCode}`;
}

function generateConsistentRandomCode(ticket) {
  const seed = (
    ticket.user_email +
    ticket.subject +
    ticket.department +
    ticket.location
  ).toLowerCase();

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash = hash & hash;
  }

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";

  for (let i = 0; i < 3; i++) {
    const index = Math.abs(hash + i * 123) % chars.length;
    result += chars.charAt(index);
  }

  return result;
}

// ==================== 🔹 Enhanced Form Submit Success Handler ====================
async function handleFormSubmitSuccess(response) {
  if (response.status === "success") {
    // 🔥 SIMPAN TICKET ID KE FIRESTORE
    const firebaseId = await saveTicketIdToFirestore(
      response.ticketId,
      formData
    );

    // Enhanced success message based on platform
    await showSuccessMessage(response.ticketId, firebaseId);
  } else {
    throw new Error(response.message || "Unknown error from Google Script");
  }
}

// ==================== 🔹 Enhanced Firestore Save ====================
async function saveTicketIdToFirestore(ticketId, formData) {
  try {
    const docRef = await addDoc(collection(db, "tickets"), {
      user_email: formData.user_email,
      inventory: formData.inventory,
      name: formData.name,
      user_phone: formData.user_phone,
      department: formData.department,
      location: formData.location,
      device: formData.device,
      priority: formData.priority,
      subject: formData.subject,
      message: formData.message,
      code: formData.code,
      status_ticket: "Open",
      ticketId: ticketId,
      user_agent: formData.user_agent,
      platform: formData.platform,
      createdAt: serverTimestamp(),
      updatedAt: null,
      qa: "",
      action_by: "",
      note: "",
    });

    console.log(
      "✅ Ticket saved with Firebase ID:",
      docRef.id,
      "Ticket ID:",
      ticketId
    );
    return docRef.id;
  } catch (error) {
    console.error("❌ Error saving ticket to Firestore:", error);
    throw error;
  }
}

// ==================== 🔹 Enhanced Success Message ====================
async function showSuccessMessage(ticketId, firebaseId) {
  const isMobile = platform.isMobile;

  await Swal.fire({
    icon: "success",
    title: "Ticket Submitted Successfully! 🎉",
    html: isMobile
      ? `Ticket ID: <strong>${ticketId}</strong><br><small>Our IT team will contact you soon.</small>`
      : `Your ticket has been created with ID:<br> <strong>${ticketId}</strong>. <br>Our IT team will contact you soon.`,
    showConfirmButton: true,
    confirmButtonText: "OK",
    confirmButtonColor: "#10b981",
    timer: isMobile ? 7000 : 5000, // Longer timer for mobile
    timerProgressBar: true,
    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
    // Larger tap targets for mobile
    customClass: {
      confirmButton: isMobile ? "swal2-confirm-mobile" : "",
    },
  });
}

// ==================== 🔹 Enhanced Alert System ====================
function showAlert(icon, title, text, timer = 3000) {
  const isMobile = platform.isMobile;

  return Swal.fire({
    icon: icon,
    title: title,
    text: text,
    timer: isMobile ? timer + 2000 : timer, // Longer display for mobile
    timerProgressBar: true,
    showConfirmButton: false,
    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
    // Mobile optimizations
    backdrop: isMobile,
    heightAuto: false,
    customClass: {
      container: isMobile ? "swal2-container-mobile" : "",
    },
  });
}

// ==================== 🔹 Enhanced DOM Initialization ====================
document.addEventListener("DOMContentLoaded", function () {
  // Wait for DOM to be fully ready
  setTimeout(() => {
    initEnhancedFormFeatures();
    setupMobileOptimizations();
  }, 100);
});

function initEnhancedFormFeatures() {
  // Enhanced real-time validation with mobile support
  const inputs = form.querySelectorAll("input, select, textarea");

  inputs.forEach((input) => {
    // Add touch-friendly classes for mobile
    if (platform.isMobile) {
      input.classList.add("touch-optimized");
    }

    input.addEventListener("blur", function () {
      validateField(this);
    });

    input.addEventListener("input", function () {
      clearFieldValidation(this);

      // Auto-save on input with debouncing
      clearTimeout(window.autoSaveTimeout);
      window.autoSaveTimeout = setTimeout(saveDraft, 1500);
    });

    // Enhanced focus styles for mobile
    if (platform.isMobile) {
      input.addEventListener("focus", function () {
        this.style.transform = "scale(1.02)";
      });

      input.addEventListener("blur", function () {
        this.style.transform = "scale(1)";
      });
    }
  });

  enhanceFormReset();
  loadDraft();
  setupCharacterCounter();
  setupPriorityIndicator();
  setupMobileViewport();
}

function validateField(field) {
  if (field.value.trim() !== "" && field.checkValidity()) {
    field.style.borderColor = "#10b981";
    field.style.backgroundColor = "#f0fdf4";
  } else if (field.required && !field.checkValidity()) {
    field.style.borderColor = "#dc2626";
    field.style.backgroundColor = "#fef2f2";
  } else {
    field.style.borderColor = "";
    field.style.backgroundColor = "";
  }
}

function clearFieldValidation(field) {
  if (field.value.trim() !== "") {
    field.style.borderColor = "var(--primary)";
    field.style.backgroundColor = "";
  }
}

// ==================== 🔹 Mobile-Specific Optimizations ====================
function setupMobileOptimizations() {
  if (!platform.isMobile) return;

  // Add mobile-specific styles
  const style = document.createElement("style");
  style.textContent = `
    .touch-optimized {
      min-height: 44px !important;
      font-size: 16px !important; /* Prevents zoom on iOS */
    }
    
    .swal2-confirm-mobile {
      min-height: 44px !important;
      min-width: 44px !important;
    }
    
    .swal2-container-mobile {
      padding: 10px !important;
    }
    
    .shake-animation {
      animation: shake 0.5s ease-in-out;
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
    
    /* Improve tap targets */
    select, button, input[type="submit"] {
      min-height: 44px;
    }
  `;
  document.head.appendChild(style);

  // Prevent zoom on focus (iOS specific)
  if (platform.isIOS) {
    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      input.addEventListener("focus", () => {
        document.body.style.zoom = "1";
      });
    });
  }
}

function setupMobileViewport() {
  if (platform.isMobile) {
    // Ensure viewport is properly set for mobile
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute(
        "content",
        "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
      );
    }
  }
}

// ==================== 🔹 Enhanced Form Reset ====================
function enhanceFormReset() {
  const resetBtn = form.querySelector('button[type="reset"]');
  if (resetBtn) {
    // Make reset button more touch-friendly on mobile
    if (platform.isMobile) {
      resetBtn.style.minHeight = "44px";
      resetBtn.style.padding = "12px 20px";
    }

    resetBtn.addEventListener("click", function () {
      resetValidationStyles();
      clearDraft();

      setTimeout(() => {
        showAlert("info", "Form Reset", "All fields have been cleared.", 1500);
      }, 100);
    });
  }
}

// ==================== 🔹 Enhanced Auto-save Draft Feature ====================
function setupAutoSave() {
  // Already implemented in initEnhancedFormFeatures
}

function saveDraft() {
  const formData = new FormData(form);
  const draft = {};

  for (let [key, value] of formData.entries()) {
    draft[key] = value;
  }

  try {
    localStorage.setItem("ticketDraft", JSON.stringify(draft));
    console.log("💾 Draft saved automatically");
  } catch (e) {
    console.warn("Could not save draft to localStorage:", e);
  }
}

function loadDraft() {
  try {
    const draft = localStorage.getItem("ticketDraft");
    if (draft) {
      const draftData = JSON.parse(draft);

      for (let key in draftData) {
        const element = form.querySelector(`[name="${key}"]`);
        if (element) {
          element.value = draftData[key];
          validateField(element);
        }
      }

      console.log("📝 Draft loaded");
    }
  } catch (e) {
    console.warn("Could not load draft from localStorage:", e);
  }
}

function clearDraft() {
  try {
    localStorage.removeItem("ticketDraft");
    console.log("🗑️ Draft cleared");
  } catch (e) {
    console.warn("Could not clear draft from localStorage:", e);
  }
}

// ==================== 🔹 Enhanced Character Counter ====================
function setupCharacterCounter() {
  const messageTextarea = document.getElementById("message");
  if (messageTextarea) {
    const counter = document.createElement("div");
    counter.style.fontSize = platform.isMobile ? "14px" : "12px";
    counter.style.color = "#6c757d";
    counter.style.textAlign = "right";
    counter.style.marginTop = "8px";
    counter.style.padding = "4px";
    counter.textContent = "0/1000 characters";

    messageTextarea.parentNode.appendChild(counter);

    messageTextarea.addEventListener("input", function () {
      const length = this.value.length;
      counter.textContent = `${length}/1000 characters`;

      if (length > 1000) {
        counter.style.color = "#dc3545";
        counter.style.fontWeight = "bold";
      } else if (length > 800) {
        counter.style.color = "#ffc107";
        counter.style.fontWeight = "bold";
      } else {
        counter.style.color = "#6c757d";
        counter.style.fontWeight = "normal";
      }
    });

    messageTextarea.dispatchEvent(new Event("input"));
  }
}

// ==================== 🔹 Enhanced Priority Level Indicator ====================
function setupPriorityIndicator() {
  const prioritySelect = document.getElementById("priority");
  if (prioritySelect) {
    const indicator = document.createElement("div");
    indicator.style.fontSize = platform.isMobile ? "14px" : "12px";
    indicator.style.marginTop = "8px";
    indicator.style.padding = "8px 12px";
    indicator.style.borderRadius = "6px";
    indicator.style.display = "inline-block";
    indicator.style.fontWeight = "500";

    prioritySelect.parentNode.appendChild(indicator);

    function updateIndicator() {
      const priority = prioritySelect.value;
      let text = "";
      let color = "";

      switch (priority) {
        case "High":
          text = platform.isMobile
            ? "🚨 Urgent - 1 hour"
            : "🚨 Urgent - Response within 1 hour";
          color = "#dc3545";
          break;
        case "Medium":
          text = platform.isMobile
            ? "⚠️ Important - 4 hours"
            : "⚠️ Important - Response within 4 hours";
          color = "#ffc107";
          break;
        case "Low":
          text = platform.isMobile
            ? "💤 Normal - 24 hours"
            : "💤 Normal - Response within 24 hours";
          color = "#28a745";
          break;
        default:
          text = "";
          color = "transparent";
      }

      indicator.textContent = text;
      indicator.style.backgroundColor = color + "20";
      indicator.style.color = color;
      indicator.style.border = `1px solid ${color}40`;
    }

    prioritySelect.addEventListener("change", updateIndicator);
    prioritySelect.dispatchEvent(new Event("change"));
  }
}

// ==================== 🔹 Network Status Monitoring ====================
function setupNetworkMonitoring() {
  if ("connection" in navigator) {
    navigator.connection.addEventListener("change", function () {
      const isOnline = navigator.onLine;
      const connection = navigator.connection;

      if (
        !isOnline ||
        (connection &&
          (connection.saveData || connection.effectiveType === "slow-2g"))
      ) {
        showAlert(
          "warning",
          "Network Warning",
          "Your connection seems slow. Form may take longer to submit."
        );
      }
    });
  }

  window.addEventListener("online", function () {
    showAlert(
      "success",
      "Back Online",
      "Your connection has been restored.",
      2000
    );
  });

  window.addEventListener("offline", function () {
    showAlert(
      "error",
      "Offline",
      "You are currently offline. Form submission will fail.",
      5000
    );
  });
}

// ==================== 🔹 System Initialization ====================
console.log("✅ IT Ticketing System Loaded");
console.log("📧 Email system integrated with Google Apps Script");
console.log("🔥 Firebase Firestore connected");
console.log(
  "📱 Platform:",
  platform.isMobile ? (platform.isIOS ? "iOS" : "Android") : "Desktop"
);

// Initialize network monitoring
setupNetworkMonitoring();
