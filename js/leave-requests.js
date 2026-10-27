// ─────────────────────────────────────────────────────────────
// js/leave-requests.js — หน้าที่ 1 รายการใบลา
// อ่านข้อมูลจริงจาก Firestore (collection leaveRequests) แบบ real-time
// ─────────────────────────────────────────────────────────────

import { db, auth } from "./firebase-config.js";
import {
  collection, onSnapshot, doc, getDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

var กล่อง = document.getElementById("ผลลัพธ์");
var สถานะที่กรอง = ค่าจากURL("status");

// รอให้รู้ว่าใครล็อกอินอยู่ก่อน ถึงจะรู้ว่าต้อง query แบบไหน — กฎเฝ้าข้อมูลอนุญาตให้พนักงาน
// อ่านได้เฉพาะใบของตัวเอง ถ้า query ทั้ง collection แบบไม่กรองจะโดนปฏิเสธทั้งก้อน (ไม่ใช่แค่กรองผล)
onAuthStateChanged(auth, function (ผู้ใช้) {
  if (!ผู้ใช้) return; // js/auth.js จะ redirect ไป login.html ให้เองอยู่แล้ว

  getDoc(doc(db, "users", ผู้ใช้.uid)).then(function (snap) {
    var บทบาท = snap.exists() ? snap.data().role : "employee";
    var เห็นทุกใบ = บทบาท === "manager" || บทบาท === "hr";
    var คิวรี = เห็นทุกใบ
      ? collection(db, "leaveRequests")
      : query(collection(db, "leaveRequests"), where("requesterId", "==", ผู้ใช้.uid));

    onSnapshot(คิวรี, function (snapshot) {
      var ใบลาทั้งหมด = snapshot.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });

      if (สถานะที่กรอง) {
        ใบลาทั้งหมด = ใบลาทั้งหมด.filter(function (ใบ) { return ใบ.status === สถานะที่กรอง; });
        document.querySelector(".subtitle").textContent =
          "กำลังแสดงเฉพาะใบลาที่สถานะ " + สถานะที่กรอง + " · กดเมนู รายการใบลา เพื่อดูทั้งหมด";
      }

      แสดงตาราง(ใบลาทั้งหมด);
    });
  });
});

function แสดงตาราง(รายการ) {
  if (รายการ.length === 0) {
    กล่อง.innerHTML = "<p>ยังไม่มีใบขอลาในระบบ</p>";
    return;
  }

  var html =
    "<table><thead><tr>" +
    "<th>หัวข้อ</th>" +
    "<th>ประเภทการลา</th>" +
    "<th>สถานะ</th>" +
    '<th class="hide-mobile">ผู้ขอลา</th>' +
    '<th class="hide-mobile">วันที่ลา</th>' +
    "</tr></thead><tbody>";

  รายการ.forEach(function (ใบ) {
    html +=
      '<tr class="clickable" data-id="' + esc(ใบ.id) + '">' +
      "<td>" + esc(ใบ.title) + "</td>" +
      "<td>" + esc(ใบ.leaveTypeName) + "</td>" +
      "<td>" + ป้ายสถานะ(ใบ.status) + "</td>" +
      '<td class="hide-mobile">' + esc(ใบ.requesterName) + "</td>" +
      '<td class="hide-mobile">' + esc(ใบ.startDate) + " ถึง " + esc(ใบ.endDate) + "</td>" +
      "</tr>";
  });

  html += "</tbody></table>";
  กล่อง.innerHTML = html;

  // กดที่แถวไหน ไปหน้ารายละเอียดของใบนั้น
  กล่อง.querySelectorAll("tr.clickable").forEach(function (แถว) {
    แถว.addEventListener("click", function () {
      location.href = "leave-request-detail.html?id=" + แถว.dataset.id;
    });
  });
}
