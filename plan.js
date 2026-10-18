(function () {
  var cfg = window.FACERIZER || {};
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function state(t, err) { var s = $("state"); s.hidden = false; s.textContent = t; s.style.color = err ? "#b3261e" : ""; }
  function say(t, type) { var m = $("p-msg"); m.textContent = t || ""; m.className = "msg " + (type || ""); }

  var ready = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_URL.indexOf("YOUR_") === -1 && window.supabase;
  if (!ready) return state("Setup is not finished: add your Supabase details in config.js.", true);
  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  var userId = null, analysis = null, plan = [], done = {}, days = {};

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return ymd(new Date()); }

  function streak() {
    var d = new Date();
    if (!days[ymd(d)]) { d.setDate(d.getDate() - 1); }   // today not ticked yet: streak is still alive until tomorrow
    var n = 0;
    while (days[ymd(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function totals() {
    var total = 0, got = 0;
    plan.forEach(function (w) { (w.tasks || []).forEach(function (t, i) { total++; if (done["w" + w.week + "t" + i]) got++; }); });
    return { total: total, got: got };
  }

  function paintProgress() {
    var t = totals();
    var pct = t.total ? Math.round(100 * t.got / t.total) : 0;
    $("p-pct").textContent = pct + "%";
    $("p-bar").style.width = pct + "%";
    $("p-barwrap").setAttribute("aria-valuenow", String(pct));
    $("p-count").textContent = t.got + " of " + t.total + " tasks done";
    // week counters
    plan.forEach(function (w) {
      var c = document.getElementById("wk-count-" + w.week); if (!c) return;
      var g = 0; (w.tasks || []).forEach(function (x, i) { if (done["w" + w.week + "t" + i]) g++; });
      c.textContent = g + " of " + (w.tasks || []).length;
    });
  }

  function paintStreak() {
    var s = streak();
    $("p-streak").textContent = "Streak: " + s + (s === 1 ? " day" : " days");
    var btn = $("p-today");
    var did = !!days[today()];
    btn.textContent = did ? "Done for today. Tap to undo" : "I did my routine today";
    btn.className = "btn " + (did ? "btn-outline" : "btn-primary") + " today-btn";
  }

  function toggleTask(key, checked, li, input) {
    input.disabled = true;
    var req = checked
      ? sb.from("plan_progress").insert({ user_id: userId, analysis_id: analysis.id, task_key: key })
      : sb.from("plan_progress").delete().eq("analysis_id", analysis.id).eq("task_key", key);
    req.then(function (res) {
      input.disabled = false;
      if (res.error) {
        console.error(res.error);
        input.checked = !checked;
        return say("Could not save that. Run m6-plan.sql in Supabase, then try again.", "error");
      }
      if (checked) done[key] = true; else delete done[key];
      li.className = "task" + (checked ? " done" : "");
      say("");
      paintProgress();
    });
  }

  function renderWeeks(currentWeek) {
    var box = $("p-weeks"); box.textContent = "";
    plan.forEach(function (w) {
      var d = el("details", "cx wkcard" + (w.week === currentWeek ? " now" : ""));
      if (w.week === currentWeek) d.open = true;
      var sm = el("summary");
      sm.appendChild(el("h2", "", "Week " + w.week + ": " + w.title));
      var c = el("span", "count"); c.id = "wk-count-" + w.week; sm.appendChild(c);
      d.appendChild(sm);
      (w.tasks || []).forEach(function (t, i) {
        var key = "w" + w.week + "t" + i;
        var lab = el("label", "task" + (done[key] ? " done" : ""));
        var inp = document.createElement("input"); inp.type = "checkbox"; inp.checked = !!done[key];
        inp.addEventListener("change", function () { toggleTask(key, inp.checked, lab, inp); });
        lab.appendChild(inp); lab.appendChild(el("span", "", t));
        d.appendChild(lab);
      });
      box.appendChild(d);
    });
  }

  function renderRoutine(sk) {
    var r = $("p-routine"); r.textContent = "";
    if (!sk) return;
    [["Morning", sk.morning], ["Evening", sk.evening]].forEach(function (p) {
      if (!p[1] || !p[1].length) return;
      var d = el("div"); d.appendChild(el("h3", "", p[0]));
      var ul = el("ul"); p[1].forEach(function (x) { ul.appendChild(el("li", "", x)); });
      d.appendChild(ul); r.appendChild(d);
    });
  }

  $("p-today").addEventListener("click", function () {
    var key = today(), has = !!days[key], btn = $("p-today");
    btn.disabled = true;
    var req = has
      ? sb.from("checkins").delete().eq("day", key)
      : sb.from("checkins").insert({ user_id: userId, day: key });
    req.then(function (res) {
      btn.disabled = false;
      if (res.error) { console.error(res.error); return say("Could not save that. Run m6-plan.sql in Supabase, then try again.", "error"); }
      if (has) delete days[key]; else days[key] = true;
      say("");
      paintStreak();
    });
  });

  sb.auth.getSession().then(function (s) {
    var session = s.data.session;
    if (!session) { window.location.href = "/login"; return; }
    userId = session.user.id;
    sb.from("analyses").select("id, plan, result, created_at").eq("status", "done").order("created_at", { ascending: false }).limit(1).maybeSingle().then(function (res) {
      if (res.error) { console.error(res.error); return state("Could not load your plan (" + res.error.message + ").", true); }
      if (!res.data) {
        $("state").hidden = false;
        $("state").textContent = "";
        var a = el("a", "", "Run your first analysis"); a.href = "/analyze/"; a.style.color = "var(--primary)";
        $("state").appendChild(document.createTextNode("You do not have a plan yet. "));
        $("state").appendChild(a);
        return;
      }
      analysis = res.data;
      var r = analysis.result || {};
      if (!r.plan_weeks || !r.plan_weeks.length) { $("state").hidden = true; $("locked").hidden = false; return; }
      plan = r.plan_weeks;
      $("p-report").href = "/report?id=" + encodeURIComponent(analysis.id);

      var dayNo = Math.floor((Date.now() - new Date(analysis.created_at).getTime()) / 86400000) + 1;
      var shown = Math.max(1, Math.min(30, dayNo));
      $("p-sub").textContent = dayNo > 30 ? "Your 30 days are complete." : "Day " + shown + " of 30";
      $("p-finish").hidden = dayNo <= 30;
      var currentWeek = Math.min(4, Math.ceil(shown / 7));

      Promise.all([
        sb.from("plan_progress").select("task_key").eq("analysis_id", analysis.id),
        sb.from("checkins").select("day").order("day", { ascending: false }).limit(120)
      ]).then(function (out) {
        if (out[0].error || out[1].error) {
          console.error(out[0].error || out[1].error);
          return state("Could not load your progress. Run m6-plan.sql in Supabase, then refresh.", true);
        }
        (out[0].data || []).forEach(function (x) { done[x.task_key] = true; });
        (out[1].data || []).forEach(function (x) { days[x.day] = true; });
        renderRoutine(r.skincare);
        renderWeeks(currentWeek);
        paintProgress();
        paintStreak();
        $("state").hidden = true;
        $("plan").hidden = false;
      });
    });
  });
})();
