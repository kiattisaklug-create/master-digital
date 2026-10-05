/* notify.js — นับผู้เข้าชม + แจ้งเตือนผ่าน LINE OA (ไม่ต้องแก้ไฟล์นี้)

   ค่าที่ตั้งใน Railway → Variables
     LINE_CHANNEL_ACCESS_TOKEN  (จำเป็น)  จาก LINE Developers
     LINE_CHANNEL_SECRET        (จำเป็น)  จาก LINE Developers
     NOTIFY_CODE                (จำเป็น)  รหัสลับที่คุณตั้งเอง ส่งรหัสนี้เข้า LINE OA เพื่อเริ่มรับแจ้งเตือน
     NOTIFY_GAP_MINUTES         (ไม่บังคับ) 0 = แจ้งทันทีทุกคน, 30 = รวมยอดแจ้งทุก 30 นาที
   ที่เก็บข้อมูลถาวร: Railway Volume (mount path /data) */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TOKEN = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
const SECRET = (process.env.LINE_CHANNEL_SECRET || "").trim();
const CODE = (process.env.NOTIFY_CODE || "").trim();
const GAP_MIN = Math.max(0, Number(process.env.NOTIFY_GAP_MINUTES || 0) || 0);
const API = process.env.LINE_API_BASE || "https://api.line.me";
const SITE_NAME = process.env.SITE_NAME || "MASTER DIGITAL";
const SESSION_MS = 30 * 60 * 1000;   // คนเดิมกลับมาภายใน 30 นาที = การเข้าชมครั้งเดิม
const KEEP_DAYS = 35;

const DATA_DIR = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, "data");
const FILE = path.join(DATA_DIR, "visits.json");
const PERSISTENT = !!(process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH);

/* ---------- ข้อมูล ---------- */
let db = { salt: "", days: {}, sessions: {}, recipients: [], lastSent: 0, pending: [] };
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(FILE)) db = Object.assign(db, JSON.parse(fs.readFileSync(FILE, "utf8")));
} catch (e) { console.error("[notify] อ่านไฟล์ข้อมูลไม่ได้:", e.message); }
if (!db.salt) db.salt = crypto.randomBytes(16).toString("hex");
if (!PERSISTENT) console.warn("[notify] ยังไม่ได้ผูก Volume — ยอดสะสมจะหายเมื่อ deploy ใหม่");

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const tmp = FILE + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(db));
      fs.renameSync(tmp, FILE);
    } catch (e) { console.error("[notify] บันทึกไม่ได้:", e.message); }
  }, 400);
}

/* ---------- วันที่ตามเวลาไทย ---------- */
const TH = 7 * 3600 * 1000;
const dayKey = (t) => new Date(t + TH).toISOString().slice(0, 10);
const timeTH = (t) => new Date(t + TH).toISOString().slice(11, 16);
const lastDays = (n, now) => Array.from({ length: n }, (_, i) => dayKey(now - i * 86400000));

function prune(now) {
  const keep = new Set(lastDays(KEEP_DAYS, now));
  Object.keys(db.days).forEach((k) => { if (!keep.has(k)) delete db.days[k]; });
  Object.keys(db.sessions).forEach((h) => { if (now - db.sessions[h] > SESSION_MS * 2) delete db.sessions[h]; });
}

function totals(n, now) {
  const people = new Set(); let visits = 0;
  lastDays(n, now).forEach((k) => {
    const d = db.days[k]; if (!d) return;
    visits += d.visits || 0; (d.visitors || []).forEach((h) => people.add(h));
  });
  return { people: people.size, visits };
}

/* ---------- ที่มาของผู้เข้าชม ---------- */
function source(ref) {
  const r = String(ref || "").toLowerCase();
  if (!r) return "เข้าตรง / LINE";
  if (r.includes("tiktok")) return "TikTok";
  if (r.includes("facebook") || r.includes("fb.")) return "Facebook";
  if (r.includes("instagram")) return "Instagram";
  if (r.includes("google")) return "Google";
  if (r.includes("line.me")) return "LINE";
  if (r.includes("youtube")) return "YouTube";
  try { return new URL(ref).hostname; } catch { return "เว็บอื่น"; }
}

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|curl|wget|python|monitor/i;

/* ---------- บันทึกการเข้าชม (เรียกจาก server.js) ---------- */
function recordVisit(info) {
  if (!info || BOT.test(info.ua || "")) return { counted: false };
  const now = Date.now();
  const hash = crypto.createHash("sha256").update(db.salt + "|" + info.ip + "|" + info.ua).digest("hex").slice(0, 20);
  const k = dayKey(now);
  const d = db.days[k] || (db.days[k] = { visits: 0, views: 0, visitors: [], pages: {} });
  d.views++;
  const page = String(info.page || "หน้าแรก").slice(0, 60);
  d.pages[page] = (d.pages[page] || 0) + 1;
  if (!d.visitors.includes(hash)) d.visitors.push(hash);

  const last = db.sessions[hash] || 0;
  db.sessions[hash] = now;
  const isNew = now - last > SESSION_MS;
  if (isNew) {
    d.visits++;
    db.pending.push({ t: now, page, src: source(info.ref) });
    if (db.pending.length > 50) db.pending = db.pending.slice(-50);
  }
  prune(now); save();
  if (isNew) flush();
  return { counted: true, newVisit: isNew };
}

