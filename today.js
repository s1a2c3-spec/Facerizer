/* Facerizer "Today's Plan" (Phase 6B): the day-by-day 30-day plan on /plan.
 *   FZToday.init({ sb, userId, reportId })     (called by plan.js once the plan page is ready)
 * Two counters, as in the 30/60/90 plan:
 *   Calendar Day    = days since the plan was started (worked out here, from the date)
 *   Active Plan Day = the day the person is on. It moves forward only when that day is finished.
 * A missed day never resets anything and never deletes finished tasks: the page says "You missed N days" and "Continue My Plan".
 * Everything is saved in grooming_profile (sql/14, 15 and 16). If those columns are not there yet, the card stays hidden.
 * The day content comes from plan-days.js, the skincare steps from skincare.js. Text from them is always added with textContent. */
(function () {
  "use strict";
  var TASKS = ["am", "ex", "life", "pm", "special"];
  var COLS = "skin_type, sensitive_skin, has_allergy, medical_caution, profile_done_at, products_have, daily_minutes, plan_started_on, plan_active_day, plan_day_date, plan_missed, plan_done";

  function T(k, v) { return window.FZ_I18N ? window.FZ_I18N.t(k, v) : k; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function dayNum(s) { var p = String(s).split("-"); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000); }
  function diffDays(a, b) { return dayNum(a) - dayNum(b); } // a - b, in calendar days

  var C = null;      // { sb, userId, reportId }
  var P = null;      // the saved row (profile + plan)
  var S = null;      // { started, active, dayDate, missed, done }
  var root = null, msg = "";
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
      profileDone: !!(P && P.profile_done_at), dailyMinutes: P && P.daily_minutes, productsHave: (P && P.products_have) || []
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
      save(planPatch()).then(function (ok) { if (!ok) { S.started = null; msg = T("td.save_err"); } else msg = ""; draw(); });
    });
    b.appendChild(btn); b.appendChild(note()); return b;
  }
  function drawMissed() {
    var gap = diffDays(today, S.dayDate), b = el("div", "td-box td-missed");
    b.appendChild(el("p", "td-p td-big", gap === 1 ? T("td.missed_1") : T("td.missed_n", { n: gap })));
    var btn = el("button", "btn btn-primary td-main", T("td.continue")); btn.type = "button"; btn.id = "td-continue";
    btn.addEventListener("click", function () {
      btn.disabled = true; var old = { d: S.dayDate, m: S.missed }; S.missed += gap; S.dayDate = today;
      save(planPatch()).then(function (ok) { if (!ok) { S.dayDate = old.d; S.missed = old.m; msg = T("td.save_err"); } else msg = ""; draw(); });
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
        else if (msg) { msg = ""; paint(day); }
      });
    });
    return box;
  }

  function drawDay() {
    var day = S.active, plan = window.FZDays.build(day, ctxFor()), b = el("div", "td-day");
    var top = el("div", "td-top");
    top.appendChild(el("p", "td-dayno", T("td.day_of", { n: day }) + "  ·  " + T("td.phase", { p: plan.phase.n, name: plan.phase.name })));
    top.appendChild(el("h3", "td-daytitle", plan.title)); b.appendChild(top);
    var pr = el("div", "td-prog"); pr.id = "td-prog"; b.appendChild(pr);
    var list = el("div", "td-tasks"); plan.tasks.forEach(function (t) { list.appendChild(taskNode(t, day, plan)); }); b.appendChild(list);
    var ok = el("p", "td-ok"); ok.id = "td-ok"; ok.setAttribute("role", "status"); ok.setAttribute("aria-live", "polite"); b.appendChild(ok);
    b.appendChild(note());
    b.appendChild(el("h3", "td-calh", T("td.cal_h")));
    var cal = el("ol", "td-cal"); cal.id = "td-cal"; b.appendChild(cal);
    return b;
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
    if (isDone(30)) draw();
  }

  function draw() {
    if (!root) return;
    root.textContent = ""; root.hidden = false;
    var state = reconcile();
    root.appendChild(head(state));
    if (state === "start") root.appendChild(drawStart());
    else if (state === "missed") root.appendChild(drawMissed());
    else if (state === "finished") root.appendChild(drawFinished());
    else { root.appendChild(drawDay()); paint(S.active); }
    root.appendChild(el("p", "td-fine", T("td.fine")));
  }

  function init(c) {
    C = c; root = document.getElementById("td"); if (!root) return;
    today = ymd(new Date());
    C.sb.from("grooming_profile").select(COLS).eq("user_id", C.userId).maybeSingle().then(function (res) {
      if (res.error) { console.warn(res.error); return; } // sql/14, 15 or 16 not run yet: the card stays hidden
      P = res.data || {};
      S = { started: P.plan_started_on || null, active: P.plan_active_day || 1, dayDate: P.plan_day_date || null, missed: P.plan_missed || 0, done: (P.plan_done && typeof P.plan_done === "object" && !Array.isArray(P.plan_done)) ? P.plan_done : {} };
      draw();
      document.addEventListener("fz:lang", function () { draw(); });
      // the tab was left open overnight: look at the date again when it comes back to the front
      document.addEventListener("visibilitychange", function () { if (!document.hidden && ymd(new Date()) !== today) { today = ymd(new Date()); draw(); } });
    }, function (e) { console.warn(e); });
  }

  window.FZToday = { init: init };
})();
