// Physique et géométrie du monde.
//
// Le coeur du jeu tient dans isSolid(flags, trace) : la même tuile est portante
// ou non selon la couche qu'on regarde. La géométrie vit donc dans la collision,
// pas dans le rendu — c'est ce qui empêche la mécanique de devenir décorative.

export const TUILE = 16;

// Drapeaux de tuile
export const F = {
  VIDE:       0,
  SOLIDE:     1 << 0,  // béton : portant dans les deux couches
  PLATEFORME: 1 << 1,  // traversable par le bas, portante par le dessus
  BRUIT:      1 << 2,  // faux positif : portant en SURFACE, s'évapore en TRACE
  TRACE_SEUL: 1 << 3,  // la cause réelle : portante seulement en TRACE
  DANGER:     1 << 4,  // décrochage au contact
  SORTIE:     1 << 5,
  PASSAGE:    1 << 6,  // point de passage (checkpoint)
  ANCRE:      1 << 7,  // recharge l'impulsion en vol
};

export function isSolid(flags, trace) {
  if (flags & F.BRUIT)      return !trace;
  if (flags & F.TRACE_SEUL) return trace;
  return (flags & F.SOLIDE) !== 0;
}

export function isPlatform(flags, trace) {
  if (flags & F.PLATEFORME) return true;
  if ((flags & F.TRACE_SEUL) && trace) return false;
  return false;
}

// Constantes de déplacement, en pixels par pas de 1/60 s.
// Elles sont accordées pour un saut qui franchit 4 tuiles en largeur
// et 3 en hauteur, l'impulsion ajoutant 3 tuiles de portée.
export const M = {
  accelSol:    0.62,
  accelAir:    0.46,
  vmax:        2.35,
  frictionSol: 0.78,
  frictionAir: 0.92,
  demiTour:    2.0,     // multiplicateur d'accélération en changement de sens
  gravite:     0.30,
  graviteHaut: 0.21,    // gravité réduite en montée : saut plus flottant
  vyMax:       5.4,
  saut:        -4.35,
  sautCoupe:   -1.87,   // vy plancher quand on relâche en montée
  coyote:      6,       // pas de grâce après avoir quitté le sol
  tampon:      7,       // pas de mémorisation d'un appui saut anticipé
  impulsionVy: -1.6,    // vitesse verticale imposée par l'impulsion
  portee:      44,      // portée de l'impulsion, en pixels
};

// Carte : tableau d'entiers, largeur w, hauteur h.
export class Carte {
  constructor(lignes, legende) {
    this.h = lignes.length;
    this.w = Math.max(...lignes.map(l => l.length));
    this.data = new Uint16Array(this.w * this.h);
    this.chars = [];
    for (let y = 0; y < this.h; y++) {
      const ligne = lignes[y];
      for (let x = 0; x < this.w; x++) {
        const c = ligne[x] || ' ';
        this.chars.push(c);
        this.data[y * this.w + x] = legende[c] === undefined ? F.VIDE : legende[c];
      }
    }
  }
  at(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return F.VIDE;
    return this.data[ty * this.w + tx];
  }
  charAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return ' ';
    return this.chars[ty * this.w + tx];
  }
  set(tx, ty, flags) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return;
    this.data[ty * this.w + tx] = flags;
  }
  get pxW() { return this.w * TUILE; }
  get pxH() { return this.h * TUILE; }
}

// Balayage AABB contre la grille, axe par axe.
// box : {x, y, w, h} en pixels, coin haut-gauche.
export function deplacer(carte, box, vx, vy, trace, sols) {
  const res = { sol: false, plafond: false, mur: 0, danger: false };

  box.x += vx;
  // Pour l'axe X on teste une boîte rétrécie d'un pixel en haut et en bas :
  // sinon la sonde posée sur une tuile s'accroche au flanc de sa voisine et
  // ne peut plus avancer. C'est le défaut classique des collisions par grille.
  const boxX = { x: box.x, y: box.y + 1, w: box.w, h: box.h - 2 };
  let t = tuilesTouchees(carte, boxX);
  for (const [tx, ty] of t) {
    const f = carte.at(tx, ty);
    if (f & F.DANGER) res.danger = true;
    if (!isSolid(f, trace)) continue;
    if (vx > 0) { box.x = tx * TUILE - box.w; res.mur = 1; }
    else if (vx < 0) { box.x = (tx + 1) * TUILE; res.mur = -1; }
    boxX.x = box.x;
  }

  box.y += vy;
  // Pour l'axe Y, boîte rétrécie latéralement : on ne s'accroche pas au coin
  // d'une tuile qu'on frôle.
  const boxY = { x: box.x + 1, y: box.y, w: box.w - 2, h: box.h };
  t = tuilesTouchees(carte, boxY);
  for (const [tx, ty] of t) {
    const f = carte.at(tx, ty);
    if (f & F.DANGER) res.danger = true;
    const dur = isSolid(f, trace);
    const plat = (f & F.PLATEFORME) !== 0;
    if (!dur && !plat) continue;
    if (vy > 0) {
      // une plateforme ne porte que si on arrive par le dessus
      if (plat && !dur && (box.y + box.h) - vy > ty * TUILE + 2) continue;
      box.y = ty * TUILE - box.h; res.sol = true; boxY.y = box.y;
    } else if (vy < 0 && dur) {
      box.y = (ty + 1) * TUILE; res.plafond = true; boxY.y = box.y;
    }
  }

  // sols mobiles fabriqués par les verbes (courbes, phrases, ponts)
  if (sols && sols.length) {
    for (const s of sols) {
      if (!s.actif) continue;
      const dessus = box.y + box.h;
      if (box.x + box.w > s.x && box.x < s.x + s.w &&
          dessus > s.y && dessus < s.y + s.h + Math.max(4, vy) && vy >= 0) {
        box.y = s.y - box.h;
        res.sol = true;
        res.support = s;
      }
    }
  }
  return res;
}

function tuilesTouchees(carte, box) {
  const x0 = Math.floor(box.x / TUILE), x1 = Math.floor((box.x + box.w - 0.01) / TUILE);
  const y0 = Math.floor(box.y / TUILE), y1 = Math.floor((box.y + box.h - 0.01) / TUILE);
  const out = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y]);
  return out;
}

// Drapeaux présents sous la boîte (pour sortie, passage, ancre).
export function drapeauxSous(carte, box) {
  let f = 0;
  for (const [tx, ty] of tuilesTouchees(carte, box)) f |= carte.at(tx, ty);
  return f;
}
