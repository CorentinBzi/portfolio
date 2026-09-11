// Entrées : clavier, manette, tactile, fusionnées en un seul masque de bits.
// Le double liage passe par event.code, jamais event.key : un AZERTY et un
// QWERTY doivent jouer pareil sans réglage.

export const B = {
  GAUCHE: 1 << 0,
  DROITE: 1 << 1,
  SAUT:   1 << 2,
  TRACE:  1 << 3,
  BAS:    1 << 4,
  PAUSE:  1 << 5,
};

const TOUCHES = {
  ArrowLeft: B.GAUCHE, KeyA: B.GAUCHE, KeyQ: B.GAUCHE,
  ArrowRight: B.DROITE, KeyD: B.DROITE,
  ArrowDown: B.BAS, KeyS: B.BAS,
  Space: B.SAUT, KeyK: B.SAUT, ArrowUp: B.SAUT, KeyW: B.SAUT, KeyZ: B.SAUT,
  ShiftLeft: B.TRACE, ShiftRight: B.TRACE, KeyL: B.TRACE,
  Escape: B.PAUSE, KeyP: B.PAUSE,
};

export function createInput(canvas, padEl) {
  let clavier = 0, tactile = 0, traceVerrou = false;
  let precedent = 0, courant = 0;
  // Un appui plus court qu'un pas de simulation doit quand même compter :
  // on retient les fronts montants survenus depuis le dernier relevé.
  let fronts = 0, nouveaux = 0;

  addEventListener('keydown', e => {
    const b = TOUCHES[e.code];
    if (b === undefined) return;
    if (e.repeat) return;
    // ne pas voler les touches quand le focus est dans le dossier
    if (document.body.dataset.modal === '1' && b !== B.PAUSE) return;
    clavier |= b;
    fronts |= b;
    if (b === B.SAUT || b === B.TRACE || b === B.BAS) e.preventDefault();
  });
  addEventListener('keyup', e => {
    const b = TOUCHES[e.code];
    if (b !== undefined) clavier &= ~b;
  });
  addEventListener('blur', () => { clavier = 0; tactile = 0; });

  // ---- tactile : stick flottant à gauche, deux boutons à droite ----
  const pointeurs = new Map();
  let stickId = null, stickX = 0;

  function zone(x, y, rect) {
    const rx = x - rect.left, ry = y - rect.top;
    if (rx < rect.width * 0.5) return 'stick';
    return ry > rect.height * 0.45 ? 'saut' : 'trace';
  }

  if (padEl) {
    const opts = { passive: false };
    padEl.addEventListener('pointerdown', e => {
      e.preventDefault();
      const r = padEl.getBoundingClientRect();
      const z = zone(e.clientX, e.clientY, r);
      pointeurs.set(e.pointerId, z);
      if (z === 'stick') { stickId = e.pointerId; stickX = e.clientX; }
      else if (z === 'saut') { tactile |= B.SAUT; fronts |= B.SAUT; }
      else { traceVerrou = !traceVerrou; }
      padEl.setPointerCapture(e.pointerId);
    }, opts);
    padEl.addEventListener('pointermove', e => {
      if (e.pointerId !== stickId) return;
      const dx = e.clientX - stickX;
      tactile &= ~(B.GAUCHE | B.DROITE);
      if (dx < -8) tactile |= B.GAUCHE;
      else if (dx > 8) tactile |= B.DROITE;
    }, opts);
    const relache = e => {
      const z = pointeurs.get(e.pointerId);
      pointeurs.delete(e.pointerId);
      if (z === 'stick') { stickId = null; tactile &= ~(B.GAUCHE | B.DROITE); }
      else if (z === 'saut') tactile &= ~B.SAUT;
    };
    padEl.addEventListener('pointerup', relache, opts);
    padEl.addEventListener('pointercancel', relache, opts);
  }

  function manette() {
    if (!navigator.getGamepads) return 0;
    const g = navigator.getGamepads()[0];
    if (!g) return 0;
    let m = 0;
    const ax = g.axes[0] || 0;
    if (ax < -0.35) m |= B.GAUCHE;
    if (ax > 0.35) m |= B.DROITE;
    if (g.buttons[14] && g.buttons[14].pressed) m |= B.GAUCHE;
    if (g.buttons[15] && g.buttons[15].pressed) m |= B.DROITE;
    if (g.buttons[0] && g.buttons[0].pressed) m |= B.SAUT;
    if (g.buttons[4] && g.buttons[4].pressed) m |= B.TRACE;
    if (g.buttons[9] && g.buttons[9].pressed) m |= B.PAUSE;
    return m;
  }

  return {
    poll() {
      precedent = courant;
      courant = clavier | tactile | manette() | (traceVerrou ? B.TRACE : 0);
      // un front capté entre deux relevés est rejoué ici, puis oublié
      nouveaux = fronts & ~precedent;
      fronts = 0;
      return courant;
    },
    tenu(b)   { return (courant & b) !== 0; },
    appuye(b) { return ((courant & b) !== 0 && (precedent & b) === 0) || (nouveaux & b) !== 0; },
    relache(b){ return (courant & b) === 0 && (precedent & b) !== 0; },
    reset()   { clavier = 0; tactile = 0; traceVerrou = false; courant = precedent = 0; fronts = 0; nouveaux = 0; },
  };
}
