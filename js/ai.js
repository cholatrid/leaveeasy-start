// ─────────────────────────────────────────────────────────────
// js/ai.js — ตัวช่วยเรียก AI ผ่าน OpenRouter (สัปดาห์ที่ 8)
// ใช้ร่วมกันทั้งปุ่ม AI ระดับ 1 (จัดประเภทการลา) และระดับ 2 (สรุปใบลา)
//
// 🔴 คีย์อยู่ในโค้ดฝั่งเบราว์เซอร์ ใครกด F12 ก็เห็นได้ — ยอมรับได้เฉพาะคาบเรียนนี้
// เพราะผู้สอนตั้งวงเงินไว้แล้ว ไม่ใช่วิธีที่ถูกต้องสำหรับระบบจริง (ดู BACKLOG.md)
// ─────────────────────────────────────────────────────────────

import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from "./ai-config.local.js";

var หมดเวลาMs = 15000; // สเปคของใบงาน: เรียกไม่สำเร็จหรือรอเกิน 15 วินาที ต้องขึ้นข้อความ ไม่ค้าง

// เรียก AI หนึ่งครั้ง — ส่ง system prompt + ข้อความผู้ใช้ คืนค่าเป็นข้อความตอบกลับ (Promise<string>)
export function เรียกAI(systemPrompt, userPrompt) {
  var ตัวควบคุม = new AbortController();
  var ตัวจับเวลา = setTimeout(function () { ตัวควบคุม.abort(); }, หมดเวลาMs);

  return fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + OPENROUTER_API_KEY,
      "Content-Type": "application/json"
    },
    signal: ตัวควบคุม.signal,
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  }).then(function (res) {
    clearTimeout(ตัวจับเวลา);
    if (!res.ok) {
      throw new Error("AI ตอบกลับผิดพลาด (รหัส " + res.status + ")");
    }
    return res.json();
  }).then(function (data) {
    var ข้อความ = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!ข้อความ) throw new Error("AI ไม่ได้ส่งคำตอบกลับมา");
    return ข้อความ.trim();
  }).catch(function (err) {
    clearTimeout(ตัวจับเวลา);
    if (err.name === "AbortError") {
      throw new Error("เรียก AI ไม่สำเร็จ — รอนานเกิน 15 วินาที");
    }
    throw new Error("เรียก AI ไม่สำเร็จ: " + err.message);
  });
}
