(function () {
  var cfg = window.FACERIZER || {};
  var $ = function (id) { return document.getElementById(id); };
  var msgEl = $("msg");
  function say(t, type) { msgEl.textContent = t || ""; msgEl.className = "msg " + (type || ""); }

  var ready = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_URL.indexOf("YOUR_") === -1 && window.supabase;
  if (!ready) { say("Setup is not finished: add your Supabase details in config.js.", "error"); return; }

  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  var form = $("prefs-form");
  var userId = null;
  var COLS = "display_name, age_range, hair_preference, facial_hair_preference, style_preference, hide_scores";

  $("logout").addEventListener("click", function () {
    sb.auth.signOut().then(function () { window.location.href = "/"; });
  });

  function firstName(s) { return (s || "").trim().split(/\s+/)[0]; }

  function paintHeader(user, name) {
    var shown = firstName(name) || firstName((user.user_metadata || {}).display_name) || (user.email || "").split("@")[0] || "there";
    $("greet").textContent = "Hi, " + shown;
    $("avatar").textContent = (shown.charAt(0) || "F").toUpperCase();
    var line = user.email || "";
    if (user.created_at) {
      try {
        var d = new Date(user.created_at);
        line += "  ·  Member since " + d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      } catch (e) {}
    }
    $("email-line").textContent = line;
    if (!user.email_confirmed_at) $("verify-banner").style.display = "block";
  }

  sb.auth.getSession().then(function (r) {
    var session = r.data.session;
    if (!session) { window.location.href = "/login"; return; }
    var user = session.user;
    userId = user.id;
    paintHeader(user, "");

    sb.from("profiles").select(COLS).eq("id", userId).maybeSingle().then(function (res) {
      if (res.error) {
        console.error("Load profile failed:", res.error);
        return say("Could not load your details (" + res.error.message + ").", "error");
      }
      if (!res.data) {
        return say("Your profile record is missing. Run the latest SQL (setup-v2.sql) in Supabase, then refresh.", "error");
      }
      var p = res.data;
      form.elements["name"].value = p.display_name || "";
      form.elements["age_range"].value = p.age_range || "";
      form.elements["hair_preference"].value = p.hair_preference || "";
      form.elements["facial_hair_preference"].value = p.facial_hair_preference || "";
      form.elements["style_preference"].value = p.style_preference || "";
      form.elements["hide_scores"].checked = !!p.hide_scores;
      paintHeader(user, p.display_name);
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!userId) return;
    var btn = form.querySelector("button[type=submit]");
    btn.disabled = true; say("Saving...");
    var payload = {
      display_name: form.elements["name"].value.trim() || null,
      age_range: form.elements["age_range"].value || null,
      hair_preference: form.elements["hair_preference"].value || null,
      facial_hair_preference: form.elements["facial_hair_preference"].value || null,
      style_preference: form.elements["style_preference"].value || null,
      hide_scores: form.elements["hide_scores"].checked
    };
    sb.from("profiles").update(payload).eq("id", userId).select("display_name").then(function (res) {
      btn.disabled = false;
      if (res.error) {
        console.error("Save failed:", res.error);
        return say("Could not save (" + res.error.message + "). Run the latest SQL (setup-v2.sql) in Supabase.", "error");
      }
      if (!res.data || res.data.length === 0) {
        return say("Could not save: your profile record is missing. Run setup-v2.sql in Supabase.", "error");
      }
      say("Saved.", "ok");
      $("greet").textContent = "Hi, " + (firstName(payload.display_name) || "there");
      $("avatar").textContent = (firstName(payload.display_name) || "F").charAt(0).toUpperCase();
    });
  });
})();
