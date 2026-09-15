// Le terminal d'amorçage : impression, schéma de pile, repli vers la barre.
// Le terminal n'attend jamais un plan : passé le délai, la ligne passe en « [ .. ] ».

import { T_REPLI, DUREE_REPLI, PLAFOND, PLAFOND_REDUIT, MINIMUM_REDUIT, FACTEUR_RETOUR } from './script.js';

const BADGES = { ok: '[ OK ]', '--': '[ -- ]', '!!': '[ !! ]', '..': '[ .. ]' };
const CLASSES = { ok: 'ok', '--': 'sys', '!!': 'ko', '..': 'attente' };
const FRAPPE_MAX = 250;
const FRAPPE_PAR_CAR = 4;
const PAS_MS = 16;
const MARGE_PLAFOND = 150; // ms : minuteries et rappel de fin débordent de quelques dizaines de ms ; le plafond de la spec reste tenu

const dormir = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

function course(promesse, ms) {
  return Promise.race([
    Promise.resolve(promesse).catch(() => null),
    dormir(ms).then(() => null),
  ]);
}

export function lancerAmorcage({
  racine, script, reduit = false, rapide = false, capture = false, tCapture = 2400,
  surPlan = () => {}, surFin = () => {}, journal = () => {}, cibleRepli = () => null, cibleCouche = () => null,
}) {
  const sortie = racine.querySelector('.am-journal');
  const k = rapide ? FACTEUR_RETOUR : 1;
  const t0 = performance.now();
  const maintenant = () => performance.now() - t0;
  let fini = false;
  let enBloc = false;
  const minuteries = new Set();
  const promesses = new Map();

  const plus = (fn, ms) => { const id = setTimeout(() => { minuteries.delete(id); fn(); }, ms); minuteries.add(id); };
  const jusqua = (ms) => (enBloc || capture ? Promise.resolve() : dormir(ms - maintenant()));

  function allumer(couche) {
    const el = racine.querySelector(`.am-couche[data-couche="${couche}"]`);
    if (el) el.classList.add('allumee');
  }
  if (reduit) racine.querySelectorAll('.am-couche').forEach((el) => el.classList.add('allumee'));

  function nouvelleLigne(classe) {
    const p = document.createElement('p');
    p.className = 'am-l' + (classe ? ' ' + classe : '');
    sortie.appendChild(p);
    sortie.scrollTop = sortie.scrollHeight;
    return p;
  }

  function remplir(p, etat, texte) {
    p.textContent = '';
    if (etat) {
      const b = document.createElement('span');
      b.className = 'am-b ' + CLASSES[etat];
      b.textContent = BADGES[etat];
      p.append(b, ' ');
    }
    const s = document.createElement('span');
    s.className = etat === '!!' ? 'ko' : etat === '--' ? 'sys' : '';
    s.textContent = texte;
    p.append(s);
  }

  async function taper(p, etat, texte) {
    const plein = (etat ? BADGES[etat] + ' ' : '') + texte;
    if (reduit || enBloc || capture) { remplir(p, etat, texte); return; }
    const duree = Math.min(FRAPPE_MAX, plein.length * FRAPPE_PAR_CAR) * k;
    const pas = Math.max(1, Math.ceil(plein.length / Math.max(1, duree / PAS_MS)));
    p.classList.add('frappe');
    for (let i = pas; i < plein.length; i += pas) {
      if (enBloc || fini) break;
      p.textContent = plein.slice(0, i);
      await dormir(PAS_MS);
    }
    remplir(p, etat, texte);
    p.classList.remove('frappe');
  }

  function demarrer(ligne) {
    if (!ligne.verifier) return null;
    if (!promesses.has(ligne)) {
      const pr = Promise.resolve().then(ligne.verifier).catch((e) => {
        journal(`AMORCAGE ${ligne.id} : ${e && e.message ? e.message : e}`);
        return null;
      });
      promesses.set(ligne, pr);
    }
    return promesses.get(ligne);
  }

  async function barreModele(ligne, p) {
    const debut = ligne.t * k;
    const fin = ligne.fin * k;
    demarrer(ligne);
    if (capture) {
      const f = Math.max(0, Math.min(1, (tCapture - ligne.t) / (ligne.fin - ligne.t)));
      remplir(p, '..', ligne.texteBarre(f));
      if (f < 1) return;
    } else if (!reduit) {
      while (!enBloc && !fini && maintenant() < fin) {
        remplir(p, '..', ligne.texteBarre((maintenant() - debut) / (fin - debut)));
        await dormir(40);
      }
    }
    const res = await course(promesses.get(ligne), capture || reduit ? 3000 : ligne.delai);
    const r = res || ligne.retard;
    remplir(p, r.etat, r.texte);
    allumer(ligne.couche);
  }

  async function imprimer(ligne) {
    if (ligne.type === 'statique') return;
    if (capture && ligne.t > tCapture) return 'stop';
    if (!reduit) await jusqua(ligne.t * k);
    if (fini) return 'stop';
    if (ligne.plan) surPlan(ligne.plan);
    if (ligne.type === 'barre') { await barreModele(ligne, nouvelleLigne('barre')); return; }
    if (ligne.type === 'texte') {
      const p = nouvelleLigne(ligne.classe);
      await taper(p, null, ligne.texte);
      return;
    }
    const pr = demarrer(ligne);
    const delai = capture || reduit ? 3000 : Math.max(60, ligne.delai * k - (maintenant() - ligne.t * k));
    const res = await course(pr, enBloc ? 0 : delai);
    const r = res || ligne.retard;
    if (res && res.erreurs) res.erreurs.forEach((e) => journal(`FAITS ${e}`));
    const p = nouvelleLigne(r.etat === 'ok' ? '' : 'alerte');
    await taper(p, r.etat, r.texte);
    if (ligne.couche) allumer(ligne.couche);
  }

  function statut(texte) {
    const zone = racine.querySelector('[role="status"]');
    if (zone) zone.textContent = texte;
  }

  function repli(motif, duree) {
    if (fini) return;
    fini = true;
    minuteries.forEach(clearTimeout);
    minuteries.clear();
    const panneau = racine.querySelector('.am-panneau');
    const cible = cibleRepli();
    let anim = null;
    if (!reduit && panneau && cible && duree > 200 && panneau.animate) {
      const a = panneau.getBoundingClientRect();
      const dx = cible.left + cible.width / 2 - (a.left + a.width / 2);
      const dy = cible.top + cible.height / 2 - (a.top + a.height / 2);
      const sx = Math.max(0.04, cible.width / a.width);
      anim = panneau.animate(
        [{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(${sx})`, opacity: 0 }],
        { duration: duree, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' },
      );
      racine.querySelectorAll('.am-couche').forEach((el) => {
        const c = cibleCouche(el.dataset.couche);
        if (!c) return;
        const r = el.getBoundingClientRect();
        el.animate(
          [{ transform: 'none', opacity: 1 }, { transform: `translate(${c.x - (r.left + r.width / 2)}px, ${c.y - (r.top + r.height / 2)}px) scaleX(6)`, opacity: 0 }],
          { duration: duree, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' },
        );
      });
    }
    racine.classList.add(reduit ? 'am-fondu' : 'am-replie');
    racine.style.setProperty('--am-duree', `${duree}ms`);
    setTimeout(() => {
      if (anim) anim.cancel();
      surFin(motif);
    }, duree);
  }

  async function derouler() {
    for (const l of script) if (l.tot) demarrer(l);
    for (const l of script) {
      if (fini) return;
      if (!reduit && !capture && maintenant() > (T_REPLI - 120) * k) enBloc = true;
      const r = await imprimer(l);
      if (r === 'stop') break;
    }
    if (capture) return;
    const derniere = sortie.lastElementChild;
    if (derniere) derniere.classList.add('curseur');
    statut('Carte prête, 7 niveaux.');
    if (reduit) {
      plus(() => repli('fini', 150), Math.max(0, MINIMUM_REDUIT * k - maintenant()));
    } else {
      plus(() => repli('fini', DUREE_REPLI), Math.max(0, T_REPLI * k - maintenant()));
    }
  }

  const pret = derouler().catch((e) => journal(`AMORCAGE ${e && e.message ? e.message : e}`));

  if (!capture) {
    const plafond = ((reduit ? PLAFOND_REDUIT : PLAFOND) - MARGE_PLAFOND) * k;
    plus(() => repli('fini', 0), plafond);
    // Plafond dur : le repli commence au plus tard pour finir à l'heure.
    if (!reduit) plus(() => repli('fini', Math.max(0, plafond - maintenant())), (T_REPLI + 100) * k);
  }

  function surClicPanneau(e) {
    if (e.target.closest('button, a')) return;
    enBloc = true;
  }
  racine.addEventListener('click', surClicPanneau);

  return {
    pret,
    passer() { repli('passe', reduit ? 0 : 250); },
    terminerImpression() { enBloc = true; },
    estFini: () => fini,
    detruire() {
      fini = true;
      minuteries.forEach(clearTimeout);
      minuteries.clear();
      racine.removeEventListener('click', surClicPanneau);
    },
  };
}
