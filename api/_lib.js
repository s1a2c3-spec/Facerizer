// Shared helpers for the payment functions. Files starting with "_" are not public URLs.
const crypto = require("crypto");

// Prices in paise (INR x 100). The server decides the price, never the browser.
const PRICES = {
  pro: { month: 39900, year: 299900 },
  premium: { month: 69900, year: 529900 },
};
const PERIOD_DAYS = { month: 30, year: 365 };

const lib = { PRICES, PERIOD_DAYS };

lib.env = () => ({
  SB: (process.env.SUPABASE_URL || "").replace(/\/$/, ""),
  KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  RZP_ID: process.env.RAZORPAY_KEY_ID,
  RZP_SECRET: process.env.RAZORPAY_KEY_SECRET,
  WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
});

lib.rest = (path, init = {}) => {
  const { SB, KEY } = lib.env();
  return fetch(SB + "/rest/v1/" + path, {
    ...init,
    headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", ...(init.headers || {}) },
  });
};

lib.getUser = async (req) => {
  const { SB, KEY } = lib.env();
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (!token) return null;
  const r = await fetch(SB + "/auth/v1/user", { headers: { apikey: KEY, Authorization: "Bearer " + token } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u : null;
};

lib.rzp = async (method, path, body) => {
  const { RZP_ID, RZP_SECRET } = lib.env();
  const r = await fetch("https://api.razorpay.com/v1" + path, {
    method,
    headers: { Authorization: "Basic " + Buffer.from(RZP_ID + ":" + RZP_SECRET).toString("base64"), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = {};
  try { json = JSON.parse(text); } catch (e) {}
  return { ok: r.ok, status: r.status, json, text };
};

lib.safeEqual = (a, b) => {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

lib.checkoutSignature = (orderId, paymentId, signature) => {
  const { RZP_SECRET } = lib.env();
  const expected = crypto.createHmac("sha256", RZP_SECRET).update(orderId + "|" + paymentId).digest("hex");
  return lib.safeEqual(expected, signature);
};

// When the payment is confirmed: mark it paid ONCE, then switch the plan on.
// Safe to call twice (browser and webhook): the second call finds nothing to claim.
lib.activate = async (orderId, paymentId) => {
  const claim = await lib.rest("payments?razorpay_order_id=eq." + encodeURIComponent(orderId) + "&status=eq.created", {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "paid", razorpay_payment_id: paymentId, paid_at: new Date().toISOString() }),
  });
  if (!claim.ok) throw new Error("claim_failed");
  const rows = await claim.json();
  if (!rows.length) return { already: true };
  const p = rows[0];

  try {
    const pr = await lib.rest("profiles?id=eq." + p.user_id + "&select=plan,plan_expires_at");
    const prof = ((await pr.json()) || [])[0];
    if (!prof) throw new Error("no_profile");

    const now = Date.now();
    const currentEnd = prof.plan_expires_at ? new Date(prof.plan_expires_at).getTime() : 0;
    const active = prof.plan !== "free" && currentEnd > now;
    // Same plan renewed while active: add on top. A new plan (or an upgrade): starts now.
    const start = active && prof.plan === p.plan ? currentEnd : now;
    const until = new Date(start + PERIOD_DAYS[p.period] * 86400000).toISOString();

    const up = await lib.rest("profiles?id=eq." + p.user_id, { method: "PATCH", body: JSON.stringify({ plan: p.plan, plan_expires_at: until }) });
    if (!up.ok) throw new Error("profile_update_failed");
    await lib.rest("payments?id=eq." + p.id, { method: "PATCH", body: JSON.stringify({ activated_until: until }) });
    return { plan: p.plan, until };
  } catch (e) {
    // put the payment back so it can be retried
    await lib.rest("payments?id=eq." + p.id, { method: "PATCH", body: JSON.stringify({ status: "created", razorpay_payment_id: null, paid_at: null }) }).catch(() => {});
    throw e;
  }
};

module.exports = lib;
