// Annonces pour lecteurs d'écran : une seule zone aria-live="polite".

let dernier = 0;

export function annoncer(texte) {
  const zone = document.getElementById('annonces');
  if (!zone || !texte) return;
  const id = ++dernier;
  zone.textContent = '';
  // Vider puis écrire au tick suivant : une annonce identique est relue.
  setTimeout(() => { if (id === dernier) zone.textContent = String(texte); }, 30);
}
