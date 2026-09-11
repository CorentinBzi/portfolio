// Palette du jeu. Une seule source de vérité pour la couleur.
// Règle dure : #E8503A ne sert QU'à l'anomalie. Jamais de décor rouge.

export const P = {
  fond:       '#0B0E11',
  panneau:    '#11161B',
  structure:  '#1B232B',
  ligne:      '#2B3843',
  texte:      '#C8D3DA',
  texte2:     '#7A8A96',

  sonde:      '#FFB454',
  halo:       '#FF8A3D',
  anomalie:   '#E8503A',
  valide:     '#6FCF8E',

  traceFond:  '#05070A',
  traceFil:   '#46E6C8',
  traceTexte: '#BFE9DF',
  traceFroid: '#7CA9FF',
};

// Un accent par niveau. Il teinte la structure et la parallaxe, jamais le texte.
export const ACCENTS = {
  medline:      '#8FA6B8',
  thales:       '#4FB2C4',
  albys:        '#7C6CE0',
  independant:  '#E08A5B',
  digitalrealty:'#5AA9E6',
  scenario:     '#E9EEF2',
};

// Mélange deux couleurs hex. Utilisé pour dériver les nuances de décor
// sans multiplier les constantes.
export function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ar = pa >> 16, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = pb >> 16, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

export function alpha(hex, a) {
  const p = parseInt(hex.slice(1), 16);
  return `rgba(${p >> 16},${(p >> 8) & 255},${p & 255},${a})`;
}
