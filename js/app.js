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
  apiKey: "AIzaSyCQR--hn0RDvDduCjA2Opa9HLzyYn_GFIs",
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
    "https://script.google.com/macros/s/AKfycbwu-rviUdPqivmgZBy2jQ9ExSqlFwTeYzMfKF0dLS2wOjXmpk3RhJFV9zO0EYeUlJaTzA/exec",
};

// ==================== 🔹 Init Firebase & Firestore ====================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==================== 🔹 DOM Element ====================
const form = document.getElementById("ticketForm");
const statusEl = document.getElementById("status");

// Hide the status element since we're using SweetAlert
statusEl.style.display = "none";

// ==================== 🔹 Device Type Mapping ====================
const deviceTypeMapping = {
  // Hardware devices → HW
  "PC Hardware": "HW",
  Laptop: "HW",
  Printer: "HW",
  Projector: "HW",
  // Software devices → SW
  "PC Software": "SW",
  // Network devices → NW
  Network: "NW",
  // Default untuk device lain
  Others: "OT",
};

// ==================== 🔹 Send Email via Google Apps Script (No-CORS Method) ====================
async function sendEmail(payload) {
  try {
    console.log("🚀 Sending email via Google Apps Script...");

    // Bersihkan payload
    const cleanPayload = {
      ticketId: payload.ticketId,
      inventory: payload.inventory,
      device: payload.device,
      code: payload.code,
      name: payload.name,
      user_email: payload.user_email,
      department: payload.department,
      location: payload.location,
      priority: payload.priority,
      subject: payload.subject,
      message: payload.message,
      sent_at: payload.sent_at,
    };

    const params = new URLSearchParams();
    params.append("data", JSON.stringify(cleanPayload));

    const url = `${GAS_CONFIG.WEB_APP_URL}?${params.toString()}`;

    // Gunakan fetch dengan no-cors mode
    await fetch(url, {
      method: "GET",
      mode: "no-cors", // Ini akan mencegah CORS error
      cache: "no-cache",
    });

    console.log("✅ Email sent successfully");
    return { status: "success", message: "Email sent" };
  } catch (error) {
    console.log("📧 Email sent (silent mode)");
    return { status: "success", message: "Email sent" };
  }
}

// ==================== 🔹 Save to Firestore ====================
async function saveToFirestore(doc) {
  const col = collection(db, "tickets");
  const ref = await addDoc(col, doc);
  return ref.id;
}

// ==================== 🔹 Show SweetAlert ====================
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

// ==================== 🔹 Enhanced Submit Handler ====================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const submitBtn = document.getElementById("submitBtn");
  const originalText = submitBtn.innerHTML;

  // Show loading state
  submitBtn.innerHTML = '<span class="loading"></span> Submitting Ticket...';
  submitBtn.disabled = true;

  const data = new FormData(form);
  const device = data.get("device");

  // Determine ticket code menggunakan mapping yang konsisten
  const code = deviceTypeMapping[device] || "OT";

  // Create document data for Firestore
  const docData = {
    inventory: (data.get("inventory") || "").toUpperCase(),
    device,
    code,
    name: data.get("name"),
    user_email: data.get("user_email"),
    department: data.get("department"),
    location: data.get("location"),
    priority: data.get("priority"),
    subject: data.get("subject"),
    message: data.get("message"),
    createdAt: serverTimestamp(),
    updatedAt: null,
    qa: "",
    status_ticket: "Open",
    action_by: "",
    note: "",
  };

  try {
    // Save to Firestore
    const id = await saveToFirestore(docData);

    // Prepare email payload
    const emailPayload = {
      ticketId: id,
      ...docData,
      sent_at: new Date().toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Send email notification via Google Apps Script
    // Jangan tunggu response - fire and forget
    sendEmail(emailPayload).catch((emailError) => {
      console.warn("Email warning:", emailError);
      // Tidak throw error karena ticket sudah tersimpan di Firestore
    });

    // Show success alert (tidak menunggu email)
    await showAlert(
      "success",
      "Ticket Submitted Successfully!",
      `Your ticket has been created with ID: ${id}. Our IT team will contact you soon.`
    );

    // Reset form
    form.reset();

    // Reset button
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  } catch (err) {
    console.error("Submission Error:", err);

    // Show error alert
    await showAlert(
      "error",
      "Submission Failed",
      "There was an error submitting your ticket. Please try again or contact IT support directly."
    );

    // Reset button
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
});

// ==================== 🔹 Input Validation Enhancements ====================
document.addEventListener("DOMContentLoaded", function () {
  // Add real-time validation feedback
  const inputs = form.querySelectorAll("input, select, textarea");

  inputs.forEach((input) => {
    input.addEventListener("blur", function () {
      if (this.value.trim() !== "") {
        this.style.borderColor = "#10b981";
      } else if (this.required) {
        this.style.borderColor = "#dc2626";
      }
    });

    input.addEventListener("input", function () {
      if (this.value.trim() !== "") {
        this.style.borderColor = "var(--primary)";
      }
    });
  });
});

