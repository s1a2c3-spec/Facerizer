// Creates a Razorpay order for a prepaid Pro or Premium pass.
// Vercel Environment Variables needed: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
const lib = require("./_lib");

module.exports = async function handler(req, res) {
  const e = lib.env();
  if (req.method === "GET") {
    return res.status(200).json({ status: "ready", supabase: Boolean(e.SB && e.KEY), razorpay: Boolean(e.RZP_ID && e.RZP_SECRET), mode: e.RZP_ID ? (e.RZP_ID.startsWith("rzp_test_") ? "test" : "live") : "none" });
  }
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ error: "Method not allowed" }); }
  if (!e.SB || !e.KEY || !e.RZP_ID || !e.RZP_SECRET) return res.status(500).json({ error: "Payments are not configured yet", detail: "Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel, then Redeploy" });

  try {
    const user = await lib.getUser(req);
    if (!user) return res.status(401).json({ error: "Please log in again" });

    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (x) { body = {}; } }
    body = body || {};
    const plan = body.plan, period = body.period;
    if (!lib.PRICES[plan] || !lib.PRICES[plan][period]) return res.status(400).json({ error: "Please choose a plan and a period" });
    const amount = lib.PRICES[plan][period];

    const pr = await lib.rest("profiles?id=eq." + user.id + "&select=plan,plan_expires_at,age_confirmed_at,consent_at");
    const profile = ((await pr.json()) || [])[0];
    if (!profile) return res.status(403).json({ error: "Profile not found" });
    if (!profile.age_confirmed_at || !profile.consent_at) return res.status(403).json({ error: "Please confirm 18+ and consent in your dashboard first" });

    const active = profile.plan !== "free" && profile.plan_expires_at && new Date(profile.plan_expires_at).getTime() > Date.now();
    if (active && profile.plan === "premium" && plan === "pro") {
      return res.status(409).json({ error: "You already have Premium, which includes everything in Pro." });
    }

    // at most 10 unpaid orders per hour per person
    const since = new Date(Date.now() - 3600 * 1000).toISOString();
    const recent = await lib.rest("payments?user_id=eq." + user.id + "&status=eq.created&created_at=gte." + encodeURIComponent(since) + "&select=id");
    if (((await recent.json()) || []).length >= 10) return res.status(429).json({ error: "Too many attempts. Please wait a while and try again." });

    const receipt = ("fz_" + Date.now().toString(36) + user.id.slice(0, 8)).slice(0, 40);
    const o = await lib.rzp("POST", "/orders", { amount, currency: "INR", receipt, notes: { user_id: user.id, plan, period } });
    if (!o.ok || !o.json.id) return res.status(502).json({ error: "Could not start the payment", detail: String((o.json.error && o.json.error.description) || o.text).slice(0, 200) });

    const ins = await lib.rest("payments", {
      method: "POST",
      body: JSON.stringify({ user_id: user.id, razorpay_order_id: o.json.id, plan, period, amount, status: "created" }),
    });
    if (!ins.ok) return res.status(500).json({ error: "Could not save the order", detail: (await ins.text()).slice(0, 200) });

    return res.status(200).json({ ok: true, order_id: o.json.id, amount, currency: "INR", key_id: e.RZP_ID, email: user.email || "", mode: e.RZP_ID.startsWith("rzp_test_") ? "test" : "live" });
  } catch (x) {
    return res.status(500).json({ error: "Something went wrong. Please try again.", detail: String((x && x.message) || x).slice(0, 200) });
  }
};
