/* AN KA TAA — Espace adhérent : recherche, carte, QR, export PNG */
(function () {
  "use strict";

  var DATA_URL = "data/adherents.json";
  var STORAGE_KEY = "akt_adherents_override"; // édité côté admin

  var state = { asso: null, adherents: [], current: null };

  var els = {
    form: document.getElementById("search-form"),
    input: document.getElementById("search-input"),
    message: document.getElementById("message"),
    cardSection: document.getElementById("card-section"),
    searchSection: document.getElementById("search-section"),
    card: document.getElementById("member-card"),
    downloadBtn: document.getElementById("download-btn"),
    downloadPdfBtn: document.getElementById("download-pdf-btn"),
    resetBtn: document.getElementById("reset-btn"),
    year: document.getElementById("year")
  };

  if (els.year) els.year.textContent = new Date().getFullYear();

  /* ---------- Utils ---------- */
  function estPaye(a) {
    var s = (a.statut_paiement || "").toLowerCase();
    return s === "payé" || s === "paye" || s === "payée" || s === "ok";
  }
  function norm(s) { return (s || "").toString().trim().toLowerCase(); }
  function esc(s) {
    return (s == null ? "" : String(s)).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // Recherche par matricule, email OU nom/prénom. Retourne un tableau.
  function trouverTous(q) {
    var t = norm(q);
    if (!t) return [];
    // 1) Correspondance exacte matricule / email
    var exact = state.adherents.filter(function (a) {
      return norm(a.matricule) === t || norm(a.email) === t;
    });
    if (exact.length) return exact;
    // 2) Correspondance par nom/prénom (ordre indifférent, tous les mots présents)
    var tokens = t.split(/\s+/).filter(Boolean);
    return state.adherents.filter(function (a) {
      var full1 = norm(a.prenom + " " + a.nom);
      var full2 = norm(a.nom + " " + a.prenom);
      if (full1 === t || full2 === t) return true;
      return tokens.every(function (tok) { return full1.indexOf(tok) !== -1; });
    });
  }

  /* ---------- Chargement des données ---------- */
  function chargerDonnees() {
    // Priorité aux éventuelles modifications locales de l'admin
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && Array.isArray(o.adherents)) {
          state.asso = o.association || null;
          state.adherents = o.adherents;
          return Promise.resolve();
        }
      }
    } catch (e) {}

    return fetch(DATA_URL, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        state.asso = data.association || null;
        state.adherents = data.adherents || [];
      });
  }

  /* ---------- Affichage ---------- */
  function afficherMessage(html, type) {
    var couleurs = {
      error: "bg-red-50 border-akt-red/40 text-akt-red",
      warn: "bg-amber-50 border-akt-gold/50 text-akt-brownd",
      info: "bg-white border-akt-brown/20 text-akt-brownd"
    };
    els.message.className =
      "max-w-xl mx-auto mt-8 rounded-2xl border p-6 shadow-sm " + (couleurs[type] || couleurs.info);
    els.message.innerHTML = html;
    els.message.classList.remove("hidden");
  }

  function cacherMessage() { els.message.classList.add("hidden"); els.message.innerHTML = ""; }

  function anneeCotisation(a) {
    if (a.annee_cotisation) return a.annee_cotisation;
    if (a.date_expiration) return String(a.date_expiration).slice(0, 4);
    if (a.date_adhesion) return String(a.date_adhesion).slice(0, 4);
    return new Date().getFullYear();
  }

  function construireCarte(a) {
    var nomComplet = esc((a.prenom || "") + " " + (a.nom || "")).trim();
    var annee = esc(anneeCotisation(a));
    var type = esc(a.type_adhesion || "Membre");
    var formule = esc(a.formule || "");

    els.card.innerHTML =
      '<div class="arc"></div>' +
      '<div class="akt-strip absolute top-0 inset-x-0"></div>' +
      '<div class="relative h-full w-full p-6 flex flex-col">' +
        '<div class="flex items-start justify-between">' +
          '<div class="flex items-center gap-3">' +
            '<div class="bg-white rounded-xl p-1.5 shadow-md">' +
              '<img src="assets/logo.png" alt="AKT" style="height:44px;width:44px;object-fit:contain" />' +
            '</div>' +
            '<div>' +
              '<p style="font-weight:700;letter-spacing:1px;font-size:18px">AN KA TAA</p>' +
              '<p style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase" class="gold-text">Nos racines, notre avenir</p>' +
            '</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<p style="font-size:10px;letter-spacing:2px;text-transform:uppercase;opacity:.75">Carte adhérent</p>' +
            '<p style="font-size:22px;font-weight:700" class="gold-text">' + annee + '</p>' +
          '</div>' +
        '</div>' +

        '<div style="margin-top:auto" class="flex items-end justify-between gap-4">' +
          '<div style="min-width:0">' +
            '<p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:.7">Membre</p>' +
            '<p style="font-size:24px;font-weight:700;line-height:1.1;margin-top:2px">' + (nomComplet || "&nbsp;") + '</p>' +
            '<p style="margin-top:10px;font-size:13px;letter-spacing:2px" class="gold-text">' + esc(a.matricule) + '</p>' +
            '<p style="margin-top:6px;font-size:12px;opacity:.85">' + type + (formule ? ' · ' + formule : '') + '</p>' +
          '</div>' +
          '<div class="bg-white" style="padding:8px;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,.25)">' +
            '<div id="qrcode"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    // QR code = URL de vérification contenant le matricule
    var base = location.origin + location.pathname;
    var qrData = base + "?m=" + encodeURIComponent(a.matricule);
    new QRCode(document.getElementById("qrcode"), {
      text: qrData,
      width: 92,
      height: 92,
      colorDark: "#3E1F0B",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  function afficherCarte(a) {
    state.current = a;
    cacherMessage();
    construireCarte(a);
    els.searchSection.classList.add("hidden");
    els.cardSection.classList.remove("hidden");
    els.cardSection.classList.add("flex");
    els.cardSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function afficherNonPaye(a) {
    state.current = null;
    els.cardSection.classList.add("hidden");
    var email = state.asso && state.asso.email ? state.asso.email : "contact@ankataa.org";
    afficherMessage(
      '<div>' +
        '<div>' +
          '<h2 class="font-display text-xl font-bold">Cotisation non à jour</h2>' +
          '<p class="mt-1 text-sm">Bonjour <strong>' + esc(a.prenom + " " + a.nom) + '</strong>, ' +
          'ton adhésion (<strong>' + esc(a.matricule) + '</strong>) n\'est pas encore réglée pour l\'année ' + esc(anneeCotisation(a)) + '.</p>' +
          '<div class="mt-4 rounded-xl bg-white/70 border border-akt-gold/40 p-4 text-sm text-akt-brownd">' +
            '<p class="font-semibold text-akt-brown">Pour régulariser :</p>' +
            '<ul class="mt-2 space-y-1 list-disc list-inside">' +
              '<li>Virement, espèces ou PayPal auprès du bureau</li>' +
              '<li>Précise ton matricule <strong>' + esc(a.matricule) + '</strong> en référence</li>' +
              '<li>Contact : <a class="underline text-akt-brown" href="mailto:' + esc(email) + '">' + esc(email) + '</a></li>' +
            '</ul>' +
            '<p class="mt-3 text-xs opacity-70">Ta carte sera générée automatiquement une fois le paiement validé.</p>' +
          '</div>' +
          '<button id="retry" class="mt-4 text-sm underline text-akt-brown">Faire une autre recherche</button>' +
        '</div>' +
      '</div>',
      "warn"
    );
    var r = document.getElementById("retry");
    if (r) r.onclick = reinitialiser;
  }

  function afficherIntrouvable() {
    els.cardSection.classList.add("hidden");
    afficherMessage(
      '<h2 class="font-display text-lg font-bold">Adhérent introuvable</h2>' +
      '<p class="mt-1 text-sm">Aucun membre ne correspond à cette recherche. Vérifie ton matricule ou ton email, ' +
      'ou contacte le bureau de l\'association.</p>',
      "error"
    );
  }

  function reinitialiser() {
    state.current = null;
    els.input.value = "";
    cacherMessage();
    els.cardSection.classList.add("hidden");
    els.searchSection.classList.remove("hidden");
    els.input.focus();
    if (history.replaceState) history.replaceState(null, "", location.pathname);
  }

  function traiterAdherent(a) {
    if (estPaye(a)) afficherCarte(a);
    else afficherNonPaye(a);
  }

  function afficherChoix(results) {
    els.cardSection.classList.add("hidden");
    var items = results.map(function (a) {
      return '<button data-pick="' + esc(a.matricule) + '" ' +
        'class="w-full text-left px-4 py-3 rounded-xl border border-akt-brown/15 bg-white hover:bg-akt-cream transition flex items-center justify-between gap-3">' +
        '<span><span class="font-semibold">' + esc(a.prenom + " " + a.nom) + '</span>' +
        '<span class="block text-xs text-akt-brown/60">' + esc(a.matricule) +
        (a.ville ? ' · ' + esc(a.ville) : '') + '</span></span>' +
        '<span class="text-xs text-akt-brown/40">Choisir</span>' +
      '</button>';
    }).join("");
    afficherMessage(
      '<h2 class="font-display text-lg font-bold text-akt-brown">Plusieurs adhérents trouvés</h2>' +
      '<p class="mt-1 mb-3 text-sm text-akt-brown/70">Sélectionne ton profil :</p>' +
      '<div class="space-y-2">' + items + '</div>',
      "info"
    );
    els.message.querySelectorAll("[data-pick]").forEach(function (b) {
      b.addEventListener("click", function () {
        var m = b.getAttribute("data-pick");
        var a = state.adherents.find(function (x) { return x.matricule === m; });
        if (a) traiterAdherent(a);
      });
    });
  }

  function rechercher(q) {
    if (!q) return;
    var results = trouverTous(q);
    if (results.length === 0) return afficherIntrouvable();
    if (results.length === 1) return traiterAdherent(results[0]);
    afficherChoix(results);
  }

  /* ---------- Export PNG ---------- */
  function telecharger() {
    if (!state.current) return;
    var btn = els.downloadBtn;
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = "Génération…";
    html2canvas(els.card, { scale: 3, backgroundColor: null, useCORS: true, logging: false })
      .then(function (canvas) {
        var link = document.createElement("a");
        link.download = "carte-akt-" + (state.current.matricule || "adherent") + ".png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      })
      .catch(function () { alert("Impossible de générer l'image. Réessaie."); })
      .finally(function () { btn.disabled = false; btn.textContent = label; });
  }

  /* ---------- Export PDF ---------- */
  function telechargerPdf() {
    if (!state.current) return;
    if (!window.jspdf || !window.jspdf.jsPDF) { alert("Librairie PDF non chargée. Vérifie ta connexion."); return; }
    var btn = els.downloadPdfBtn;
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = "Génération…";
    html2canvas(els.card, { scale: 3, backgroundColor: null, useCORS: true, logging: false })
      .then(function (canvas) {
        var ratio = canvas.height / canvas.width;
        var cardW = 150;                    // mm
        var cardH = cardW * ratio;
        var doc = new window.jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        var pw = doc.internal.pageSize.getWidth();
        var ph = doc.internal.pageSize.getHeight();
        var x = (pw - cardW) / 2;
        var y = (ph - cardH) / 2 - 6;

        doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(90, 46, 18);
        doc.text("AN KA TAA", pw / 2, y - 8, { align: "center" });
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(120, 74, 30);
        doc.text("Carte d'adherent - Nos racines, notre avenir", pw / 2, y - 3, { align: "center" });

        doc.addImage(canvas.toDataURL("image/png"), "PNG", x, y, cardW, cardH);

        doc.setFontSize(8); doc.setTextColor(150);
        doc.text("Carte personnelle - a presenter lors des evenements de l'association.", pw / 2, y + cardH + 8, { align: "center" });

        doc.save("carte-akt-" + (state.current.matricule || "adherent") + ".pdf");
      })
      .catch(function () { alert("Impossible de générer le PDF. Réessaie."); })
      .finally(function () { btn.disabled = false; btn.textContent = label; });
  }

  /* ---------- Événements ---------- */
  els.form.addEventListener("submit", function (e) {
    e.preventDefault();
    rechercher(els.input.value);
  });
  els.downloadBtn.addEventListener("click", telecharger);
  els.downloadPdfBtn.addEventListener("click", telechargerPdf);
  els.resetBtn.addEventListener("click", reinitialiser);
  document.querySelectorAll("[data-demo]").forEach(function (b) {
    b.addEventListener("click", function () {
      els.input.value = b.getAttribute("data-demo");
      rechercher(els.input.value);
    });
  });

  /* ---------- Init ---------- */
  chargerDonnees()
    .then(function () {
      var m = new URLSearchParams(location.search).get("m");
      if (m) { els.input.value = m; rechercher(m); }
    })
    .catch(function () {
      afficherMessage(
        '<h2 class="font-bold">Données indisponibles</h2>' +
        '<p class="mt-1 text-sm">Le fichier des adhérents n\'a pas pu être chargé. ' +
        'Si tu ouvres la page en local, lance un petit serveur (ex. <code>python -m http.server</code>) ' +
        'ou consulte le site publié sur GitHub Pages.</p>',
        "error"
      );
    });
})();
