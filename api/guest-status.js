// Vercel serverless function: tells the analyze page whether guest analysis is available right now.
// GET /api/guest-status  ->  { enabled: false }                          (GUEST_MODE is not "on", or setup is unfinished)
//                        ->  { enabled: true, available: true | false }  (available=false when today's cap is used up)
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (already in Vercel). Optional: GUEST_DAILY_CAP, FREE_DAILY_CAP.

function envInt(name, dflt) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return dflt;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : dflt;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (String(process.env.GUEST_MODE || "").toLowerCase() !== "on") return res.status(200).json({ enabled: false });

  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(200).json({ enabled: false, reason: "setup" });

  const now = Date.now();
  const since = encodeURIComponent(new Date(now - 24 * 3600 * 1000).toISOString());
  const headers = { apikey: key, Authorization: "Bearer " + key };
  const recent = (rows) => (rows || []).filter((r) => r.status === "done" || now - new Date(r.created_at).getTime() < 5 * 60 * 1000).length;

  try {
    // This also proves that sql/13-guest.sql was run: without the is_guest column Supabase answers with an error.
    const g = await fetch(url + "/rest/v1/analyses?is_guest=eq.true&created_at=gte." + since + "&status=in.(done,processing)&select=id,status,created_at&limit=2000", { headers });
    if (!g.ok) return res.status(200).json({ enabled: false, reason: "setup" });
    const guestCap = envInt("GUEST_DAILY_CAP", 50), freeCap = envInt("FREE_DAILY_CAP", 100);
    let available = true;
    if (guestCap > 0 && recent(await g.json()) >= guestCap) available = false;
    if (available && freeCap > 0) {
      const f = await fetch(url + "/rest/v1/analyses?plan=eq.free&created_at=gte." + since + "&status=in.(done,processing)&select=id,status,created_at&limit=5000", { headers });
      if (f.ok && recent(await f.json()) >= freeCap) available = false;
    }
    return res.status(200).json({ enabled: true, available });
  } catch (e) {
    return res.status(200).json({ enabled: false, reason: "error" });
  }
};
