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

// ==================== 🔹 Kirim Email ====================
async function sendEmail(payload) {
  try {
    const res = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      payload
    );
    console.log("✅ Email terkirim:", res.status);
    return res;
  } catch (err) {
    console.error("❌ Email gagal:", err);
    throw new Error("Gagal mengirim email.");
  }
}

// ==================== 🔹 Simpan ke Firestore ====================
async function saveToFirestore(doc) {
  const col = collection(db, "tickets");
  const ref = await addDoc(col, doc);
  return ref.id;
}

// ==================== 🔹 Submit Handler ====================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!form.checkValidity()) return form.reportValidity();

  statusEl.textContent = "Mengirim tiket...";

  const data = new FormData(form);
  const device = data.get("device");

  // Tentukan kode tiket
  let code = "OT";
  if (["PC", "Laptop", "Printer", "Projector"].includes(device)) code = "HW";
  else if (device === "Jaringan") code = "NW";
  else if (["MSOffice", "Software"].includes(device)) code = "SW";

  // Buat data dokumen untuk Firestore
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
    // Simpan ke Firestore
    const id = await saveToFirestore(docData);

    // Tentukan warna prioritas untuk EmailJS
    const priorityColor =
      {
        High: "#dc3545", // merah
        Medium: "#ffc107", // kuning
        Low: "#28a745", // hijau
      }[docData.priority] || "#007bff"; // default biru

    // Kirim email notifikasi
    await sendEmail({
      ticketId: id,
      ...docData,
      priority_color: priorityColor, // 🔹 tambahan penting
      sent_at: new Date().toLocaleString("id-ID"),
      recipient: STATIC_RECIPIENT_EMAIL,
    });

    statusEl.textContent = "✅ Tiket berhasil dikirim!";
    form.reset();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "❌ Terjadi kesalahan: " + err.message;
  }
});
