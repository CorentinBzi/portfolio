// Raccourcis de la coquille. Jamais dans un champ éditable, jamais pendant un jeu monté
// (protège le terminal de Medline et la clé XOR de l'école), jamais sous le dialogue CV.

const EDITABLES = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

export function installerRaccourcis({ etat, actions }) {
  function surTouche(e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const cible = e.target instanceof Element ? e.target : null;
    if (cible && cible.closest(EDITABLES)) return;
    const s = etat();
    if (s.cvOuvert || s.ecran === 'jeu') return;
    const k = e.key;
    const surControle = cible && cible.closest('a, button, [role="tab"]');

    if (s.ecran === 'amorcage') {
      if ((k === 'Enter' && !surControle) || k === 'Escape') actions.passer();
      else if (k === ' ' && (!cible || cible === document.body || cible.closest('#amorcage .am-panneau')) && !surControle) actions.passer();
      else if (k === 'c' || k === 'C') actions.cv('complet');
      else if (k === 'k' || k === 'K') actions.cv('cles');
      else return;
      e.preventDefault();
      return;
    }

    switch (k) {
      case 'ArrowRight': actions.decaler(1); break;
      case 'ArrowLeft': actions.decaler(-1); break;
      case 'Home': actions.aller(0); break;
      case 'End': actions.aller(Infinity); break;
      case 'j': case 'J': actions.jouer(); break;
      case 'c': case 'C': actions.cv('complet'); break;
      case 'k': case 'K': actions.cv('cles'); break;
      case 'Escape': actions.echap(); break;
      default:
        if (/^[1-9]$/.test(k)) { actions.aller(Number(k) - 1); break; }
        return;
    }
    e.preventDefault();
  }
  document.addEventListener('keydown', surTouche);
  return () => document.removeEventListener('keydown', surTouche);
}
