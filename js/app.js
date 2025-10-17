// =========================================================
// 🔹 Import Firebase SDK
// =========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// =========================================================
// 🔹 Firebase Configuration
// =========================================================
const firebaseConfig = {
  apiKey: "AIzaSyCQR--hn0RDvDduCjA2Opa9HLzyYn_GFIs",
  authDomain: "itticketing-f926e.firebaseapp.com",
  projectId: "itticketing-f926e",
  storageBucket: "itticketing-f926e.firebasestorage.app",
  messagingSenderId: "896370077103",
  appId: "1:896370077103:web:1d692e88b611bff838935a",
  measurementId: "G-TJCHPXG7D5",
};

// =========================================================
// 🔹 EmailJS Configuration
// =========================================================
const EMAILJS_PUBLIC_KEY = "5Sl1dmt0fEZe1Wg38";
const EMAILJS_SERVICE_ID = "service_gf26aop";
const EMAILJS_TEMPLATE_ID = "template_nsi9k3e";
const STATIC_RECIPIENT_EMAIL = "mr.rikohermansyah@gmail.com";

// =========================================================
// 🔹 Initialize Firebase & EmailJS
// =========================================================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
emailjs.init(EMAILJS_PUBLIC_KEY);

// =========================================================
// 🔹 DOM Elements
// =========================================================
const form = document.getElementById("ticketForm");
const statusEl = document.getElementById("status");

// =========================================================
// 🔹 Redirect to Admin Page
// =========================================================
document.getElementById("adminBtn").addEventListener("click", () => {
  window.location.href = "admin/index.html";
});

// =========================================================
// 🔹 Tooltip (support mobile + desktop)
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
  const tooltip = document.createElement("div");
  tooltip.className = "custom-tooltip";
  document.body.appendChild(tooltip);

  const showTooltip = (text, x, y) => {
    tooltip.textContent = text;
    tooltip.style.opacity = 1;
    tooltip.style.transform = "translateY(0)";
    tooltip.style.top = y + 15 + "px";
    tooltip.style.left = x + 15 + "px";
  };

  const hideTooltip = () => {
    tooltip.style.opacity = 0;
    tooltip.style.transform = "translateY(5px)";
  };

  document.querySelectorAll("[data-tip]").forEach((el) => {
    // Desktop (hover / mousemove)
    el.addEventListener("mousemove", (e) => {
      showTooltip(el.dataset.tip, e.pageX, e.pageY);
    });
    el.addEventListener("mouseleave", hideTooltip);

    // Mobile (tap & hold)
    el.addEventListener("touchstart", (e) => {
      const touch = e.touches[0];
      showTooltip(el.dataset.tip, touch.pageX, touch.pageY);
    });
    el.addEventListener("touchend", hideTooltip);
  });
});

// =========================================================
// 🔹 Universal handler for "Etc." (Lainlain) dropdowns — iOS truly stable
// =========================================================
window.addEventListener("DOMContentLoaded", () => {
  const selects = ["device", "location", "department"];

  selects.forEach((id) => {
    const selectEl = document.getElementById(id);
    if (!selectEl) return;
    const parent = selectEl.parentElement;

    const switchToInput = () => {
      // tunggu dropdown benar-benar tertutup
      setTimeout(() => {
        const input = document.createElement("input");
        input.type = "text";
        input.name = id;
        input.id = id;
        input.required = true;
        input.placeholder = `Please specify other ${id}`;
        input.classList.add("fade-in-input");
        input.style.width = "100%";
        input.style.padding = "8px";
        input.style.borderRadius = "6px";
        input.style.border = "1px solid #ccc";
        input.style.marginTop = "5px";

        selectEl.replaceWith(input);

        // jangan langsung fokus → tunggu user tap manual
        // tambahkan pesan halus agar jelas
        input.placeholder = "...";

        // blur listener dengan sedikit delay agar tidak langsung balik
        setTimeout(() => {
          input.addEventListener("blur", () => {
            if (!input.value.trim()) {
              input.replaceWith(selectEl);
              selectEl.value = "";
              attachListener();
            }
          });
        }, 500); // beri waktu agar iOS tidak auto blur
      }, 0); // tunggu dropdown close total
    };

    const attachListener = () => {
      selectEl.addEventListener("change", (e) => {
        const val = e.target.value.toLowerCase();
        if (val === "lainlain" || val === "etc" || val === "etc.") {
          switchToInput();
        }
      });
    };

    attachListener();
  });
});


