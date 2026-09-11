# AN KA TAA — Cartes d'adhérent dématérialisées

Site statique (GitHub Pages) pour l'association **AN KA TAA** — *Nos racines, notre avenir*.
Culture · Éducation · Solidarité · Partenariats.

## Fonctions
- **`index.html`** — Espace membre. L'adhérent entre son **matricule** ou son **email** :
  - statut **payé** → carte de membre dématérialisée (design badge VIP), QR code du matricule, bouton **Télécharger ma carte** (PNG).
  - statut **non payé** → message + instructions de paiement.
  - lien direct / QR : `index.html?m=AKT-2025-001` affiche la carte automatiquement.
- **`admin.html`** — Tableau de bord : liste des adhérents, stats, recherche, **filtre payé / non payé**, bascule du statut, export **JSON** / **CSV** et copie du JSON à jour.

## Structure
```
.
├── index.html          # espace adhérent (carte)
├── admin.html          # tableau de bord admin
├── data/adherents.json # source de vérité des adhérents
├── assets/logo.png     # logo AKT
├── js/app.js           # logique carte + QR + export PNG
├── js/admin.js         # logique tableau de bord
├── .nojekyll           # sert le dossier tel quel
└── README.md
```

## Données (`data/adherents.json`)
Chaque adhérent : `id, matricule, nom, prenom, date_naissance, telephone, email,
adresse, ville, type_adhesion, formule, date_adhesion, annee_cotisation,
date_expiration, statut_paiement ("payé"|"non_payé"), modalite_paiement`.

## Mettre à jour les paiements
1. Ouvrir **`admin.html`**, basculer les statuts (enregistré dans le navigateur).
2. **⬇ Télécharger adherents.json** (ou *Copier le JSON*).
3. Remplacer `data/adherents.json` dans le dépôt et *commit* → le site se met à jour.
   *Bouton « Réinitialiser » = efface les modifs locales et recharge le fichier du dépôt.*

## Déploiement GitHub Pages
Dépôt **`ankataa445.github.io`** (site utilisateur) :
```bash
git init
git add .
git commit -m "Cartes adhérent AN KA TAA"
git branch -M main
git remote add origin https://github.com/ankataa445/ankataa445.github.io.git
git push -u origin main
```
GitHub → **Settings → Pages → Branch: `main` / root**. Site en ligne :
`https://ankataa445.github.io/`.

## Technos
HTML + Tailwind (CDN) + JavaScript vanilla · [QRCode.js](https://github.com/davidshimjs/qrcodejs) · [html2canvas](https://html2canvas.hertzen.com/). Aucune compilation.
