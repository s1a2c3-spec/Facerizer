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
