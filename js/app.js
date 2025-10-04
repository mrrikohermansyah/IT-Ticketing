// ==================== app.js (Halaman User - Modular v9) ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ---------------------------------------------------------------
// 🔹 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCQR--hn0RDvDduCjA2Opa9HLzyYn_GFIs",
  authDomain: "itticketing-f926e.firebaseapp.com",
  projectId: "itticketing-f926e",
  storageBucket: "itticketing-f926e.firebasestorage.app",
  messagingSenderId: "896370077103",
  appId: "1:896370077103:web:1d692e88b611bff838935a",
  measurementId: "G-TJCHPXG7D5",
};

// ---------------------------------------------------------------
// 🔹 Constants EmailJS
const EMAILJS_PUBLIC_KEY = "5Sl1dmt0fEZe1Wg38";
const EMAILJS_SERVICE_ID = "service_gf26aop";
const EMAILJS_TEMPLATE_ID = "template_nsi9k3e";
const STATIC_RECIPIENT_EMAIL = "mr.rikohermansyah@gmail.com";

// ---------------------------------------------------------------
// Init Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------------------------------------------------------
// Init EmailJS
if (window.emailjs) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
} else {
  console.warn(
    "⚠️ EmailJS SDK tidak tersedia. Pastikan script EmailJS ada di index.html"
  );
}

// ---------------------------------------------------------------
// DOM Elements
const form = document.getElementById("ticketForm");
const statusEl = document.getElementById("status");
console.log("statusEl:", statusEl);

// ---------------------------------------------------------------
// Fungsi kirim email via EmailJS
async function sendEmail(payload) {
  try {
    return await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, payload);
  } catch (err) {
    throw err;
  }
}

// ---------------------------------------------------------------
// Simpan ke Firestore
async function saveToFirestore(doc) {
  try {
    const col = collection(db, "tickets");
    const docRef = await addDoc(col, doc);
    return docRef.id;
  } catch (err) {
    throw err;
  }
}

// ---------------------------------------------------------------
// Form Submit Handler
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (statusEl) statusEl.textContent = "Mengirim tiket...";

  const data = new FormData(form);

  // --- Ambil device dan tentukan code otomatis ---
  const device = data.get("device");
  console.log("Device yang dipilih:", device);

  let code = "OT"; // default
  if (["PC", "Laptop", "Printer", "Projector"].includes(device)) {
    code = "HW";
  } else if (device === "Jaringan") {
    code = "NW";
  } else if (["MSOffice", "Software"].includes(device)) {
    code = "SW";
  } else if (device === "Lainlain") {
    code = "OT";
  }
  console.log("Kode otomatis:", code);

  const docData = {
    inventory: (data.get("inventory") || "").toUpperCase(),
    device, // 🔹 simpan jenis perangkat
    code, // 🔹 hasil mapping otomatis
    name: data.get("name"),
    user_email: data.get("user_email"),
    department: data.get("department"),
    location: data.get("location"),
    priority: data.get("priority"),
    subject: data.get("subject"),
    message: data.get("message"), // 🔹 jangan ditiban sama device lagi
    sent_at: serverTimestamp(),
    createdAt: serverTimestamp(), // 🔹 waktu tiket dibuat
    updatedAt: null, // 🔹 nanti diubah saat IT update status
    qa: "",
    status_ticket: "Open",
    action_by: "",
    note: "",
  };

  try {
    const id = await saveToFirestore(docData);

    const payload = {
      ...docData,
      ticketId: id,
      sent_at: new Date().toLocaleString("id-ID"),
      recipient: STATIC_RECIPIENT_EMAIL,
    };

    await sendEmail(payload);

    if (statusEl) statusEl.textContent = "✅ Tiket berhasil dikirim!";
    form.reset();
  } catch (err) {
    console.error(err);
    if (statusEl) {
      statusEl.textContent = "❌ Terjadi kesalahan: " + (err.message || err);
    } else {
      alert("❌ Terjadi kesalahan: " + (err.message || err));
    }
  }
});
