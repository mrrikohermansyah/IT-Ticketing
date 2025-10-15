// ======================================================
// 🔹 js/admin.js — Row Editing with Save & Cancel
// ======================================================

// ==================== 🔹 Firebase Imports ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  updateDoc,
  deleteDoc,
  getDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// ==================== 🔹 Firebase Config ====================
const firebaseConfig = {
  apiKey: "AIzaSyCQR--hn0RDvDduCjA2Opa9HLzyYn_GFIs",
  authDomain: "itticketing-f926e.firebaseapp.com",
  projectId: "itticketing-f926e",
  storageBucket: "itticketing-f926e.appspot.com",
  messagingSenderId: "896370077103",
  appId: "1:896370077103:web:1d692e88b611bff838935a",
  measurementId: "G-TJCHPXG7D5",
};

// ==================== 🔹 Initialize Firebase ====================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ==================== 🔹 DOM Elements ====================
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const ticketsBody = document.getElementById("ticketsBody");
const filterSelect = document.getElementById("filterActionBy");
const goLoginBtn = document.getElementById("goLoginBtn");
const userInfo = document.getElementById("userInfo");

// ==================== 🔹 Constants ====================
const IT_NAMES = [
  "Riko Hermansyah",
  "Abdurahman Hakim",
  "Moch Wahyu Nugroho",
  "Ade Reinalwi",
];

let allTickets = [];
let isLoggingOut = false;

// ======================================================
// 🔹 LOGIN / LOGOUT HANDLING
// ======================================================
if (goLoginBtn) {
  goLoginBtn.addEventListener("click", () => {
    window.location.href = "../login/index.html";
  });
}

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, provider);
      Swal.fire({
        icon: "success",
        title: "Login Success",
        text: "Welcome Back!",
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Login Failed", text: err.message });
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      isLoggingOut = true;
      await signOut(auth);
      Swal.fire({
        icon: "info",
        title: "Logout Success",
        text: "You're Logged Out",
        confirmButtonText: "OK",
      }).then(() => {
        window.location.replace("../login/index.html");
      });
    } catch (err) {
      isLoggingOut = false;
      Swal.fire({ icon: "error", title: "Logout Failed", text: err.message });
    }
  });
}

// ======================================================
// 🔹 HELPER FUNCTIONS
// ======================================================
function formatTimestamp(ts) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
}

function hitungDurasi(createdAt, updatedAt) {
  if (!createdAt || !updatedAt) return "-";
  const start = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  const end = updatedAt.toDate ? updatedAt.toDate() : new Date(updatedAt);
  const menit = Math.floor((end - start) / 60000);
  return isNaN(menit) ? "-" : `${menit} Menit`;
}

function mapDeviceToCode(device) {
  if (["PC", "Laptop", "Printer", "Projector"].includes(device)) return "HW";
  if (device === "Jaringan") return "NW";
  if (["MSOffice", "Software"].includes(device)) return "SW";
  if (device === "Lainlain") return "OT";
  return "OT";
}

