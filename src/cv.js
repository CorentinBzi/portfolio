// SOURCE UNIQUE ET GELÉE des faits du parcours.
// Les niveaux ne contiennent aucun fait : ils citent une clé. Le validateur
// refuse de démarrer sur une clé inconnue, donc le jeu ne peut pas inventer
// une ligne de CV. C'est une garantie obtenue par construction.

export const FAITS = Object.freeze({
  medline: {
    employeur: 'MEDLINE',
    periode: '2018 – 2020',
    poste: 'Technicien support informatique, alternance',
    texte: "Dépannage matériel, réseau et logiciel auprès des utilisateurs de l'entreprise. " +
           "Deux ans à expliquer la technique à des gens dont ce n'est pas le métier.",
    pourLePoste: "Traduire dans les deux sens entre un symptôme décrit par un utilisateur " +
                 "et une cause technique.",
  },
  thales: {
    employeur: 'THALES',
    periode: '2020 – 2021',
    poste: 'Recherche et développement logiciel, alternance',
    texte: "Développement en Python d'une solution centralisée de suivi des ressources de " +
           "stockage, et d'un tableau de bord interactif avec suivi graphique dynamique.",
    pourLePoste: "Instrumenter un système pour rendre visible ce qui va saturer, " +
                 "avant que ça sature.",
  },
  albys: {
    employeur: 'ALBYS',
    periode: '2021 – 2023',
    poste: 'Administrateur systèmes et réseaux, alternance',
    texte: "Refonte complète de l'architecture réseau sur Ubiquiti : VLAN, VPN, pare-feu. " +
           "Démarche anti-usurpation de domaine avec simulateur d'attaque et tableau de bord " +
           "DMARC. Campagnes OpenVAS, simulations d'hameçonnage, audit du déploiement EDR. " +
           "En parallèle : Master ingénierie informatique / MSc Cybersécurité, ESIEE-IT, " +
           "programme labellisé ANSSI SecNumEdu.",
    pourLePoste: "Arbitrer entre connectivité et confinement sur une architecture réelle, " +
                 "et l'écrire.",
  },
  independant: {
    employeur: 'INDÉPENDANT',
    periode: '2023 – 2025',
    poste: "Développeur d'outils de sécurité",
    texte: "Outil on-premise de sécurité de domaine et de supervision DMARC : analyse des " +
           "rapports d'authentification, alertes automatiques contre l'usurpation. " +
           "Modélisation de risques pour préparer un passage en SaaS. Script Python " +
           "d'automatisation de veille sur la menace bâti sur l'API ChatGPT.",
    pourLePoste: "Passer du geste répété à l'outil qui le remplace, et en assumer " +
                 "les effets de bord.",
  },
  digitalrealty: {
    employeur: 'DIGITAL REALTY',
    periode: 'février 2025 → aujourd’hui',
    poste: 'Security Technical Coordinator',
    texte: "Contrôle d'accès et vidéosurveillance sur cinq data centers, pilotage de " +
           "prestataires, tenue des engagements de service contractuels, coordination " +
           "d'incidents, analyse de journaux d'exploitation, remontée des risques de " +
           "conformité. Premier du challenge interne Cybersecurity Month 2025.",
    pourLePoste: "Arbitrer, déléguer avec une consigne exécutable, et savoir ne pas réagir.",
  },
  scenario: {
    employeur: 'SCÉNARIO',
    periode: 'mise en situation',
    poste: 'Forward Deployed Engineer — le poste visé',
    texte: "Ce niveau est une mise en situation, pas une expérience professionnelle. " +
           "Aucun fait de parcours n'y est revendiqué. Il montre ce que je ferais " +
           "le premier jour chez vous.",
    pourLePoste: "Diagnostiquer de bout en bout, puis l'expliquer à quelqu'un " +
                 "dont ce n'est pas le métier.",
  },
});

export const CLES = Object.keys(FAITS);

export const PROFIL = Object.freeze({
  nom: 'Corentin Bezille',
  visee: 'Forward Deployed Engineer',
  lieu: 'Buc (78) · full remote recherché',
  email: 'corentin.bezille1756@gmail.com',
  github: 'https://github.com/CorentinBzi',
  tryhackme: 'https://tryhackme.com/p/CocoBlues',
});

export const FORMATION = Object.freeze([
  { titre: 'Master ingénierie informatique — MSc Cybersécurité', ou: 'ESIEE-IT · programme labellisé ANSSI SecNumEdu', quand: '2021 – 2023' },
  { titre: 'Bachelor informatique, option cybersécurité', ou: 'ESIEE-IT', quand: '2020 – 2021' },
  { titre: 'BTS SIO option SISR', ou: 'ESIEE-IT', quand: '2018 – 2020' },
]);

export const COMPETENCES = Object.freeze([
  { groupe: 'Diagnostic & exploitation', items: "Analyse de journaux, isolement de cause, coordination d'incident, engagements de service, escalade technique." },
  { groupe: 'Développement', items: 'Python, Bash, PowerShell, Go, C, C#, SQL/MariaDB, PHP. Git.' },
  { groupe: 'IA appliquée', items: 'API OpenAI, Gemini, Mistral. Ollama en local. IA agentique. Intégration de modèles dans des chaînes automatisées.' },
  { groupe: 'Systèmes & réseaux', items: 'Linux, Windows Server, Active Directory, Cisco, Ubiquiti, pare-feu, VPN, VLAN.' },
  { groupe: 'Sécurité', items: 'ISO 27001, appréciation des risques, PCA/PRA, OWASP Top 10, Burp Suite, investigation numérique.' },
  { groupe: 'Langues', items: 'Français natif. Anglais professionnel, TOEIC 875.' },
]);

export const A_APPRENDRE =
  "Je n'ai pas encore servi de modèle en production sur une stack GPU, ni travaillé en " +
  "établissement de santé. Mes trois premiers mois iraient au service de modèles, à " +
  "l'observabilité applicative et au cadre d'hébergement des données de santé.";
