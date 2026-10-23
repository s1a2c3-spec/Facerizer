(function () {
  var cfg = window.FACERIZER || {};
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function state(t, err) { var s = $("state"); s.hidden = false; s.textContent = t; s.style.color = err ? "#b3261e" : ""; }
  function fmt(d) { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  function ymd(d) { var x = new Date(d); return x.getFullYear() + "-" + ("0" + (x.getMonth() + 1)).slice(-2) + "-" + ("0" + x.getDate()).slice(-2); }
  var DAY = 86400000;

  var sb = null, demo = false, hide = false;
  var items = [];          // analyses, oldest first: { id, date, score, sub, shape, hair, photoPath, svg }
  var taskDates = [], dayKeys = [];
  var urlCache = {};
  var pickB = 0, pickA = 0;

  // ---------- panes ----------
  function paneContent(node, it, label) {
    node.textContent = "";
    if (!it) return;
    if (it.svg) { node.innerHTML = it.svg; return; }           // sample illustration (fixed markup)
    if (!it.photoPath) { node.appendChild(el("span", "", "Photo not available (it may have been deleted).")); return; }
    var cached = urlCache[it.photoPath];
    function show(url) {
      var img = document.createElement("img");
      img.alt = label + " photo from " + fmt(it.date);
      img.src = url; img.decoding = "async";
      node.textContent = ""; node.appendChild(img);
    }
    if (cached) return show(cached);
    node.appendChild(el("span", "", "Loading photo..."));
    sb.storage.from("photos").createSignedUrl(it.photoPath, 600).then(function (res) {
      if (res.error || !res.data) { node.textContent = ""; node.appendChild(el("span", "", "Could not load this photo.")); return; }
      urlCache[it.photoPath] = res.data.signedUrl; show(res.data.signedUrl);
    });
  }

  // ---------- slider ----------
  function setPos(v) {
    v = Math.max(0, Math.min(100, v));
    var clip = "inset(0 0 0 " + v + "%)";
    $("ba-a").style.clipPath = clip; $("ba-a").style.webkitClipPath = clip;
    $("ba-line").style.left = v + "%"; $("ba-handle").style.left = v + "%";
  }
  $("ba-range").addEventListener("input", function (e) { setPos(+e.target.value); });
  function setView(side) {
    $("slider-wrap").hidden = side; $("side-wrap").hidden = !side;
    $("v-slider").className = side ? "" : "on"; $("v-side").className = side ? "on" : "";
  }
  $("v-slider").addEventListener("click", function () { setView(false); });
  $("v-side").addEventListener("click", function () { setView(true); });

  // ---------- table ----------
  function hairText(h) {
    if (!h) return "-";
    var bits = [];
    if (h.type && h.type !== "unclear") bits.push(h.type);
    if (h.length && h.length !== "unclear") bits.push(h.length + " length");
    if (h.density && h.density !== "unclear") bits.push(h.density);
    return bits.length ? bits.join(", ") : "-";
  }
  function paintDiff() {
    var a = items[pickB], b = items[pickA], box = $("diff"); box.textContent = "";
    if (!a || !b) return;
    if (pickA === pickB) { box.appendChild(el("p", "card-text", "Choose two different photos to see what changed.")); $("period").textContent = ""; return; }
    var rows = [];
    rows.push(["Face shape", a.shape || "-", b.shape || "-", a.shape && b.shape ? (a.shape === b.shape ? "Same" : "Reads differently") : ""]);
    rows.push(["Hair we can see", hairText(a.hair), hairText(b.hair), ""]);
    if (!hide && a.score != null && b.score != null) {
      var d = b.score - a.score;
      rows.push(["Overall score", String(a.score), String(b.score), Math.abs(d) < 4 ? "No clear change" : (d > 0 ? "+" : "") + d]);
      if (a.sub && b.sub) [["harmony", "Face harmony"], ["proportion", "Proportions"], ["symmetry", "Symmetry"]].forEach(function (k) {
        var dd = b.sub[k[0]] - a.sub[k[0]];
        rows.push([k[1], String(a.sub[k[0]]), String(b.sub[k[0]]), Math.abs(dd) < 4 ? "No clear change" : (dd > 0 ? "+" : "") + dd]);
      });
    }
    var t = el("table", "diff"), head = el("tr");
    ["", "Before", "After", "Change"].forEach(function (h2) { head.appendChild(el("th", "", h2)); });
    t.appendChild(head);
    rows.forEach(function (r) { var tr = el("tr"); r.forEach(function (c) { tr.appendChild(el("td", "", c)); }); t.appendChild(tr); });
    box.appendChild(t);

    // what you did between the two dates
    var t0 = new Date(a.date).getTime(), t1 = new Date(b.date).getTime();
    var lo = Math.min(t0, t1), hi = Math.max(t0, t1);
    var days = Math.round((hi - lo) / DAY);
    var tasks = taskDates.filter(function (x) { var tt = new Date(x).getTime(); return tt >= lo && tt <= hi; }).length;
    var loK = ymd(lo), hiK = ymd(hi);
    var routine = dayKeys.filter(function (k) { return k >= loK && k <= hiK; }).length;
    var p = $("period"); p.textContent = "";
    p.appendChild(el("span", "", days + " day" + (days === 1 ? "" : "s") + " apart"));
    p.appendChild(el("span", "", tasks + " plan task" + (tasks === 1 ? "" : "s") + " done"));
    p.appendChild(el("span", "", routine + " day" + (routine === 1 ? "" : "s") + " with your routine ticked"));
  }

  // ---------- selects ----------
  function optLabel(it) {
    var bits = [fmt(it.date)];
    if (it.shape) bits.push(it.shape);
    if (!hide && it.score != null) bits.push(it.score + "/100");
    if (!it.photoPath && !it.svg) bits.push("no photo");
    return bits.join(" - ");
  }
  function fillSelects() {
    ["sel-b", "sel-a"].forEach(function (id) {
      var s = $(id); s.textContent = "";
      items.forEach(function (it, i) { var o = el("option", "", optLabel(it)); o.value = String(i); s.appendChild(o); });
    });
    $("sel-b").value = String(pickB); $("sel-a").value = String(pickA);
  }
  function refresh() {
    var a = items[pickB], b = items[pickA];
    paneContent($("ba-b"), a, "Before"); paneContent($("ba-a"), b, "After");
    paneContent($("sb-b"), a, "Before"); paneContent($("sb-a"), b, "After");
    $("cap-b").textContent = fmt(a.date); $("cap-a").textContent = fmt(b.date);
    $("cap-both").textContent = "Before: " + fmt(a.date) + "   |   After: " + fmt(b.date);
    paintDiff();
  }
  $("sel-b").addEventListener("change", function (e) { pickB = +e.target.value; refresh(); });
  $("sel-a").addEventListener("change", function (e) { pickA = +e.target.value; refresh(); });
  $("swap").addEventListener("click", function () { var t = pickB; pickB = pickA; pickA = t; fillSelects(); refresh(); });

  function start() {
    if (items.length < 2) { state("You need at least two analyses to compare. Run another analysis and come back."); return; }
    pickB = 0; pickA = items.length - 1;
    fillSelects(); setPos(50); refresh();
    $("demo-bar").hidden = !demo;
    $("state").hidden = true; $("locked").hidden = true; $("cmp").hidden = false;
  }

  // ---------- sample ----------
  if (/[?&]demo=1/.test(window.location.search)) {
    demo = true;
    var wait = function () {
      var H = window.facerizerHair;
      if (!H) return setTimeout(wait, 60);
      var now = Date.now();
      function mk(daysAgo, score, sub, key) { return { id: "d" + daysAgo, date: new Date(now - daysAgo * DAY).toISOString(), score: score, sub: sub, shape: "Oval", hair: { type: "wavy", length: key === "crop" ? "short" : "medium", density: "thick" }, svg: H.svg(key) }; }
      items = [mk(70, 76, { harmony: 74, proportion: 77, symmetry: 76 }, "crop"), mk(35, 79, { harmony: 78, proportion: 80, symmetry: 79 }, "curtains"), mk(1, 81, { harmony: 80, proportion: 82, symmetry: 81 }, "layered")];
      for (var i = 0; i < 40; i++) { taskDates.push(new Date(now - ((i * 3) % 68) * DAY).toISOString()); }
      for (var j = 0; j < 70; j++) { if ((j * 7 + 3) % 10 < 7) dayKeys.push(ymd(now - j * DAY)); }
      start();
    };
    wait();
    return;
  }

  var ready = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_URL.indexOf("YOUR_") === -1 && window.supabase;
  if (!ready) return state("Setup is not finished: add your Supabase details in config.js.", true);
  sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  sb.auth.getSession().then(function (s) {
    var session = s.data.session;
    if (!session) { window.location.href = "/login"; return; }
    Promise.all([
      sb.from("profiles").select("plan, hide_scores").eq("id", session.user.id).maybeSingle(),
      sb.from("analyses").select("id, created_at, photo_id, result").eq("status", "done").order("created_at", { ascending: true }).limit(300),
      sb.from("checkins").select("day").limit(500),
      sb.from("plan_progress").select("done_at").limit(2000)
    ]).then(function (out) {
      var err = out[0].error || out[1].error || out[2].error || out[3].error;
      if (err) { console.error(err); return state("Could not load your data (" + err.message + ").", true); }
      var plan = (out[0].data && out[0].data.plan) || "free";
      if (plan !== "premium") { $("state").hidden = true; $("locked").hidden = false; return; }
      hide = !!(out[0].data && out[0].data.hide_scores);
      taskDates = (out[3].data || []).map(function (x) { return x.done_at; });
      dayKeys = (out[2].data || []).map(function (x) { return x.day; });
      var rows = out[1].data || [];
      var ids = rows.map(function (r) { return r.photo_id; }).filter(Boolean);
      var getPhotos = ids.length ? sb.from("photos").select("id, path").in("id", ids) : Promise.resolve({ data: [] });
      getPhotos.then(function (pr) {
        var paths = {}; ((pr && pr.data) || []).forEach(function (p) { paths[p.id] = p.path; });
        items = rows.map(function (r) {
          var x = r.result || {};
          return { id: r.id, date: r.created_at, score: x.score != null ? x.score : null, sub: x.sub_scores || null, shape: x.face_shape ? x.face_shape.type : "", hair: x.visible_hair || null, photoPath: r.photo_id ? (paths[r.photo_id] || null) : null };
        });
        start();
      });
    });
  });
})();
