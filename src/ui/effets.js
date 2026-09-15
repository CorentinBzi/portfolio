// Effets de transition de la coquille : volet de plongée, vol de la clé, toast, attente des polices.

const TOAST_MS = 3200;
const MI_VOLET_MS = 150;
const FONDU_VOLET_MS = 260;
const VOL_CLE_MS = 600;
let minuterieToast = 0;

export function toast(texte) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = texte;
  t.hidden = false;
  clearTimeout(minuterieToast);
  minuterieToast = setTimeout(() => { t.hidden = true; }, TOAST_MS);
}

// Volet circulaire dans l'accent ; la promesse se résout à mi-volet (le jeu y est monté).
export function ouvrirVolet(v, { accent, x, y }) {
  v.style.setProperty('--acc', accent);
  v.style.setProperty('--vx', `${Math.round(x)}px`);
  v.style.setProperty('--vy', `${Math.round(y)}px`);
  v.classList.remove('ouvert', 'fondu');
  v.hidden = false;
  void v.offsetWidth;
  v.classList.add('ouvert');
  return new Promise((r) => setTimeout(r, MI_VOLET_MS));
}

export function fondreVolet(v) {
  if (!v || v.hidden) return;
  setTimeout(() => {
    v.classList.add('fondu');
    setTimeout(() => { v.hidden = true; v.classList.remove('ouvert', 'fondu'); }, FONDU_VOLET_MS);
  }, 140);
}

// Une clé hexagonale vole du quartier vers sa case du trousseau (600 ms, en arc).
export function animerCle(depuis, cible, accent) {
  if (!cible || !document.body.animate) return Promise.resolve();
  const r = cible.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'cle-vol';
  el.style.setProperty('--acc', accent);
  document.body.appendChild(el);
  const x1 = r.left + r.width / 2, y1 = r.top + r.height / 2;
  const mx = (depuis.x + x1) / 2, my = Math.min(depuis.y, y1) - 90;
  const anim = el.animate([
    { transform: `translate(${depuis.x}px, ${depuis.y}px) scale(1.8) rotate(0deg)`, opacity: 0 },
    { transform: `translate(${mx}px, ${my}px) scale(1.4) rotate(180deg)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${x1}px, ${y1}px) scale(.55) rotate(360deg)`, opacity: 1 },
  ], { duration: VOL_CLE_MS, easing: 'cubic-bezier(.2,.8,.2,1)' });
  return anim.finished.catch(() => {}).then(() => el.remove());
}

// Polices chargées, ou délai dépassé (le terminal passe alors en polices système).
export function chargerPolices(delai = 900) {
  if (!document.fonts || !document.fonts.load) return Promise.resolve(false);
  const charge = Promise.all([document.fonts.load('800 16px Archivo'), document.fonts.load('500 13px "IBM Plex Mono"')])
    .then((r) => r.every((l) => l.length > 0)).catch(() => false);
  return Promise.race([charge, new Promise((r) => setTimeout(() => r(false), delai))]);
}
