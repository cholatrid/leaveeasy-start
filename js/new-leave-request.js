// ─────────────────────────────────────────────────────────────
// js/new-leave-request.js — หน้าที่ 2 ยื่นใบลาใหม่
// ประเภทการลาอ่านจาก Firestore · กดบันทึกแล้วเขียนใบลาใหม่ลง Firestore จริง
// ─────────────────────────────────────────────────────────────

import { db, auth } from "./firebase-config.js";
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { เรียกAI } from "./ai.js";

var ฟอร์ม = document.getElementById("ฟอร์มใบลา");
var ช่องประเภท = document.getElementById("leaveTypeId");
var กล่องเตือน = document.getElementById("ข้อความเตือน");
var ปุ่มบันทึก = document.getElementById("ปุ่มบันทึก");
var ปุ่มAIจัดประเภท = document.getElementById("ปุ่มAIจัดประเภท");
var ป้ายAIจัดประเภท = document.getElementById("ป้ายAIจัดประเภท");
var กล่องเตือนAI = document.getElementById("ข้อความเตือนAI");
var ประเภททั้งหมด = [];

ปุ่มAIจัดประเภท.addEventListener("click", ให้AIจัดประเภท);
ช่องประเภท.addEventListener("change", function () { ป้ายAIจัดประเภท.classList.add("hidden"); });

// ── ปุ่ม AI ระดับ 1: อ่านเหตุผลการลา เทียบกับประเภทที่มีอยู่จริง แล้วเลือกให้ ──
function ให้AIจัดประเภท() {
  กล่องเตือนAI.classList.add("hidden");
  ป้ายAIจัดประเภท.classList.add("hidden");

  var เหตุผล = document.getElementById("reason").value.trim();
  if (!เหตุผล) {
    กล่องเตือนAI.textContent = "⚠️ กรอกเหตุผลการลาก่อน จึงจะให้ AI ช่วยจัดประเภทได้";
    กล่องเตือนAI.classList.remove("hidden");
    return;
  }
  if (ประเภททั้งหมด.length === 0) {
    กล่องเตือนAI.textContent = "⚠️ ยังโหลดรายการประเภทการลาไม่เสร็จ ลองใหม่อีกครั้ง";
    กล่องเตือนAI.classList.remove("hidden");
    return;
  }

  var รายชื่อประเภท = ประเภททั้งหมด.map(function (t) { return t.name; });

  ปุ่มAIจัดประเภท.disabled = true;
  ปุ่มAIจัดประเภท.textContent = "🤖 กำลังจัดประเภทให้...";

  เรียกAI(
    "คุณช่วยจัดประเภทการลาให้ระบบ LeaveEasy ตอบกลับด้วยชื่อประเภทการลา " +
      "ที่ตรงที่สุดเพียงชื่อเดียวจากรายการที่กำหนดเท่านั้น ห้ามตอบชื่ออื่นนอกรายการเด็ดขาด " +
      "ถ้าไม่มีประเภทใดในรายการตรงกับเหตุผลเลย ให้ตอบคำว่า ไม่สามารถจัดประเภทได้ เท่านั้น " +
      "ตอบสั้นที่สุด ไม่ต้องอธิบายเพิ่ม — รายการประเภทที่มีอยู่จริง: " + รายชื่อประเภท.join(", "),
    "เหตุผลการลา: " + เหตุผล
  ).then(function (คำตอบ) {
    var ประเภทที่ตรง = ประเภททั้งหมด.find(function (t) { return t.name === คำตอบ; });
    if (!ประเภทที่ตรง) {
      กล่องเตือนAI.textContent = "⚠️ AI จัดประเภทให้ไม่ได้ — กรุณาเลือกเอง";
      กล่องเตือนAI.classList.remove("hidden");
      return;
    }
    ช่องประเภท.value = ประเภทที่ตรง.id;
    ป้ายAIจัดประเภท.classList.remove("hidden");
  }).catch(function (err) {
    กล่องเตือนAI.textContent = "⚠️ " + err.message;
    กล่องเตือนAI.classList.remove("hidden");
  }).finally(function () {
    ปุ่มAIจัดประเภท.disabled = false;
    ปุ่มAIจัดประเภท.textContent = "🤖 ให้ AI ช่วยจัดประเภทการลา";
  });
}

getDocs(collection(db, "leaveTypes")).then(function (snapshot) {
  ประเภททั้งหมด = snapshot.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  ประเภททั้งหมด.forEach(function (ประเภท) {
    var ตัวเลือก = document.createElement("option");
    ตัวเลือก.value = ประเภท.id;
    ตัวเลือก.textContent = ประเภท.name;
    ช่องประเภท.appendChild(ตัวเลือก);
  });
});

ฟอร์ม.addEventListener("submit", function (e) {
  e.preventDefault();

  var ค่า = {
    title: document.getElementById("title").value.trim(),
    reason: document.getElementById("reason").value.trim(),
    leaveTypeId: ช่องประเภท.value,
    startDate: document.getElementById("startDate").value,
    endDate: document.getElementById("endDate").value
  };

  // ตรวจว่ากรอกครบก่อนบันทึก
  if (!ค่า.title || !ค่า.reason || !ค่า.leaveTypeId || !ค่า.startDate || !ค่า.endDate) {
    เตือน("กรอกไม่ครบ — ต้องกรอกทุกช่องก่อนกดบันทึก");
    return;
  }
  if (ค่า.endDate < ค่า.startDate) {
    เตือน("วันที่สิ้นสุดต้องไม่มาก่อนวันที่เริ่มลา");
    return;
  }

  var ประเภท = ประเภททั้งหมด.find(function (t) { return t.id === ค่า.leaveTypeId; });

  var ผู้ใช้ = auth.currentUser;
  if (!ผู้ใช้) {
    เตือน("กรุณาเข้าสู่ระบบก่อนยื่นใบลา");
    return;
  }

  ปุ่มบันทึก.disabled = true;

  addDoc(collection(db, "leaveRequests"), {
    title: ค่า.title,
    reason: ค่า.reason,
    status: "รอพิจารณา",                       // ใบใหม่เริ่มที่ รอพิจารณา เสมอ
    requesterId: ผู้ใช้.uid, requesterName: ผู้ใช้.displayName || ผู้ใช้.email,
    approverId: "",      approverName: "",
    leaveTypeId: ประเภท.id, leaveTypeName: ประเภท.name,
    startDate: ค่า.startDate,
    endDate: ค่า.endDate,
    createdAt: เวลาตอนนี้()
  }).then(function () {
    location.href = "leave-requests.html";
  }).catch(function (err) {
    ปุ่มบันทึก.disabled = false;
    เตือน("บันทึกไม่สำเร็จ: " + err.message);
  });
});

function เตือน(ข้อความ) {
  กล่องเตือน.textContent = "⚠️ " + ข้อความ;
  กล่องเตือน.classList.remove("hidden");
}
