/* pulse.js — ส่งสัญญาณ "มีคนเข้าชม" ไปที่ server (ไม่ต้องแก้ไฟล์นี้)
   เจ้าของเว็บไม่อยากให้นับตัวเอง: เปิดเว็บครั้งเดียวด้วย ?notrack=1 ท้ายลิงก์
   อยากให้นับกลับมา: เปิดด้วย ?notrack=0 */
(function () {
  try {
    var q = new URLSearchParams(location.search);
    if (q.get("notrack") === "1") localStorage.setItem("md_notrack", "1");
    if (q.get("notrack") === "0") localStorage.removeItem("md_notrack");
    if (localStorage.getItem("md_notrack") === "1") return;
  } catch (e) {}
  if (location.protocol === "file:") return;   // เปิดไฟล์บนคอมเฉยๆ ไม่นับ
  var isProduct = document.body.getAttribute("data-page") === "product";
  var data = JSON.stringify({
    page: isProduct ? "product" : "home",
    id: isProduct ? new URLSearchParams(location.search).get("id") : "",
    ref: document.referrer && document.referrer.indexOf(location.host) === -1 ? document.referrer : ""
  });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon("/api/visit", new Blob([data], { type: "application/json" }));
    else fetch("/api/visit", { method: "POST", body: data, headers: { "Content-Type": "application/json" }, keepalive: true });
  } catch (e) {}
})();
