// Modular Firebase + EmailJS integration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';


// ---------- CONFIGURATION (GANTI DENGAN MILIK ANDA) ----------
// 1) Firebase config — ganti nilai di bawah dengan config web app Anda
const firebaseConfig = {
  apiKey: "AIzaSyCQR--hn0RDvDduCjA2Opa9HLzyYn_GFIs",
  authDomain: "itticketing-f926e.firebaseapp.com",
  projectId: "itticketing-f926e",
  storageBucket: "itticketing-f926e.firebasestorage.app",
  messagingSenderId: "896370077103",
  appId: "1:896370077103:web:1d692e88b611bff838935a",
  measurementId: "G-TJCHPXG7D5"
};
// 2) EmailJS — ganti dengan service ID, template ID, dan user/public key milik Anda
const EMAILJS_SERVICE_ID = 'service_gf26aop';
const EMAILJS_TEMPLATE_ID = 'template_nsi9k3e';
const EMAILJS_PUBLIC_KEY = '5Sl1dmt0fEZe1Wg38';


// 3) Email penerima bila Anda ingin selalu mengirim ke alamat statis (opsional)
const STATIC_RECIPIENT_EMAIL = 'mr.rikohermansyah@gmail.com'; // ganti sesuai kebutuhan


// ---------------------------------------------------------------
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// Init EmailJS (global emailjs from SDK script)
if (window.emailjs) {
emailjs.init(EMAILJS_PUBLIC_KEY);
} else {
console.warn('EmailJS SDK tidak tersedia — pastikan <script src="https://cdn.emailjs.com/dist/email.min.js"></script> di index.html');
}


const form = document.getElementById('ticketForm');
const statusEl = document.getElementById('status');
const ticketsList = document.getElementById('ticketsList');

async function sendEmail(payload) {
// mengirim via EmailJS (client-side)
try {
const templateParams = payload;
// jika ingin menambahkan penerima statis, tambahkan di template EmailJS
const res = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
return res;
} catch (err) {
throw err;
}
}


async function saveToFirestore(doc) {
try {
const col = collection(db, 'tickets');
const docRef = await addDoc(col, doc);
return docRef.id;
} catch (err) {
throw err;
}
}

form.addEventListener('submit', async (e) => {
e.preventDefault();
statusEl.textContent = 'Mengirim tiket...';
const data = new FormData(form);
const payload = {
name: data.get('name'),
user_email: data.get('user_email'),
department: data.get('department'),
priority: data.get('priority'),
subject: data.get('subject'),
message: data.get('message'),
sent_at: new Date().toISOString(),
recipient: STATIC_RECIPIENT_EMAIL
};


try {
// 1) simpan ke Firestore
const id = await saveToFirestore(payload);
payload.ticketId = id;


// 2) kirim email
await sendEmail(payload);


statusEl.textContent = 'Tiket terkirim! ID: ' + id;
alert("✅ Tiket berhasil dikirim!\nID Tiket: " + id);
form.reset();
loadRecentTickets();
} catch (err) {
console.error(err);
statusEl.textContent = 'Terjadi kesalahan: ' + (err.message || err);
// ❌ tampilkan popup error
    alert("❌ Gagal mengirim tiket: " + (err.message || err));
}
});

async function loadRecentTickets(){
try{
ticketsList.innerHTML = '<li>Memuat...</li>';
const col = collection(db, 'tickets');
const q = query(col, orderBy('sent_at','desc'), limit(10));
const snap = await getDocs(q);
ticketsList.innerHTML = '';
snap.forEach(doc => {
const d = doc.data();
const li = document.createElement('li');
li.innerHTML = `<strong>${d.name} — <strong>${d.department}</strong> — ${d.subject} — ${d.priority} <div class="muted">${new Date(d.sent_at).toLocaleString()}</div>`;
ticketsList.appendChild(li);
});
if(!snap.size) ticketsList.innerHTML = '<li>Belum ada tiket.</li>';
}catch(err){
ticketsList.innerHTML = '<li>Gagal memuat tiket.</li>';
console.error(err);
}
}


// load on start
loadRecentTickets();


// Helpful: expose config for debugging (remove in production)
window._TICKET_APP = { firebaseConfig, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID };