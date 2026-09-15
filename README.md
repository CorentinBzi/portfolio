# Couche par couche — portfolio de Corentin Bezille

Un portfolio **cybersécurité & IA** qui se lit, ou qui se joue. Une cité-système au bord d'une baie,
vue du rivage entre l'aube et le crépuscule, dessinée en 2D par le code et montée en parallaxe :
chaque plan est une couche technique, chaque étape du parcours est un quartier posé sur la couche de
son métier, et chaque niveau gagné déchiffre une section du CV. Le CV complet, lui, reste lisible à
tout moment, en un clic, sans jamais jouer.

En ligne : <https://corentinbzi.github.io/portfolio/>

> L'ancien portfolio, la ville cyberpunk en 3D (Three.js, voiture volante), est archivé sur la
> branche **`v1-ville-3d`**.

## Les pages

| Page | Rôle |
|---|---|
| `index.html` | **Le portfolio jouable** : amorçage en terminal, carte en parallaxe, sept niveaux, CV en dialogue. |
| `dossier.html` | Tout le portfolio à lire, sans jeu et sans JavaScript. |
| `cv.html` | Le CV imprimable, deux pages A4. |
| `tools/recette.html` | La recette des jeux : chacun se monte, se résout seul, se démonte. |
| `tools/verif-coquille.html` | Les tests des modules purs de la coquille. |

## Le parcours d'un visiteur

1. **L'amorçage.** Un terminal amorce les couches une à une et fait apparaître les plans de la carte.
   Chaque `[ OK ]` n'apparaît qu'après une vraie vérification (polices chargées, faits gelés et
   cohérents, plan pré-rendu, niveaux déclarés). Cinq secondes au plus, environ 1,7 s pour un visiteur
   qui revient. « Passer » (bouton, Entrée, Échap) mène directement à la carte.
2. **La carte.** Huit plans défilent à des vitesses différentes. On la parcourt en glissant, à la
   molette, aux flèches ou avec le rail des niveaux en bas de l'écran. Sélectionner un quartier ouvre
   sa fiche ; « Jouer » plonge dans le niveau.
3. **Un niveau.** Le jeu reprend le geste du métier. La victoire donne une clé, qui vole vers le
   trousseau de la barre, et la section du CV correspondante se déchiffre.
