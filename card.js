/* Facerizer photo card (Phase 4).
   FZCard.render(rootElement, { result, photoUrl, plan, hideScores, sample })  ->  { setPhoto(url) }
   - The card on the page IS the image that gets downloaded: one drawing, 1080 x 1809 PNG. Tap it to see it larger.
   - The photo is cropped around the face (using the 5 saved spots), the 5 numbered markers sit on it, the notes stand on both sides.
   - Free plan: Facerizer logo and facerizer.com at the bottom. Paid plans: clean.
   - Older reports have no "card" data: the card is built from the older fields (no 1 to 10 numbers, no markers, whole photo).
   - A hidden text copy of the card (for screen readers) sits next to the image.
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
      notes: notes, feats: feats, ups: ups, points: fixPoints(c.points),
      overall: hide ? null : num(r.score),
      subs: hide ? [] : [["card.symmetry", "Symmetry (measured)", num(sub.symmetry)], ["card.proportion", "Proportion (measured)", num(sub.proportion)], ["card.harmony", "Harmony (measured)", num(sub.harmony)]].filter(function (x) { return x[2] != null; }),
      shape: r.face_shape ? r.face_shape.type : "", hide: !!hide
    };
  }
  // Earlier reports put the cheek dot on the same side of the face as the eye dot (all dots bunched on one side).
  // Move that cheek dot to the other cheek. New reports already have it there, so they are left alone.
  function fixPoints(p) {
    if (!p) return null;
    var q = {}, k; for (k in p) q[k] = p[k];
    if (q.skin && q.eyes && q.facial_hair) {
      var cx = q.hair ? (q.facial_hair.x + q.hair.x) / 2 : q.facial_hair.x;
      if ((q.skin.x - cx) * (q.eyes.x - cx) > 0) q.skin = { x: Math.max(0.02, Math.min(0.98, cx + (cx - q.skin.x) * 1.35)), y: q.skin.y };
    }
    for (k in q) q[k] = { x: Math.max(0.07, Math.min(0.93, q[k].x)), y: Math.max(0.06, Math.min(0.94, q[k].y)) };   // keep the whole marker inside the photo
    return q;
  }
  function tag(score) { return score >= 8 ? ["result.strength", "Strength", ""] : ["result.can_refine", "Can refine", "refine"]; }

  /* background-position that centres a point of the photo inside a round crop */
  function focus(p, z) { function f(v) { return Math.max(0, Math.min(100, (v - 0.5 / z) / (1 - 1 / z) * 100)); } return f(p.x) + "% " + f(p.y) + "%"; }

  /* ---------- crop around the face ---------- */
  var WIN = { x: 250, y: 130, w: 300, h: 400 };           // the photo window inside the 800 x 1340 design
  function cropRect(pts, W, H, asp) {
    var keys = pts ? Object.keys(pts) : []; if (!keys.length || !W || !H) return null;
    var minY = 1, maxY = 0, sx = 0;
    keys.forEach(function (k) { minY = Math.min(minY, pts[k].y); maxY = Math.max(maxY, pts[k].y); sx += pts[k].x; });
    var ch = Math.max(0.12, maxY - minY) * H * 2.0, cw = ch * asp;           // hair-to-chin takes about half of the crop
    if (cw > W) { cw = W; ch = cw / asp; } if (ch > H) { ch = H; cw = ch * asp; }
    var cx = sx / keys.length * W, cy = (minY + maxY) / 2 * H - 0.02 * H;
    return { sx: Math.max(0, Math.min(W - cw, cx - cw / 2)), sy: Math.max(0, Math.min(H - ch, cy - ch / 2)), cw: cw, ch: ch };
  }
  /* which note stands left or right of the photo: by where its marker is (so lines do not cross the face) */
  function sidesFor(order, mx, mid) {
    var L = [], R = [];
    order.forEach(function (i) {
      var x = mx[i], left = x == null ? i < 3 : (Math.abs(x - mid) < 14 ? i % 2 === 0 : x < mid);
      (left ? L : R).push(i);
    });
    while (L.length > 3) R.push(L.pop()); while (R.length > 3) L.push(R.pop());
    return { L: L, R: R };
  }
  var SLOTS = { 1: [290], 2: [200, 380], 3: [150, 290, 430] };

  /* ---------- on the page ---------- */
  function render(root, o) {
    var r = o.result || {}, m = model(r, !!o.hideScores), free = o.plan === "free" || !o.plan;
    root.textContent = "";
    var state = { blob: null, url: null, tainted: false, photo: null };
    var fig = el("figure", "fzc2"), openBtn = el("button", "fzc2-open"); openBtn.type = "button";
    var img = document.createElement("img"); img.className = "fzc2-img"; img.width = 1080; img.height = 1809; img.alt = "";
    openBtn.appendChild(img); fig.appendChild(openBtn);
    var host = el("div", "fzc2-canvas"); host.hidden = true; fig.appendChild(host);          // used only when the photo cannot be read into a PNG
    var sr = el("div", "fzc-sr"); fig.appendChild(sr);
    root.appendChild(fig);

    function describe() {
      var alt = T("card.heading", "Face Analysis and Grooming Report") + ". " + T("card.subtitle", "Based on visible features in your photo.") + (m.shape ? " " + T("card.shape", "Face shape: {shape}", { shape: m.shape }) : "") + (m.overall != null ? " " + T("card.title", "AI Appearance Analysis Score") + ": " + Math.round(m.overall) + "/100." : "");
      img.alt = alt + " " + T("card.open", "Tap to see it larger.");
      openBtn.setAttribute("aria-label", T("card.open", "Tap to see it larger."));
      sr.textContent = "";
      sr.appendChild(el("h2", "", T("card.heading", "Face Analysis and Grooming Report")));
      var ol = el("ol"); AREAS.forEach(function (a) { if (m.notes[a]) ol.appendChild(el("li", "", T(LABEL[a][0], LABEL[a][1]) + ": " + m.notes[a])); }); sr.appendChild(ol);
      if (m.overall != null || m.subs.length) { var u = el("ul"); if (m.overall != null) u.appendChild(el("li", "", T("card.overall", "Overall") + ": " + Math.round(m.overall) + "/100")); m.subs.forEach(function (s) { u.appendChild(el("li", "", T(s[0], s[1]) + ": " + Math.round(s[2]))); }); sr.appendChild(el("h3", "", T("card.title", "AI Appearance Analysis Score"))); sr.appendChild(u); sr.appendChild(el("p", "", T("card.disclaimer", ""))); }
      else if (m.hide) sr.appendChild(el("p", "", T("card.scores_hidden", "Scores are hidden. You can show them in your settings.")));
      if (m.feats.length) { var f = el("ul"); m.feats.forEach(function (x) { var t = tag(x.score == null ? 0 : x.score); f.appendChild(el("li", "", x.label + ": " + (x.score != null ? x.score + "/10, " + T(t[0], t[1]) : T("card.no_facial_hair", "No facial hair")))); }); sr.appendChild(el("h3", "", T("card.feature_notes", "Feature notes") + " (" + T("card.estimate", "AI estimate, can vary") + ")")); sr.appendChild(f); }
      if (m.ups.length) { var g = el("ul"); m.ups.forEach(function (x) { g.appendChild(el("li", "", x.title)); }); sr.appendChild(el("h3", "", T("card.upgrades", "Best upgrades"))); sr.appendChild(g); }
    }

    var seq = 0;
    function paint() {                          // draw the card and show it
      var my = ++seq;
      return draw(m, { photoUrl: state.photoOk === false ? null : o.photoUrl }, free, false).then(function (res) {
        if (my !== seq) return;
        state.tainted = false; host.hidden = true; host.textContent = "";
        new Promise(function (ok) { try { res.canvas.toBlob(ok, "image/png"); } catch (e) { ok(null); } }).then(function (blob) {
          if (my !== seq) return;
          if (blob) { if (state.url) URL.revokeObjectURL(state.url); state.blob = blob; state.url = URL.createObjectURL(blob); img.src = state.url; openBtn.hidden = false; }
          else { state.blob = null; state.tainted = true; openBtn.hidden = true; host.hidden = false; res.canvas.className = "fzc2-img"; host.appendChild(res.canvas); }
        });
      });
    }
    function setPhoto(url) { o.photoUrl = url || null; state.photoOk = true; return paint(); }
    describe(); paint();

    /* tap: the card larger (scroll sideways on a phone, or pinch to zoom) */
    openBtn.addEventListener("click", function () {
      if (!state.url) return;
      var box = el("div", "fzc2-lb"); box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
      var sc = el("div", "fzc2-lb-scroll"), big = document.createElement("img"); big.src = state.url; big.alt = img.alt; sc.appendChild(big);
      var cb = el("button", "fzc2-lb-close"); cb.type = "button"; cb.setAttribute("aria-label", T("common.close", "Close")); cb.textContent = "\u2715";
      function close() { box.remove(); document.removeEventListener("keydown", onk); openBtn.focus(); }
      function onk(e) { if (e.key === "Escape") { e.stopPropagation(); close(); } }
      cb.addEventListener("click", close); box.addEventListener("click", function (e) { if (e.target === box || e.target === sc) close(); }); document.addEventListener("keydown", onk, true);
      box.appendChild(sc); box.appendChild(cb); document.body.appendChild(box); cb.focus();
    });

    /* download */
    var act = el("div", "fzc-actions");
    if (!o.sample) act.appendChild(el("p", "", T("card.download_warning", "This image contains your photo. Share it only with people you trust.")));
    var btn = el("button", "fzc-dl", T("card.download", "Download image")); btn.type = "button";
    var msg = el("p", "fzc-msg"); msg.setAttribute("role", "status");
    function save(blob) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "facerizer-card.png"; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
    btn.addEventListener("click", function () {
      msg.textContent = "";
      if (state.blob) { save(state.blob); return; }
      btn.disabled = true;                      // the photo could not be read into a PNG: make the image without the photo
      draw(m, { photoUrl: null }, free, false).then(function (res) {
        res.canvas.toBlob(function (blob) { btn.disabled = false; if (!blob) { msg.textContent = T("card.dl_failed", "Could not make the image. Please try again."); return; } save(blob); msg.textContent = T("card.dl_nophoto", "The photo could not be added, so the image has no photo."); }, "image/png");
      }).catch(function () { btn.disabled = false; msg.textContent = T("card.dl_failed", "Could not make the image. Please try again."); });
    });
    act.appendChild(btn); act.appendChild(msg); root.appendChild(act);
    document.addEventListener("fz:lang", function () { if (root.isConnected) { describe(); btn.textContent = T("card.download", "Download image"); paint(); } });
    return { setPhoto: setPhoto };
  }

  /* ---------- the image: 1080 x 1809 (design drawn at 800 x 1340, scaled) ---------- */
  var W = 800, H = 1340, SC = 1.35, FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", SERIF = "Georgia, 'Times New Roman', serif";
  function loadImg(url, cors) { return new Promise(function (res) { if (!url) return res(null); var i = new Image(); if (cors) i.crossOrigin = "anonymous"; i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = url; }); }
  function loadPhoto(url) { return loadImg(url, true).then(function (i) { return i || loadImg(url, false).then(function (j) { return j ? { img: j, taint: true } : null; }); }).then(function (i) { return i && i.img ? i : (i ? { img: i, taint: false } : null); }); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function wrap(c, text, x, y, maxW, lh, align, maxLines) {
    var words = String(text || "").split(/\s+/), line = "", lines = [];
    words.forEach(function (w) { var t = line ? line + " " + w : w; if (c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    if (maxLines && lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "..."; }
    c.textAlign = align || "left"; lines.forEach(function (l, i) { c.fillText(l, x, y + i * lh); }); return lines.length;
  }
  function draw(m, o, free) {
    return Promise.all([loadPhoto(o.photoUrl), loadImg("/icon.svg", false), loadImg("/markers.png", false)]).then(function (a) {
      var pr = a[0], photo = pr ? pr.img : null, logo = a[1], spr = a[2];
      var cv = document.createElement("canvas"); cv.width = Math.round(W * SC); cv.height = Math.round(H * SC); var c = cv.getContext("2d"); c.scale(SC, SC);
      var BG = "#12323b", TILE = "rgba(255,255,255,0.07)", FG = "#f3fafb", MUTE = "#b4cbd0", MINT = "#5fd6c3";
      function marker(i, x, y, r) {
        if (spr) { c.drawImage(spr, i * 128, 0, 128, 128, x - r, y - r, 2 * r, 2 * r); return; }
        c.fillStyle = MINT; c.beginPath(); c.arc(x, y, r * 0.7, 0, 7); c.fill(); c.fillStyle = "#08262d"; c.font = "700 " + Math.round(r * 0.8) + "px " + FONT; c.textAlign = "center"; c.fillText(String(i + 1), x, y + r * 0.28);
      }
      c.fillStyle = BG; c.fillRect(0, 0, W, H); c.textBaseline = "alphabetic";
      // header
      if (logo) c.drawImage(logo, 40, 34, 46, 46);
      c.fillStyle = FG; c.font = "700 26px " + SERIF; c.textAlign = "left"; c.fillText(T("card.heading", "Face Analysis and Grooming Report"), 100, 62);
      c.fillStyle = MUTE; c.font = "400 15px " + FONT; c.fillText(T("card.subtitle", "Based on visible features in your photo.") + (m.shape ? " " + T("card.shape", "Face shape: {shape}", { shape: m.shape }) : ""), 100, 86);
      // photo window: cropped around the face when the 5 spots are known, else the whole photo
      var PX = WIN.x, PY = WIN.y, PW = WIN.w, PH = WIN.h, crop = null, dx = PX, dy = PY, dw = PW, dh = PH;
      c.save(); rr(c, PX, PY, PW, PH, 18); c.clip(); c.fillStyle = "#1d4651"; c.fillRect(PX, PY, PW, PH);
      if (photo) {
        var nw = photo.naturalWidth, nh = photo.naturalHeight; crop = cropRect(m.points, nw, nh, PW / PH);
        if (crop) c.drawImage(photo, crop.sx, crop.sy, crop.cw, crop.ch, PX, PY, PW, PH);
        else { var asp = nw / nh; if (asp > PW / PH) { dw = PW; dh = PW / asp; } else { dh = PH; dw = PH * asp; } dx = PX + (PW - dw) / 2; dy = PY + (PH - dh) / 2; c.drawImage(photo, dx, dy, dw, dh); }
      } else { c.fillStyle = MUTE; c.font = "400 14px " + FONT; c.textAlign = "center"; c.fillText(T("card.photo_missing", "Photo not available"), PX + PW / 2, PY + PH / 2); }
      c.restore();
      // where each marker sits (in the design's units)
      var MR = 16, mpos = {}, mx = {};
      if (photo && m.points) AREAS.forEach(function (ar, i) {
        var pt = m.points[ar]; if (!pt || !m.notes[ar]) return;
        var x = crop ? PX + (pt.x * photo.naturalWidth - crop.sx) / crop.cw * PW : dx + pt.x * dw, y = crop ? PY + (pt.y * photo.naturalHeight - crop.sy) / crop.ch * PH : dy + pt.y * dh;
        mpos[ar] = [Math.max(PX + MR, Math.min(PX + PW - MR, x)), Math.max(PY + MR, Math.min(PY + PH - MR, y))]; mx[i] = mpos[ar][0];
      });
      var order = []; AREAS.forEach(function (ar, i) { if (m.notes[ar]) order.push(i); });
      var sides = sidesFor(order, mx, PX + PW / 2);
      // notes on both sides, with a thin line to their marker
      function place(list, left) {
        var ys = SLOTS[Math.max(1, Math.min(3, list.length))] || [], sorted = list.slice().sort(function (p, q) { var a1 = mpos[AREAS[p]], b1 = mpos[AREAS[q]]; return (a1 ? a1[1] : p) - (b1 ? b1[1] : q); });
        sorted.forEach(function (i, k) {
          var ar = AREAS[i], y = ys[k], tx = left ? 40 : 565, mp = mpos[ar];
          if (mp) { c.strokeStyle = "rgba(95,214,195,0.7)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(mp[0], mp[1]); c.lineTo(left ? 236 : 564, y + 10); c.stroke(); }
          marker(i, tx + 14, y, 21);
          c.fillStyle = FG; c.font = "700 17px " + FONT; c.textAlign = "left"; c.fillText(T(LABEL[ar][0], LABEL[ar][1]), tx + 40, y + 5);
          c.fillStyle = MUTE; c.font = "400 14px " + FONT; wrap(c, m.notes[ar], tx + 40, y + 28, 150, 19, "left", 6);
        });
      }
      place(sides.L, true); place(sides.R, false);
      AREAS.forEach(function (ar, i) { if (mpos[ar]) marker(i, mpos[ar][0], mpos[ar][1], MR); });
      // score tiles
      var y = 575;
      function tiles(items, y0, h, draw1) { var gap = 10, tw = (W - 80 - gap * 3) / 4; items.forEach(function (it, i) { var x = 40 + i * (tw + gap); c.fillStyle = TILE; rr(c, x, y0, tw, h, 14); c.fill(); draw1(it, x, y0, tw); }); }
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
      // best upgrades (round crops of the person's own photo)
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

  window.FZCard = { render: render, model: model, _t: { cropRect: cropRect, sidesFor: sidesFor, fixPoints: fixPoints } };
})();
