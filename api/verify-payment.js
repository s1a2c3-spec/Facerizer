// Called by the browser right after Razorpay Checkout succeeds.
// Checks the signature and the payment with Razorpay, then switches the plan on.
const lib = require("./_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  const e = lib.env();
  if (!e.SB || !e.KEY || !e.RZP_ID || !e.RZP_SECRET) return res.status(500).json({ error: "Payments are not configured yet" });

  try {
    const user = await lib.getUser(req);
    if (!user) return res.status(401).json({ error: "Please log in again" });

    let b = req.body;
    if (typeof b === "string") { try { b = JSON.parse(b); } catch (x) { b = {}; } }
    b = b || {};
    const orderId = String(b.razorpay_order_id || ""), paymentId = String(b.razorpay_payment_id || ""), sig = String(b.razorpay_signature || "");
    if (!/^order_\w+$/.test(orderId) || !/^pay_\w+$/.test(paymentId) || !sig) return res.status(400).json({ error: "Missing payment details" });

    const pr = await lib.rest("payments?razorpay_order_id=eq." + encodeURIComponent(orderId) + "&user_id=eq." + user.id + "&select=id,status,plan,period,amount,activated_until");
    const row = ((await pr.json()) || [])[0];
    if (!row) return res.status(404).json({ error: "Order not found" });
    if (row.status === "paid") return res.status(200).json({ ok: true, already: true, plan: row.plan, until: row.activated_until });

    if (!lib.checkoutSignature(orderId, paymentId, sig)) return res.status(400).json({ error: "Payment could not be verified" });

    // confirm with Razorpay that the money is for this order and this amount
    let pay = await lib.rzp("GET", "/payments/" + paymentId);
    if (!pay.ok) return res.status(502).json({ error: "Could not confirm the payment with Razorpay", detail: pay.text.slice(0, 200) });
    if (pay.json.order_id !== orderId || pay.json.amount !== row.amount) return res.status(400).json({ error: "Payment details do not match" });
    if (pay.json.status === "authorized") {
      const cap = await lib.rzp("POST", "/payments/" + paymentId + "/capture", { amount: row.amount, currency: "INR" });
      if (!cap.ok) return res.status(502).json({ error: "Could not complete the payment", detail: cap.text.slice(0, 200) });
      pay = cap;
    }
    if (pay.json.status !== "captured") return res.status(402).json({ error: "The payment is not complete yet. If money was taken, your plan will switch on within a few minutes." });

    const done = await lib.activate(orderId, paymentId);
    const out = done.already ? { plan: row.plan, until: row.activated_until } : done;
    return res.status(200).json({ ok: true, plan: out.plan, until: out.until });
  } catch (x) {
    return res.status(500).json({ error: "Payment received, but we could not switch on your plan yet. Please refresh in a minute, or contact us.", detail: String((x && x.message) || x).slice(0, 200) });
  }
};
