// Vercel serverless function: runs one face analysis.
// Environment Variables needed in Vercel:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (already added for delete-account)
//   GEMINI_API_KEY, GEMINI_MODEL              (GEMINI_MODEL example: gemini-3.5-flash-lite)

const PLAN_LIMITS = {
  free: { lifetime: 1, daily: 1 },
  pro: { monthly: 25, daily: 5 },
  premium: { monthly: 50, daily: 8 },
};

// Starting values for face-shape rules. Tune these after looking at real beta results.
const SHAPES = {
  Oval: { lw: 1.42, jaw: 0.78, fore: 0.76 },
  Round: { lw: 1.28, jaw: 0.80, fore: 0.76 },
  Square: { lw: 1.30, jaw: 0.88, fore: 0.80 },
  Oblong: { lw: 1.58, jaw: 0.80, fore: 0.78 },
  Heart: { lw: 1.38, jaw: 0.68, fore: 0.84 },
  Diamond: { lw: 1.42, jaw: 0.70, fore: 0.70 },
  Triangle: { lw: 1.34, jaw: 0.90, fore: 0.70 },
};

const SYSTEM = [
  "You are Facerizer, a grooming and style coach. You describe only what is visible in the photo and give friendly, practical grooming and styling suggestions.",
  "NEVER rate, rank or judge attractiveness or beauty. Never use words like attractive, beautiful, handsome, pretty, ugly or similar.",
  "NEVER guess or mention race, ethnicity, religion, caste, nationality, sexual orientation, political views, personality, intelligence, health, disability or age from the face.",
  "NEVER diagnose or name any skin or medical condition. For skin, describe only visible evenness, texture and dryness or oiliness in cosmetic terms, and give general cosmetic habits.",
  "NEVER recommend surgery, injections or medical procedures.",
  "Use gentle wording such as 'a potential area to refine', 'could be enhanced through styling' or 'may benefit from grooming'. Keep a positive, respectful tone.",
  "Respect the user's preferences if given. If no facial hair is visible, do not assume they want a beard; offer an optional 'explore facial-hair styles' tip instead.",
  "Treat the measured facts as correct and do not contradict them. Be specific and concise.",
  "Users are mostly in India. Use hairstyle and glasses names that a barber or optician in India would recognise. Common hair there is dark, straight or wavy, and often thick.",
  "Follow the user's styles_for preference (men's, women's or both). If it is empty, base the styles on the visible hair length and the other preferences, and make most of them suitable for anyone. Never state or guess the person's gender.",
  "Hairstyles must be clearly different from each other in length or structure, so the user has real choices to pick from. Each 'why' must refer to the measured face shape or to the visible hair. Respect the user's maintenance preference.",
  "Reply with ONLY one JSON object and nothing else.",
].join("\n");

const BANNED = /\b(ugly|hideous|unattractive|attractive|beautiful|handsome|pretty|sexy|gorgeous|fat|obese|disfigured|deformed|stupid|worthless)\b/i;
const MEDICAL = /\b(acne|pimples?|rosacea|melasma|eczema|psoriasis|dermatitis|cancer|tumou?rs?|disease|diseases|diagnos\w*|infection|syndrome|disorder|surgery|surgical|botox|fillers?|rhinoplasty)\b/i;
const SENSITIVE = /\b(ethnic\w*|race|racial|religio\w*|caste|politic\w*|personality|intelligen\w*|sexual orientation|nationality)\b/i;

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const closeness = (v, target, tol) => clamp(100 * (1 - Math.abs(v - target) / tol));

function validMetrics(m) {
  if (!m || typeof m !== "object") return null;
  const n = (v, lo, hi) => typeof v === "number" && isFinite(v) && v >= lo && v <= hi;
  const t = m.thirds;
  const ok = n(m.lw, 0.8, 2.5) && n(m.jaw, 0.4, 1.3) && n(m.fore, 0.4, 1.3) &&
    Array.isArray(t) && t.length === 3 && t.every((x) => n(x, 0.05, 0.8)) &&
    n(m.eyeSpacing, 0.3, 3) && n(m.mouth, 0.2, 1) && n(m.nose, 0.1, 0.6) && n(m.symmetry, 0, 100);
  return ok ? m : null;
}