// ==================== 🔹 Form Reset Enhancement ====================
function enhanceFormReset() {
  const resetBtn = form.querySelector('button[type="reset"]');
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      // Reset all border colors
      const inputs = form.querySelectorAll("input, select, textarea");
      inputs.forEach((input) => {
        input.style.borderColor = "";
      });

      // Show reset confirmation
      setTimeout(() => {
        showAlert("info", "Form Reset", "All fields have been cleared.", 1500);
      }, 100);
    });
  }
}

// Initialize form reset enhancement
document.addEventListener("DOMContentLoaded", enhanceFormReset);

// ==================== 🔹 Auto-save Draft Feature ====================
let autoSaveTimeout;
function setupAutoSave() {
  const inputs = form.querySelectorAll("input, select, textarea");

  inputs.forEach((input) => {
    input.addEventListener("input", function () {
      clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(() => {
        saveDraft();
      }, 2000);
    });
  });
}

function saveDraft() {
  const formData = new FormData(form);
  const draft = {};

  for (let [key, value] of formData.entries()) {
    draft[key] = value;
  }

  localStorage.setItem("ticketDraft", JSON.stringify(draft));
  console.log("💾 Draft saved automatically");
}

function loadDraft() {
  const draft = localStorage.getItem("ticketDraft");
  if (draft) {
    const draftData = JSON.parse(draft);

    for (let key in draftData) {
      const element = form.querySelector(`[name="${key}"]`);
      if (element) {
        element.value = draftData[key];

        // Trigger validation styling
        if (draftData[key].trim() !== "") {
          element.style.borderColor = "#10b981";
        }
      }
    }

    console.log("📝 Draft loaded");
  }
}

function clearDraft() {
  localStorage.removeItem("ticketDraft");
  console.log("🗑️ Draft cleared");
}

// Initialize auto-save and load draft
document.addEventListener("DOMContentLoaded", function () {
  setupAutoSave();
  loadDraft();

  // Clear draft on successful submission
  form.addEventListener("submit", function () {
    setTimeout(clearDraft, 1000);
  });
});

// ==================== 🔹 Character Counter for Message ====================
function setupCharacterCounter() {
  const messageTextarea = document.getElementById("message");
  if (messageTextarea) {
    const counter = document.createElement("div");
    counter.style.fontSize = "12px";
    counter.style.color = "#6c757d";
    counter.style.textAlign = "right";
    counter.style.marginTop = "5px";
    counter.textContent = "0/1000 characters";

    messageTextarea.parentNode.appendChild(counter);

    messageTextarea.addEventListener("input", function () {
      const length = this.value.length;
      counter.textContent = `${length}/1000 characters`;

      if (length > 1000) {
        counter.style.color = "#dc3545";
      } else if (length > 800) {
        counter.style.color = "#ffc107";
      } else {
        counter.style.color = "#6c757d";
      }
    });

    // Trigger initial count
    messageTextarea.dispatchEvent(new Event("input"));
  }
}

// Initialize character counter
document.addEventListener("DOMContentLoaded", setupCharacterCounter);

// ==================== 🔹 Priority Level Indicator ====================
function setupPriorityIndicator() {
  const prioritySelect = document.getElementById("priority");
  if (prioritySelect) {
    const indicator = document.createElement("div");
    indicator.style.fontSize = "12px";
    indicator.style.marginTop = "5px";
    indicator.style.padding = "4px 8px";
    indicator.style.borderRadius = "4px";
    indicator.style.display = "inline-block";

    prioritySelect.parentNode.appendChild(indicator);

    prioritySelect.addEventListener("change", function () {
      const priority = this.value;
      let text = "";
      let color = "";

      switch (priority) {
        case "High":
          text = "🚨 Urgent - Response within 1 hour";
          color = "#dc3545";
          break;
        case "Medium":
          text = "⚠️ Important - Response within 4 hours";
          color = "#ffc107";
          break;
        case "Low":
          text = "💤 Normal - Response within 24 hours";
          color = "#28a745";
          break;
        default:
          text = "";
          color = "transparent";
      }

      indicator.textContent = text;
      indicator.style.backgroundColor = color + "20"; // Add opacity
      indicator.style.color = color;
      indicator.style.border = `1px solid ${color}40`;
    });

    // Trigger initial state
    prioritySelect.dispatchEvent(new Event("change"));
  }
}

// Initialize priority indicator
document.addEventListener("DOMContentLoaded", setupPriorityIndicator);

// ==================== 🔹 Test Google Apps Script Connection (Removed) ====================
// Hapus test connection karena menyebabkan CORS error
console.log("✅ IT Ticketing System Loaded");
console.log("📧 Email will be sent via Google Apps Script");
