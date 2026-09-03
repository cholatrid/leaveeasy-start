// ─────────────────────────────────────────────────────────────
// js/leave-request-detail.js — หน้าที่ 3 รายละเอียดใบลา
// อ่านใบลา + ความเห็นจาก Firestore แบบ real-time · อนุมัติ/ไม่อนุมัติ/เขียนความเห็นเขียนจริง
// ─────────────────────────────────────────────────────────────

import { db } from "./firebase-config.js";
import {
  doc, onSnapshot, updateDoc,
  collection, addDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

var รหัสใบลา = ค่าจากURL("id");
var กล่องใบลา = document.getElementById("กล่องใบลา");
var กล่องความเห็น = document.getElementById("กล่องความเห็น");

var ใบRef = doc(db, "leaveRequests", รหัสใบลา);
var ใบ = null;
var ความเห็น = [];

document.getElementById("ปุ่มส่งความเห็น").addEventListener("click", ส่งความเห็น);

onSnapshot(ใบRef, function (snap) {
  if (!snap.exists()) {
    ใบ = null;
    กล่องใบลา.innerHTML = "<p>ไม่พบใบขอลาที่ต้องการ — อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง</p>";
    กล่องความเห็น.classList.add("hidden");
    return;
  }
  ใบ = Object.assign({ id: snap.id }, snap.data());
  วาดใบลา();
  กล่องความเห็น.classList.remove("hidden");
});

onSnapshot(collection(ใบRef, "approvals"), function (snap) {
  ความเห็น = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  วาดความเห็น();
});

// ── วาดข้อมูลใบลาลงหน้าจอ ──
function วาดใบลา() {
  var แถว = [
    ["หัวข้อ", esc(ใบ.title)],
    ["เหตุผลการลา", esc(ใบ.reason)],
    ["ประเภทการลา", esc(ใบ.leaveTypeName)],
    ["วันที่ลา", esc(ใบ.startDate) + " ถึง " + esc(ใบ.endDate)],
    ["ผู้ขอลา", esc(ใบ.requesterName)],
    ["ผู้อนุมัติ", ใบ.approverName ? esc(ใบ.approverName) : "ยังไม่ได้กำหนดผู้อนุมัติ"],
    ["สถานะ", ป้ายสถานะ(ใบ.status)],
    ["วันที่ยื่น", esc(ใบ.createdAt)]
  ];

  var html = แถว.map(function (r) {
    return '<div class="field-row"><span class="k">' + r[0] + "</span><span>" + r[1] + "</span></div>";
  }).join("");

  // ปุ่มอนุมัติ / ไม่อนุมัติ ขึ้นเฉพาะใบที่ยังรอพิจารณา
  if (ใบ.status === "รอพิจารณา") {
    html +=
      '<div class="btn-row">' +
      '<button type="button" class="btn-ok" id="ปุ่มอนุมัติ">อนุมัติ</button>' +
      '<button type="button" class="btn-danger" id="ปุ่มไม่อนุมัติ">ไม่อนุมัติ</button>' +
      "</div>";
  } else {
    html += '<p class="hint">ใบนี้พิจารณาแล้ว จึงเปลี่ยนสถานะต่อไม่ได้</p>';
  }

  กล่องใบลา.innerHTML = html;

  if (ใบ.status === "รอพิจารณา") {
    document.getElementById("ปุ่มอนุมัติ").addEventListener("click", function () { เปลี่ยนสถานะ("อนุมัติ"); });
    document.getElementById("ปุ่มไม่อนุมัติ").addEventListener("click", function () { เปลี่ยนสถานะ("ไม่อนุมัติ"); });
  }
}

// ── เปลี่ยนสถานะ (แก้เฉพาะ field status ห้ามเขียนทับช่องอื่น) ──
function เปลี่ยนสถานะ(สถานะใหม่) {
  // กฎ: จะไม่อนุมัติได้ ต้องมีความเห็นอย่างน้อย 1 รายการก่อน
  if (สถานะใหม่ === "ไม่อนุมัติ" && ความเห็น.length === 0) {
    alert("ต้องเขียนความเห็นอย่างน้อย 1 รายการก่อน จึงจะกดไม่อนุมัติได้");
    return;
  }
  updateDoc(ใบRef, { status: สถานะใหม่ }).catch(function (err) {
    alert("เปลี่ยนสถานะไม่สำเร็จ: " + err.message);
  });
}

// ── รายการความเห็น เรียงจากเก่าไปใหม่ ──
function วาดความเห็น() {
  var ที่วาง = document.getElementById("รายการความเห็น");
  if (ความเห็น.length === 0) {
    ที่วาง.innerHTML = "<p>ยังไม่มีความเห็นในใบนี้</p>";
    return;
  }
  ที่วาง.innerHTML = ความเห็น
    .slice()
    .sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; })
    .map(function (c) {
      return '<div class="comment"><div class="meta">' + esc(c.authorName) + " · " + esc(c.createdAt) +
             "</div><div>" + esc(c.message) + "</div></div>";
    }).join("");
}

// ── ส่งความเห็นใหม่ ──
function ส่งความเห็น() {
  var ช่อง = document.getElementById("ข้อความความเห็น");
  var เตือน = document.getElementById("เตือนความเห็น");
  var ข้อความ = ช่อง.value.trim();

  if (!ข้อความ) {
    เตือน.textContent = "⚠️ พิมพ์ข้อความก่อน จึงจะส่งความเห็นได้";
    เตือน.classList.remove("hidden");
    return;
  }
  เตือน.classList.add("hidden");

  // สัปดาห์นี้ยังไม่มีล็อกอิน จึงสมมติว่าผู้เขียนคือ สมหญิง รักงาน
  addDoc(collection(ใบRef, "approvals"), {
    authorId: "u002", authorName: "สมหญิง รักงาน",
    message: ข้อความ,
    createdAt: เวลาตอนนี้()
  }).then(function () {
    ช่อง.value = "";
  }).catch(function (err) {
    เตือน.textContent = "⚠️ ส่งความเห็นไม่สำเร็จ: " + err.message;
    เตือน.classList.remove("hidden");
  });
}
