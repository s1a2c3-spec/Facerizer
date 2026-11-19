/* Facerizer "Your recommendations" (Phase 5A): Hairstyles, Glasses, Grooming tips, Feature by feature.
 * Four buttons plus a fifth for skin type (Phase 5A).
 * Used by report.js and sample.js:   FZRecs.render(rootElement, result, options)
 * options: profile (object from the grooming_profile table, or null when it is not available), saveProfile(patch) -> Promise<boolean>,
 *          analysisId (string), isFree (bool), feedback(type, name) -> node|null, hairArt(h) -> svg string|null,
 *          onBarber() -> download the barber card, planHref (string|null), proHref (string), cardId (element id)
 * All text from the AI is added with textContent. Labels come from translations.js (English / Hinglish).
 * Older reports (without the new fields) still work: the new lines simply do not show. */
(function () {
  "use strict";

  function T(k, v) { return window.FZ_I18N ? window.FZ_I18N.t(k, v) : k; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function val(v) { var k = "recs.v." + v, s = T(k); return s === k ? String(v) : s; }
  function icon(path, cls) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    if (cls) s.setAttribute("class", cls);
    path.split("|").forEach(function (d) { var p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", d); s.appendChild(p); });
    return s;
  }
  var P = {
    hair: "M6.5 5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z|M6.5 14a2.5 2.5 0 100 5 2.5 2.5 0 000-5z|M8.5 8.5L20 19|M8.5 15.5L20 5",
    glasses: "M6.5 10.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z|M17.5 10.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z|M10 14h4|M3 12l1-5|M21 12l-1-5",
    groom: "M5 4h14v6a7 7 0 01-14 0z|M9 14c1 1.2 2 1.5 3 1.5s2-.3 3-1.5",
    feat: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
    routine: "M12 3v4|M5.6 5.6l2.8 2.8|M3 12h4|M17 12h4|M15.6 8.4l2.8-2.8|M12 11a4 4 0 014 4v6H8v-6a4 4 0 014-4z",
    skin: "M12 3c3 4 6 7 6 10a6 6 0 01-12 0c0-3 3-6 6-10z",
    chev: "M6 9l6 6 6-6"
  };

  var ctx = null, nodes = {}, listening = false;

  // ---------- saved choices (grooming_profile table) ----------
  function canSave(o) { return !!(o.saveProfile && o.profile); }
  function redraw(focusId) {
    draw();
    if (focusId) { var n = document.getElementById(focusId); if (n) { try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); } } }
  }
  function save(sec, patch, focusId, okKey) {
    ctx.msg = null;
    return Promise.resolve().then(function () { return ctx.o.saveProfile(patch); }).then(function (ok) {
      ctx.msg = { sec: sec, ok: !!ok, text: ok ? T(okKey || "recs.saved") : T("recs.save_err") }; redraw(focusId);
    }, function () { ctx.msg = { sec: sec, ok: false, text: T("recs.save_err") }; redraw(focusId); });
  }
  function msgNode(sec) {
    var m = el("p", "fzr-msg", ctx.msg && ctx.msg.sec === sec ? ctx.msg.text : ""); m.setAttribute("role", "status"); m.setAttribute("aria-live", "polite");
    if (ctx.msg && ctx.msg.sec === sec && !ctx.msg.ok) m.className += " err";
    return m;
  }
  function flagsOf(o) { var pr = o.profile; return pr ? { allergy: !!pr.has_allergy, caution: !!pr.medical_caution } : {}; }
  function effType(r, o) {
    var pr = o.profile;
    if (pr && SKIN_TYPES.indexOf(pr.skin_type) >= 0) return pr.skin_type;
    return r.card && r.card.skin ? r.card.skin.type : "unclear";
  }

  function lockBox(text, href) {
    var d = el("div", "fzr-lock");
    d.appendChild(document.createTextNode(text));
    if (href) { d.appendChild(document.createElement("br")); var a = el("a", "", T("recs.unlock")); a.href = href; d.appendChild(a); }
    return d;
  }
  function chips(list) {
    var w = el("div", "fzr-chips"), n = 0;
    list.forEach(function (t) { if (t) { w.appendChild(el("span", "", t)); n++; } });
    return n ? w : null;
  }
  function why(text, plain) {
    if (!text) return null;
    var d = el("div", "fzr-why");
    if (plain) d.appendChild(document.createTextNode(text));
    else { d.appendChild(el("b", "", T("recs.why"))); d.appendChild(document.createTextNode(" " + text)); }
    return d;
  }
  function examples(q) {
    var a = el("a", "fzr-link", T("recs.examples"));
    a.href = "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(q); a.target = "_blank"; a.rel = "noopener";
    return a;
  }

  // ---------- the four panels ----------
  function hairPanel(r, o) {
    var p = el("div"), list = r.hairstyles || [];
    var w = why(r.recs_why && r.recs_why.hairstyles); if (w) p.appendChild(w);
    var vh = r.visible_hair;
    if (vh && o.feedback) {
      var bits = [];
      if (vh.type && vh.type !== "unclear") bits.push(vh.type);
      if (vh.length && vh.length !== "unclear") bits.push(vh.length + " length");
      if (vh.density && vh.density !== "unclear") bits.push(vh.density);
      if (bits.length) p.appendChild(el("p", "fzr-based", T("recs.based", { desc: bits.join(", ") })));
    }
    var pick = !o.isFree && !!o.onBarber && canSave(o) && !!o.analysisId;
    var picks = pick ? ((o.profile.barber_picks || {})[o.analysisId] || []) : [];
    if (pick) p.appendChild(el("p", "fzr-based", T("recs.b_hint")));
    var ul = el("ul", "fzr-list");
    list.forEach(function (h, hi) {
      var li = el("li", "fzr-it");
      var art = o.hairArt ? o.hairArt(h) : null;
      if (art) { var a = el("span", "fzr-art"); a.setAttribute("aria-hidden", "true"); a.innerHTML = art; li.appendChild(a); } // art is our own static SVG from hair.js
      var b = el("div", "fzr-body");
      if (h.category) b.appendChild(el("span", "fzr-ct", h.category));
      b.appendChild(el("b", "", h.name));
      if (h.why) b.appendChild(el("p", "", h.why));
      if (h.ask_barber) { var q = el("p", "fzr-q"); q.appendChild(el("i", "", T("recs.ask"))); q.appendChild(document.createTextNode(" " + h.ask_barber)); b.appendChild(q); }
      if (h.avoid) { var s = el("p"); s.appendChild(el("i", "", T("recs.skip"))); s.appendChild(document.createTextNode(" " + h.avoid)); b.appendChild(s); }
      var c = chips([h.maintenance ? T("recs.upkeep", { v: val(h.maintenance) }) : "", h.styling ? T("recs.styling", { v: val(h.styling) }) : "", h.length ? T("recs.length", { v: val(h.length) }) : ""]);
      if (c) b.appendChild(c);
      b.appendChild(examples(h.name + " hairstyle"));
      var fb = o.feedback ? o.feedback("hairstyle", h.name) : null; if (fb) b.appendChild(fb);
      if (pick) b.appendChild(pickBtn(h.name, hi, picks, o));
      li.appendChild(b); ul.appendChild(li);
    });
    p.appendChild(ul);
    if (pick) p.appendChild(msgNode("hair"));
    if (o.isFree) p.appendChild(lockBox(T("recs.lock_hair"), o.proHref));
    // one useful action: take the pick to the barber
    if (o.onBarber) {
      if (o.isFree) p.appendChild(lockBox(T("recs.barber_lock"), o.proHref));
      else { var row = el("div", "fzr-act"), bt = el("button", "btn btn-primary", T("recs.barber")); bt.type = "button"; bt.addEventListener("click", o.onBarber); row.appendChild(bt); p.appendChild(row); }
    }
    p.appendChild(nextRow(T("recs.next_glasses"), T("recs.go_glasses"), "glasses"));
    return p;
  }

  function pickBtn(name, i, picks, o) {
    var on = picks.indexOf(name) >= 0, id = "fzr-c-pick-" + i;
    var b = el("button", "btn " + (on ? "btn-primary" : "btn-outline") + " fzr-pick", on ? T("recs.b_added") : T("recs.b_add")); b.type = "button"; b.id = id;
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.addEventListener("click", function () {
      var next = on ? picks.filter(function (x) { return x !== name; }) : picks.concat([name]);
      var map = {}; var old = o.profile.barber_picks || {}; Object.keys(old).forEach(function (k) { map[k] = old[k]; });
      map[o.analysisId] = next;
      save("hair", { barber_picks: map }, id);
    });
    return b;
  }

  function glassesPanel(r, o) {
    var p = el("div"), list = r.glasses || [];
    var w = why(r.recs_why && r.recs_why.glasses); if (w) p.appendChild(w);
    var ul = el("ul", "fzr-list");
    list.forEach(function (g) {
      var li = el("li", "fzr-it"), ic = el("span", "fzr-ico"); ic.appendChild(icon(P.glasses)); li.appendChild(ic);
      var b = el("div", "fzr-body");
      b.appendChild(el("span", "fzr-ct", g.tier === "try" ? T("recs.try") : T("recs.best")));
      b.appendChild(el("b", "", g.shape + " frames"));
      if (g.why) b.appendChild(el("p", "", g.why));
      if (g.size_colour) { var s = el("p"); s.appendChild(el("i", "", T("recs.size"))); s.appendChild(document.createTextNode(" " + g.size_colour)); b.appendChild(s); }
      b.appendChild(examples(g.shape + " glasses frames"));
      var fb = o.feedback ? o.feedback("glasses", g.shape) : null; if (fb) b.appendChild(fb);
      li.appendChild(b); ul.appendChild(li);
    });
    p.appendChild(ul);
    if (o.isFree) p.appendChild(lockBox(T("recs.lock_glasses"), o.proHref));
    p.appendChild(el("h3", "fzr-sub", T("recs.tryon.h")));
    var ck = el("ul", "fzr-ck"); ["1", "2", "3"].forEach(function (n) { ck.appendChild(el("li", "", T("recs.tryon." + n))); }); p.appendChild(ck);
    p.appendChild(nextRow(T("recs.next_groom"), T("recs.go_groom"), "groom"));
    return p;
  }

  function groomPanel(r, o) {
    var p = el("div"), list = r.grooming || [];
    var w = why(r.recs_why && r.recs_why.grooming); if (w) p.appendChild(w);
    var ul = el("ul", "fzr-list");
    list.forEach(function (g) {
      var li = el("li", "fzr-it"), b = el("div", "fzr-body");
      if (g.area) b.appendChild(el("span", "fzr-ct", T("recs.area." + g.area)));
      b.appendChild(el("b", "", g.title));
      if (g.text) b.appendChild(el("p", "", g.text));
      if (g.steps && g.steps.length) { var ol = el("ol", "fzr-ol"); g.steps.forEach(function (x) { ol.appendChild(el("li", "", x)); }); b.appendChild(ol); }
      var c = chips([g.how_often, g.time, g.tool]); if (c) b.appendChild(c);
      li.appendChild(b); ul.appendChild(li);
    });
    p.appendChild(ul);
    if (o.isFree) p.appendChild(lockBox(T("recs.lock_groom"), o.proHref));
    p.appendChild(nextRow(T("recs.next_feat"), T("recs.go_feat"), "feat"));
    return p;
  }

  var FEATS = ["eyes", "eyebrows", "nose", "lips", "jawline", "chin", "cheekbones", "skin_appearance"];
  function featPanel(r, o) {
    var p = el("div");
    if (!r.features) { p.appendChild(lockBox(T("recs.lock_feat"), o.proHref)); return p; }
    var w = why(r.recs_why && r.recs_why.features, true); if (w) p.appendChild(w);
    var grid = el("div", "fzr-grid");
    FEATS.forEach(function (k) {
      var f = r.features[k]; if (!f) return;
      var c = el("div", "fzr-fc"), h = el("h3", "", T("recs.f." + k));
      if (f.tag === "strength") h.appendChild(el("span", "fzr-tag", T("recs.strength")));
      else if (f.tag === "refine") h.appendChild(el("span", "fzr-tag refine", T("recs.refine")));
      c.appendChild(h);
      if (f.observation) c.appendChild(el("p", "", f.observation));
      if (f.suggestion) { var t = el("p"); t.appendChild(el("i", "", T("recs.tip"))); t.appendChild(document.createTextNode(" " + f.suggestion)); c.appendChild(t); }
      if (f.confidence) c.appendChild(chips([T("recs.conf", { v: val(f.confidence) })]));
      grid.appendChild(c);
    });
    p.appendChild(grid);
    p.appendChild(el("p", "fzr-based", T("recs.feat_note")));
    if (o.cardId) {
      var row = el("div", "fzr-act"), bt = el("button", "btn btn-outline", T("recs.see_card")); bt.type = "button";
      bt.addEventListener("click", function () { var c = document.getElementById(o.cardId); if (c) c.scrollIntoView({ block: "start", behavior: smooth() }); });
      row.appendChild(bt); p.appendChild(row);
    }
    if (hasSkin(r)) p.appendChild(nextRow(T("recs.next_skin"), T("recs.go_skin"), "skin"));
    else planRow(p, o);
    return p;
  }

  var SKIN_TYPES = ["normal", "dry", "oily", "combination", "unclear"];
  function hasSkin(r) { return !!(r.card && r.card.skin && SKIN_TYPES.indexOf(r.card.skin.type) >= 0); }

  // last step of the page: put it into practice (30-day plan for paid users, a Pro line for free users)
  function planRow(p, o) {
    if (o.planHref) {
      var nx = el("div", "fzr-nx"); nx.appendChild(el("span", "", T("recs.next_plan")));
      var a = el("a", "btn btn-primary", T("recs.go_plan")); a.href = o.planHref; nx.appendChild(a); p.appendChild(nx);
    } else if (o.proHref && o.isFree) {
      var n2 = el("div", "fzr-nx"); n2.appendChild(el("span", "", T("recs.next_plan_free")));
      var a2 = el("a", "btn btn-primary", T("recs.see_pro")); a2.href = o.proHref; n2.appendChild(a2); p.appendChild(n2);
    }
  }

  function skinPanel(r, o) {
    var p = el("div"), sk = r.card.skin, ai = sk.type, t = effType(r, o);
    var chosen = !!(o.profile && SKIN_TYPES.indexOf(o.profile.skin_type) >= 0);
    var top = el("div", "fzr-skin");
    top.appendChild(el("span", "fzr-ct", T("skin." + t)));
    if (!chosen && t !== "unclear" && sk.type_confidence) top.appendChild(el("span", "fzr-conf", T("skin.ai_guess", { confidence: val(sk.type_confidence) })));
    p.appendChild(top);
    if (chosen) p.appendChild(el("p", "fzr-based", T("recs.st.yours", { type: T("skin." + t), ai: T("skin." + ai) })));
    p.appendChild(el("p", "fzr-skin-d", T("recs.skin.d." + t)));
    if (!chosen && sk.note) { var sw = el("p", "fzr-based"); sw.appendChild(el("i", "", T("recs.skin.saw"))); sw.appendChild(document.createTextNode(" " + sk.note)); p.appendChild(sw); }
    var ck = el("div", "fzr-why"); ck.appendChild(el("b", "", T("recs.skin.check_h"))); ck.appendChild(document.createElement("br")); ck.appendChild(document.createTextNode(T("recs.skin.check"))); p.appendChild(ck);

    if (canSave(o)) {
      p.appendChild(el("h3", "fzr-sub", T("recs.st.change_h")));
      var grp = el("div", "fzr-chs"); grp.setAttribute("role", "group"); grp.setAttribute("aria-label", T("recs.st.change_h"));
      ["normal", "dry", "oily", "combination"].forEach(function (k) {
        var on = chosen && o.profile.skin_type === k, id = "fzr-c-st-" + k;
        var bt = el("button", "fzr-chip" + (on ? " on" : ""), T("skin." + k)); bt.type = "button"; bt.id = id; bt.setAttribute("aria-pressed", on ? "true" : "false");
        bt.addEventListener("click", function () { save("skin", { skin_type: k }, id); });
        grp.appendChild(bt);
      });
      p.appendChild(grp);
      if (chosen) {
        var rb = el("button", "fzr-link fzr-reset", T("recs.st.ai")); rb.type = "button"; rb.id = "fzr-c-st-ai";
        rb.addEventListener("click", function () { save("skin", { skin_type: null }, "fzr-c-st-ai"); }); p.appendChild(rb);
      }
      var sens = !!o.profile.sensitive_skin;
      var row = el("div", "fzr-swrow");
      var sb = el("button", "fzr-sw" + (sens ? " on" : ""), ""); sb.type = "button"; sb.id = "fzr-c-sens"; sb.setAttribute("role", "switch"); sb.setAttribute("aria-checked", sens ? "true" : "false"); sb.setAttribute("aria-labelledby", "fzr-sens-l");
      sb.appendChild(el("span", "fzr-knob"));
      sb.addEventListener("click", function () { save("skin", { sensitive_skin: !sens }, "fzr-c-sens"); });
      var lab = el("span", "fzr-swl"); lab.id = "fzr-sens-l"; lab.appendChild(el("b", "", T("recs.st.sens"))); lab.appendChild(el("span", "", T("recs.st.sens_help")));
      row.appendChild(sb); row.appendChild(lab); p.appendChild(row);
      p.appendChild(msgNode("skin"));
    }
    p.appendChild(el("p", "fzr-based", T("recs.skin.note")));
    if (window.FZSkin) p.appendChild(nextRow(T("recs.next_routine"), T("recs.go_routine"), "routine"));
    else planRow(p, o);
    return p;
  }

  function stepList(steps) {
    var ul = el("ul", "fzr-list");
    steps.forEach(function (st) {
      var li = el("li", "fzr-it"), b = el("div", "fzr-body");
      if (st.active) b.appendChild(el("span", "fzr-ct", st.strength));
      b.appendChild(el("b", "", st.title));
      var c = chips([st.product, st.active ? st.freq : ""]); if (c) b.appendChild(c);
      [["recs.r.amount", st.amount], ["recs.r.how", st.how], ["recs.r.why", st.why]].forEach(function (x) {
        if (!x[1]) return; var q = el("p"); q.appendChild(el("i", "", T(x[0]))); q.appendChild(document.createTextNode(" " + x[1])); b.appendChild(q);
      });
      li.appendChild(b); ul.appendChild(li);
    });
    return ul;
  }

  function routinePanel(r, o) {
    var p = el("div");
    if (o.isFree) { p.appendChild(lockBox(T("recs.lock_skinr"), o.proHref)); return p; }
    var R = window.FZSkin.build(effType(r, o), !!(o.profile && o.profile.sensitive_skin), flagsOf(o));
    p.appendChild(why(R.intro, true));
    p.appendChild(el("h3", "fzr-sub", R.amLabel)); p.appendChild(stepList(R.am));
    p.appendChild(el("h3", "fzr-sub", R.pmLabel)); p.appendChild(stepList(R.pm));
    if (R.later.length) {
      p.appendChild(el("h3", "fzr-sub", T("recs.r.later_h"))); p.appendChild(el("p", "fzr-based", T("recs.r.later_note")));
      var ul = el("ul", "fzr-list");
      R.later.forEach(function (x) {
        var li = el("li", "fzr-it"), b = el("div", "fzr-body");
        b.appendChild(el("b", "", x.name)); b.appendChild(chips([x.strength, x.when, x.freq])); b.appendChild(el("p", "", x.why));
        li.appendChild(b); ul.appendChild(li);
      });
      p.appendChild(ul);
    }
    p.appendChild(el("h3", "fzr-sub", T("recs.r.safety_h")));
    var sf = el("ul", "fzr-ck"); R.notes.forEach(function (n) { sf.appendChild(el("li", "", n)); }); p.appendChild(sf);
    if (o.planHref && canSave(o)) {
      var inPlan = !!o.profile.routine_in_plan, row = el("div", "fzr-act");
      var bt = el("button", "btn " + (inPlan ? "btn-outline" : "btn-primary"), inPlan ? T("recs.r.in_plan") : T("recs.r.add_plan")); bt.type = "button"; bt.id = "fzr-c-plan"; bt.setAttribute("aria-pressed", inPlan ? "true" : "false");
      bt.addEventListener("click", function () { save("routine", { routine_in_plan: !inPlan }, "fzr-c-plan", inPlan ? "recs.r.plan_removed" : "recs.r.plan_added"); });
      row.appendChild(bt);
      if (inPlan) { var a = el("a", "btn btn-primary", T("recs.r.open_plan")); a.href = o.planHref; row.appendChild(a); }
      p.appendChild(row); p.appendChild(msgNode("routine"));
    }
    // the "Open your plan" button above already covers the last step once the routine is in the plan
    if (!(o.planHref && canSave(o) && o.profile.routine_in_plan)) planRow(p, o);
    return p;
  }

  function nextRow(text, label, key) {
    var nx = el("div", "fzr-nx"); nx.appendChild(el("span", "", text));
    var b = el("button", "btn btn-primary", label); b.type = "button";
    b.addEventListener("click", function () { goNext(key); });
    nx.appendChild(b);
    return nx;
  }

  // ---------- open / close ----------
  function smooth() { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"; }
  function setOpen(key, on) {
    ctx.open[key] = !!on;
    var n = nodes[key]; if (!n) return;
    n.btn.setAttribute("aria-expanded", on ? "true" : "false");
    n.pn.hidden = !on;
  }
  function goNext(key) {
    Object.keys(ctx.open).forEach(function (k) { if (ctx.open[k]) setOpen(k, false); });
    setOpen(key, true);
    var n = nodes[key]; if (!n) return;
    try { n.btn.focus({ preventScroll: true }); } catch (e) { n.btn.focus(); }
    n.btn.scrollIntoView({ block: "start", behavior: smooth() });
  }

  function section(key, title, sub, badge, iconPath, panel) {
    var wrap = el("div", "fzr-sec");
    var b = el("button", "fzr-btn"); b.type = "button"; b.id = "fzr-b-" + key;
    b.setAttribute("aria-expanded", ctx.open[key] ? "true" : "false"); b.setAttribute("aria-controls", "fzr-p-" + key);
    var ic = el("span", "fzr-ic"); ic.appendChild(icon(iconPath)); b.appendChild(ic);
    var tx = el("span", "fzr-tx"); tx.appendChild(el("b", "", title)); tx.appendChild(el("span", "", sub)); b.appendChild(tx);
    b.appendChild(el("span", "fzr-bd", badge));
    b.appendChild(icon(P.chev, "fzr-chev"));
    var pn = el("div", "fzr-pn"); pn.id = "fzr-p-" + key; pn.setAttribute("role", "region"); pn.setAttribute("aria-labelledby", b.id);
    pn.hidden = !ctx.open[key];
    pn.appendChild(panel);
    b.addEventListener("click", function () { setOpen(key, !ctx.open[key]); });
    wrap.appendChild(b); wrap.appendChild(pn);
    nodes[key] = { btn: b, pn: pn };
    return wrap;
  }

  function draw() {
    var root = ctx.root, r = ctx.r, o = ctx.o;
    root.textContent = ""; nodes = {};
    var head = el("div", "fzr-head");
    head.appendChild(el("h2", "", T("recs.title"))); head.appendChild(el("p", "", T("recs.hint")));
    root.appendChild(head);

    var shape = r.face_shape && r.face_shape.type ? r.face_shape.type : "";
    var vh = r.visible_hair || {}, hairWord = vh.type && vh.type !== "unclear" ? vh.type : "";
    if (r.hairstyles && r.hairstyles.length) {
      var subH = hairWord && shape ? T("recs.hair.sub", { hair: hairWord, shape: shape }) : shape ? T("recs.hair.sub2", { shape: shape }) : T("recs.hair.t");
      root.appendChild(section("hair", T("recs.hair.t"), subH, T("recs.badge_picks", { n: r.hairstyles.length }), P.hair, hairPanel(r, o)));
    }
    if (r.glasses && r.glasses.length) {
      var subG = shape ? T("recs.glasses.sub", { shape: shape }) : T("recs.glasses.sub2");
      root.appendChild(section("glasses", T("recs.glasses.t"), subG, T("recs.badge_picks", { n: r.glasses.length }), P.glasses, glassesPanel(r, o)));
    }
    if (r.grooming && r.grooming.length) {
      root.appendChild(section("groom", T("recs.groom.t"), T("recs.groom.sub"), T("recs.badge_tips", { n: r.grooming.length }), P.groom, groomPanel(r, o)));
    }
    var nFeat = r.features ? FEATS.filter(function (k) { return r.features[k]; }).length : 0;
    root.appendChild(section("feat", T("recs.feat.t"), T("recs.feat.sub"), r.features ? T("recs.badge_notes", { n: nFeat }) : T("recs.badge_pro"), P.feat, featPanel(r, o)));
    if (hasSkin(r)) {
      root.appendChild(section("skin", T("recs.skin.t"), T("recs.skin.sub"), T("skin." + effType(r, o)), P.skin, skinPanel(r, o)));
    }
    if (window.FZSkin) {
      var nSteps = 0;
      if (!o.isFree) { var R0 = window.FZSkin.build(effType(r, o), !!(o.profile && o.profile.sensitive_skin), flagsOf(o)); nSteps = R0.am.length + R0.pm.length; }
      root.appendChild(section("routine", T("recs.skinr.t"), T("recs.skinr.sub"), o.isFree ? T("recs.badge_pro") : T("recs.badge_steps", { n: nSteps }), P.routine, routinePanel(r, o)));
    }
    // Phase 6A: invite paid users to fill the grooming profile (it feeds the daily plan and the safety rules)
    if (o.profileHref && !o.isFree && canSave(o)) {
      var done = !!o.profile.profile_done_at, cta = el("div", "fzr-nx fzr-cta");
      cta.appendChild(el("span", "", T(done ? "recs.cta_done" : "recs.cta_text")));
      var ca = el("a", "btn btn-primary", T(done ? "recs.cta_update" : "recs.cta_btn")); ca.href = o.profileHref; cta.appendChild(ca);
      root.appendChild(cta);
    }
    root.hidden = false;
  }

  function render(root, r, opts) {
    if (!root || !r) return;
    var keep = ctx && ctx.root === root ? ctx.open : {};
    ctx = { root: root, r: r, o: opts || {}, open: keep };
    draw();
    // hair.js is loaded with "defer": if the report came back before it ran, draw again once the page has loaded
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { if (ctx) draw(); });
    if (!listening) {
      listening = true;
      // language switch from the menu: redraw the labels, keep what was open
      document.addEventListener("fz:lang", function () { if (ctx) draw(); });
    }
  }

  window.FZRecs = { render: render };
})();
