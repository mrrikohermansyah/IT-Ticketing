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

// ==================== 🔹 EmailJS Config ====================
const EMAILJS_PUBLIC_KEY = "5Sl1dmt0fEZe1Wg38";
const EMAILJS_SERVICE_ID = "service_gf26aop";
const EMAILJS_TEMPLATE_ID = "template_nsi9k3e";
const STATIC_RECIPIENT_EMAIL = "mr.rikohermansyah@gmail.com";

// ==================== 🔹 Init Firebase & Firestore ====================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==================== 🔹 Init EmailJS ====================
emailjs.init(EMAILJS_PUBLIC_KEY);

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

// ==================== 🔹 Send Email ====================
async function sendEmail(payload) {
  try {
    const res = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      payload
    );
    console.log("✅ Email sent:", res.status);
    return res;
  } catch (err) {
    console.error("❌ Email failed:", err);
    throw new Error("Failed to send email.");
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

    // Determine priority color for EmailJS
    const priorityColor =
      {
        High: "#dc3545",
        Medium: "#ffc107",
        Low: "#28a745",
      }[docData.priority] || "#007bff";

    // Send email notification
    await sendEmail({
      ticketId: id,
      ...docData,
      priority_color: priorityColor,
      sent_at: new Date().toLocaleString("en-US"),
      recipient: STATIC_RECIPIENT_EMAIL,
    });

    // Show success alert
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
    console.error(err);

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
