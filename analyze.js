/* Facerizer M3: photo picker + on-device quality checks.
   Nothing is uploaded here. The checked photo is kept in memory for the next modules. */

const cfg = window.FACERIZER || {};
const $ = (id) => document.getElementById(id);

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIDE = 1024;          // photo is shrunk to this before any AI use
const MIN_SIDE = 400;           // smallest accepted original (px)
const DARK_MAX = 55;            // average brightness below this = too dark (0-255)
const BRIGHT_MIN = 215;         // average brightness above this = too bright
const BLUR_MIN = 15;            // sharpness score below this = too blurry (tunable)
const FACE_MIN_RATIO = 0.25;    // face width must be at least 25% of photo width
const FACE_MIN_SCORE = 0.6;     // detector confidence
const YAW_MAX = 0.4;            // head turned left/right
const TILT_MAX = 0.3;           // head tilted

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
const LIB = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm";

let detector = null;
let sb = null;
let uid = null;
let previewUrl = null;
window.facerizerPhoto = null; // { blob, width, height } after all checks pass

function say(text, type) {
  const el = $("msg");
  el.textContent = text || "";
  el.className = "msg " + (type || "");
}

function renderChecks(items) {
  const ul = $("checks");
  ul.textContent = "";
  items.forEach((it) => {
    const li = document.createElement("li");
    li.className = it.state; // pass | fail | skip
    const mark = document.createElement("span");
    mark.className = "mark";
    mark.textContent = it.state === "pass" ? "✓" : it.state === "fail" ? "✕" : "–";
    const body = document.createElement("span");
    body.textContent = it.label;
    if (it.note) {
      const n = document.createElement("span");
      n.className = "note";
      n.textContent = it.note;
      body.appendChild(n);
    }
    li.appendChild(mark);
    li.appendChild(body);
    ul.appendChild(li);
  });
}

function setBusy(on) {
  $("pick").classList.toggle("busy", on);
}

async function requireLogin() {
  const ok = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes("YOUR_") && window.supabase;
  if (!ok) return true; // setup not finished: let the page work for testing
  sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const { data } = await sb.auth.getSession();
  if (!data.session) {
    window.location.href = "/login";
    return false;
  }
  uid = data.session.user.id;
  const p = await sb.from("profiles").select("age_confirmed_at, consent_at").eq("id", uid).maybeSingle();
  if (p.data && (!p.data.age_confirmed_at || !p.data.consent_at)) {
    window.location.href = "/account"; // dashboard asks for 18+ and consent first
    return false;
  }
  return true;
}

async function savePhoto(btn) {
  const photo = window.facerizerPhoto;
  if (!photo || !sb || !uid) return say("Please log in and try again.", "error");
  btn.disabled = true;
  say("Saving your photo privately...");
  const path = uid + "/" + crypto.randomUUID() + ".jpg";
  const up = await sb.storage.from("photos").upload(path, photo.blob, { contentType: "image/jpeg", upsert: false });
  if (up.error) {
    console.error(up.error);
    btn.disabled = false;
    return say("Could not save the photo. Run m4-setup.sql in Supabase and try again.", "error");
  }
  const ins = await sb.from("photos").insert({ user_id: uid, path: path, width: photo.width, height: photo.height, bytes: photo.blob.size });
  if (ins.error) {
    console.error(ins.error);
    await sb.storage.from("photos").remove([path]);
    btn.disabled = false;
    if (/limit/i.test(ins.error.message)) return say("You can keep up to 10 photos. Delete one in your dashboard first.", "error");
    return say("Could not save the photo. Please try again.", "error");
  }
  $("result").textContent = "";
  say("Saved privately. Only you can see it. Analysis arrives in the next update, and you can delete this photo any time from your dashboard.", "ok");
  const a = document.createElement("a");
  a.href = "/account#photos";
  a.className = "btn btn-outline btn-lg";
  a.style.width = "100%";
  a.textContent = "Go to my dashboard";
  $("result").appendChild(a);
}

async function getDetector() {
  if (detector) return detector;
  const lib = await import(LIB);
  const fileset = await lib.FilesetResolver.forVisionTasks(WASM);
  detector = await lib.FaceDetector.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
    runningMode: "IMAGE",
    minDetectionConfidence: 0.5,
  });
  return detector;
}

async function decode(file) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch (e) { /* fall through */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
    img.src = url;
  });
}

function drawScaled(src, w, h) {
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const cw = Math.round(w * scale), ch = Math.round(h * scale);
  const c = document.createElement("canvas");
  c.width = cw; c.height = ch;
  c.getContext("2d").drawImage(src, 0, 0, cw, ch);
  return c;
}

function grayscale(canvas, targetW) {
  const scale = targetW / canvas.width;
  const w = targetW, h = Math.max(8, Math.round(canvas.height * scale));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const g = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    g[p] = y; sum += y;
  }
  return { g, w, h, mean: sum / g.length };
}

function sharpness(g, w, h) {
  // Variance of the Laplacian: low value = blurry.
  let s = 0, s2 = 0, n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = g[i - 1] + g[i + 1] + g[i - w] + g[i + w] - 4 * g[i];
      s += lap; s2 += lap * lap; n++;
    }
  }
  const mean = s / n;
  return s2 / n - mean * mean;
}

