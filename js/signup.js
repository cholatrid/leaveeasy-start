// ─────────────────────────────────────────────────────────────
// js/signup.js — หน้าสมัครสมาชิก
// สร้างบัญชี Firebase Authentication จริง + ตั้งชื่อที่แสดง (displayName)
// + สร้างไฟล์ users/{uid} พร้อม role เริ่มต้นเป็น employee เสมอ
// ─────────────────────────────────────────────────────────────

import { db, auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

var ฟอร์ม = document.getElementById("ฟอร์มสมัคร");
var กล่องเตือน = document.getElementById("ข้อความเตือน");
var ปุ่มสมัคร = document.getElementById("ปุ่มสมัคร");

ฟอร์ม.addEventListener("submit", function (e) {
  e.preventDefault();

  var ชื่อ = document.getElementById("name").value.trim();
  var อีเมล = document.getElementById("email").value.trim();
  var รหัสผ่าน = document.getElementById("password").value;

  if (!ชื่อ || !อีเมล || !รหัสผ่าน) {
    เตือน("กรอกให้ครบทุกช่องก่อนกดสมัครสมาชิก");
    return;
  }
  กล่องเตือน.classList.add("hidden");
  ปุ่มสมัคร.disabled = true;

  createUserWithEmailAndPassword(auth, อีเมล, รหัสผ่าน)
    .then(function (ผลลัพธ์) {
      var ผู้ใช้ = ผลลัพธ์.user;
      return updateProfile(ผู้ใช้, { displayName: ชื่อ }).then(function () {
        return setDoc(doc(db, "users", ผู้ใช้.uid), {
          name: ชื่อ,
          email: อีเมล,
          role: "employee" // บัญชีสมัครใหม่ทุกบัญชีเริ่มที่บทบาทผู้ขอลาเสมอ
        });
      });
    })
    .then(function () {
      location.href = "leave-requests.html";
    })
    .catch(function (err) {
      ปุ่มสมัคร.disabled = false;
      เตือน(ข้อความError(err));
    });
});

function เตือน(ข้อความ) {
  กล่องเตือน.textContent = "⚠️ " + ข้อความ;
  กล่องเตือน.classList.remove("hidden");
}
