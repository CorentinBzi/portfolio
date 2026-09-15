// Le rail des niveaux : barre d'outils à tabulation itinérante (un seul arrêt de Tab).
// C'est le chemin clavier et lecteur d'écran de la carte.

import { COUCHES, premiereAnnee, titreSection } from '../niveaux.js';

const VERBES = { APPRENDRE: 'Apprendre', TRADUIRE: 'Traduire', INSTRUMENTER: 'Instrumenter', SEGMENTER: 'Segmenter', AUTOMATISER: 'Automatiser', COORDONNER: 'Coordonner', DIAGNOSTIQUER: 'Diagnostiquer' };

function lisible(texte) {
  return String(texte).replace(/ · /g, ' ').replace(/&/g, 'et');
}

export function creerRail({ racine, niveaux, FAITS, surSelection, surActivation }) {
  const puces = racine.querySelector('.r-puces');
  const pile = racine.querySelector('.r-pile');
  const boutons = new Map();
  let selection = niveaux[0].id;
  let reduit = false;

  niveaux.forEach((n, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'puce';
    b.dataset.id = n.id;
    b.tabIndex = -1;
    b.style.setProperty('--acc', n.accent);
    const haut = document.createElement('span');
    haut.className = 'p-haut';
    const num = document.createElement('span');
    num.textContent = `Niveau ${k + 1}`;
    const annee = document.createElement('span');
    annee.className = 'p-annee';
    annee.textContent = n.miseEnSituation ? 'fictif' : premiereAnnee(FAITS[n.id].periode) || '';
    haut.append(num, annee);
    const nom = document.createElement('span');
    nom.className = 'p-nom';
    nom.textContent = n.quartier;
    const etat = document.createElement('span');
    etat.className = 'p-etat';
    etat.setAttribute('aria-hidden', 'true');
    b.append(haut, nom, etat);
    b.addEventListener('click', () => {
      if (selection === n.id) surActivation(n.id);
      else surSelection(n.id);
    });
    puces.appendChild(b);
    boutons.set(n.id, b);
  });

  puces.addEventListener('keydown', (e) => {
    const ids = niveaux.map((n) => n.id);
    const courant = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.id : selection;
    let i = ids.indexOf(courant);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = Math.min(ids.length - 1, i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = Math.max(0, i - 1);
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = ids.length - 1;
    else return;
    e.preventDefault();
    e.stopPropagation();
    surSelection(ids[i]);
    const b = boutons.get(ids[i]);
    if (b) b.focus();
  });

  if (pile) {
    pile.replaceChildren(...[...COUCHES].reverse().map((c) => {
      const s = document.createElement('span');
      s.className = 'r-couche';
      s.dataset.couche = c.id;
      s.style.setProperty('--teinte', c.teinte);
      s.title = c.nom;
      return s;
    }));
    const legende = document.createElement('span');
    legende.className = 'r-legende';
    pile.appendChild(legende);
  }

  return {
    maj({ selection: sel, progression, indispo, jeuMonte = false, reduit: r = false }) {
      selection = sel;
      reduit = r;
      niveaux.forEach((n, k) => {
        const b = boutons.get(n.id);
        const gagne = Object.prototype.hasOwnProperty.call(progression.cles, n.id);
        const enPanne = indispo.has(n.id);
        b.classList.toggle('selection', n.id === sel);
        b.classList.toggle('gagne', gagne);
        b.classList.toggle('indispo', enPanne);
        b.setAttribute('aria-pressed', String(n.id === sel));
        b.tabIndex = n.id === sel ? 0 : -1;
        b.disabled = jeuMonte;
        b.querySelector('.p-etat').textContent = enPanne ? 'en maintenance' : gagne ? '✓ clé' : n.miseEnSituation ? '◆ fictif' : '◆ à jouer';
        const F = FAITS[n.id];
        const sections = n.sections.map((s) => lisible(titreSection(s, FAITS))).join(', ');
        b.setAttribute('aria-label', `Niveau ${k + 1} sur ${niveaux.length} : ${n.quartier} — ${F.employeur}, ${F.periode}, ${VERBES[n.verbe] || n.verbe}. ` +
          `${enPanne ? 'En maintenance. ' : ''}${gagne ? 'Clé obtenue.' : 'Non joué.'} Débloque : ${sections}.` +
          `${n.miseEnSituation ? ' Mise en situation, pas une expérience.' : ''}`);
      });
      if (pile) {
        const n = niveaux.find((x) => x.id === sel);
        pile.querySelectorAll('.r-couche').forEach((el) => el.classList.toggle('active', n && el.dataset.couche === n.couche));
        const c = COUCHES.find((x) => n && x.id === n.couche);
        pile.querySelector('.r-legende').textContent = c ? `couche ${c.nom.toLowerCase()}` : '';
      }
      const b = boutons.get(sel);
      if (b && puces.scrollWidth > puces.clientWidth + 4) {
        const cible = b.offsetLeft - (puces.clientWidth - b.offsetWidth) / 2;
        puces.scrollTo({ left: cible, behavior: reduit ? 'auto' : 'smooth' });
      }
    },
    focusSelection() {
      const b = boutons.get(selection);
      if (!b || b.disabled) return;
      b.focus({ preventScroll: true });
      // Le rail peut redevenir visible une image plus tard (sortie de jeu) : un seul nouvel essai.
      if (document.activeElement !== b) setTimeout(() => { if (!b.disabled && document.activeElement === document.body) b.focus({ preventScroll: true }); }, 60);
    },
    element: (id) => boutons.get(id) || null,
  };
}