async function handleFile(file) {
  if (!file) return;
  window.facerizerPhoto = null;
  $("result").textContent = "";
  say("");
  renderChecks([]);

  // 1. File type and size
  if (!ALLOWED.includes(file.type)) {
    renderChecks([{ state: "fail", label: "File type", note: "Please use a JPG, PNG or WebP photo." }]);
    return say("This file type is not supported. Please choose a JPG, PNG or WebP photo.", "error");
  }
  if (file.size > MAX_BYTES) {
    renderChecks([{ state: "fail", label: "File size", note: "The photo is larger than 10 MB." }]);
    return say("This photo is too large. Please choose one under 10 MB.", "error");
  }

  setBusy(true);
  say("Checking your photo...");

  let bmp;
  try { bmp = await decode(file); }
  catch (e) {
    setBusy(false);
    renderChecks([{ state: "fail", label: "Open photo", note: "We could not read this image." }]);
    return say("We could not open this photo. Please try another one.", "error");
  }

  const ow = bmp.width, oh = bmp.height;
  const canvas = drawScaled(bmp, ow, oh);

  // Show preview
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  const prevBlob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.8));
  previewUrl = URL.createObjectURL(prevBlob);
  const pv = $("preview");
  pv.src = previewUrl;
  pv.style.display = "block";

  const items = [];
  let allOk = true;
  const add = (state, label, note) => { items.push({ state, label, note }); if (state === "fail") allOk = false; };

  add("pass", "File type and size");

  // 2. Resolution
  if (Math.min(ow, oh) < MIN_SIDE) add("fail", "Resolution", "The photo is too small. Please use a clearer, higher-resolution photo.");
  else add("pass", "Resolution");

  // 3. Lighting and sharpness
  const gs = grayscale(canvas, 320);
  if (gs.mean < DARK_MAX) add("fail", "Lighting", "The photo is too dark. Try natural light facing a window.");
  else if (gs.mean > BRIGHT_MIN) add("fail", "Lighting", "The photo is too bright. Avoid strong direct light or glare.");
  else add("pass", "Lighting");

  if (sharpness(gs.g, gs.w, gs.h) < BLUR_MIN) add("fail", "Sharpness", "The photo looks blurry. Hold steady and tap to focus.");
  else add("pass", "Sharpness");

  // 4. Face checks
  let faces = null;
  try {
    const det = await getDetector();
    faces = det.detect(canvas).detections || [];
  } catch (e) {
    console.error(e);
    add("fail", "Face check", "The face checker could not load. Check your internet and try again.");
  }

  if (faces) {
    if (faces.length === 0) {
      add("fail", "Face found", "We could not find a face. Face the camera with your whole face visible.");
    } else if (faces.length > 1) {
      add("fail", "One face only", "More than one face was found. Please use a photo of only you.");
    } else {
      const f = faces[0];
      const bb = f.boundingBox;
      const score = (f.categories && f.categories[0] && f.categories[0].score) || 0;
      add("pass", "Face found");
      add("pass", "One face only");

      if (score < FACE_MIN_SCORE) add("fail", "Face clarity", "Your face is unclear or partly covered. Remove sunglasses, masks or hair over your face.");
      else add("pass", "Face clarity");

      if (bb.width / canvas.width < FACE_MIN_RATIO) add("fail", "Face size", "Your face is too small in the photo. Move closer to the camera.");
      else add("pass", "Face size");

      const m = 0.02;
      const cut = bb.originX < -m * canvas.width || bb.originY < -m * canvas.height ||
        bb.originX + bb.width > (1 + m) * canvas.width || bb.originY + bb.height > (1 + m) * canvas.height;
      if (cut) add("fail", "Whole face visible", "Part of your face is cut off. Keep your whole face inside the photo.");
      else add("pass", "Whole face visible");

      // Head direction from key points (right eye, left eye, nose tip)
      const k = f.keypoints || [];
      if (k.length >= 3) {
        const eyeDist = Math.hypot(k[0].x - k[1].x, k[0].y - k[1].y) || 0.0001;
        const midX = (k[0].x + k[1].x) / 2;
        const yaw = Math.abs((k[2].x - midX) / eyeDist);
        const tilt = Math.abs((k[0].y - k[1].y) / eyeDist);
        if (yaw > YAW_MAX || tilt > TILT_MAX) add("fail", "Facing the camera", "Please look straight at the camera and keep your head level.");
        else add("pass", "Facing the camera");
      }
    }
  }

  renderChecks(items);
  setBusy(false);

  if (!allOk) {
    return say("This photo needs a change. Fix the items marked ✕ and try again.", "error");
  }

  // 5. Final compressed copy, kept in memory for the next modules
  const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  window.facerizerPhoto = { blob, width: canvas.width, height: canvas.height };
  say("Great photo. It passed all checks.", "ok");
  const res = $("result");
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn btn-primary btn-lg";
  b.style.width = "100%";
  b.textContent = "Save this photo";
  b.addEventListener("click", function () { savePhoto(b); });
  res.appendChild(b);
}

async function main() {
  if (!(await requireLogin())) return;
  ["cam", "up"].forEach((id) => {
    $(id).addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = "";
      handleFile(f);
    });
  });
}
main();
