/* server.js — ตัวเปิดเว็บบน Railway (ไม่ต้องแก้ไฟล์นี้)
   เสิร์ฟไฟล์ในโฟลเดอร์นี้ ไม่ต้องติดตั้งอะไรเพิ่ม */
const http = require("http");
const fs = require("fs");
const path = require("path");

const notify = require("./notify");
const vm = require("vm");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2"
};

// ไฟล์ที่ไม่ให้คนภายนอกเปิดดู
const BLOCKED = new Set(["server.js", "notify.js", "package.json", ".gitignore"]);

// อ่านชื่อโปรแกรมจาก content.js เพื่อใช้ในข้อความแจ้งเตือน
let names = {}, namesAt = 0;
function productName(id) {
  if (Date.now() - namesAt > 60000) {
    try {
      const box = { window: {} };
      vm.runInNewContext(fs.readFileSync(path.join(ROOT, "content.js"), "utf8"), box, { timeout: 200 });
      names = {};
      (box.window.SITE && box.window.SITE.products || []).forEach((p) => { if (p && p.id) names[p.id] = String(p.name || p.id); });
      namesAt = Date.now();
    } catch (e) { console.error("อ่าน content.js ไม่ได้:", e.message); }
  }
  return names[id];
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on("data", (c) => { size += c.length; if (size > limit) { reject(new Error("too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// กันการยิงซ้ำ: ไม่เกิน 30 ครั้งต่อนาทีต่อเครื่อง
const hits = new Map();
function limited(ip) {
  const now = Date.now(), h = hits.get(ip) || [];
  const recent = h.filter((t) => now - t < 60000); recent.push(now); hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 30;
}
const clientIp = (req) => String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();

async function api(req, res, urlPath) {
  if (urlPath === "/api/visit" && req.method === "POST") {
    try {
      const ip = clientIp(req);
      if (limited(ip)) return send(res, 429, "slow down");
      const body = JSON.parse((await readBody(req, 4096)).toString("utf8") || "{}");
      const PAGES = { contact: "ติดต่อเรา", refund: "นโยบายคืนเงิน", terms: "เงื่อนไขการใช้บริการ", privacy: "นโยบายความเป็นส่วนตัว" };
      const page = body.page === "product" ? (productName(String(body.id || "")) || "หน้ารายละเอียดโปรแกรม") : (PAGES[body.page] || "หน้าแรก");
      notify.recordVisit({ ip, ua: String(req.headers["user-agent"] || ""), page, ref: String(body.ref || "").slice(0, 300) });
    } catch (e) { /* ข้อมูลผิดรูปแบบ ไม่นับ */ }
    return send(res, 204, "");
  }
  if (urlPath === "/api/line-webhook" && req.method === "POST") {
    try {
      const raw = await readBody(req, 1024 * 1024);
      const code = await notify.handleWebhook(raw, req.headers["x-line-signature"]);
      return send(res, code, code === 200 ? "ok" : "rejected");
    } catch (e) { return send(res, 400, "bad request"); }
  }
  if (urlPath === "/api/notify-status") {
    return send(res, 200, JSON.stringify(notify.status()), TYPES[".json"]);
  }
  return send(res, 404, "Not found");
}

function send(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type || "text/plain; charset=utf-8" });
  res.end(body);
}

http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(req.url.split("?")[0]); }
  catch { return send(res, 400, "Bad request"); }

  if (urlPath.startsWith("/api/")) return api(req, res, urlPath);
  if (urlPath === "/") urlPath = "/index.html";
  if (urlPath === "/product") urlPath = "/product.html";
  if (["/contact", "/refund", "/terms", "/privacy"].includes(urlPath)) urlPath += ".html";

  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT) || BLOCKED.has(path.basename(filePath)) || path.basename(filePath).startsWith(".")) {
    return send(res, 404, "Not found");
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      return fs.readFile(path.join(ROOT, "index.html"), (e2, html) =>
        e2 ? send(res, 404, "Not found") : send(res, 404, html, TYPES[".html"]));
    }
    const ext = path.extname(filePath).toLowerCase();
    // content.js / html ไม่เก็บ cache นาน เพื่อให้แก้ข้อมูลแล้วเห็นผลทันที
    const fresh = ext === ".html" || path.basename(filePath) === "content.js";
    const headers = {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Accept-Ranges": "bytes",
      // วิดีโอ/รูปมีชื่อไฟล์ใหม่ทุกครั้งที่อัปโหลด จึงเก็บ cache ได้นาน
      "Cache-Control": fresh ? "no-cache" : (filePath.includes(path.sep + "videos" + path.sep) ? "public, max-age=2592000, immutable" : "public, max-age=86400"),
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    };
    // รองรับการเล่นวิดีโอทีละช่วง (จำเป็นสำหรับ iPhone / Safari)
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = m && m[1] ? parseInt(m[1], 10) : 0;
      let end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
      if (m && !m[1] && m[2]) { start = Math.max(0, stat.size - parseInt(m[2], 10)); end = stat.size - 1; }
      if (!m || start >= stat.size || start > end) {
        res.writeHead(416, { "Content-Range": "bytes */" + stat.size });
        return res.end();
      }
      end = Math.min(end, stat.size - 1);
      headers["Content-Range"] = "bytes " + start + "-" + end + "/" + stat.size;
      headers["Content-Length"] = end - start + 1;
      res.writeHead(206, headers);
      if (req.method === "HEAD") return res.end();
      return fs.createReadStream(filePath, { start, end }).pipe(res);
    }
    headers["Content-Length"] = stat.size;
    res.writeHead(200, headers);
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}).listen(PORT, () => console.log("MASTER DIGITAL running on port " + PORT));
