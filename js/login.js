// ─────────────────────────────────────────────────────────────
// js/login.js — หน้าเข้าสู่ระบบ
// เรียก signInWithEmailAndPassword จริง แล้วพาไปหน้ารายการใบลา
// ─────────────────────────────────────────────────────────────

import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

var ฟอร์ม = document.getElementById("ฟอร์มล็อกอิน");
var กล่องเตือน = document.getElementById("ข้อความเตือน");
var ปุ่มล็อกอิน = document.getElementById("ปุ่มล็อกอิน");

ฟอร์ม.addEventListener("submit", function (e) {
  e.preventDefault();

  var อีเมล = document.getElementById("email").value.trim();
  var รหัสผ่าน = document.getElementById("password").value;

  if (!อีเมล || !รหัสผ่าน) {
    เตือน("กรอกอีเมลและรหัสผ่านให้ครบก่อนกดเข้าสู่ระบบ");
    return;
  }
  กล่องเตือน.classList.add("hidden");
  ปุ่มล็อกอิน.disabled = true;

  signInWithEmailAndPassword(auth, อีเมล, รหัสผ่าน)
    .then(function () {
      location.href = "leave-requests.html";
    })
    .catch(function (err) {
      ปุ่มล็อกอิน.disabled = false;
      เตือน(ข้อความError(err));
    });
});

function เตือน(ข้อความ) {
  กล่องเตือน.textContent = "⚠️ " + ข้อความ;
  กล่องเตือน.classList.remove("hidden");
}
