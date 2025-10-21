// ======================================================
// 🔹 js/config.js - Shared Configuration
// ======================================================

// ==================== 🔹 Device Type Mapping ====================
const DEVICE_TYPE_MAPPING = {
  "PC Hardware": "HW",
  Laptop: "HW",
  Printer: "HW",
  Projector: "HW",
  "PC Software": "SW",
  Network: "NW",
  "Backup Data": "DR",
  Others: "OT",
};

// ==================== 🔹 IT Staff List ====================
const IT_STAFF = [
  "Riko Hermansyah",
  "Devi Armanda",
  "Wahyu Nugroho",
  "Abdurahman Hakim",
];

// ==================== 🔹 Admin Emails Whitelist ====================
const ADMIN_EMAILS = [
  "riko.hermansyah@meitech-ekabintan.com",
  "devi.armanda@meitech-ekabintan.com",
  "wahyu.nugroho@meitech-ekabintan.com",
  "abdurahman.hakim@meitech-ekabintan.com",
  "admin@meitech-ekabintan.com",
  "nimda@meitech-ekabintan.com",
];

// ==================== 🔹 Admin Name Mapping ====================
const ADMIN_NAME_MAPPING = {
  "riko.hermansyah@meitech-ekabintan.com": "Riko Hermansyah",
  "devi.armanda@meitech-ekabintan.com": "Devi Armanda",
  "wahyu.nugroho@meitech-ekabintan.com": "Wahyu Nugroho",
  "abdurahman.hakim@meitech-ekabintan.com": "Abdurahman Hakim",
  "admin@meitech-ekabintan.com": "System Admin",
  "nimda@meitech-ekabintan.com": "System Admin",
};

// Export untuk modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DEVICE_TYPE_MAPPING,
    IT_STAFF,
    ADMIN_EMAILS,
    ADMIN_NAME_MAPPING,
  };
} else {
  // Untuk browser
  window.CONFIG = {
    DEVICE_TYPE_MAPPING,
    IT_STAFF,
    ADMIN_EMAILS,
    ADMIN_NAME_MAPPING,
  };
}
