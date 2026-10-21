(function () {
  var $ = function (id) { return document.getElementById(id); };
  var ICONS = {
    jaw: '<svg viewBox="0 0 24 24"><path d="M4 6c0 8 3 13 8 14 5-1 8-6 8-14"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    brow: '<svg viewBox="0 0 24 24"><path d="M3 15c3-6 10-8 18-4"/><path d="M7 18h.01M12 18h.01M17 18h.01"/></svg>',
    skin: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>',
    hair: '<svg viewBox="0 0 24 24"><circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.5 8.5L20 19M8.5 15.5L20 5"/></svg>',
    glasses: '<svg viewBox="0 0 24 24"><circle cx="6.5" cy="14" r="3.5"/><circle cx="17.5" cy="14" r="3.5"/><path d="M10 14h4M3 12l1-5M21 12l-1-5"/></svg>',
    grooming: '<svg viewBox="0 0 24 24"><path d="M5 4h14v6a7 7 0 01-14 0z"/><path d="M9 14c1 1.2 2 1.5 3 1.5s2-.3 3-1.5"/></svg>',
    harmony: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/></svg>'
  };

  // Sample data only. Same shape as a real report.
  var R = {
    plan: "pro",
    score: 82,
    face_shape: { type: "Oval", confidence: 87 },
    summary: "Your features are well balanced, and most hairstyles and frame shapes will work for you. A few grooming and styling choices can bring out your strengths even more.",
    visible_hair: { type: "wavy", length: "medium", density: "thick", hairline: "even" },
    strengths: [
      { icon: "jaw", title: "Defined jawline", text: "A clear lower-face contour that holds up under most haircuts." },
      { icon: "eye", title: "Balanced eye area", text: "Eyes sit in good proportion to the rest of the face." },
      { icon: "brow", title: "Structured brows", text: "A clean, well-framed shape that suits the eye line." },
      { icon: "skin", title: "Even skin appearance", text: "Looks even and consistent in this photo." }
    ],
    improvements: [
      { title: "Brows could be tidied", text: "A light clean-up under the arch will make the frame look sharper." },
      { title: "Sides carry extra volume", text: "Slightly shorter sides will balance the top and elongate the face." },
      { title: "Facial hair is patchy near the jaw", text: "A short, even trim along the jaw line will add definition." }
    ],
    hairstyles: [
      { category: "Everyday", name: "Layered medium cut", why: "Layers use your natural wave and keep volume off the sides, which suits an oval face.", ask_barber: "Medium layers, a little longer on top, light taper at the sides.", maintenance: "low", styling: "easy", length: "medium" },
      { category: "Trendy", name: "Textured quiff", why: "Height on top lengthens a balanced face, and the texture works well with thick waves.", ask_barber: "Short sides with a taper, longer textured top that I can sweep up.", maintenance: "medium", styling: "moderate", length: "short" },
      { category: "Professional", name: "Classic side part", why: "A clean side part frames the forehead and looks sharp for work.", ask_barber: "Scissor cut, natural side part, tidy neckline.", maintenance: "medium", styling: "easy", length: "short" },
      { category: "Low-maintenance", name: "Short natural crop", why: "Needs only a quick wash and a touch of product, and keeps the face shape balanced.", ask_barber: "Even short crop, number 2 on the sides, a little longer on top.", maintenance: "low", styling: "easy", length: "short" },
      { category: "Bold", name: "Taper fade with volume", why: "A clear fade makes the jawline stand out while the top keeps its volume.", ask_barber: "Mid taper fade, keep two to three inches on top, blend the sides.", maintenance: "high", styling: "moderate", length: "short" }
    ],
    glasses: [
      { shape: "Rectangle", tier: "best", why: "Adds definition without hiding your features. Choose a frame about as wide as your cheekbones, in thin metal or slim acetate." },
      { shape: "Round", tier: "best", why: "Softens a defined jaw and looks modern. A medium frame in a dark tortoise colour works well." },
      { shape: "Browline", tier: "try", why: "Worth trying for a smart look. It highlights your brow line, so keep the frame lightweight." }
    ],
    grooming: [
      { title: "Keep a short, even beard line", text: "Trim along the jaw and keep the cheek line clean to define your lower face." },
      { title: "Tidy the brows every two weeks", text: "Remove only stray hairs under the arch and keep the natural shape." },
      { title: "Style with a little product", text: "Use a small amount of texturing cream or clay on slightly damp hair." },
      { title: "Explore a lighter moustache trim", text: "If you wear one, keep it just above the lip line so it does not weigh the face down." }
    ],
    features: {
      eyes: { observation: "Well spaced and in good proportion to the face.", suggestion: "Keep brows slightly lifted to open the eye area.", confidence: "high" },
      eyebrows: { observation: "Medium thickness with a gentle arch.", suggestion: "Clean only the lower edge and keep the natural arch.", confidence: "high" },
      nose: { observation: "In balance with the width of the face.", suggestion: "Frames with a light bridge keep the focus on the eyes.", confidence: "medium" },
      lips: { observation: "Even and proportionate in this photo.", suggestion: "A simple lip balm is enough for everyday care.", confidence: "medium" },
      jawline: { observation: "Clearly defined from ear to chin.", suggestion: "Keep facial hair short along the jaw to show the line.", confidence: "high" },
      chin: { observation: "Balanced with the forehead width.", suggestion: "A short beard line below the lip keeps the chin balanced.", confidence: "medium" },
      cheekbones: { observation: "Softly visible and balanced with the jaw.", suggestion: "Avoid very wide side volume that hides them.", confidence: "medium" },
      skin_appearance: { observation: "Looks even with some natural texture in this photo.", suggestion: "A gentle cleanser, moisturizer and sunscreen is a good daily base.", confidence: "medium" }
    },
    skincare: {
      morning: ["Gentle cleanser", "Moisturizer", "Sunscreen"],
      evening: ["Gentle cleanser", "Moisturizer"],
      note: "General cosmetic guidance only. Consult a qualified dermatologist for persistent or concerning skin issues."
    },
    plan_weeks: [
      { week: 1, title: "Grooming", tasks: ["Trim your facial hair along the jaw line", "Clean up stray brow hairs", "Book the recommended haircut", "Take a baseline photo in natural light"] },
      { week: 2, title: "Skin and self-care", tasks: ["Start the morning and evening routine", "Drink water through the day and sleep 7 hours", "Add sunscreen to your morning habit"] },
      { week: 3, title: "Hair and styling", tasks: ["Get the haircut and take your barber card", "Practise styling with a small amount of product", "Try the recommended glasses shapes"] },
      { week: 4, title: "Presentation", tasks: ["Pick two outfits that suit your face shape", "Take a progress photo in the same light", "Run a new analysis and compare"] }
    ]
  };

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function hairArt(h) {
    var H = window.facerizerHair;
    return H ? H.svg(H.keyFor(h.name, h.length)) : null;
  }
  function row(icon, label, title, text, tags, example, barber, art) {
    var li = el("li", "row2");
    var ico = el("span", art ? "ico art" : "ico");
    ico.innerHTML = art || ICONS[icon] || ICONS.harmony;
    var tx = el("div", "tx");
    if (label) tx.appendChild(el("small", "", label));
    tx.appendChild(el("strong", "", title));
    if (text) tx.appendChild(el("span", "d", text));
    if (barber) { var bq = el("span", "d", "Tell your barber: " + barber); bq.style.fontStyle = "italic"; tx.appendChild(bq); }
    if (tags && tags.length) { var w = el("div"); tags.forEach(function (t) { w.appendChild(el("span", "tag", t)); }); tx.appendChild(w); }
    if (example) {
      var a = el("a", "ex-link", "See examples");
      a.href = "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(example);
      a.target = "_blank"; a.rel = "noopener";
      tx.appendChild(a);
    }
    li.appendChild(ico); li.appendChild(tx);
    return li;
  }
  function fill(id, nodes) { var t = $(id); t.textContent = ""; nodes.forEach(function (n) { t.appendChild(n); }); }

  // insights
  var chips = $("chips");
  chips.appendChild(el("span", "chip", "Face shape: " + R.face_shape.type + " (" + R.face_shape.confidence + "% confident)"));
  chips.appendChild(el("span", "chip", "Example data"));
  $("insight-text").textContent = R.summary;

  fill("r-strengths", R.strengths.map(function (s) { return row(s.icon, "", s.title, s.text); }));
  fill("r-improve", R.improvements.map(function (s) { return row("harmony", "", s.title, s.text); }));

  var vh = R.visible_hair;
  $("hair-based").textContent = "Based on what we can see: " + vh.type + ", " + vh.length + " length, " + vh.density + " hair. Your own report reads your hair from your photo.";
  fill("r-hair", R.hairstyles.map(function (h) {
    var tags = [h.category, "Upkeep: " + h.maintenance, "Styling: " + h.styling, h.length + " length"];
    return row("hair", "", h.name, h.why, tags, h.name + " hairstyle", h.ask_barber, hairArt(h));
  }));
  fill("r-glasses", R.glasses.map(function (g) {
    return row("glasses", g.tier === "best" ? "Best match" : "Worth trying", g.shape + " frames", g.why, null, g.shape + " glasses frames");
  }));
  fill("r-grooming", R.grooming.map(function (g) { return row("grooming", "", g.title, g.text); }));

  // features
  var ft = $("r-features"); ft.textContent = "";
  var grid = el("div", "fgrid");
  var names = { eyes: "Eyes", eyebrows: "Eyebrows", nose: "Nose", lips: "Lips", jawline: "Jawline", chin: "Chin", cheekbones: "Cheekbones", skin_appearance: "Skin appearance" };
  Object.keys(names).forEach(function (k) {
    var f = R.features[k];
    var c = el("div", "fcard");
    c.appendChild(el("h3", "", names[k]));
    c.appendChild(el("p", "", f.observation));
    c.appendChild(el("p", "", "Suggestion: " + f.suggestion));
    c.appendChild(el("span", "tag", "Confidence: " + f.confidence));
    grid.appendChild(c);
  });
  ft.appendChild(grid);

  // skincare
  var sk = $("r-skin"); sk.textContent = "";
  var cols = el("div", "skin-cols");
  [["Morning", R.skincare.morning], ["Evening", R.skincare.evening]].forEach(function (p) {
    var d = el("div"); d.appendChild(el("h3", "", p[0]));
    var ul = el("ul"); p[1].forEach(function (x) { ul.appendChild(el("li", "", x)); });
    d.appendChild(ul); cols.appendChild(d);
  });
  sk.appendChild(cols);
  sk.appendChild(el("p", "fine", R.skincare.note));

  // plan
  var pl = $("r-plan"); pl.textContent = "";
  R.plan_weeks.forEach(function (w) {
    var d = el("div", "wk"); d.appendChild(el("h3", "", "Week " + w.week + ": " + w.title));
    var ul = el("ul"); w.tasks.forEach(function (t) { ul.appendChild(el("li", "", t)); });
    d.appendChild(ul); pl.appendChild(d);
  });

  // sample barber card
  function loadJsPdf() {
    return new Promise(function (resolve, reject) {
      if (window.jspdf) return resolve();
      var sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      sc.onload = resolve;
      sc.onerror = function () { reject(new Error("Could not load the PDF tool. Check your internet and try again.")); };
      document.head.appendChild(sc);
    });
  }
  $("dl-barber").addEventListener("click", function () {
    var m = $("dl-msg"); m.textContent = "Preparing your PDF..."; m.className = "msg";
    loadJsPdf().then(function () {
      if (!window.facerizerPdf) throw new Error("PDF file is missing. Upload pdf.js to GitHub.");
      window.facerizerPdf(R, new Date().toISOString(), "barber", { sample: true });
      m.textContent = "Done. Check your downloads."; m.className = "msg ok";
    }).catch(function (e) { console.error(e); m.textContent = e.message || "Could not create the PDF."; m.className = "msg error"; });
  });
})();
