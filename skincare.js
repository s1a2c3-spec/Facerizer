/* Facerizer skincare routine library (Phase 5B).
 * One place that knows: what to apply, how much, when, how, and why. Used by the report page (Skincare routine button)
 * and by the plan page (Daily routine, after "Add to plan"). The text is written by us, not by the AI.
 *
 *   FZSkin.build(skinType, sensitive)  ->  { type, sensitive, known, am: [step], pm: [step], later: [item], notes: [string], intro: string }
 *   step  = { title, product, amount, how, why, active (bool), strength, freq }
 *   later = { name, strength, when, freq, why }
 *
 * Safety rules built in: only ONE active at a time (the rest are listed as "add later"), patch test, sunscreen every morning,
 * sensitive skin gets the basic steps only. No brands, no prices, no medical claims.
 * NOTE: the strengths below come from HANDOFF-3 section 7. A dermatologist should read them once before launch.
 */
(function () {
  "use strict";

  var X = {
    en: {
      cleanse: "Cleanse", moist: "Moisturiser", spf: "Sunscreen",
      cl_gel: "Gentle gel cleanser", cl_cream: "Mild, fragrance-free cream or lotion cleanser",
      cl_amt: "1 pump, or a coin-sized amount",
      cl_how: "Wet your face with lukewarm water, massage gently with your fingertips for 30 seconds, rinse well and pat dry with a clean towel.",
      cl_why: "Removes oil and dirt without stripping your skin.",
      mo_gel: "Light, oil-free gel moisturiser", mo_rich: "Richer cream with ceramides or glycerin", mo_light: "Light lotion", mo_sens: "Fragrance-free moisturiser",
      mo_amt: "A pea-sized to coin-sized amount for the whole face",
      mo_how: "Spread it on slightly damp skin with your fingertips, using upward strokes. Do not forget the neck.",
      mo_why: "Keeps skin comfortable. Even oily skin needs it.",
      sp_prod: "SPF 30 to 50, PA+++, broad spectrum", sp_sens: "Mineral (zinc oxide) sunscreen, SPF 30 to 50, PA+++",
      sp_amt: "Two finger-lengths for the face and neck (about a quarter teaspoon for the face)",
      sp_how: "Last step of your morning routine. Reapply every 2 to 3 hours when you are outdoors.",
      sp_why: "Daily sun protection is the most useful habit for even-looking, healthy-looking skin.",
      ac_amt: "3 to 4 drops, about a pea-sized amount",
      ac_how: "Apply on clean skin, before the moisturiser. Keep it away from the eye area. Do a patch test first.",
      ac_how_dry: "Apply on clean, slightly damp skin, before the moisturiser. Keep it away from the eye area. Do a patch test first.",
      ac_tzone: " Use it on the T-zone only (forehead, nose, chin).",
      niacinamide: "Niacinamide serum", hyaluronic: "Hyaluronic acid serum", vitamin_c: "Vitamin C serum", salicylic: "Salicylic acid (BHA) treatment", retinol: "Retinol serum", lactic: "Lactic acid (AHA) treatment",
      f_daily: "Daily", f_daily_start: "Start every other day for 2 weeks, then daily", f_sal: "Start with 1 night a week, then up to 2 or 3", f_ret: "Start with 2 nights a week, then slowly add more", f_lac: "Once a week",
      w_niacinamide: "Helps balance oil and the look of pores and uneven tone.", w_hyaluronic: "Adds light moisture and a plumper look.",
      w_vitamin_c: "Brightens the look of dull skin and works with sunscreen.", w_salicylic: "Helps with oil and the look of clogged pores.",
      w_retinol: "Smooths the look of texture and fine lines over time.", w_lactic: "Gently exfoliates for smoother-looking skin.",
      am: "Morning", pm: "Night",
      i_known: "Built for {type} skin. One active at a time keeps your skin calm.",
      i_sens: "Built for sensitive skin: only the basic steps, no actives.",
      i_unclear: "Choose your skin type above to get your first active. Until then, these basic steps are the right start.",
      n_sens: "Because your skin is sensitive, stay with the basic steps. Ask a dermatologist before adding any active.",
      n1: "Patch test first: put a small amount behind your ear or on your inner forearm and wait 24 hours before using a new product on your face.",
      n2: "Add one new active at a time and wait 2 weeks before the next one.",
      n3: "Never skip sunscreen in the morning, especially after using an active.",
      n4: "If your skin burns, stings or turns red, rinse it off and stop that product. See a doctor if it does not settle.",
      n5: "If you are pregnant, breastfeeding or under a doctor's skin treatment, ask your doctor before using any active.",
      n6: "This is general cosmetic guidance, not medical advice.",
      t_normal: "normal", t_dry: "dry", t_oily: "oily", t_combination: "combination", t_unclear: "your"
    },
    hinglish: {
      cleanse: "Cleanse", moist: "Moisturiser", spf: "Sunscreen",
      cl_gel: "Gentle gel cleanser", cl_cream: "Mild, fragrance-free cream ya lotion cleanser",
      cl_amt: "1 pump, ya sikke jitna",
      cl_how: "Chehra lukewarm paani se geela karein, ungliyon se 30 second halke haath se malein, achhe se dhoyein aur saaf tauliye se thapthapa kar sukhayein.",
      cl_why: "Skin ko sukhaye bina oil aur gandagi hatata hai.",
      mo_gel: "Halka, oil-free gel moisturiser", mo_rich: "Ceramides ya glycerin wali richer cream", mo_light: "Halka lotion", mo_sens: "Fragrance-free moisturiser",
      mo_amt: "Poore chehre ke liye matar ke dane se sikke jitni matra",
      mo_how: "Thodi geeli skin par ungliyon se upar ki taraf lagayein. Gardan na bhoolein.",
      mo_why: "Skin ko aaramdeh rakhta hai. Oily skin ko bhi iski zaroorat hoti hai.",
      sp_prod: "SPF 30 se 50, PA+++, broad spectrum", sp_sens: "Mineral (zinc oxide) sunscreen, SPF 30 se 50, PA+++",
      sp_amt: "Chehre aur gardan ke liye do ungli ki lambai (chehre ke liye lagbhag aadha chammach ka chauthai hissa)",
      sp_how: "Subah ke routine ka aakhri step. Bahar rehne par har 2 se 3 ghante mein dobara lagayein.",
      sp_why: "Roz ki sun protection saaf aur sehatmand dikhne wali skin ke liye sabse kaam ki aadat hai.",
      ac_amt: "3 se 4 boond, lagbhag matar ke dane jitni",
      ac_how: "Saaf skin par moisturiser se pehle lagayein. Aankhon ke aas-paas na lagayein. Pehle patch test karein.",
      ac_how_dry: "Saaf aur thodi geeli skin par moisturiser se pehle lagayein. Aankhon ke aas-paas na lagayein. Pehle patch test karein.",
      ac_tzone: " Sirf T-zone par lagayein (maatha, naak, chin).",
      niacinamide: "Niacinamide serum", hyaluronic: "Hyaluronic acid serum", vitamin_c: "Vitamin C serum", salicylic: "Salicylic acid (BHA) treatment", retinol: "Retinol serum", lactic: "Lactic acid (AHA) treatment",
      f_daily: "Roz", f_daily_start: "2 hafte tak ek din chhod kar, phir roz", f_sal: "Hafte mein 1 raat se shuru karein, phir 2 ya 3 tak", f_ret: "Hafte mein 2 raat se shuru karein, phir dheere dheere badhayein", f_lac: "Hafte mein ek baar",
      w_niacinamide: "Oil, pores ke look aur uneven tone ko balance karne mein madad karta hai.", w_hyaluronic: "Halki moisture deta hai aur skin bhari hui dikhti hai.",
      w_vitamin_c: "Dull skin ka look nikharta hai aur sunscreen ke saath kaam karta hai.", w_salicylic: "Oil aur band pores ke look mein madad karta hai.",
      w_retinol: "Waqt ke saath texture aur fine lines ka look smooth karta hai.", w_lactic: "Halke se exfoliate karke skin smooth dikhata hai.",
      am: "Subah", pm: "Raat",
      i_known: "{type} skin ke liye bana. Ek baar mein ek active se skin shaant rehti hai.",
      i_sens: "Sensitive skin ke liye bana: sirf basic steps, koi active nahi.",
      i_unclear: "Pehle upar apna skin type chunein, tab pehla active milega. Tab tak ye basic steps sahi shuruaat hain.",
      n_sens: "Aapki skin sensitive hai, isliye basic steps par hi rahein. Koi bhi active jodne se pehle dermatologist se poochhein.",
      n1: "Pehle patch test: kaan ke peeche ya kalai ke andar thodi matra lagayein aur 24 ghante rukein, tab chehre par naya product lagayein.",
      n2: "Ek baar mein sirf ek naya active jodein aur agla jodne se pehle 2 hafte rukein.",
      n3: "Subah sunscreen kabhi na chhodein, khaas kar active lagane ke baad.",
      n4: "Skin mein jalan, chubhan ya laali aaye to use dho dein aur wo product band karein. Theek na ho to doctor ko dikhayein.",
      n5: "Pregnancy, breastfeeding ya doctor ke skin treatment mein hon to koi bhi active lagane se pehle doctor se poochhein.",
      n6: "Ye general cosmetic jaankari hai, medical salah nahi.",
      t_normal: "normal", t_dry: "dry", t_oily: "oily", t_combination: "combination", t_unclear: "aapki"
    }
  };

  function lang() { var l = window.FZ_I18N && window.FZ_I18N.lang; return l === "hinglish" ? "hinglish" : "en"; }
  function T(k) { var d = X[lang()]; return d[k] != null ? d[k] : X.en[k]; }

  var ORDER = {
    normal: ["niacinamide", "vitamin_c", "retinol"],
    dry: ["hyaluronic", "niacinamide", "lactic"],
    oily: ["niacinamide", "salicylic", "vitamin_c", "retinol"],
    combination: ["niacinamide", "hyaluronic", "salicylic", "vitamin_c"]
  };
  var WHEN = { niacinamide: "am", hyaluronic: "am", vitamin_c: "am", salicylic: "pm", retinol: "pm", lactic: "pm" };
  var FREQ = { niacinamide: "f_daily", hyaluronic: "f_daily", vitamin_c: "f_daily_start", salicylic: "f_sal", retinol: "f_ret", lactic: "f_lac" };
  var STRENGTH = { niacinamide: "2 to 5%", hyaluronic: "1 to 2%", vitamin_c: "10 to 15%", salicylic: "0.5 to 2%", retinol: "0.1 to 0.3%", lactic: "5 to 10%" };
  var KNOWN = ["normal", "dry", "oily", "combination"];

  function activeStep(id, type) {
    var how = type === "dry" ? T("ac_how_dry") : T("ac_how");
    if (id === "salicylic" && type === "combination") how += T("ac_tzone");
    return { title: T(id), product: "", amount: T("ac_amt"), how: how, why: T("w_" + id), active: true, strength: STRENGTH[id], freq: T(FREQ[id]) };
  }

  function build(skinType, sensitive) {
    var type = KNOWN.indexOf(skinType) >= 0 ? skinType : "unclear";
    var known = type !== "unclear", oilyish = type === "oily" || type === "combination";
    var cleanse = { title: T("cleanse"), product: sensitive || !oilyish ? T("cl_cream") : T("cl_gel"), amount: T("cl_amt"), how: T("cl_how"), why: T("cl_why"), active: false };
    var moist = { title: T("moist"), product: sensitive ? T("mo_sens") : oilyish ? T("mo_gel") : type === "dry" ? T("mo_rich") : T("mo_light"), amount: T("mo_amt"), how: T("mo_how"), why: T("mo_why"), active: false };
    var spf = { title: T("spf"), product: sensitive ? T("sp_sens") : T("sp_prod"), amount: T("sp_amt"), how: T("sp_how"), why: T("sp_why"), active: false };

    var am = [cleanse], pm = [cleanse], later = [], notes = [];
    if (known && !sensitive) {
      var ids = ORDER[type], first = ids[0];
      var st = activeStep(first, type);
      (WHEN[first] === "pm" ? pm : am).push(st);
      ids.slice(1).forEach(function (id) { later.push({ name: T(id), strength: STRENGTH[id], when: T(WHEN[id]), freq: T(FREQ[id]), why: T("w_" + id) + (id === "salicylic" && type === "combination" ? T("ac_tzone") : "") }); });
    }
    am.push(moist, spf); pm.push(moist);
    var intro = sensitive ? T("i_sens") : known ? T("i_known").replace("{type}", T("t_" + type)) : T("i_unclear");
    if (sensitive) notes.push(T("n_sens"));
    ["n1", "n2", "n3", "n4", "n5", "n6"].forEach(function (k) { notes.push(T(k)); });
    return { type: type, sensitive: !!sensitive, known: known, am: am, pm: pm, later: later, notes: notes, intro: intro, amLabel: T("am"), pmLabel: T("pm") };
  }

  window.FZSkin = { build: build, strings: X /* used by the test script */ };
})();
