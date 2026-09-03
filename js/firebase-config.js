// ─────────────────────────────────────────────────────────────
// js/firebase-config.js — เชื่อมต่อ Firebase project ของ LeaveEasy
// apiKey ของ Firebase web config ไม่ใช่ความลับ ใส่ตรงในไฟล์นี้ได้ตามปกติ
// ─────────────────────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA08IpWacUCLAcJEHOSjvcGX2KTw9a9kSY",
  authDomain: "leaveeasy-chonlatrid.firebaseapp.com",
  projectId: "leaveeasy-chonlatrid",
  storageBucket: "leaveeasy-chonlatrid.firebasestorage.app",
  messagingSenderId: "560600713033",
  appId: "1:560600713033:web:e12bb296517e0f6c98bc98"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
