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
  if (C.lineQr) $$(".js-qr").forEach(function (el) { el.src = C.lineQr; });
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
  function card(p, i) {
    var n = activeVideos(p).length;
    return '<a class="card" style="--i:' + (i || 0) + ";--c:" + catColor(p.category) + '" href="' + productUrl(p) + '">' +
      '<div class="card__top"><span class="medal">' + esc(p.mark || (p.name || "?").slice(0, 2)) + "</span>" + chip(p.status) + "</div>" +
      '<h3 class="card__name">' + esc(p.name) + "</h3>" +
      '<p class="card__tag">' + esc(p.tagline) + "</p>" +
      '<div class="card__foot"><span class="ver">' + esc(p.version) + "</span>" +
      (n ? '<span class="card__vids">' + ICON_PLAY + "วิดีโอ " + n + "</span>" : "") +
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
          '<span class="medal">' + esc(featured.mark) + "</span>" +
          '<div><p class="feature__label">' + esc(catName(featured.category)) + '</p><h3 class="feature__name">' + esc(featured.name) + '</h3><p class="feature__tag">' + esc(featured.tagline) + "</p></div>" +
          '<div class="feature__side">' + chip(featured.status) + (activeVideos(featured).length ? '<span class="card__vids" style="color:#F7D57A">' + ICON_PLAY + "วิดีโอสาธิต " + activeVideos(featured).length + "</span>" : "") + '<span class="btn btn--gold btn--sm">ดูรายละเอียด</span></div></a>' : "";
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

  /* ===================== หน้ารายละเอียด ===================== */
  if (document.body.getAttribute("data-page") === "product") {
    var id = new URLSearchParams(location.search).get("id");
    var p = products.filter(function (x) { return x.id === id; })[0];
    if (!p) {
      $("#product").hidden = true; $("#notFound").hidden = false;
    } else {
      document.title = p.name + " — " + (S.brand || "");
      document.body.style.setProperty("--c", catColor(p.category));
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
      var vh = $("#pVideos"); if (vh && renderVideos(p, vh)) vh.hidden = false;

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
