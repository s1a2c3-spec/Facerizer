/* Face exercises page: library, language, routine builder, simple streak (saved in this browser only). */
(function () {
  "use strict";
  var D = window.FZ_EX;
  var $ = function (id) { return document.getElementById(id); };
  var content = $("ex-content");
  if (!D || !content) { return; }

  function store(k, v) { try { if (v === undefined) { return localStorage.getItem(k); } localStorage.setItem(k, v); } catch (e) {} return null; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) { n.className = cls; } if (text != null) { n.textContent = text; } return n; }

  var LANG_ATTR = { en: "en-IN", hinglish: "hi-Latn", hi: "hi" };
  var lang = store("fz_ex_lang"); if (!D.ui[lang]) { lang = "en"; }
  var area = "all";
  var mins = store("fz_ex_min"); if (!D.routines[mins]) { mins = "5"; }
  var byId = {}; D.list.forEach(function (e) { byId[e.id] = e; });

  function L() { return D.ui[lang]; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function readJson(k, fallback) { try { var v = JSON.parse(store(k) || ""); return v || fallback; } catch (e) { return fallback; } }

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

  function ticks() { return readJson("fz_ex_tick_" + today(), []); }
  function saveTicks(a) { store("fz_ex_tick_" + today(), JSON.stringify(a)); }

  function renderRoutine() {
    Array.prototype.forEach.call($("ex-mins").querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-m") === mins)); });
    var ul = $("ex-check"); ul.textContent = ""; ul.setAttribute("lang", LANG_ATTR[lang]);
    var done = ticks();
    D.routines[mins].forEach(function (id) {
      var e = byId[id]; if (!e) { return; }
      var li = el("li"), cb = el("input"); cb.type = "checkbox"; cb.id = "t-" + id; cb.checked = done.indexOf(id) > -1;
      cb.addEventListener("change", function () {
        var cur = ticks(), i = cur.indexOf(id);
        if (cb.checked && i < 0) { cur.push(id); } else if (!cb.checked && i > -1) { cur.splice(i, 1); }
        saveTicks(cur);
      });
      var lab = el("label"); lab.setAttribute("for", cb.id);
      var a = el("a", "", e.t[lang].n + " (" + e.t[lang].d + ")"); a.href = "#" + id;
      a.addEventListener("click", function () { area = "all"; renderChips(); renderList(); });
      lab.appendChild(a);
      li.appendChild(cb); li.appendChild(lab); ul.appendChild(li);
    });
    renderStats();
  }

  function streak(days) {
    var set = {}; days.forEach(function (d) { set[d] = true; });
    var d = new Date(), n = 0;
    function key(x) { return x.getFullYear() + "-" + ("0" + (x.getMonth() + 1)).slice(-2) + "-" + ("0" + x.getDate()).slice(-2); }
    if (!set[key(d)]) { d.setDate(d.getDate() - 1); }
    while (set[key(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function renderStats() {
    var days = readJson("fz_ex_days", []);
    $("ex-stats").textContent = "Days done: " + days.length + ". Current streak: " + streak(days) + " day" + (streak(days) === 1 ? "" : "s") + ".";
    $("ex-done").textContent = days.indexOf(today()) > -1 ? "Today is marked as done" : "Mark today as done";
  }

  $("ex-done").addEventListener("click", function () {
    var days = readJson("fz_ex_days", []), t = today();
    if (days.indexOf(t) < 0) { days.push(t); days = days.slice(-400); store("fz_ex_days", JSON.stringify(days)); }
    renderStats();
  });

  Array.prototype.forEach.call($("ex-mins").querySelectorAll("button"), function (b) {
    b.addEventListener("click", function () { mins = b.getAttribute("data-m"); store("fz_ex_min", mins); renderRoutine(); });
  });

  $("ex-lang").value = lang;
  $("ex-lang").addEventListener("change", function () {
    lang = $("ex-lang").value; if (!D.ui[lang]) { lang = "en"; }
    store("fz_ex_lang", lang); renderAll();
  });
  window.addEventListener("hashchange", openFromHash);

  function renderAll() { renderSafety(); renderChips(); renderList(); renderRoutine(); }
  renderAll();
})();
