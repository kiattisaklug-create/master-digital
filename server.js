/* server.js — ตัวเปิดเว็บบน Railway (ไม่ต้องแก้ไฟล์นี้)
   เสิร์ฟไฟล์ในโฟลเดอร์นี้ ไม่ต้องติดตั้งอะไรเพิ่ม */
const http = require("http");
const fs = require("fs");
const path = require("path");

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
const BLOCKED = new Set(["server.js", "package.json", ".gitignore"]);

function send(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type || "text/plain; charset=utf-8" });
  res.end(body);
}

http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(req.url.split("?")[0]); }
  catch { return send(res, 400, "Bad request"); }

  if (urlPath === "/") urlPath = "/index.html";
  if (urlPath === "/product") urlPath = "/product.html";

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
    res.writeHead(200, {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": fresh ? "no-cache" : "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}).listen(PORT, () => console.log("MASTER DIGITAL running on port " + PORT));
