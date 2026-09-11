/* AN KA TAA — Tableau de bord admin : suivi, filtres, édition, export JSON/CSV */
(function () {
  "use strict";

  var DATA_URL = "data/adherents.json";
  var STORAGE_KEY = "akt_adherents_override";

  var db = { association: null, adherents: [] };
  var filtre = "tous";
  var recherche = "";

  var els = {
    stats: document.getElementById("stats"),
    tbody: document.getElementById("tbody"),
    empty: document.getElementById("empty"),
    q: document.getElementById("q"),
    jsonOut: document.getElementById("json-out")
  };

  /* ---------- Utils ---------- */
  function estPaye(a) {
    var s = (a.statut_paiement || "").toLowerCase();
    return s === "payé" || s === "paye" || s === "payée" || s === "ok";
  }
  function esc(s) {
    return (s == null ? "" : String(s)).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function norm(s) { return (s || "").toString().toLowerCase(); }

  function sauvegarder() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (e) {}
    rafraichirJson();
  }

  /* ---------- Chargement ---------- */
  function charger() {
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (raw) {
      try {
        var o = JSON.parse(raw);
        if (o && Array.isArray(o.adherents)) { db = o; return Promise.resolve(); }
      } catch (e) {}
    }
    return fetch(DATA_URL, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        db.association = data.association || null;
        db.adherents = data.adherents || [];
      });
  }

  /* ---------- Rendu ---------- */
  function filtres() {
    return db.adherents.filter(function (a) {
      if (filtre === "payé" && !estPaye(a)) return false;
      if (filtre === "non_payé" && estPaye(a)) return false;
      if (recherche) {
        var hay = norm([a.matricule, a.nom, a.prenom, a.email, a.ville, a.type_adhesion].join(" "));
        if (hay.indexOf(recherche) === -1) return false;
      }
      return true;
    });
  }

  function rendreStats() {
    var total = db.adherents.length;
    var payes = db.adherents.filter(estPaye).length;
    var nonPayes = total - payes;
    var taux = total ? Math.round((payes / total) * 100) : 0;
    var cards = [
      { label: "Adhérents", val: total, cls: "text-akt-brown" },
      { label: "À jour", val: payes, cls: "text-akt-green" },
      { label: "Non payé", val: nonPayes, cls: "text-akt-red" },
      { label: "Taux de paiement", val: taux + "%", cls: "text-akt-gold" }
    ];
    els.stats.innerHTML = cards.map(function (c) {
      return '<div class="bg-white rounded-2xl border border-akt-brown/10 shadow-sm p-4">' +
        '<p class="text-xs uppercase tracking-wide text-akt-brown/50">' + c.label + '</p>' +
        '<p class="mt-1 text-3xl font-bold ' + c.cls + '">' + c.val + '</p></div>';
    }).join("");
  }

  function badgeStatut(a) {
    return estPaye(a)
      ? '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-akt-green border border-akt-green/30">● Payé</span>'
      : '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-akt-red border border-akt-red/30">● Non payé</span>';
  }

  function rendreTable() {
    var rows = filtres();
    els.empty.classList.toggle("hidden", rows.length > 0);
    els.tbody.innerHTML = rows.map(function (a) {
      var toggleLabel = estPaye(a) ? "Marquer non payé" : "Marquer payé";
      var toggleCls = estPaye(a)
        ? "border-akt-red/30 text-akt-red hover:bg-red-50"
        : "border-akt-green/30 text-akt-green hover:bg-green-50";
      return '<tr class="hover:bg-akt-cream/40">' +
        '<td class="px-4 py-3 font-mono text-akt-brown">' + esc(a.matricule) + '</td>' +
        '<td class="px-4 py-3"><span class="font-semibold">' + esc(a.nom) + '</span> ' + esc(a.prenom) + '</td>' +
        '<td class="px-4 py-3 text-akt-brown/70">' + esc(a.email) + '</td>' +
        '<td class="px-4 py-3">' + esc(a.ville) + '</td>' +
        '<td class="px-4 py-3 text-xs">' + esc(a.type_adhesion) + '</td>' +
        '<td class="px-4 py-3">' + esc(a.date_expiration) + '</td>' +
        '<td class="px-4 py-3">' + badgeStatut(a) + '</td>' +
        '<td class="px-4 py-3 text-right">' +
          '<button data-toggle="' + esc(a.matricule) + '" class="px-3 py-1.5 rounded-lg border text-xs font-medium transition ' + toggleCls + '">' + toggleLabel + '</button>' +
        '</td>' +
      '</tr>';
    }).join("");

    els.tbody.querySelectorAll("[data-toggle]").forEach(function (b) {
      b.addEventListener("click", function () { basculer(b.getAttribute("data-toggle")); });
    });
  }

  function rafraichirJson() {
    if (els.jsonOut) els.jsonOut.value = JSON.stringify(db, null, 2);
  }

  function rendre() { rendreStats(); rendreTable(); rafraichirJson(); }

  /* ---------- Actions ---------- */
  function basculer(matricule) {
    var a = db.adherents.find(function (x) { return x.matricule === matricule; });
    if (!a) return;
    if (estPaye(a)) { a.statut_paiement = "non_payé"; a.modalite_paiement = ""; }
    else { a.statut_paiement = "payé"; }
    sauvegarder();
    rendre();
  }

  function telechargerJson() {
    var blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url; link.download = "adherents.json"; link.click();
    URL.revokeObjectURL(url);
  }

  function exporterCsv() {
    var cols = ["matricule", "nom", "prenom", "email", "telephone", "ville",
      "type_adhesion", "formule", "date_adhesion", "date_expiration", "statut_paiement", "modalite_paiement"];
    var lignes = [cols.join(";")];
    db.adherents.forEach(function (a) {
      lignes.push(cols.map(function (c) {
        var v = a[c] == null ? "" : String(a[c]);
        return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(";"));
    });
    var blob = new Blob(["﻿" + lignes.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url; link.download = "adherents.csv"; link.click();
    URL.revokeObjectURL(url);
  }

  function importerFichier(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var o = JSON.parse(reader.result);
        if (!o || !Array.isArray(o.adherents)) throw new Error("format");
        db = o; sauvegarder(); rendre();
        alert("Fichier importé : " + o.adherents.length + " adhérents.");
      } catch (e) { alert("JSON invalide."); }
    };
    reader.readAsText(file);
  }

  function reinitialiserLocal() {
    if (!confirm("Effacer les modifications locales et recharger data/adherents.json ?")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    location.reload();
  }

  /* ---------- Événements ---------- */
  document.querySelectorAll(".filter-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      filtre = b.getAttribute("data-filter");
      document.querySelectorAll(".filter-btn").forEach(function (x) {
        x.classList.remove("bg-akt-brown", "text-white");
      });
      b.classList.add("bg-akt-brown", "text-white");
      rendreTable();
    });
  });
  els.q.addEventListener("input", function () { recherche = norm(els.q.value.trim()); rendreTable(); });
  document.getElementById("download-json-btn").addEventListener("click", telechargerJson);
  document.getElementById("csv-btn").addEventListener("click", exporterCsv);
  document.getElementById("reset-local-btn").addEventListener("click", reinitialiserLocal);
  document.getElementById("copy-json-btn").addEventListener("click", function () {
    els.jsonOut.select();
    navigator.clipboard ? navigator.clipboard.writeText(els.jsonOut.value) : document.execCommand("copy");
    var b = this, t = b.textContent; b.textContent = "Copié ✓";
    setTimeout(function () { b.textContent = t; }, 1500);
  });
  document.getElementById("import-file-btn").addEventListener("click", function () {
    document.getElementById("import-file").click();
  });
  document.getElementById("import-file").addEventListener("change", function (e) {
    if (e.target.files && e.target.files[0]) importerFichier(e.target.files[0]);
  });

  /* ---------- Init ---------- */
  charger()
    .then(rendre)
    .catch(function () {
      els.tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-akt-red">' +
        'Impossible de charger data/adherents.json. Ouvre la page via un serveur ou sur GitHub Pages.</td></tr>';
    });
})();
