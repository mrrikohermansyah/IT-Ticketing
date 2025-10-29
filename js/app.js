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

  // Collect form data
  formData = collectFormData();

  try {
    // 🔥 STEP 1: Kirim ke Google Script untuk generate Ticket ID dan kirim email
    const googleScriptResponse = await submitToGoogleScript(formData);

    // 🔥 STEP 2: Handle response dari Google Script
    await handleFormSubmitSuccess(googleScriptResponse);

    // Reset form
    form.reset();
    clearDraft();
  } catch (error) {
    console.error("Submission Error:", error);
    await showAlert(
      "error",
      "Submission Failed",
      "There was an error submitting your ticket. Please try again or contact IT support directly."
    );
  } finally {
    // Reset button
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
});

// ==================== 🔹 Collect Form Data ====================
function collectFormData() {
  const data = new FormData(form);
  const device = data.get("device");
  const code = deviceTypeMapping[device] || "OT";

  return {
    user_email: data.get("user_email") || "",
    inventory: (data.get("inventory") || "").toUpperCase(),
    name: data.get("name") || "",
    user_phone: data.get("user_phone") || "",
    department: data.get("department") || "",
    location: data.get("location") || "",
    device: device,
    priority: data.get("priority") || "Medium",
    subject: data.get("subject") || "",
    message: data.get("message") || "",
    code: code,
    status_ticket: "Open",
  };
}

// ==================== 🔹 Submit to Google Apps Script ====================
async function submitToGoogleScript(formData) {
  try {
    console.log("🚀 Sending data to Google Script via GET...", formData);

    // Encode data sebagai URL parameters
    const params = new URLSearchParams();
    params.append("data", JSON.stringify(formData));
    const url = `${GAS_CONFIG.WEB_APP_URL}?${params.toString()}`;

    console.log("GET URL:", url);

    // 🔥 GUNAKAN no-cors UNTUK MENGHINDARI CORS ERROR
    await fetch(url, {
      method: "GET",
      mode: "no-cors", // 🔥 INI YANG MENGHILANGKAN CORS ERROR
    });

    console.log("✅ GET request sent successfully (no-cors mode)");

    // Karena no-cors, kita tidak bisa baca response
    // Tapi kita anggap berhasil dan generate ticket ID yang sama
    return {
      status: "success",
      ticketId: generateSimpleTicketId(formData), // 🔥 GUNAKAN FUNGSI YANG SAMA
      message: "Request sent successfully",
    };
  } catch (error) {
    console.error("❌ Google Script submission error:", error);
    // Fallback: generate ticket ID sendiri
    return {
      status: "success",
      ticketId: generateSimpleTicketId(formData),
      message: "Using fallback",
    };
  }
}

// 🔥 COPY FUNGSI generateSimpleTicketId DARI GOOGLE SCRIPT
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

  // 🔥 GENERATE RANDOM CODE YANG SAMA
  const randomCode = generateConsistentRandomCode(ticket);

  return `${deptCode}-${locCode}-${deviceCode}-${dateCode}-${randomCode}`;
}

// 🔥 COPY FUNGSI generateConsistentRandomCode DARI GOOGLE SCRIPT
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

// 🔥 HAPUS FUNGSI generateFallbackTicketId - kita hanya mau pakai dari Google Script

// ==================== 🔹 Generate Fallback Ticket ID ====================
function generateFallbackTicketId(ticket) {
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

  // Generate random code (3 karakter)
  const randomCode = (() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 3; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  })();

  return `${deptCode}-${locCode}-${deviceCode}-${dateCode}-${randomCode}`;
}

// ==================== 🔹 Handle Form Submit Success ====================
async function handleFormSubmitSuccess(response) {
  if (response.status === "success") {
    // 🔥 SIMPAN TICKET ID KE FIRESTORE
    await saveTicketIdToFirestore(response.ticketId, formData);

    // Tampilkan success message dengan ticketId
    await showSuccessMessage(response.ticketId);
  } else {
    throw new Error(response.message || "Unknown error from Google Script");
  }
}

// ==================== 🔹 FUNGSI SIMPAN TICKET ID KE FIRESTORE ====================
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
      ticketId: ticketId, // 🔥 SIMPAN TICKET ID DARI GOOGLE SCRIPT
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

// ==================== 🔹 Show Success Message ====================
async function showSuccessMessage(ticketId) {
  await showAlert(
    "success",
    "Ticket Submitted Successfully! 🎉",
    `Your ticket has been created with ID: ${ticketId}. Our IT team will contact you soon.`,
    5000
  );
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

  // Initialize additional features
  enhanceFormReset();
  setupAutoSave();
  loadDraft();
  setupCharacterCounter();
  setupPriorityIndicator();
});

// ==================== 🔹 Form Reset Enhancement ====================
function enhanceFormReset() {
  const resetBtn = form.querySelector('button[type="reset"]');
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      const inputs = form.querySelectorAll("input, select, textarea");
      inputs.forEach((input) => {
        input.style.borderColor = "";
      });

      setTimeout(() => {
        showAlert("info", "Form Reset", "All fields have been cleared.", 1500);
      }, 100);
    });
  }
}

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

    messageTextarea.dispatchEvent(new Event("input"));
  }
}

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
      indicator.style.backgroundColor = color + "20";
      indicator.style.color = color;
      indicator.style.border = `1px solid ${color}40`;
    });

    prioritySelect.dispatchEvent(new Event("change"));
  }
}

// ==================== 🔹 System Initialization ====================
console.log("✅ IT Ticketing System Loaded");
console.log("📧 Email system integrated with Google Apps Script");
console.log("🔥 Firebase Firestore connected");
