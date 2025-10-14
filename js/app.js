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

// ==================== 🔹 Initialize Firebase & Firestore ====================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==================== 🔹 Initialize EmailJS ====================
emailjs.init(EMAILJS_PUBLIC_KEY);

// ==================== 🔹 DOM Elements ====================
const form = document.getElementById("ticketForm");
const statusEl = document.getElementById("status");

// ==================== 🔹 Redirect to Admin Page ====================
document.getElementById("adminBtn").addEventListener("click", () => {
  window.location.href = "admin/index.html";
});

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

// ==================== 🔹 Submit Handler ====================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.checkValidity()) return form.reportValidity();

  statusEl.textContent = "Submitting ticket...";

  const data = new FormData(form);
  const device = data.get("device");

  // Determine ticket code
  let code = "OT";
  if (["PC", "Laptop", "Printer", "Projector"].includes(device)) code = "HW";
  else if (device === "Jaringan") code = "NW";
  else if (["MSOffice", "Software"].includes(device)) code = "SW";

  // Prepare document data
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

    // Priority color mapping
    const priorityColor =
      {
        High: "#dc3545", // red
        Medium: "#ffc107", // yellow
        Low: "#28a745", // green
      }[docData.priority] || "#007bff"; // blue default

    // Send email notification
    await sendEmail({
      ticketId: id,
      ...docData,
      priority_color: priorityColor,
      sent_at: new Date().toLocaleString("en-US"),
      recipient: STATIC_RECIPIENT_EMAIL,
    });

    // ✅ Auto-close success popup
    await Swal.fire({
      icon: "success",
      title: "Ticket Submitted!",
      confirmButtonText: "OK",
      confirmButtonColor: "#2563eb", // warna biru agar senada
      html: `
        <!--<p><b>Ticket ID:</b> ${id}</p>-->
        <p>Thank you! The IT team will review your ticket shortly.</p>
      `,
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
    });

    statusEl.textContent = "✅ Ticket successfully submitted!";
    form.reset();
  } catch (err) {
    console.error(err);

    // ❌ Auto-close error popup
    await Swal.fire({
      icon: "error",
      title: "Submission Failed",
      text: err.message || "Something went wrong. Please try again.",
      timer: 4000,
      timerProgressBar: true,
      showConfirmButton: false,
    });

    statusEl.textContent = "❌ Error: " + err.message;
  }
});

