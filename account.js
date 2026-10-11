(function () {
  var cfg = window.FACERIZER || {};
  var $ = function (id) { return document.getElementById(id); };
  var msgEl = $("msg");
  function say(t, type) { msgEl.textContent = t || ""; msgEl.className = "msg " + (type || ""); }

  var ARC = 329.9; // length of the 270 degree gauge arc
  var ICONS = {
    jaw: '<svg viewBox="0 0 24 24"><path d="M4 6c0 8 3 13 8 14 5-1 8-6 8-14"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    brow: '<svg viewBox="0 0 24 24"><path d="M3 15c3-6 10-8 18-4"/><path d="M7 18h.01M12 18h.01M17 18h.01"/></svg>',
    skin: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>',
    hair: '<svg viewBox="0 0 24 24"><circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.5 8.5L20 19M8.5 15.5L20 5"/></svg>',
    glasses: '<svg viewBox="0 0 24 24"><circle cx="6.5" cy="14" r="3.5"/><circle cx="17.5" cy="14" r="3.5"/><path d="M10 14h4M3 12l1-5M21 12l-1-5"/></svg>',
    grooming: '<svg viewBox="0 0 24 24"><path d="M5 4h14v6a7 7 0 01-14 0z"/><path d="M9 14c1 1.2 2 1.5 3 1.5s2-.3 3-1.5"/></svg>'
  };

  // Example data shown only with ?demo=1. Real results will use the same shape (added with the analysis update).
  var SAMPLE = {
    score: 82,
    analyzed_at: new Date().toISOString(),
    face_shape: { type: "Oval", confidence: 87 },
    summary: "Your features are well balanced. A few grooming and styling changes could bring out your strengths even more.",
    strengths: [
      { icon: "jaw", title: "Defined jawline", text: "A clear lower-face contour" },
      { icon: "eye", title: "Balanced eye area", text: "Eyes sit in good proportion" },
      { icon: "brow", title: "Structured brows", text: "A clean, well-framed shape" },
      { icon: "skin", title: "Even skin appearance", text: "Looks even and consistent in this photo" }
    ],
    recs: [
      { icon: "hair", label: "Recommended hairstyle", title: "Textured crop", text: "Adds height and suits an oval face" },
      { icon: "glasses", label: "Suggested glasses", title: "Rectangle frames", text: "Add definition without hiding your features" },
      { icon: "grooming", label: "Grooming tip", title: "Short boxed beard", text: "Keeps lines sharp along the jaw" }
    ],
    plan: [
      { t: "Week 1", d: "Grooming", s: "done" },
      { t: "Week 2", d: "Skin and self-care", s: "current" },
      { t: "Week 3", d: "Hair and styling", s: "upcoming" },
      { t: "Week 4", d: "Presentation", s: "upcoming" }
    ]
  };

  var EMPTY_PLAN = [
    { t: "Week 1", d: "Grooming", s: "upcoming" },
    { t: "Week 2", d: "Skin and self-care", s: "upcoming" },
    { t: "Week 3", d: "Hair and styling", s: "upcoming" },
    { t: "Week 4", d: "Presentation", s: "upcoming" }
  ];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function row(iconName, label, title, text) {
    var li = el("li", "row2");
    var ico = el("span", "ico");
    ico.innerHTML = ICONS[iconName] || ""; // icons are fixed strings defined above
    var tx = el("div", "tx");
    if (label) tx.appendChild(el("small", "", label));
    tx.appendChild(el("strong", "", title));
    if (text) tx.appendChild(el("span", "d", text));
    li.appendChild(ico); li.appendChild(tx);
    return li;
  }

  function skeletonRow() {
    var li = el("li", "row2");
    li.appendChild(el("span", "ico"));
    var tx = el("div", "tx");
    tx.appendChild(el("span", "skel")); tx.appendChild(el("span", "skel"));
    li.appendChild(tx);
    return li;
  }

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch (e) { return ""; }
  }

  function paint(r, hideScores) {
    var num = $("score-num"), of = $("score-of"), val = $("g-val"), chips = $("chips");
    chips.textContent = "";

    // Score gauge
    if (r && !hideScores) {
      num.textContent = String(r.score);
      of.textContent = "out of 100";
      val.style.display = "";
      val.setAttribute("stroke-dasharray", (ARC * Math.max(0, Math.min(100, r.score)) / 100) + " 439.8");
    } else {
      val.style.display = "none";
      num.textContent = r && hideScores ? "Hidden" : "--";
      num.style.fontSize = r && hideScores ? "1.3rem" : "";
      of.textContent = r && hideScores ? "You chose to hide scores" : "out of 100";
    }
    if (r) {
      if (r.face_shape) chips.appendChild(el("span", "chip", "Face shape: " + r.face_shape.type + " (" + r.face_shape.confidence + "% confident)"));
      if (r.analyzed_at) chips.appendChild(el("span", "chip", "Analyzed " + fmtDate(r.analyzed_at)));
      $("insight-text").textContent = r.summary || "";
    }

    // Strengths
    var s = $("strengths"); s.textContent = "";
    if (r) r.strengths.forEach(function (x) { s.appendChild(row(x.icon, "", x.title, x.text)); });
    else { s.appendChild(skeletonRow()); s.appendChild(skeletonRow()); s.appendChild(skeletonRow()); }

    // Recommendations
    var rc = $("recs"); rc.textContent = "";
    if (r) r.recs.forEach(function (x) { rc.appendChild(row(x.icon, x.label, x.title, x.text)); });
    else {
      rc.appendChild(row("hair", "Hairstyle", "Appears after your analysis", ""));
      rc.appendChild(row("glasses", "Glasses", "Appears after your analysis", ""));
      rc.appendChild(row("grooming", "Grooming", "Appears after your analysis", ""));
    }

    // Plan
    var plan = r ? r.plan : EMPTY_PLAN;
    var tl = $("timeline"); tl.textContent = "";
    plan.forEach(function (p) {
      var li = el("li", "step " + p.s);
      li.appendChild(el("span", "node"));
      li.appendChild(el("strong", "", p.t));
      li.appendChild(el("span", "d", p.d));
      tl.appendChild(li);
    });
    var pill = $("plan-pill");
    pill.textContent = r ? "In progress" : "Not started";
    pill.className = "pill" + (r ? " active" : "");
    $("plan-note").textContent = r
      ? "Tick off each step as you go. Your plan updates after your next analysis."
      : "Your plan is built from your own analysis, so it starts after your first one.";
    $("sub").textContent = r ? "Your style journey continues." : "Let's find what suits you.";
  }

  var params = window.location.search;
  var demo = /[?&]demo=1/.test(params);
  var hideScores = false;
  paint(demo ? SAMPLE : null, hideScores);
  if (demo) $("demo-banner").hidden = false;

  // Open the settings panel from the avatar or footer link
  function openSettings() { $("settings").open = true; }
  $("avatar").addEventListener("click", openSettings);
  var fl = document.querySelector("[data-open=settings]");
  if (fl) fl.addEventListener("click", openSettings);
  if (window.location.hash === "#settings") openSettings();

  var ready = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_URL.indexOf("YOUR_") === -1 && window.supabase;
  if (!ready) { openSettings(); say("Setup is not finished: add your Supabase details in config.js.", "error"); return; }

  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  var form = $("prefs-form");
  var userId = null;
  var accessToken = null;
  var COLS = "display_name, age_range, hair_preference, facial_hair_preference, style_preference, hide_scores, age_confirmed_at, consent_at";

  function showGate() {
    var wrap = el("div", "gate");
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    var card = el("div", "gate-card");
    card.appendChild(el("h2", "", "One last step"));
    card.appendChild(el("p", "card-text", "Facerizer is for adults, and it works with photos of your face. Please confirm to continue."));
    function check(text) {
      var l = el("label", "gate-check");
      var i = document.createElement("input"); i.type = "checkbox";
      l.appendChild(i); l.appendChild(el("span", "", text));
      card.appendChild(l);
      return i;
    }
    var age = check("I confirm that I am 18 years or older.");
    var con = check("I agree to the Terms and Privacy Policy, and I consent to my photos being processed to create my analysis.");
    var m = el("p", "msg"); m.setAttribute("role", "status");
    var go = el("button", "btn btn-primary btn-lg", "Continue"); go.type = "button"; go.style.width = "100%"; go.style.marginTop = "1rem";
    var out = el("button", "btn btn-outline btn-sm", "Log out instead"); out.type = "button"; out.style.marginTop = "0.75rem";
    card.appendChild(m); card.appendChild(go); card.appendChild(out);
    wrap.appendChild(card); document.body.appendChild(wrap);
    out.addEventListener("click", function () { sb.auth.signOut().then(function () { window.location.href = "/"; }); });
    go.addEventListener("click", function () {
      if (!age.checked || !con.checked) { m.textContent = "Please tick both boxes to continue."; m.className = "msg error"; return; }
      go.disabled = true; m.textContent = "Saving..."; m.className = "msg";
      sb.rpc("confirm_age_and_consent").then(function (res) {
        if (res.error) {
          console.error(res.error);
          go.disabled = false; m.textContent = "Could not save. Run google-setup.sql in Supabase and try again."; m.className = "msg error"; return;
        }
        wrap.remove();
      });
    });
  }

  function loadPhotos() {
    var list = $("thumbs"), note = $("photos-note"), delAll = $("del-photos");
    sb.from("photos").select("id, path, created_at").order("created_at", { ascending: false }).then(function (res) {
      list.textContent = "";
      if (res.error) {
        console.error(res.error);
        delAll.hidden = true;
        note.textContent = "Could not load your photos (" + res.error.message + "). Run m4-setup.sql in Supabase.";
        return;
      }
      var rows = res.data || [];
      delAll.hidden = rows.length === 0;
      if (!rows.length) {
        note.textContent = "No saved photos yet. Photos you save for analysis will appear here, and only you can see them.";
        return;
      }
      note.textContent = rows.length + " saved photo" + (rows.length > 1 ? "s" : "") + ". Only you can see them.";
      sb.storage.from("photos").createSignedUrls(rows.map(function (r) { return r.path; }), 600).then(function (s) {
        var urls = {};
        (s.data || []).forEach(function (x) { if (x.path) urls[x.path] = x.signedUrl; });
        rows.forEach(function (row) {
          var li = el("li", "thumb");
          var img = document.createElement("img");
          img.alt = "Your saved photo";
          img.loading = "lazy";
          if (urls[row.path]) img.src = urls[row.path];
          var meta = el("div", "meta");
          meta.appendChild(el("span", "", fmtDate(row.created_at)));
          var del = el("button", "", "Delete"); del.type = "button";
          del.addEventListener("click", function () {
            if (!window.confirm("Delete this photo permanently?")) return;
            del.disabled = true;
            sb.storage.from("photos").remove([row.path]).then(function (r1) {
              if (r1.error) { del.disabled = false; return window.alert("Could not delete the photo. Please try again."); }
              sb.from("photos").delete().eq("id", row.id).then(function () { loadPhotos(); });
            });
          });
          meta.appendChild(del);
          li.appendChild(img); li.appendChild(meta);
          list.appendChild(li);
        });
      });
    });
  }

  $("del-photos").addEventListener("click", function () {
    if (!window.confirm("Delete ALL your saved photos permanently?")) return;
    var btn = $("del-photos"); btn.disabled = true;
    sb.from("photos").select("id, path").then(function (res) {
      var rows = res.data || [];
      if (!rows.length) { btn.disabled = false; return loadPhotos(); }
      sb.storage.from("photos").remove(rows.map(function (r) { return r.path; })).then(function (r1) {
        if (r1.error) { btn.disabled = false; return window.alert("Could not delete the photos. Please try again."); }
        sb.from("photos").delete().eq("user_id", userId).then(function () { btn.disabled = false; loadPhotos(); });
      });
    });
  });

  var delBox = $("del-box"), delInput = $("del-input"), delConfirm = $("del-confirm"), delOpen = $("del-account");
  delOpen.addEventListener("click", function () {
    delBox.hidden = false; delOpen.hidden = true; delInput.value = ""; delConfirm.disabled = true; delInput.focus();
  });
  $("del-cancel").addEventListener("click", function () {
    delBox.hidden = true; delOpen.hidden = false; delInput.value = ""; delConfirm.disabled = true;
    $("acc-msg").textContent = "";
  });
  delInput.addEventListener("input", function () {
    delConfirm.disabled = delInput.value.trim().toUpperCase() !== "DELETE";
  });
  delConfirm.addEventListener("click", function () {
    var m = $("acc-msg");
    if (delInput.value.trim().toUpperCase() !== "DELETE") return;
    delConfirm.disabled = true; delInput.disabled = true;
    m.textContent = "Deleting your account..."; m.className = "msg";
    fetch("/api/delete-account", { method: "POST", headers: { Authorization: "Bearer " + accessToken } })
      .then(function (r) {
        return r.text().then(function (t) {
          var j = {};
          try { j = JSON.parse(t); } catch (e) {}
          return { ok: r.ok, status: r.status, j: j };
        });
      })
      .then(function (x) {
        if (!x.ok) {
          var d = x.j.error || ("Server returned " + x.status);
          if (x.status === 404) d = "The delete function was not found (404). Check that api/delete-account.js is in GitHub and Vercel has redeployed";
          if (x.j.detail) d += " [" + x.j.detail + "]";
          throw new Error(d);
        }
        m.textContent = "Your account has been deleted."; m.className = "msg ok";
        return sb.auth.signOut().catch(function () {});
      })
      .then(function () { window.location.href = "/?account_deleted=1"; })
      .catch(function (err) {
        delInput.disabled = false; delConfirm.disabled = false;
        m.textContent = "Could not delete: " + err.message;
        m.className = "msg error";
      });
  });

  $("logout").addEventListener("click", function () {
    sb.auth.signOut().then(function () { window.location.href = "/"; });
  });

  function firstName(s) { return (s || "").trim().split(/\s+/)[0]; }

  function paintHeader(user, name) {
    var shown = firstName(name) || firstName((user.user_metadata || {}).display_name) || (user.email || "").split("@")[0] || "";
    $("greet").textContent = shown ? "Welcome back, " + shown : "Welcome back";
    $("avatar").textContent = (shown.charAt(0) || "F").toUpperCase();
    $("signed-in").textContent = "Signed in as " + (user.email || "");
    if (!user.email_confirmed_at) $("verify-banner").hidden = false;
  }

  sb.auth.getSession().then(function (r) {
    var session = r.data.session;
    if (!session) { window.location.href = "/login"; return; }
    var user = session.user;
    userId = user.id;
    accessToken = session.access_token;
    paintHeader(user, "");
    loadPhotos();

    sb.from("profiles").select(COLS).eq("id", userId).maybeSingle().then(function (res) {
      if (res.error) {
        console.error("Load profile failed:", res.error);
        openSettings();
        return say("Could not load your details (" + res.error.message + ").", "error");
      }
      if (!res.data) {
        openSettings();
        return say("Your profile record is missing. Run the latest SQL (setup-v2.sql) in Supabase, then refresh.", "error");
      }
      var p = res.data;
      form.elements["name"].value = p.display_name || "";
      form.elements["age_range"].value = p.age_range || "";
      form.elements["hair_preference"].value = p.hair_preference || "";
      form.elements["facial_hair_preference"].value = p.facial_hair_preference || "";
      form.elements["style_preference"].value = p.style_preference || "";
      form.elements["hide_scores"].checked = !!p.hide_scores;
      hideScores = !!p.hide_scores;
      paintHeader(user, p.display_name);
      paint(demo ? SAMPLE : null, hideScores);
      if (!p.age_confirmed_at || !p.consent_at) showGate();
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!userId) return;
    var btn = form.querySelector("button[type=submit]");
    btn.disabled = true; say("Saving...");
    var payload = {
      display_name: form.elements["name"].value.trim() || null,
      age_range: form.elements["age_range"].value || null,
      hair_preference: form.elements["hair_preference"].value || null,
      facial_hair_preference: form.elements["facial_hair_preference"].value || null,
      style_preference: form.elements["style_preference"].value || null,
      hide_scores: form.elements["hide_scores"].checked
    };
    sb.from("profiles").update(payload).eq("id", userId).select("display_name").then(function (res) {
      btn.disabled = false;
      if (res.error) {
        console.error("Save failed:", res.error);
        return say("Could not save (" + res.error.message + "). Run the latest SQL (setup-v2.sql) in Supabase.", "error");
      }
      if (!res.data || res.data.length === 0) {
        return say("Could not save: your profile record is missing. Run setup-v2.sql in Supabase.", "error");
      }
      say("Saved.", "ok");
      hideScores = payload.hide_scores;
      $("greet").textContent = payload.display_name ? "Welcome back, " + firstName(payload.display_name) : "Welcome back";
      $("avatar").textContent = ((firstName(payload.display_name) || "F").charAt(0)).toUpperCase();
      paint(demo ? SAMPLE : null, hideScores);
    });
  });
})();
