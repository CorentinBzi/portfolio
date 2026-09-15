// La fiche du niveau : verbe, années, titre, employeur, description, section du CV, Jouer / Lire la section.

import { NIVEAUX, niveau, titreSection } from '../niveaux.js';

const LARGEUR = 360;
const MARGE = 16;

function el(tag, classe, texte) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

function premierePhrase(texte) {
  const m = String(texte || '').match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : String(texte || '')).trim();
}

export function creerFiche({ racine, FAITS, surJouer, surLire, surFermer }) {
  let courant = null;
  let hauteur = 0;

  function ouvrir(id, { progression, indispo = false, description = null, focus = true, mobile = false } = {}) {
    const n = niveau(id);
    if (!n) return;
    const F = FAITS[id];
    const k = NIVEAUX.indexOf(n);
    courant = id;
    racine.style.setProperty('--acc', n.accent);
    racine.setAttribute('role', mobile ? 'dialog' : 'region');
    racine.setAttribute('aria-labelledby', 'fiche-titre');
    const fermer = el('button', 'btn f-fermer', '✕');
    fermer.type = 'button';
    fermer.setAttribute('aria-label', 'Fermer la fiche');
    fermer.addEventListener('click', () => surFermer());

    const sur = el('p', 'f-sur');
    sur.append(el('span', 'f-puce'), el('span', '', `${n.verbe} · ${F.periode}`));
    const titre = el('h2', 'f-titre', n.titre);
    titre.id = 'fiche-titre';
    titre.tabIndex = -1;
    const employeur = el('p', 'f-employeur', `${F.employeur} · ${n.quartier} · niveau ${k + 1}/${NIVEAUX.length}`);

    const etiquettes = el('p', 'f-etiquettes');
    if (n.miseEnSituation) etiquettes.append(el('span', 'f-tag mise', 'MISE EN SITUATION · pas une expérience'));
    if (id === 'digitalrealty') etiquettes.append(el('span', 'f-tag', 'jeu chronométré'));
    if (indispo) etiquettes.append(el('span', 'f-tag panne', 'en maintenance'));

    const desc = el('p', 'f-desc', description || premierePhrase(F.pourLePoste));
    const gagne = progression && Object.prototype.hasOwnProperty.call(progression.cles, id);
    const section = el('p', 'f-section');
    section.append(
      el('span', 'f-section-titre', `Section du CV : ${n.sections.map((s) => titreSection(s, FAITS)).join(' + ')}`),
      el('span', gagne ? 'f-section-etat ok' : 'f-section-etat', gagne ? '✓ déchiffrée' : 'à déchiffrer · lisible en clair à tout moment'),
    );

    const actions = el('div', 'f-actions');
    if (!indispo) {
      const jouer = el('button', 'btn or', gagne ? 'Rejouer' : 'Jouer');
      jouer.type = 'button';
      jouer.addEventListener('click', () => surJouer(id));
      actions.append(jouer);
    }
    const lire = el('button', 'btn', 'Lire la section');
    lire.type = 'button';
    lire.addEventListener('click', () => surLire(id));
    actions.append(lire);

    racine.replaceChildren(fermer, sur, titre, employeur, etiquettes, desc, section, actions);
    if (!etiquettes.childElementCount) etiquettes.remove();
    racine.hidden = false;
    hauteur = racine.offsetHeight;
    if (focus) titre.focus({ preventScroll: true });
  }

  return {
    ouvrir,
    fermer() {
      courant = null;
      racine.hidden = true;
      racine.style.transform = '';
    },
    estOuverte: () => courant !== null,
    courant: () => courant,
    hauteur: () => (courant ? racine.offsetHeight || hauteur : 0),
    contient: (noeud) => racine.contains(noeud),
    // Bureau : carte de verre au-dessus du quartier, maintenue dans l'écran.
    positionner(ancre, { hautBarre = 56, basRail = 96 } = {}) {
      if (!courant || !ancre) return;
      const W = innerWidth, H = innerHeight;
      const h = hauteur || racine.offsetHeight;
      let x = Math.min(Math.max(ancre.x - LARGEUR / 2, MARGE), W - LARGEUR - MARGE);
      let y = ancre.yHaut - 112 - h;
      if (y < hautBarre + 12) {
        y = Math.min(Math.max(ancre.yHaut, hautBarre + 12), H - basRail - h);
        x = ancre.x + ancre.demi + 24 + LARGEUR < W - MARGE ? ancre.x + ancre.demi + 24 : ancre.x - ancre.demi - 24 - LARGEUR;
        x = Math.min(Math.max(x, MARGE), W - LARGEUR - MARGE);
      }
      y = Math.min(Math.max(y, hautBarre + 12), H - basRail - h);
      racine.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    },
  };
}
