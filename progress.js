(function () {
  var cfg = window.FACERIZER || {};
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function state(t, err) { var s = $("state"); s.hidden = false; s.textContent = t; s.style.color = err ? "#b3261e" : ""; }

  var DAY = 86400000;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseYmd(k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmt(d) { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  function fmtShort(d) { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); }
  function weekStart(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

  var model = null; // everything the page shows, also used for the PDF

  function streaks(days) {
    var d = new Date();
    if (!days[ymd(d)]) d.setDate(d.getDate() - 1);
    var cur = 0;
    while (days[ymd(d)]) { cur++; d.setDate(d.getDate() - 1); }
    var keys = Object.keys(days).sort(), best = 0, run = 0, prev = null;
    keys.forEach(function (k) {
      var dt = parseYmd(k);
      if (prev && Math.round((dt - prev) / DAY) === 1) run++; else run = 1;
      if (run > best) best = run;
      prev = dt;
    });
    return { cur: cur, best: best };
  }

  function build(analyses, checkinDays, taskDates, hide) {
    var m = { hide: hide, analyses: [], days: checkinDays, taskDates: taskDates };
    analyses.forEach(function (a) {
      var r = a.result || {};
      m.analyses.push({ date: a.created_at, score: r.score != null ? r.score : null, sub: r.sub_scores || null, shape: r.face_shape ? r.face_shape.type : "" });
    });
    var st = streaks(checkinDays);
    m.streak = st.cur; m.longest = st.best;
    m.tasks = taskDates.length;
    m.checkins = Object.keys(checkinDays).length;
    m.first = m.analyses.length ? new Date(m.analyses[0].date) : null;
    m.dayNo = m.first ? Math.floor((Date.now() - m.first.getTime()) / DAY) + 1 : 0;

    // checkpoints: Day 1, 30, 60, 90 (a photo within 5 days of the date counts)
    m.checkpoints = [];
    [1, 30, 60, 90].forEach(function (n) {
      if (!m.first) return;
      var target = new Date(m.first.getTime() + (n - 1) * DAY);
      var hit = null;
      m.analyses.forEach(function (a) { if (!hit && Math.abs(new Date(a.date).getTime() - target.getTime()) <= 5 * DAY) hit = a; });
      var status;
      if (hit) status = "done";
      else if (Date.now() < target.getTime() - 5 * DAY) status = "upcoming";
      else if (Date.now() <= target.getTime() + 5 * DAY) status = "due";
      else status = "missed";
      m.checkpoints.push({ day: n, date: target.toISOString(), status: status, analysis: hit });
    });
    return m;
  }

  function paintStats(m) {
    var s = $("stats"); s.textContent = "";
    [[m.analyses.length, "analyses done"], [m.streak, "day streak"], [m.longest, "longest streak"], [m.tasks, "tasks done"], [m.dayNo || 0, "days since Day 1"]].forEach(function (x) {
      var c = el("div", "stat"); c.appendChild(el("b", "", String(x[0]))); c.appendChild(el("span", "", x[1])); s.appendChild(c);
    });
    $("p-sub").textContent = m.first ? "Day 1 was " + fmt(m.first) : "Run your first analysis to start tracking.";
  }

  function paintScore(m) {
    var box = $("c-score"), note = $("c-note"); box.textContent = ""; note.textContent = "";
    if (m.hide) { note.textContent = "You chose to hide scores, so the graph is off. You can turn scores on in your profile settings."; return; }
    var pts = m.analyses.filter(function (a) { return a.score != null; });
    if (pts.length < 2) { note.textContent = pts.length ? "Run another analysis to see how your score moves." : "No scores yet."; return; }
    var W = 600, H = 230, L = 36, R = 16, T = 20, B = 34;
    var min = Math.min.apply(null, pts.map(function (p) { return p.score; })), max = Math.max.apply(null, pts.map(function (p) { return p.score; }));
    min = Math.max(0, Math.floor((min - 6) / 5) * 5); max = Math.min(100, Math.ceil((max + 6) / 5) * 5);
    if (max - min < 10) { max = Math.min(100, min + 10); }
    var t0 = new Date(pts[0].date).getTime(), t1 = new Date(pts[pts.length - 1].date).getTime();
    function X(t) { return L + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (W - L - R); }
    function Y(v) { return T + (1 - (v - min) / (max - min)) * (H - T - B); }
    var svg = ['<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Score over time">'];
    [min, Math.round((min + max) / 2), max].forEach(function (g) {
      svg.push('<line class="axis" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(g) + '" y2="' + Y(g) + '"/>');
      svg.push('<text x="' + (L - 6) + '" y="' + (Y(g) + 4) + '" text-anchor="end">' + g + "</text>");
    });
    var path = pts.map(function (p, i) { return (i ? "L" : "M") + X(new Date(p.date).getTime()).toFixed(1) + " " + Y(p.score).toFixed(1); }).join(" ");
    svg.push('<path class="line" d="' + path + '"/>');
    pts.forEach(function (p, i) {
      var x = X(new Date(p.date).getTime()), y = Y(p.score);
      svg.push('<circle class="dot" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="5"/>');
      svg.push('<text class="val" x="' + x.toFixed(1) + '" y="' + (y - 10).toFixed(1) + '" text-anchor="middle">' + p.score + "</text>");
      if (i === 0 || i === pts.length - 1 || pts.length <= 6) svg.push('<text x="' + x.toFixed(1) + '" y="' + (H - 10) + '" text-anchor="' + (i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle") + '">' + fmtShort(p.date) + "</text>");
    });
    svg.push("</svg>");
    box.innerHTML = svg.join(""); // numbers and dates only
    note.textContent = "Each dot is one analysis. Scores can move with light, angle and expression, so small changes do not mean much.";
  }

  function paintCheckpoints(m) {
    var ul = $("cp-list"); ul.textContent = "";
    if (!m.checkpoints.length) { var li0 = el("li", "cp"); li0.appendChild(el("span", "d", "Your checkpoints appear after your first analysis.")); ul.appendChild(li0); return; }
    var labels = { done: "Done", due: "Due now", upcoming: "Upcoming", missed: "Missed" };
    m.checkpoints.forEach(function (c) {
      var li = el("li", "cp");
      var left = el("div");
      left.appendChild(el("b", "", "Day " + c.day));
      var d = c.status === "done" ? "Photo taken " + fmt(c.analysis.date) + (c.analysis.score != null && !m.hide ? " - score " + c.analysis.score : "") : "Around " + fmt(c.date);
      left.appendChild(el("span", "d", d));
      li.appendChild(left);
      var right = el("div"); right.style.display = "flex"; right.style.gap = "0.6rem"; right.style.alignItems = "center";
      right.appendChild(el("span", "badge-s " + c.status, labels[c.status]));
      if (c.status === "due" || (c.status === "upcoming" && new Date(c.date).getTime() - Date.now() < 7 * DAY)) {
        var a = el("a", "btn btn-outline btn-sm", "Take it now"); a.href = "/analyze/"; right.appendChild(a);
      }
      li.appendChild(right);
      ul.appendChild(li);
    });
  }

  function paintChange(m) {
    var box = $("chg"); box.textContent = "";
    if (m.analyses.length < 2) { box.appendChild(el("p", "card-text", "Run a second analysis to compare it with Day 1.")); return; }
    var a = m.analyses[0], b = m.analyses[m.analyses.length - 1];
    box.appendChild(el("p", "card-text", "Comparing " + fmt(a.date) + " with " + fmt(b.date) + "."));
    var rows = [];
    rows.push(["Face shape", a.shape || "-", b.shape || "-", a.shape && b.shape ? (a.shape === b.shape ? "Same" : "Reads differently") : ""]);
    if (!m.hide && a.score != null && b.score != null) {
      var d = b.score - a.score;
      rows.push(["Overall score", String(a.score), String(b.score), Math.abs(d) < 4 ? "No clear change" : (d > 0 ? "+" : "") + d]);
      if (a.sub && b.sub) {
        [["harmony", "Face harmony"], ["proportion", "Proportions"], ["symmetry", "Symmetry"]].forEach(function (k) {
          var dd = b.sub[k[0]] - a.sub[k[0]];
          rows.push([k[1], String(a.sub[k[0]]), String(b.sub[k[0]]), Math.abs(dd) < 4 ? "No clear change" : (dd > 0 ? "+" : "") + dd]);
        });
      }
    }
    var t = el("table", "diff");
    var head = el("tr"); ["", "Day 1", "Latest", "Change"].forEach(function (h) { head.appendChild(el("th", "", h)); });
    t.appendChild(head);
    rows.forEach(function (r) { var tr = el("tr"); r.forEach(function (c) { tr.appendChild(el("td", "", c)); }); t.appendChild(tr); });
    box.appendChild(t);
    box.appendChild(el("p", "pnote", "Differences under 4 points usually come from light, angle or expression, so treat them as no clear change. Facerizer shows grooming, styling and presentation, and never says your face has improved or got worse."));
  }

  function paintHeat(m) {
    var heat = $("heat"); heat.textContent = "";
    var start = weekStart(new Date()); start.setDate(start.getDate() - 11 * 7);
    var today = ymd(new Date()), count = 0;
    for (var i = 0; i < 84; i++) {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      var k = ymd(d), c = el("i");
      if (m.days[k]) { c.className = "on"; count++; }
      if (k > today) c.className = (c.className + " future").trim();
      c.title = fmtShort(d);
      heat.appendChild(c);
    }
    $("heat-note").textContent = count + " day" + (count === 1 ? "" : "s") + " with your routine ticked in the last 12 weeks.";
    m.heatCount = count;
  }

  function paintBars(m) {
    var bars = $("bars"); bars.textContent = "";
    var ws = weekStart(new Date()), weeks = [];
    for (var i = 7; i >= 0; i--) { var d = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() - i * 7); weeks.push({ key: ymd(d), date: d, n: 0 }); }
    m.taskDates.forEach(function (t) {
      var k = ymd(weekStart(new Date(t)));
      weeks.forEach(function (w) { if (w.key === k) w.n++; });
    });
    var max = Math.max.apply(null, weeks.map(function (w) { return w.n; }).concat([1]));
    weeks.forEach(function (w) {
      var col = el("div", "bcol");
      col.appendChild(el("span", "n", w.n ? String(w.n) : ""));
      var bar = el("div", "bar"); bar.style.height = Math.round(100 * w.n / max * 0.75) + "%";
      col.appendChild(bar);
      col.appendChild(el("span", "lbl", fmtShort(w.date)));
      bars.appendChild(col);
    });
    m.weeks = weeks;
  }

  function loadJsPdf() {
    return new Promise(function (resolve, reject) {
      if (window.jspdf) return resolve();
      var sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      sc.onload = resolve;
      sc.onerror = function () { reject(new Error("Could not load the PDF tool. Check your internet and try again.")); };
      document.head.appendChild(sc);
    });
  }
  $("dl-progress").addEventListener("click", function () {
    var msg = $("dl-msg"); msg.textContent = "Preparing your PDF..."; msg.className = "msg";
    loadJsPdf().then(function () {
      if (!window.facerizerProgressPdf) throw new Error("PDF file is out of date. Upload the new pdf.js to GitHub.");
      window.facerizerProgressPdf(model);
      msg.textContent = "Done. Check your downloads."; msg.className = "msg ok";
    }).catch(function (e) { console.error(e); msg.textContent = e.message || "Could not create the PDF."; msg.className = "msg error"; });
  });

  function render(m, demo) {
    model = m;
    paintStats(m); paintScore(m); paintCheckpoints(m); paintChange(m); paintHeat(m); paintBars(m);
    $("demo-bar").hidden = !demo;
    $("state").hidden = true; $("locked").hidden = true; $("prog").hidden = false;
  }

  // ---- sample data for ?demo=1 ----
  function sample() {
    var now = Date.now(), an = [], scores = [74, 76, 75, 79, 81, 82], subs = [[72, 76, 74], [74, 77, 76], [73, 76, 75], [78, 80, 79], [80, 82, 81], [81, 83, 82]], offs = [70, 55, 40, 27, 14, 1];
    scores.forEach(function (s, i) { an.push({ created_at: new Date(now - offs[i] * DAY).toISOString(), result: { score: s, face_shape: { type: "Oval" }, sub_scores: { harmony: subs[i][0], proportion: subs[i][1], symmetry: subs[i][2] } } }); });
    var days = {}, tasks = [];
    for (var i = 0; i < 70; i++) { if ((i * 7 + 3) % 10 < 7) days[ymd(new Date(now - i * DAY))] = true; }
    for (var j = 0; j < 38; j++) tasks.push(new Date(now - ((j * 5) % 55) * DAY).toISOString());
    return build(an, days, tasks, false);
  }

  if (/[?&]demo=1/.test(window.location.search)) { render(sample(), true); return; }

  var ready = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_URL.indexOf("YOUR_") === -1 && window.supabase;
  if (!ready) return state("Setup is not finished: add your Supabase details in config.js.", true);
  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  sb.auth.getSession().then(function (s) {
    var session = s.data.session;
    if (!session) { window.location.href = "/login"; return; }
    Promise.all([
      sb.from("profiles").select("plan, hide_scores").eq("id", session.user.id).maybeSingle(),
      sb.from("analyses").select("id, created_at, result").eq("status", "done").order("created_at", { ascending: true }).limit(300),
      sb.from("checkins").select("day").order("day", { ascending: false }).limit(500),
      sb.from("plan_progress").select("done_at").limit(2000)
    ]).then(function (out) {
      var err = out[0].error || out[1].error || out[2].error || out[3].error;
      if (err) { console.error(err); return state("Could not load your progress (" + err.message + "). Run m6-plan.sql in Supabase if you have not.", true); }
      var plan = (out[0].data && out[0].data.plan) || "free";
      if (plan !== "premium") { $("state").hidden = true; $("locked").hidden = false; return; }
      var days = {}; (out[2].data || []).forEach(function (x) { days[x.day] = true; });
      var tasks = (out[3].data || []).map(function (x) { return x.done_at; });
      render(build(out[1].data || [], days, tasks, !!(out[0].data && out[0].data.hide_scores)), false);
    });
  });
})();