function classifyShape(m) {
  const scored = Object.entries(SHAPES)
    .map(([name, t]) => ({
      name,
      d: Math.sqrt(((m.lw - t.lw) / 0.12) ** 2 + ((m.jaw - t.jaw) / 0.06) ** 2 + ((m.fore - t.fore) / 0.06) ** 2),
    }))
    .sort((a, b) => a.d - b.d);
  const margin = (scored[1].d - scored[0].d) / (scored[1].d + 0.0001);
  return { type: scored[0].name, confidence: Math.round(clamp(50 + margin * 120, 40, 95)) };
}

function computeScores(m) {
  const t = m.thirds;
  const dev = Math.abs(t[0] - 1 / 3) + Math.abs(t[1] - 1 / 3) + Math.abs(t[2] - 1 / 3);
  const harmony = clamp(100 - dev * 160);
  const eye = closeness(m.eyeSpacing, 1.0, 0.5);
  const mouthNose = closeness(m.mouth / m.nose, 1.55, 1.0);
  const proportion = Math.round((harmony * 2 + eye + mouthNose) / 4);
  const symmetry = Math.round(clamp(m.symmetry));
  return { overall: Math.round(0.5 * proportion + 0.5 * symmetry), harmony: Math.round(harmony), proportion, symmetry };
}

function buildPrompt(measured, prefs) {
  return [
    "Analyze the face in the photo for grooming and styling.",
    "",
    "Measured facts from facial landmarks (treat as correct):",
    JSON.stringify(measured),
    "",
    "User preferences (optional, may be empty):",
    JSON.stringify(prefs),
    "",
    "Return ONLY a JSON object with exactly this shape:",
    `{
  "summary": "2 friendly sentences about the overall balance and the best styling direction",
  "face_shape_estimate": "Oval|Round|Square|Oblong|Heart|Diamond|Triangle (only needed if no measured face_shape is given)",
  "strengths": [ { "icon": "jaw|eye|brow|skin|lips|nose|cheek|harmony", "title": "short", "text": "one sentence" } ],
  "improvements": [ { "title": "short, gentle wording", "text": "one sentence with a practical fix" } ],
  "features": {
    "eyes": { "observation": "", "suggestion": "", "confidence": "low|medium|high" },
    "eyebrows": { "observation": "", "suggestion": "", "confidence": "low|medium|high" },
    "nose": { "observation": "", "suggestion": "", "confidence": "low|medium|high" },
    "lips": { "observation": "", "suggestion": "", "confidence": "low|medium|high" },
    "jawline": { "observation": "", "suggestion": "", "confidence": "low|medium|high" },
    "chin": { "observation": "", "suggestion": "", "confidence": "low|medium|high" },
    "cheekbones": { "observation": "", "suggestion": "", "confidence": "low|medium|high" },
    "skin_appearance": { "observation": "visible, cosmetic only", "suggestion": "general habit", "confidence": "low|medium|high" }
  },
  "visible_hair": { "type": "straight|wavy|curly|coily|unclear", "length": "short|medium|long|unclear", "density": "thin|medium|thick|unclear", "hairline": "one short note, or unclear" },
  "hairstyles": [ { "category": "Everyday|Trendy|Professional|Low-maintenance|Bold", "name": "", "why": "why it suits this face shape and this hair", "ask_barber": "one sentence the user can say to a barber or stylist", "maintenance": "low|medium|high", "styling": "easy|moderate|hard", "length": "short|medium|long" } ],
  "glasses": [ { "shape": "Round|Square|Rectangle|Aviator|Cat-eye|Browline", "why": "", "tier": "best|try" } ],
  "grooming": [ { "title": "", "text": "" } ],
  "skincare": { "morning": ["gentle cleanser", "moisturizer", "sunscreen"], "evening": ["gentle cleanser", "moisturizer"], "note": "General cosmetic guidance only." },
  "plan": [ { "week": 1, "title": "Grooming", "tasks": ["", ""] }, { "week": 2, "title": "Skin and self-care", "tasks": [] }, { "week": 3, "title": "Hair and styling", "tasks": [] }, { "week": 4, "title": "Presentation", "tasks": [] } ]
}`,
    "",
    "Counts: 4 strengths, 3 improvements, 4 grooming tips, 4 plan weeks with 3 to 5 small daily-life tasks each.",
    "Hairstyles: exactly 5, in this order and one per category: Everyday, Trendy, Professional, Low-maintenance, Bold. They must differ from each other in length or structure. First fill visible_hair from what you can see, then choose styles that work with that hair.",
    "Glasses: 3 different shapes. First a safe classic (tier best), then a modern choice (tier best), then one to experiment with (tier try). In each 'why' mention frame size relative to the face and a suitable frame colour or material.",
  ].join("\n");
}