4. **Le CV complet.** Bouton « CV complet » de la barre (présent dans tous les états, y compris sous
   l'amorçage et pendant une partie), touche C, lien `#cv` ou `?cv=1`. Sans JavaScript, le lien mène à
   `cv.html`.

## Les couches

La profondeur de la parallaxe **est** la pile technique : le concret au premier plan, l'abstrait au fond.

| Plan | Couche | Facteur de parallaxe | Ce qu'on y voit |
|---|---|---|---|
| 0 | Ciel · **Modèle** | 0 | dégradé du ciel, soleil, constellation de neurones (une colonne par niveau) |
| 1 | Horizon · **Sites** | 0,18 | îles, éoliennes, cinq campus « DC 1 » à « DC 5 », la tour-noyau |
| 2 | Baie & **Usages** | 0,46 | mer, front de mer, pont, le guichet, le phare-trieur |
| 3 | **Données** | 0,62 | quai des silos, convoyeur, les silos |
| 4 | **Réseau** | 0,80 | pylônes, câbles aux couleurs des VLAN, le port de brassage |
| 5 | **Socle** | 1,00 | sol côtier, coupe souterraine, le campus, le poste de sécurité |
| 6 | Premier plan | 1,35 | roseaux, rochers, armoire de rue, câbles néon, bokeh |
| 7 | Particules | 1,60 | poussière dorée, grains de données, étincelles IA |

## Les sept niveaux

| # | id | Niveau | Quartier | Couche | Employeur | Verbe | Jeu | Section du CV déchiffrée |
|---|---|---|---|---|---|---|---|---|
| 1 | `ecole` | Le campus | Le campus | Socle | ESIEE-IT | APPRENDRE | conservé | Formation + Compétences · Sécurité |
| 2 | `medline` | Le helpdesk | Le guichet | Usages | MEDLINE | TRADUIRE | conservé | Expérience · Medline |
| 3 | `thales` | Avant que ça sature | Les silos | Données | THALES | INSTRUMENTER | refait | Expérience · Thales + Compétences · Développement |
| 4 | `albys` | Les cloisons | Le port de brassage | Réseau | ALBYS | SEGMENTER | refait | Expérience · Albys + Compétences · Systèmes & réseaux |
| 5 | `independant` | Du geste à l'outil | Le phare-trieur | Usages | INDÉPENDANT | AUTOMATISER | refait | Expérience · Indépendant + Compétences · IA appliquée |
| 6 | `digitalrealty` | La supervision | Le poste de sécurité | Socle | DIGITAL REALTY | COORDONNER | conservé | Expérience · Digital Realty + Compétences · Diagnostic & exploitation |
| 7 | `scenario` | Qui a parlé à l'agent ? | La tour-noyau | Sites | SCÉNARIO | DIAGNOSTIQUER | refait | Ce qui me reste à apprendre + Mise en situation |

- **Tous les niveaux sont jouables dès l'arrivée** : ce qui se débloque, c'est le CV, pas l'accès. Le
  niveau suggéré est le premier non gagné.
- **Toujours en clair** : Identité, En bref et Compétences · Langues. Le verrou est décoratif, il ne
  cache jamais une information : l'onglet « CV complet » du dialogue montre tout, sans condition.
- **L'ordre fait foi** : l'ordre des niveaux sur la carte est celui du tableau `JEUX` de
  `src/jeux/index.js`, **jamais** le champ `ordre` des jeux, qui est en collision (`ecole` et `albys`
  valent tous deux 3).
- Les jeux `ecole`, `medline` et `digitalrealty` sont conservés tels quels. `thales`, `albys`,
  `independant` et `scenario` ont été refaits ; les quatre exposent `pause()` et `reprendre()`, que la
  coquille appelle quand le CV s'ouvre pendant une partie. `digitalrealty` n'a pas de pause : le
  dialogue le signale (« L’horloge de « La supervision » continue pendant la lecture ») ; les deux
  autres jeux conservés n'ont pas d'horloge.

## Honnêteté par construction

- **Tous les faits du parcours vivent dans `src/cv.js`**, gelés : `FAITS` (une fiche par clé :
  `employeur`, `periode`, `poste`, `texte`, `pourLePoste`), `CLES`, `PROFIL`, `FORMATION`,
  `COMPETENCES`, `A_APPRENDRE`. Toute mise à jour du parcours commence là.
- **Un jeu refait ne contient aucun fait** : il cite une clé `factKey`, et `valider()` de
  `src/jeux/_contrat.js` refuse une clé inconnue. Le jeu ne *peut pas* inventer une ligne de CV.
  Les jeux conservés tels quels (`ecole`, `medline`, `digitalrealty`) gardent quelques mentions
  courtes écrites en dur, antérieures à cette règle (par exemple « Deux ans de support » dans
  `medline`) : le contrat ne les valide pas, elles sont à relire à la main contre `cv.js`.
- Dans les jeux, entreprises, personnes et domaines sont fictifs (domaines en `.example`, adresses IP
  de documentation RFC 5737), aucune interface de marque n'est imitée, et seuls les outils présents
  dans `cv.js` sont nommés.
- **« Votre partie »** désigne ce que le visiteur a fait en jouant, jamais un résultat du candidat.
- **La tour-noyau est une mise en situation**, étiquetée comme telle à cinq endroits (balise, fiche,
  section du CV, bandeau du jeu, écran de fin) ainsi que dans `dossier.html` et `cv.html` : entreprise,
  agent, journaux et chiffres y sont inventés, aucune expérience n'y est revendiquée.
- `A_APPRENDRE` est un objectif d'apprentissage, présenté comme tel.
- Le terminal écrit « aucun cookie posé par ce site », et non « aucune requête » : les polices viennent
  de Google Fonts.
- `cv.html` et `dossier.html` sont statiques : ils sont alignés à la main sur `cv.js`. Le dialogue CV
  de `index.html`, lui, est rendu uniquement depuis `cv.js`.

## Paramètres d'URL (`index.html`)

| Paramètre | Effet |
|---|---|
| `?boot=0` | pas d'amorçage, carte directement |
| `?niveau=<id>` | pas d'amorçage ; caméra sur le quartier, fiche ouverte |
| `?jeu=<id>` | pas d'amorçage ; lance le jeu |
| `?cv=1`, `#cv`, `#cv/<section>` | pas d'amorçage ; dialogue CV ouvert sur l'onglet « CV complet » (ancre éventuelle) |
| `?progres=all` · `?progres=none` | toutes les clés · aucune clé, en mémoire seulement, jamais écrit |
| `?capture=1` | rendu déterministe pour les captures : horloge figée à `?t=<ms>` (12 000 par défaut pour la carte, 2 400 pour l'amorçage), puis `document.title = 'CAPTURE PRETE'` |
| `?anim=0` | mouvement réduit forcé |

Les identifiants hors de la liste blanche des niveaux sont ignorés. Les erreurs (`error`,
`unhandledrejection`, échec d'import d'un jeu, incohérence de métadonnées) sont consignées dans
`<pre id="journal" hidden>`, lisible en headless par `--dump-dom`.

## Clavier

Sur la carte : ← → niveau précédent ou suivant · Début / Fin · 1 à 7 · Entrée ou Espace sur une puce
du rail (sélectionner, puis jouer) · J jouer · C CV complet · K onglet « Mes clés » · Échap ferme, dans
l'ordre, le dialogue, la récompense puis la fiche. Pendant l'amorçage : C et K, plus Entrée ou Échap
pour passer. **Aucun raccourci pendant un jeu**, et Échap ne quitte jamais une partie.

## Progression

`localStorage['cb-portfolio.v3']` = `{ version: 3, vu, animations, cles: { [id]: { score, message, date } } }`.
La lecture est validée (ids connus seulement, message ≤ 300 caractères rendu en `textContent`), avec
repli en mémoire si le stockage est indisponible. Les clés `ecole`, `medline` et `digitalrealty` de
l'ancienne version (`qsp3d.v2`) sont reprises ; celles des jeux refaits sont ignorées. Le pied du
dialogue CV propose de réinitialiser la progression.

## Structure

```
index.html                 barre statique, lien d'évitement, amorçage, canvas#monde, balises, rail,
                           fiche, jeu, récompense, dialog#cv, annonces, noscript, journal
dossier.html               le portfolio à lire, sans JavaScript
cv.html                    le CV imprimable A4
.nojekyll                  indispensable : Jekyll ignorerait les fichiers en « _ » (_contrat.js)

src/cv.js                  LES FAITS, gelés : la seule source du parcours
src/app.js                 point d'entrée : paramètres, préférences, machine d'états, câblage
src/etat.js                machine d'états pure
src/parametres.js          lecture des paramètres d'URL et du hash (liste blanche)
src/progression.js         progression pure + adaptateur de stockage
src/niveaux.js             COUCHES, NIVEAUX, SECTIONS, verifierNiveaux() — aucun fait
src/hote-jeu.js            chargement dynamique d'un jeu, API, pause, démontage protégé

src/amorcage/script.js     les lignes du terminal, calculées depuis cv.js et niveaux.js
src/amorcage/terminal.js   impression, schéma de pile, repli vers la carte

src/carte/camera.js        projection, bornes, aimantation, inertie
src/carte/rendu.js         boucle de rendu, plongée, célébration, capture
src/carte/tuiles.js        cache de tuiles de 512 px
src/carte/alea.js          PRNG déterministe (mulberry32)
src/carte/dessin.js        primitives : fenêtres, pylône, silo, baie, chaînette, halo, bokeh
src/carte/fil.js           le fil du parcours et la sonde
src/carte/niveaux-carte.js ancres et règle de dégagement des quartiers
src/carte/plans/           ciel, horizon, usages, donnees, reseau, socle, premier-plan, particules
src/carte/quartiers/       le dessin des sept quartiers (à ne pas confondre avec src/jeux/)

src/ui/                    barre, rail, balises, fiche, cv-dialogue, recompense, annonces, raccourcis
src/styles/                base, amorcage, carte, hud, cv

src/jeux/_contrat.js       le contrat de jeu et ses aides (cadre, terminal, colonne) — figé
src/jeux/index.js          le registre : l'ordre du tableau JEUX est l'ordre de la carte
src/jeux/<id>.js           un fichier par jeu

tools/recette.html         recette des jeux
tools/verif-coquille.html  tests des modules purs
```

Aucune étape de compilation, aucun framework, aucune bibliothèque 3D. Le monde et les jeux sont
dessinés par le code (canvas 2D, SVG inline, CSS) ; la seule image est le portrait embarqué dans
`cv.html`. Seule ressource externe : Google Fonts (Archivo, IBM Plex Mono, et Source Serif 4 pour le
CV imprimable). Tous les chemins sont relatifs, car le site est servi sous `/portfolio/`.

## Le contrat d'un jeu

Un jeu exporte par défaut `{ id, ordre, titre, employeur, annees, factKey, verbe, accent, description,
monter(conteneur, api) }`. `monter` renvoie `{ demonter(), resoudre(), pause(), reprendre() }`.

- `api.FAITS`, `api.accent`, `api.fini({ score, message })`, `api.abandonner()`, et
  `api.mouvementReduit` en option.
- `resoudre()` joue une solution correcte sans humain, par les mêmes gestionnaires que le joueur, et
  aboutit à `api.fini` : un jeu qui ne sait pas se résoudre ne sait pas prouver qu'il est gagnable.
- `demonter()` retire tout : DOM, écouteurs, intervalles, boucles d'animation.
- Aucun `Math.random` dans les jeux refaits : PRNG à graine fixe, temps simulé par `setInterval`.

## Développer et vérifier

Servir depuis le dossier **parent** du clone, pour reproduire le sous-chemin de GitHub Pages :

```bash
cd ..                                  # le dossier qui contient portfolio/
python -m http.server 8931 --bind 127.0.0.1
# puis http://127.0.0.1:8931/portfolio/
```

La recette des jeux (titre de la page `RECETTE OK` ou `RECETTE KO`) :

```
tools/recette.html                                          tous les jeux du registre
tools/recette.html?jeu=albys                                un seul jeu du registre
tools/recette.html?fichier=../src/jeux/albys.js             un fichier hors registre : 3 PASS attendus
tools/recette.html?fichier=../src/jeux/albys.js&apercu=1    monter sans résoudre, pour une capture
tools/verif-coquille.html                                   modules purs : VERIF OK ou VERIF KO
```

Les faits, sans navigateur :

```bash
node --input-type=module -e "const m = await import('./src/cv.js'); console.log(m.CLES, Object.isFrozen(m.FAITS))"
```

En headless (Chrome), depuis n'importe quel dossier :

```bash
CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe"
BASE=http://127.0.0.1:8931/portfolio

# une capture de la carte, rendu déterministe
"$CHROME" --headless=new --disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader \
  --virtual-time-budget=15000 --user-data-dir=/tmp/chrome-portfolio --window-size=1440,900 \
  --screenshot=/tmp/carte.png "$BASE/index.html?boot=0&capture=1"

# le DOM, donc le journal d'erreurs et le titre de la recette
"$CHROME" --headless=new --disable-gpu --virtual-time-budget=30000 \
  --user-data-dir=/tmp/chrome-portfolio --dump-dom "$BASE/tools/recette.html" | grep -E "RECETTE|FAIL"

# le CV en PDF : deux pages au plus
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=8000 \
  --user-data-dir=/tmp/chrome-portfolio --print-to-pdf=/tmp/cv.pdf "$BASE/cv.html"
python -c "from pypdf import PdfReader; print(len(PdfReader('/tmp/cv.pdf').pages), 'page(s)')"
```

Captures à relire avant publication : amorçage (`?capture=1&t=1000`, `t=2400`), carte
(`?boot=0&capture=1`), `?niveau=albys&capture=1`, `?niveau=scenario&capture=1`, `?cv=1`,
`?cv=1&progres=none`, `?jeu=medline`, et une série avec `?anim=0`, en 1440×900 et en 390×844. Le bouton
« CV complet » doit être visible sur chacune.

## Accessibilité et confort

Focus visible partout · le rail des niveaux est le chemin clavier et lecteur d'écran (le canvas est
`aria-hidden`) · annonces en `aria-live` · cibles d'au moins 44 px · lisible en 390×844 ·
`prefers-reduced-motion` respecté, et un interrupteur « Animations » dans la barre pour tous : parallaxe
comprimée, ni inclinaison, ni inertie, ni plongée, animations ambiantes figées.
