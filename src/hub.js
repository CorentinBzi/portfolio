// LE HUB — une cage verticale : 2018 en bas, aujourd'hui en haut.
// Le CV devient une échelle qu'on escalade. Tous les niveaux sont ouverts
// dès la première seconde : on ne fait pas attendre un recruteur.

import { P, alpha, ACCENTS, mix } from './palette.js';
import { B } from './input.js';
import { VUE_W, VUE_H, texte, largeurTexte } from './render.js';
import { FAITS } from './cv.js';

export function creerHub(app, liste, depart) {
  let sel = depart === undefined ? 0 : depart;
  let t = 0, glisse = 0;
  const n = liste.length;

  function pas(input) {
    t++;
    if (input.appuye(B.GAUCHE)) sel = (sel - 1 + n) % n;
    if (input.appuye(B.DROITE)) sel = (sel + 1) % n;
    if (input.appuye(B.SAUT)) app.jouer(liste[sel].id);
    glisse += (sel - glisse) * 0.18;
  }

  function dessine(r) {
    const c = r.ctx;
    c.fillStyle = P.fond;
    c.fillRect(0, 0, VUE_W, VUE_H);

    // montants de la cage
    for (let i = 0; i < 5; i++) {
      c.fillStyle = alpha(P.structure, 0.55 - i * 0.08);
      c.fillRect(14 + i * 72, 0, 2, VUE_H);
    }

    texte(c, 'CORENTIN BEZILLE', 10, 16, P.texte, 'left');
    texte(c, 'FORWARD DEPLOYED ENGINEER', 10, 26, P.sonde, 'left');
    texte(c, 'ESPACE POUR ENTRER DANS UN PALIER', 10, 38, P.texte2, 'left');

    // l'échelle : un barreau par niveau, du plus ancien en bas au plus récent en haut.
    // Le texte vit AU-DESSUS du barreau, jamais dessus.
    const bas = VUE_H - 34, haut = 50;
    const pas_ = (bas - haut) / Math.max(1, n - 1);
    for (let i = 0; i < n; i++) {
      const lv = liste[i];
      const y = Math.round(bas - i * pas_);
      const actif = i === sel;
      const fait = app.etat.faits.includes(lv.id);
      const acc = lv.accent || ACCENTS[lv.id] || P.texte2;

      c.fillStyle = alpha(acc, actif ? 0.9 : 0.22);
      c.fillRect(28, y, VUE_W - 40, actif ? 2 : 1);

      c.fillStyle = actif ? acc : alpha(acc, 0.5);
      c.fillRect(20, y - 3, 5, 6);

      // colonnes fixes : années à gauche, employeur au milieu, verbe à droite
      texte(c, lv.annees, 28, y - 3, actif ? P.texte2 : alpha(P.texte2, 0.45), 'left');
      texte(c, lv.employeur, 118, y - 3, actif ? P.texte : alpha(P.texte, 0.45), 'left');
      if (lv.verbe) texte(c, lv.verbe, VUE_W - 14, y - 3, actif ? acc : alpha(acc, 0.35), 'right');
      if (fait) { c.fillStyle = P.valide; c.fillRect(VUE_W - 10, y - 3, 3, 3); }
    }

    // le titre du palier sélectionné, en bas
    const lv = liste[sel];
    c.fillStyle = alpha(P.panneau, 0.95);
    c.fillRect(0, VUE_H - 24, VUE_W, 24);
    c.fillStyle = alpha(lv.accent || P.sonde, 0.55);
    c.fillRect(0, VUE_H - 24, VUE_W, 1);
    texte(c, lv.titre, 6, VUE_H - 14, P.texte, 'left');
    texte(c, lv.scenario ? 'SCENARIO - MISE EN SITUATION'
                         : (FAITS[lv.factKey] ? FAITS[lv.factKey].poste : ''),
          6, VUE_H - 5, lv.scenario ? P.anomalie : P.texte2, 'left');
  }

  return { pas, dessine, hub: true };
}
