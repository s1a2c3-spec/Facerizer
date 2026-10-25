(function () {
  var cfg = window.FACERIZER || {};
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function fmt(d) { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  function msg(t, type) { var m = $("msg"); m.textContent = t || ""; m.className = "msg " + (type || ""); }
  function state(t, err) { var s = $("state"); s.hidden = false; s.textContent = t; s.style.color = err ? "#b3261e" : ""; }
  function inr(n) { return "\u20B9" + n.toLocaleString("en-IN"); }

  var PRICE = { pro: { month: 399, year: 2999 }, premium: { month: 699, year: 5299 } };
  var NAME = { pro: "Pro", premium: "Premium" };
  var FEATS = {
    pro: ["Up to 25 analyses a month", "Full report with all 5 hairstyles and barber instructions", "Feature-by-feature report and skincare routine", "30-day plan with checklist and daily streak", "Report history, PDF report and barber card"],
    premium: ["Everything in Pro", "Up to 50 analyses a month", "60 and 90-day plans", "Before and after comparison", "Advanced progress tracking and report"]
  };

  var plan = new URLSearchParams(window.location.search).get("plan");
  var period = "month", token = null, profile = null, busy = false;

  var ready = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_URL.indexOf("YOUR_") === -1 && window.supabase;
  if (!ready) return state("Setup is not finished: add your Supabase details in config.js.", true);
  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  if (plan !== "pro" && plan !== "premium") {
    $("state").hidden = true; $("chooser").hidden = false; return;
  }

  function days() { return period === "year" ? 365 : 30; }

  function paint() {
    var p = PRICE[plan][period];
    $("co-title").textContent = NAME[plan] + " plan";
    $("co-price").textContent = inr(p);
    var per = el("span", "", period === "year" ? " for 1 year" : " for 1 month");
    $("co-price").appendChild(per);
    $("co-save").textContent = period === "year" ? "You save " + inr(PRICE[plan].month * 12 - PRICE[plan].year) + " compared with 12 months" : "";
    $("p-month").className = period === "month" ? "on" : ""; $("p-year").className = period === "year" ? "on" : "";
    var ul = $("co-list"); ul.textContent = "";
    FEATS[plan].forEach(function (f) { ul.appendChild(el("li", "", f)); });
    $("pay").textContent = "Pay " + inr(p) + " securely";
    var fine = $("co-fine"); fine.textContent = "";
    fine.appendChild(document.createTextNode("This is a prepaid pass: you pay once and get " + NAME[plan] + " for " + (period === "year" ? "1 year" : "30 days") + " from the day you pay. It does not renew by itself. Price includes applicable taxes. Payments are handled by Razorpay, and we never see your card or UPI details. By paying you agree to our "));
    var a1 = el("a", "", "Terms"); a1.href = "/terms"; a1.target = "_blank"; a1.rel = "noopener";
    var a2 = el("a", "", "Refund Policy"); a2.href = "/refund"; a2.target = "_blank"; a2.rel = "noopener";
    fine.appendChild(a1); fine.appendChild(document.createTextNode(" and ")); fine.appendChild(a2); fine.appendChild(document.createTextNode("."));
    var other = $("co-other"); other.textContent = "";
    var o = plan === "pro" ? "premium" : "pro";
    var link = el("a", "", "See " + NAME[o] + " instead"); link.href = "/checkout?plan=" + o; other.appendChild(link);
  }

  function info() {
    var box = $("co-info");
    if (!profile || profile.plan === "free" || !profile.plan_expires_at || new Date(profile.plan_expires_at).getTime() < Date.now()) { box.hidden = true; return; }
    var until = fmt(profile.plan_expires_at), t;
    if (profile.plan === plan) t = "You have " + NAME[plan] + " until " + until + ". Paying now adds " + days() + " days on top.";
    else if (profile.plan === "pro" && plan === "premium") t = "You have Pro until " + until + ". Premium starts as soon as you pay, and the remaining Pro days are not carried over.";
    else t = "You have Premium until " + until + ", which already includes everything in Pro.";
    box.textContent = t; box.hidden = false;
  }

  $("p-month").addEventListener("click", function () { period = "month"; paint(); });
  $("p-year").addEventListener("click", function () { period = "year"; paint(); });

  function loadRazorpay() {
    return new Promise(function (resolve, reject) {
      if (window.Razorpay) return resolve();
      var s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Could not load the payment window. Check your internet and try again.")); };
      document.head.appendChild(s);
    });
  }

  function verify(resp) {
    msg("Confirming your payment...");
    fetch("/api/verify-payment", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature }) })
      .then(function (r) { return r.text().then(function (t) { var j = {}; try { j = JSON.parse(t); } catch (e) {} return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        busy = false; $("pay").disabled = false;
        if (!x.ok) { msg((x.j.error || "Could not confirm the payment.") + (x.j.detail ? " [" + x.j.detail + "]" : "") + " If money was taken, your plan will switch on within a few minutes.", "error"); return; }
        $("box").hidden = true; $("done").hidden = false;
        $("done-text").textContent = "Your " + NAME[x.j.plan || plan] + " plan is active" + (x.j.until ? " until " + fmt(x.j.until) : "") + ". Thank you!";
      })
      .catch(function () { busy = false; $("pay").disabled = false; msg("We could not reach the server to confirm. If money was taken, your plan will switch on within a few minutes. Refresh this page to check.", "error"); });
  }

  $("pay").addEventListener("click", function () {
    if (busy) return;
    busy = true; $("pay").disabled = true; msg("Starting the payment...");
    fetch("/api/create-order", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ plan: plan, period: period }) })
      .then(function (r) { return r.text().then(function (t) { var j = {}; try { j = JSON.parse(t); } catch (e) {} return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (x) {
        if (!x.ok) {
          var m = x.j.error || "Could not start the payment.";
          if (x.status === 404 && !x.j.error) m = "The payment function was not found (404). Check that api/create-order.js is in GitHub and Vercel has redeployed.";
          throw new Error(m + (x.j.detail ? " [" + x.j.detail + "]" : ""));
        }
        return loadRazorpay().then(function () { return x.j; });
      })
      .then(function (d) {
        var rzp = new window.Razorpay({
          key: d.key_id, amount: d.amount, currency: d.currency, order_id: d.order_id,
          name: "Facerizer", description: NAME[plan] + " plan, " + (period === "year" ? "1 year" : "1 month"),
          prefill: { email: d.email || "" }, theme: { color: "#1F7A6F" },
          handler: verify,
          modal: { ondismiss: function () { if (busy) { busy = false; $("pay").disabled = false; msg("The payment window was closed. You have not been charged unless the payment went through."); } } }
        });
        rzp.on("payment.failed", function (r) { busy = false; $("pay").disabled = false; msg("Payment failed: " + ((r && r.error && r.error.description) || "please try again") + ".", "error"); });
        msg(""); rzp.open();
      })
      .catch(function (e) { busy = false; $("pay").disabled = false; msg(e.message, "error"); });
  });

  sb.auth.getSession().then(function (s) {
    var session = s.data.session;
    if (!session) {
      try { localStorage.setItem("fz_next", window.location.pathname + window.location.search); } catch (e) {}
      window.location.href = "/login"; return;
    }
    token = session.access_token;
    Promise.all([
      sb.from("profiles").select("plan, plan_expires_at, age_confirmed_at, consent_at").eq("id", session.user.id).maybeSingle(),
      fetch("/api/create-order").then(function (r) { return r.json(); }).catch(function () { return {}; })
    ]).then(function (out) {
      if (out[0].error) { console.error(out[0].error); return state("Could not load your account (" + out[0].error.message + "). Run pay-setup.sql in Supabase.", true); }
      profile = out[0].data || {};
      if (!profile.age_confirmed_at || !profile.consent_at) { window.location.href = "/account"; return; }
      var st = out[1] || {};
      if (st.mode === "test") {
        var t = $("co-test"); t.hidden = false;
        t.textContent = "Test mode: no real money is used. Use Razorpay's test card from its docs (any future expiry, any CVV), or the test UPI ID success@razorpay.";
      }
      if (st.status === "ready" && !st.razorpay) { state("Payments are not switched on yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel and Redeploy.", true); return; }
      paint(); info();
      $("state").hidden = true; $("box").hidden = false;
    });
  });
})();
