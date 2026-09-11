// Entrées de la ville : clavier, manette, joystick tactile, fusionnés en axes.
// event.code, jamais event.key : un AZERTY et un QWERTY jouent pareil.

export function creerEntrees(padEl) {
  const touches = new Set();
  let action = false, actionVue = false;
  let joy = { x: 0, y: 0 };

  addEventListener('keydown', e => {
    if (document.body.dataset.modal === '1') return;
    touches.add(e.code);
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
      if (!e.repeat) action = true;
      e.preventDefault();
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', e => touches.delete(e.code));
  addEventListener('blur', () => touches.clear());

  // ---- joystick tactile : flottant, il naît sous le doigt ----
  if (padEl) {
    let id = null, ox = 0, oy = 0;
    const stick = padEl.querySelector('.joy');
    const bouton = padEl.querySelector('.act');
    const opts = { passive: false };
    stick.addEventListener('pointerdown', e => {
      e.preventDefault(); id = e.pointerId; ox = e.clientX; oy = e.clientY;
      stick.setPointerCapture(id);
    }, opts);
    stick.addEventListener('pointermove', e => {
      if (e.pointerId !== id) return;
      const dx = (e.clientX - ox) / 40, dy = (e.clientY - oy) / 40;
      joy.x = Math.max(-1, Math.min(1, dx));
      joy.y = Math.max(-1, Math.min(1, -dy));
    }, opts);
    const fin = e => { if (e.pointerId === id) { id = null; joy.x = 0; joy.y = 0; } };
    stick.addEventListener('pointerup', fin, opts);
    stick.addEventListener('pointercancel', fin, opts);
    bouton.addEventListener('pointerdown', e => { e.preventDefault(); action = true; }, opts);
  }

  function manette() {
    if (!navigator.getGamepads) return null;
    const g = navigator.getGamepads()[0];
    if (!g) return null;
    const x = g.axes[0] || 0, y = -(g.axes[1] || 0);
    if (g.buttons[0] && g.buttons[0].pressed && !actionVue) { action = true; }
    actionVue = !!(g.buttons[0] && g.buttons[0].pressed);
    return { x: Math.abs(x) > 0.2 ? x : 0, y: Math.abs(y) > 0.2 ? y : 0, boost: !!(g.buttons[5] && g.buttons[5].pressed) };
  }

  return {
    // x : tourner (-1 gauche, 1 droite) · y : avancer (1) / reculer (-1) · boost
    axes() {
      let x = 0, y = 0;
      if (touches.has('ArrowLeft') || touches.has('KeyA') || touches.has('KeyQ')) x -= 1;
      if (touches.has('ArrowRight') || touches.has('KeyD')) x += 1;
      if (touches.has('ArrowUp') || touches.has('KeyW') || touches.has('KeyZ')) y += 1;
      if (touches.has('ArrowDown') || touches.has('KeyS')) y -= 1;
      const m = manette();
      if (m) { x = x || m.x; y = y || m.y; }
      x = x || joy.x; y = y || joy.y;
      const boost = touches.has('ShiftLeft') || touches.has('ShiftRight') || (m && m.boost);
      return { x, y, boost: !!boost };
    },
    // vrai une seule fois par appui
    action() { const a = action; action = false; return a; },
    reset() { touches.clear(); action = false; joy.x = joy.y = 0; },
  };
}