/* ---------- ข้อความแจ้งเตือน ---------- */
function statsText(now) {
  const t = totals(1, now), w = totals(7, now), m = totals(30, now);
  return "📊 ยอดสะสม\n" +
    "วันนี้: " + t.people + " คน (" + t.visits + " ครั้ง)\n" +
    "7 วัน: " + w.people + " คน (" + w.visits + " ครั้ง)\n" +
    "30 วัน: " + m.people + " คน (" + m.visits + " ครั้ง)";
}
function visitText(list, now) {
  let head;
  if (list.length === 1) {
    const v = list[0];
    head = "👀 มีผู้สนใจเข้าชมเว็บ " + SITE_NAME + "\n" +
      "หน้า: " + v.page + "\n" + "มาจาก: " + v.src + "\n" + "เวลา: " + timeTH(v.t) + " น.";
  } else {
    const pages = {};
    list.forEach((v) => { pages[v.page] = (pages[v.page] || 0) + 1; });
    head = "👀 มีผู้เข้าชมใหม่ " + list.length + " ครั้ง\n" +
      "ช่วง " + timeTH(list[0].t) + "–" + timeTH(list[list.length - 1].t) + " น.\n" +
      Object.keys(pages).map((p) => "• " + p + " " + pages[p] + " ครั้ง").join("\n");
  }
  return head + "\n\n" + statsText(now);
}

/* ---------- ส่ง LINE ---------- */
async function line(pathname, body) {
  if (!TOKEN) return false;
  try {
    const r = await fetch(API + pathname, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + TOKEN },
      body: JSON.stringify(body)
    });
    if (!r.ok) console.error("[notify] LINE ตอบกลับ", r.status, await r.text().catch(() => ""));
    return r.ok;
  } catch (e) { console.error("[notify] ส่ง LINE ไม่ได้:", e.message); return false; }
}
const push = (to, text) => line("/v2/bot/message/push", { to, messages: [{ type: "text", text }] });
const reply = (token, text) => line("/v2/bot/message/reply", { replyToken: token, messages: [{ type: "text", text }] });

let sending = false;
async function flush(force) {
  if (sending || !db.pending.length || !TOKEN || !db.recipients.length) return;
  const now = Date.now();
  if (!force && GAP_MIN > 0 && now - db.lastSent < GAP_MIN * 60000) return;
  sending = true;
  const batch = db.pending.slice();
  const text = visitText(batch, now);
  const results = await Promise.all(db.recipients.map((u) => push(u, text)));
  sending = false;
  if (results.some(Boolean)) {
    db.pending = db.pending.slice(batch.length);   // ลบเฉพาะที่ส่งแล้ว ของใหม่ที่เข้ามาระหว่างส่งไม่หาย
    db.lastSent = now; save();
    if (db.pending.length) flush();
  }
}
setInterval(() => flush(), 60 * 1000).unref();

/* ---------- Webhook รับข้อความจาก LINE ---------- */
function validSignature(raw, sig) {
  if (!SECRET || !sig) return false;
  const mac = crypto.createHmac("sha256", SECRET).update(raw).digest("base64");
  const a = Buffer.from(mac), b = Buffer.from(String(sig));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function handleWebhook(raw, sig) {
  if (!validSignature(raw, sig)) return 401;
  let body; try { body = JSON.parse(raw.toString("utf8")); } catch { return 400; }
  for (const ev of body.events || []) {
    if (ev.type !== "message" || !ev.message || ev.message.type !== "text") continue;
    const uid = ev.source && ev.source.userId; if (!uid) continue;
    const text = String(ev.message.text || "").trim();
    const isRecipient = db.recipients.includes(uid);

    if (CODE && text === CODE) {
      if (!isRecipient) { db.recipients.push(uid); save(); }
      await reply(ev.replyToken, "✅ เชื่อมต่อสำเร็จ\nคุณจะได้รับแจ้งเตือนทุกครั้งที่มีผู้เข้าชมเว็บ " + SITE_NAME +
        "\n\nคำสั่งที่ใช้ได้\n• พิมพ์ ยอด = ดูยอดผู้เข้าชมตอนนี้\n• พิมพ์ ยกเลิก = หยุดรับแจ้งเตือน\n\n" + statsText(Date.now()));
      flush(true);
    } else if (isRecipient && text === "ยอด") {
      await reply(ev.replyToken, statsText(Date.now()));
    } else if (isRecipient && text === "ยกเลิก") {
      db.recipients = db.recipients.filter((u) => u !== uid); save();
      await reply(ev.replyToken, "หยุดแจ้งเตือนแล้ว ส่งรหัสเดิมอีกครั้งเมื่อต้องการรับต่อ");
    }
    // ข้อความอื่นจากคนทั่วไป ระบบไม่ตอบ
  }
  return 200;
}

function status() {
  return { lineReady: !!(TOKEN && SECRET && CODE), recipients: db.recipients.length, persistent: PERSISTENT, gapMinutes: GAP_MIN };
}

module.exports = { recordVisit, handleWebhook, status, _db: () => db };
