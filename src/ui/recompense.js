// Carte de récompense après une victoire : non modale, en bas au centre (feuille basse sur mobile).
// L'aperçu de la section se déchiffre (glyphes -> texte, 900 ms) ; tout clic ou toute touche termine l'animation.

import { FAITS } from '../cv.js';
import { titreSection } from '../niveaux.js';
import { annoncer } from './annonces.js';

const DUREE = 900;
const DECALAGE = 8;
const GLYPHES = '0123456789ABCDEF#$%&*+<>{}';

function el(tag, classe, texte) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined && texte !== null) e.textContent = texte;
  return e;
}

function extrait(texte, max = 170) {
  const t = String(texte || '');
  if (t.length <= max) return t;
  const coupe = t.lastIndexOf(' ', max);
  return t.slice(0, coupe > 80 ? coupe : max) + '…';
}

export function afficherRecompense({ racine, niveau: n, resultat, dejaObtenue = false, reduit = false, toutGagne = false, surLire, surImprimable }) {
  return new Promise((resoudre) => {
    const F = FAITS[n.id];
    const sections = n.sections.map((s) => titreSection(s, FAITS));
    racine.style.setProperty('--acc', n.accent);
    const sur = el('p', 'rc-sur', dejaObtenue ? 'Partie mise à jour' : n.verbe);
    const titre = el('h2', 'rc-titre', `Clé obtenue : ${n.quartier}`);
    // « + » entre les sections : leurs titres contiennent déjà « · » (Compétences · Sécurité).
    const liste = el('p', 'rc-sections', `Sections déchiffrées : ${sections.join(' + ')}`);
    const apercu = el('div', 'rc-apercu');
    const poste = el('p', 'rc-poste', F.poste);
    const texte = el('p', 'rc-texte');
    const cible = extrait(F.texte);
    texte.setAttribute('aria-label', cible);
    apercu.append(poste, texte);
    if (n.miseEnSituation) apercu.prepend(el('p', 'rc-badge mise', 'Mise en situation — pas une expérience'));
    if (reduit) apercu.prepend(el('p', 'rc-badge', 'Déchiffrée'));
    const enfants = [sur, titre, liste, apercu];
    if (resultat && resultat.message) enfants.push(el('p', 'rc-partie', `Votre partie : ${resultat.message}`));
    if (toutGagne) enfants.push(el('p', 'rc-total', 'Système entièrement déchiffré : les sept niveaux sont gagnés, tout le CV est en clair.'));
    const actions = el('div', 'rc-actions');
    const lire = el('button', 'btn', 'Lire la section');
    lire.type = 'button';
    const continuer = el('button', 'btn or', 'Continuer');
    continuer.type = 'button';
    actions.append(lire);
    if (toutGagne) {
      const imp = el('a', 'btn', 'Version imprimable');
      imp.href = 'cv.html';
      imp.target = '_blank';
      imp.rel = 'noopener';
      if (surImprimable) imp.addEventListener('click', surImprimable);
      actions.append(imp);
    }
    actions.append(continuer);
    enfants.push(actions);
    racine.replaceChildren(...enfants);
    racine.hidden = false;

    let minuterie = 0;
    const t0 = performance.now();
    function finirAnimation() {
      clearInterval(minuterie);
      minuterie = 0;
      texte.textContent = cible;
    }
    if (reduit || dejaObtenue) texte.textContent = cible;
    else {
      minuterie = setInterval(() => {
        const ecoule = performance.now() - t0;
        let s = '';
        for (let i = 0; i < cible.length; i++) {
          const debut = i * DECALAGE;
          if (ecoule >= Math.min(DUREE, debut + 120) || cible[i] === ' ') s += cible[i];
          else s += GLYPHES[(i * 7 + Math.floor(ecoule / 40)) % GLYPHES.length];
        }
        texte.textContent = s;
        if (ecoule >= DUREE) finirAnimation();
      }, 30);
    }

    function fermer() {
      finirAnimation();
      racine.hidden = true;
      racine.replaceChildren();
      racine.removeEventListener('pointerdown', finirAnimation);
      racine.removeEventListener('keydown', finirAnimation);
      racine.removeEventListener('fermer', fermer);
      resoudre();
    }
    racine.addEventListener('pointerdown', finirAnimation);
    racine.addEventListener('keydown', finirAnimation);
    racine.addEventListener('fermer', fermer);
    lire.addEventListener('click', () => { fermer(); surLire(n.id); });
    continuer.addEventListener('click', fermer);
    continuer.focus({ preventScroll: true });
    annoncer(`Section déchiffrée : ${sections.join(', ').replace(/ · /g, ' ').replace(/&/g, 'et')}.`);
  });
}
