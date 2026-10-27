// ─────────────────────────────────────────────────────────────
// js/leave-request-detail.js — หน้าที่ 3 รายละเอียดใบลา
// อ่านใบลา + ความเห็นจาก Firestore แบบ real-time · อนุมัติ/ไม่อนุมัติ/เขียนความเห็นเขียนจริง
// ─────────────────────────────────────────────────────────────

import { db, auth } from "./firebase-config.js";
import {
  doc, onSnapshot, updateDoc, deleteDoc,
  collection, addDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { เรียกAI } from "./ai.js";

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

  // สรุปจาก AI (ถ้ามี) — ไว้อ่านประกอบการตัดสินใจเท่านั้น ไม่ได้ตัดสินแทนคน
  if (ใบ.aiSuggestion) {
    html +=
      '<div class="field-row"><span class="k">✨ สรุปโดย AI</span><span>' + esc(ใบ.aiSuggestion) +
      "</span></div>";
  }

  // ปุ่มอนุมัติ / ไม่อนุมัติ / ลบ / สรุปด้วย AI ขึ้นเฉพาะใบที่ยังรอพิจารณา
  if (ใบ.status === "รอพิจารณา") {
    html +=
      '<div class="btn-row">' +
      '<button type="button" class="btn-ok" id="ปุ่มอนุมัติ">อนุมัติ</button>' +
      '<button type="button" class="btn-danger" id="ปุ่มไม่อนุมัติ">ไม่อนุมัติ</button>' +
      "</div>" +
      '<div class="btn-row">' +
      '<button type="button" id="ปุ่มAIสรุป">🤖 ให้ AI ช่วยสรุปใบลานี้</button>' +
      "</div>" +
      '<div id="ข้อความเตือนAI" class="alert alert-error hidden"></div>' +
      '<div class="btn-row">' +
      '<button type="button" class="btn-danger" id="ปุ่มลบ">ลบใบลานี้</button>' +
      "</div>";
  } else {
    html += '<p class="hint">ใบนี้พิจารณาแล้ว จึงเปลี่ยนสถานะต่อไม่ได้</p>';
  }

  กล่องใบลา.innerHTML = html;

  if (ใบ.status === "รอพิจารณา") {
    document.getElementById("ปุ่มอนุมัติ").addEventListener("click", function () { เปลี่ยนสถานะ("อนุมัติ"); });
    document.getElementById("ปุ่มไม่อนุมัติ").addEventListener("click", function () { เปลี่ยนสถานะ("ไม่อนุมัติ"); });
    document.getElementById("ปุ่มAIสรุป").addEventListener("click", ให้AIสรุป);
    document.getElementById("ปุ่มลบ").addEventListener("click", ลบใบลา);
  }
}

// ── ปุ่ม AI ระดับ 2 (agentic): อ่านใบลา+ความเห็น → สรุปให้หัวหน้าอ่าน → เขียนผลกลับ + จด aiLog ──
function ให้AIสรุป() {
  var ปุ่ม = document.getElementById("ปุ่มAIสรุป");
  var กล่องเตือนAI = document.getElementById("ข้อความเตือนAI");
  กล่องเตือนAI.classList.add("hidden");

  var ข้อความความเห็น = ความเห็น.length === 0
    ? "(ยังไม่มีความเห็น)"
    : ความเห็น.map(function (c) { return "- " + c.authorName + ": " + c.message; }).join("\n");

  var ข้อมูลนำเข้า =
    "หัวข้อ: " + ใบ.title + "\n" +
    "เหตุผล: " + ใบ.reason + "\n" +
    "ประเภทการลา: " + ใบ.leaveTypeName + "\n" +
    "วันที่ลา: " + ใบ.startDate + " ถึง " + ใบ.endDate + "\n" +
    "ผู้ขอลา: " + ใบ.requesterName + "\n" +
    "ความเห็นที่มีอยู่แล้ว:\n" + ข้อความความเห็น;

  ปุ่ม.disabled = true;
  ปุ่ม.textContent = "🤖 กำลังสรุป...";

  เรียกAI(
    "คุณช่วยสรุปใบขอลาให้หัวหน้าอ่านก่อนตัดสินใจอนุมัติ ตอบเป็นภาษาไทย ไม่เกิน 3 ประโยค " +
      "สรุปสั้น กระชับ ไม่ต้องขึ้นต้นด้วยคำทักทาย ห้ามแนะนำว่าควรอนุมัติหรือไม่อนุมัติ " +
      "หน้าที่ของคุณคือสรุปข้อมูลให้อ่านง่ายเท่านั้น การตัดสินใจเป็นของคนที่มีสิทธิ์อนุมัติ",
    ข้อมูลนำเข้า
  ).then(function (สรุป) {
    return updateDoc(ใบRef, { aiSuggestion: สรุป }).then(function () {
      return addDoc(collection(ใบRef, "aiLog"), {
        input: ข้อมูลนำเข้า,
        output: สรุป,
        createdAt: เวลาตอนนี้()
      });
    });
  }).catch(function (err) {
    กล่องเตือนAI.textContent = "⚠️ " + err.message;
    กล่องเตือนAI.classList.remove("hidden");
  }).finally(function () {
    if (ปุ่ม) {
      ปุ่ม.disabled = false;
      ปุ่ม.textContent = "🤖 ให้ AI ช่วยสรุปใบลานี้";
    }
  });
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

// ── ลบใบลา (เฉพาะใบที่ยังรอพิจารณา) — ต้องถามยืนยันก่อนทุกครั้ง ──
function ลบใบลา() {
  if (!confirm('ยืนยันการลบใบลา "' + ใบ.title + '" หรือไม่ — เมื่อลบแล้วกู้คืนไม่ได้')) return;
  deleteDoc(ใบRef).then(function () {
    location.href = "leave-requests.html";
  }).catch(function (err) {
    alert("ลบไม่สำเร็จ: " + err.message);
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

  var ผู้ใช้ = auth.currentUser;
  if (!ผู้ใช้) {
    เตือน.textContent = "⚠️ กรุณาเข้าสู่ระบบก่อนเขียนความเห็น";
    เตือน.classList.remove("hidden");
    return;
  }

  addDoc(collection(ใบRef, "approvals"), {
    authorId: ผู้ใช้.uid, authorName: ผู้ใช้.displayName || ผู้ใช้.email,
    message: ข้อความ,
    createdAt: เวลาตอนนี้()
  }).then(function () {
    ช่อง.value = "";
  }).catch(function (err) {
    เตือน.textContent = "⚠️ ส่งความเห็นไม่สำเร็จ: " + err.message;
    เตือน.classList.remove("hidden");
  });
}
