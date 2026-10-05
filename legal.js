/* legal.js — เติมข้อมูลจาก business.js ลงหน้านโยบายและหน้าติดต่อ (ไม่ต้องแก้ไฟล์นี้) */
(function () {
  "use strict";
  var B = window.BUSINESS || {};
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var val = function (k) { return String(B[k] == null ? "" : B[k]).trim(); };

  // 1) เติมข้อความ
  $$("[data-biz]").forEach(function (el) { var v = val(el.getAttribute("data-biz")); if (v) el.textContent = v; });

  // 2) ซ่อนแถวที่ยังไม่มีข้อมูล
  $$("[data-biz-row]").forEach(function (el) { if (!val(el.getAttribute("data-biz-row"))) el.hidden = true; });

  // 3) ลิงก์ติดต่อ
  var id = val("lineId");
  $$("[data-biz-link]").forEach(function (a) {
    var k = a.getAttribute("data-biz-link"), v = val(k);
    if (!v) return;
    if (k === "lineId") { a.href = "https://line.me/R/ti/p/" + encodeURIComponent(v); a.target = "_blank"; a.rel = "noopener"; }
    if (k === "email") a.href = "mailto:" + v;
    if (k === "phone") a.href = "tel:" + v.replace(/[^0-9+]/g, "");
  });
  $$("[data-line-msg]").forEach(function (a) {
    if (!id) return;
    a.href = "https://line.me/R/oaMessage/" + encodeURIComponent(id) + "/?" + encodeURIComponent(a.getAttribute("data-line-msg"));
    a.target = "_blank"; a.rel = "noopener";
  });

  // 4) สารบัญอัตโนมัติจากหัวข้อ
  var toc = document.getElementById("toc"), art = document.querySelector(".legal__doc");
  if (toc && art) {
    var heads = $$("h2", art);
    toc.innerHTML = heads.map(function (h, i) {
      if (!h.id) h.id = "s" + (i + 1);
      return '<li><a href="#' + h.id + '">' + h.textContent + "</a></li>";
    }).join("");
    if ("IntersectionObserver" in window) {
      var links = $$("a", toc);
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (l) { l.classList.toggle("is-on", l.getAttribute("href") === "#" + e.target.id); });
        });
      }, { rootMargin: "-20% 0px -70% 0px" });
      heads.forEach(function (h) { io.observe(h); });
    }
  }

  // 5) แถบเตือนเฉพาะเจ้าของเว็บ (เครื่องที่เคยเปิด ?notrack=1) — คนทั่วไปไม่เห็น
  try {
    var owner = /[?&]notrack=1/.test(location.search) || (localStorage.getItem("md_notrack") === "1" && !/[?&]notrack=0/.test(location.search));
    if (owner) {
      var need = { email: "อีเมล", phone: "เบอร์โทร", address: "ที่อยู่" };
      var miss = Object.keys(need).filter(function (k) { return !val(k); }).map(function (k) { return need[k]; });
      if (miss.length) {
        var bar = document.createElement("div");
        bar.className = "owner-note";
        bar.textContent = "เห็นเฉพาะคุณหมอ: ยังไม่ได้กรอก " + miss.join(", ") + " — แก้ได้ในไฟล์ business.js";
        document.body.appendChild(bar);
      }
    }
  } catch (e) {}
})();
