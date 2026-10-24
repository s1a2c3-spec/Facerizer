(function () {
  var cfg = window.FACERIZER || {};
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function state(t, err) { var s = $("state"); s.hidden = false; s.textContent = t; s.style.color = err ? "#b3261e" : ""; }
  function say(t, type) { var m = $("p-msg"); m.textContent = t || ""; m.className = "msg " + (type || ""); }

  var ready = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_URL.indexOf("YOUR_") === -1 && window.supabase;
  if (!ready) return state("Setup is not finished: add your Supabase details in config.js.", true);
  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  var userId = null, analysis = null, token = null, isPremium = false;
  var plan = [], ext = null, allWeeks = [], done = {}, days = {};
  var activeMonth = 0, dayNo = 1;

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return ymd(new Date()); }

  function streak() {
    var d = new Date();
    if (!days[ymd(d)]) d.setDate(d.getDate() - 1);
    var n = 0;
    while (days[ymd(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function totals() {
    var total = 0, got = 0;
    allWeeks.forEach(function (w) { (w.tasks || []).forEach(function (t, i) { total++; if (done["w" + w.week + "t" + i]) got++; }); });
    return { total: total, got: got };
  }
  function paintProgress() {
    var t = totals(), pct = t.total ? Math.round(100 * t.got / t.total) : 0;
    $("p-pct").textContent = pct + "%"; $("p-bar").style.width = pct + "%";
    $("p-barwrap").setAttribute("aria-valuenow", String(pct));
    $("p-count").textContent = t.got + " of " + t.total + " tasks done";
    allWeeks.forEach(function (w) {
      var c = document.getElementById("wk-count-" + w.week); if (!c) return;
      var g = 0; (w.tasks || []).forEach(function (x, i) { if (done["w" + w.week + "t" + i]) g++; });
      c.textContent = g + " of " + (w.tasks || []).length;
    });
  }
  function paintStreak() {
    var s = streak();
    $("p-streak").textContent = "Streak: " + s + (s === 1 ? " day" : " days");
    var did = !!days[today()], btn = $("p-today");
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
      if (res.error) { console.error(res.error); input.checked = !checked; return say("Could not save that. Run m6-plan.sql in Supabase, then try again.", "error"); }
      if (checked) done[key] = true; else delete done[key];
      li.className = "task" + (checked ? " done" : "");
      say(""); paintProgress();
    });
  }

  function weeksCard(w, currentWeek) {
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
    return d;
  }

  // ---------- months and tabs ----------
  function monthList() {
    var m = [{ label: "Days 1-30", weeks: plan, head: null }];
    m.push({ label: "Days 31-60", weeks: ext ? ext.month2.weeks : null, head: ext ? ext.month2 : null, locked: !ext });
    m.push({ label: "Days 61-90", weeks: ext ? ext.month3.weeks : null, head: ext ? ext.month3 : null, locked: !ext, keep: ext ? ext.keep_going : null });
    return m;
  }

  function generate(btn) {
    btn.disabled = true; say("Creating your 60 and 90-day plan. This takes about 20 seconds...");
    fetch("/api/extend-plan", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ analysis_id: analysis.id }) })
      .then(function (r) { return r.text().then(function (t) { var j = {}; try { j = JSON.parse(t); } catch (e) {} return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (x) {
        if (!x.ok) {
          var msg = x.j.message || x.j.error || ("Server returned " + x.status);
          if (x.status === 404 && !x.j.error) msg = "The plan function was not found (404). Check that api/extend-plan.js is in GitHub and Vercel has redeployed.";
          if (x.j.detail) msg += " [" + x.j.detail + "]";
          throw new Error(msg);
        }
        return sb.from("analyses").select("plan_ext").eq("id", analysis.id).maybeSingle();
      })
      .then(function (res) {
        if (res.error || !res.data || !res.data.plan_ext) throw new Error("Saved, but could not load it. Refresh the page.");
        ext = res.data.plan_ext;
        allWeeks = plan.concat(ext.month2.weeks, ext.month3.weeks);
        activeMonth = 1;
        say(""); renderAll();
      })
      .catch(function (e) { btn.disabled = false; say(e.message, "error"); });
  }

  function renderMonth() {
    var months = monthList(), m = months[activeMonth];
    var head = $("p-month"), list = $("p-weeks");
    head.textContent = ""; list.textContent = "";

    if (m.locked) {
      var box = el("div", "cx teaser");
      if (isPremium) {
        box.appendChild(el("h2", "", "Create your 60 and 90-day plan"));
        box.appendChild(el("p", "card-text", "It continues from your first 30 days, with habit-building weeks, a maintenance calendar for haircuts and trims, small experiments and a final review at day 90. It uses only the text of your report, not your photo, and does not use up an analysis."));
        var b = el("button", "btn btn-primary", "Create my plan"); b.type = "button";
        b.addEventListener("click", function () { generate(b); });
        box.appendChild(b);
      } else {
        box.appendChild(el("h2", "", "The 60 and 90-day plans are part of Premium"));
        box.appendChild(el("p", "card-text", "Premium continues your plan for two more months, with a maintenance calendar, small experiments and a day-90 review."));
        var a = el("a", "btn btn-primary", "See Premium"); a.href = "/#pricing";
        box.appendChild(a);
      }
      head.appendChild(box);
      return;
    }
    if (m.head) {
      var h = el("div", "month-head");
      h.appendChild(el("h2", "", m.head.theme || m.label));
      if (m.head.intro) h.appendChild(el("p", "", m.head.intro));
      head.appendChild(h);
    }
    var cw = Math.min(allWeeks.length ? allWeeks[allWeeks.length - 1].week : 4, Math.max(1, Math.ceil(Math.min(dayNo, ext ? 90 : 30) / 7)));
    m.weeks.forEach(function (w) { list.appendChild(weeksCard(w, cw)); });
    if (m.keep && m.keep.length) {
      var k = el("div", "cx keep");
      k.appendChild(el("h2", "", "Keep going after day 90"));
      m.keep.forEach(function (x) { k.appendChild(el("h3", "", x.title)); k.appendChild(el("p", "", x.text)); });
      list.appendChild(k);
    }
    paintProgress();
  }

  function renderTabs() {
    var tabs = $("p-tabs"); tabs.textContent = "";
    monthList().forEach(function (m, i) {
      var b = el("button", (i === activeMonth ? "on" : "") + (m.locked && !isPremium ? " lock" : ""), m.label); b.type = "button";
      b.setAttribute("role", "tab"); b.setAttribute("aria-selected", i === activeMonth ? "true" : "false");
      b.addEventListener("click", function () { activeMonth = i; renderTabs(); renderMonth(); });
      tabs.appendChild(b);
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

  function renderAll() {
    var span = ext ? 90 : 30;
    var shown = Math.max(1, Math.min(span, dayNo));
    $("p-title").textContent = ext ? "Your 90-day plan" : "Your 30-day plan";
    $("p-sub").textContent = dayNo > span ? "Your " + span + " days are complete." : "Day " + shown + " of " + span;
    var fin = dayNo > span;
    $("p-finish").hidden = !fin;
    $("p-finish-h").textContent = "Your " + span + " days are done";
    renderTabs(); renderMonth(); paintProgress(); paintStreak();
  }

  $("p-today").addEventListener("click", function () {
    var key = today(), has = !!days[key], btn = $("p-today");
    btn.disabled = true;
    var req = has ? sb.from("checkins").delete().eq("day", key) : sb.from("checkins").insert({ user_id: userId, day: key });
    req.then(function (res) {
      btn.disabled = false;
      if (res.error) { console.error(res.error); return say("Could not save that. Run m6-plan.sql in Supabase, then try again.", "error"); }
      if (has) delete days[key]; else days[key] = true;
      say(""); paintStreak();
    });
  });

  sb.auth.getSession().then(function (s) {
    var session = s.data.session;
    if (!session) { window.location.href = "/login"; return; }
    userId = session.user.id; token = session.access_token;

    var withExt = sb.from("analyses").select("id, plan, result, plan_ext, created_at").eq("status", "done").order("created_at", { ascending: false }).limit(1).maybeSingle();
    Promise.all([sb.from("profiles").select("plan").eq("id", userId).maybeSingle(), withExt]).then(function (out) {
      var res = out[1];
      isPremium = !!(out[0].data && out[0].data.plan === "premium");
      if (res.error && /plan_ext/.test(res.error.message || "")) {
        // the new column is not set up yet: load without it
        return sb.from("analyses").select("id, plan, result, created_at").eq("status", "done").order("created_at", { ascending: false }).limit(1).maybeSingle().then(function (r2) { return r2; });
      }
      return res;
    }).then(function (res) {
      if (res.error) { console.error(res.error); return state("Could not load your plan (" + res.error.message + ").", true); }
      if (!res.data) {
        $("state").hidden = false; $("state").textContent = "";
        var a = el("a", "", "Run your first analysis"); a.href = "/analyze/"; a.style.color = "var(--primary)";
        $("state").appendChild(document.createTextNode("You do not have a plan yet. ")); $("state").appendChild(a);
        return;
      }
      analysis = res.data;
      var r = analysis.result || {};
      if (!r.plan_weeks || !r.plan_weeks.length) { $("state").hidden = true; $("locked").hidden = false; return; }
      plan = r.plan_weeks;
      ext = isPremium && analysis.plan_ext && analysis.plan_ext.month2 ? analysis.plan_ext : null;
      allWeeks = ext ? plan.concat(ext.month2.weeks, ext.month3.weeks) : plan;
      $("p-report").href = "/report?id=" + encodeURIComponent(analysis.id);
      dayNo = Math.floor((Date.now() - new Date(analysis.created_at).getTime()) / 86400000) + 1;
      var cw = Math.ceil(Math.min(dayNo, ext ? 90 : 30) / 7);
      activeMonth = ext && cw > 8 ? 2 : ext && cw > 4 ? 1 : 0;

      Promise.all([
        sb.from("plan_progress").select("task_key").eq("analysis_id", analysis.id),
        sb.from("checkins").select("day").order("day", { ascending: false }).limit(120)
      ]).then(function (o2) {
        if (o2[0].error || o2[1].error) { console.error(o2[0].error || o2[1].error); return state("Could not load your progress. Run m6-plan.sql in Supabase, then refresh.", true); }
        (o2[0].data || []).forEach(function (x) { done[x.task_key] = true; });
        (o2[1].data || []).forEach(function (x) { days[x.day] = true; });
        renderRoutine(r.skincare);
        renderAll();
        $("state").hidden = true; $("plan").hidden = false;
      });
    });
  });
})();
