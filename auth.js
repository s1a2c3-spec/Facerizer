(function () {
  var cfg = window.FACERIZER || {};
  var page = document.body.getAttribute("data-page");
  var msgEl = document.getElementById("msg");

  function show(text, type) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = "msg " + (type || "");
  }

  var ready = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL.indexOf("YOUR_") === -1 && window.supabase;
  if (!ready) {
    show("Setup is not finished yet: add your Supabase details in config.js.", "error");
    return;
  }

  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  function friendly(err) {
    var m = (err && err.message) || "Something went wrong. Please try again.";
    if (/invalid login/i.test(m)) return "Email or password is incorrect.";
    if (/not confirmed/i.test(m)) return "Please verify your email first. Check your inbox for the link.";
    if (/rate limit|too many/i.test(m)) return "Too many attempts. Please wait a few minutes and try again.";
    return m;
  }
  function setBusy(form, on) {
    var b = form && form.querySelector("button[type=submit]");
    if (b) b.disabled = on;
  }
  function val(form, name) {
    var el = form.elements[name];
    return el ? el.value.trim() : "";
  }

  /* ---------------- SIGN UP ---------------- */
  if (page === "signup") {
    var f = document.getElementById("auth-form");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = val(f, "email"), password = f.elements["password"].value, name = val(f, "name");
      if (!email || password.length < 8) return show("Enter your email and a password with at least 8 characters.", "error");
      if (!f.elements["age"].checked) return show("You must be 18 or older to use Facerizer.", "error");
      if (!f.elements["consent"].checked) return show("Please accept the Terms and Privacy Policy to continue.", "error");
      setBusy(f, true); show("Creating your account...");
      sb.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { display_name: name, age_confirmed: "true", consent: "true" },
          emailRedirectTo: window.location.origin + "/login"
        }
      }).then(function (res) {
        setBusy(f, false);
        if (res.error) return show(friendly(res.error), "error");
        var u = res.data && res.data.user;
        if (u && u.identities && u.identities.length === 0) {
          return show("This email is already registered. Please log in instead.", "error");
        }
        if (res.data.session) { window.location.href = "/account"; return; }
        f.reset();
        show("Account created. Check your email and click the verification link, then log in.", "ok");
      });
    });
  }

  /* ---------------- LOG IN ---------------- */
  if (page === "login") {
    sb.auth.getSession().then(function (r) { if (r.data.session) window.location.href = "/account"; });
    var lf = document.getElementById("auth-form");
    lf.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = val(lf, "email"), password = lf.elements["password"].value;
      if (!email || !password) return show("Enter your email and password.", "error");
      setBusy(lf, true); show("Logging in...");
      sb.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
        setBusy(lf, false);
        if (res.error) return show(friendly(res.error), "error");
        window.location.href = "/account";
      });
    });
  }

  /* ---------------- FORGOT PASSWORD ---------------- */
  if (page === "forgot") {
    var ff = document.getElementById("auth-form");
    ff.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = val(ff, "email");
      if (!email) return show("Enter your email.", "error");
      setBusy(ff, true); show("Sending...");
      sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" }).then(function (res) {
        setBusy(ff, false);
        if (res.error && /rate limit|too many/i.test(res.error.message)) return show(friendly(res.error), "error");
        // Same message whether or not the email exists (privacy).
        show("If an account exists for this email, a reset link has been sent.", "ok");
      });
    });
  }

  /* ---------------- RESET PASSWORD ---------------- */
  if (page === "reset") {
    var rf = document.getElementById("auth-form");
    var fields = rf.querySelectorAll("input, button");
    function lock(on) { for (var i = 0; i < fields.length; i++) fields[i].disabled = on; }
    lock(true);
    show("Checking your reset link...");
    var unlocked = false;
    function unlock() { if (unlocked) return; unlocked = true; lock(false); show("Choose a new password.", ""); }
    sb.auth.onAuthStateChange(function (event) { if (event === "PASSWORD_RECOVERY") unlock(); });
    setTimeout(function () {
      if (!unlocked) show("This reset link is invalid or has expired. Please request a new one.", "error");
    }, 3000);
    rf.addEventListener("submit", function (e) {
      e.preventDefault();
      var p1 = rf.elements["password"].value, p2 = rf.elements["password2"].value;
      if (p1.length < 8) return show("Password must be at least 8 characters.", "error");
      if (p1 !== p2) return show("The two passwords do not match.", "error");
      setBusy(rf, true); show("Saving...");
      sb.auth.updateUser({ password: p1 }).then(function (res) {
        setBusy(rf, false);
        if (res.error) return show(friendly(res.error), "error");
        show("Password updated. Taking you to your account...", "ok");
        setTimeout(function () { window.location.href = "/account"; }, 1200);
      });
    });
  }

  /* ---------------- ACCOUNT ---------------- */
  if (page === "account") {
    var pf = document.getElementById("profile-form");
    var userId = null;
    sb.auth.getSession().then(function (r) {
      var session = r.data.session;
      if (!session) { window.location.href = "/login"; return; }
      var user = session.user;
      userId = user.id;
      document.getElementById("acc-email").textContent = user.email || "";
      document.getElementById("acc-verified").textContent = user.email_confirmed_at ? "Verified" : "Not verified";
      sb.from("profiles").select("display_name, age_range").eq("id", userId).maybeSingle().then(function (res) {
        if (res.data) {
          pf.elements["name"].value = res.data.display_name || "";
          pf.elements["age_range"].value = res.data.age_range || "";
        }
      });
    });
    pf.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!userId) return;
      setBusy(pf, true); show("Saving...");
      sb.from("profiles").update({
        display_name: val(pf, "name") || null,
        age_range: pf.elements["age_range"].value || null
      }).eq("id", userId).then(function (res) {
        setBusy(pf, false);
        if (res.error) return show("Could not save. Please try again.", "error");
        show("Saved.", "ok");
      });
    });
    document.getElementById("logout").addEventListener("click", function () {
      sb.auth.signOut().then(function () { window.location.href = "/"; });
    });
  }
})();