function normalise(a) {
  const arr = (x) => (Array.isArray(x) ? x : []);
  const str = (x, n = 400) => (typeof x === "string" ? x.trim().slice(0, n) : "");
  const pick = (x, list, fallback) => (list.includes(x) ? x : fallback);
  const feat = (f) => ({
    observation: str(f && f.observation, 300),
    suggestion: str(f && f.suggestion, 300),
    confidence: pick(f && f.confidence, ["low", "medium", "high"], "medium"),
  });
  const features = {};
  ["eyes", "eyebrows", "nose", "lips", "jawline", "chin", "cheekbones", "skin_appearance"].forEach((k) => {
    features[k] = feat((a.features || {})[k]);
  });
  const out = {
    summary: str(a.summary, 500),
    face_shape_estimate: str(a.face_shape_estimate, 20),
    strengths: arr(a.strengths).slice(0, 5).map((s) => ({ icon: str(s.icon, 12) || "harmony", title: str(s.title, 70), text: str(s.text, 220) })).filter((s) => s.title),
    improvements: arr(a.improvements).slice(0, 4).map((s) => ({ title: str(s.title, 70), text: str(s.text, 240) })).filter((s) => s.title),
    features,
    visible_hair: {
      type: pick(a.visible_hair && a.visible_hair.type, ["straight", "wavy", "curly", "coily", "unclear"], "unclear"),
      length: pick(a.visible_hair && a.visible_hair.length, ["short", "medium", "long", "unclear"], "unclear"),
      density: pick(a.visible_hair && a.visible_hair.density, ["thin", "medium", "thick", "unclear"], "unclear"),
      hairline: str(a.visible_hair && a.visible_hair.hairline, 80),
    },
    hairstyles: arr(a.hairstyles).slice(0, 5).map((h) => ({
      category: pick(h.category, ["Everyday", "Trendy", "Professional", "Low-maintenance", "Bold"], "Everyday"),
      name: str(h.name, 60), why: str(h.why, 240), ask_barber: str(h.ask_barber, 220),
      maintenance: pick(h.maintenance, ["low", "medium", "high"], "medium"),
      styling: pick(h.styling, ["easy", "moderate", "hard"], "moderate"),
      length: pick(h.length, ["short", "medium", "long"], "short"),
    })).filter((h) => h.name),
    glasses: arr(a.glasses).slice(0, 4).map((g) => ({ shape: str(g.shape, 20), why: str(g.why, 220), tier: pick(g.tier, ["best", "try"], "best") })).filter((g) => g.shape),
    grooming: arr(a.grooming).slice(0, 5).map((g) => ({ title: str(g.title, 70), text: str(g.text, 260) })).filter((g) => g.title),
    skincare: {
      morning: arr(a.skincare && a.skincare.morning).slice(0, 6).map((x) => str(x, 120)).filter(Boolean),
      evening: arr(a.skincare && a.skincare.evening).slice(0, 6).map((x) => str(x, 120)).filter(Boolean),
      note: "General cosmetic guidance only. Consult a qualified dermatologist for persistent or concerning skin issues.",
    },
    plan: arr(a.plan).slice(0, 4).map((w, i) => ({ week: i + 1, title: str(w.title, 50), tasks: arr(w.tasks).slice(0, 6).map((t) => str(t, 160)).filter(Boolean) })).filter((w) => w.title),
  };
  if (!out.hairstyles.length || !out.strengths.length || !out.glasses.length || !out.grooming.length) throw new Error("ai_incomplete");
  return out;
}

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

