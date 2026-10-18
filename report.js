(function () {
  var cfg = window.FACERIZER || {};
  var $ = function (id) { return document.getElementById(id); };
  var ARC = 329.9;
  var ICONS = {
    jaw: '<svg viewBox="0 0 24 24"><path d="M4 6c0 8 3 13 8 14 5-1 8-6 8-14"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    brow: '<svg viewBox="0 0 24 24"><path d="M3 15c3-6 10-8 18-4"/><path d="M7 18h.01M12 18h.01M17 18h.01"/></svg>',
    skin: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>',
    hair: '<svg viewBox="0 0 24 24"><circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.5 8.5L20 19M8.5 15.5L20 5"/></svg>',
    glasses: '<svg viewBox="0 0 24 24"><circle cx="6.5" cy="14" r="3.5"/><circle cx="17.5" cy="14" r="3.5"/><path d="M10 14h4M3 12l1-5M21 12l-1-5"/></svg>',
    grooming: '<svg viewBox="0 0 24 24"><path d="M5 4h14v6a7 7 0 01-14 0z"/><path d="M9 14c1 1.2 2 1.5 3 1.5s2-.3 3-1.5"/></svg>',
    lips: '<svg viewBox="0 0 24 24"><path d="M3 12c3-4 6-4 9-2 3-2 6-2 9 2-3 5-6 6-9 6s-6-1-9-6z"/></svg>',
    nose: '<svg viewBox="0 0 24 24"><path d="M12 4v10c-2 0-3 1-3 2.5S10 19 12 19s3-1 3-2.5-1-2.5-3-2.5"/></svg>',
    cheek: '<svg viewBox="0 0 24 24"><path d="M4 9c3 4 5 5 8 5s5-1 8-5"/><path d="M6 16c2 2 4 3 6 3s4-1 6-3"/></svg>',
    harmony: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/></svg>'
  };

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function state(t, err) { var s = $("state"); s.textContent = t; s.style.color = err ? "#b3261e" : ""; }

  var ready = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_URL.indexOf("YOUR_") === -1 && window.supabase;
  if (!ready) return state("Setup is not finished: add your Supabase details in config.js.", true);

  var id = new URLSearchParams(window.location.search).get("id");
  if (!id) return state("No report selected. Open a report from your dashboard.", true);

  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  function row(icon, label, title, text, tags, example) {
    var li = el("li", "row2");
    var ico = el("span", "ico"); ico.innerHTML = ICONS[icon] || ICONS.harmony;
    var tx = el("div", "tx");
    if (label) tx.appendChild(el("small", "", label));
    tx.appendChild(el("strong", "", title));
    if (text) tx.appendChild(el("span", "d", text));
    if (tags && tags.length) { var w = el("div"); tags.forEach(function (t) { w.appendChild(el("span", "tag", t)); }); tx.appendChild(w); }
    if (example) {
      var a = el("a", "ex-link", "See examples");
      a.href = "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(example);
      a.target = "_blank"; a.rel = "noopener";
      tx.appendChild(a);
    }
    li.appendChild(ico); li.appendChild(tx);
    return li;
  }
  function locked(text) {
    var d = el("div", "locked");
    d.appendChild(document.createTextNode(text));
    d.appendChild(document.createElement("br"));
    var a = el("a", "", "Unlock with Pro"); a.href = "/#pricing";
    d.appendChild(a);
    return d;
  }
  function fill(id2, nodes) { var t = $(id2); t.textContent = ""; nodes.forEach(function (n) { t.appendChild(n); }); }

  function render(r, created, hide) {
    var isFree = r.plan === "free" || !r.features;
    $("r-date").textContent = "Analyzed " + new Date(created).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    // score
    var num = $("score-num"), of = $("score-of"), val = $("g-val");
    if (r.score != null && !hide) {
      num.textContent = String(r.score); of.textContent = "out of 100";
      val.style.display = ""; val.setAttribute("stroke-dasharray", (ARC * Math.max(0, Math.min(100, r.score)) / 100) + " 439.8");
    } else {
      num.textContent = hide ? "Hidden" : "--"; num.style.fontSize = "1.3rem";
      of.textContent = hide ? "You chose to hide scores" : "Measurements were not available";
    }
    var chips = $("chips"); chips.textContent = "";
    if (r.face_shape) chips.appendChild(el("span", "chip", "Face shape: " + r.face_shape.type + " (" + r.face_shape.confidence + "% confident)"));
    $("insight-text").textContent = r.summary || "";

    // strengths and improvements
    fill("r-strengths", (r.strengths || []).map(function (s) { return row(s.icon, "", s.title, s.text); }));
    if (r.improvements && r.improvements.length) fill("r-improve", r.improvements.map(function (s) { return row("harmony", "", s.title, s.text); }));
    else fill("r-improve", [locked("Areas to refine, with a practical fix for each, are part of Pro.")]);

    // hairstyles
    fill("r-hair", (r.hairstyles || []).map(function (h) {
      return row("hair", "", h.name, h.why, ["Upkeep: " + h.maintenance, "Styling: " + h.styling, h.length + " length"], h.name + " hairstyle");
    }));
    $("hair-lock").textContent = "";
    if (isFree) $("hair-lock").appendChild(locked("3 more hairstyles, each with upkeep and styling effort, are part of Pro."));

    // glasses
    fill("r-glasses", (r.glasses || []).map(function (g) {
      return row("glasses", g.tier === "best" ? "Best match" : "Worth trying", g.shape + " frames", g.why, null, g.shape + " glasses frames");
    }));

    // grooming
    fill("r-grooming", (r.grooming || []).map(function (g) { return row("grooming", "", g.title, g.text); }));

    // features
    var ft = $("r-features"); ft.textContent = "";
    if (r.features) {
      var grid = el("div", "fgrid");
      var names = { eyes: "Eyes", eyebrows: "Eyebrows", nose: "Nose", lips: "Lips", jawline: "Jawline", chin: "Chin", cheekbones: "Cheekbones", skin_appearance: "Skin appearance" };
      Object.keys(names).forEach(function (k) {
        var f = r.features[k]; if (!f) return;
        var c = el("div", "fcard");
        c.appendChild(el("h3", "", names[k]));
        c.appendChild(el("p", "", f.observation));
        c.appendChild(el("p", "", "Suggestion: " + f.suggestion));
        c.appendChild(el("span", "tag", "Confidence: " + f.confidence));
        grid.appendChild(c);
      });
      ft.appendChild(grid);
    } else ft.appendChild(locked("A feature-by-feature breakdown of eyes, brows, nose, lips, jaw, chin, cheekbones and skin appearance is part of Pro."));

    // skincare
    var sk = $("r-skin"); sk.textContent = "";
    if (r.skincare) {
      var cols = el("div", "skin-cols");
      [["Morning", r.skincare.morning], ["Evening", r.skincare.evening]].forEach(function (p) {
        var d = el("div"); d.appendChild(el("h3", "", p[0]));
        var ul = el("ul"); (p[1] || []).forEach(function (x) { ul.appendChild(el("li", "", x)); });
        d.appendChild(ul); cols.appendChild(d);
      });
      sk.appendChild(cols);
      sk.appendChild(el("p", "fine", r.skincare.note));
    } else sk.appendChild(locked("A simple morning and evening skincare routine is part of Pro."));

    // plan
    var pl = $("r-plan"); pl.textContent = "";
    if (r.plan_weeks && r.plan_weeks.length) {
      r.plan_weeks.forEach(function (w) {
        var d = el("div", "wk"); d.appendChild(el("h3", "", "Week " + w.week + ": " + w.title));
        var ul = el("ul"); (w.tasks || []).forEach(function (t) { ul.appendChild(el("li", "", t)); });
        d.appendChild(ul); pl.appendChild(d);
      });
      var go = el("a", "ex-link", "Open your checklist and daily routine"); go.href = "/plan"; go.style.marginTop = "1rem";
      pl.appendChild(go);
    } else pl.appendChild(locked("Your personalized 30-day plan is part of Pro."));

    $("upsell").hidden = !isFree;
    $("state").hidden = true;
    $("report").hidden = false;
  }

  sb.auth.getSession().then(function (s) {
    var session = s.data.session;
    if (!session) { window.location.href = "/login"; return; }
    Promise.all([
      sb.from("analyses").select("id, status, plan, result, created_at").eq("id", id).maybeSingle(),
      sb.from("profiles").select("hide_scores").eq("id", session.user.id).maybeSingle()
    ]).then(function (out) {
      var a = out[0], p = out[1];
      if (a.error) { console.error(a.error); return state("Could not load this report (" + a.error.message + "). Run m5-setup.sql in Supabase.", true); }
      if (!a.data || a.data.status !== "done" || !a.data.result) return state("This report was not found, or it is not ready.", true);
      render(a.data.result, a.data.created_at, !!(p.data && p.data.hide_scores));
    });
  });
})();
