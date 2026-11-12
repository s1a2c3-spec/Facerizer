/* Facerizer photo card (Phase 4).
   FZCard.render(rootElement, { result, photoUrl, plan, hideScores, sample })  ->  { setPhoto(url) }
   - Builds the card (photo with 5 numbered dots, score, feature notes, best upgrades) and a Download image button.
   - The downloaded PNG is always 1080 x 1809. Free plan: Facerizer logo and facerizer.com at the bottom. Paid plans: clean.
   - Older reports have no "card" data: the card is built from the older fields (no 1 to 10 numbers, no dots on the photo).
   Texts come from translations.js (English or Hinglish). */
(function () {
  "use strict";
  var AREAS = ["hair", "eyes", "skin", "structure", "facial_hair"];
  var LABEL = { hair: ["card.hair", "Hair"], eyes: ["card.eyes", "Eyes"], skin: ["card.skin", "Skin"], structure: ["card.structure", "Facial structure"], facial_hair: ["card.facial_hair", "Facial hair"] };

  function T(key, fb, vars) {
    var s = window.FZ_I18N ? window.FZ_I18N.t(key, vars) : key;
    if (s === key) { s = fb; if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); }
    return s;
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function num(x) { return typeof x === "number" && isFinite(x) ? x : null; }

  /* ---------- what to show ---------- */
  function model(r, hide) {
    var c = r.card || {}, f = r.features || {}, vh = r.visible_hair || {};
    function note(a) { return (c[a] && c[a].note) || ""; }
    var hairFallback = [vh.type, vh.length && vh.length + " length", vh.density].filter(function (x) { return x && !/unclear/.test(x); }).join(", ");
    var notes = {
      hair: note("hair") || (hairFallback ? T("card.fallback_hair", "Visible hair: {text}.", { text: hairFallback }) : ""),
      eyes: note("eyes") || (f.eyes && f.eyes.observation) || "",
      skin: note("skin") || (f.skin_appearance && f.skin_appearance.observation) || "",
      structure: note("structure") || (r.face_shape ? T("card.shape", "Face shape: {shape}", { shape: r.face_shape.type + " (" + r.face_shape.confidence + "%)" }) : ""),
      facial_hair: c.facial_hair ? (c.facial_hair.present === false ? (c.facial_hair.note || T("card.no_facial_hair", "No facial hair")) : note("facial_hair")) : ""
    };
    function s10(a) { return hide ? null : num(c[a] && c[a].score); }
    var feats = [
      { key: "eyes", label: T("card.eyes", "Eyes"), score: s10("eyes") },
      { key: "hair", label: T("card.hair", "Hair"), score: s10("hair") },
      { key: "skin", label: T("card.skin_evenness", "Skin evenness"), score: s10("skin") },
      { key: "facial_hair", label: T("card.facial_hair", "Facial hair"), score: c.facial_hair && c.facial_hair.present ? s10("facial_hair") : null, none: !!(c.facial_hair && c.facial_hair.present === false) }
    ].filter(function (x) { return x.score != null || x.none; });
    var ups = (c.upgrades || []).slice(0, 4);
    if (!ups.length) ups = (r.improvements || []).concat(r.grooming || []).slice(0, 4).map(function (x) { return { title: x.title, area: "skin" }; });
    var sub = r.sub_scores || {};
    return {
      notes: notes, feats: feats, ups: ups, points: c.points || null,
      overall: hide ? null : num(r.score),
      subs: hide ? [] : [["card.symmetry", "Symmetry (measured)", num(sub.symmetry)], ["card.proportion", "Proportion (measured)", num(sub.proportion)], ["card.harmony", "Harmony (measured)", num(sub.harmony)]].filter(function (x) { return x[2] != null; }),
      shape: r.face_shape ? r.face_shape.type : "", hide: !!hide
    };
  }
  function tag(score) { return score >= 8 ? ["result.strength", "Strength", ""] : ["result.can_refine", "Can refine", "refine"]; }

  /* background-position that centres a point of the photo inside a round crop */
  function focus(p, z) { function f(v) { return Math.max(0, Math.min(100, (v - 0.5 / z) / (1 - 1 / z) * 100)); } return f(p.x) + "% " + f(p.y) + "%"; }

  /* ---------- on the page ---------- */
  function render(root, o) {
    var r = o.result || {}, m = model(r, !!o.hideScores), free = o.plan === "free" || !o.plan;
    root.textContent = "";
    var card = el("section", "fzc"); card.setAttribute("aria-labelledby", "fzc-h");
    var head = el("div", "fzc-head"), logo = document.createElement("img"); logo.src = "/icon.svg"; logo.alt = ""; logo.width = 44; logo.height = 44;
    var ht = el("div"), h2 = el("h2", "", T("card.heading", "Face Analysis and Grooming Report")); h2.id = "fzc-h";
    ht.appendChild(h2); ht.appendChild(el("p", "fzc-sub", T("card.subtitle", "Based on visible features in your photo.") + (m.shape ? " " + T("card.shape", "Face shape: {shape}", { shape: m.shape }) : "")));
    if (o.sample) ht.appendChild(el("span", "fzc-tag", T("card.example", "Example data")));
    head.appendChild(logo); head.appendChild(ht); card.appendChild(head);

    var stage = el("div", "fzc-stage"), ph = el("div", "fzc-photo"), img = null, nophoto = null;
    stage.appendChild(ph);
    var ol = el("ol", "fzc-notes"); stage.appendChild(ol);
    AREAS.forEach(function (a, i) {
      if (!m.notes[a]) return;
      var li = el("li", "fzc-note n" + (i + 1)), t = el("div");
      li.appendChild(el("span", "fzc-num", String(i + 1))); var b = el("b", "", T(LABEL[a][0], LABEL[a][1])); t.appendChild(b); t.appendChild(el("span", "t", m.notes[a])); li.appendChild(t); ol.appendChild(li);
      if (m.points && m.points[a]) { var d = el("span", "fzc-dot", String(i + 1)); d.setAttribute("aria-hidden", "true"); d.style.left = (m.points[a].x * 100) + "%"; d.style.top = (m.points[a].y * 100) + "%"; ph.appendChild(d); }
    });
    card.appendChild(stage);

    if (m.overall != null || m.subs.length) {
      card.appendChild(el("h3", "", T("card.title", "AI Appearance Analysis Score")));
      var g = el("div", "fzc-grid");
      function tile(label, value, unit) { var t = el("div", "fzc-tile"); t.appendChild(el("span", "lbl", label)); var v = el("span", "val", String(Math.round(value))); if (unit) v.appendChild(el("small", "", unit)); t.appendChild(v); g.appendChild(t); }
      if (m.overall != null) tile(T("card.overall", "Overall"), m.overall, "/100");
      m.subs.forEach(function (s) { tile(T(s[0], s[1]), s[2]); });
      card.appendChild(g); card.appendChild(el("p", "fzc-fine", T("card.disclaimer", "")));
    } else if (m.hide) card.appendChild(el("p", "fzc-fine", T("card.scores_hidden", "Scores are hidden. You can show them in your settings.")));

    if (m.feats.length) {
      var h3 = el("h3", "", T("card.feature_notes", "Feature notes")); h3.appendChild(el("small", "", T("card.estimate", "AI estimate, can vary"))); card.appendChild(h3);
      var g2 = el("div", "fzc-grid");
      m.feats.forEach(function (x) {
        var t = el("div", "fzc-tile"); t.appendChild(el("span", "lbl", x.label));
        if (x.score != null) {
          var v = el("span", "val", String(x.score)); v.appendChild(el("small", "", "/10")); t.appendChild(v);
          var bar = el("div", "fzc-bar"), fill = el("i"); fill.style.width = (x.score * 10) + "%"; bar.appendChild(fill); t.appendChild(bar);
          var tg = tag(x.score); t.appendChild(el("span", "tg " + tg[2], T(tg[0], tg[1])));
        } else t.appendChild(el("span", "val", "-")), t.appendChild(el("span", "lbl", T("card.no_facial_hair", "No facial hair")));
        g2.appendChild(t);
      });
      card.appendChild(g2);
    }

    var upEls = [];
    if (m.ups.length) {
      card.appendChild(el("h3", "", T("card.upgrades", "Best upgrades")));
      var g3 = el("div", "fzc-grid");
      m.ups.forEach(function (u) { var t = el("div", "fzc-tile fzc-up"), p = el("span", "ph"); p.setAttribute("aria-hidden", "true"); t.appendChild(p); t.appendChild(el("span", "t", u.title)); g3.appendChild(t); upEls.push([p, u.area]); });
      card.appendChild(g3);
    }
    if (free) { var ft = el("div", "fzc-foot"); ft.appendChild(el("span", "", T("card.footer_cta", "Discover your best look with Facerizer"))); ft.appendChild(el("b", "", "facerizer.com")); card.appendChild(ft); }
    root.appendChild(card);

    /* photo (arrives later, or never when it was deleted) */
    var natural = null;
    function setPhoto(url) {
      if (nophoto) { nophoto.remove(); nophoto = null; }
      if (!url) { if (!nophoto) { nophoto = el("div", "fzc-nophoto", T("card.photo_missing", "Photo not available")); ph.appendChild(nophoto); } return; }
      if (!img) { img = document.createElement("img"); img.alt = ""; ph.insertBefore(img, ph.firstChild); }
      img.onload = function () { natural = { w: img.naturalWidth, h: img.naturalHeight }; if (natural.w && natural.h) ph.style.aspectRatio = natural.w + " / " + natural.h; };
      img.src = url; o.photoUrl = url;
      upEls.forEach(function (x) { var p = m.points && m.points[x[1]]; if (p) { x[0].style.backgroundImage = "url(\"" + url + "\")"; x[0].style.backgroundSize = "320% auto"; x[0].style.backgroundPosition = focus(p, 3.2); } });
    }
    setPhoto(o.photoUrl || null);

    /* download */
    var act = el("div", "fzc-actions");
    if (!o.sample) act.appendChild(el("p", "", T("card.download_warning", "This image contains your photo. Share it only with people you trust.")));
    var btn = el("button", "fzc-dl", T("card.download", "Download image")); btn.type = "button";
    var msg = el("p", "fzc-msg"); msg.setAttribute("role", "status");
    btn.addEventListener("click", function () {
      btn.disabled = true; msg.textContent = "";
      draw(m, o, free).then(function (res) {
        res.canvas.toBlob(function (blob) {
          btn.disabled = false;
          if (!blob) { msg.textContent = T("card.dl_failed", "Could not make the image. Please try again."); return; }
          var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "facerizer-card.png"; document.body.appendChild(a); a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
          if (!res.photoOk && o.photoUrl) msg.textContent = T("card.dl_nophoto", "The photo could not be added, so the image has no photo.");
        }, "image/png");
      }).catch(function () { btn.disabled = false; msg.textContent = T("card.dl_failed", "Could not make the image. Please try again."); });
    });
    act.appendChild(btn); act.appendChild(msg); root.appendChild(act);
    document.addEventListener("fz:lang", function () { if (root.isConnected) render(root, o); }, { once: true });
    return { setPhoto: setPhoto };
  }

  /* ---------- the downloadable image: 1080 x 1809 (design drawn at 800 x 1340, scaled) ---------- */
  var W = 800, H = 1340, SC = 1.35, FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", SERIF = "Georgia, 'Times New Roman', serif";
  function loadImg(url, cors) { return new Promise(function (res) { if (!url) return res(null); var i = new Image(); if (cors) i.crossOrigin = "anonymous"; i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = url; }); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function wrap(c, text, x, y, maxW, lh, align, maxLines) {
    var words = String(text || "").split(/\s+/), line = "", lines = [];
    words.forEach(function (w) { var t = line ? line + " " + w : w; if (c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    if (maxLines && lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "..."; }
    c.textAlign = align || "left"; lines.forEach(function (l, i) { c.fillText(l, x, y + i * lh); }); return lines.length;
  }
  function draw(m, o, free) {
    return Promise.all([loadImg(o.photoUrl, true), loadImg("/icon.svg", false)]).then(function (a) {
      var photo = a[0], logo = a[1];
      var cv = document.createElement("canvas"); cv.width = Math.round(W * SC); cv.height = Math.round(H * SC); var c = cv.getContext("2d"); c.scale(SC, SC);
      var BG = "#12323b", TILE = "rgba(255,255,255,0.07)", FG = "#f3fafb", MUTE = "#b4cbd0", MINT = "#5fd6c3";
      c.fillStyle = BG; c.fillRect(0, 0, W, H); c.textBaseline = "alphabetic";
      // header
      if (logo) c.drawImage(logo, 40, 34, 46, 46);
      c.fillStyle = FG; c.font = "700 26px " + SERIF; c.textAlign = "left"; c.fillText(T("card.heading", "Face Analysis and Grooming Report"), 100, 62);
      c.fillStyle = MUTE; c.font = "400 15px " + FONT; c.fillText(T("card.subtitle", "Based on visible features in your photo.") + (m.shape ? " " + T("card.shape", "Face shape: {shape}", { shape: m.shape }) : ""), 100, 86);
      // photo
      var PX = 250, PY = 130, PW = 300, PH = 400, dx = PX, dy = PY, dw = PW, dh = PH;
      c.save(); rr(c, PX, PY, PW, PH, 18); c.clip(); c.fillStyle = "#1d4651"; c.fillRect(PX, PY, PW, PH);
      if (photo) { var asp = photo.naturalWidth / photo.naturalHeight; if (asp > PW / PH) { dw = PW; dh = PW / asp; } else { dh = PH; dw = PH * asp; } dx = PX + (PW - dw) / 2; dy = PY + (PH - dh) / 2; c.drawImage(photo, dx, dy, dw, dh); }
      else { c.fillStyle = MUTE; c.font = "400 14px " + FONT; c.textAlign = "center"; c.fillText(T("card.photo_missing", "Photo not available"), PX + PW / 2, PY + PH / 2); }
      c.restore();
      // numbered dots and notes
      var side = { hair: [40, 150, "left"], eyes: [40, 290, "left"], skin: [40, 430, "left"], structure: [565, 190, "right"], facial_hair: [565, 410, "right"] };
      AREAS.forEach(function (ar, i) {
        if (!m.notes[ar]) return;
        var s = side[ar], pt = m.points && m.points[ar], px = pt ? dx + pt.x * dw : null, py = pt ? dy + pt.y * dh : null;
        if (pt && photo) { c.strokeStyle = "rgba(95,214,195,0.7)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px, py); c.lineTo(s[2] === "left" ? 236 : 564, s[1] + 10); c.stroke(); }
        if (pt && photo) { c.fillStyle = MINT; c.beginPath(); c.arc(px, py, 13, 0, 7); c.fill(); c.fillStyle = "#08262d"; c.font = "700 14px " + FONT; c.textAlign = "center"; c.fillText(String(i + 1), px, py + 5); }
        var tx = s[0], al = s[2] === "left" ? "left" : "left";
        c.fillStyle = MINT; c.beginPath(); c.arc(tx + 12, s[1], 12, 0, 7); c.fill(); c.fillStyle = "#08262d"; c.font = "700 13px " + FONT; c.textAlign = "center"; c.fillText(String(i + 1), tx + 12, s[1] + 4.5);
        c.fillStyle = FG; c.font = "700 17px " + FONT; c.textAlign = "left"; c.fillText(T(LABEL[ar][0], LABEL[ar][1]), tx + 32, s[1] + 5);
        c.fillStyle = MUTE; c.font = "400 14px " + FONT; wrap(c, m.notes[ar], tx + 32, s[1] + 28, 160, 19, "left", 6);
      });
      // score tiles
      var y = 575;
      function tiles(items, y0, h, draw1) { var n = items.length, gap = 10, tw = (W - 80 - gap * 3) / 4; items.forEach(function (it, i) { var x = 40 + i * (tw + gap); c.fillStyle = TILE; rr(c, x, y0, tw, h, 14); c.fill(); draw1(it, x, y0, tw); }); }
      if (m.overall != null || m.subs.length) {
        c.fillStyle = FG; c.font = "700 20px " + FONT; c.textAlign = "left"; c.fillText(T("card.title", "AI Appearance Analysis Score"), 40, y);
        var items = []; if (m.overall != null) items.push([T("card.overall", "Overall"), m.overall, "/100"]); m.subs.forEach(function (s) { items.push([T(s[0], s[1]), s[2], ""]); });
        tiles(items, y + 18, 92, function (it, x, y0) { c.fillStyle = MUTE; c.font = "400 13px " + FONT; c.textAlign = "left"; wrap(c, it[0], x + 14, y0 + 24, 150, 16, "left", 2); c.fillStyle = FG; c.font = "700 32px " + SERIF; c.fillText(String(Math.round(it[1])), x + 14, y0 + 74); if (it[2]) { var w = c.measureText(String(Math.round(it[1]))).width; c.fillStyle = MUTE; c.font = "400 14px " + FONT; c.fillText(it[2], x + 18 + w, y0 + 74); } });
        c.fillStyle = MUTE; c.font = "400 12px " + FONT; wrap(c, T("card.disclaimer", ""), 40, y + 132, W - 80, 16, "left", 3);
      } else if (m.hide) { c.fillStyle = MUTE; c.font = "400 14px " + FONT; wrap(c, T("card.scores_hidden", "Scores are hidden. You can show them in your settings."), 40, y, W - 80, 19, "left", 2); }
      // feature notes
      y = 800;
      if (m.feats.length) {
        c.fillStyle = FG; c.font = "700 20px " + FONT; c.textAlign = "left"; c.fillText(T("card.feature_notes", "Feature notes"), 40, y);
        var w1 = c.measureText(T("card.feature_notes", "Feature notes")).width; c.fillStyle = MUTE; c.font = "400 14px " + FONT; c.fillText(T("card.estimate", "AI estimate, can vary"), 40 + w1 + 12, y);
        tiles(m.feats, y + 18, 118, function (it, x, y0, tw) {
          c.fillStyle = MUTE; c.font = "400 13px " + FONT; c.textAlign = "left"; c.fillText(it.label, x + 14, y0 + 24);
          if (it.score != null) {
            c.fillStyle = FG; c.font = "700 30px " + SERIF; c.fillText(String(it.score), x + 14, y0 + 62); var w = c.measureText(String(it.score)).width; c.fillStyle = MUTE; c.font = "400 14px " + FONT; c.fillText("/10", x + 18 + w, y0 + 62);
            c.fillStyle = "rgba(255,255,255,0.14)"; rr(c, x + 14, y0 + 74, tw - 28, 6, 3); c.fill(); c.fillStyle = MINT; rr(c, x + 14, y0 + 74, (tw - 28) * it.score / 10, 6, 3); c.fill();
            var tg = tag(it.score); c.fillStyle = MINT; c.font = "400 13px " + FONT; c.fillText(T(tg[0], tg[1]), x + 14, y0 + 102);
          } else { c.fillStyle = FG; c.font = "700 30px " + SERIF; c.fillText("-", x + 14, y0 + 62); c.fillStyle = MUTE; c.font = "400 13px " + FONT; wrap(c, T("card.no_facial_hair", "No facial hair"), x + 14, y0 + 90, tw - 28, 16, "left", 2); }
        });
      }
      // best upgrades
      y = 1000;
      if (m.ups.length) {
        c.fillStyle = FG; c.font = "700 20px " + FONT; c.textAlign = "left"; c.fillText(T("card.upgrades", "Best upgrades"), 40, y);
        tiles(m.ups, y + 18, 150, function (it, x, y0, tw) {
          var cx = x + 14 + 30, cy = y0 + 14 + 30, p = m.points && m.points[it.area];
          c.save(); c.beginPath(); c.arc(cx, cy, 30, 0, 7); c.clip(); c.fillStyle = "#1d4651"; c.fillRect(cx - 30, cy - 30, 60, 60);
          if (photo && p) { var s = 0.3 * Math.min(photo.naturalWidth, photo.naturalHeight), sx = Math.max(0, Math.min(photo.naturalWidth - s, p.x * photo.naturalWidth - s / 2)), sy = Math.max(0, Math.min(photo.naturalHeight - s, p.y * photo.naturalHeight - s / 2)); c.drawImage(photo, sx, sy, s, s, cx - 30, cy - 30, 60, 60); }
          c.restore(); c.strokeStyle = "rgba(255,255,255,0.2)"; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, 30, 0, 7); c.stroke();
          c.fillStyle = FG; c.font = "600 14px " + FONT; c.textAlign = "left"; wrap(c, it.title, x + 14, y0 + 100, tw - 24, 18, "left", 3);
        });
      }
      // bottom
      c.strokeStyle = "rgba(255,255,255,0.16)"; c.lineWidth = 1; c.beginPath(); c.moveTo(40, 1226); c.lineTo(W - 40, 1226); c.stroke();
      if (free) {
        if (logo) c.drawImage(logo, 40, 1282, 34, 34);
        c.fillStyle = FG; c.font = "600 15px " + FONT; c.textAlign = "left"; c.fillText(T("card.footer_cta", "Discover your best look with Facerizer"), 84, 1304);
        c.fillStyle = MINT; c.font = "700 15px " + FONT; c.textAlign = "right"; c.fillText("facerizer.com", W - 40, 1304);
      }
      return { canvas: cv, photoOk: !!photo };
    });
  }

  window.FZCard = { render: render, model: model };
})();
