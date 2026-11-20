/* Facerizer analytics (Google Analytics 4) with an Accept / Decline cookie notice.
   - Loaded by menu.js on every page except /checkout (payment page: no analytics there).
   - NOTHING is sent to Google, and Google's script is not even downloaded, until the person presses Accept.
   - Page views, and a short fixed list of actions (see EVENTS below: for example "started an analysis", "chose a plan"), are sent.
     Addresses are cleaned first: everything after "?" or "#" is removed (so /report?id=... becomes /report), EXCEPT the standard campaign
     tags utm_source, utm_medium, utm_campaign, utm_content and utm_term (letters, digits and a few symbols only, 100 characters at most),
     which show which link brought a person here. The "came from" address is always cut at "?". Events carry no free text:
     only the whitelisted names and short values below. No photo, score, email, login data, skin type or health answer is ever sent.
   - Advertising features are off. The choice is kept in localStorage "fz_consent" ("granted" or "denied"). "Cookie settings" in the menu reopens it.
   Measurement ID below is public (it is visible in every page that uses Google Analytics). */
(function () {
  "use strict";
  var ID = "G-CCT676F9DS", KEY = "fz_consent";
  if (window.FZ_ANALYTICS) return;

  function get() { try { return window.localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { window.localStorage.setItem(KEY, v); } catch (e) {} }
  function T(k, fb) { var s = window.FZ_I18N ? window.FZ_I18N.t(k) : k; return s === k ? fb : s; }
  var UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  function bare(u) { try { var a = new URL(u, window.location.href); return a.origin + a.pathname; } catch (e) { return ""; } }
  // the page address we send: no "?..." or "#...", except the campaign tags, and only when their value is plain (no @, no slashes)
  function clean(u) {
    try {
      var a = new URL(u, window.location.href), keep = [];
      UTM.forEach(function (k) {
        var v = a.searchParams.get(k); if (!v) return;
        v = v.trim().slice(0, 100); if (v && /^[A-Za-z0-9_\-. +:]+$/.test(v)) keep.push(k + "=" + encodeURIComponent(v));
      });
      return a.origin + a.pathname + (keep.length ? "?" + keep.join("&") : "");
    } catch (e) { return ""; }
  }

  /* ---------- Google Analytics ---------- */
  function start() {
    if (window.__fzGA) return; window.__fzGA = true;
    window["ga-disable-" + ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    var here = clean(window.location.href), ref = document.referrer ? bare(document.referrer) : "";
    window.gtag("js", new Date());
    window.gtag("config", ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, transport_type: "beacon", page_location: here, page_referrer: ref });
    window.gtag("event", "page_view", { page_title: document.title, page_location: here, page_path: new URL(here).pathname, page_referrer: ref });
    listen();
    var s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + ID; document.head.appendChild(s);
  }
  function stop() {
    window["ga-disable-" + ID] = true;
    try {   // remove Google Analytics cookies (_ga, _ga_XXXX)
      var host = window.location.hostname.split("."), doms = [window.location.hostname];
      for (var i = 1; i < host.length - 1; i++) doms.push("." + host.slice(i).join("."));
      document.cookie.split(";").forEach(function (c) {
        var n = c.split("=")[0].trim(); if (n !== "_ga" && n.indexOf("_ga_") !== 0 && n !== "_gid") return;
        doms.forEach(function (d) { document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=" + d; });
        document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      });
    } catch (e) {}
  }

  /* ---------- actions ---------- */
  // Every event and the only parameters it may carry. Anything else is dropped. Values: short plain words or whole numbers.
  var EVENTS = {
    cta_analyze: ["page"], signup_click: ["page"], select_plan: ["plan", "period"], profile_cta_click: [],
    analysis_start: [], analysis_complete: [], analysis_error: [], limit_hit: ["reason"],
    auth_start: ["method"], sign_up: ["method"], login: ["method"],
    report_view: ["plan"], recs_open: ["section"], card_download: [], pdf_download: ["kind"],
    profile_saved: [], plan_start: [], plan_day_complete: ["day"], plan_continue: [], checkin_saved: [], plan_report_open: ["report"]
  };
  function safeVal(v) {
    if (typeof v === "number") return isFinite(v) && v >= 0 && v <= 999 ? Math.round(v) : undefined;
    if (typeof v === "string" && v.length <= 30 && /^[A-Za-z0-9_\-]+$/.test(v)) return v;
    return undefined;
  }
  function track(name, params) {
    try {
      var allowed = EVENTS[name]; if (!allowed) return;
      if (!window.__fzGA || window["ga-disable-" + ID] || typeof window.gtag !== "function") return; // nothing unless the person pressed Accept
      var out = {}; allowed.forEach(function (k) { var v = params ? safeVal(params[k]) : undefined; if (v !== undefined) out[k] = v; });
      window.gtag("event", name, out);
    } catch (e) {}
  }
  window.fzTrack = track;
  // actions reported before this file loaded (see menu.js): send them only if Accept was already pressed, otherwise forget them
  function drain() {
    var q = window.fzQ; window.fzQ = null; if (!q || !q.length) return;
    if (get() !== "granted") return;
    q.forEach(function (e) { track(e[0], e[1]); });
  }

  // Clicks on links are noticed here, so the pages need no changes: analysis links, sign-up links, plan buttons, profile button
  function listen() {
    if (window.__fzGAListen) return; window.__fzGAListen = true;
    document.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a[href]") : null; if (!a) return;
      var href = a.getAttribute("href") || "", page = window.location.pathname.replace(/[^A-Za-z0-9_\-]/g, "").slice(0, 30) || "home";
      if (/^\/checkout(\?|$)/.test(href)) {
        var m = /[?&]plan=(pro|premium)\b/.exec(href), per = /[?&](?:period|billing)=(month|year)\b/.exec(href);
        track("select_plan", { plan: m ? m[1] : "", period: per ? per[1] : "" });
      } else if (/^\/analyze(\/|\?|#|$)/.test(href)) track("cta_analyze", { page: page });
      else if (/^\/signup(\?|#|$)/.test(href)) track("signup_click", { page: page });
      else if (/^\/profile(\?|#|$)/.test(href)) track("profile_cta_click");
    }, true);
  }

  /* ---------- the notice ---------- */
  var box = null;
  var CSS = ".fz-ck{position:fixed;left:0;right:0;bottom:0;z-index:85;max-height:60vh;overflow-y:auto;box-sizing:border-box;padding:.9rem 1rem calc(.9rem + env(safe-area-inset-bottom));background:var(--card,#fff);color:var(--fg,#112a33);border-top:1px solid var(--border,#d9e1e4);box-shadow:0 -6px 24px rgba(0,0,0,.14);font:400 .9375rem/1.5 var(--sans,system-ui,sans-serif)}" +
    ".fz-ck *{box-sizing:border-box}.fz-ck-in{max-width:60rem;margin:0 auto;display:flex;flex-wrap:wrap;gap:.75rem 1.25rem;align-items:center}.fz-ck p{margin:0;flex:1 1 20rem;min-width:0}.fz-ck a{color:var(--primary,#1f7a6f);overflow-wrap:anywhere}" +
    ".fz-ck-btns{display:flex;flex:0 0 auto;gap:.6rem;flex-wrap:wrap;width:100%}@media(min-width:40rem){.fz-ck-btns{width:auto}}" +
    ".fz-ck button{flex:1 1 8rem;min-height:3rem;padding:.5rem 1.25rem;border-radius:999px;border:1px solid var(--primary,#1f7a6f);background:transparent;color:var(--primary,#1f7a6f);font:600 1rem/1.2 var(--sans,system-ui,sans-serif);cursor:pointer}" +
    ".fz-ck button.fz-ck-yes{background:var(--primary,#1f7a6f);color:var(--on-primary,#fff)}";
  function pad() { var h = box ? box.offsetHeight : 0; document.documentElement.style.setProperty("--fz-ck-h", h + "px"); document.body.style.paddingBottom = h ? h + "px" : ""; }
  function build() {
    if (box) { box.remove(); box = null; }
    if (!document.getElementById("fz-ck-css")) { var st = document.createElement("style"); st.id = "fz-ck-css"; st.textContent = CSS; document.head.appendChild(st); }
    box = document.createElement("div"); box.className = "fz-ck"; box.setAttribute("role", "region"); box.setAttribute("aria-label", T("analytics.title", "Cookies"));
    var inn = document.createElement("div"); inn.className = "fz-ck-in";
    var p = document.createElement("p"); p.appendChild(document.createTextNode(T("analytics.text", "We use Google Analytics cookies to count visits and see which pages help people. Nothing about your photo, scores or email is sent. You can change this any time from the menu.") + " "));
    var a = document.createElement("a"); a.href = "/privacy"; a.textContent = T("menu.privacy", "Privacy Policy"); p.appendChild(a);
    var bt = document.createElement("div"); bt.className = "fz-ck-btns";
    var no = document.createElement("button"); no.type = "button"; no.textContent = T("analytics.decline", "Decline");
    var yes = document.createElement("button"); yes.type = "button"; yes.className = "fz-ck-yes"; yes.textContent = T("analytics.accept", "Accept");
    no.addEventListener("click", function () { choose("denied"); }); yes.addEventListener("click", function () { choose("granted"); });
    bt.appendChild(no); bt.appendChild(yes); inn.appendChild(p); inn.appendChild(bt); box.appendChild(inn); document.body.appendChild(box); pad();
  }
  function close() { if (box) { box.remove(); box = null; } pad(); }
  function choose(v) { set(v); close(); if (v === "granted") start(); else stop(); }
  function open() { build(); }

  window.FZ_ANALYTICS = { open: open, state: get, id: ID };
  window.addEventListener("resize", function () { if (box) pad(); });
  document.addEventListener("fz:lang", function () { if (box) build(); });

  // the notice waits for translations.js (English / Hinglish); Google Analytics itself does not wait
  function withI18n(cb) {
    if (window.FZ_I18N) return cb();
    if (!document.querySelector('script[src="/translations.js"]')) { var t = document.createElement("script"); t.src = "/translations.js"; t.onload = cb; t.onerror = cb; document.head.appendChild(t); return; }
    var n = 0, iv = setInterval(function () { if (window.FZ_I18N || ++n > 30) { clearInterval(iv); cb(); } }, 100);
  }
  function init() { var c = get(); if (c === "granted") start(); else if (c !== "denied") withI18n(build); drain(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
