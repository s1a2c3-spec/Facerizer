/* Face exercises page: library, language, routine builder, progress and weekly graph.
   Progress is saved to the account when logged in (table exercise_log, sql/12), otherwise in this browser only. */
(function () {
  "use strict";
  var D = window.FZ_EX;
  var $ = function (id) { return document.getElementById(id); };
  var content = $("ex-content");
  if (!D || !content) { return; }

  function store(k, v) { try { if (v === undefined) { return localStorage.getItem(k); } localStorage.setItem(k, v); } catch (e) {} return null; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) { n.className = cls; } if (text != null) { n.textContent = text; } return n; }
  function readJson(k, fallback) { try { var v = JSON.parse(store(k) || ""); return v || fallback; } catch (e) { return fallback; } }

  var LANG_ATTR = { en: "en-IN", hinglish: "hi-Latn", hi: "hi" };
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var lang = store("fz_ex_lang"); if (!D.ui[lang]) { lang = "en"; }
  var area = "all";
  var mins = store("fz_ex_min"); if (!D.routines[mins]) { mins = "5"; }
  var byId = {}; D.list.forEach(function (e) { byId[e.id] = e; });

  // Progress: days["YYYY-MM-DD"] = { ids: [ticked exercise ids], done: true/false }
  var days = {};
  var mode = "local";       // "local" = this browser only, "account" = saved to the account
  var sb = null, uid = null;

  function L() { return D.ui[lang]; }
  function key(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function today() { return key(new Date()); }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function rec(day) { if (!days[day]) { days[day] = { ids: [], done: false }; } return days[day]; }

  /* ---------- this browser only ---------- */
  function loadLocal() {
    days = {};
    readJson("fz_ex_days", []).forEach(function (d) { days[d] = { ids: [], done: true }; });
    var t = today(), ids = readJson("fz_ex_tick_" + t, []);
    if (ids.length) { rec(t).ids = ids; }
  }
  function saveLocal(day) {
    var list = Object.keys(days).filter(function (d) { return days[d].done; }).sort().slice(-400);
    store("fz_ex_days", JSON.stringify(list));
    if (day === today()) { store("fz_ex_tick_" + day, JSON.stringify(days[day] ? days[day].ids : [])); }
  }

  /* ---------- account ---------- */
  var syncState = "anon";
  function setSync(state) {
    syncState = state;
    var box = $("ex-sync"); box.textContent = "";
    if (state === "account") { box.textContent = "Saved to your account. You can see it on any device where you log in."; }
    else if (state === "error") { box.textContent = "Could not load your saved progress, so this browser is used for now."; }
    else if (state === "saveerror") { box.textContent = "Could not save to your account just now. Please check your connection and try again."; }
    else {
      box.appendChild(document.createTextNode("You are not logged in, so your progress is saved only in this browser. "));
      var a = el("a", "", "Log in to save it to your account."); a.href = "/login"; box.appendChild(a);
    }
  }

  function persist(day) {
    if (mode !== "account") { saveLocal(day); return; }
    var r = days[day] || { ids: [], done: false }, q;
    if (!r.ids.length && !r.done) { q = sb.from("exercise_log").delete().eq("user_id", uid).eq("day", day); }
    else { q = sb.from("exercise_log").upsert({ user_id: uid, day: day, done_ids: r.ids, completed: r.done, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" }); }
    q.then(function (res) {
      if (res && res.error) { setSync("saveerror"); } else if (syncState === "saveerror") { setSync("account"); }
    }, function () { setSync("saveerror"); });
  }

  function loadRemote(cb) {
    sb.from("exercise_log").select("day, done_ids, completed").eq("user_id", uid).order("day", { ascending: false }).limit(500).then(function (r) {
      if (r.error) { setSync("error"); return; }
      days = {};
      (r.data || []).forEach(function (row) { days[row.day] = { ids: row.done_ids || [], done: !!row.completed }; });
      mode = "account"; setSync("account"); if (cb) { cb(); }
    }, function () { setSync("error"); });
  }

  // Progress saved in this browser before logging in: only added to the account if the person says yes.
  function offerImport() {
    var flag = "fz_ex_imp_" + uid;
    if (store(flag)) { return; }
    var local = readJson("fz_ex_days", []).filter(function (d) { return !days[d] || !days[d].done; });
    var box = $("ex-import"); box.textContent = "";
    if (!local.length) { return; }
    box.appendChild(el("p", "", "This browser has " + local.length + " exercise day" + (local.length === 1 ? "" : "s") + " saved from before you logged in. Add them to your account?"));
    var yes = el("button", "btn btn-primary btn-sm", "Add them to my account"), no = el("button", "btn btn-outline btn-sm", "No thanks");
    yes.type = "button"; no.type = "button";
    yes.addEventListener("click", function () {
      yes.disabled = true;
      var rows = local.map(function (d) { return { user_id: uid, day: d, done_ids: [], completed: true }; });
      sb.from("exercise_log").upsert(rows, { onConflict: "user_id,day", ignoreDuplicates: true }).then(function (res) {
        if (res && res.error) { box.textContent = "Could not add them just now. Please try again later."; return; }
        store(flag, "1"); store("fz_ex_days", "[]");
        loadRemote(function () { box.textContent = "Added " + local.length + " day" + (local.length === 1 ? "" : "s") + " to your account."; renderRoutine(); });
      }, function () { box.textContent = "Could not add them just now. Please try again later."; });
    });
    no.addEventListener("click", function () { store(flag, "1"); box.textContent = ""; });
    var row = el("div", "ex-cta"); row.appendChild(yes); row.appendChild(no); box.appendChild(row);
  }

  function initAccount() {
    var cfg = window.FACERIZER || {};
    if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_URL.indexOf("YOUR_") > -1) { return; }
    try { sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) { sb = null; return; }
    sb.auth.getSession().then(function (s) {
      var session = s && s.data && s.data.session;
      if (!session) { return; }
      uid = session.user.id;
      loadRemote(function () { renderRoutine(); offerImport(); });
    }, function () {});
  }

  /* ---------- numbers and graph ---------- */
  function doneList() { return Object.keys(days).filter(function (d) { return days[d].done; }).sort(); }
  function streaks() {
    var list = doneList(), set = {}, best = 0, run = 0, prev = null;
    list.forEach(function (d) {
      set[d] = true;
      if (prev && Math.round((parse(d) - parse(prev)) / 86400000) === 1) { run++; } else { run = 1; }
      if (run > best) { best = run; }
      prev = d;
    });
    var d = new Date(), cur = 0;
    if (!set[key(d)]) { d.setDate(d.getDate() - 1); }
    while (set[key(d)]) { cur++; d.setDate(d.getDate() - 1); }
    return { cur: cur, best: best, total: list.length };
  }
  function mondayOf(date) { var d = new Date(date.getFullYear(), date.getMonth(), date.getDate()); var wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return d; }
  function weekCounts() {
    var out = [], thisMon = mondayOf(new Date());
    for (var i = 7; i >= 0; i--) {
      var start = new Date(thisMon.getFullYear(), thisMon.getMonth(), thisMon.getDate() - 7 * i), n = 0;
      for (var k = 0; k < 7; k++) {
        var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + k);
        if (days[key(d)] && days[key(d)].done) { n++; }
      }
      out.push({ n: n, label: i === 0 ? "This wk" : start.getDate() + " " + MONTHS[start.getMonth()] });
    }
    return out;
  }

  function renderStats() {
    var s = streaks(), wk = weekCounts(), thisWeek = wk[wk.length - 1].n;
    $("ex-stats").textContent = "Days done: " + s.total + ". Current streak: " + s.cur + " day" + (s.cur === 1 ? "" : "s") + ". Best streak: " + s.best + ". This week: " + thisWeek + " of 7.";
    var done = !!(days[today()] && days[today()].done);
    $("ex-done").textContent = done ? "Today is marked as done (tap to undo)" : "Mark today as done";
    var g = $("ex-graph"); g.textContent = "";
    g.setAttribute("aria-label", "Days done per week for the last 8 weeks: " + wk.map(function (w) { return w.n; }).join(", "));
    wk.forEach(function (w) {
      var c = el("div", "col");
      c.appendChild(el("span", "n", String(w.n)));
      var b = el("div", w.n ? "bar" : "bar zero"); b.style.height = (w.n ? Math.max(8, Math.round(w.n / 7 * 100)) : 2) + "%";
      c.appendChild(b); c.appendChild(el("span", "l", w.label)); g.appendChild(c);
    });
  }

  /* ---------- page ---------- */
  function renderSafety() {
    $("ex-safety-title").textContent = L().safetyTitle;
    $("ex-safety-text").textContent = L().safety;
    $("ex-evidence").textContent = L().evidence;
  }

  function renderChips() {
    var box = $("ex-chips"); box.textContent = "";
    var all = [["all", lang === "hi" ? "सभी" : lang === "hinglish" ? "Sabhi" : "All"]].concat(D.areas.map(function (a) { return [a, L().areas[a]]; }));
    all.forEach(function (p) {
      var b = el("button", "", p[1]); b.type = "button"; b.setAttribute("aria-pressed", String(area === p[0]));
      b.addEventListener("click", function () { area = p[0]; renderChips(); renderList(); });
      box.appendChild(b);
    });
  }

  function renderList() {
    var box = $("ex-list"); box.textContent = ""; box.setAttribute("lang", LANG_ATTR[lang]);
    D.list.forEach(function (e) {
      if (area !== "all" && e.area !== area) { return; }
      var t = e.t[lang];
      var d = el("details"); d.id = e.id;
      var s = el("summary", "", t.n);
      s.appendChild(el("span", "ex-tag", L().areas[e.area]));
      s.appendChild(el("span", "ex-tag", L().levels[e.level]));
      d.appendChild(s);
      var body = el("div", "ex-body");
      body.appendChild(el("p", "dose", L().dose + ": " + t.d));
      var ol = el("ol"); t.s.forEach(function (x) { ol.appendChild(el("li", "", x)); }); body.appendChild(ol);
      body.appendChild(el("p", "tip", L().tip + ": " + t.tip));
      d.appendChild(body); box.appendChild(d);
    });
    openFromHash();
  }

  function openFromHash() {
    var id = (window.location.hash || "").replace("#", "");
    var d = id && $(id);
    if (d && d.tagName === "DETAILS") { d.open = true; try { d.scrollIntoView({ block: "start" }); } catch (e) {} }
  }

  function renderRoutine() {
    Array.prototype.forEach.call($("ex-mins").querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-m") === mins)); });
    var ul = $("ex-check"); ul.textContent = ""; ul.setAttribute("lang", LANG_ATTR[lang]);
    var ticked = days[today()] ? days[today()].ids : [];
    D.routines[mins].forEach(function (id) {
      var e = byId[id]; if (!e) { return; }
      var li = el("li"), cb = el("input"); cb.type = "checkbox"; cb.id = "t-" + id; cb.checked = ticked.indexOf(id) > -1;
      cb.addEventListener("change", function () {
        var r = rec(today()), i = r.ids.indexOf(id);
        if (cb.checked && i < 0) { r.ids.push(id); } else if (!cb.checked && i > -1) { r.ids.splice(i, 1); }
        persist(today());
      });
      var lab = el("label"); lab.setAttribute("for", cb.id);
      var a = el("a", "", e.t[lang].n + " (" + e.t[lang].d + ")"); a.href = "#" + id;
      a.addEventListener("click", function () { area = "all"; renderChips(); renderList(); });
      lab.appendChild(a);
      li.appendChild(cb); li.appendChild(lab); ul.appendChild(li);
    });
    renderStats();
  }

  $("ex-done").addEventListener("click", function () {
    var r = rec(today()); r.done = !r.done; persist(today()); renderStats();
  });
  Array.prototype.forEach.call($("ex-mins").querySelectorAll("button"), function (b) {
    b.addEventListener("click", function () { mins = b.getAttribute("data-m"); store("fz_ex_min", mins); renderRoutine(); });
  });
  $("ex-lang").value = lang;
  $("ex-lang").addEventListener("change", function () {
    lang = $("ex-lang").value; if (!D.ui[lang]) { lang = "en"; }
    store("fz_ex_lang", lang); renderSafety(); renderChips(); renderList(); renderRoutine();
  });
  window.addEventListener("hashchange", openFromHash);

  loadLocal(); setSync("anon");
  renderSafety(); renderChips(); renderList(); renderRoutine();
  initAccount();
})();
