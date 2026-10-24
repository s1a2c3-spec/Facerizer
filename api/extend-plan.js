// Vercel serverless function: creates the 60 and 90-day plan (months 2 and 3) for a Premium user.
// Uses only the text of the person's report (no photo is sent). Needs the same Environment Variables as analyze.js.

const SYSTEM = [
  "You are Facerizer, a grooming and style coach. You write practical, friendly habit plans for adults.",
  "NEVER rate or judge attractiveness. Never use words like attractive, beautiful, handsome, pretty or ugly.",
  "NEVER mention or guess race, ethnicity, religion, caste, personality, intelligence, health or age.",
  "NEVER diagnose or name any skin or medical condition, and never recommend surgery, injections or medical procedures. Skin advice is general and cosmetic only.",
  "Keep every task small (5 to 15 minutes), clear and doable. Use a positive, respectful tone.",
  "Reply with ONLY one JSON object and nothing else.",
].join("\n");

const BANNED = /\b(ugly|hideous|unattractive|attractive|beautiful|handsome|pretty|sexy|gorgeous|fat|obese|disfigured|deformed|stupid|worthless)\b/i;
const MEDICAL = /\b(acne|pimples?|rosacea|melasma|eczema|psoriasis|dermatitis|cancer|tumou?rs?|disease|diseases|diagnos\w*|infection|syndrome|disorder|surgery|surgical|botox|fillers?|rhinoplasty)\b/i;
const SENSITIVE = /\b(ethnic\w*|race|racial|religio\w*|caste|politic\w*|personality|intelligen\w*|sexual orientation|nationality)\b/i;

function flatten(o, acc = []) {
  if (typeof o === "string") acc.push(o);
  else if (Array.isArray(o)) o.forEach((x) => flatten(x, acc));
  else if (o && typeof o === "object") Object.values(o).forEach((x) => flatten(x, acc));
  return acc;
}
function unsafeWord(obj) {
  const text = flatten(obj).join(" \n ");
  const m = text.match(BANNED) || text.match(MEDICAL) || text.match(SENSITIVE);
  return m ? m[0] : null;
}

function buildPrompt(ctx) {
  return [
    "A Premium user finished (or is finishing) a 30-day grooming and style plan. Write the next two months.",
    "Month 2 (weeks 5 to 8) is about making the habits stick and refining. Month 3 (weeks 9 to 12) is about locking it in: a maintenance calendar, small experiments (for example a new frame shape or a small brow change), and a final review at day 90.",
    "",
    "What we know about this person (from their report text):",
    JSON.stringify(ctx),
    "",
    "Return ONLY a JSON object with exactly this shape:",
    `{
  "month2": { "theme": "short phrase", "intro": "1 or 2 friendly sentences", "weeks": [ { "week": 5, "title": "", "tasks": ["", ""] }, { "week": 6, "title": "", "tasks": [] }, { "week": 7, "title": "", "tasks": [] }, { "week": 8, "title": "", "tasks": [] } ] },
  "month3": { "theme": "short phrase", "intro": "1 or 2 friendly sentences", "weeks": [ { "week": 9, "title": "", "tasks": [] }, { "week": 10, "title": "", "tasks": [] }, { "week": 11, "title": "", "tasks": [] }, { "week": 12, "title": "", "tasks": [] } ] },
  "keep_going": [ { "title": "", "text": "" } ]
}`,
    "Each week has 3 to 5 tasks. Include the haircut touch-up timing and a trimming routine that fit their recommended hairstyles and grooming tips, keep the daily skincare habit going, and end week 12 with a review and a new analysis. keep_going has exactly 4 tips for after day 90.",
  ].join("\n");
}

function normalise(a) {
  const arr = (x) => (Array.isArray(x) ? x : []);
  const str = (x, n = 300) => (typeof x === "string" ? x.trim().slice(0, n) : "");
  const month = (m, first) => {
    const weeks = arr(m && m.weeks).slice(0, 4).map((w, i) => ({
      week: first + i,
      title: str(w.title, 60),
      tasks: arr(w.tasks).slice(0, 6).map((t) => str(t, 180)).filter(Boolean),
    })).filter((w) => w.title && w.tasks.length);
    if (weeks.length !== 4) throw new Error("plan_incomplete");
    return { theme: str(m.theme, 80), intro: str(m.intro, 300), weeks };
  };
  return {
    month2: month(a.month2, 5),
    month3: month(a.month3, 9),
    keep_going: arr(a.keep_going).slice(0, 5).map((k) => ({ title: str(k.title, 70), text: str(k.text, 240) })).filter((k) => k.title),
  };
}

