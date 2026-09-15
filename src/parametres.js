// Paramètres d'URL et hash, en liste blanche. Tout id inconnu devient null.

const SLUG = /^[a-z0-9-]{1,80}$/;
const T_MAX = 600000;

export function lireParametres(search, hash, idsConnus) {
  const p = new URLSearchParams(search || '');
  const ids = new Set(idsConnus || []);
  const idConnu = (v) => (v && ids.has(v) ? v : null);

  const niveau = idConnu(p.get('niveau'));
  const jeu = idConnu(p.get('jeu'));

  let cv = null;
  const h = String(hash || '').replace(/^#/, '');
  if (p.get('cv') === '1') cv = { onglet: 'complet', ancre: null };
  if (p.get('cv') === 'cles') cv = { onglet: 'cles', ancre: null };
  if (h === 'cv') cv = { onglet: 'complet', ancre: null };
  else if (h.startsWith('cv/')) {
    const a = h.slice(3);
    cv = { onglet: 'complet', ancre: SLUG.test(a) ? a : null };
  }

  const progresBrut = p.get('progres');
  const progres = progresBrut === 'all' || progresBrut === 'none' ? progresBrut : null;
  const capture = p.get('capture') === '1';
  const tBrut = Number(p.get('t'));
  const t = p.has('t') && Number.isFinite(tBrut) && tBrut >= 0 && tBrut <= T_MAX ? tBrut : null;
  const anim = p.get('anim') === '0' ? 'reduites' : null;
  const boot = !(p.get('boot') === '0' || niveau || jeu || cv);

  return Object.freeze({ boot, niveau, jeu, cv: cv ? Object.freeze(cv) : null, progres, capture, t, anim });
}
