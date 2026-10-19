/* Facerizer: builds the Barber card and the full report as a PDF, on the user's own device.
   Needs jsPDF (loaded on demand by report.js). No photo is included in the PDF. */
(function () {
  var TEAL = [31, 122, 111], INK = [17, 42, 51], MUTED = [90, 108, 116], LINE = [205, 214, 218];

  function clean(s) {
    return String(s == null ? "" : s)
      .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-").replace(/\u2026/g, "...").replace(/\u00b7/g, "-")
      .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "");
  }

  window.facerizerPdf = function (r, created, kind, opts) {
    opts = opts || {};
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: "mm", format: "a4" });
    var W = 210, H = 297, M = 16, CW = W - 2 * M, y = M;

    function ensure(h) { if (y + h > H - 20) { doc.addPage(); y = M; } }

    function text(str, size, style, color, gap, indent) {
      doc.setFont("helvetica", style || "normal");
      doc.setFontSize(size);
      doc.setTextColor.apply(doc, color || INK);
      var x = M + (indent || 0);
      var lines = doc.splitTextToSize(clean(str), CW - (indent || 0));
      var lh = size * 0.3528 * 1.4;
      ensure(lines.length * lh);
      lines.forEach(function (l) { doc.text(l, x, y + size * 0.3528); y += lh; });
      y += gap || 0;
    }
    function heading(str) {
      y += 4; ensure(14);
      text(str, 14, "bold", TEAL, 1);
      doc.setDrawColor.apply(doc, LINE); doc.line(M, y, W - M, y); y += 3;
    }
    function dateStr() {
      try { return new Date(created).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; }
    }

    // ---------- header ----------
    doc.setFillColor.apply(doc, INK); doc.rect(0, 0, W, 26, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
    doc.text("Facerizer", M, 13);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(95, 211, 192);
    doc.text(kind === "barber" ? "Barber card" : "Your analysis report", M, 20);
    doc.setTextColor(220, 230, 232); doc.text(dateStr(), W - M, 20, { align: "right" });
    y = 36;

    var vh = r.visible_hair, hairBits = [];
    if (vh) {
      if (vh.type && vh.type !== "unclear") hairBits.push(vh.type);
      if (vh.length && vh.length !== "unclear") hairBits.push(vh.length + " length");
      if (vh.density && vh.density !== "unclear") hairBits.push(vh.density);
    }

    function hairstyles(showWhy) {
      (r.hairstyles || []).forEach(function (h, i) {
        ensure(34);
        text((i + 1) + ". " + h.name, 13, "bold", INK, 0.5);
        text((h.category ? h.category + "  |  " : "") + h.length + " length  |  Upkeep: " + h.maintenance + "  |  Styling: " + h.styling, 9, "normal", MUTED, 1.5);
        if (h.ask_barber) text('Tell your barber: "' + h.ask_barber + '"', 10.5, "italic", TEAL, 1.5);
        if (showWhy && h.why) text(h.why, 10, "normal", INK, 0);
        y += 4;
      });
    }

    if (kind === "barber") {
      text("Show this card to your barber or stylist", 12, "bold", INK, 1);
      if (r.face_shape) text("Face shape: " + r.face_shape.type, 11, "normal", INK, 0.5);
      if (hairBits.length) text("Visible hair: " + hairBits.join(", "), 11, "normal", INK, 0.5);
      heading("Hairstyle ideas");
      hairstyles(true);
      if (r.grooming && r.grooming.length) {
        heading("Grooming notes");
        r.grooming.forEach(function (g) { text(g.title, 10.5, "bold", INK, 0.3); text(g.text, 10, "normal", INK, 2.5); });
      }
      heading("Notes");
      for (var n = 0; n < 5; n++) { ensure(9); doc.setDrawColor.apply(doc, LINE); doc.line(M, y + 6, W - M, y + 6); y += 9; }
    } else {
      // ---------- full report ----------
      if (r.score != null && !opts.hideScores) {
        text("AI Appearance Analysis Score: " + r.score + " / 100", 13, "bold", INK, 0.5);
        text("This score reflects visible facial characteristics in this photo and is not an objective measure of beauty.", 8.5, "italic", MUTED, 2);
      }
      if (r.face_shape) text("Face shape: " + r.face_shape.type + " (" + r.face_shape.confidence + "% confident)", 11, "normal", INK, 1);
      if (hairBits.length) text("Visible hair: " + hairBits.join(", "), 11, "normal", INK, 1);
      if (r.summary) text(r.summary, 10.5, "normal", INK, 1);

      if (r.strengths && r.strengths.length) {
        heading("Your strengths");
        r.strengths.forEach(function (s) { text(s.title, 10.5, "bold", INK, 0.3); text(s.text, 10, "normal", INK, 2.5); });
      }
      if (r.improvements && r.improvements.length) {
        heading("Areas to refine");
        r.improvements.forEach(function (s) { text(s.title, 10.5, "bold", INK, 0.3); text(s.text, 10, "normal", INK, 2.5); });
      }
      heading("Hairstyles for you");
      hairstyles(true);
      if (r.glasses && r.glasses.length) {
        heading("Glasses that suit you");
        r.glasses.forEach(function (g) {
          text(g.shape + " frames  (" + (g.tier === "best" ? "best match" : "worth trying") + ")", 10.5, "bold", INK, 0.3);
          text(g.why, 10, "normal", INK, 2.5);
        });
      }
      if (r.grooming && r.grooming.length) {
        heading("Grooming tips");
        r.grooming.forEach(function (g) { text(g.title, 10.5, "bold", INK, 0.3); text(g.text, 10, "normal", INK, 2.5); });
      }
      if (r.features) {
        heading("Feature by feature");
        var names = { eyes: "Eyes", eyebrows: "Eyebrows", nose: "Nose", lips: "Lips", jawline: "Jawline", chin: "Chin", cheekbones: "Cheekbones", skin_appearance: "Skin appearance" };
        Object.keys(names).forEach(function (k) {
          var f = r.features[k]; if (!f) return;
          text(names[k], 10.5, "bold", INK, 0.3);
          text(f.observation, 10, "normal", INK, 0.5);
          text("Suggestion: " + f.suggestion, 10, "normal", MUTED, 2.5);
        });
      }
      if (r.skincare) {
        heading("Skincare routine");
        text("Morning: " + (r.skincare.morning || []).join(", "), 10, "normal", INK, 1);
        text("Evening: " + (r.skincare.evening || []).join(", "), 10, "normal", INK, 1);
        text(r.skincare.note || "", 8.5, "italic", MUTED, 1);
      }
      if (r.plan_weeks && r.plan_weeks.length) {
        heading("30-day improvement plan");
        r.plan_weeks.forEach(function (w) {
          text("Week " + w.week + ": " + w.title, 10.5, "bold", INK, 0.3);
          (w.tasks || []).forEach(function (t) { text("[  ]  " + t, 10, "normal", INK, 0.6, 2); });
          y += 2;
        });
      }
    }

    // ---------- footer on every page ----------
    var pages = doc.getNumberOfPages();
    for (var p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor.apply(doc, MUTED);
      doc.text("General style and grooming guidance only. Not medical advice.", M, H - 14);
      doc.text("Facerizer  -  www.facerizer.com", M, H - 9);
      doc.text("Page " + p + " of " + pages, W - M, H - 9, { align: "right" });
    }
    doc.save(kind === "barber" ? "facerizer-barber-card.pdf" : "facerizer-report.pdf");
  };
})();
