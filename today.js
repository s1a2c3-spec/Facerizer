/* Facerizer "Today's Plan" (Phase 6B): the day-by-day 30-day plan on /plan.
 *   FZToday.init({ sb, userId, reportId })     (called by plan.js once the plan page is ready)
 * Two counters, as in the 30/60/90 plan:
 *   Calendar Day    = days since the plan was started (worked out here, from the date)
 *   Active Plan Day = the day the person is on. It moves forward only when that day is finished.
 * A missed day never resets anything and never deletes finished tasks: the page says "You missed N days" and "Continue My Plan".
 * Phase 6C adds the night check-in (plan_checkins, sql/17: if that column is missing the check-in is simply not shown) and the weekly / final reports,
 * which are worked out here from the ticks and check-ins (see FZDays.report in plan-days.js). No AI, no photos.
 * Everything is saved in grooming_profile (sql/14, 15 and 16). If those columns are not there yet, the card stays hidden.
 * The day content comes from plan-days.js, the skincare steps from skincare.js. Text from them is always added with textContent. */
(function () {
  "use strict";
  var TASKS = ["am", "ex", "life", "pm", "special"];
  var COLS = "skin_type, sensitive_skin, has_allergy, medical_caution, profile_done_at, products_have, daily_minutes, plan_started_on, plan_active_day, plan_day_date, plan_missed, plan_done";

  function T(k, v) { return window.FZ_I18N ? window.FZ_I18N.t(k, v) : k; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  var sentDone = {}; // one "day complete" event per day and visit
  function track(n, p) { try { (window.fzTrack || function (n, p) { (window.fzQ = window.fzQ || []).push([n, p]); })(n, p); } catch (e) {} }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function dayNum(s) { var p = String(s).split("-"); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000); }
  function diffDays(a, b) { return dayNum(a) - dayNum(b); } // a - b, in calendar days

  var C = null;      // { sb, userId, reportId }
  var P = null;      // the saved row (profile + plan)
  var S = null;      // { started, active, dayDate, missed, done }
  var root = null, msg = "", ciMsg = "";
  var openReps = {}; // which report <details> are open, kept when the page is redrawn
  var today = null;  // "YYYY-MM-DD", set at start and again when the page comes back to the front

  function isDone(day) { var l = S.done[String(day)] || []; return TASKS.every(function (t) { return l.indexOf(t) >= 0; }); }
  function doneCount(day) { var l = S.done[String(day)] || []; return TASKS.filter(function (t) { return l.indexOf(t) >= 0; }).length; }
  function daysFinished() { var n = 0; for (var d = 1; d <= 30; d++) if (isDone(d)) n++; return n; }

  function save(patch) {
    var row = { user_id: C.userId, updated_at: new Date().toISOString() };
    Object.keys(patch).forEach(function (k) { row[k] = patch[k]; });
    return C.sb.from("grooming_profile").upsert(row, { onConflict: "user_id" }).then(function (res) {
      if (res && res.error) { console.error(res.error); return false; }
      return true;
    }, function (e) { console.error(e); return false; });
  }
  function planPatch() { return { plan_started_on: S.started, plan_active_day: S.active, plan_day_date: S.dayDate, plan_missed: S.missed, plan_done: S.done }; }

  // What is the state right now? "start", "missed", "day" or "finished". Moves to the next day by itself when the last one was finished.
  function reconcile() {
    if (!S.started) return "start";
    if (isDone(30)) return "finished";
    if (!S.dayDate) { S.dayDate = today; save(planPatch()); return "day"; }
    if (diffDays(today, S.dayDate) > 0) {
      if (isDone(S.active)) { S.active = Math.min(30, S.active + 1); S.dayDate = today; save(planPatch()); return "day"; }
      return "missed";
    }
    return "day";
  }

  function ctxFor() {
    return {
      skinType: (P && P.skin_type) || (C.cardSkin || "unclear"), sensitive: !!(P && P.sensitive_skin),
      flags: { allergy: !!(P && P.has_allergy), caution: !!(P && P.medical_caution) },
      profileDone: !!(P && P.profile_done_at), dailyMinutes: P && P.daily_minutes, productsHave: (P && P.products_have) || [], checkins: S && S.checkins ? S.checkins : {}
    };
  }

  // ---------- drawing ----------
  function bar(pct, label) {
    var w = el("div", "td-bar"); w.setAttribute("role", "progressbar"); w.setAttribute("aria-valuemin", "0"); w.setAttribute("aria-valuemax", "100"); w.setAttribute("aria-valuenow", String(pct)); w.setAttribute("aria-label", label);
    var s = el("span"); s.style.width = pct + "%"; w.appendChild(s); return w;
  }
  function head(state) {
    var h = el("div", "td-head"); h.appendChild(el("h2", "", T("td.title")));
    if (S.started) {
      var cal = Math.max(1, diffDays(today, S.started) + 1);
      h.appendChild(el("p", "td-counters", T("td.counters", { cal: cal, day: S.active })));
    }
    return h;
  }
  function note() { var m = el("p", "td-msg", msg); m.id = "td-msg"; m.setAttribute("role", "status"); m.setAttribute("aria-live", "polite"); return m; }

  function drawStart() {
    var b = el("div", "td-box"); b.appendChild(el("h3", "", T("td.start_h"))); b.appendChild(el("p", "td-p", T("td.start_p")));
    if (!(P && P.profile_done_at)) {
      var hint = el("p", "td-hint", T("td.profile_hint") + " "); var a = el("a", "", T("td.profile_link")); a.href = "/profile" + (C.reportId ? "?from=" + encodeURIComponent(C.reportId) : ""); hint.appendChild(a); b.appendChild(hint);
    }
    var btn = el("button", "btn btn-primary td-main", T("td.start_btn")); btn.type = "button"; btn.id = "td-start";
    btn.addEventListener("click", function () {
      btn.disabled = true; S.started = today; S.active = 1; S.dayDate = today; S.missed = 0; S.done = {};
      save(planPatch()).then(function (ok) { if (!ok) { S.started = null; msg = T("td.save_err"); } else { msg = ""; track("plan_start"); } draw(); });
    });
    b.appendChild(btn); b.appendChild(note()); return b;
  }
  function drawMissed() {
    var gap = diffDays(today, S.dayDate), b = el("div", "td-box td-missed");
    b.appendChild(el("p", "td-p td-big", gap === 1 ? T("td.missed_1") : T("td.missed_n", { n: gap })));
    var btn = el("button", "btn btn-primary td-main", T("td.continue")); btn.type = "button"; btn.id = "td-continue";
    btn.addEventListener("click", function () {
      btn.disabled = true; var old = { d: S.dayDate, m: S.missed }; S.missed += gap; S.dayDate = today;
      save(planPatch()).then(function (ok) { if (!ok) { S.dayDate = old.d; S.missed = old.m; msg = T("td.save_err"); } else { msg = ""; track("plan_continue"); } draw(); });
    });
    b.appendChild(btn); b.appendChild(note()); return b;
  }
  function drawFinished() {
    var b = el("div", "td-box"); b.appendChild(el("h3", "", T("td.finished_h"))); b.appendChild(el("p", "td-p", T("td.finished_p")));
    var a = el("a", "btn btn-primary td-main", T("td.new_analysis")); a.href = "/analyze/"; b.appendChild(a); return b;
  }

  function taskNode(t, day, plan) {
    var done = (S.done[String(day)] || []).indexOf(t.id) >= 0;
    var box = el("section", "td-task"); box.setAttribute("aria-labelledby", "td-t-" + t.id);
    var lab = el("label", "td-label");
    var cb = el("input"); cb.type = "checkbox"; cb.id = "td-c-" + t.id; cb.checked = done;
    var tt = el("span", "td-tt", t.title); tt.id = "td-t-" + t.id;
    lab.appendChild(cb); lab.appendChild(tt);
    if (t.id === "am" || t.id === "pm") { if (plan.newActive && t.items.some(function (i) { return i.active; })) lab.appendChild(el("span", "td-new", T("td.new"))); }
    box.appendChild(lab);
    if (t.items.length) {
      var ul = el("ul", "td-items");
      t.items.forEach(function (i) { var li = el("li"); li.appendChild(el("b", "", i.title)); if (i.text) li.appendChild(el("span", "", ": " + i.text)); ul.appendChild(li); });
      box.appendChild(ul);
    }
    if (t.note) box.appendChild(el("p", "td-note", t.note));
    if (t.link) {
      var a = el("a", "td-link", t.link.text);
      a.href = t.link.report && C.reportId ? "/report?id=" + encodeURIComponent(C.reportId) : t.link.href; box.appendChild(a);
    }
    cb.addEventListener("change", function () {
      var key = String(day), list = (S.done[key] || []).slice(), i = list.indexOf(t.id), want = cb.checked;
      if (want && i < 0) list.push(t.id); if (!want && i >= 0) list.splice(i, 1);
      var before = S.done[key]; S.done[key] = list; paint(day);
      save({ plan_done: S.done }).then(function (ok) {
        if (!ok) { if (before) S.done[key] = before; else delete S.done[key]; cb.checked = !want; msg = T("td.save_err"); paint(day); }
        else { if (want && isDone(day) && !sentDone[day]) { sentDone[day] = true; track("plan_day_complete", { day: day }); } if (msg) { msg = ""; paint(day); } }
      });
    });
    return box;
  }

  function drawDay() {
    var day = S.active, plan = window.FZDays.build(day, ctxFor()), b = el("div", "td-day");
    var top = el("div", "td-top");
    top.appendChild(el("p", "td-dayno", T("td.day_of", { n: day }) + "  ·  " + T("td.phase", { p: plan.phase.n, name: plan.phase.name })));
    top.appendChild(el("h3", "td-daytitle", plan.title)); b.appendChild(top);
    if (plan.advice) { var adv = el("p", "td-advice", plan.advice); adv.id = "td-advice"; b.appendChild(adv); }
    var pr = el("div", "td-prog"); pr.id = "td-prog"; b.appendChild(pr);
    var list = el("div", "td-tasks"); plan.tasks.forEach(function (t) { list.appendChild(taskNode(t, day, plan)); }); b.appendChild(list);
    if (S.checkins) b.appendChild(checkinNode(day));
    var ok = el("p", "td-ok"); ok.id = "td-ok"; ok.setAttribute("role", "status"); ok.setAttribute("aria-live", "polite"); b.appendChild(ok);
    b.appendChild(note());
    b.appendChild(el("h3", "td-calh", T("td.cal_h")));
    var cal = el("ol", "td-cal"); cal.id = "td-cal"; b.appendChild(cal);
    return b;
  }

  // ---------- night check-in ----------
  var CI = ["good", "dry", "oily", "irritated", "breakouts"];
  function checkinNode(day) {
    var box = el("section", "td-ci"); box.setAttribute("aria-labelledby", "td-ci-h");
    var h = el("h3", "", T("td.ci_h")); h.id = "td-ci-h"; box.appendChild(h); box.appendChild(el("p", "td-p", T("td.ci_q")));
    var g = el("div", "td-chips"); g.setAttribute("role", "group"); g.setAttribute("aria-labelledby", "td-ci-h");
    function paintChips() { CI.forEach(function (k) { var b = document.getElementById("td-ci-" + k); if (!b) return; var on = S.checkins[day] === k; b.className = "td-chip" + (on ? " on" : ""); b.setAttribute("aria-pressed", on ? "true" : "false"); }); }
    CI.forEach(function (k) {
      var on = S.checkins[day] === k, b = el("button", "td-chip" + (on ? " on" : ""), T("td.ci." + k)); b.type = "button"; b.id = "td-ci-" + k; b.setAttribute("aria-pressed", on ? "true" : "false");
      b.addEventListener("click", function () {
        var before = S.checkins[day], want = before === k ? null : k;
        if (want) S.checkins[day] = want; else delete S.checkins[day];
        paintChips(); var m = document.getElementById("td-ci-msg"); if (m) m.textContent = "";
        save({ plan_checkins: S.checkins }).then(function (ok) {
          if (!ok) { if (before) S.checkins[day] = before; else delete S.checkins[day]; paintChips(); }
          if (ok && want) track("checkin_saved");
          var m2 = document.getElementById("td-ci-msg"); if (m2) { m2.textContent = ok ? T("td.ci_saved") : T("td.save_err"); m2.className = "td-ci-msg" + (ok ? "" : " err"); }
          paintReports();
        });
      });
      g.appendChild(b);
    });
    box.appendChild(g);
    var m = el("p", "td-ci-msg"); m.id = "td-ci-msg"; m.setAttribute("role", "status"); m.setAttribute("aria-live", "polite"); box.appendChild(m);
    return box;
  }

  // ---------- weekly and final reports ----------
  function repNode(k) {
    var r = window.FZDays.report(k, { done: S.done, checkins: S.checkins, missed: S.missed, active: S.active });
    var d = el("details", "td-rep"); d.open = !!openReps[k]; d.setAttribute("data-key", k);
    d.addEventListener("toggle", function () { openReps[k] = d.open; if (d.open) track("plan_report_open", { report: k }); });
    d.appendChild(el("summary", "", r.title));
    var rows = el("div", "td-rows");
    r.rows.forEach(function (x) { var row = el("div", "td-row"); row.appendChild(el("span", "", x.label)); row.appendChild(el("b", "", x.value)); rows.appendChild(row); });
    d.appendChild(rows);
    r.notes.forEach(function (n) { d.appendChild(el("p", "td-p", n)); });
    var ph = el("p", "td-p", r.photo + " "); var a = el("a", "td-link", r.photoLink.text); a.href = r.photoLink.href; ph.appendChild(a); d.appendChild(ph);
    d.appendChild(el("p", "td-basis", r.basis));
    return d;
  }
  function repsBlock() {
    if (!S || !S.started) return null;
    var keys = window.FZDays.reportsAvailable(S); if (!keys.length) return null;
    var w = el("section", "td-reps"); w.id = "td-reps"; w.appendChild(el("h3", "", T("td.rep_h")));
    keys.slice().reverse().forEach(function (k) { w.appendChild(repNode(k)); });
    return w;
  }
  // read which reports are open straight from the page (the "toggle" event arrives a moment late)
  function rememberOpen() { document.querySelectorAll("#td-reps details[data-key]").forEach(function (d) { openReps[d.getAttribute("data-key")] = d.open; }); }
  function paintReports() {
    rememberOpen();
    var old = document.getElementById("td-reps"), nb = repsBlock();
    if (old && nb) old.replaceWith(nb); else if (old) old.remove();
    else if (nb && root) { var fine = root.querySelector(".td-fine"); if (fine) root.insertBefore(nb, fine); }
  }

  // update the numbers and the calendar without redrawing the tasks (keeps focus on the checkbox)
  function paint(day) {
    var pr = document.getElementById("td-prog"); if (!pr) return;
    var n = doneCount(day), pct = Math.round(100 * n / TASKS.length);
    pr.textContent = ""; pr.appendChild(el("p", "td-ptxt", T("td.tasks_done", { a: n, b: TASKS.length }))); pr.appendChild(bar(pct, T("td.tasks_done", { a: n, b: TASKS.length })));
    var fin = daysFinished(); pr.appendChild(el("p", "td-ptxt td-sm", T("td.overall", { n: fin })));
    var ok = document.getElementById("td-ok");
    if (ok) ok.textContent = isDone(day) ? (day >= 30 ? T("td.day30_done") : T("td.day_done", { n: day, m: day + 1 })) : "";
    var m = document.getElementById("td-msg"); if (m) m.textContent = msg;
    var cal = document.getElementById("td-cal");
    if (cal) {
      cal.textContent = "";
      for (var d = 1; d <= 30; d++) {
        var st = isDone(d) ? "done" : d === day ? "now" : "next";
        var li = el("li", "td-d " + st, String(d)); li.setAttribute("aria-label", T(st === "done" ? "td.cal_done" : st === "now" ? "td.cal_now" : "td.cal_next", { n: d }));
        if (st === "now") li.setAttribute("aria-current", "date");
        cal.appendChild(li);
      }
    }
    paintReports();
    if (isDone(30)) draw();
  }

  function draw() {
    if (!root) return;
    rememberOpen();
    root.textContent = ""; root.hidden = false;
    var state = reconcile();
    root.appendChild(head(state));
    if (state === "start") root.appendChild(drawStart());
    else if (state === "missed") root.appendChild(drawMissed());
    else if (state === "finished") root.appendChild(drawFinished());
    else { root.appendChild(drawDay()); paint(S.active); }
    root.appendChild(el("p", "td-fine", T("td.fine")));
    paintReports(); // adds the reports block (once) in front of the small print
  }

  function init(c) {
    C = c; root = document.getElementById("td"); if (!root) return;
    today = ymd(new Date());
    var q1 = C.sb.from("grooming_profile").select(COLS).eq("user_id", C.userId).maybeSingle();
    var q2 = C.sb.from("grooming_profile").select("plan_checkins").eq("user_id", C.userId).maybeSingle(); // separate, so a missing sql/17 only hides the check-in
    Promise.all([q1, q2]).then(function (out) {
      var res = out[0], r2 = out[1];
      if (res.error) { console.warn(res.error); return; } // sql/14, 15 or 16 not run yet: the card stays hidden
      P = res.data || {};
      S = { started: P.plan_started_on || null, active: P.plan_active_day || 1, dayDate: P.plan_day_date || null, missed: P.plan_missed || 0, done: (P.plan_done && typeof P.plan_done === "object" && !Array.isArray(P.plan_done)) ? P.plan_done : {}, checkins: null };
      if (!r2.error) { var c = r2.data && r2.data.plan_checkins; S.checkins = c && typeof c === "object" && !Array.isArray(c) ? c : {}; }
      draw();
      document.addEventListener("fz:lang", function () { draw(); });
      // the tab was left open overnight: look at the date again when it comes back to the front
      document.addEventListener("visibilitychange", function () { if (!document.hidden && ymd(new Date()) !== today) { today = ymd(new Date()); draw(); } });
    }, function (e) { console.warn(e); });
  }

  window.FZToday = { init: init };
})();
