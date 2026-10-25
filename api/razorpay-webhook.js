// Safety net: Razorpay tells us a payment succeeded even if the person closed the tab.
// In Razorpay Dashboard > Account & Settings > Webhooks, add: https://www.facerizer.com/api/razorpay-webhook
// Active events: payment.captured. Set a secret and put the same text in Vercel as RAZORPAY_WEBHOOK_SECRET.
const crypto = require("crypto");
const lib = require("./_lib");

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const t = setTimeout(() => resolve(null), 3000);
    req.on("data", (d) => chunks.push(d));
    req.on("end", () => { clearTimeout(t); resolve(Buffer.concat(chunks)); });
    req.on("error", (e) => { clearTimeout(t); reject(e); });
  });
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") return res.status(200).json({ status: "ready", secret: Boolean(lib.env().WEBHOOK_SECRET) });
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).end(); }
  const e = lib.env();
  if (!e.WEBHOOK_SECRET || !e.SB || !e.KEY) return res.status(500).json({ error: "Webhook is not configured" });

  try {
    let raw = await readRaw(req);
    if (!raw || !raw.length) raw = Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}));
    const expected = crypto.createHmac("sha256", e.WEBHOOK_SECRET).update(raw).digest("hex");
    if (!lib.safeEqual(expected, req.headers["x-razorpay-signature"])) return res.status(401).json({ error: "Bad signature" });

    const evt = JSON.parse(raw.toString("utf8"));
    if (evt.event === "payment.captured" || evt.event === "order.paid") {
      const p = (evt.payload && evt.payload.payment && evt.payload.payment.entity) || {};
      if (p.order_id && p.id) await lib.activate(p.order_id, p.id);
    }
    return res.status(200).json({ ok: true });
  } catch (x) {
    return res.status(500).json({ error: "Webhook failed", detail: String((x && x.message) || x).slice(0, 200) });
  }
};
module.exports.config = { api: { bodyParser: false } };
