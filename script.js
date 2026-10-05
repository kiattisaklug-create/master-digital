/* script.js — อ่านข้อมูลจาก content.js มาแสดงบนเว็บ (ไม่ต้องแก้ไฟล์นี้) */
(function () {
  "use strict";
  var S = window.SITE || {};
  var C = S.contact || {};
  var arr = function (x) { return Array.isArray(x) ? x : []; };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";

  var products = arr(S.products).filter(function (p) { return p && p.id && !p.hidden; });
  var cats = arr(S.categories);
  var catName = function (id) { var c = cats.filter(function (x) { return x.id === id; })[0]; return c ? c.name : ""; };
  var statusName = function (s) { return (S.statusNames || {})[s] || ""; };
  var lineId = (C.lineId || "").trim();
  var lineAdd = lineId ? "https://line.me/R/ti/p/" + encodeURIComponent(lineId) : "";
  var lineMsg = function (text) {
    return lineId ? "https://line.me/R/oaMessage/" + encodeURIComponent(lineId) + "/?" + encodeURIComponent(text) : "";
  };
  var productUrl = function (p) { return "product.html?id=" + encodeURIComponent(p.id); };

  /* ---------- ข้อความทั่วไป ---------- */
  $$("[data-bind]").forEach(function (el) {
    var v = S[el.getAttribute("data-bind")];
    if (v) el.textContent = v;
  });
  $$(".js-lineid").forEach(function (el) { el.textContent = lineId; });
  $$(".js-line").forEach(function (el) {
    if (lineAdd) { el.href = lineAdd; el.target = "_blank"; el.rel = "noopener"; }
  });
  if (C.lineQr) $$(".js-qr").forEach(function (el) { el.src = C.lineQr; });
  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();

  /* ---------- เมนูมือถือ + แถบด้านบน ---------- */
  var top = $("#top"), menuBtn = $("#menuBtn"), nav = $("#nav"), floatBtn = $(".float-line");
  var solidAlways = top && top.classList.contains("is-solid");
  function onScroll() {
    var y = window.scrollY;
    if (top && !solidAlways) top.classList.toggle("is-solid", y > 40);
    if (floatBtn) floatBtn.classList.toggle("is-on", y > 500);
  }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = menuBtn.getAttribute("aria-expanded") !== "true";
      menuBtn.setAttribute("aria-expanded", open); nav.classList.toggle("is-open", open);
      if (open && top) top.classList.add("is-solid");
    });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", function () {
      menuBtn.setAttribute("aria-expanded", "false"); nav.classList.remove("is-open");
    }); });
  }

  /* ---------- แสงทองตามเมาส์บนการ์ด ---------- */
  document.addEventListener("pointermove", function (e) {
    var card = e.target.closest && e.target.closest(".card, .feature");
    if (!card) return;
    var r = card.getBoundingClientRect();
    card.style.setProperty("--mx", (e.clientX - r.left) + "px");
    card.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });

  /* ---------- ชิ้นส่วนการ์ด ---------- */
  function chip(s) { return statusName(s) ? '<span class="chip chip--' + esc(s) + '">' + esc(statusName(s)) + "</span>" : ""; }
  function card(p, i) {
    return '<a class="card" style="--i:' + (i || 0) + '" href="' + productUrl(p) + '">' +
      '<div class="card__top"><span class="medal">' + esc(p.mark || (p.name || "?").slice(0, 2)) + "</span>" + chip(p.status) + "</div>" +
      '<h3 class="card__name">' + esc(p.name) + "</h3>" +
      '<p class="card__tag">' + esc(p.tagline) + "</p>" +
      '<div class="card__foot"><span class="ver">' + esc(p.version) + '</span><span class="card__more">ดูรายละเอียด</span></div></a>';
  }

  /* ===================== หน้าแรก ===================== */
  if (document.body.getAttribute("data-page") === "home") {
    var featured = products.filter(function (p) { return p.featured; })[0];

    // ตัวกรองหมวด
    var filters = $("#filters"), grid = $("#grid"), feat = $("#featured"), current = "all";
    function count(id) { return products.filter(function (p) { return id === "all" || p.category === id; }).length; }
    var tabs = [{ id: "all", name: "ทั้งหมด" }].concat(cats).filter(function (c) { return count(c.id) > 0; });
    filters.innerHTML = tabs.map(function (c) {
      return '<button class="filter" role="tab" data-cat="' + esc(c.id) + '" aria-selected="' + (c.id === "all") + '">' + esc(c.name) + "<b>" + count(c.id) + "</b></button>";
    }).join("");

    function renderGrid() {
      var showFeat = featured && (current === "all" || featured.category === current);
      feat.innerHTML = showFeat ?
        '<a class="feature" href="' + productUrl(featured) + '">' +
          '<span class="medal">' + esc(featured.mark) + "</span>" +
          '<div><p class="feature__label">' + esc(catName(featured.category)) + '</p><h3 class="feature__name">' + esc(featured.name) + '</h3><p class="feature__tag">' + esc(featured.tagline) + "</p></div>" +
          '<div class="feature__side">' + chip(featured.status) + '<span class="btn btn--gold btn--sm">ดูรายละเอียด</span></div></a>' : "";
      var list = products.filter(function (p) { return p !== (showFeat ? featured : null) && (current === "all" || p.category === current); });
      grid.innerHTML = list.map(card).join("");
      if (!reduce) requestAnimationFrame(function () { $$(".card", grid).forEach(function (c) { c.classList.add("is-in"); }); });
    }
    filters.addEventListener("click", function (e) {
      var b = e.target.closest(".filter"); if (!b) return;
      current = b.getAttribute("data-cat");
      $$(".filter", filters).forEach(function (x) { x.setAttribute("aria-selected", x === b); });
      renderGrid();
    });
    renderGrid();

    // ตารางเวอร์ชัน
    var vt = $("#vtable");
    vt.innerHTML = '<div class="vrow vrow--head" role="row"><span>โปรแกรม</span><span>เวอร์ชัน</span><span>เปลี่ยนแปลงล่าสุด</span><span style="text-align:right">วันที่</span></div>' +
      products.map(function (p) {
        var last = arr(p.changelog)[0] || {};
        return '<a class="vrow" role="row" href="' + productUrl(p) + '"><span class="vrow__name">' + esc(p.name) + '</span><span class="ver">' + esc(p.version) +
          '</span><span class="vrow__note">' + esc(last.text || "") + '</span><span class="vrow__date">' + esc(last.date || "") + "</span></a>";
      }).join("");

    // ผู้พัฒนา
    $("#aboutPoints").innerHTML = arr(S.aboutPoints).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");

    // FAQ
    $("#faqList").innerHTML = arr(S.faq).map(function (f) {
      return '<details class="qa"><summary>' + esc(f.q) + '</summary><div class="qa__a"><p>' + esc(f.a) + "</p></div></details>";
    }).join("");
    if (!arr(S.faq).length) $("#faq").hidden = true;

    // ช่องทางอื่น
    var ch = [];
    if (C.phone) ch.push('<a href="tel:' + esc(C.phone.replace(/[^0-9+]/g, "")) + '">โทร ' + esc(C.phone) + "</a>");
    if (C.email) ch.push('<a href="mailto:' + esc(C.email) + '">' + esc(C.email) + "</a>");
    if (C.tiktok) ch.push('<a href="' + esc(C.tiktok) + '" target="_blank" rel="noopener">TikTok</a>');
    if (C.instagram) ch.push('<a href="' + esc(C.instagram) + '" target="_blank" rel="noopener">Instagram</a>');
    if (C.facebook) ch.push('<a href="' + esc(C.facebook) + '" target="_blank" rel="noopener">Facebook</a>');
    $("#channels").innerHTML = ch.join("");

    buildDial();
    buildSeal();
    requestAnimationFrame(function () { setTimeout(function () { document.body.classList.add("is-ready"); }, 60); });
  }

  /* ---------- หน้าปัดทอง (hero) ---------- */
  function el(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function guilloche(parent, petals, rx, ry, cls) {
    var g = el("g", { "class": cls }, parent);
    for (var i = 0; i < petals; i++) el("ellipse", { cx: 0, cy: 0, rx: rx, ry: ry, "class": "guil", transform: "rotate(" + (i * 180 / petals) + ")" }, g);
    return g;
  }
  function buildDial() {
    var svg = $(".dial__svg"); if (!svg || !products.length) return;
    var defs = el("defs", {}, svg);
    var lg = el("linearGradient", { id: "handGrad", gradientUnits: "userSpaceOnUse", x1: "0", y1: "-150", x2: "0", y2: "-268" }, defs);
    el("stop", { offset: "0", "stop-color": "#9C7A3C", "stop-opacity": "0" }, lg);
    el("stop", { offset: "1", "stop-color": "#E8CC8C" }, lg);

    guilloche(svg, 36, 236, 92, "spin");
    guilloche(svg, 24, 150, 62, "spin-rev");

    [[262, 1, 0], [250, .6, .25], [186, .6, .5]].forEach(function (r) {
      var len = Math.ceil(2 * Math.PI * r[0]);
      var c = el("circle", { r: r[0], "class": "ring draw", "stroke-width": r[1], style: "--len:" + len + ";animation-delay:" + r[2] + "s" }, svg);
      if (reduce) c.style.strokeDashoffset = 0;
    });
    var ticks = el("g", {}, svg);
    for (var t = 0; t < 120; t++) {
      var long = t % 10 === 0, a = t * 3 * Math.PI / 180;
      var r1 = 250, r2 = long ? 238 : 244;
      el("line", { x1: Math.sin(a) * r1, y1: -Math.cos(a) * r1, x2: Math.sin(a) * r2, y2: -Math.cos(a) * r2, "class": "tick" }, ticks);
    }

    var hand = el("g", { "class": "hand" }, svg);
    el("line", { x1: 0, y1: -150, x2: 0, y2: -268 }, hand);

    var n = products.length, R = 290, markers = [];
    products.forEach(function (p, i) {
      var ang = i * 360 / n, a = ang * Math.PI / 180;
      var a11y = el("a", { href: productUrl(p), "class": "marker", tabindex: "0", "aria-label": p.name, style: "transition-delay:" + (1.2 + i * .06) + "s" }, svg);
      el("circle", { cx: Math.sin(a) * R, cy: -Math.cos(a) * R, r: 21 }, a11y);
      var tx = el("text", { x: Math.sin(a) * R, y: -Math.cos(a) * R }, a11y);
      tx.textContent = p.mark || p.name.slice(0, 2);
      markers.push({ node: a11y, p: p, ang: ang });
    });

    var face = $("#dialFace"), fc = $("#dialCat"), fn = $("#dialName"), ft = $("#dialTag");
    var active = -1, turned = 0, timer = null, paused = false;
    function show(i) {
      if (i === active) return;
      var m = markers[i];
      var delta = ((m.ang - (turned % 360)) + 360) % 360;
      turned += delta;
      hand.style.transform = "rotate(" + turned + "deg)";
      markers.forEach(function (x, j) { x.node.classList.toggle("is-on", j === i); });
      active = i;
      face.classList.add("is-swap");
      setTimeout(function () {
        fc.textContent = catName(m.p.category); fn.textContent = m.p.name; ft.textContent = m.p.tagline;
        face.href = productUrl(m.p); face.setAttribute("aria-label", "ดูรายละเอียด " + m.p.name);
        face.classList.remove("is-swap");
      }, active === -1 ? 0 : 280);
    }
    function next() { if (!paused) show((active + 1) % n); }
    markers.forEach(function (m, i) {
      m.node.addEventListener("mouseenter", function () { paused = true; show(i); });
      m.node.addEventListener("focus", function () { paused = true; show(i); });
      m.node.addEventListener("mouseleave", function () { paused = false; });
      m.node.addEventListener("blur", function () { paused = false; });
    });
    face.addEventListener("mouseenter", function () { paused = true; });
    face.addEventListener("mouseleave", function () { paused = false; });
    var startIdx = Math.max(0, products.indexOf(products.filter(function (p) { return p.featured; })[0]));
    setTimeout(function () { show(startIdx); }, reduce ? 0 : 1400);
    timer = setInterval(next, 3600);
    document.addEventListener("visibilitychange", function () { paused = document.hidden; });
  }

  /* ---------- ตราประทับส่วนผู้พัฒนา ---------- */
  function buildSeal() {
    var svg = $("#seal"); if (!svg) return;
    guilloche(svg, 30, 92, 40, "spin");
    el("circle", { r: 104, "class": "ring", "stroke-width": 1, fill: "none", stroke: "#C9A55C" }, svg);
    el("circle", { r: 98, fill: "none", stroke: "#C9A55C", "stroke-width": .5, opacity: .6 }, svg);
    el("circle", { r: 54, fill: "#191612", stroke: "#C9A55C", "stroke-width": 1 }, svg);
    var t = el("text", { x: 0, y: 2, "text-anchor": "middle", "dominant-baseline": "central", fill: "#E8CC8C", style: "font:500 30px 'Playfair Display',Georgia,serif;letter-spacing:.04em" }, svg);
    t.textContent = S.brandShort || "MD";
    $$(".guil", svg).forEach(function (g) { g.style.opacity = .5; g.style.strokeWidth = .8; });
  }

  /* ===================== หน้ารายละเอียด ===================== */
  if (document.body.getAttribute("data-page") === "product") {
    var id = new URLSearchParams(location.search).get("id");
    var p = products.filter(function (x) { return x.id === id; })[0];
    if (!p) {
      $("#product").hidden = true; $("#notFound").hidden = false;
    } else {
      document.title = p.name + " — " + (S.brand || "");
      $("#pMark").textContent = p.mark || p.name.slice(0, 2);
      $("#pStatus").className = "chip chip--" + p.status; $("#pStatus").textContent = statusName(p.status);
      if (!statusName(p.status)) $("#pStatus").hidden = true;
      $("#pVersion").textContent = p.version || "";
      $("#pCat").textContent = catName(p.category);
      $("#pName").textContent = p.name;
      $("#pTag").textContent = p.tagline || "";
      $("#pDesc").textContent = p.description || p.tagline || "";
      $("#pAudience").textContent = p.audience || "";
      if (!p.audience) $("#pAudience").parentNode.hidden = true;
      $("#pFeatures").innerHTML = arr(p.features).map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("");
      $("#pLog").innerHTML = arr(p.changelog).map(function (c) {
        return "<li><b>" + esc(c.version) + "</b><span>" + esc(c.date) + "</span><p>" + esc(c.text) + "</p></li>";
      }).join("");
      if (!arr(p.changelog).length) $("#pLog").parentNode.hidden = true;
      if (p.image) { $("#pImg").src = p.image; $("#pImg").alt = "หน้าจอโปรแกรม " + p.name; $("#pShot").hidden = false; }
      if (p.link) { $("#pLink").href = p.link; $("#pLink").hidden = false; }

      var ask = lineMsg("สนใจโปรแกรม " + p.name + " ขอรายละเอียดเพิ่มเติม");
      if (ask) { $("#pAsk").href = ask; $("#pAsk").target = "_blank"; $("#pAsk").rel = "noopener"; }
      $("#pPlans").innerHTML = arr(p.plans).map(function (pl) {
        var link = lineMsg("สนใจ " + p.name + " แพ็กเกจ " + pl.name);
        return '<div class="plan"><h3 class="plan__name">' + esc(pl.name) + '</h3><p class="plan__price">' + esc(pl.price) + '</p><p class="plan__note">' + esc(pl.note || "") + "</p>" +
          (link ? '<a class="btn btn--gold btn--sm" href="' + link + '" target="_blank" rel="noopener">ขอใบเสนอราคา</a>' : "") + "</div>";
      }).join("");
      if (!arr(p.plans).length) $(".p-plans").hidden = true;

      var more = products.filter(function (x) { return x.category === p.category && x.id !== p.id; });
      $("#pMore").innerHTML = more.map(card).join("");
      if (!more.length) $(".p-more").hidden = true;
    }
  }
})();
