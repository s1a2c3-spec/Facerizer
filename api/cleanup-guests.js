// Vercel cron job (runs once a day, see vercel.json): removes guest data older than 7 days.
// A guest = an anonymous Supabase user (no email, no linked identity). People who signed up are NOT touched.
//
// Safe by default: it only LISTS what it would delete, until the Vercel env GUEST_CLEANUP is set to "on".
// Needs: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET (Vercel sends it as "Authorization: Bearer <CRON_SECRET>").
// Deletes the same way api/delete-account.js does: photo files first, then the user (profile, photo and analysis rows follow).

const DAYS = 7;
const MAX_DELETE_PER_RUN = 200;

module.exports = async function handler(req, res) {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.CRON_SECRET;

  if (!secret) return res.status(500).json({ error: "CRON_SECRET is not set in Vercel" });
  if ((req.headers.authorization || "") !== "Bearer " + secret) return res.status(401).json({ error: "Not allowed" });
  if (!url || !key) return res.status(500).json({ error: "Server is not configured" });

  const live = String(process.env.GUEST_CLEANUP || "").toLowerCase() === "on";
  const admin = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
  const cutoff = Date.now() - DAYS * 24 * 3600 * 1000;

  try {
    // 1. Find old guests (page through the user list; stop after 5 pages = 5000 users)
    const old = [];
    let scanned = 0;
    for (let page = 1; page <= 5; page++) {
      const r = await fetch(url + "/auth/v1/admin/users?page=" + page + "&per_page=1000", { headers: admin });
      if (!r.ok) return res.status(500).json({ error: "Could not list users", detail: r.status });
      const body = await r.json();
      const users = (body && body.users) || [];
      scanned += users.length;
      for (const u of users) {
        const isGuest = u.is_anonymous === true && !u.email && !u.phone && (!u.identities || u.identities.length === 0);
        if (isGuest && new Date(u.created_at).getTime() < cutoff) old.push(u.id);
      }
      if (users.length < 1000) break;
    }
    const batch = old.slice(0, MAX_DELETE_PER_RUN);
    if (!live) return res.status(200).json({ dry_run: true, scanned, old_guests: old.length, would_delete_now: batch.length, note: "Set GUEST_CLEANUP=on in Vercel to really delete." });

    // 2. Delete them
    let deleted = 0, failed = 0;
    for (const uid of batch) {
      let ok = true;
      for (let round = 0; round < 5 && ok; round++) {
        const list = await fetch(url + "/storage/v1/object/list/photos", { method: "POST", headers: admin, body: JSON.stringify({ prefix: uid, limit: 100, offset: 0 }) });
        if (!list.ok) { ok = false; break; }
        const items = await list.json();
        const names = (Array.isArray(items) ? items : []).filter((i) => i && i.name).map((i) => uid + "/" + i.name);
        if (names.length === 0) break;
        const del = await fetch(url + "/storage/v1/object/photos", { method: "DELETE", headers: admin, body: JSON.stringify({ prefixes: names }) });
        if (!del.ok) ok = false;
      }
      if (ok) {
        const rm = await fetch(url + "/auth/v1/admin/users/" + uid, { method: "DELETE", headers: admin });
        ok = rm.ok;
      }
      if (ok) deleted++; else failed++;
    }
    return res.status(200).json({ ok: true, scanned, old_guests: old.length, deleted, failed });
  } catch (e) {
    return res.status(500).json({ error: "Cleanup failed", detail: String((e && e.message) || e) });
  }
};
