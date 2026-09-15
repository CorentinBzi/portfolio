// Hasard déterministe : la cité est la même à chaque visite, et sur chaque capture.

export function mulberry32(graine) {
  let a = graine >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function creerAlea(graine) {
  const r = mulberry32(graine);
  return {
    n: r,
    entre: (a, b) => a + (b - a) * r(),
    entier: (a, b) => Math.floor(a + (b - a + 1) * r()),
    choix: (tab) => tab[Math.floor(r() * tab.length)],
    chance: (p) => r() < p,
  };
}

// Bruit sans état pour les animations : même (i, j) -> même valeur dans [0, 1[.
export function bruit(i, j = 0) {
  let h = Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((j | 0) + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
