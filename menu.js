/* Facerizer menu (Phase 3). One script, one line per page:  <script src="/menu.js" defer></script>
   - Puts a burger button in the page header (or in the top-right corner when the page has no header).
   - Menu: Explore, Company, Policies, Language, Your library (All photos + Delete all photos), My account (Delete my account).
   - Library and My account show only when someone is signed in (member or guest).
   - The two Delete buttons work with ONE tap, no confirmation (owner's decision).
   - Loads menu.css, translations.js, config.js and the Supabase library by itself when they are missing.
   Not used on the payment page (/checkout). */
(function () {
  "use strict";
  if (window.__fzMenu) return;
  var path = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
  if (/^\/checkout(\.html)?$/.test(path)) return;
  window.__fzMenu = true;

  var SB_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  var NAV = [
    ["menu.explore", "Explore", [
      ["menu.how_it_works", "How it works", "/#how-it-works"], ["menu.features", "Features", "/#features"], ["menu.faq", "FAQ", "/#faq"],
      ["menu.pricing", "Pricing", "/pricing"], ["menu.face_shapes", "Face shapes", "/face-shapes"],
      ["menu.face_exercises", "Face exercises", "/exercises"], ["menu.example_report", "Example report", "/sample"]]],
    ["menu.company", "Company", [["menu.about", "About us", "/about"], ["menu.contact", "Contact", "/contact"]]],
    ["menu.policies", "Policies", [
      ["menu.privacy", "Privacy Policy", "/privacy"], ["menu.terms", "Terms of Service", "/terms"],
      ["menu.refund", "Refund Policy", "/refund"], ["menu.delivery", "Delivery Policy", "/shipping-policy"]]]
  ];

  function T(key, fb, vars) {
    var s = window.FZ_I18N ? window.FZ_I18N.t(key, vars) : key;
    if (s === key) { s = fb; if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); }
    return s;
  }
  function el(tag, cls, text, i18n, fb) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (i18n) { e.setAttribute("data-i18n", i18n); e.textContent = T(i18n, fb || text || ""); }
    else if (text) e.textContent = text;
    return e;
  }
  function svg(d, size) {
    var n = "http://www.w3.org/2000/svg", s = document.createElementNS(n, "svg"), p = document.createElementNS(n, "path");
    s.setAttribute("width", size || 22); s.setAttribute("height", size || 22); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.setAttribute("focusable", "false");
    p.setAttribute("d", d); p.setAttribute("fill", "none"); p.setAttribute("stroke", "currentColor"); p.setAttribute("stroke-width", "2"); p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round");
    s.appendChild(p); return s;
  }
  function loadScript(src, ok, fail) {
    var s = document.createElement("script"); s.src = src; s.async = true;
    s.onload = ok; s.onerror = function () { if (fail) fail(new Error("load " + src)); };
    document.head.appendChild(s);
  }

  /* ---------- session (read from the browser, no network) ---------- */
  function hasSession() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (/^sb-.*-auth-token$/.test(k)) {
          var v = JSON.parse(localStorage.getItem(k) || "null");
          if (v && (v.user || v.access_token || (v.currentSession && v.currentSession.user))) return true;
        }
      }
    } catch (e) {}
    return false;
  }
  var sbPromise = null;
  function getSb() {
    if (sbPromise) return sbPromise;
    sbPromise = new Promise(function (resolve, reject) {
      function make() {
        var c = window.FACERIZER;
        if (!window.supabase || !c || !c.SUPABASE_URL) return reject(new Error("setup"));
        resolve(window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, { auth: { detectSessionInUrl: false } }));
      }
      function needLib() { if (window.supabase) make(); else loadScript(SB_CDN, make, reject); }
      if (window.FACERIZER) needLib(); else loadScript("/config.js", needLib, reject);
    });
    sbPromise.catch(function () { sbPromise = null; });
    return sbPromise;
  }

  /* ---------- build ---------- */
  var burger, overlay, panel, closeBtn, mainView, libView, toast, libGrid, libStatus, libDel, acctRow, acctDel, acctBox, libSec, foot, lightbox, lastFocus, busy = false;

  function build() {
    burger = el("button", "fz-burger"); burger.type = "button";
    burger.setAttribute("aria-haspopup", "dialog"); burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-controls", "fz-menu");
    burger.setAttribute("data-i18n-attr", "aria-label:common.open_menu"); burger.setAttribute("aria-label", T("common.open_menu", "Open menu"));
    burger.appendChild(svg("M4 7h16M4 12h16M4 17h16"));
    var host = document.querySelector(".bar-end") || document.querySelector(".top-right") || document.querySelector("header");
    if (host && host.matches("header.legal-top")) {
      // simple pages: logo on the left, the existing button(s) + burger grouped on the right (they wrap together on 320px)
      var grp = el("div", "fz-hdr-end");
      Array.prototype.slice.call(host.children, 1).forEach(function (c) { grp.appendChild(c); });
      grp.appendChild(burger); host.appendChild(grp);
    } else if (host) host.appendChild(burger); else { burger.className += " fz-burger-fixed"; document.body.appendChild(burger); }

    overlay = el("div", "fz-overlay"); overlay.hidden = true;
    panel = el("aside", "fz-menu"); panel.id = "fz-menu"; panel.hidden = true;
    panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true"); panel.setAttribute("aria-labelledby", "fz-title");

    var head = el("div", "fz-head");
    var h = el("h2", "", "", "menu.title", "Menu"); h.id = "fz-title";
    closeBtn = el("button", "fz-iconbtn"); closeBtn.type = "button"; closeBtn.appendChild(svg("M6 6l12 12M18 6L6 18"));
    closeBtn.setAttribute("data-i18n-attr", "aria-label:common.close_menu"); closeBtn.setAttribute("aria-label", T("common.close_menu", "Close menu"));
    head.appendChild(h); head.appendChild(closeBtn); panel.appendChild(head);

    /* main view */
    mainView = el("div", "fz-view");
    var body = el("nav", "fz-body"); body.setAttribute("aria-label", "Site menu");
    NAV.forEach(function (sec) {
      var s = el("section", "fz-sec"); s.appendChild(el("h3", "", "", sec[0], sec[1]));
      var ul = el("ul");
      sec[2].forEach(function (it) {
        var li = el("li"), a = el("a", "fz-link", "", it[0], it[1]); a.href = it[2];
        if (it[2].indexOf("#") < 0 && it[2] === path) a.setAttribute("aria-current", "page");
        li.appendChild(a); ul.appendChild(li);
      });
      if (sec[0] === "menu.policies") {      // cookie choice (Google Analytics) can be changed any time
        var cli = el("li"), cb = el("button", "fz-link", "", "menu.cookies", "Cookie settings"); cb.type = "button";
        cb.addEventListener("click", function () { closeMenu(); if (window.FZ_ANALYTICS) window.FZ_ANALYTICS.open(); });
        cli.appendChild(cb); ul.appendChild(cli);
      }
      s.appendChild(ul); body.appendChild(s);
    });
    var ls = el("section", "fz-sec"); ls.appendChild(el("h3", "", "", "common.language", "Language"));
    var lg = el("div", "fz-lang"); lg.setAttribute("role", "group"); lg.setAttribute("aria-label", "Language");
    [["en", "common.lang_en", "English"], ["hinglish", "common.lang_hinglish", "Hinglish"]].forEach(function (l) {
      var b = el("button", "", "", l[1], l[2]); b.type = "button"; b.setAttribute("data-lang", l[0]);
      b.addEventListener("click", function () { if (window.FZ_I18N) window.FZ_I18N.setLang(l[0]); syncLang(); });
      lg.appendChild(b);
    });
    ls.appendChild(lg); body.appendChild(ls);
    libSec = el("section", "fz-sec"); libSec.hidden = true; libSec.appendChild(el("h3", "", "", "menu.library", "Your library"));
    var libBtn = el("button", "fz-row"); libBtn.type = "button";
    libBtn.appendChild(el("span", "", "", "menu.all_photos", "All photos")); var c1 = el("span", "fz-chev"); c1.appendChild(svg("M9 6l6 6-6 6", 20)); libBtn.appendChild(c1);
    libBtn.addEventListener("click", function () { showView("lib"); });
    libSec.appendChild(libBtn); body.appendChild(libSec);
    mainView.appendChild(body);

    foot = el("div", "fz-foot"); foot.hidden = true;
    acctRow = el("button", "fz-row"); acctRow.type = "button"; acctRow.setAttribute("aria-expanded", "false");
    acctRow.appendChild(el("span", "", "", "menu.my_account", "My account")); var c2 = el("span", "fz-chev"); c2.appendChild(svg("M9 6l6 6-6 6", 20)); acctRow.appendChild(c2);
    acctBox = el("div"); acctBox.hidden = true;
    acctDel = el("button", "fz-danger", "", "menu.delete_account", "Delete my account"); acctDel.type = "button";
    acctBox.appendChild(acctDel);
    acctRow.addEventListener("click", function () { var open = acctBox.hidden; acctBox.hidden = !open; acctRow.setAttribute("aria-expanded", open ? "true" : "false"); });
    acctDel.addEventListener("click", deleteAccount);
    foot.appendChild(acctRow); foot.appendChild(acctBox); mainView.appendChild(foot);
    panel.appendChild(mainView);

    /* library view */
    libView = el("div", "fz-view"); libView.hidden = true;
    var lh = el("div", "fz-head");
    var back = el("button", "fz-iconbtn"); back.type = "button"; back.appendChild(svg("M15 6l-6 6 6 6", 20)); back.appendChild(el("span", "", "", "common.back", "Back"));
    back.addEventListener("click", function () { showView("main"); });
    var lt = el("h2", "", "", "menu.library", "Your library"); lh.appendChild(back); lh.appendChild(lt); libView.appendChild(lh);
    var lb = el("div", "fz-body"); libStatus = el("p", "fz-note"); libStatus.setAttribute("role", "status"); libGrid = el("ul", "fz-grid");
    lb.appendChild(libStatus); lb.appendChild(libGrid); libView.appendChild(lb);
    var lf = el("div", "fz-foot"); libDel = el("button", "fz-danger", "", "menu.delete_photos", "Delete all photos"); libDel.type = "button";
    libDel.addEventListener("click", deletePhotos); lf.appendChild(libDel); libView.appendChild(lf);
    panel.appendChild(libView);

    toast = el("p", "fz-toast"); toast.setAttribute("role", "status"); toast.setAttribute("aria-live", "polite"); panel.appendChild(toast);
    document.body.appendChild(overlay); document.body.appendChild(panel);

    burger.addEventListener("click", openMenu);
    closeBtn.addEventListener("click", closeMenu);
    overlay.addEventListener("click", closeMenu);
    panel.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("a.fz-link"); if (a) closeMenu(); });
    document.addEventListener("keydown", onKey);
    document.addEventListener("fz:lang", syncLang);
    syncLang();
  }

  function syncLang() {
    var cur = window.FZ_I18N ? window.FZ_I18N.lang : "en";
    var bs = panel.querySelectorAll(".fz-lang button");
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute("aria-pressed", bs[i].getAttribute("data-lang") === cur ? "true" : "false");
    if (window.FZ_I18N) window.FZ_I18N.apply(panel);
    burger.setAttribute("aria-label", T("common.open_menu", "Open menu"));
    closeBtn.setAttribute("aria-label", T("common.close_menu", "Close menu"));
  }
  function say(key, fb) { toast.textContent = key ? T(key, fb) : ""; }

  /* ---------- open / close ---------- */
  function visible(e) { return e.getClientRects().length > 0; }
  function focusables(root) { return Array.prototype.filter.call(root.querySelectorAll("a[href], button:not([disabled])"), visible); }
  function openMenu() {
    lastFocus = document.activeElement;
    var signed = hasSession(); libSec.hidden = !signed; foot.hidden = !signed;
    overlay.hidden = false; panel.hidden = false; document.documentElement.classList.add("fz-lock");
    burger.setAttribute("aria-expanded", "true"); say(""); showView("main"); closeBtn.focus();
    if (signed) getSb().catch(function () {});     // warm up, so the delete buttons answer fast
  }
  function closeMenu() {
    closeLightbox(); overlay.hidden = true; panel.hidden = true; document.documentElement.classList.remove("fz-lock");
    burger.setAttribute("aria-expanded", "false"); try { (lastFocus && lastFocus.focus ? lastFocus : burger).focus(); } catch (e) {}
  }
  function showView(v) {
    mainView.hidden = v !== "main"; libView.hidden = v !== "lib"; say("");
    if (v === "lib") loadPhotos();
    var f = focusables(v === "main" ? mainView : libView)[0]; if (f && !panel.hidden) f.focus();
  }
  function onKey(e) {
    if (panel.hidden) return;
    if (e.key === "Escape") { if (lightbox) closeLightbox(); else closeMenu(); return; }
    if (e.key !== "Tab") return;
    var list = focusables(lightbox || panel); if (!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- library ---------- */
  function openLightbox(url) {
    closeLightbox();
    lightbox = el("div", "fz-lightbox"); lightbox.setAttribute("role", "dialog"); lightbox.setAttribute("aria-modal", "true");
    var b = el("button", "fz-iconbtn"); b.type = "button"; b.appendChild(svg("M6 6l12 12M18 6L6 18")); b.setAttribute("aria-label", T("common.close", "Close"));
    var img = document.createElement("img"); img.src = url; img.alt = T("menu.photo_alt", "Your saved photo");
    lightbox.appendChild(b); lightbox.appendChild(img);
    b.addEventListener("click", closeLightbox); lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });
    document.body.appendChild(lightbox); b.focus();
  }
  function closeLightbox() { if (lightbox) { lightbox.remove(); lightbox = null; } }

  function loadPhotos() {
    libGrid.textContent = ""; libDel.hidden = true; libStatus.textContent = T("common.loading", "Loading...");
    getSb().then(function (sb) {
      return sb.from("photos").select("id, path, created_at").order("created_at", { ascending: false }).then(function (res) {
        if (res.error) throw res.error;
        var rows = res.data || [];
        if (!rows.length) { libStatus.textContent = T("menu.photos_empty", "No saved photos yet."); return; }
        libStatus.textContent = T("menu.photos_count", "Photos: {n}", { n: rows.length }); libDel.hidden = false;
        return sb.storage.from("photos").createSignedUrls(rows.map(function (r) { return r.path; }), 600).then(function (s) {
          var urls = {}; ((s && s.data) || []).forEach(function (x) { if (x.path) urls[x.path] = x.signedUrl; });
          rows.forEach(function (row) {
            var li = el("li"), b = el("button", "fz-thumb"); b.type = "button";
            var img = document.createElement("img"); img.alt = T("menu.photo_alt", "Your saved photo"); img.loading = "lazy"; if (urls[row.path]) img.src = urls[row.path];
            b.appendChild(img); b.addEventListener("click", function () { if (urls[row.path]) openLightbox(urls[row.path]); });
            li.appendChild(b); libGrid.appendChild(li);
          });
        });
      });
    }).catch(function () { libStatus.textContent = T("menu.photos_failed", "Could not load your photos."); });
  }

  /* ---------- the two delete buttons: one tap, no confirmation ---------- */
  function deletePhotos() {
    if (busy) return; busy = true; libDel.disabled = true; say("menu.deleting", "Deleting...");
    getSb().then(function (sb) {
      return sb.auth.getSession().then(function (r) {
        var uid = r.data && r.data.session && r.data.session.user.id; if (!uid) throw new Error("login");
        return sb.from("photos").select("id, path").then(function (res) {
          if (res.error) throw res.error;
          var paths = (res.data || []).map(function (x) { return x.path; });
          if (!paths.length) return;
          return sb.storage.from("photos").remove(paths).then(function (r1) {
            if (r1.error) throw r1.error;
            return sb.from("photos").delete().eq("user_id", uid).then(function (r2) { if (r2.error) throw r2.error; });
          });
        });
      });
    }).then(function () {
      libGrid.textContent = ""; libDel.hidden = true; libStatus.textContent = T("menu.photos_empty", "No saved photos yet."); say("menu.photos_deleted", "Your photos were deleted.");
    }).catch(function () { say("menu.delete_failed", "Could not delete. Please try again."); })
      .then(function () { busy = false; libDel.disabled = false; });
  }

  function deleteAccount() {
    if (busy) return; busy = true; acctDel.disabled = true; say("menu.deleting", "Deleting...");
    getSb().then(function (sb) {
      return sb.auth.getSession().then(function (r) {
        var tok = r.data && r.data.session && r.data.session.access_token; if (!tok) throw new Error("login");
        return fetch("/api/delete-account", { method: "POST", headers: { Authorization: "Bearer " + tok } }).then(function (resp) {
          if (!resp.ok) throw new Error("delete " + resp.status);
          return sb.auth.signOut().catch(function () {});
        });
      });
    }).then(function () {
      say("menu.account_deleted", "Your account was deleted.");
      setTimeout(function () { window.location.href = "/?account_deleted=1"; }, 1200);
    }).catch(function () { busy = false; acctDel.disabled = false; say("menu.delete_failed", "Could not delete. Please try again."); });
  }

  /* ---------- start: css first, then texts, then build ---------- */
  function start() {
    if (!document.querySelector('script[src="/analytics.js"]')) loadScript("/analytics.js");      // cookie notice + Google Analytics (only after Accept)
    var link = document.createElement("link"); link.rel = "stylesheet"; link.href = "/menu.css"; var done = false;
    function go() {
      if (done) return; done = true;
      if (window.FZ_I18N) build(); else loadScript("/translations.js", build, build);
    }
    link.onload = go; link.onerror = go; document.head.appendChild(link); setTimeout(go, 2500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
