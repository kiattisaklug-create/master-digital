/* kidthueng.js — หน้าพิเศษของระบบคิดถึง (ไม่ต้องแก้ไฟล์นี้)
   ข้อความทั้งหมดดึงจาก content.js โปรแกรม id "kidthueng" แก้ได้ในโปรแกรม Editor */
(function () {
  "use strict";
  var S = window.SITE || {}, C = S.contact || {};
  var arr = function (x) { return Array.isArray(x) ? x : []; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var id = document.body.getAttribute("data-product") || "kidthueng";
  var p = arr(S.products).filter(function (x) { return x && x.id === id; })[0];
  if (!p) return;

  var lineId = (C.lineId || "").trim();
  var lineMsg = function (t) { return lineId ? "https://line.me/R/oaMessage/" + encodeURIComponent(lineId) + "/?" + encodeURIComponent(t) : ""; };
  var txt = function (sel, v) { var e = $(sel); if (e) e.textContent = v || ""; return e; };
  var lines = function (v) { return Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []); };

  document.title = p.name + " — " + (S.brand || "");

  // ปุ่ม: ทดลองฟรี (ไปเว็บสมัครถ้ามีลิงก์ ไม่งั้นเปิด LINE) / สอบถาม
  var start = p.link || lineMsg("สนใจทดลองใช้" + p.name + " ฟรี");
  var ask = lineMsg("สนใจ" + p.name + " ขอรายละเอียดเพิ่มเติม");
  $$(".js-kt-start").forEach(function (a) { if (start) { a.href = start; a.target = "_blank"; a.rel = "noopener"; } });
  $$(".js-kt-ask").forEach(function (a) { if (ask) { a.href = ask; a.target = "_blank"; a.rel = "noopener"; } });

  // หัวหน้า
  txt("#ktMark", p.mark || "💌");
  txt("#ktName", p.name);
  // ตัดบรรทัดภาษาไทยเฉพาะตรงช่องว่าง ไม่ให้วลีขาดกลางคำ
  var phrases = function (sel, v) { var e = $(sel); if (!e) return; e.innerHTML = String(v || "").split(/\s+/).filter(Boolean).map(function (w) { return '<span class="kt-ph">' + esc(w) + "</span>"; }).join(" "); };
  phrases("#ktHeadline", p.headline || p.tagline);
  txt("#ktDesc", p.description);
  var b = [];
  if (p.trial) b.push('<span class="kt-pill">' + esc(p.trial) + "</span>");
  if (p.priceFrom) b.push('<span class="kt-from"><small>เริ่มต้น</small> ' + esc(p.priceFrom) + "</span>");
  $("#ktBadges").innerHTML = b.join("");

  // คำพูดที่ฝากไว้ (ใช้ช่อง "ตัวอย่างคำถาม" ใน Editor)
  // คำพูดบนกระดาษโน้ต: ใช้ช่อง "ตัวอย่างคำถาม" ถ้ามี ไม่งั้นดึงคำในเครื่องหมาย “ ” จากเรื่องเล่า
  var storyRaw = String(p.story || "");
  var words = lines(p.examples);
  if (!words.length) {
    var m = storyRaw.match(/“([^”]{1,40})”/g) || [];
    words = m.map(function (q) { return q.slice(1, -1); });
    if (words.length) { words.push("คิดถึงนะ"); storyRaw = storyRaw.replace(/\s*“[^”]{1,40}”/g, ""); }
  }
  if (!words.length) words = ["กินข้าวหรือยัง", "ตั้งใจเรียนนะ", "พ่อภูมิใจในตัวลูก", "คิดถึงนะ"];
  var sender = p.sender || "พ่อ";
  txt("#ktSender", sender); txt("#ktSenderAv", sender.slice(0, 3));

  // มือถือ: ข้อความมาวันละข้อความ
  var days = ["วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์", "วันอาทิตย์"];
  var times = ["07:30", "08:00", "18:30", "07:45", "19:00", "09:15", "08:30"];
  $("#ktBubbles").innerHTML = words.slice(0, 5).map(function (w, i) {
    return '<div class="kt-day" style="--d:' + i + '"><span>' + days[i % 7] + "</span></div>" +
      '<div class="kt-msg" style="--d:' + i + '"><span class="kt-msg__av">' + esc(sender.slice(0, 3)) + '</span><p>' + esc(w) + '</p><time>' + times[i % 7] + "</time></div>";
  }).join("");
  var phone = $("#ktPhone");
  if (reduce || !("IntersectionObserver" in window)) phone.classList.add("is-play", "is-static");
  else new IntersectionObserver(function (es, o) { es.forEach(function (e) { if (e.isIntersecting) { phone.classList.add("is-play"); o.disconnect(); } }); }, { threshold: .25 }).observe(phone);

  // เรื่องเล่า + กระดาษโน้ตลายมือ
  var story = storyRaw.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
  // ย่อหน้าที่สองยาว: แยกเป็นประโยคตามช่องว่างหลัง "ทุกครั้งที่" เพื่ออ่านง่าย
  story = story.reduce(function (acc, t) { var i = t.indexOf(" ทุกครั้งที่"); if (i > 20) { acc.push(t.slice(0, i), t.slice(i + 1)); } else acc.push(t); return acc; }, []);
  if (story.length || words.length) {
    txt("#ktStoryTitle", p.storyTitle || "คำพูดที่อยากบอกลูกหลาน");
    txt("#ktStoryLead", story.length > 1 ? story[0] : "");
    $("#ktNotes").innerHTML = words.map(function (w, i) {
      return '<figure class="kt-note-card' + (w.length > 15 ? " kt-note-card--long" : "") + '" style="--r:' + [-3, 2, -1.5, 2.5, -2, 1.5][i % 6] + 'deg;--i:' + i + '"><blockquote>' + esc(w) + "</blockquote></figure>";
    }).join("");
    $("#ktStory").innerHTML = (story.length > 1 ? story.slice(1) : story).map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("");
    $("#ktWords").hidden = false;
  }

  // จุดเด่น
  var hl = arr(p.highlights).filter(function (h) { return h && h.title; });
  if (hl.length) {
    $("#ktHighlights").innerHTML = hl.map(function (h) {
      return '<div class="kt-feat__item"><span class="kt-feat__icon" aria-hidden="true">' + esc(h.icon || "💗") + '</span><h3>' + esc(h.title) + "</h3>" + (h.text ? "<p>" + esc(h.text) + "</p>" : "") + "</div>";
    }).join("");
    $("#ktFeat").hidden = false;
  }

  // ขั้นตอน
  var steps = lines(p.steps);
  if (steps.length) {
    txt("#ktStepsTitle", p.stepsTitle || "เริ่มได้ใน 3 ขั้นตอน");
    $("#ktSteps").innerHTML = steps.map(function (s) {
      var m = s.match(/^([^:：]{1,24})[:：]\s*(.*)$/);
      return m ? "<li><b>" + esc(m[1]) + "</b><span>" + esc(m[2]) + "</span></li>" : "<li><span>" + esc(s) + "</span></li>";
    }).join("");
    $("#ktStepsBox").hidden = false;
  }

  // ของขวัญ
  var co = p.callout || {};
  if (co.title || co.text) {
    phrases("#ktGiftTitle", String(co.title || "").replace(/^🎁\s*/, ""));
    txt("#ktGiftText", co.text);
    $("#ktAudience").innerHTML = lines(p.audience).map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("");
    $("#ktGift").hidden = false;
  }

  // แพ็กเกจ
  var plans = arr(p.plans).filter(function (x) { return x && x.name; });
  var groups = arr(p.planGroups).filter(function (g) { return g && g.name; });
  plans.forEach(function (pl) { if (pl.group && !groups.some(function (g) { return g.name === pl.group; })) groups.push({ name: pl.group, text: "" }); });
  function planCard(pl, i) {
    var free = /^(ฟรี|0)$/.test(String(pl.price || "").trim());
    var link = lineMsg("สนใจ" + p.name + " แพ็กเกจ " + pl.name + (pl.group ? " (" + pl.group + ")" : ""));
    if (free && start) link = start;
    return '<article class="kt-plan' + (pl.badge ? " kt-plan--hot" : "") + (free ? " kt-plan--free" : "") + '" style="--i:' + i + '">' +
      (pl.badge ? '<span class="kt-plan__badge">' + esc(pl.badge) + "</span>" : "") +
      "<h3>" + esc(pl.name) + "</h3>" +
      '<p class="kt-plan__price"><b>' + esc(pl.price || "สอบถาม") + "</b>" + (pl.period ? "<span>" + esc(pl.period) + "</span>" : "") + "</p>" +
      (pl.note ? '<p class="kt-plan__note">' + esc(pl.note) + "</p>" : "") +
      (pl.alt ? '<p class="kt-plan__note">' + esc(pl.alt).replace(/\n/g, "<br>") + "</p>" : "") +
      '<ul class="kt-plan__feats">' + lines(pl.features).map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul>" +
      (link ? '<a class="btn ' + (pl.badge ? "btn--gold" : "btn--ghost") + ' btn--sm kt-plan__btn" href="' + link + '" target="_blank" rel="noopener">' + (free ? "เริ่มทดลองฟรี" : "เลือกแพ็กเกจนี้") + "</a>" : "") +
      "</article>";
  }
  function draw(g) {
    var list = groups.length ? plans.filter(function (pl) { return (pl.group || groups[0].name) === g; }) : plans;
    var box = $("#ktPlans");
    box.className = "kt-plan-grid kt-plan-grid--" + Math.min(list.length, 4);
    box.innerHTML = list.map(planCard).join("");
    var gi = groups.filter(function (x) { return x.name === g; })[0];
    txt("#ktGroupText", gi ? gi.text : "");
  }
  if (!plans.length) $("#plans").hidden = true;
  else if (groups.length > 1) {
    var gt = $("#ktGroups");
    gt.innerHTML = groups.map(function (g, i) { return '<button type="button" role="tab" aria-selected="' + (i === 0) + '" data-g="' + esc(g.name) + '">' + esc(g.name) + "</button>"; }).join("");
    gt.addEventListener("click", function (e) {
      var bt = e.target.closest("button"); if (!bt) return;
      $$("button", gt).forEach(function (x) { x.setAttribute("aria-selected", x === bt); });
      draw(bt.getAttribute("data-g"));
    });
    draw(groups[0].name);
  } else { $("#ktGroups").hidden = true; draw(groups.length ? groups[0].name : ""); }
  if (p.priceNote) { txt("#ktPriceNote", p.priceNote); $("#ktPriceNote").hidden = false; }

  // คำถาม
  var fq = arr(p.faq).filter(function (f) { return f && f.q; });
  if (!fq.length) fq = [
    { q: "ผู้สูงอายุใช้เองได้ไหม", a: "ได้ ใช้ผ่าน LINE ที่มีอยู่แล้ว ไม่ต้องลงแอปเพิ่ม ปุ่มใหญ่ ตัวหนังสือชัด" },
    { q: "ฝากอะไรได้บ้าง", a: "ฝากได้ทั้งข้อความและรูปภาพ แค่พิมพ์ข้อความหรือส่งรูปเข้ามาในแชท" },
    { q: "ลูกหลานต้องทำอะไรบ้าง", a: "แค่กดลิงก์เพิ่มเพื่อน LINE ที่คุณส่งให้ จากนั้นจะได้รับความคิดถึงจากคุณทุกวัน" },
    { q: "กลุ่มประหยัดกับกลุ่มพรีเมียมต่างกันอย่างไร", a: "กลุ่มประหยัดใช้ LINE OA ของคุณเอง ส่วนกลุ่มพรีเมียมใช้ LINE ของระบบคิดถึง ไม่ต้องตั้งค่าอะไร ส่งได้มากกว่า และเราดูแลให้ทั้งหมด" },
    { q: "ข้อมูลจะหายไหม", a: "ระบบสำรองข้อมูลอัตโนมัติทุกวัน และมีผู้ดูแลระบบคอยดูแลบัญชีให้" }
  ];
  if (fq.length) {
    $("#ktFaq").innerHTML = fq.map(function (f) { return '<details class="qa"><summary>' + esc(f.q) + '</summary><div class="qa__a"><p>' + esc(f.a) + "</p></div></details>"; }).join("");
    $("#ktFaqBox").hidden = false;
  }

  // ปิดท้าย
  phrases("#ktCtaTitle", p.ctaTitle || "ฝากคำพูดแรกให้ลูกหลาน");
  txt("#ktCtaText", p.ctaText);
  if (p.finePrint) { txt("#ktFine", p.finePrint); $("#ktFine").hidden = false; }

  // แถบติดล่างบนมือถือ
  var sc = $("#stickyCta");
  if (sc && p.priceFrom) {
    txt("#scPrice", p.priceFrom); sc.hidden = false;
    var hero = $(".kt-hero"), end = $(".kt-end");
    var onS = function () { sc.classList.toggle("is-on", hero.getBoundingClientRect().bottom < 0 && end.getBoundingClientRect().top > window.innerHeight); };
    window.addEventListener("scroll", onS, { passive: true }); onS();
    document.body.classList.add("has-sticky");
  }
})();