// =========================================================
// 🔹 Show custom input when "Etc." is selected
// =========================================================
const deviceSelect = document.getElementById("device");
const otherDeviceInput = document.getElementById("otherDevice");

if (deviceSelect && otherDeviceInput) {
  deviceSelect.addEventListener("change", () => {
    if (deviceSelect.value === "Lainlain") {
      otherDeviceInput.style.display = "block";
      otherDeviceInput.required = true;
    } else {
      otherDeviceInput.style.display = "none";
      otherDeviceInput.required = false;
      otherDeviceInput.value = "";
    }
  });
}

// =========================================================
// 🔹 Send Email via EmailJS
// =========================================================
async function sendEmail(payload) {
  try {
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      payload
    );
    console.log("✅ Email sent successfully:", response.status);
    return response;
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw new Error("Failed to send email notification.");
  }
}

// =========================================================
// 🔹 Save Ticket to Firestore
// =========================================================
async function saveToFirestore(doc) {
  const colRef = collection(db, "tickets");
  const docRef = await addDoc(colRef, doc);
  return docRef.id;
}

// =========================================================
// 🔹 Form Submit Handler
// =========================================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  statusEl.textContent = "Submitting ticket...";
  setTimeout(() => {
    statusEl.textContent = "";
  }, 2000);

  const data = new FormData(form);
  const device = data.get("device");

  // Jika user pilih "Lainlain", ambil nilai dari input tambahan
  let finalDevice = device;
  if (device === "Lainlain") {
    finalDevice = data.get("otherDevice") || "Unspecified Device";
  }

  // Tentukan kode tiket
  let code = "OT";
  if (["PC", "Laptop", "Printer", "Projector"].includes(finalDevice))
    code = "HW";
  else if (finalDevice === "Jaringan") code = "NW";
  else if (["MSOffice", "Software"].includes(finalDevice)) code = "SW";

  // Data dokumen untuk Firestore
  const docData = {
    inventory: (data.get("inventory") || "").toUpperCase(),
    device: finalDevice,
    code,
    name: data.get("name"),
    user_email: data.get("user_email"),
    user_phone: data.get("user_phone"),
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
    const ticketId = await saveToFirestore(docData);

    // Warna berdasarkan prioritas
    const priorityColor =
      {
        High: "#dc3545",
        Medium: "#ffc107",
        Low: "#28a745",
      }[docData.priority] || "#007bff";

    // Kirim email notifikasi
    await sendEmail({
      ticketId,
      ...docData,
      priority_color: priorityColor,
      sent_at: new Date().toLocaleString("en-US"),
      recipient: STATIC_RECIPIENT_EMAIL,
    });

    // ✅ Popup sukses
    await Swal.fire({
      icon: "success",
      title: "Ticket Submitted!",
      html: `<p>Thank you! The IT team will review your ticket shortly.</p>`,
      confirmButtonText: "OK",
      confirmButtonColor: "#2563eb",
      timer: 3000,
      timerProgressBar: true,
      allowOutsideClick: false,
    });

    form.reset();
    const otherDeviceInput = document.getElementById("otherDevice");
    if (otherDeviceInput) otherDeviceInput.style.display = "none";
  } catch (error) {
    console.error(error);

    // ❌ Popup error
    await Swal.fire({
      icon: "error",
      title: "Submission Failed",
      text: error.message || "Something went wrong. Please try again.",
      confirmButtonText: "OK",
      confirmButtonColor: "#dc3545",
      timer: 4000,
      timerProgressBar: true,
      allowOutsideClick: false,
    });

    statusEl.textContent = `❌ Error: ${error.message}`;
  }
});


