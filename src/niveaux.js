// NIVEAUX de la cité-système : où chaque niveau est posé, ce qu'il débloque.
// Ce fichier ne contient AUCUN fait de parcours : employeurs, périodes, postes et
// textes sont lus dans src/cv.js au moment de l'affichage. Ici, seulement la
// géographie de la carte et la table titre / verbe / accent (spec §4, au caractère près).

export const COUCHES = Object.freeze([
  Object.freeze({ id: 'modele',  nom: 'Modèle',  plan: 'ciel',    facteur: 0,    teinte: '#B98BFF' }),
  Object.freeze({ id: 'sites',   nom: 'Sites',   plan: 'horizon', facteur: 0.18, teinte: '#F07AA8' }),
  Object.freeze({ id: 'usages',  nom: 'Usages',  plan: 'usages',  facteur: 0.46, teinte: '#FFB454' }),
  Object.freeze({ id: 'donnees', nom: 'Données', plan: 'donnees', facteur: 0.62, teinte: '#7BE8A8' }),
  Object.freeze({ id: 'reseau',  nom: 'Réseau',  plan: 'reseau',  facteur: 0.80, teinte: '#43F0E6' }),
  Object.freeze({ id: 'socle',   nom: 'Socle',   plan: 'socle',   facteur: 1.00, teinte: '#9DB4E8' }),
]);

const N = (o) => Object.freeze({ ...o, sections: Object.freeze(o.sections) });

// Ordre = ordre du tableau JEUX de src/jeux/index.js (jamais le champ `ordre` des jeux).
export const NIVEAUX = Object.freeze([
  N({ id: 'ecole', titre: 'Le campus', verbe: 'APPRENDRE', accent: '#F2D13B', quartier: 'Le campus',
      couche: 'socle', station: 0, sections: ['formation', 'competence:Sécurité'], miseEnSituation: false }),
  N({ id: 'medline', titre: 'Le helpdesk', verbe: 'TRADUIRE', accent: '#8FB4D6', quartier: 'Le guichet',
      couche: 'usages', station: 700, sections: ['experience:medline'], miseEnSituation: false }),
  N({ id: 'thales', titre: 'Avant que ça sature', verbe: 'INSTRUMENTER', accent: '#3EE0C0', quartier: 'Les silos',
      couche: 'donnees', station: 1400, sections: ['experience:thales', 'competence:Développement'], miseEnSituation: false }),
  N({ id: 'albys', titre: 'Les cloisons', verbe: 'SEGMENTER', accent: '#A98BFF', quartier: 'Le port de brassage',
      couche: 'reseau', station: 2100, sections: ['experience:albys', 'competence:Systèmes & réseaux'], miseEnSituation: false }),
  N({ id: 'independant', titre: "Du geste à l'outil", verbe: 'AUTOMATISER', accent: '#FF9A5C', quartier: 'Le phare-trieur',
      couche: 'usages', station: 2800, sections: ['experience:independant', 'competence:IA appliquée'], miseEnSituation: false }),
  N({ id: 'digitalrealty', titre: 'La supervision', verbe: 'COORDONNER', accent: '#5AA9E6', quartier: 'Le poste de sécurité',
      couche: 'socle', station: 3500, sections: ['experience:digitalrealty', 'competence:Diagnostic & exploitation'], miseEnSituation: false }),
  N({ id: 'scenario', titre: "Qui a parlé à l'agent ?", verbe: 'DIAGNOSTIQUER', accent: '#FF6FD8', quartier: 'La tour-noyau',
      couche: 'sites', station: 4200, sections: ['a_apprendre', 'mise_en_situation'], miseEnSituation: true }),
]);

const S = (id, titre, type, source, toujours = false) => Object.freeze({ id, titre, type, source, toujours });

// Sections du CV. `titre` est un libellé générique : le nom de l'employeur est
// ajouté à l'affichage depuis FAITS (voir titreSection).
export const SECTIONS = Object.freeze({
  identite: S('identite', 'Identité', 'identite', 'PROFIL', true),
  en_bref: S('en_bref', 'En bref', 'en_bref', 'FAITS.digitalrealty · FORMATION[0]', true),
  'experience:digitalrealty': S('experience:digitalrealty', 'Expérience', 'experience', 'digitalrealty'),
  'experience:independant': S('experience:independant', 'Expérience', 'experience', 'independant'),
  'experience:albys': S('experience:albys', 'Expérience', 'experience', 'albys'),
  'experience:thales': S('experience:thales', 'Expérience', 'experience', 'thales'),
  'experience:medline': S('experience:medline', 'Expérience', 'experience', 'medline'),
  formation: S('formation', 'Formation', 'formation', 'FORMATION'),
  'competence:Sécurité': S('competence:Sécurité', 'Compétences', 'competence', 'Sécurité'),
  'competence:Développement': S('competence:Développement', 'Compétences', 'competence', 'Développement'),
  'competence:Systèmes & réseaux': S('competence:Systèmes & réseaux', 'Compétences', 'competence', 'Systèmes & réseaux'),
  'competence:IA appliquée': S('competence:IA appliquée', 'Compétences', 'competence', 'IA appliquée'),
  'competence:Diagnostic & exploitation': S('competence:Diagnostic & exploitation', 'Compétences', 'competence', 'Diagnostic & exploitation'),
  'competence:Langues': S('competence:Langues', 'Compétences', 'competence', 'Langues', true),
  a_apprendre: S('a_apprendre', 'Ce qui me reste à apprendre', 'a_apprendre', 'A_APPRENDRE'),
  mise_en_situation: S('mise_en_situation', 'Mise en situation', 'mise_en_situation', 'scenario'),
});