async function callGemini(key, model, prompt, extra) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000);
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: prompt + (extra ? "\n\n" + extra : "") }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 6000, responseMimeType: "application/json" },
      }),
    });
    if (!r.ok) throw new Error("ai_http_" + r.status + ": " + (await r.text()).slice(0, 200));
    const j = await r.json();
    const cand = j.candidates && j.candidates[0];
    if (!cand || !cand.content) throw new Error("ai_empty: " + ((j.promptFeedback && j.promptFeedback.blockReason) || (cand && cand.finishReason) || "no content"));
    const text = (cand.content.parts || []).map((p) => p.text || "").join("").replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    const u = j.usageMetadata || {};
    return { data: JSON.parse(text), usage: { prompt: u.promptTokenCount || 0, output: u.candidatesTokenCount || 0, thoughts: u.thoughtsTokenCount || 0 } };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  const SB = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const GKEY = process.env.GEMINI_API_KEY;
  const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  if (req.method === "GET") return res.status(200).json({ status: "ready", supabase: Boolean(SB && KEY), gemini: Boolean(GKEY), model: MODEL });
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ error: "Method not allowed" }); }
  if (!SB || !KEY || !GKEY) return res.status(500).json({ error: "Server is not configured" });

  const rest = (path, init = {}) =>
    fetch(SB + "/rest/v1/" + path, { ...init, headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", ...(init.headers || {}) } });

  try {
    const token = (req.headers.authorization || "").replace(/^Bearer /, "");
    if (!token) return res.status(401).json({ error: "Please log in again" });
    const who = await fetch(SB + "/auth/v1/user", { headers: { apikey: KEY, Authorization: "Bearer " + token } });
    if (!who.ok) return res.status(401).json({ error: "Please log in again" });
    const user = await who.json();
    const uid = user && user.id;
    if (!uid) return res.status(401).json({ error: "Please log in again" });

    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const analysisId = body && typeof body.analysis_id === "string" ? body.analysis_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(analysisId)) return res.status(400).json({ error: "Report not found" });

    const pr = await rest("profiles?id=eq." + uid + "&select=plan,age_range,hair_preference,facial_hair_preference,style_preference,maintenance_preference");
    const profile = ((await pr.json()) || [])[0];
    if (!profile) return res.status(403).json({ error: "Profile not found" });
    if (profile.plan !== "premium") return res.status(403).json({ error: "premium_only", message: "The 60 and 90-day plans are part of Premium." });

    const ar = await rest("analyses?id=eq." + analysisId + "&user_id=eq." + uid + "&status=eq.done&select=id,result,result_full,plan_ext");
    const analysis = ((await ar.json()) || [])[0];
    if (!analysis) return res.status(404).json({ error: "Report not found" });
    if (analysis.plan_ext) return res.status(200).json({ ok: true, existing: true });

    const r = analysis.result_full || analysis.result || {};
    const ctx = {
      face_shape: r.face_shape && r.face_shape.type,
      visible_hair: r.visible_hair,
      strengths: (r.strengths || []).map((s) => s.title),
      recommended_hairstyles: (r.hairstyles || []).map((h) => h.name + " (" + (h.category || "") + ", upkeep " + h.maintenance + ")"),
      grooming_tips: (r.grooming || []).map((g) => g.title),
      first_30_days: (r.plan_weeks || []).map((w) => "Week " + w.week + ": " + w.title),
      preferences: {
        hair: profile.hair_preference || null, facial_hair: profile.facial_hair_preference || null,
        style: profile.style_preference || null, upkeep: profile.maintenance_preference || null,
      },
    };
    const prompt = buildPrompt(ctx);

    let ext = null, extra = "", lastErr = "";
    const usage = { prompt: 0, output: 0, thoughts: 0, calls: 0 };
    for (let attempt = 0; attempt < 2 && !ext; attempt++) {
      try {
        const out = await callGemini(GKEY, MODEL, prompt, extra);
        usage.prompt += out.usage.prompt; usage.output += out.usage.output; usage.thoughts += out.usage.thoughts; usage.calls += 1;
        const cleaned = normalise(out.data);
        const bad = unsafeWord(cleaned);
        if (bad) { lastErr = "unsafe_word"; extra = "Your previous answer used the word '" + bad + "', which is not allowed. Rewrite without it."; continue; }
        ext = cleaned;
      } catch (e) {
        lastErr = String(e.message || e);
        if (/ai_http_(400|401|403|404)/.test(lastErr)) break;
      }
    }
    if (!ext) {
      const hint = /ai_http_(401|403)/.test(lastErr) ? "The AI key was rejected" : /ai_http_429/.test(lastErr) ? "The AI is busy. Please try again in a minute" : "The plan could not be created. Please try again";
      return res.status(502).json({ error: hint, detail: lastErr.slice(0, 200) });
    }

    ext.usage = usage;
    ext.created_at = new Date().toISOString();
    const up = await rest("analyses?id=eq." + analysisId, { method: "PATCH", body: JSON.stringify({ plan_ext: ext }) });
    if (!up.ok) return res.status(500).json({ error: "Could not save your plan", detail: (await up.text()).slice(0, 200) });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "Something went wrong. Please try again.", detail: String((e && e.message) || e).slice(0, 200) });
  }
};
