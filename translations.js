/* Facerizer translations: English + Hinglish (Roman script, "aap" tone).
 *
 * NOT linked from any page yet (Phase 1). Later phases add:  <script src="/translations.js"></script>
 * Language is saved in localStorage key "fz_lang" ("en" or "hinglish"). Default is English.
 * Missing Hinglish text falls back to English, so nothing can show up blank.
 *
 * Use in HTML:   <h2 data-i18n="menu.explore"></h2>
 *                <button data-i18n-attr="aria-label:common.close"></button>
 * Use in JS:     FZ_I18N.t("journey.streak", { n: 5 })
 * Switch:        FZ_I18N.setLang("hinglish")      (fires a "fz:lang" event on document)
 *
 * Style rules for Hinglish are in docs/hinglish-style-guide.md. All text here is a DRAFT until reviewed.
 * Texts marked (check) describe behaviour that is decided in a later phase: re-read them before using.
 */
(function () {
  "use strict";
  var KEY = "fz_lang", LANGS = ["en", "hinglish"], DEFAULT = "en";

  var S = {
    en: {
      "common.free": "Free", "common.pro": "Pro", "common.premium": "Premium", "common.plan": "Plan", "common.report": "Report",
      "common.download": "Download", "common.close": "Close", "common.cancel": "Cancel", "common.confirm": "Confirm",
      "common.back": "Back", "common.next": "Next", "common.save": "Save", "common.loading": "Loading...",
      "common.try_again": "Try again", "common.language": "Language", "common.lang_en": "English", "common.lang_hinglish": "Hinglish",
      "common.open_menu": "Open menu", "common.close_menu": "Close menu", "common.ai_estimate": "AI estimate",

      "menu.explore": "Explore", "menu.how_it_works": "How it works", "menu.features": "Features", "menu.faq": "FAQ",
      "menu.pricing": "Pricing", "menu.face_shapes": "Face shapes", "menu.face_exercises": "Face exercises", "menu.example_report": "Example report",
      "menu.company": "Company", "menu.about": "About us", "menu.contact": "Contact",
      "menu.policies": "Policies", "menu.privacy": "Privacy Policy", "menu.terms": "Terms of Service", "menu.refund": "Refund Policy", "menu.delivery": "Delivery Policy",
      "menu.your_data": "Your data", "menu.delete_photos": "Delete all photos", "menu.delete_account": "Delete my account",
      "menu.my_account": "My account", "menu.log_in": "Log in", "menu.sign_up": "Sign up", "menu.log_out": "Log out",
      "menu.delete_photos_title": "Delete all your photos?", "menu.delete_photos_text": "Your uploaded photos will be removed. This cannot be undone.",
      "menu.delete_account_title": "Delete your account?", "menu.delete_account_text": "Your account and the data linked to it will be deleted. This cannot be undone. (check)",
      "menu.delete_photos_yes": "Yes, delete all photos", "menu.delete_account_yes": "Yes, delete my account",

      "analyze.title": "Analyze your face", "analyze.start": "Analyze my face", "analyze.report_language": "Report language",
      "analyze.working": "Analyzing your photo. This takes about a minute.", "analyze.retry": "Try another photo",

      "guest.after_first": "Sign up to save this report and get one more free analysis.", "guest.signup": "Sign up free",
      "guest.keep_note": "Without signing up, this report stays in this browser for 7 days. (check)",
      "limit.title": "You have used your 2 free analyses", "limit.text": "Get Pro to run more analyses and open the full report.",
      "limit.cta": "See Pro plans", "limit.daily": "Today's limit is reached. Please try again tomorrow.",
      "limit.busy": "Free analyses are paused for today because many people are using Facerizer. Please try again tomorrow. (check)",

      "pro.line": "Pro unlocks the full version of this.", "pro.box_title": "Go further with Pro",
      "pro.box_text": "Pro gives you 25 analyses a month, the full report, a 30-day plan and a barber card.", "pro.cta": "See Pro",
      "pro.included_free": "Included in Free", "pro.included_pro": "Part of Pro",

      "result.hairstyles": "Hairstyles", "result.glasses": "Glasses", "result.grooming": "Grooming tips", "result.skincare": "Skincare routine", "result.features": "Feature by feature",
      "result.why_you": "Why this suits you", "result.tell_barber": "Tell your barber", "result.add_plan": "Add to plan", "result.add_barber_card": "Add to barber card",
      "result.strength": "Strength", "result.can_refine": "Can refine",

      "journey.next_step": "Your next step", "journey.title": "Your journey", "journey.plan30": "30-day plan", "journey.exercises": "Face exercises",
      "journey.progress": "Progress report", "journey.history": "Report history", "journey.streak": "{n}-day streak",
      "journey.before_after": "Before and after", "journey.plan60": "60-day plan", "journey.plan90": "90-day plan", "journey.advanced": "Advanced report",
      "journey.take_with_you": "Take it with you", "journey.full_pdf": "Full report PDF", "journey.barber_pdf": "Barber card PDF", "journey.save_image": "Save image",

      "card.title": "AI Appearance Analysis Score", "card.hair": "Hair", "card.eyes": "Eyes", "card.skin": "Skin", "card.structure": "Facial structure", "card.facial_hair": "Facial hair",
      "card.goals": "Goals", "card.hide_scores": "Hide scores", "card.show_scores": "Show scores",
      "card.disclaimer": "This score reflects visible facial characteristics in a photo and is not an objective measure of beauty. Lighting, angle and expression can change it.",
      "card.download": "Download image", "card.download_warning": "This image contains your photo. Share it only with people you trust.",

      "skin.type": "Skin type", "skin.ai_guess": "AI estimate, {confidence} confidence", "skin.change": "Change my skin type", "skin.sensitive": "My skin is sensitive",
      "skin.normal": "Normal", "skin.dry": "Dry", "skin.oily": "Oily", "skin.combination": "Combination", "skin.unclear": "Unclear",
      "skin.morning": "Morning", "skin.evening": "Evening",
      "skin.disclaimer": "General cosmetic guidance only. This is not a skin check or medical advice. See a qualified dermatologist for persistent or concerning skin issues.",
      "skin.patch_test": "Patch test a new product first, and add only one new product at a time."
    },

    hinglish: {
      "common.free": "Free", "common.pro": "Pro", "common.premium": "Premium", "common.plan": "Plan", "common.report": "Report",
      "common.download": "Download", "common.close": "Band karein", "common.cancel": "Cancel karein", "common.confirm": "Confirm karein",
      "common.back": "Peeche", "common.next": "Aage", "common.save": "Save karein", "common.loading": "Load ho raha hai...",
      "common.try_again": "Dobara try karein", "common.language": "Bhasha", "common.lang_en": "English", "common.lang_hinglish": "Hinglish",
      "common.open_menu": "Menu kholein", "common.close_menu": "Menu band karein", "common.ai_estimate": "AI ka andaza",

      "menu.explore": "Explore karein", "menu.how_it_works": "Ye kaise kaam karta hai", "menu.features": "Features", "menu.faq": "FAQ",
      "menu.pricing": "Pricing", "menu.face_shapes": "Face shapes", "menu.face_exercises": "Face exercises", "menu.example_report": "Example report",
      "menu.company": "Company", "menu.about": "Hamare baare mein", "menu.contact": "Contact karein",
      "menu.policies": "Policies", "menu.privacy": "Privacy Policy", "menu.terms": "Terms of Service", "menu.refund": "Refund Policy", "menu.delivery": "Delivery Policy",
      "menu.your_data": "Aapka data", "menu.delete_photos": "Saari photos delete karein", "menu.delete_account": "Mera account delete karein",
      "menu.my_account": "Mera account", "menu.log_in": "Log in", "menu.sign_up": "Sign up", "menu.log_out": "Log out",
      "menu.delete_photos_title": "Saari photos delete karni hain?", "menu.delete_photos_text": "Aapki upload ki hui photos hata di jayengi. Ise wapas nahi liya ja sakta.",
      "menu.delete_account_title": "Account delete karna hai?", "menu.delete_account_text": "Aapka account aur usse juda data delete ho jayega. Ise wapas nahi liya ja sakta. (check)",
      "menu.delete_photos_yes": "Haan, saari photos delete karein", "menu.delete_account_yes": "Haan, mera account delete karein",

      "analyze.title": "Apne face ka analysis karein", "analyze.start": "Mera face analyze karein", "analyze.report_language": "Report ki bhasha",
      "analyze.working": "Aapki photo analyze ho rahi hai. Ismein lagbhag ek minute lagta hai.", "analyze.retry": "Doosri photo try karein",

      "guest.after_first": "Report save karne aur ek aur free analysis lene ke liye sign up karein.", "guest.signup": "Free mein sign up karein",
      "guest.keep_note": "Sign up na karne par ye report 7 din tak is browser mein rahegi. (check)",
      "limit.title": "Aapke 2 free analysis ho chuke hain", "limit.text": "Aur analysis karne aur poori report kholne ke liye Pro lein.",
      "limit.cta": "Pro plans dekhein", "limit.daily": "Aaj ki limit poori ho gayi hai. Kal dobara try karein.",
      "limit.busy": "Aaj ke liye free analysis band hain, kyunki bahut log Facerizer use kar rahe hain. Kal dobara try karein. (check)",

      "pro.line": "Iska poora version Pro mein milta hai.", "pro.box_title": "Pro ke saath aur aage badhein",
      "pro.box_text": "Pro mein har mahine 25 analysis, poori report, 30-day plan aur barber card milta hai.", "pro.cta": "Pro dekhein",
      "pro.included_free": "Free mein shamil", "pro.included_pro": "Pro ka hissa",

      "result.hairstyles": "Hairstyles", "result.glasses": "Glasses", "result.grooming": "Grooming tips", "result.skincare": "Skincare routine", "result.features": "Feature by feature",
      "result.why_you": "Ye aapke liye kyun sahi hai", "result.tell_barber": "Barber ko ye bolein", "result.add_plan": "Plan mein jodein", "result.add_barber_card": "Barber card mein jodein",
      "result.strength": "Strength", "result.can_refine": "Behtar ho sakta hai",

      "journey.next_step": "Aapka agla kadam", "journey.title": "Aapki journey", "journey.plan30": "30-day plan", "journey.exercises": "Face exercises",
      "journey.progress": "Progress report", "journey.history": "Report history", "journey.streak": "{n} din ki streak",
      "journey.before_after": "Before aur after", "journey.plan60": "60-day plan", "journey.plan90": "90-day plan", "journey.advanced": "Advanced report",
      "journey.take_with_you": "Ise saath le jaayein", "journey.full_pdf": "Full report PDF", "journey.barber_pdf": "Barber card PDF", "journey.save_image": "Image save karein",

      "card.title": "AI Appearance Analysis Score", "card.hair": "Baal", "card.eyes": "Aankhein", "card.skin": "Skin", "card.structure": "Chehre ki banaavat", "card.facial_hair": "Facial hair",
      "card.goals": "Goals", "card.hide_scores": "Scores chhupayein", "card.show_scores": "Scores dikhayein",
      "card.disclaimer": "Ye score photo mein dikhne wali chehre ki khoobiyon par based hai, aur sundarta ka objective maap nahi hai. Roshni, angle aur expression se ye badal sakta hai.",
      "card.download": "Image download karein", "card.download_warning": "Is image mein aapki photo hai. Ise sirf unhi logon ke saath share karein jin par aapko bharosa ho.",

      "skin.type": "Skin type", "skin.ai_guess": "AI ka andaza, confidence {confidence}", "skin.change": "Skin type badlein", "skin.sensitive": "Meri skin sensitive hai",
      "skin.normal": "Normal", "skin.dry": "Dry", "skin.oily": "Oily", "skin.combination": "Combination", "skin.unclear": "Clear nahi hai",
      "skin.morning": "Subah", "skin.evening": "Raat",
      "skin.disclaimer": "Ye sirf general cosmetic guidance hai, skin ki jaanch ya medical salah nahi. Skin ki lagatar ya chinta wali samasya ho to kisi qualified dermatologist se milein.",
      "skin.patch_test": "Naya product pehle patch test karein, aur ek baar mein sirf ek naya product shuru karein."
    }
  };

  var origLang = null, cur = detect();

  function detect() {
    var q = /[?&]lang=(en|hinglish)(?:&|$)/.exec(window.location.search || "");
    if (q) { save(q[1]); return q[1]; }
    try { var v = window.localStorage.getItem(KEY); if (v && LANGS.indexOf(v) > -1) return v; } catch (e) {}
    return DEFAULT;
  }
  function save(l) { try { window.localStorage.setItem(KEY, l); } catch (e) {} }

  function t(key, vars) {
    var s = S[cur] && S[cur][key];
    if (s == null) s = S.en[key];
    if (s == null) return key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? String(vars[k]) : m; });
    return s;
  }

  function apply(root) {
    var r = root || document, i, els;
    els = r.querySelectorAll("[data-i18n]");
    for (i = 0; i < els.length; i++) els[i].textContent = t(els[i].getAttribute("data-i18n"));
    els = r.querySelectorAll("[data-i18n-attr]");
    for (i = 0; i < els.length; i++) {
      els[i].getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var k = pair.indexOf(":"); if (k < 1) return;
        els[i].setAttribute(pair.slice(0, k).trim(), t(pair.slice(k + 1).trim()));
      });
    }
    var h = document.documentElement;
    if (origLang === null) origLang = h.getAttribute("lang") || "en";
    h.setAttribute("lang", cur === "hinglish" ? "hi-Latn" : origLang);
  }

  function setLang(l) {
    if (LANGS.indexOf(l) < 0) return;
    cur = l; save(l); apply();
    try { document.dispatchEvent(new CustomEvent("fz:lang", { detail: l })); } catch (e) {}
  }

  window.FZ_I18N = {
    t: t, apply: apply, setLang: setLang, langs: LANGS.slice(),
    get lang() { return cur; },
    strings: S /* used by the test script; do not edit at run time */
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { apply(); });
  else apply();
})();
