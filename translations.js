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
      "menu.title": "Menu", "menu.library": "Your library", "menu.all_photos": "All photos", "menu.delete_photos": "Delete all photos", "menu.delete_account": "Delete my account",
      "menu.my_account": "My account", "menu.log_in": "Log in", "menu.sign_up": "Sign up", "menu.log_out": "Log out",
      "menu.photos_count": "Photos: {n}", "menu.photos_empty": "No saved photos yet.", "menu.photos_failed": "Could not load your photos.",
      "menu.photo_alt": "Your saved photo", "menu.deleting": "Deleting...", "menu.delete_failed": "Could not delete. Please try again.",
      "menu.photos_deleted": "Your photos were deleted.", "menu.account_deleted": "Your account was deleted.",

      "analyze.title": "Analyze your face", "analyze.start": "Analyze my face", "analyze.report_language": "Report language",
      "analyze.working": "Analyzing your photo. This takes about a minute.", "analyze.retry": "Try another photo",

      "guest.after_first": "Sign up to save this report and get one more free analysis.", "guest.signup": "Sign up free",
      "guest.keep_note": "Without signing up, this report stays in this browser for 7 days.",
      "guest.try_free": "Your first analysis is free. No sign-up needed.",
      "guest.consent_1": "I am 18 or older and I agree to the ", "guest.consent_2": " and ", "guest.consent_3": ".",
      "guest.need_consent": "Please tick the box to continue.", "guest.login": "I already have an account",
      "guest.used_title": "Your free analysis without an account is used.", "guest.view_report": "View my report",
      "guest.pending": "Almost done. Open the link we emailed you to finish signing up. Your report is saved.",
      "guest.google_conflict": "This Google account already has a Facerizer account. Please log in instead.",
      "limit.title": "You have used your 2 free analyses", "limit.text": "Get Pro to run more analyses and open the full report.",
      "limit.cta": "See Pro plans", "limit.daily": "Today's limit is reached. Please try again tomorrow.",
      "limit.busy": "Free analyses are paused for today because many people are using Facerizer. Please try again tomorrow.",

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
      "card.heading": "Face Analysis and Grooming Report", "card.subtitle": "Based on visible features in your photo.", "card.shape": "Face shape: {shape}",
      "card.overall": "Overall", "card.symmetry": "Symmetry (measured)", "card.proportion": "Proportion (measured)", "card.harmony": "Harmony (measured)",
      "card.feature_notes": "Feature notes", "card.estimate": "AI estimate, can vary", "card.skin_evenness": "Skin evenness", "card.upgrades": "Best upgrades",
      "card.footer_cta": "Discover your best look with Facerizer", "card.no_facial_hair": "No facial hair",
      "card.scores_hidden": "Scores are hidden. You can show them in your settings.", "card.photo_missing": "Photo not available", "card.example": "Example data",
      "card.fallback_hair": "Visible hair: {text}.", "card.dl_failed": "Could not make the image. Please try again.", "card.dl_nophoto": "The photo could not be added, so the image has no photo.",
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
      "menu.title": "Menu", "menu.library": "Aapki library", "menu.all_photos": "Saari photos", "menu.delete_photos": "Saari photos delete karein", "menu.delete_account": "Mera account delete karein",
      "menu.my_account": "Mera account", "menu.log_in": "Log in", "menu.sign_up": "Sign up", "menu.log_out": "Log out",
      "menu.photos_count": "Photos: {n}", "menu.photos_empty": "Abhi koi saved photo nahi hai.", "menu.photos_failed": "Aapki photos load nahi ho payi.",
      "menu.photo_alt": "Aapki saved photo", "menu.deleting": "Delete ho raha hai...", "menu.delete_failed": "Delete nahi ho paya. Dobara try karein.",
      "menu.photos_deleted": "Aapki photos delete ho gayi.", "menu.account_deleted": "Aapka account delete ho gaya.",

      "analyze.title": "Apne face ka analysis karein", "analyze.start": "Mera face analyze karein", "analyze.report_language": "Report ki bhasha",
      "analyze.working": "Aapki photo analyze ho rahi hai. Ismein lagbhag ek minute lagta hai.", "analyze.retry": "Doosri photo try karein",

      "guest.after_first": "Report save karne aur ek aur free analysis lene ke liye sign up karein.", "guest.signup": "Free mein sign up karein",
      "guest.keep_note": "Sign up na karne par ye report 7 din tak is browser mein rahegi.",
      "guest.try_free": "Aapka pehla analysis free hai. Sign up ki zaroorat nahi.",
      "guest.consent_1": "Main 18 saal ya usse bada hoon, aur main ", "guest.consent_2": " aur ", "guest.consent_3": " se sehmat hoon.",
      "guest.need_consent": "Aage badhne ke liye box tick karein.", "guest.login": "Mere paas account hai",
      "guest.used_title": "Bina account wala aapka free analysis ho chuka hai.", "guest.view_report": "Meri report dekhein",
      "guest.pending": "Bas thoda baaki hai. Sign up poora karne ke liye email mein bheja gaya link kholein. Aapki report save hai.",
      "guest.google_conflict": "Is Google account se pehle se Facerizer account hai. Log in karein.",
      "limit.title": "Aapke 2 free analysis ho chuke hain", "limit.text": "Aur analysis karne aur poori report kholne ke liye Pro lein.",
      "limit.cta": "Pro plans dekhein", "limit.daily": "Aaj ki limit poori ho gayi hai. Kal dobara try karein.",
      "limit.busy": "Aaj ke liye free analysis band hain, kyunki bahut log Facerizer use kar rahe hain. Kal dobara try karein.",

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
      "card.heading": "Face Analysis aur Grooming Report", "card.subtitle": "Aapki photo mein dikhne wali khoobiyon par based.", "card.shape": "Face shape: {shape}",
      "card.overall": "Overall", "card.symmetry": "Symmetry (naapi gayi)", "card.proportion": "Proportion (naapi gayi)", "card.harmony": "Harmony (naapi gayi)",
      "card.feature_notes": "Feature notes", "card.estimate": "AI ka andaza, badal sakta hai", "card.skin_evenness": "Skin evenness", "card.upgrades": "Best upgrades",
      "card.footer_cta": "Facerizer se apna best look dhoondhein", "card.no_facial_hair": "Facial hair nahi hai",
      "card.scores_hidden": "Scores chhupe hue hain. Aap unhe settings mein dikha sakte hain.", "card.photo_missing": "Photo available nahi hai", "card.example": "Example data",
      "card.fallback_hair": "Dikhte baal: {text}.", "card.dl_failed": "Image nahi ban payi. Dobara try karein.", "card.dl_nophoto": "Photo judi nahi, isliye image mein photo nahi hai.",
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
