/* Facerizer: the day-by-day content of the 30-day plan (Phase 6B).
 *   FZDays.build(day, ctx) -> { day, phase: {n, name}, title, tasks: [ { id, title, items: [ { title, text } ], note, link: {href, text} } ], newActive }
 *   ctx = { skinType, sensitive, flags: {allergy, caution}, profileDone, dailyMinutes, productsHave: [], lang? }
 * Task ids are always the same five: am, ex, life, pm, special. A day is finished when all five are ticked.
 * Morning and night come from skincare.js. A first active only appears from Day 8, only when the person has answered the safety
 * questions, and never for sensitive skin, an allergy, or pregnancy / a doctor's treatment. One active at a time, on a slow schedule.
 * Text is ours (not AI), cosmetic and general. No brands, no prices, no medical claims.
 */
(function () {
  "use strict";

  var X = {
    en: {
      p1: "Skin Foundation", p2: "Targeted Skin Care", p3: "Grooming and Appearance", p4: "Optimization and Final Progress",
      t_am: "Morning", t_ex: "Exercise", t_life: "Lifestyle", t_pm: "Night", t_special: "Special task",
      ex_note: "About {n} minutes. Step-by-step guide:", ex_link: "Open face exercises",
      chin: "Chin tucks", neck: "Gentle neck stretch", jaw: "Jaw relaxation", smile: "Gentle smile hold",
      r_chin: "10 repetitions", r_neck5: "5 each side", r_neck2: "2 minutes", r_jaw5: "5 breathing cycles", r_jaw2: "2 minutes", r_smile: "5 repetitions",
      l_walk: "Take a 20-minute walk.", l_breakfast: "Eat a balanced breakfast.", l_sleep: "Keep a regular sleep time.",
      l_water: "Drink water regularly through the day.", l_fruit: "Add fruits and vegetables to your meals.", l_touch: "Try not to touch your face with your hands.",
      l_towel: "Use a clean towel for your face.", l_rub: "Pat your face dry. Do not rub it.",
      new_active: "New today", sp_report: "Open my report", sp_exercises: "Open face exercises", sp_analyze: "Start a new analysis", sp_profile: "Fill my profile",
      need_h: "Still to get (basics): ", need_cleanser: "a gentle cleanser", need_moisturiser: "a moisturiser", need_sunscreen: "a sunscreen",
      a8_on: "Start your first active today: {name} ({strength}). Do a patch test first (behind your ear for 24 hours), then use it as shown in your morning or night steps. Use only this one new product.",
      a8_basic: "Keep your basic routine today. Your answers mean no active is added, and that is perfectly fine.",
      a8_profile: "Keep your basic routine today. Answer the safety questions in your profile to unlock a first active.",
      a8_type: "Keep your basic routine today. Choose your skin type in your report to unlock a first active.",
      a9_on: "Tolerance check: after using {name}, did you feel burning, redness or itching? If yes, stop it and rinse. If your skin feels comfortable, carry on with the schedule shown.",
      a9_off: "Tolerance check: does your skin feel comfortable with your routine? Any burning, redness or itching means you should stop the newest product.",
      a_paused: "Keep your basic routine today. Your skin felt irritated recently, so the serum is paused. If it does not settle in a few days, please see a doctor.",
      adv_pause: "Your skin felt irritated recently, so today's plan skips the serum. Keep to the basic steps. If it does not settle in a few days, please see a doctor.",
      adv_irritated: "Your skin felt irritated recently. Keep to the basic steps, add nothing new, and see a doctor if it does not settle.",
      adv_dry: "Your skin felt dry last night. Use a slightly thicker layer of moisturiser and wash with lukewarm, not hot, water.",
      adv_oily: "Your skin felt oily last night. Keep the moisturiser light, and do not over-wash: twice a day is enough.",
      adv_breakouts: "You noticed new breakouts last night. Keep the routine gentle, add nothing new, and avoid picking or scrubbing.",
      r_week: "Week {n} report", r_final: "Final report",
      r_consistency: "Routine consistency", r_days: "Days finished", r_special: "Special tasks done", r_comfort: "Skin comfort", r_checkins: "Check-ins", r_tol: "New product", r_missed: "Days missed so far", r_next: "Next phase",
      c_good: "Good", c_mixed: "Mixed", c_care: "Needs care", c_none: "No check-ins yet",
      tol_none: "Not started", tol_ok: "No irritation reported", tol_bad: "Irritation reported, so it was paused", tol_nodata: "No check-ins yet",
      ci_good: "Comfortable", ci_dry: "Dry", ci_oily: "Oily", ci_irritated: "Irritated", ci_breakouts: "New breakouts",
      n_good: "Your skin felt comfortable. Keep going.", n_mixed: "Your skin felt mixed. Keep the routine simple and steady.",
      n_care: "Your skin felt irritated. Keep the routine gentle and add nothing new. If it does not settle, please see a doctor.",
      n_nothing: "Nothing stronger is ever added automatically.",
      n_photo: "To see changes, compare your photos taken in the same light and angle.", n_photo_link: "Compare my photos",
      n_basis: "This report is based on your own ticks and answers. It is not a skin check or medical advice.",
      r_of: "{a} of {b}",
      d1: "Start Your Journey", s1: "Save a first face photo in daylight, looking straight ahead, and note the skincare products you use now.",
      d2: "Build Consistency", s2: "Change your pillowcase today.",
      d3: "Skin Hydration Day", s3: "After washing your face, notice if it feels tight or dry, and write it down.",
      d4: "Skin Hygiene Day", s4: "Read the ingredient list of the skincare products you use now.",
      d5: "Posture and Grooming Day", s5: "Open your hairstyle picks and save the one you like most.",
      d6: "Skin Comfort Day", s6: "Check that no product is bothering your skin. If something stings or turns red, pause the newest product, and ask a doctor if it does not settle.",
      d7: "First Week Check", s7: "You finished week 1! Take a fresh face photo in the same light and angle, and note how your skin feels.",
      d8: "Personalized Skincare", d9: "Product Tolerance Check",
      d10: "Healthy Habits Day", s10: "Look back: on how many days this week did you finish your routine?",
      d11: "Skin Observation Day", s11: "Note how your skin feels and anything new you notice. This is only your own observation.",
      d12: "Personal Grooming Day", s12: "Open your grooming tips and hairstyle picks and decide what you want to try.",
      d13: "Hygiene and Product Review", s13: "Wash your towels and pillowcase. Look at your products and set aside the ones you do not use.",
      d14: "Second Week Check", s14: "Take a fresh face photo in the same light and angle. Note your skin comfort and how you tolerate your routine.",
      d15: "Hairstyle Day", s15: "Pick one hairstyle from your report and add it to your barber card.",
      d16: "Eyebrow Grooming", s16: "Tidy only the stray hairs below and between your brows. Keep the natural shape.",
      d17: "Beard and Moustache Day", s17: "Neaten your beard or moustache line using your grooming tips.",
      d18: "Lip Care Day", s18: "Use a lip balm in the morning and at night. Do not peel dry skin.",
      d19: "Facial Posture Day", s19: "Stand with your head, shoulders and back against a wall. Hold for 1 minute, 3 times.",
      d20: "Hydration and Comfort", s20: "Check how your skin feels, and keep drinking water through the day.",
      d21: "Third Week Check", s21: "Take a fresh face photo in the same light and angle. Note how your skin and grooming have changed.",
      d22: "Routine Consistency", s22: "Count the days you finished all your tasks so far. Keep your streak going.",
      d23: "Facial Posture Practice", s23: "Repeat the wall posture hold: 1 minute, 3 times.",
      d24: "Hair Grooming", s24: "Style your hair the way your report suggests and see how you like it.",
      d25: "Skin Comfort Review", s25: "Compare how your skin feels now with Day 1.",
      d26: "Lifestyle Assessment", s26: "Think about your sleep, water and walking this week. Pick one habit to improve.",
      d27: "Complete Grooming Day", s27: "Do your full grooming today: hair, beard or brows, and your skin routine. Check your look in daylight.",
      d28: "Fourth Week Check", s28: "Take a fresh face photo in the same light and angle, and note what has changed.",
      d29: "Final Preparation", s29: "Plan tomorrow's final photo: same light, same angle, same time of day as before.",
      d30: "Final Photo Day", s30: "Take your final face photo in the same light and angle as Day 1, then run a new analysis to see your progress."
    },
    hinglish: {
      p1: "Skin Foundation", p2: "Targeted Skin Care", p3: "Grooming aur Appearance", p4: "Optimization aur Final Progress",
      t_am: "Subah", t_ex: "Exercise", t_life: "Lifestyle", t_pm: "Raat", t_special: "Special task",
      ex_note: "Lagbhag {n} minute. Step-by-step guide:", ex_link: "Face exercises kholein",
      chin: "Chin tucks", neck: "Gentle neck stretch", jaw: "Jaw relaxation", smile: "Gentle smile hold",
      r_chin: "10 baar", r_neck5: "Dono taraf 5-5 baar", r_neck2: "2 minute", r_jaw5: "5 saans ke cycle", r_jaw2: "2 minute", r_smile: "5 baar",
      l_walk: "20 minute walk karein.", l_breakfast: "Balanced breakfast karein.", l_sleep: "Sone ka time regular rakhein.",
      l_water: "Din bhar regular paani peete rahein.", l_fruit: "Khane mein fruits aur sabziyan jodein.", l_touch: "Chehre ko haathon se chhuna kam karein.",
      l_towel: "Chehre ke liye saaf tauliya use karein.", l_rub: "Chehra thapthapa kar sukhayein, ragdein nahi.",
      new_active: "Aaj naya", sp_report: "Meri report kholein", sp_exercises: "Face exercises kholein", sp_analyze: "Naya analysis shuru karein", sp_profile: "Mera profile bharein",
      need_h: "Abhi lena baaki (basics): ", need_cleanser: "ek gentle cleanser", need_moisturiser: "ek moisturiser", need_sunscreen: "ek sunscreen",
      a8_on: "Aaj apna pehla active shuru karein: {name} ({strength}). Pehle patch test karein (kaan ke peeche 24 ghante), phir subah ya raat ke steps mein bataye tareeke se lagayein. Sirf yahi ek naya product lagayein.",
      a8_basic: "Aaj apna basic routine rakhein. Aapke jawabon ke hisaab se koi active nahi jud raha, aur ye bilkul theek hai.",
      a8_profile: "Aaj apna basic routine rakhein. Pehla active kholne ke liye apne profile mein safety ke sawalon ke jawab dein.",
      a8_type: "Aaj apna basic routine rakhein. Pehla active kholne ke liye apni report mein skin type chunein.",
      a9_on: "Tolerance check: {name} lagane ke baad jalan, laali ya khujli hui? Haan to use band karke dho dein. Skin aaramdeh lage to bataye schedule se aage badhein.",
      a9_off: "Tolerance check: kya aapki skin routine ke saath aaramdeh hai? Jalan, laali ya khujli ho to sabse naya product band karein.",
      a_paused: "Aaj apna basic routine rakhein. Aapki skin ko haal hi mein jalan hui thi, isliye serum roka gaya hai. Kuch din mein theek na ho to doctor ko dikhayein.",
      adv_pause: "Aapki skin ko haal hi mein jalan hui thi, isliye aaj ke plan mein serum nahi hai. Basic steps par hi rahein. Kuch din mein theek na ho to doctor ko dikhayein.",
      adv_irritated: "Aapki skin ko haal hi mein jalan hui thi. Basic steps par hi rahein, kuch naya na jodein, aur theek na ho to doctor ko dikhayein.",
      adv_dry: "Kal raat skin dry lagi thi. Moisturiser ki thodi mota layer lagayein aur chehra garm nahi, lukewarm paani se dhoyein.",
      adv_oily: "Kal raat skin oily lagi thi. Moisturiser halka rakhein aur zyada na dhoyein: din mein do baar kaafi hai.",
      adv_breakouts: "Kal raat aapne naye breakouts dekhe. Routine gentle rakhein, kuch naya na jodein, aur nochne ya ragadne se bachein.",
      r_week: "Hafta {n} ki report", r_final: "Final report",
      r_consistency: "Routine consistency", r_days: "Poore kiye din", r_special: "Special tasks poore", r_comfort: "Skin comfort", r_checkins: "Check-ins", r_tol: "Naya product", r_missed: "Ab tak chhoote din", r_next: "Agla phase",
      c_good: "Achha", c_mixed: "Mila-jula", c_care: "Dhyan chahiye", c_none: "Abhi koi check-in nahi",
      tol_none: "Shuru nahi hua", tol_ok: "Koi jalan nahi batayi", tol_bad: "Jalan batayi, isliye roka gaya", tol_nodata: "Abhi koi check-in nahi",
      ci_good: "Aaramdeh", ci_dry: "Dry", ci_oily: "Oily", ci_irritated: "Jalan", ci_breakouts: "Naye breakouts",
      n_good: "Aapki skin aaramdeh rahi. Aise hi chalte rahein.", n_mixed: "Aapki skin mili-juli rahi. Routine saada aur ek jaisa rakhein.",
      n_care: "Aapki skin ko jalan hui. Routine gentle rakhein aur kuch naya na jodein. Theek na ho to doctor ko dikhayein.",
      n_nothing: "Koi bhi tez cheez apne aap kabhi nahi jodi jaati.",
      n_photo: "Badlav dekhne ke liye usi roshni aur angle mein li gayi apni photos ko milayein.", n_photo_link: "Meri photos milayein",
      n_basis: "Ye report aapke apne tick aur jawabon par hai. Ye skin ki jaanch ya medical salah nahi hai.",
      r_of: "{b} mein se {a}",
      d1: "Safar ki shuruaat", s1: "Din ki roshni mein seedhe dekhte hue ek pehli face photo save karein, aur jo skincare products abhi use karte hain unhe likh lein.",
      d2: "Consistency banayein", s2: "Aaj apna pillowcase badlein.",
      d3: "Skin Hydration Day", s3: "Chehra dhone ke baad dekhein ki skin kheenchi hui ya dry lag rahi hai, aur likh lein.",
      d4: "Skin Hygiene Day", s4: "Jo skincare products abhi use karte hain unki ingredient list padhein.",
      d5: "Posture aur Grooming Day", s5: "Apne hairstyle picks kholein aur jo sabse pasand aaye use save karein.",
      d6: "Skin Comfort Day", s6: "Dekhein ki koi product skin ko pareshan to nahi kar raha. Chubhan ya laali ho to sabse naya product rok dein, aur theek na ho to doctor se poochhein.",
      d7: "Pehle hafte ka check", s7: "Aapne pehla hafta poora kiya! Usi roshni aur angle mein nayi face photo lein, aur likhein ki skin kaisi lag rahi hai.",
      d8: "Personalized Skincare", d9: "Product Tolerance Check",
      d10: "Healthy Habits Day", s10: "Peeche dekhein: is hafte kitne din aapne routine poora kiya?",
      d11: "Skin Observation Day", s11: "Likhein ki skin kaisi lag rahi hai aur kuch naya dikha to wo bhi. Ye sirf aapka apna observation hai.",
      d12: "Personal Grooming Day", s12: "Apni grooming tips aur hairstyle picks kholein aur tay karein ki kya try karna hai.",
      d13: "Hygiene aur Product Review", s13: "Tauliye aur pillowcase dhoyein. Apne products dekhein aur jo use nahi karte unhe alag rakh dein.",
      d14: "Doosre hafte ka check", s14: "Usi roshni aur angle mein nayi face photo lein. Skin comfort aur routine ke saath kaisa lag raha hai, likh lein.",
      d15: "Hairstyle Day", s15: "Apni report se ek hairstyle chunein aur use barber card mein jodein.",
      d16: "Eyebrow Grooming", s16: "Sirf eyebrows ke neeche aur beech ke bikhre baal saaf karein. Natural shape rakhein.",
      d17: "Beard aur Moustache Day", s17: "Apni grooming tips ke hisaab se beard ya moustache ki line saaf karein.",
      d18: "Lip Care Day", s18: "Subah aur raat lip balm lagayein. Dry skin ko khinchein nahi.",
      d19: "Facial Posture Day", s19: "Sir, kandhe aur peeth deewar se lagakar khade hon. 1 minute rokein, 3 baar.",
      d20: "Hydration aur Comfort", s20: "Dekhein ki skin kaisi lag rahi hai, aur din bhar paani peete rahein.",
      d21: "Teesre hafte ka check", s21: "Usi roshni aur angle mein nayi face photo lein. Likhein ki skin aur grooming mein kya badla.",
      d22: "Routine Consistency", s22: "Ab tak kitne din saare tasks poore kiye, ginein. Apni streak banaye rakhein.",
      d23: "Facial Posture Practice", s23: "Deewar wali posture dobara karein: 1 minute, 3 baar.",
      d24: "Hair Grooming", s24: "Apne baal report ke sujhaye tareeke se set karein aur dekhein kaisa lagta hai.",
      d25: "Skin Comfort Review", s25: "Abhi skin kaisi lag rahi hai, use Day 1 se milayein.",
      d26: "Lifestyle Assessment", s26: "Is hafte apni neend, paani aur walking par dhyan dein. Ek aadat chunein jise behtar karna hai.",
      d27: "Complete Grooming Day", s27: "Aaj poori grooming karein: baal, beard ya eyebrows, aur skin routine. Apna look daylight mein dekhein.",
      d28: "Chauthe hafte ka check", s28: "Usi roshni aur angle mein nayi face photo lein, aur likhein ki kya badla.",
      d29: "Final taiyari", s29: "Kal ki final photo ki taiyari karein: pehle jaisi hi roshni, angle aur din ka samay.",
      d30: "Final Photo Day", s30: "Day 1 jaisi hi roshni aur angle mein apni final face photo lein, phir naya analysis chalakar progress dekhein."
    }
  };

  function lang() { var l = window.FZ_I18N && window.FZ_I18N.lang; return l === "hinglish" ? "hinglish" : "en"; }
  function T(k, v) {
    var s = X[lang()][k]; if (s == null) s = X.en[k]; if (s == null) return k;
    if (v) Object.keys(v).forEach(function (n) { s = s.split("{" + n + "}").join(v[n]); });
    return s;
  }

  var EX_PATTERNS = [
    [["chin", "r_chin"], ["neck", "r_neck5"], ["jaw", "r_jaw5"]],
    [["chin", "r_chin"], ["smile", "r_smile"], ["neck", "r_neck2"]],
    [["chin", "r_chin"], ["jaw", "r_jaw2"], ["neck", "r_neck2"]],
    [["smile", "r_smile"], ["jaw", "r_jaw5"], ["neck", "r_neck5"]]
  ];
  var LIFE = [["l_walk", "l_breakfast", "l_sleep"], ["l_water", "l_fruit", "l_touch"], ["l_towel", "l_rub", "l_walk"]];

  // Is the first active used on this day? Slow schedules, one new product at a time. Day 8 is the first day.
  function activeDue(id, day) {
    if (day < 8) return false;
    var k = (day - 8) % 7;
    if (id === "niacinamide" || id === "hyaluronic") return true;
    if (id === "vitamin_c") return day >= 22 ? true : (day - 8) % 2 === 0;
    if (id === "salicylic" || id === "retinol") return day >= 22 ? (k === 0 || k === 3) : k === 0 || (id === "retinol" && k === 3);
    if (id === "lactic") return k === 0;
    return false;
  }
  function phaseOf(day) { return day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : 4; }

  function build(day, ctx) {
    day = Math.max(1, Math.min(30, day | 0)); ctx = ctx || {};
    var R = window.FZSkin ? window.FZSkin.build(ctx.skinType, !!ctx.sensitive, ctx.flags || {}) : { am: [], pm: [], basic: true, known: false };
    var ck = ctx.checkins || {};
    var paused = ck[day - 1] === "irritated" || ck[day - 2] === "irritated"; // irritation in the last two check-ins: no serum
    var canActive = !R.basic && R.known && !!ctx.profileDone && day >= 8 && !paused;

    function skinItems(list) {
      var out = [], newActive = null;
      list.forEach(function (st) {
        if (st.active) {
          if (!canActive || !activeDue(st.id, day)) return;
          if (day === 8) newActive = st;
          out.push({ title: st.title + " (" + st.strength + ")", text: [st.amount + ".", st.how, st.freq ? st.freq + "." : ""].filter(Boolean).join(" "), active: true });
        } else {
          out.push({ title: st.title + (st.product ? " (" + st.product + ")" : ""), text: st.amount + ". " + st.how });
        }
      });
      return { items: out, newActive: newActive };
    }
    var am = skinItems(R.am), pm = skinItems(R.pm);
    var activeStep = null; R.am.concat(R.pm).forEach(function (st) { if (st.active) activeStep = st; });

    var minutes = ctx.dailyMinutes || 10, nEx = minutes <= 5 ? 2 : 3;
    var pat = EX_PATTERNS[day % 4].slice(0, nEx);
    var ex = pat.map(function (e) { return { title: T(e[0]), text: T(e[1]) }; });
    var life = LIFE[day % 3].map(function (k) { return { title: T(k), text: "" }; });

    // special task
    var special = T("s" + day), link = null, needNote = "";
    if ((day === 8 || day === 9) && paused && !R.basic && R.known && ctx.profileDone) {
      special = T("a_paused");
    } else if (day === 8) {
      special = canActive && activeStep ? T("a8_on", { name: activeStep.title, strength: activeStep.strength })
        : R.basic ? T("a8_basic") : !ctx.profileDone ? T("a8_profile") : T("a8_type");
      if (!ctx.profileDone) link = { href: "/profile", text: T("sp_profile") };
    } else if (day === 9) {
      special = canActive && activeStep ? T("a9_on", { name: activeStep.title }) : T("a9_off");
    } else if (day === 1) {
      var have = ctx.productsHave || [], need = [];
      [["cleanser", "need_cleanser"], ["moisturiser", "need_moisturiser"], ["sunscreen", "need_sunscreen"]].forEach(function (x) { if (have.indexOf(x[0]) < 0) need.push(T(x[1])); });
      if (need.length) special += " " + T("need_h") + need.join(", ") + ".";
    }
    if ([5, 12, 15, 17, 24].indexOf(day) >= 0) link = { href: "/report", text: T("sp_report"), report: true };
    if (day === 30) link = { href: "/analyze/", text: T("sp_analyze") };
    if (day === 19 || day === 23) link = { href: "/exercises", text: T("sp_exercises") };

    var prev = ck[day - 1], advice = "";
    if (paused) advice = day >= 8 && !R.basic && R.known && ctx.profileDone ? T("adv_pause") : T("adv_irritated");
    else if (prev === "dry") advice = T("adv_dry"); else if (prev === "oily") advice = T("adv_oily"); else if (prev === "breakouts") advice = T("adv_breakouts");

    return {
      advice: advice, paused: paused, day: day, phase: { n: phaseOf(day), name: T("p" + phaseOf(day)) }, title: T("d" + day),
      newActive: am.newActive || pm.newActive ? true : false,
      tasks: [
        { id: "am", title: T("t_am"), items: am.items },
        { id: "ex", title: T("t_ex"), items: ex, note: T("ex_note", { n: minutes <= 5 ? 5 : 10 }), link: { href: "/exercises", text: T("ex_link") } },
        { id: "life", title: T("t_life"), items: life },
        { id: "pm", title: T("t_pm"), items: pm.items },
        { id: "special", title: T("t_special"), items: [], note: special, link: link }
      ]
    };
  }

  // ---------- weekly and final reports: worked out from the person's own ticks and check-ins, no AI, no photos ----------
  var TASKS5 = ["am", "ex", "life", "pm", "special"];
  var WEEKS = [[1, 7], [8, 14], [15, 21], [22, 28]];
  function ticks(done, day) { var l = (done && done[String(day)]) || []; return TASKS5.filter(function (t) { return l.indexOf(t) >= 0; }); }
  function dayDone(done, day) { return ticks(done, day).length === 5; }
  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }

  // which reports can be shown now? [ "w1", "w2", ..., "final" ]
  function reportsAvailable(S) {
    var out = [];
    WEEKS.forEach(function (w, i) { if (dayDone(S.done, w[1]) || S.active > w[1]) out.push("w" + (i + 1)); });
    if (dayDone(S.done, 30)) out.push("final");
    return out;
  }
  // S = { done, checkins (or null when the check-in column is not there), missed, active }
  function report(key, S) {
    var from = 1, to = 30, title = T("r_final"), idx = 0;
    if (key !== "final") { idx = parseInt(String(key).slice(1), 10); from = WEEKS[idx - 1][0]; to = WEEKS[idx - 1][1]; title = T("r_week", { n: idx }); }
    var n = to - from + 1, t = 0, d = 0, sp = 0;
    for (var day = from; day <= to; day++) { var k = ticks(S.done, day); t += k.length; if (k.length === 5) d++; if (k.indexOf("special") >= 0) sp++; }
    var rows = [
      { label: T("r_consistency"), value: pct(t, 5 * n) + "%" },
      { label: T("r_days"), value: T("r_of", { a: d, b: n }) },
      { label: T("r_special"), value: T("r_of", { a: sp, b: n }) }
    ];
    var notes = [], ck = S.checkins, counts = { good: 0, dry: 0, oily: 0, irritated: 0, breakouts: 0 }, total = 0, afterTol = 0;
    if (ck) {
      for (var d2 = from; d2 <= to; d2++) { var c = ck[d2]; if (counts[c] != null) { counts[c]++; total++; } }
      var irr = counts.irritated, mixedN = counts.dry + counts.oily + counts.breakouts;
      var level = !total ? "none" : irr > 0 ? "care" : mixedN * 2 >= total ? "mixed" : "good";
      rows.push({ label: T("r_comfort"), value: T("c_" + level) });
      if (total) rows.push({ label: T("r_checkins"), value: ["good", "dry", "oily", "irritated", "breakouts"].filter(function (x) { return counts[x]; }).map(function (x) { return T("ci_" + x) + " " + counts[x]; }).join("  ·  ") });
      if (to >= 8) {
        var tolIrr = 0, tolAny = 0;
        for (var d3 = Math.max(9, from); d3 <= to; d3++) { if (ck[d3]) { tolAny++; if (ck[d3] === "irritated") tolIrr++; } }
        var started = false; for (var d4 = 8; d4 <= to; d4++) if (dayDone(S.done, d4) || ticks(S.done, d4).length) started = true;
        rows.push({ label: T("r_tol"), value: !started ? T("tol_none") : !tolAny ? T("tol_nodata") : tolIrr ? T("tol_bad") : T("tol_ok") });
      }
      notes.push(level === "care" ? T("n_care") : level === "mixed" ? T("n_mixed") : level === "good" ? T("n_good") : "");
    }
    rows.push({ label: T("r_missed"), value: String(S.missed || 0) });
    if (key !== "final") rows.push({ label: T("r_next"), value: T("p" + phaseOf(Math.min(30, to + 1))) });
    notes.push(T("n_nothing"));
    notes = notes.filter(Boolean);
    return { key: key, title: title, rows: rows, notes: notes, basis: T("n_basis"), photo: T("n_photo"), photoLink: { href: "/compare", text: T("n_photo_link") } };
  }

  window.FZDays = { report: report, reportsAvailable: reportsAvailable, build: build, activeDue: activeDue, phaseOf: phaseOf, TASKS: ["am", "ex", "life", "pm", "special"], strings: X /* used by the test script */ };
})();
