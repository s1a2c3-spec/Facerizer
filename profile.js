/* Facerizer grooming profile page (Phase 6A).
 * Saves the answers in the grooming_profile table (needs sql/14 and sql/15). The safety answers (allergy, pregnancy / doctor's treatment,
 * sensitive skin) switch the skincare routine to basic steps only: see skincare.js. Nothing here reads or writes photos. */
(function () {
  "use strict";
  var cfg = window.FACERIZER || {};
  function $(id) { return document.getElementById(id); }
  function T(k, v) { return window.FZ_I18N ? window.FZ_I18N.t(k, v) : k; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function state(t, err) { var s = $("state"); s.hidden = false; s.textContent = t; s.style.color = err ? "#b3261e" : ""; }

  var GOALS = ["clearer_skin", "even_tone", "oil_control", "hydration", "beard_care", "hair_style", "brows", "general_grooming"];
  var PRODUCTS = ["cleanser", "moisturiser", "sunscreen", "serum", "trimmer", "comb_brush", "styling_product"];
  var MINUTES = [5, 10, 15, 20];
  var BUDGETS = ["low", "medium", "flexible"];
  var SKINS = ["normal", "dry", "oily", "combination"];
  var COLS = "skin_type, sensitive_skin, routine_in_plan, goals, products_have, daily_minutes, budget, has_allergy, allergy_note, medical_caution, profile_done_at";

  var ready = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_URL.indexOf("YOUR_") === -1 && window.supabase;
  if (!ready) return state("Setup is not finished: add your Supabase details in config.js.", true);
  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  var userId = null, draft = null, msg = null, savedOnce = false;
  var fromId = (new URLSearchParams(location.search).get("from") || "");
  if (!/^[0-9a-f-]{36}$/i.test(fromId)) fromId = "";

  function fromRow(r) {
    r = r || {};
    return {
      skin_type: SKINS.indexOf(r.skin_type) >= 0 ? r.skin_type : null, sensitive_skin: !!r.sensitive_skin,
      goals: (r.goals || []).filter(function (x) { return GOALS.indexOf(x) >= 0; }),
      products_have: (r.products_have || []).filter(function (x) { return PRODUCTS.indexOf(x) >= 0; }),
      daily_minutes: MINUTES.indexOf(r.daily_minutes) >= 0 ? r.daily_minutes : null,
      budget: BUDGETS.indexOf(r.budget) >= 0 ? r.budget : null,
      has_allergy: !!r.has_allergy, allergy_note: r.allergy_note || "", medical_caution: !!r.medical_caution
    };
  }

  // ---------- small form parts ----------
  function fieldset(legend, help) {
    var f = el("fieldset", "pf-set"); f.appendChild(el("legend", "", legend));
    if (help) f.appendChild(el("p", "pf-help", help));
    return f;
  }
  function chip(label, on, onClick) {
    var b = el("button", "fzr-chip" + (on ? " on" : ""), label); b.type = "button"; b.setAttribute("aria-pressed", on ? "true" : "false");
    b.addEventListener("click", function () { var now = onClick(); b.setAttribute("aria-pressed", now ? "true" : "false"); b.className = "fzr-chip" + (now ? " on" : ""); });
    return b;
  }
  function multi(list, items, labelKey) {
    var g = el("div", "fzr-chs"); g.setAttribute("role", "group");
    items.forEach(function (id) {
      g.appendChild(chip(T(labelKey + id), list.indexOf(id) >= 0, function () {
        var i = list.indexOf(id); if (i >= 0) list.splice(i, 1); else list.push(id); return i < 0;
      }));
    });
    return g;
  }
  function single(get, set, items, labelFn, allowNone) {
    var g = el("div", "fzr-chs"); g.setAttribute("role", "group"); var nodes = [];
    function paint() { nodes.forEach(function (n) { var on = n.v === get(); n.b.setAttribute("aria-pressed", on ? "true" : "false"); n.b.className = "fzr-chip" + (on ? " on" : ""); }); }
    items.concat(allowNone ? [null] : []).forEach(function (v) {
      var b = el("button", "fzr-chip", v === null ? allowNone : labelFn(v)); b.type = "button";
      b.addEventListener("click", function () { set(get() === v && v !== null ? null : v); paint(); });
      nodes.push({ v: v, b: b }); g.appendChild(b);
    });
    paint(); return g;
  }
  function switchRow(id, label, help, get, set) {
    var row = el("div", "fzr-swrow"), on = get();
    var sb2 = el("button", "fzr-sw" + (on ? " on" : "")); sb2.type = "button"; sb2.id = id; sb2.setAttribute("role", "switch"); sb2.setAttribute("aria-checked", on ? "true" : "false"); sb2.setAttribute("aria-labelledby", id + "-l");
    sb2.appendChild(el("span", "fzr-knob"));
    var lab = el("span", "fzr-swl"); lab.id = id + "-l"; lab.appendChild(el("b", "", label)); if (help) lab.appendChild(el("span", "", help));
    sb2.addEventListener("click", function () { var now = !get(); set(now); sb2.setAttribute("aria-checked", now ? "true" : "false"); sb2.className = "fzr-sw" + (now ? " on" : ""); });
    row.appendChild(sb2); row.appendChild(lab); return row;
  }

  // ---------- the form ----------
  function build() {
    var box = $("pf-form"); box.textContent = "";
    $("pf-title").textContent = T("prof.title"); $("pf-sub").textContent = T("prof.sub"); $("pf-fine").textContent = T("prof.fine");

    var g = fieldset(T("prof.goals_h"), T("prof.goals_help")); g.appendChild(multi(draft.goals, GOALS, "prof.g.")); box.appendChild(g);

    var sk = fieldset(T("prof.skin_h"), T("prof.skin_help"));
    sk.appendChild(single(function () { return draft.skin_type; }, function (v) { draft.skin_type = v; }, SKINS, function (v) { return T("skin." + v); }, T("prof.skin_ai")));
    sk.appendChild(switchRow("pf-sens", T("recs.st.sens"), T("recs.st.sens_help"), function () { return draft.sensitive_skin; }, function (v) { draft.sensitive_skin = v; paintBasic(); }));
    box.appendChild(sk);

    var pr = fieldset(T("prof.products_h"), T("prof.products_help")); pr.appendChild(multi(draft.products_have, PRODUCTS, "prof.p.")); box.appendChild(pr);

    var tm = fieldset(T("prof.time_h")); tm.appendChild(single(function () { return draft.daily_minutes; }, function (v) { draft.daily_minutes = v; }, MINUTES, function (v) { return T("prof.min", { n: v }); })); box.appendChild(tm);
    var bg = fieldset(T("prof.budget_h")); bg.appendChild(single(function () { return draft.budget; }, function (v) { draft.budget = v; }, BUDGETS, function (v) { return T("prof.b." + v); })); box.appendChild(bg);

    var sf = fieldset(T("prof.safety_h"), T("prof.safety_help"));
    var pn = el("p", "pf-help", T("prof.privacy_note") + " "); var pa = el("a", "pf-privlink", T("prof.privacy_link")); pa.href = "/privacy#grooming-profile"; pn.appendChild(pa); sf.appendChild(pn);
    var noteWrap = el("div", "pf-note"); noteWrap.hidden = !draft.has_allergy;
    var nl = el("label", "", T("prof.allergy_note")); nl.setAttribute("for", "pf-allergy-note");
    var ta = el("textarea"); ta.id = "pf-allergy-note"; ta.maxLength = 200; ta.value = draft.allergy_note; ta.setAttribute("aria-describedby", "pf-allergy-hint");
    ta.addEventListener("input", function () { draft.allergy_note = ta.value; });
    noteWrap.appendChild(nl); noteWrap.appendChild(ta); var hint = el("p", "pf-help", T("prof.allergy_hint")); hint.id = "pf-allergy-hint"; noteWrap.appendChild(hint);
    sf.appendChild(switchRow("pf-allergy", T("prof.allergy"), "", function () { return draft.has_allergy; }, function (v) { draft.has_allergy = v; noteWrap.hidden = !v; paintBasic(); }));
    sf.appendChild(noteWrap);
    sf.appendChild(switchRow("pf-caution", T("prof.caution"), T("prof.caution_help"), function () { return draft.medical_caution; }, function (v) { draft.medical_caution = v; paintBasic(); }));
    var basic = el("p", "pf-basic", T("prof.basic_note")); basic.id = "pf-basic"; basic.hidden = true; sf.appendChild(basic);
    box.appendChild(sf);

    var wrap = el("div");
    var save = el("button", "btn btn-primary pf-save", T("prof.save")); save.type = "button"; save.id = "pf-save";
    save.addEventListener("click", function () { doSave(save); });
    wrap.appendChild(save);
    var m = el("p", "pf-msg", msg ? msg.text : ""); m.id = "pf-msg"; m.setAttribute("role", "status"); m.setAttribute("aria-live", "polite"); if (msg && !msg.ok) m.className += " err"; wrap.appendChild(m);
    var after = el("div", "pf-after"); after.id = "pf-after"; after.hidden = !(savedOnce && msg && msg.ok);
    if (fromId) { var a1 = el("a", "btn btn-primary", T("prof.back")); a1.href = "/report?id=" + encodeURIComponent(fromId); after.appendChild(a1); }
    var a2 = el("a", "btn btn-outline", T("prof.open_plan")); a2.href = "/plan"; after.appendChild(a2);
    wrap.appendChild(after); box.appendChild(wrap);
    paintBasic();
  }
  function paintBasic() { var b = $("pf-basic"); if (b) b.hidden = !(draft.sensitive_skin || draft.has_allergy || draft.medical_caution); }

  function doSave(btn) {
    btn.disabled = true; btn.textContent = T("prof.saving");
    var note = draft.has_allergy ? (draft.allergy_note || "").trim().slice(0, 200) : "";
    var now = new Date().toISOString();
    var row = {
      user_id: userId, skin_type: draft.skin_type, sensitive_skin: !!draft.sensitive_skin,
      goals: draft.goals.slice(), products_have: draft.products_have.slice(), daily_minutes: draft.daily_minutes, budget: draft.budget,
      has_allergy: !!draft.has_allergy, allergy_note: note || null, medical_caution: !!draft.medical_caution,
      profile_done_at: now, updated_at: now
    };
    sb.from("grooming_profile").upsert(row, { onConflict: "user_id" }).then(function (res) {
      var ok = !(res && res.error); if (!ok) console.error(res.error); else { try { (window.fzTrack || function (n, p) { (window.fzQ = window.fzQ || []).push([n, p]); })("profile_saved"); } catch (e) {} }
      savedOnce = savedOnce || ok; msg = { ok: ok, text: T(ok ? "prof.saved" : "prof.save_err") };
      build(); var b = $("pf-save"); if (b) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }
    }, function (e) { console.error(e); msg = { ok: false, text: T("prof.save_err") }; build(); });
  }

  // ---------- start ----------
  sb.auth.getSession().then(function (s) {
    var session = s && s.data && s.data.session;
    if (!session) { window.location.href = "/login"; return null; }
    userId = session.user.id;
    return sb.from("grooming_profile").select(COLS).eq("user_id", userId).maybeSingle();
  }).then(function (res) {
    if (!res) return;
    if (res.error) { console.warn(res.error); return state(T("prof.not_ready"), true); }
    draft = fromRow(res.data); $("state").hidden = true; $("pf").hidden = false; build();
    document.addEventListener("fz:lang", function () { build(); });
  }, function (e) { console.error(e); state(T("prof.not_ready"), true); });
})();
