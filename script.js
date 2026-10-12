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
  var mm = function (q) { return window.matchMedia && matchMedia(q).matches; };
  var reduce = mm("(prefers-reduced-motion: reduce)");
  var SVGNS = "http://www.w3.org/2000/svg";

  var products = arr(S.products).filter(function (p) { return p && p.id && !p.hidden; });
  var cats = arr(S.categories);
  var PALETTE = ["#E0507A", "#7B5CFA", "#0FA39A", "#F08A24", "#2F7BEA", "#C98A12"];
  var catOf = function (id) { return cats.filter(function (x) { return x.id === id; })[0]; };
  var catName = function (id) { var c = catOf(id); return c ? c.name : ""; };
  var catColor = function (id) {
    var c = catOf(id); if (c && c.color) return c.color;
    var i = cats.indexOf(c); return PALETTE[(i < 0 ? 5 : i) % PALETTE.length];
  };
  var statusName = function (s) { return (S.statusNames || {})[s] || ""; };
  var activeVideos = function (p) { return arr(p.videos).filter(function (v) { return v && v.active && v.file; }); };
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
  // QR LINE: สร้างจาก LINE ID อัตโนมัติ (ถ้าใส่รูป QR เองใน lineQr ที่ไม่ใช่ไฟล์เดิม จะใช้รูปนั้นแทน)
  var customQr = C.lineQr && C.lineQr !== "assets/qr/line-qr.svg" ? C.lineQr : "";
  window.MD_QR = function (id) {
    if (!id || typeof window.qrcode !== "function") return "";
    try {
      var q = window.qrcode(0, "M"); q.addData("https://line.me/R/ti/p/" + id); q.make();
      return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(q.createSvgTag({ cellSize: 8, margin: 2, scalable: true }));
    } catch (e) { return ""; }
  };
  var qrSrc = customQr || window.MD_QR(lineId);
  if (qrSrc) $$(".js-qr").forEach(function (el) { el.src = qrSrc; });
  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();

  /* ---------- เมนูมือถือ + แถบด้านบน ---------- */
  var top = $("#top"), menuBtn = $("#menuBtn"), nav = $("#nav"), floatBtn = $(".float-line");
  var solidAlways = top && top.classList.contains("is-solid");
  function onScroll() {
    var sy = window.scrollY;
    if (top && !solidAlways) top.classList.toggle("is-solid", sy > 30);
    if (floatBtn) floatBtn.classList.toggle("is-on", sy > 500);
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

  /* ---------- แสงตามเมาส์บนการ์ด ---------- */
  document.addEventListener("pointermove", function (e) {
    var card = e.target.closest && e.target.closest(".card, .feature");
    if (!card) return;
    var r = card.getBoundingClientRect();
    card.style.setProperty("--mx", (e.clientX - r.left) + "px");
    card.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });

  /* ---------- ชิ้นส่วนการ์ด ---------- */
  var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
  function chip(s) { return statusName(s) ? '<span class="chip chip--' + esc(s) + '">' + esc(statusName(s)) + "</span>" : ""; }
  function medal(p, cls) {
    if (p.image) return '<span class="medal medal--img' + (cls ? " " + cls : "") + '"><img src="' + esc(p.image) + '" alt="" loading="lazy"></span>';
    return '<span class="medal' + (cls ? " " + cls : "") + '">' + esc(p.mark || (p.name || "?").slice(0, 2)) + "</span>";
  }
  function priceLine(p) {
    var out = "";
    if (p.priceFrom) out += '<span class="price-from"><small>เริ่มต้น</small> ' + esc(p.priceFrom) + "</span>";
    if (p.trial) out += '<span class="trial">' + esc(p.trial) + "</span>";
    return out ? '<div class="card__price">' + out + "</div>" : "";
  }
  function card(p, i) {
    var n = activeVideos(p).length;
    return '<a class="card" style="--i:' + (i || 0) + ";--c:" + catColor(p.category) + '" href="' + productUrl(p) + '">' +
      '<div class="card__top">' + medal(p) + chip(p.status) + "</div>" +
      '<h3 class="card__name">' + esc(p.name) + "</h3>" +
      '<p class="card__tag">' + esc(p.tagline) + "</p>" + priceLine(p) +
      '<div class="card__foot">' +
      (n ? '<span class="card__vids">' + ICON_PLAY + "วิดีโอ " + n + "</span>" : '<span class="ver">' + esc(p.version) + "</span>") +
      '<span class="card__more">ดูรายละเอียด</span></div></a>';
  }

  /* ===================== หน้าแรก ===================== */
  if (document.body.getAttribute("data-page") === "home") {
    var featured = products.filter(function (p) { return p.featured; })[0];
    var filters = $("#filters"), grid = $("#grid"), feat = $("#featured"), current = "all";
    function count(id) { return products.filter(function (p) { return id === "all" || p.category === id; }).length; }
    var tabs = [{ id: "all", name: "ทั้งหมด" }].concat(cats).filter(function (c) { return count(c.id) > 0; });
    filters.innerHTML = tabs.map(function (c) {
      return '<button class="filter" role="tab" style="--c:' + (c.id === "all" ? "#C98A12" : catColor(c.id)) + '" data-cat="' + esc(c.id) + '" aria-selected="' + (c.id === "all") + '">' + esc(c.name) + "<b>" + count(c.id) + "</b></button>";
    }).join("");

    function renderGrid() {
      var showFeat = featured && (current === "all" || featured.category === current);
      feat.innerHTML = showFeat ?
        '<a class="feature" style="--c:' + catColor(featured.category) + '" href="' + productUrl(featured) + '">' +
          medal(featured) +
          '<div><p class="feature__label">' + esc(catName(featured.category)) + '</p><h3 class="feature__name">' + esc(featured.name) + '</h3><p class="feature__tag">' + esc(featured.headline || featured.tagline) + "</p>" + priceLine(featured) + "</div>" +
          '<div class="feature__side">' + chip(featured.status) + (activeVideos(featured).length ? '<span class="card__vids" style="color:#F7D57A">' + ICON_PLAY + "วิดีโอสาธิต " + activeVideos(featured).length + "</span>" : "") + '<span class="btn btn--gold btn--sm">ดูรายละเอียด</span></div></a>' : "";
      var list = products.filter(function (p) { return p !== (showFeat ? featured : null) && (current === "all" || p.category === current); });
      if (current === "all" && cats.length > 1) {
        var k = 0;
        grid.innerHTML = cats.map(function (c) {
          var items = list.filter(function (p) { return p.category === c.id; });
          if (!items.length) return "";
          return '<div class="grid__group" style="--c:' + catColor(c.id) + '"><h3>' + esc(c.name) + "</h3>" + (c.text ? "<p>" + esc(c.text) + "</p>" : "") + "</div>" +
            items.map(function (p) { return card(p, k++); }).join("");
        }).join("") + list.filter(function (p) { return !catOf(p.category); }).map(card).join("");
      } else grid.innerHTML = list.map(card).join("");
      if (!reduce) requestAnimationFrame(function () { $$(".card", grid).forEach(function (c) { c.classList.add("is-in"); }); });
    }
    filters.addEventListener("click", function (e) {
      var b = e.target.closest(".filter"); if (!b) return;
      current = b.getAttribute("data-cat");
      $$(".filter", filters).forEach(function (x) { x.setAttribute("aria-selected", x === b); });
      renderGrid();
    });
    renderGrid();

    // ตารางเวอร์ชัน (แสดง 6 แถวแรก กดดูทั้งหมดได้)
    var vt = $("#vtable"), SHOW = 6;
    function renderVersions(all) {
      var rows = all ? products : products.slice(0, SHOW);
      vt.innerHTML = '<div class="vrow vrow--head" role="row"><span>โปรแกรม</span><span>เวอร์ชัน</span><span>เปลี่ยนแปลงล่าสุด</span><span style="text-align:right">วันที่</span></div>' +
        rows.map(function (p) {
          var last = arr(p.changelog)[0] || {};
          return '<a class="vrow" role="row" style="--c:' + catColor(p.category) + '" href="' + productUrl(p) + '"><span class="vrow__name">' + esc(p.name) + '</span><span class="ver">' + esc(p.version) +
            '</span><span class="vrow__note">' + esc(last.text || "") + '</span><span class="vrow__date">' + esc(last.date || "") + "</span></a>";
        }).join("");
    }
    renderVersions(false);
    if (products.length > SHOW) {
      var more = document.createElement("div"); more.className = "vmore";
      more.innerHTML = '<button class="btn btn--ghost" type="button">ดูทั้งหมด ' + products.length + " โปรแกรม</button>";
      vt.parentNode.appendChild(more);
      var open = false;
      more.firstChild.addEventListener("click", function () {
        open = !open; renderVersions(open);
        this.textContent = open ? "ย่อรายการ" : "ดูทั้งหมด " + products.length + " โปรแกรม";
      });
    }

    $("#aboutPoints").innerHTML = arr(S.aboutPoints).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    $("#faqList").innerHTML = arr(S.faq).map(function (f) {
      return '<details class="qa"><summary>' + esc(f.q) + '</summary><div class="qa__a"><p>' + esc(f.a) + "</p></div></details>";
    }).join("");
    if (!arr(S.faq).length) $("#faq").hidden = true;

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

  /* ---------- หน้าปัดทอง ---------- */
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
    el("stop", { offset: "0", "stop-color": "#E8A920", "stop-opacity": "0" }, lg);
    el("stop", { offset: "1", "stop-color": "#C98A12" }, lg);

    guilloche(svg, 36, 236, 92, "spin");
    guilloche(svg, 24, 150, 62, "spin-rev");
    [[262, 1.4, 0], [250, .8, .25], [186, .8, .5]].forEach(function (r) {
      var len = Math.ceil(2 * Math.PI * r[0]);
      var c = el("circle", { r: r[0], "class": "ring draw", "stroke-width": r[1], style: "--len:" + len + ";animation-delay:" + r[2] + "s" }, svg);
      if (reduce) c.style.strokeDashoffset = 0;
    });
    var ticks = el("g", {}, svg);
    for (var t = 0; t < 120; t++) {
      var long = t % 10 === 0, a = t * 3 * Math.PI / 180, r1 = 250, r2 = long ? 238 : 244;
      el("line", { x1: Math.sin(a) * r1, y1: -Math.cos(a) * r1, x2: Math.sin(a) * r2, y2: -Math.cos(a) * r2, "class": "tick" }, ticks);
    }
    var hand = el("g", { "class": "hand" }, svg);
    el("line", { x1: 0, y1: -150, x2: 0, y2: -268 }, hand);

    var n = products.length, R = 290, markers = [];
    products.forEach(function (p, i) {
      var ang = i * 360 / n, a = ang * Math.PI / 180;
      var m = el("a", { href: productUrl(p), "class": "marker", tabindex: "0", "aria-label": p.name, style: "--c:" + catColor(p.category) + ";transition-delay:" + (1.2 + i * .06) + "s" }, svg);
      el("circle", { cx: Math.sin(a) * R, cy: -Math.cos(a) * R, r: 22 }, m);
      var tx = el("text", { x: Math.sin(a) * R, y: -Math.cos(a) * R }, m);
      tx.textContent = p.mark || p.name.slice(0, 2);
      markers.push({ node: m, p: p, ang: ang });
    });

    var face = $("#dialFace"), fc = $("#dialCat"), fn = $("#dialName"), ft = $("#dialTag");
    var active = -1, turned = 0, paused = false;
    function show(i) {
      if (i === active) return;
      var m = markers[i], first = active === -1;
      turned += ((m.ang - (turned % 360)) + 360) % 360;
      hand.style.transform = "rotate(" + turned + "deg)";
      markers.forEach(function (x, j) { x.node.classList.toggle("is-on", j === i); });
      active = i;
      face.classList.add("is-swap");
      setTimeout(function () {
        face.style.setProperty("--c", catColor(m.p.category));
        fc.textContent = catName(m.p.category); fn.textContent = m.p.name; ft.textContent = m.p.tagline;
        face.href = productUrl(m.p); face.setAttribute("aria-label", "ดูรายละเอียด " + m.p.name);
        face.classList.remove("is-swap");
      }, first ? 0 : 280);
    }
    markers.forEach(function (m, i) {
      m.node.addEventListener("mouseenter", function () { paused = true; show(i); });
      m.node.addEventListener("focus", function () { paused = true; show(i); });
      m.node.addEventListener("mouseleave", function () { paused = false; });
      m.node.addEventListener("blur", function () { paused = false; });
    });
    face.addEventListener("mouseenter", function () { paused = true; });
    face.addEventListener("mouseleave", function () { paused = false; });
    var startIdx = Math.max(0, products.indexOf(products.filter(function (p) { return p.featured; })[0]));
    setTimeout(function () { show(startIdx); }, reduce ? 0 : 1300);
    setInterval(function () { if (!paused && !document.hidden) show((active + 1) % n); }, 3800);
  }

  function buildSeal() {
    var svg = $("#seal"); if (!svg) return;
    var g = guilloche(svg, 30, 92, 40, "spin");
    $$(".guil", g).forEach(function (e) { e.style.opacity = .55; e.style.strokeWidth = .8; });
    el("circle", { r: 104, fill: "none", stroke: "#E8A920", "stroke-width": 1.5 }, svg);
    el("circle", { r: 98, fill: "none", stroke: "#E8A920", "stroke-width": .6, opacity: .6 }, svg);
    var dg = el("linearGradient", { id: "sealG", x1: "0", y1: "0", x2: "1", y2: "1" }, el("defs", {}, svg));
    el("stop", { offset: "0", "stop-color": "#F7D57A" }, dg); el("stop", { offset: "1", "stop-color": "#E8A920" }, dg);
    el("circle", { r: 54, fill: "url(#sealG)" }, svg);
    var t = el("text", { x: 0, y: 2, "text-anchor": "middle", "dominant-baseline": "central", fill: "#2A1D00", style: "font:600 30px 'Playfair Display',Georgia,serif;letter-spacing:.03em" }, svg);
    t.textContent = S.brandShort || "MD";
  }

  /* ===================== วิดีโอสาธิต ===================== */
  var ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/>' +
    '<g class="off"><path d="M16 9.5l5 5M21 9.5l-5 5"/></g><g class="on"><path d="M15.5 9a4.5 4.5 0 010 6M18 6.5a8 8 0 010 11"/></g></svg>';
  var ICON_FULL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  var ICON_BIG_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';

  function renderVideos(p, host) {
    var vids = activeVideos(p).slice(0, 3);
    if (!vids.length) return false;
    var grid = $(".vgrid", host);
    grid.className = "vgrid vgrid--" + vids.length;
    grid.innerHTML = vids.map(function (v, i) {
      var w = Number(v.w) || 16, h = Number(v.h) || 9, tall = h > w;
      return '<figure class="vbox' + (tall ? " vbox--tall" : "") + '" style="--ar:' + w + " / " + h + '">' +
        '<div class="vbox__frame">' +
          '<video muted playsinline loop preload="none"' + (v.poster ? ' poster="' + esc(v.poster) + '"' : "") + ' aria-label="' + esc(v.title || ("วิดีโอสาธิต " + (i + 1))) + '">' +
            '<source src="' + esc(v.file) + '" type="video/mp4"></video>' +
          '<span class="vbox__play">' + ICON_BIG_PLAY + "</span>" +
          '<button class="vbox__btn vbox__full" type="button" aria-label="เต็มจอ">' + ICON_FULL + "</button>" +
          '<button class="vbox__btn vbox__sound" type="button" aria-pressed="false" aria-label="เปิดเสียง">' + ICON_SOUND + "</button>" +
          '<span class="vbox__bar"><i></i></span>' +
        "</div>" + (v.title ? "<figcaption>" + esc(v.title) + "</figcaption>" : "") + "</figure>";
    }).join("");
    setupPlayers($$(".vbox", grid));
    return true;
  }

  function setupPlayers(boxes) {
    var canHover = mm("(hover: hover) and (pointer: fine)");
    var saveData = navigator.connection && navigator.connection.saveData;
    var autoScroll = !canHover && !reduce && !saveData;
    var all = boxes.map(function (b) { return b.querySelector("video"); });

    function play(v) {
      all.forEach(function (o) { if (o !== v && !o.paused) o.pause(); });
      var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
    }
    boxes.forEach(function (box) {
      var v = box.querySelector("video"), snd = box.querySelector(".vbox__sound"), full = box.querySelector(".vbox__full"), bar = box.querySelector(".vbox__bar i");
      v.addEventListener("play", function () { box.classList.add("is-playing"); });
      v.addEventListener("pause", function () { box.classList.remove("is-playing"); });
      v.addEventListener("timeupdate", function () { if (v.duration) bar.style.width = (v.currentTime / v.duration * 100) + "%"; });
      if (canHover) {
        box.addEventListener("mouseenter", function () { play(v); });
        box.addEventListener("mouseleave", function () { v.pause(); });
      }
      box.querySelector(".vbox__frame").addEventListener("click", function (e) {
        if (e.target.closest(".vbox__btn")) return;
        if (v.paused) play(v); else v.pause();
      });
      snd.addEventListener("click", function () {
        v.muted = !v.muted;
        snd.setAttribute("aria-pressed", String(!v.muted));
        snd.setAttribute("aria-label", v.muted ? "เปิดเสียง" : "ปิดเสียง");
        if (!v.muted && v.paused) play(v);
      });
      full.addEventListener("click", function () {
        var f = box.querySelector(".vbox__frame");
        if (v.webkitEnterFullscreen && !f.requestFullscreen) return v.webkitEnterFullscreen();
        if (document.fullscreenElement) document.exitFullscreen();
        else if (f.requestFullscreen) f.requestFullscreen(); else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
        play(v);
      });
    });

    // มือถือ: เลื่อนมาถึงวิดีโอแล้วเล่นเอง (เล่นทีละตัว ตัวที่เห็นชัดที่สุด)
    if (autoScroll && "IntersectionObserver" in window) {
      var ratios = new Map();
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { ratios.set(e.target, e.intersectionRatio); });
        var best = null, bestR = 0;
        ratios.forEach(function (r, v) { if (r > bestR) { best = v; bestR = r; } });
        all.forEach(function (v) { if (v !== best || bestR < .6) { if (!v.paused) v.pause(); } });
        if (best && bestR >= .6 && best.paused) play(best);
      }, { threshold: [0, .25, .6, .8, 1] });
      all.forEach(function (v) { io.observe(v); });
    }
  }

  /* ===================== หน้ารายละเอียด (หน้าขาย) ===================== */
  if (document.body.getAttribute("data-page") === "product") {
    var id = new URLSearchParams(location.search).get("id");
    var p = products.filter(function (x) { return x.id === id; })[0];
    if (!p) {
      $("#product").hidden = true; $("#notFound").hidden = false;
    } else renderProduct(p);
  }

  function txt(sel, v) { var e = $(sel); if (e) e.textContent = v || ""; return e; }
  function show(sel, on) { var e = $(sel); if (e) e.hidden = !on; return e; }
  function paras(t) { return String(t || "").split(/\n+/).filter(Boolean).map(function (x) { return "<p>" + esc(x) + "</p>"; }).join(""); }
  function lines(v) { return Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []); }

  function renderProduct(p) {
    var color = catColor(p.category);
    document.title = p.name + " — " + (S.brand || "");
    var md = document.querySelector('meta[name="description"]');
    if (!md) { md = document.createElement("meta"); md.name = "description"; document.head.appendChild(md); }
    md.content = p.tagline || p.description || "";
    document.body.style.setProperty("--c", color);

    // หัวหน้า
    $("#pMark").outerHTML = medal(p, "medal--sm");
    txt("#pName", p.name); txt("#pName2", p.name);
    var st = $("#pStatus"); st.className = "chip chip--" + p.status; st.textContent = statusName(p.status); st.hidden = !statusName(p.status);
    txt("#pHeadline", p.headline || p.tagline || p.name);
    txt("#pDesc", p.description || (p.headline ? p.tagline : ""));
    var badges = [];
    if (p.trial) badges.push('<span class="trial trial--lg">' + esc(p.trial) + "</span>");
    if (p.priceFrom) badges.push('<span class="price-from price-from--lg"><small>เริ่มต้น</small> ' + esc(p.priceFrom) + "</span>");
    $("#pBadges").innerHTML = badges.join("");
    if (p.link) { $("#pLink").href = p.link; $("#pLink").hidden = false; }
    var ask = lineMsg("สนใจโปรแกรม " + p.name + " ขอรายละเอียดเพิ่มเติม");
    ["#pAsk", "#pAsk2", "#scAsk"].forEach(function (s2) { var a = $(s2); if (a && ask) { a.href = ask; a.target = "_blank"; a.rel = "noopener"; } });
    renderVisual(p);

    // วิดีโอ
    var vh = $("#pVideos"); if (vh && renderVideos(p, vh)) vh.hidden = false;

    // ปัญหา / เรื่องเล่า
    var probs = lines(p.problems);
    if (probs.length) {
      txt("#pProblemsTitle", p.problemsTitle || "เคยเป็นแบบนี้ไหม?");
      $("#pProblems").innerHTML = probs.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
      if (p.problemsAnswer) { txt("#pProblemsAnswer", p.problemsAnswer); show("#pProblemsAnswer", true); }
      show("#pProblemsBox", true);
    }
    if (p.story) {
      txt("#pStoryTitle", p.storyTitle || ""); show("#pStoryTitle", !!p.storyTitle);
      $("#pStory").innerHTML = paras(p.story);
      show("#pStoryBox", true);
    }
    if (probs.length || p.story) { show("#pPain", true); $("#pPain").classList.toggle("is-both", !!(probs.length && p.story)); }

    // จุดเด่น
    var hl = arr(p.highlights).filter(function (h) { return h && (h.title || h.text); });
    if (!hl.length) hl = lines(p.features).map(function (f) { return { icon: "", title: f, text: "" }; });
    if (hl.length) {
      var hg = $("#pHighlights");
      hg.classList.toggle("hl-grid--simple", !hl.some(function (h) { return h.text; }));
      hg.innerHTML = hl.map(function (h) {
        return '<div class="hl">' + '<span class="hl__icon" aria-hidden="true">' + (h.icon ? esc(h.icon) : "") + "</span>" +
          '<div><h3 class="hl__title">' + esc(h.title) + "</h3>" + (h.text ? '<p class="hl__text">' + esc(h.text) + "</p>" : "") + "</div></div>";
      }).join("");
    }
        var co = p.callout || {};
    if (co.title || co.text) { txt("#pCalloutTitle", co.title); show("#pCalloutTitle", !!co.title); txt("#pCalloutText", co.text); show("#pCallout", true); }
    if (hl.length || co.title || co.text) show("#pFeat", true);

    // ขั้นตอน / เหมาะกับ / ตัวอย่าง / สิ่งที่ต้องมี
    var fit = 0, steps = lines(p.steps), aud = lines(p.audience), ex = lines(p.examples);
    if (steps.length) { txt("#pStepsTitle", p.stepsTitle || "เริ่มใช้งานง่าย"); $("#pSteps").innerHTML = steps.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join(""); show("#pStepsBox", true); fit++; }
    if (aud.length) { $("#pAudience").innerHTML = aud.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join(""); show("#pAudienceBox", true); fit++; }
    if (ex.length) { txt("#pExamplesTitle", p.examplesTitle || "ลองถามแบบนี้"); $("#pExamples").innerHTML = ex.map(function (t) { return '<span class="chip-q">' + esc(t) + "</span>"; }).join(""); show("#pExamplesBox", true); fit++; }
    if (p.requirements) { txt("#pReq", p.requirements); show("#pReqBox", true); fit++; }
    if (fit) { show("#pFit", true); $("#pFit").setAttribute("data-n", String(fit)); }

    renderPlans(p);

    // FAQ
    var fq = arr(p.faq).filter(function (f) { return f && f.q; });
    if (fq.length) {
      $("#pFaq").innerHTML = fq.map(function (f) { return '<details class="qa"><summary>' + esc(f.q) + '</summary><div class="qa__a"><p>' + esc(f.a) + "</p></div></details>"; }).join("");
      show("#pFaqBox", true);
    }

    // ปิดการขาย
    txt("#pCtaTitle", p.ctaTitle || ("สนใจ " + p.name + " ?"));
    txt("#pCtaText", p.ctaText || "ทักมาทาง LINE ผู้พัฒนาตอบเอง แนะนำแพ็กเกจที่เหมาะกับคุณ");
    if (p.finePrint) { txt("#pFine", p.finePrint); show("#pFine", true); }

    // ประวัติเวอร์ชัน / โปรแกรมอื่น
    txt("#pVersion", p.version || "");
    var log = arr(p.changelog).filter(function (c) { return c && (c.version || c.text); });
    if (log.length) {
      $("#pLog").innerHTML = log.map(function (c) { return "<li><b>" + esc(c.version) + "</b><span>" + esc(c.date) + "</span><p>" + esc(c.text) + "</p></li>"; }).join("");
      show("#pLogBox", true);
    }
    var more = products.filter(function (x) { return x.category === p.category && x.id !== p.id; });
    txt("#pCat", catName(p.category));
    $("#pMore").innerHTML = more.slice(0, 6).map(card).join("");
    if (!more.length) show("#pMoreBox", false);

    // แถบติดล่างบนมือถือ
    var sc = $("#stickyCta");
    if (sc) {
      txt("#scLabel", p.priceFrom ? "เริ่มต้น" : p.name);
      txt("#scPrice", p.priceFrom || p.trial || "สอบถามทาง LINE");
      sc.hidden = false;
      var hero = $(".p-hero"), cta = $(".p-cta");
      var onS = function () {
        var past = hero.getBoundingClientRect().bottom < 0;
        var atEnd = cta.getBoundingClientRect().top < window.innerHeight;
        sc.classList.toggle("is-on", past && !atEnd);
      };
      window.addEventListener("scroll", onS, { passive: true }); onS();
      document.body.classList.add("has-sticky");
    }
  }

  // ภาพด้านขวาของหัวหน้า: รูปโปรแกรม + แชทตัวอย่าง (ซ้อนกัน) > อย่างใดอย่างหนึ่ง > เหรียญใหญ่
  function renderVisual(p) {
    var host = $("#pVisual"), chat = arr(p.chat).filter(function (c) { return c && (c.q || c.a); });
    var shot = $("#pShot"); if (shot) shot.remove();
    var html = "";
    if (p.image) html += '<figure class="hero-art"><img src="' + esc(p.image) + '" alt="' + esc(p.name) + '"></figure>';
    if (chat.length) {
      html += '<div class="phone" aria-label="ตัวอย่างการใช้งานในแชท">' +
        '<div class="phone__bar"><span class="phone__av">' + esc(p.mark || "") + "</span><b>" + esc(p.name) + "</b></div>" +
        '<div class="phone__body">' + chat.map(function (c, i) {
          return (c.q ? '<div class="bub bub--me" style="--d:' + (i * 2) + '">' + esc(c.q) + "</div>" : "") +
                 (c.a ? '<div class="bub bub--bot" style="--d:' + (i * 2 + 1) + '">' + esc(c.a) + "</div>" : "");
        }).join("") + "</div>" +
        '<p class="phone__note">ตัวอย่างการใช้งาน</p></div>';
    }
    if (!html) {
      host.innerHTML = '<div class="medal medal--xl" aria-hidden="true">' + esc(p.mark || p.name.slice(0, 2)) + "</div>";
      host.classList.add("p-hero__visual--medal");
      return;
    }
    host.innerHTML = html;
    host.classList.toggle("p-hero__visual--stack", !!(p.image && chat.length));
    var ph = $(".phone", host);
    if (ph) {
      if (!reduce && "IntersectionObserver" in window) {
        new IntersectionObserver(function (es, o) { es.forEach(function (e) { if (e.isIntersecting) { ph.classList.add("is-play"); o.disconnect(); } }); }, { threshold: .3 }).observe(ph);
      } else ph.classList.add("is-play", "is-static");
    }
  }

  function renderPlans(p) {
    var plans = arr(p.plans).filter(function (x) { return x && x.name; });
    var groups = arr(p.planGroups).filter(function (g) { return g && g.name; });
    var names = groups.map(function (g) { return g.name; });
    plans.forEach(function (pl) { if (pl.group && names.indexOf(pl.group) < 0) { names.push(pl.group); groups.push({ name: pl.group, text: "" }); } });
    var hasPrice = plans.some(function (pl) { return pl.price && pl.price !== "สอบถามราคา"; });
    if (!plans.length) { $("#plans").hidden = true; return; }
    if (hasPrice) { show("#pSeePlans", true); } else { $("#pSeePlans2").hidden = true; txt("#pPlansText", "ราคาขึ้นกับขนาดธุรกิจและการปรับแต่ง ทักทาง LINE เพื่อรับใบเสนอราคา"); }

    function planHtml(pl, i) {
      var link = lineMsg("สนใจ " + p.name + " แพ็กเกจ " + pl.name + (pl.group ? " (" + pl.group + ")" : ""));
      var isNum = /\d/.test(pl.price || "") && !/^ฟรี/.test(pl.price);
      var feats = lines(pl.features);
      return '<div class="plan' + (pl.badge ? " plan--hot" : "") + '" style="--i:' + i + '">' +
        (pl.badge ? '<span class="plan__badge">' + esc(pl.badge) + "</span>" : "") +
        '<h3 class="plan__name">' + esc(pl.name) + "</h3>" +
        (pl.note ? '<p class="plan__note">' + esc(pl.note) + "</p>" : "") +
        '<p class="plan__price"><b class="' + (isNum ? "num" : "word") + '">' + esc(pl.price || "สอบถามราคา") + "</b>" + (pl.period ? "<span>" + esc(pl.period) + "</span>" : "") + "</p>" +
        (pl.alt ? '<p class="plan__alt">' + esc(pl.alt).replace(/\n/g, "<br>") + "</p>" : "") +
        (feats.length ? '<ul class="plan__feats">' + feats.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul>" : '<div class="plan__space"></div>') +
        (link ? '<a class="btn ' + (pl.badge ? "btn--gold" : "btn--ghost") + ' btn--sm plan__btn" href="' + link + '" target="_blank" rel="noopener">เลือกแพ็กเกจนี้</a>' : "") +
        "</div>";
    }
    var box = $("#pPlans");
    function draw(g) {
      var list = groups.length ? plans.filter(function (pl) { return (pl.group || groups[0].name) === g; }) : plans;
      box.className = "plans plans--" + (list.length > 4 ? 3 : list.length) + (list.some(function (pl) { return pl.badge; }) ? "" : " plans--plain");
      box.innerHTML = list.map(planHtml).join("");
      var gi = groups.filter(function (x) { return x.name === g; })[0];
      if (gi && gi.text) { txt("#pGroupText", gi.text); show("#pGroupText", true); } else show("#pGroupText", false);
    }
    if (groups.length > 1) {
      var gt = $("#pGroups");
      gt.innerHTML = groups.map(function (g, i) { return '<button type="button" role="tab" aria-selected="' + (i === 0) + '" data-g="' + esc(g.name) + '">' + esc(g.name) + "</button>"; }).join("");
      gt.hidden = false;
      gt.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        $$("button", gt).forEach(function (x) { x.setAttribute("aria-selected", x === b); });
        draw(b.getAttribute("data-g"));
      });
      draw(groups[0].name);
    } else draw(groups.length ? groups[0].name : "");

    var ad = arr(p.addons).filter(function (a) { return a && a.name; });
    if (ad.length) { $("#pAddons").innerHTML = ad.map(function (a) { return "<li><span>" + esc(a.name) + "</span><b>" + esc(a.price) + "</b></li>"; }).join(""); show("#pAddonsBox", true); }
    if (p.priceNote) { txt("#pPriceNote", p.priceNote); show("#pPriceNote", true); }
  }
})();
