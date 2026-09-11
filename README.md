# Quelqu'un sur place — portfolio de Corentin Bezille

Un CV qui se joue. Une ville cyberpunk de nuit rendue en 3D dans le navigateur, six
quartiers, un par étape du parcours, et dans chaque quartier un jeu qui **est** le métier
qu'on y faisait. Aucune image, aucun modèle, aucun son importé : tout est dessiné par le code.

| Page | Rôle |
|---|---|
| `index.html` | **La ville et les jeux.** |
| `dossier.html` | Le même contenu à lire, pour qui ne veut pas jouer. |
| `cv.html` | Le CV sur deux pages A4, imprimable en PDF. |

## La ville

On pilote une sonde, un petit programme de diagnostic, au ras des rues. Le sud est 2018, le
nord est aujourd'hui, et une tour ferme l'avenue : c'est le poste visé. Devant chaque portail,
le fait de CV s'affiche avant même d'entrer, pour qui ne jouera pas. Entrer lance le jeu du
quartier. Chaque jeu gagné donne une clé.

| Quartier | Étape | Verbe | Le jeu |
|---|---|---|---|
| 1 | Medline, 2018-2020 | Traduire | Le helpdesk : diagnostiquer au terminal, puis expliquer avec les mots de l'utilisateur |
| 2 | Thales, 2020-2021 | Instrumenter | La salle de stockage : poser des sondes, lire les courbes, prédire la saturation |
| 3 | Albys, 2021-2023 | Segmenter | Le réseau : confiner un intrus par cloisons et règles sans casser les flux légitimes |
| 4 | Indépendant, 2023-2025 | Attester | L'usurpation : lire SPF, DKIM et DMARC, trancher, puis assembler l'automatisation |
| 5 | Digital Realty, depuis 2025 | Coordonner | La supervision : quatre incidents, cinq sites, des délais, un faux positif |
| 6 | La tour — scénario | Diagnostiquer | 05:52, une IA hospitalière décroche : descendre les couches jusqu'à la cause physique |

Le sixième est une **mise en situation**, étiquetée comme telle partout : il ne revendique
aucune expérience.

## Honnêteté par construction

Les faits du parcours vivent dans un seul fichier, `src/cv.js`. Un jeu ne contient aucun
fait : il cite une clé, et le validateur du contrat refuse une clé inconnue. Le jeu ne
*peut pas* inventer une ligne de CV.

## Commandes

Flèches ou ZQSD pour tourner et avancer · Maj pour accélérer · Espace pour entrer dans un
quartier · Maj+D pour le dossier. Manette et tactile (joystick flottant, un bouton) pris en
charge.

## Structure

```
index.html            la page, l'import map Three.js, le HUD
src/main.js           rendu, bloom, portails, passage ville -> jeu -> ville, minicarte
src/ville.js          la ville : blocs, arêtes néon, enseignes, rails, véhicules, portails
src/enseignes.js      textures d'enseignes dessinées sur canvas
src/sonde.js          la sonde, ses commandes, la caméra
src/entrees.js        clavier, manette, joystick tactile
src/palette.js        les couleurs, et la règle qui réserve le rouge à l'anomalie
src/cv.js             les faits, gelés
src/jeux/_contrat.js  le contrat de jeu + les aides (cadre, terminal, colonne)
src/jeux/index.js     le registre, une ligne par jeu
src/jeux/<id>.js      un fichier par jeu
tools/recette.html    la recette : chaque jeu se monte, se résout seul, se démonte
```

Seule dépendance : Three.js, chargé par CDN via l'import map. Aucune étape de compilation.

## Développer

```bash
python -m http.server 8931
```

Recette des jeux, dans un navigateur ou en headless :

```
tools/recette.html            tous les jeux du registre
tools/recette.html?jeu=albys  un seul
tools/recette.html?fichier=../src/jeux/x.js&apercu=1   monter sans résoudre, pour une capture
```

Chaque jeu doit exposer `resoudre()`, qui joue une solution correcte sans humain et aboutit à
`api.fini` en moins de vingt secondes. Un jeu qui ne sait pas se résoudre ne sait pas prouver
qu'il est gagnable.

En headless, `index.html?capture=2` rend deux images sans bloom et s'arrête ;
`?capture=2,x,z,cap` place la sonde ; `?panneau=<id>` ouvre un relevé ; `?jeu=<id>` lance un jeu.

## Contraintes tenues

Site statique GitHub Pages (`.nojekyll` requis : Jekyll ignore les fichiers en `_`). Le contenu
reste lisible sans JavaScript via le dossier. Thème sombre, focus clavier visible, repli tactile.
