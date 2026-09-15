// Balises des quartiers : un bouton par quartier, placé par transform à chaque image.
// Hors de l'ordre de tabulation et masquées aux lecteurs d'écran : le rail est le chemin accessible.

export function creerBalises({ racine, niveaux, surClic }) {
  const balises = new Map();
  for (const n of niveaux) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'balise';
    b.tabIndex = -1;
    b.setAttribute('aria-hidden', 'true');
    b.style.setProperty('--acc', n.accent);
    const etiquette = document.createElement('span');
    etiquette.className = 'bl-etiquette';
    const pastille = document.createElement('span');
    pastille.className = 'bl-pastille';
    const nom = document.createElement('span');
    nom.className = 'bl-nom';
    nom.textContent = n.quartier;
    const marque = document.createElement('span');
    marque.className = 'bl-marque';
    etiquette.append(pastille, nom, marque);
    const pointe = document.createElement('span');
    pointe.className = 'bl-pointe';
    b.append(etiquette, pointe);
    b.addEventListener('click', () => surClic(n.id));
    racine.appendChild(b);
    balises.set(n.id, { b, marque, visible: true, x: -1, y: -1 });
  }

  return {
    positionner(ancres) {
      for (const [id, e] of balises) {
        const a = ancres.get(id);
        const visible = !!a && a.x > -60 && a.x < innerWidth + 60 && a.yHaut > 40;
        if (visible !== e.visible) {
          e.b.style.visibility = visible ? '' : 'hidden';
          e.visible = visible;
        }
        if (!visible) continue;
        const x = Math.round(a.x);
        const y = Math.round(a.yHaut - 6);
        if (x !== e.x || y !== e.y) {
          e.b.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
          e.x = x;
          e.y = y;
        }
      }
    },
    maj({ selection, progression, indispo, survol = null }) {
      for (const n of niveaux) {
        const e = balises.get(n.id);
        const gagne = Object.prototype.hasOwnProperty.call(progression.cles, n.id);
        e.b.classList.toggle('selection', n.id === selection);
        e.b.classList.toggle('gagne', gagne);
        e.b.classList.toggle('indispo', indispo.has(n.id));
        e.b.classList.toggle('survol', n.id === survol);
        const cle = n.miseEnSituation ? '✓ clé · mise en situation' : '✓ clé';
        e.marque.textContent = indispo.has(n.id) ? 'en maintenance' : gagne ? cle : n.miseEnSituation ? '◆ mise en situation' : '◆ à jouer';
      }
    },
  };
}