// Ordre de lecture du CV (Langues est rendu dans Identité).
export const ORDRE_SECTIONS = Object.freeze([
  'identite', 'en_bref',
  'experience:digitalrealty', 'experience:independant', 'experience:albys', 'experience:thales', 'experience:medline',
  'formation',
  'competence:Sécurité', 'competence:Développement', 'competence:Systèmes & réseaux',
  'competence:IA appliquée', 'competence:Diagnostic & exploitation',
  'a_apprendre', 'mise_en_situation',
]);

export function niveau(id) {
  return NIVEAUX.find((n) => n.id === id) || null;
}

export function couche(id) {
  return COUCHES.find((c) => c.id === id) || null;
}

// Le niveau qui déchiffre une section, ou null si elle est toujours visible.
export function niveauDeSection(sectionId) {
  return NIVEAUX.find((n) => n.sections.includes(sectionId)) || null;
}

// 'competence:Systèmes & réseaux' -> 'competence-systemes-reseaux' (ancre #cv-<slug>, route #cv/<slug>).
export function slugSection(sectionId) {
  return String(sectionId)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function sectionDepuisSlug(slug) {
  return ORDRE_SECTIONS.concat(['competence:Langues']).find((id) => slugSection(id) === slug) || null;
}

// 'DIGITAL REALTY' -> 'Digital Realty' ; 'INDÉPENDANT' -> 'Indépendant'.
export function casseTitre(texte) {
  return String(texte || '').toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, sep, l) => sep + l.toUpperCase());
}

// Titre affiché d'une section, composé avec les faits (jamais écrit ici).
export function titreSection(sectionId, FAITS) {
  const s = SECTIONS[sectionId];
  if (!s) return '';
  if (s.type === 'experience') return `${s.titre} · ${casseTitre(FAITS && FAITS[s.source] ? FAITS[s.source].employeur : s.source)}`;
  if (s.type === 'competence') return `${s.titre} · ${s.source}`;
  return s.titre;
}

// « au campus », « aux silos », « à la tour-noyau ».
export function auQuartier(nomQuartier) {
  const q = String(nomQuartier || '');
  if (/^Les /.test(q)) return 'aux ' + q.slice(4);
  if (/^Le /.test(q)) return 'au ' + q.slice(3);
  if (/^La /.test(q)) return 'à la ' + q.slice(3);
  return 'à ' + q;
}

// Première année d'une période (« 2018 – 2020 » -> « 2018 »), ou null.
export function premiereAnnee(periode) {
  const m = String(periode || '').match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : null;
}

export function verifierNiveaux({ FAITS, COMPETENCES } = {}) {
  const erreurs = [];
  const cles = Object.keys(FAITS || {});
  const groupes = new Set((COMPETENCES || []).map((g) => g && g.groupe));
  if (NIVEAUX.length !== 7) erreurs.push(`7 niveaux attendus, ${NIVEAUX.length} déclarés`);
  const vusIds = new Set();
  NIVEAUX.forEach((n, k) => {
    if (vusIds.has(n.id)) erreurs.push(`niveau en double : ${n.id}`);
    vusIds.add(n.id);
    if (!cles.includes(n.id)) erreurs.push(`niveau sans fiche dans cv.js : ${n.id}`);
    if (n.station !== 700 * k) erreurs.push(`station incohérente : ${n.id}`);
    if (!couche(n.couche)) erreurs.push(`couche inconnue : ${n.id} -> ${n.couche}`);
    if (!/^#[0-9A-F]{6}$/i.test(n.accent)) erreurs.push(`accent invalide : ${n.id}`);
  });
  const vusSections = new Map();
  for (const n of NIVEAUX) {
    for (const s of n.sections) {
      if (!SECTIONS[s]) erreurs.push(`section inconnue : ${s}`);
      if (vusSections.has(s)) erreurs.push(`section débloquée par deux niveaux : ${s}`);
      vusSections.set(s, n.id);
      if (s.startsWith('competence:') && !groupes.has(s.slice(11))) erreurs.push(`groupe absent de cv.js : ${s.slice(11)}`);
      if (s.startsWith('experience:') && !cles.includes(s.slice(11))) erreurs.push(`fiche absente de cv.js : ${s.slice(11)}`);
    }
  }
  for (const [id, s] of Object.entries(SECTIONS)) {
    if (!s.toujours && !vusSections.has(id)) erreurs.push(`section jamais débloquée : ${id}`);
    if (s.toujours && vusSections.has(id)) erreurs.push(`section toujours visible mais chiffrée : ${id}`);
  }
  if (!groupes.has('Langues')) erreurs.push('groupe Langues absent de cv.js');
  return erreurs;
}
