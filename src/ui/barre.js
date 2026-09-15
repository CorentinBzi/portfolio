// La barre haute : statique dans index.html, améliorée ici (trousseau, animations, mode jeu).

const CONFIRMATION_MS = 3000;

export function creerBarre({ racine, niveaux, PROFIL, surCvComplet, surCles, surAnimations, surQuitter }) {
  const visee = racine.querySelector('#b-visee');
  if (visee) visee.textContent = PROFIL.visee;
  const ecrire = racine.querySelector('#b-ecrire');
  if (ecrire) ecrire.href = `mailto:${PROFIL.email}`;

  const cv = racine.querySelector('#cv-complet');
  cv.addEventListener('click', (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button === 1) return;
    e.preventDefault();
    surCvComplet(cv);
  });

  const centre = racine.querySelector('#b-trousseau');
  const trousseau = document.createElement('button');
  trousseau.type = 'button';
  trousseau.className = 'trousseau';
  const hexes = document.createElement('span');
  hexes.className = 't-hexes';
  hexes.setAttribute('aria-hidden', 'true');
  const cases = new Map();
  for (const n of niveaux) {
    const h = document.createElement('span');
    h.className = 'hex';
    h.style.setProperty('--acc', n.accent);
    hexes.appendChild(h);
    cases.set(n.id, h);
  }
  const compte = document.createElement('span');
  compte.className = 't-compte';
  trousseau.append(hexes, compte);
  trousseau.addEventListener('click', () => surCles(trousseau));
  centre.replaceChildren(trousseau);

  const anim = racine.querySelector('#b-anim');
  if (anim) {
    anim.hidden = false;
    anim.addEventListener('click', () => surAnimations());
  }

  const blocJeu = racine.querySelector('.b-jeu');
  const retour = racine.querySelector('#b-retour');
  const retourTexte = retour.querySelector('.b-retour-txt');
  const verbe = racine.querySelector('.b-jeu-verbe');
  const titre = racine.querySelector('.b-jeu-titre');
  const mention = racine.querySelector('.b-jeu-mention');
  let minuterie = 0;

  function reinitialiserRetour() {
    clearTimeout(minuterie);
    minuterie = 0;
    retour.classList.remove('confirmer');
    retourTexte.textContent = 'Carte';
    retour.setAttribute('aria-label', 'Revenir à la carte');
  }

  retour.addEventListener('click', () => {
    if (minuterie) {
      reinitialiserRetour();
      surQuitter();
      return;
    }
    retour.classList.add('confirmer');
    retourTexte.textContent = 'Confirmer ← Carte';
    retour.setAttribute('aria-label', 'Confirmer : quitter la partie et revenir à la carte');
    minuterie = setTimeout(reinitialiserRetour, CONFIRMATION_MS);
  });

  return {
    majProgression(p) {
      let n = 0;
      for (const [id, h] of cases) {
        const pleine = Object.prototype.hasOwnProperty.call(p.cles, id);
        h.classList.toggle('pleine', pleine);
        if (pleine) n++;
      }
      compte.innerHTML = '';
      const long = document.createElement('span');
      long.className = 't-long';
      long.textContent = 'Clés ';
      compte.append(long, `${n}/${niveaux.length}`);
      trousseau.setAttribute('aria-label', `Mes clés : ${n} sur ${niveaux.length}. Ouvrir la vue des clés du CV.`);
    },
    modeJeu(niveau) {
      reinitialiserRetour();
      racine.classList.toggle('en-jeu', !!niveau);
      blocJeu.hidden = !niveau;
      if (!niveau) return;
      racine.style.setProperty('--acc-jeu', niveau.accent);
      verbe.textContent = niveau.verbe;
      titre.textContent = niveau.titre;
      mention.hidden = !niveau.miseEnSituation;
    },
    majAnimations(reduit, systeme) {
      if (!anim) return;
      anim.setAttribute('aria-pressed', String(!reduit));
      anim.textContent = reduit ? 'Animations : réduites' : 'Animations';
      anim.title = systeme ? 'Votre système demande de réduire les animations.' : 'Réduire ou rétablir les animations de la carte';
    },
    caseCle: (id) => cases.get(id) || null,
    compteur: () => trousseau,
    eclair(id) {
      const h = cases.get(id);
      if (!h) return;
      h.classList.remove('eclair');
      void h.offsetWidth;
      h.classList.add('eclair');
    },
  };
}