async function callGemini({ key, model, b64, prompt, extra }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000);
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: prompt + (extra ? "\n\n" + extra : "") }, { inline_data: { mime_type: "image/jpeg", data: b64 } }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 6000, responseMimeType: "application/json" },
      }),
    });
    if (!r.ok) throw new Error("ai_http_" + r.status + ": " + (await r.text()).slice(0, 220));
    const j = await r.json();
    const cand = j.candidates && j.candidates[0];
    if (!cand || !cand.content) throw new Error("ai_empty: " + ((j.promptFeedback && j.promptFeedback.blockReason) || (cand && cand.finishReason) || "no content"));
    const text = (cand.content.parts || []).map((p) => p.text || "").join("").replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    const u = j.usageMetadata || {};
    return {
      data: JSON.parse(text),
      usage: { prompt: u.promptTokenCount || 0, output: u.candidatesTokenCount || 0, thoughts: u.thoughtsTokenCount || 0 },
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  const SB = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const GKEY = process.env.GEMINI_API_KEY;
  const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  if (req.method === "GET") {
    return res.status(200).json({ status: "ready", supabase: Boolean(SB && KEY), gemini: Boolean(GKEY), model: MODEL });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!SB || !KEY || !GKEY) {
    return res.status(500).json({ error: "Server is not configured", detail: "Check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY in Vercel, then Redeploy" });
  }

  const rest = (path, init = {}) =>
    fetch(SB + "/rest/v1/" + path, {
      ...init,
      headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", ...(init.headers || {}) },
    });

  let analysisId = null;
  const usageTotal = { prompt: 0, output: 0, thoughts: 0, calls: 0 };
  const failWith = async (status, error, detail) => {
    if (analysisId) {
      const patch = { status: "failed", error: String(detail || error).slice(0, 300) };
      if (usageTotal.calls > 0) patch.usage = usageTotal;
      await rest("analyses?id=eq." + analysisId, { method: "PATCH", body: JSON.stringify(patch) }).catch(() => {});
    }
    return res.status(status).json({ error, detail: detail ? String(detail).slice(0, 220) : undefined });
  };

  try {
    // 1. Who is asking
    const token = (req.headers.authorization || "").replace(/^Bearer /, "");
    if (!token) return res.status(401).json({ error: "Please log in again" });
    const who = await fetch(SB + "/auth/v1/user", { headers: { apikey: KEY, Authorization: "Bearer " + token } });
    if (!who.ok) return res.status(401).json({ error: "Please log in again" });
    const user = await who.json();
    const uid = user && user.id;
    if (!uid) return res.status(401).json({ error: "Please log in again" });
    if (!user.email_confirmed_at) return res.status(403).json({ error: "Please verify your email first" });

    // 2. Input
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};
    const photoId = typeof body.photo_id === "string" ? body.photo_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(photoId)) return res.status(400).json({ error: "Photo not found" });
    const metrics = validMetrics(body.metrics);

    // 3. Profile, 18+ and consent
    const pr = await rest("profiles?id=eq." + uid + "&select=plan,age_confirmed_at,consent_at,age_range,hair_preference,facial_hair_preference,style_preference,style_for,maintenance_preference");
    const profile = ((await pr.json()) || [])[0];
    if (!profile) return res.status(403).json({ error: "Profile not found" });
    if (!profile.age_confirmed_at || !profile.consent_at) return res.status(403).json({ error: "Please confirm 18+ and consent in your dashboard first" });
    const plan = PLAN_LIMITS[profile.plan] ? profile.plan : "free";
    const limits = PLAN_LIMITS[plan];

    // 4. The photo must belong to this user
    const phr = await rest("photos?id=eq." + photoId + "&user_id=eq." + uid + "&select=id,path");
    const photo = ((await phr.json()) || [])[0];
    if (!photo) return res.status(404).json({ error: "Photo not found" });

    // 5. Reserve one analysis, then count (so two taps at once cannot beat the limit)
    const ins = await rest("analyses", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ user_id: uid, photo_id: photoId, status: "processing", plan, model: MODEL }),
    });
    if (!ins.ok) return res.status(500).json({ error: "Could not start the analysis", detail: (await ins.text()).slice(0, 200) });
    analysisId = ((await ins.json()) || [])[0].id;

    const now = Date.now();
    const periodStart = limits.lifetime ? null : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
    const q = "analyses?user_id=eq." + uid + "&status=in.(done,processing)&select=id,status,created_at&limit=500" + (periodStart ? "&created_at=gte." + encodeURIComponent(periodStart) : "");
    const used = ((await (await rest(q)).json()) || []).filter((r) => r.status === "done" || now - new Date(r.created_at).getTime() < 5 * 60 * 1000);
    const dayCount = used.filter((r) => now - new Date(r.created_at).getTime() < 24 * 3600 * 1000).length;
    const cap = limits.lifetime || limits.monthly;
    if (used.length > cap || dayCount > limits.daily) {
      await rest("analyses?id=eq." + analysisId, { method: "DELETE" }).catch(() => {});
      analysisId = null;
      const msg = limits.lifetime ? "Your free analysis has been used. Upgrade to Pro for 25 analyses a month." : used.length > cap ? "You have used all analyses for this month." : "You have reached today's limit. Please try again tomorrow.";
      return res.status(403).json({ error: "limit", message: msg, plan });
    }

    // 6. Fetch the photo file
    const file = await fetch(SB + "/storage/v1/object/authenticated/photos/" + photo.path.split("/").map(encodeURIComponent).join("/"), {
      headers: { apikey: KEY, Authorization: "Bearer " + KEY },
    });
    if (!file.ok) return failWith(500, "Could not read your photo", "storage " + file.status);
    const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");

    // 7. Measured facts
    let shape = null, scores = null;
    const measured = {};
    if (metrics) {
      shape = classifyShape(metrics);
      scores = computeScores(metrics);
      measured.face_shape = shape.type;
      measured.length_to_width = +metrics.lw.toFixed(2);
      measured.jaw_to_cheek_width = +metrics.jaw.toFixed(2);
      measured.forehead_to_cheek_width = +metrics.fore.toFixed(2);
      measured.face_thirds_upper_mid_lower = metrics.thirds.map((x) => +x.toFixed(2));
      measured.eye_spacing_ratio = +metrics.eyeSpacing.toFixed(2);
      measured.symmetry_estimate = Math.round(metrics.symmetry);
    } else {
      measured.note = "No measurements available. Estimate the face shape visually and put it in face_shape_estimate.";
    }
    const prefs = {
      age_range: profile.age_range || null,
      hair_preference: profile.hair_preference || null,
      facial_hair_preference: profile.facial_hair_preference || null,
      style_preference: profile.style_preference || null,
      styles_for: ({ men: "men's styles", women: "women's styles", both: "both men's and women's styles" })[profile.style_for] || null,
      maintenance_preference: profile.maintenance_preference || null,
    };
    const prompt = buildPrompt(measured, prefs);

    // 8. Ask the AI (one retry if the wording is unsafe or the JSON is broken)
    let full = null, extra = "", lastErr = "";
    for (let attempt = 0; attempt < 2 && !full; attempt++) {
      try {
        const out = await callGemini({ key: GKEY, model: MODEL, b64, prompt, extra });
        usageTotal.prompt += out.usage.prompt; usageTotal.output += out.usage.output; usageTotal.thoughts += out.usage.thoughts; usageTotal.calls += 1;
        const cleaned = normalise(out.data);
        const bad = unsafeWord(cleaned);
        if (bad) { lastErr = "unsafe_word"; extra = "Your previous answer used the word '" + bad + "', which is not allowed. Rewrite without it and follow every rule."; continue; }
        full = cleaned;
      } catch (e) {
        lastErr = String(e.message || e);
        if (/ai_http_(400|401|403|404)/.test(lastErr)) break; // retrying will not help
      }
    }
    if (!full) {
      const hint = /ai_http_(401|403)/.test(lastErr) ? "The AI key was rejected" : /ai_http_404/.test(lastErr) ? "The AI model name was not found" : /ai_http_429/.test(lastErr) ? "The AI is busy or the free limit is reached. Please try again later" : "The analysis could not be completed. Please try another clear photo";
      return failWith(502, hint, lastErr);
    }

    // 9. Build the result
    const faceShape = shape || { type: full.face_shape_estimate || "Oval", confidence: 55 };
    const core = {
      plan,
      score: scores ? scores.overall : null,
      sub_scores: scores ? { harmony: scores.harmony, proportion: scores.proportion, symmetry: scores.symmetry } : null,
      face_shape: faceShape,
      summary: full.summary,
      visible_hair: full.visible_hair,
    };
    const fullResult = { ...core, strengths: full.strengths, improvements: full.improvements, features: full.features, hairstyles: full.hairstyles, glasses: full.glasses, grooming: full.grooming, skincare: full.skincare, plan_weeks: full.plan };
    const visible = plan === "free"
      ? { ...core, strengths: full.strengths.slice(0, 3), hairstyles: full.hairstyles.slice(0, 2), glasses: full.glasses.slice(0, 2), grooming: full.grooming.slice(0, 2) }
      : fullResult;

    const up = await rest("analyses?id=eq." + analysisId, {
      method: "PATCH",
      body: JSON.stringify({ status: "done", result: visible, result_full: fullResult, usage: usageTotal, error: null }),
    });
    if (!up.ok) return failWith(500, "Could not save your report", "save " + up.status);

    return res.status(200).json({ ok: true, id: analysisId });
  } catch (e) {
    return failWith(500, "Something went wrong. Please try again.", String((e && e.message) || e));
  }
};
