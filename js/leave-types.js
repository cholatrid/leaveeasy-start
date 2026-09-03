// ─────────────────────────────────────────────────────────────
// js/leave-types.js — หน้าที่ 4 จัดการประเภทการลา
// เพิ่ม แก้ ลบ เขียนลง Firestore จริง (collection leaveTypes) แบบ real-time
// ─────────────────────────────────────────────────────────────

import { db } from "./firebase-config.js";
import {
  collection, onSnapshot, addDoc,
  doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

var รายการ = [];
var ที่วางตาราง = document.getElementById("ตารางประเภท");
var ช่องชื่อใหม่ = document.getElementById("ชื่อประเภทใหม่");
var กล่องเตือน = document.getElementById("เตือนประเภท");

document.getElementById("ปุ่มเพิ่ม").addEventListener("click", เพิ่มประเภท);

onSnapshot(collection(db, "leaveTypes"), function (snapshot) {
  รายการ = snapshot.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  วาดตาราง();
});

function วาดตาราง() {
  if (รายการ.length === 0) {
    ที่วางตาราง.innerHTML = "<p>ยังไม่มีประเภทการลาในระบบ</p>";
    return;
  }

  var html = "<table><thead><tr><th>ชื่อประเภทการลา</th><th>จัดการ</th></tr></thead><tbody>";
  รายการ.forEach(function (ประเภท) {
    html +=
      "<tr><td>" + esc(ประเภท.name) + "</td><td>" +
      '<button type="button" class="btn-ghost" data-edit="' + esc(ประเภท.id) + '">แก้ไข</button> ' +
      '<button type="button" class="btn-danger" data-del="' + esc(ประเภท.id) + '">ลบ</button>' +
      "</td></tr>";
  });
  html += "</tbody></table>";
  ที่วางตาราง.innerHTML = html;

  ที่วางตาราง.querySelectorAll("[data-edit]").forEach(function (ปุ่ม) {
    ปุ่ม.addEventListener("click", function () { แก้ประเภท(ปุ่ม.dataset.edit); });
  });
  ที่วางตาราง.querySelectorAll("[data-del]").forEach(function (ปุ่ม) {
    ปุ่ม.addEventListener("click", function () { ลบประเภท(ปุ่ม.dataset.del); });
  });
}

function เพิ่มประเภท() {
  var ชื่อ = ช่องชื่อใหม่.value.trim();
  if (!ชื่อ) {
    กล่องเตือน.textContent = "⚠️ พิมพ์ชื่อประเภทการลาก่อน จึงจะเพิ่มได้";
    กล่องเตือน.classList.remove("hidden");
    return;
  }
  กล่องเตือน.classList.add("hidden");
  addDoc(collection(db, "leaveTypes"), { name: ชื่อ }).then(function () {
    ช่องชื่อใหม่.value = "";
  }).catch(function (err) {
    กล่องเตือน.textContent = "⚠️ เพิ่มไม่สำเร็จ: " + err.message;
    กล่องเตือน.classList.remove("hidden");
  });
}

function แก้ประเภท(id) {
  var ประเภท = รายการ.find(function (t) { return t.id === id; });
  var ชื่อใหม่ = prompt("แก้ชื่อประเภทการลา", ประเภท.name);
  if (ชื่อใหม่ === null) return;              // กดยกเลิก
  if (!ชื่อใหม่.trim()) { alert("ชื่อประเภทการลาว่างเปล่าไม่ได้"); return; }
  updateDoc(doc(db, "leaveTypes", id), { name: ชื่อใหม่.trim() }).catch(function (err) {
    alert("แก้ไม่สำเร็จ: " + err.message);
  });
}

function ลบประเภท(id) {
  var ประเภท = รายการ.find(function (t) { return t.id === id; });
  if (!confirm('ยืนยันการลบประเภท "' + ประเภท.name + '" หรือไม่')) return;
  deleteDoc(doc(db, "leaveTypes", id)).catch(function (err) {
    alert("ลบไม่สำเร็จ: " + err.message);
  });
}
