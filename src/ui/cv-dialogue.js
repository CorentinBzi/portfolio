// Le dialogue CV : un seul <dialog>, deux onglets. « CV complet » : tout en clair, sans condition.
// « Mes clés » : la même lecture, les sections non déchiffrées en glyphes décoratifs.
// Le verrou ne cache jamais une information. Ne dépend que de cv.js, niveaux.js, progression.js.

import { FAITS, PROFIL, FORMATION, COMPETENCES, A_APPRENDRE } from '../cv.js';
import { NIVEAUX, SECTIONS, ORDRE_SECTIONS, niveauDeSection, slugSection, titreSection, auQuartier, casseTitre } from '../niveaux.js';
import { aCle, nbCles } from '../progression.js';

const HEX = '0123456789ABCDEF';

function el(tag, classe, texte) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined && texte !== null) e.textContent = texte;
  return e;
}

function lien(texte, href, classe = 'btn', nouvelOnglet = false) {
  const a = el('a', classe, texte);
  a.href = href;
  if (nouvelOnglet) { a.target = '_blank'; a.rel = 'noopener'; }
  return a;
}

function glyphes(graine, n = 3) {
  let a = 0;
  for (const c of graine) a = (a * 31 + c.charCodeAt(0)) >>> 0;
  const lignes = [];
  for (let l = 0; l < n; l++) {
    let s = '';
    for (let i = 0; i < 64; i++) {
      a = (Math.imul(a ^ (a >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
      s += i % 3 === 2 ? ' ' : HEX[a % 16];
    }
    lignes.push(s);
  }
  return lignes;
}

export function creerDialogueCv({ dialog, progression, persistante = true, surJouer, surAllerNiveau, surReinitialiser, surFermeture, surToast = () => {} }) {
  let p = progression;
  let onglet = 'complet';
  let declencheur = null;
  let jeuMonte = false;

  dialog.replaceChildren();
  const tete = el('div', 'cv-tete');
  const ligne = el('div', 'cv-ligne1');
  const titres = el('div', 'cv-titres');
  const h2 = el('h2', '', `CV — ${PROFIL.nom}`);
  h2.id = 'cv-titre';
  titres.append(h2, el('p', 'cv-visee', PROFIL.visee));
  const fermer = el('button', 'btn cv-fermer', 'Fermer');
  fermer.type = 'button';
  fermer.addEventListener('click', () => dialog.close());
  ligne.append(titres, fermer);

  const actions = el('div', 'cv-actions');
  const copier = el('button', 'btn', 'Copier le courriel');
  copier.type = 'button';
  copier.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(PROFIL.email); surToast('Courriel copié : ' + PROFIL.email); } catch { surToast(PROFIL.email); }
  });
  const imprimer = lien('Version imprimable', 'cv.html', 'btn or', true);
  actions.append(lien('Écrire', `mailto:${PROFIL.email}`), copier, lien('GitHub', PROFIL.github, 'btn secondaire', true),
    lien('TryHackMe', PROFIL.tryhackme, 'btn secondaire', true), lien('Dossier à lire', 'dossier.html', 'btn', true), imprimer);

  const onglets = el('div', 'cv-onglets');
  onglets.setAttribute('role', 'tablist');
  onglets.setAttribute('aria-label', 'Lecture du CV');
  const tabComplet = el('button', 'cv-onglet', 'CV complet');
  const tabCles = el('button', 'cv-onglet');
  for (const [tab, id] of [[tabComplet, 'complet'], [tabCles, 'cles']]) {
    tab.type = 'button';
    tab.id = `cv-tab-${id}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', 'cv-doc');
    tab.addEventListener('click', () => { onglet = id; rendre(); });
    onglets.append(tab);
  }
  onglets.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    onglet = onglet === 'complet' ? 'cles' : 'complet';
    rendre();
    (onglet === 'complet' ? tabComplet : tabCles).focus();
  });
  tete.append(ligne, actions, onglets);

  const avert = el('p', 'cv-avert');
  avert.hidden = true;
  const bandeau = el('p', 'cv-bandeau');
  const versComplet = el('button', 'btn', 'CV complet');
  versComplet.type = 'button';
  versComplet.addEventListener('click', () => { onglet = 'complet'; rendre(); tabComplet.focus(); });
  bandeau.append('Vue de jeu. Tout le CV se lit sans jouer : ', versComplet);
  const doc = el('div', 'cv-doc');
  doc.id = 'cv-doc';
  doc.setAttribute('role', 'tabpanel');
  doc.tabIndex = 0;

  const pied = el('div', 'cv-pied');
  const reinit = el('button', 'btn', 'Réinitialiser ma progression');
  reinit.type = 'button';
  let confirmation = 0;
  reinit.addEventListener('click', () => {
    if (confirmation) {
      clearTimeout(confirmation);
      confirmation = 0;
      reinit.textContent = 'Réinitialiser ma progression';
      surReinitialiser();
      return;
    }
    reinit.textContent = 'Confirmer : effacer mes clés';
    confirmation = setTimeout(() => { confirmation = 0; reinit.textContent = 'Réinitialiser ma progression'; }, 4000);
  });
  const note = el('span', 'cv-note', persistante
    ? 'Progression enregistrée dans ce navigateur uniquement (aucun cookie).'
    : 'Progression gardée en mémoire le temps de la visite.');
  pied.append(reinit, note);
  dialog.append(tete, avert, bandeau, doc, pied);

  dialog.addEventListener('close', () => {
    if (surFermeture) surFermeture();
    if (declencheur && document.contains(declencheur)) declencheur.focus({ preventScroll: true });
    declencheur = null;
  });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  function puceEtat(n, joue) {
    const bloc = el('div', 'cv-etat-bloc');
    if (joue) {
      bloc.append(el('span', 'cv-etat joue', `déchiffrée en jouant · ${n.verbe}`));
      const c = p.cles[n.id];
      if (c && c.message) bloc.append(el('p', 'cv-partie', `Votre partie : ${c.message}`));
      else if (c && c.migree) bloc.append(el('p', 'cv-partie', 'Clé obtenue dans une version précédente.'));
    } else {
      bloc.append(el('span', 'cv-etat', 'non jouée'));
      if (!jeuMonte) {
        const aller = el('button', 'btn petit', 'Aller au niveau');
        aller.type = 'button';
        aller.addEventListener('click', () => surAllerNiveau(n.id));
        bloc.append(aller);
      }
    }
    return bloc;
  }

  function experience(cle) {
    const F = FAITS[cle];
    const frag = document.createDocumentFragment();
    frag.append(el('p', 'cv-poste', F.poste), el('p', 'cv-meta', `${casseTitre(F.employeur)} · ${F.periode}`),
      el('p', 'cv-texte', F.texte));
    const garde = el('p', 'cv-garde');
    // Une mise en situation n'a pas été vécue : on dit ce qu'elle met en jeu, pas ce qu'on « en garde ».
    const miseEnSituation = NIVEAUX.some((n) => n.id === cle && n.miseEnSituation);
    garde.append(el('strong', '', miseEnSituation ? 'Ce que le niveau met en jeu : ' : 'Ce que j’en garde : '), F.pourLePoste);
    frag.append(garde);
    return frag;
  }

  function contenu(id) {
    const s = SECTIONS[id];
    const frag = document.createDocumentFragment();
    if (s.type === 'identite') {
      frag.append(el('p', 'cv-nom', PROFIL.nom), el('p', 'cv-poste', PROFIL.visee), el('p', 'cv-meta', PROFIL.lieu));
      const liens = el('p', 'cv-liens');
      liens.append(lien(PROFIL.email, `mailto:${PROFIL.email}`, 'cv-lien'), ' · ', lien('GitHub', PROFIL.github, 'cv-lien', true), ' · ', lien('TryHackMe', PROFIL.tryhackme, 'cv-lien', true));
      const langues = COMPETENCES.find((g) => g.groupe === 'Langues');
      frag.append(liens);
      if (langues) frag.append(el('p', 'cv-texte', `Langues : ${langues.items}`));
    } else if (s.type === 'en_bref') {
      const dr = FAITS.digitalrealty;
      const f0 = FORMATION[0];
      const ul = el('ul', 'cv-liste');
      ul.append(el('li', '', `${dr.poste} · ${casseTitre(dr.employeur)} · ${dr.periode}`), el('li', '', `${f0.titre} · ${f0.ou} · ${f0.quand}`));
      frag.append(ul);
    } else if (s.type === 'experience') {
      frag.append(experience(s.source));
    } else if (s.type === 'formation') {
      const ul = el('ul', 'cv-liste');
      for (const f of FORMATION) {
        const li = el('li');
        li.append(el('strong', '', f.titre), el('span', 'cv-meta', ` · ${f.ou} · ${f.quand}`));
        ul.append(li);
      }
      frag.append(ul, el('p', 'cv-texte', FAITS.ecole.texte));
    } else if (s.type === 'competence') {
      const g = COMPETENCES.find((x) => x.groupe === s.source);
      frag.append(el('p', 'cv-texte', g ? g.items : ''));
    } else if (s.type === 'a_apprendre') {
      frag.append(el('p', 'cv-texte', A_APPRENDRE));
    } else if (s.type === 'mise_en_situation') {
      const cadre = el('div', 'cv-mise');
      cadre.append(el('p', 'cv-mise-titre', 'Mise en situation — pas une expérience'), experience('scenario'));
      frag.append(cadre);
    }
    return frag;
  }

  function verrouille(id, n) {
    const s = SECTIONS[id];
    const frag = document.createDocumentFragment();
    if (s.type === 'experience') frag.append(el('p', 'cv-poste', FAITS[s.source].poste), el('p', 'cv-meta', `${casseTitre(FAITS[s.source].employeur)} · ${FAITS[s.source].periode}`));
    const g = el('div', 'cv-glyphes');
    g.setAttribute('aria-hidden', 'true');
    for (const l of glyphes(id)) g.append(el('span', '', l));
    frag.append(g, el('p', 'cv-manque', `Clé manquante : ${n.verbe} ${auQuartier(n.quartier)}`));
    const act = el('div', 'cv-verrou-actions');
    if (!jeuMonte) {
      const jouer = el('button', 'btn or petit', 'Jouer');
      jouer.type = 'button';
      jouer.addEventListener('click', () => surJouer(n.id));
      act.append(jouer);
    }
    const clair = el('button', 'btn petit', 'Lire en clair');
    clair.type = 'button';
    clair.addEventListener('click', () => { onglet = 'complet'; rendre(); ancrer(slugSection(id)); });
    act.append(clair);
    frag.append(act);
    return frag;
  }

  function section(id) {
    const s = SECTIONS[id];
    const n = niveauDeSection(id);
    const joue = !!n && aCle(p, n.id);
    const art = el('section', `cv-section cv-${s.type}`);
    art.id = `cv-${slugSection(id)}`;
    if (n) art.style.setProperty('--acc', n.accent);
    const h3 = el('h3', '', titreSection(id, FAITS));
    art.append(h3);
    if (n) art.append(puceEtat(n, joue));
    if (onglet === 'cles' && n && !joue) { art.classList.add('cv-verrou'); art.append(verrouille(id, n)); }
    else art.append(contenu(id));
    return art;
  }

  function rendre() {
    const n = nbCles(p);
    tabCles.textContent = `Mes clés ${n}/${NIVEAUX.length}`;
    tabComplet.setAttribute('aria-selected', String(onglet === 'complet'));
    tabCles.setAttribute('aria-selected', String(onglet === 'cles'));
    tabComplet.tabIndex = onglet === 'complet' ? 0 : -1;
    tabCles.tabIndex = onglet === 'cles' ? 0 : -1;
    doc.setAttribute('aria-labelledby', `cv-tab-${onglet}`);
    bandeau.hidden = onglet !== 'cles';
    doc.replaceChildren(...ORDRE_SECTIONS.map(section));
  }

  function ancrer(slug) {
    if (!slug) return;
    const cible = doc.querySelector(`#cv-${CSS.escape(slug)}`);
    if (cible) requestAnimationFrame(() => { doc.scrollTop = cible.offsetTop - doc.offsetTop - 8; cible.classList.add('cv-cible'); setTimeout(() => cible.classList.remove('cv-cible'), 1600); });
  }

  return {
    ouvrir({ onglet: o = 'complet', ancre = null, declencheur: d = null, avertissement = '', jeuMonte: j = false } = {}) {
      onglet = o === 'cles' ? 'cles' : 'complet';
      declencheur = d;
      jeuMonte = j;
      avert.textContent = avertissement;
      avert.hidden = !avertissement;
      rendre();
      if (!dialog.open) dialog.showModal();
      doc.scrollTop = 0;
      ancrer(ancre);
    },
    fermer() { if (dialog.open) dialog.close(); },
    majProgression(q) { p = q; if (dialog.open) rendre(); },
    estOuvert: () => dialog.open,
  };
}
