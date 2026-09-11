// Palette de la ville. Une seule source pour la couleur, côté 3D comme côté DOM.
// Le rouge #E8503A est réservé à l'anomalie : jamais en décor.

export const P = {
  nuit:      0x0B0E11,   // fond et brouillard
  beton:     0x161C23,   // corps des bâtiments
  beton2:    0x1F2832,
  sol:       0x0A0D10,
  texte:     '#C8D3DA',
  texte2:    '#7A8A96',
  sonde:     0xFFB454,   // ambre sodium : la sonde et ses feux
  sondeHex:  '#FFB454',
  cyan:      0x46E6C8,
  cyanHex:   '#46E6C8',
  magenta:   0xE84FD1,
  jaune:     0xF2D13B,
  bleu:      0x5AA9E6,
  anomalie:  0xE8503A,
  anomalieHex: '#E8503A',
  valide:    0x6FCF8E,
  valideHex: '#6FCF8E',
};

// Un accent par quartier : il teinte les arêtes néon, les enseignes et la lumière du district.
export const QUARTIERS = {
  medline:       { hex: '#8FB4D6', num: 0x8FB4D6 },
  thales:        { hex: '#4FC6D4', num: 0x4FC6D4 },
  albys:         { hex: '#9B7CFF', num: 0x9B7CFF },
  independant:   { hex: '#FF9A5C', num: 0xFF9A5C },
  digitalrealty: { hex: '#5AA9E6', num: 0x5AA9E6 },
  ecole:         { hex: '#F2D13B', num: 0xF2D13B },
  scenario:      { hex: '#F0F4F8', num: 0xF0F4F8 },
};

// Enseignes secondaires : le bruit de la ville. Des mots, pas des marques réelles.
export const ENSEIGNES_BRUIT = [
  'AIR SKY', 'SHOWBIZ', 'RING UP', 'PLASTIK', 'TAKARA', 'KNKL', 'H.G.F', 'SMAP',
  'DUKE', 'JACK BAR', 'FRESH CORE', 'BAKES', 'SERVICE', 'ANDREW TRADE', 'TBK',
  '首電', '封神', '田園工程', '神油', '森德', '大碗', '安東仁', 'Тело родос', 'MATE',
  'NODE 7', 'GPU FARM', 'SOC 24/7', 'DMARC OK', 'VLAN 40', 'PING', 'ROOT', 'CTI',
  'ISO 27001', 'OPENVAS', 'LLM API', 'HDS', 'PATCH', 'SIEM', 'EDR', 'IAM',
];

export function hexToNum(hex) { return parseInt(hex.slice(1), 16); }
