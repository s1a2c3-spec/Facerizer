(function () {
  // Google sign-in comes back with a login token (or an error) in the address. Handle it on any page.
  try {
    var h = window.location.hash || "";
    var path = window.location.pathname.replace(/\/$/, "");
    if (/access_token=/.test(h) && path !== "/account") {
      window.location.replace("/account" + h);
      return;
    }
    var em = h.match(/error_description=([^&]+)/);
    if (em) {
      var msg = decodeURIComponent(em[1].replace(/\+/g, " "));
      var bar = document.createElement("div");
      bar.setAttribute("role", "alert");
      bar.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:99;padding:.8rem 1rem;background:#b3261e;color:#fff;font:600 .85rem system-ui,sans-serif;text-align:center";
      bar.textContent = "Sign-in problem: " + msg + ". Please try again or log in with email.";
      document.addEventListener("DOMContentLoaded", function () { document.body.appendChild(bar); });
    }
  } catch (e) {}
})();

(function () {
  // If a Supabase session exists in this browser, show "My account" instead of Log in / Sign up.
  try {
    var logged = false;
    for (var i = 0; i < localStorage.length; i++) {
      if (/^sb-.*-auth-token$/.test(localStorage.key(i))) { logged = true; break; }
    }
    if (logged) {
      var l = document.getElementById("nav-login"), s = document.getElementById("nav-signup");
      if (l) { l.textContent = "My account"; l.setAttribute("href", "/account"); }
      if (s) { s.style.display = "none"; }
    }
  } catch (e) {}
})();

(function () {
  var root = document.documentElement;
  var btn = document.getElementById("theme-toggle");
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
  if (!btn) return;

  function current() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function label() {
    btn.setAttribute("aria-label", current() === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }
  btn.addEventListener("click", function () {
    var next = current() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    label();
  });
  label();
})();
