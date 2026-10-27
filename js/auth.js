// ─────────────────────────────────────────────────────────────
// js/auth.js — ยามเฝ้าหน้า (route guard) + แสดงชื่อผู้ใช้ในแถบเมนู
// ใส่ไว้ในทุกหน้าที่ต้องล็อกอินก่อนถึงใช้ได้ (ห้ามใส่ใน login.html / signup.html
// ไม่งั้นจะ redirect วนตัวเอง)
// ─────────────────────────────────────────────────────────────

import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

onAuthStateChanged(auth, function (ผู้ใช้) {
  if (!ผู้ใช้) {
    location.href = "login.html";
    return;
  }

  var กล่องผู้ใช้ = document.getElementById("navUser");
  if (!กล่องผู้ใช้) return;

  กล่องผู้ใช้.innerHTML =
    esc(ผู้ใช้.displayName || ผู้ใช้.email) +
    ' <button type="button" class="btn-ghost" id="ปุ่มออกจากระบบ">ออกจากระบบ</button>';

  document.getElementById("ปุ่มออกจากระบบ").addEventListener("click", function () {
    // signOut แล้ว onAuthStateChanged ด้านบนจะยิงอีกครั้งด้วย user เป็น null
    // และ redirect ไป login.html ให้เอง ไม่ต้อง location.href ซ้ำที่นี่
    signOut(auth);
  });
});
