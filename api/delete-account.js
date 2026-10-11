// Vercel serverless function: permanently deletes the logged-in user's photos and account.
// Needs two Environment Variables in Vercel: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
// The service key is a secret. It stays on the server and is never sent to the browser.

async function detailOf(r) {
  try {
    const t = await r.text();
    return r.status + " " + t.slice(0, 200);
  } catch (e) {
    return String(r.status);
  }
}

module.exports = async function handler(req, res) {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Opening /api/delete-account in a browser shows whether the function is live and configured.
  if (req.method === "GET") {
    return res.status(200).json({ status: "ready", configured: Boolean(url && key) });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!url || !key) {
    return res.status(500).json({ error: "Server is not configured", detail: "Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel, then Redeploy" });
  }

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Please log in again" });

  try {
    // 1. Find out who is asking, using their own login token
    const who = await fetch(url + "/auth/v1/user", {
      headers: { apikey: key, Authorization: "Bearer " + token },
    });
    if (!who.ok) return res.status(401).json({ error: "Please log in again", detail: "user check: " + (await detailOf(who)) });
    const user = await who.json();
    const uid = user && user.id;
    if (!uid) return res.status(401).json({ error: "Please log in again" });

    const admin = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };

    // 2. Delete all of their photo files
    for (let round = 0; round < 20; round++) {
      const list = await fetch(url + "/storage/v1/object/list/photos", {
        method: "POST",
        headers: admin,
        body: JSON.stringify({ prefix: uid, limit: 100, offset: 0 }),
      });
      if (!list.ok) return res.status(500).json({ error: "Could not delete photos", detail: "list: " + (await detailOf(list)) });
      const items = await list.json();
      const names = (Array.isArray(items) ? items : []).filter((i) => i && i.name).map((i) => uid + "/" + i.name);
      if (names.length === 0) break;
      const del = await fetch(url + "/storage/v1/object/photos", {
        method: "DELETE",
        headers: admin,
        body: JSON.stringify({ prefixes: names }),
      });
      if (!del.ok) return res.status(500).json({ error: "Could not delete photos", detail: "remove: " + (await detailOf(del)) });
    }

    // 3. Delete the account (profile and photo list rows are removed automatically)
    const rm = await fetch(url + "/auth/v1/admin/users/" + uid, { method: "DELETE", headers: admin });
    if (!rm.ok) return res.status(500).json({ error: "Could not delete account", detail: "delete user: " + (await detailOf(rm)) });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "Something went wrong", detail: String((e && e.message) || e) });
  }
};