// ======================================================
// 🔹 APPLY FILTER & RENDER TABLE
// ======================================================
function applyFilter() {
  ticketsBody.innerHTML = "";

  const selected = filterSelect.value || "all";
  const filtered =
    selected === "all"
      ? allTickets
      : selected === "unassigned"
      ? allTickets.filter((t) => !t.action_by)
      : allTickets.filter((t) => t.action_by === selected);

  if (filtered.length === 0) {
    ticketsBody.innerHTML = `<tr><td colspan="16">There's no ticket with this filter</td></tr>`;
    return;
  }

  filtered.forEach((d) => {
    const sentAt = formatTimestamp(d.createdAt || d.sent_at);
    const codeValue = d.code || mapDeviceToCode(d.device);

    // 🔹 Tentukan teks & warna untuk QA dan Status Ticket
    const qaText =
      d.status_ticket === "Close" || d.status_ticket === "Close with note"
        ? "Finish"
        : "Continue";

    let statusColor = "";
    if (d.status_ticket === "Close") statusColor = "green";
    else if (d.status_ticket === "Close with note") statusColor = "orange";
    else if (d.status_ticket === "Open") statusColor = "red";
    else statusColor = "black";

    const tr = document.createElement("tr");
    tr.dataset.id = d.id;
    tr.innerHTML = `
      <td class="readonly">${sentAt}</td>
      <td class="editable" data-field="inventory">${d.inventory || "-"}</td>
      <td>${codeValue || "-"}</td>
      <td class="editable" data-field="location">${d.location || "-"}</td>
      <td class="editable" data-field="message">${d.message || "-"}</td>
      <td class="editable" data-field="name">${d.name || "-"}</td>
      <td>${hitungDurasi(d.createdAt, d.updatedAt)}</td>

      <!-- 🔹 Kolom QA -->
      <td>${qaText}</td>

      <td class="editable" data-field="user_email">${d.user_email || "-"}</td>
      <td class="editable" data-field="department">${d.department || "-"}</td>
      <td class="editable" data-field="priority">${d.priority || "-"}</td>
      <td style="display:none">${d.subject || "-"}</td>
      <td class="editable" data-field="action_by">${d.action_by || "-"}</td>

      <!-- 🔹 Kolom Status Ticket dengan warna -->
      <td class="editable" data-field="status_ticket" style="color:${statusColor}; font-weight:600;">
        ${d.status_ticket || "-"}
      </td>

      <td class="editable" data-field="note">${d.note || "-"}</td>

      <!-- 🔹 Action Button -->
      <td>
        <div class="action-buttons">
          <button class="table-btn update-btn" data-id="${d.id}">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="table-btn delete-btn" data-id="${d.id}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    ticketsBody.appendChild(tr);
  });
}

// ======================================================
// 🔹 UPDATE BUTTON HANDLING (Save + Cancel with SweetAlert2)
// ======================================================
ticketsBody.addEventListener("click", async (e) => {
  const btnUpdate = e.target.closest(".update-btn");
  const btnCancel = e.target.closest(".cancel-btn");

  // masuk mode edit
  if (btnUpdate) {
    const row = btnUpdate.closest("tr");
    const ticketId = row.dataset.id;
    const isEditing = row.classList.contains("editing");

    // masuk mode edit
    if (!isEditing) {
      // simpan data lama biar bisa batal
      row.dataset.original = JSON.stringify(
        Object.fromEntries(
          [...row.querySelectorAll(".editable")].map((td) => [
            td.dataset.field,
            td.innerText === "-" ? "" : td.innerText,
          ])
        )
      );

      row.classList.add("editing");
      btnUpdate.innerHTML = `<i class="fa-solid fa-check"></i>`;
      btnUpdate.classList.add("save-btn");

      // tambahkan tombol batal
      const actionDiv = row.querySelector(".action-buttons");
      actionDiv.insertAdjacentHTML(
        "beforeend",
        `<button class="table-btn cancel-btn"><i class="fa-solid fa-xmark"></i></button>`
      );

      // ubah field jadi input/select, tapi keep ukuran table
      row.querySelectorAll(".editable").forEach((td) => {
        const field = td.dataset.field;
        const val = td.innerText === "-" ? "" : td.innerText;

        if (field === "message" || field === "note") {
          td.innerHTML = `<textarea class="edit-input" data-field="${field}" style="width:100%;">${val}</textarea>`;
        } else if (field === "status_ticket") {
          td.innerHTML = `
            <select class="edit-input" data-field="status_ticket" style="width:100%;">
              <option value="Open" ${
                val === "Open" ? "selected" : ""
              }>Open</option>
              <option value="Close" ${
                val === "Close" ? "selected" : ""
              }>Close</option>
              <option value="Close with note" ${
                val === "Close with note" ? "selected" : ""
              }>Close with note</option>
            </select>
          `;
        } else if (field === "action_by") {
          td.innerHTML = `
            <select class="edit-input" data-field="action_by" style="width:100%;">
              <option value="">-- Pilih --</option>
              ${IT_NAMES.map(
                (it) =>
                  `<option value="${it}" ${
                    val === it ? "selected" : ""
                  }>${it}</option>`
              ).join("")}
            </select>
          `;
        } else if (field === "priority") {
          td.innerHTML = `
      <select class="edit-input" data-field="priority" style="width:100%;">
        <option value="Low" ${val === "Low" ? "selected" : ""}>Low</option>
        <option value="Medium" ${
          val === "Medium" ? "selected" : ""
        }>Medium</option>
        <option value="High" ${val === "High" ? "selected" : ""}>High</option>
      </select>
    `;
        } else if (field === "department") {
          td.innerHTML = `
      <select class="edit-input" data-field="department" style="width:100%;">
        <option value="Management" ${
          val === "Management" ? "selected" : ""
        }>Management</option>
        <option value="IT" ${val === "IT" ? "selected" : ""}>IT</option>
        <option value="HR" ${val === "HR" ? "selected" : ""}>HR</option>
        <option value="Finance" ${
          val === "Finance" ? "selected" : ""
        }>Finance</option>
        <option value="Engineer" ${
          val === "Engineer" ? "selected" : ""
        }>Engineer</option>
        <option value="QC" ${val === "QC" ? "selected" : ""}>QC</option>
        <option value="Completion" ${
          val === "Completion" ? "selected" : ""
        }>Completion</option>
        <option value="HSE" ${val === "HSE" ? "selected" : ""}>HSE</option>
        <option value="Clinic" ${
          val === "Clinic" ? "selected" : ""
        }>Clinic</option>
        <option value="Vendor" ${
          val === "Vendor" ? "selected" : ""
        }>Vendor</option>
        <option value="Etc." ${val === "Etc." ? "selected" : ""}>Etc.</option>
      </select>
    `;
        } else if (field === "location") {
          td.innerHTML = `
    <select class="edit-input" data-field="location" style="width:100%;">
      <option value="">-- Pilih Lokasi --</option>
      <option value="White Office" ${
        val === "White Office" ? "selected" : ""
      }>White Office</option>
      <option value="White Office 2nd Fl" ${
        val === "White Office 2nd Fl" ? "selected" : ""
      }>White Office 2nd Fl</option>
      <option value="White Office 3rd Fl" ${
        val === "White Office 3rd Fl" ? "selected" : ""
      }>White Office 3rd Fl</option>
      <option value="Blue Office" ${
        val === "Blue Office" ? "selected" : ""
      }>Blue Office</option>
      <option value="Green Office" ${
        val === "Green Office" ? "selected" : ""
      }>Green Office</option>
      <option value="Red Office" ${
        val === "Red Office" ? "selected" : ""
      }>Red Office</option>
      <option value="HRD" ${val === "HRD" ? "selected" : ""}>HRD</option>
      <option value="Clinic" ${
        val === "Clinic" ? "selected" : ""
      }>Clinic</option>
      <option value="HSE Yard" ${
        val === "HSE Yard" ? "selected" : ""
      }>HSE Yard</option>
      <option value="Dark Room" ${
        val === "Dark Room" ? "selected" : ""
      }>Dark Room</option>
      <option value="Control Room" ${
        val === "Control Room" ? "selected" : ""
      }>Control Room</option>
      <option value="Security" ${
        val === "Security" ? "selected" : ""
      }>Security</option>
      <option value="Welding School" ${
        val === "Welding School" ? "selected" : ""
      }>Welding School</option>
    </select>
  `;
        } else {
          td.innerHTML = `<input type="text" class="edit-input" data-field="${field}" value="${val}" style="width:100%;">`;
        }
      });
      return;
    }

    // jika save ditekan
    const updates = {};
    row.querySelectorAll(".edit-input").forEach((el) => {
      updates[el.dataset.field] = el.value;
    });

    // ✅ Hitung ulang durasi hanya jika status tiket berubah ke "Close" atau "Close with note"
const statusField = row.querySelector('[data-field="status_ticket"] select');
const statusValue = statusField ? statusField.value : null;

// ambil data lama dari Firestore (agar bisa bandingkan status sebelumnya)
const docRef = doc(db, "tickets", ticketId);
const oldDataSnap = await getDoc(docRef);
const oldData = oldDataSnap.exists() ? oldDataSnap.data() : {};

// cek perubahan status
const oldStatus = oldData.status_ticket || "Open";
const newStatus = statusValue || oldStatus;

// update updatedAt hanya jika status berubah ke close
if (
  (oldStatus !== newStatus) &&
  (newStatus === "Close" || newStatus === "Close with note")
) {
  updates.updatedAt = serverTimestamp();
}

    const confirmSave = await Swal.fire({
      title: "Simpan Perubahan?",
      text: "Data akan diperbarui di database",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Simpan",
      cancelButtonText: "Batal",
    });

    if (!confirmSave.isConfirmed) return;

    try {
      await updateDoc(doc(db, "tickets", ticketId), updates);
      Swal.fire({
        icon: "success",
        title: "Update Berhasil",
        text: "Data berhasil diperbarui",
        timer: 1800,
        showConfirmButton: false,
      });

      row.classList.remove("editing");
      btnUpdate.innerHTML = `<i class="fa-solid fa-pen"></i>`;
      btnUpdate.classList.remove("save-btn");
      row.querySelector(".cancel-btn")?.remove();

      // tampilkan kembali hasil update di tabel
      row.querySelectorAll(".editable").forEach((td) => {
        const field = td.dataset.field;
        td.innerText = updates[field] || "-";
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Update Gagal", text: err.message });
    }
  }

  // batal edit
  if (btnCancel) {
    const row = btnCancel.closest("tr");
    const original = JSON.parse(row.dataset.original);

    const confirmCancel = await Swal.fire({
      title: "Batalkan Edit?",
      text: "Perubahan tidak akan disimpan",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Batalkan",
      cancelButtonText: "Kembali",
    });

    if (!confirmCancel.isConfirmed) return;

    row.classList.remove("editing");
    row.querySelector(
      ".update-btn"
    ).innerHTML = `<i class="fa-solid fa-pen"></i>`;
    row.querySelector(".update-btn").classList.remove("save-btn");
    btnCancel.remove();

    // restore data lama
    row.querySelectorAll(".editable").forEach((td) => {
      const field = td.dataset.field;
      td.innerText = original[field] || "-";
    });
  }
});

// ======================================================
// 🔹 DELETE BUTTON HANDLING
// ======================================================
ticketsBody.addEventListener("click", async (e) => {
  const btn = e.target.closest(".delete-btn");
  if (!btn) return;

  const ticketId = btn.dataset.id;
  const confirm = await Swal.fire({
    title: "Delete this ticket?",
    text: "You cannot undo this action!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, Delete!",
    cancelButtonText: "Cancel",
  });

  if (confirm.isConfirmed) {
    try {
      await deleteDoc(doc(db, "tickets", ticketId));
      Swal.fire("Deleted!", "Ticket Deleted!.", "success");
    } catch (err) {
      Swal.fire("Failed!", "Delete Data Failed.", "error");
    }
  }
});

// ======================================================
// 🔹 MONITOR LOGIN STATE (Dengan Akses Admin Terbatas)
// ======================================================
onAuthStateChanged(auth, (user) => {
  if (!user && !isLoggingOut) {
    return window.location.replace("../login/index.html");
  }

  if (user) {
    const allowedAdmins = [
      "mr.rikohermansyah@gmail.com",
      "devi.armanda@meitech-ekabintan.com",
      "wahyu.nugroho@meitech-ekabintan.com",
      "abdurahman.hakim@meitech-ekabintan.com",
      "riko.hermansyah@meitech-ekabintan.com",
    ];

    // --- tampilkan nama login
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    if (userInfo) {
      userInfo.style.display = "inline-block";
      userInfo.textContent = user.displayName || user.email || "Unknown User";
    }

    // ✅ hanya admin yang boleh lihat data ticket
    if (allowedAdmins.includes(user.email)) {
      const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
      onSnapshot(q, (snapshot) => {
        allTickets = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        const names = [
          ...new Set(
            allTickets
              .map((t) => t.action_by)
              .filter((n) => IT_NAMES.includes(n))
          ),
        ];

        filterSelect.innerHTML = `
          <option value="all">-- All --</option>
          <option value="unassigned">-- Not Assigned --</option>
        `;

        names.forEach((name) => {
          filterSelect.innerHTML += `<option value="${name}">${name}</option>`;
        });

        applyFilter();
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Access Denied",
        text: "You are not authorized to view tickets.",
      }).then(() => {
        signOut(auth);
        window.location.replace("../login/index.html");
      });
    }
  }
});

// ======================================================
// 🔹 FILTER HANDLING — supaya dropdown "Action By" berfungsi
// ======================================================
if (filterSelect) {
  filterSelect.addEventListener("change", () => {
    applyFilter();
  });
}


// ======================================================
// 🔹 EXPORT TO PDF
// ======================================================
function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("l", "pt", "a4");
  doc.setFontSize(14);
  doc.text("List IT Tickets", 40, 40);

  const table = document.getElementById("ticketsTable");
  if (!table) return;

  const headers = Array.from(table.querySelectorAll("thead th")).map(
    (th) => th.innerText
  );
  const rows = Array.from(table.querySelectorAll("tbody tr")).map((tr) =>
    Array.from(tr.querySelectorAll("td")).map((td) => td.innerText)
  );

  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 60,
    styles: { fontSize: 8, cellPadding: 4, valign: "middle" },
    headStyles: { fillColor: [41, 128, 185], halign: "center" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save("tickets.pdf");
}

document.addEventListener("DOMContentLoaded", () => {
  const btnExport = document.getElementById("btnExportPDF");
  if (btnExport) btnExport.addEventListener("click", exportToPDF);
});


