// Gestes de la carte : glisser avec inertie, molette, survol, inclinaison, clic ou tap.

const SEUIL_CLIC_PX = 7;
const INACTIVITE_MOLETTE = 180;
const INCLINAISON_X = 24;
const INCLINAISON_Y = 10;

export function installerInteractions({ canvas, pilote }) {
  let geste = null;
  let minuterieMolette = 0;
  const grossier = matchMedia('(pointer: coarse)');

  function position(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  function surAppui(ev) {
    if (ev.button !== undefined && ev.button !== 0) return;
    const p = position(ev);
    geste = { id: ev.pointerId, x0: p.x, y0: p.y, x: p.x, t: performance.now(), deplace: 0, vitesse: 0, type: ev.pointerType };
    try { canvas.setPointerCapture(ev.pointerId); } catch { /* capture facultative */ }
    pilote.debutGlisse();
  }

  function surMouvement(ev) {
    const p = position(ev);
    if (!geste || ev.pointerId !== geste.id) {
      if (ev.pointerType === 'mouse') {
        pilote.survoler(p.x, p.y);
        if (!grossier.matches) {
          const r = canvas.getBoundingClientRect();
          pilote.incliner(-((p.x / r.width) * 2 - 1) * INCLINAISON_X, -((p.y / r.height) * 2 - 1) * INCLINAISON_Y);
        }
      }
      return;
    }
    const now = performance.now();
    const dx = p.x - geste.x;
    const dt = Math.max(1, now - geste.t);
    geste.deplace = Math.max(geste.deplace, Math.hypot(p.x - geste.x0, p.y - geste.y0));
    if (geste.deplace > SEUIL_CLIC_PX) {
      const du = pilote.glisser(dx);
      geste.vitesse = geste.vitesse * 0.6 + (du / dt) * 0.4;
    }
    geste.x = p.x;
    geste.t = now;
  }

  function surRelache(ev) {
    if (!geste || ev.pointerId !== geste.id) return;
    const p = position(ev);
    const g = geste;
    geste = null;
    if (g.deplace <= SEUIL_CLIC_PX) {
      pilote.finGlisse(0, false);
      pilote.cliquer(p.x, p.y);
      return;
    }
    const age = performance.now() - g.t;
    pilote.finGlisse(age > 90 ? 0 : g.vitesse, true);
  }

  function surAnnule(ev) {
    if (!geste || ev.pointerId !== geste.id) return;
    geste = null;
    pilote.finGlisse(0, true);
  }

  function surMolette(ev) {
    if (ev.ctrlKey) return;
    const delta = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
    if (!delta) return;
    ev.preventDefault();
    const unite = ev.deltaMode === 1 ? 32 : ev.deltaMode === 2 ? 400 : 1;
    pilote.molette(delta * unite);
    clearTimeout(minuterieMolette);
    minuterieMolette = setTimeout(() => pilote.aimanter(), INACTIVITE_MOLETTE);
  }

  function surSortie() {
    pilote.survoler(-1, -1);
    pilote.incliner(0, 0);
  }

  canvas.addEventListener('pointerdown', surAppui);
  canvas.addEventListener('pointermove', surMouvement);
  canvas.addEventListener('pointerup', surRelache);
  canvas.addEventListener('pointercancel', surAnnule);
  canvas.addEventListener('pointerleave', surSortie);
  canvas.addEventListener('wheel', surMolette, { passive: false });

  return function desinstaller() {
    clearTimeout(minuterieMolette);
    canvas.removeEventListener('pointerdown', surAppui);
    canvas.removeEventListener('pointermove', surMouvement);
    canvas.removeEventListener('pointerup', surRelache);
    canvas.removeEventListener('pointercancel', surAnnule);
    canvas.removeEventListener('pointerleave', surSortie);
    canvas.removeEventListener('wheel', surMolette);
  };
}
