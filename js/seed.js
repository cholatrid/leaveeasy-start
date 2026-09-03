// ─────────────────────────────────────────────────────────────
// js/seed.js — คัดลอกข้อมูลตัวอย่างจาก window.LEAVE_DATA (js/data.js)
// ไปลง Firestore ครั้งเดียวตอนตั้งค่าฐานข้อมูล ใช้ setDoc ทับ id เดิมเสมอ
// จึงกดซ้ำได้โดยไม่สร้างข้อมูลซ้ำ
// ─────────────────────────────────────────────────────────────

import { db } from "./firebase-config.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

var ปุ่ม = document.getElementById("ปุ่มseed");
var กล่องผลลัพธ์ = document.getElementById("ผลลัพธ์seed");

ปุ่ม.addEventListener("click", seed);

async function seed() {
  ปุ่ม.disabled = true;
  บันทึกผล("กำลัง seed ข้อมูล…");

  try {
    for (var ผู้ใช้ of window.LEAVE_DATA.users) {
      await setDoc(doc(db, "users", ผู้ใช้.id), {
        name: ผู้ใช้.name, email: ผู้ใช้.email, role: ผู้ใช้.role
      });
    }
    บันทึกผล("✅ users " + window.LEAVE_DATA.users.length + " คน");

    for (var ประเภท of window.LEAVE_DATA.leaveTypes) {
      await setDoc(doc(db, "leaveTypes", ประเภท.id), { name: ประเภท.name });
    }
    บันทึกผล("✅ leaveTypes " + window.LEAVE_DATA.leaveTypes.length + " ประเภท");

    for (var ใบ of window.LEAVE_DATA.leaveRequests) {
      await setDoc(doc(db, "leaveRequests", ใบ.id), {
        title: ใบ.title, reason: ใบ.reason, status: ใบ.status,
        requesterId: ใบ.requesterId, requesterName: ใบ.requesterName,
        approverId: ใบ.approverId, approverName: ใบ.approverName,
        leaveTypeId: ใบ.leaveTypeId, leaveTypeName: ใบ.leaveTypeName,
        startDate: ใบ.startDate, endDate: ใบ.endDate, createdAt: ใบ.createdAt
      });
    }
    บันทึกผล("✅ leaveRequests " + window.LEAVE_DATA.leaveRequests.length + " ใบ");

    for (var ความเห็น of window.LEAVE_DATA.approvals) {
      await setDoc(doc(db, "leaveRequests", ความเห็น.requestId, "approvals", ความเห็น.id), {
        authorId: ความเห็น.authorId, authorName: ความเห็น.authorName,
        message: ความเห็น.message, createdAt: ความเห็น.createdAt
      });
    }
    บันทึกผล("✅ approvals " + window.LEAVE_DATA.approvals.length + " รายการ");

    บันทึกผล("🎉 เสร็จแล้ว — ไปเปิด Firebase Console เพื่อตรวจข้อมูลได้เลย");
  } catch (err) {
    บันทึกผล("❌ ผิดพลาด: " + err.message);
  } finally {
    ปุ่ม.disabled = false;
  }
}

function บันทึกผล(ข้อความ) {
  กล่องผลลัพธ์.textContent += (กล่องผลลัพธ์.textContent ? "\n" : "") + ข้อความ;
}
