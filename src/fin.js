// Écran de fin. Les cinq modules acquis se détachent et se réagencent
// en carte de contact — et il manque toujours le sixième, qui est la personne.

import { P, alpha } from './palette.js';
import { B } from './input.js';
import { VUE_W, VUE_H, texte } from './render.js';
import { PROFIL } from './cv.js';

const LIGNES = [
  "VOUS AVEZ TRAVERSE CINQ POSTES ET UN SCENARIO.",
  "",
  "LA MACHINE PEUT ECRIRE LE CORRECTIF.",
  "ELLE NE PEUT PAS DECIDER, A QUATRE HEURES DU MATIN,",
  "QUI ON REVEILLE DANS LE SERVICE, NI AVEC QUELS MOTS.",
  "",
  "C'EST LE POSTE QUE JE CHERCHE.",
];

export function creerFin(app) {
  let t = 0;
  function pas(input) {
    t++;
    if (t > 60 && (input.appuye(B.SAUT) || input.appuye(B.PAUSE))) app.versHub();
  }
  function dessine(r) {
    const c = r.ctx;
    c.fillStyle = P.fond;
    c.fillRect(0, 0, VUE_W, VUE_H);

    // les cinq modules, en ligne, comme une signature
    const m = app.etat.modules;
    for (let i = 0; i < m.length; i++) {
      const x = VUE_W / 2 - (m.length - 1) * 14 / 2 + i * 14;
      const y = 34 + Math.sin(t / 40 + i) * 1.5;
      c.fillStyle = alpha(P.sonde, 0.85);
      c.fillRect(x - 2, y - 2, 4, 4);
      texte(c, m[i].slice(0, 3), x, y + 12, alpha(P.texte2, 0.7), 'center');
    }

    let y = 66;
    for (const l of LIGNES) {
      if (l) texte(c, l, VUE_W / 2, y, l.startsWith("C'EST") ? P.sonde : P.texte, 'center');
      y += l ? 11 : 6;
    }

    c.fillStyle = alpha(P.ligne, 0.9);
    c.fillRect(40, VUE_H - 42, VUE_W - 80, 1);
    texte(c, PROFIL.nom, VUE_W / 2, VUE_H - 30, P.texte, 'center');
    texte(c, PROFIL.email, VUE_W / 2, VUE_H - 19, P.sonde, 'center');
    if ((t >> 5) % 2 === 0) texte(c, 'ESPACE : RETOUR', VUE_W / 2, VUE_H - 7, P.texte2, 'center');
  }
  return { pas, dessine, fin: true };
}
