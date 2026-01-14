🚀 PS Report (POC)

PS Report est un outil de suivi de performance web (Web Performance Monitoring) conçu pour auditer et organiser des URLs.

Actuellement au stade de Proof of Concept (POC), cet outil fonctionne entièrement côté client (dans le navigateur) et utilise l'API Google PageSpeed Insights (Lighthouse) pour récupérer les scores Core Web Vitals.



✨ Fonctionnalités

Tableau de Bord KPI : Vue d'ensemble des URLs analysées, des alertes critiques (< 50/100) et des améliorations possibles (50-90/100).

Organisation par Dossiers : Créez, renommez et supprimez des dossiers pour classer vos sites (ex: "Clients", "Concurrents", "Landing Pages").

Audits Lighthouse :

Récupération des 4 scores majeurs : Performance, Accessibilité, Best Practices, SEO.

Affichage du TTFB (Time To First Byte) pour juger la rapidité du serveur.

Détail des recommandations techniques (opportunités d'optimisation).

Gestion UX : Renommage des URLs pour plus de clarté, indicateurs visuels (code couleur).

Persistance des données : Sauvegarde automatique dans le localStorage du navigateur (pas de base de données requise pour ce POC).



🛠️ Stack Technique

Ce projet a été conçu pour être ultra-léger et portable (initialement pensé pour un module HubSpot CMS).

Langage : Vanilla JavaScript (ES6+).

UI Framework : Materialize CSS (via CDN).

Icônes : Google Material Icons.

API : Google PageSpeed Insights API v5.

Stockage : Browser LocalStorage.



🚀 Installation & Utilisation

Puisque c'est une application "Single File" (SPA) sans backend pour le moment :

Clonez ce dépôt :

git clone [https://github.com/votre-username/ps-report-poc.git](https://github.com/votre-username/ps-report-poc.git)


Ouvrez simplement le fichier ps_report_poc.html dans votre navigateur (Chrome, Firefox, Edge).

Important : Pour lancer des audits, vous devez configurer une clé API Google.

Configuration de la Clé API

Obtenez une clé gratuite ici : Google PageSpeed Insights API.

Dans l'interface PS Report, cliquez sur le bouton "API Key" (roue dentée ou bouton en bas de la sidebar).

Collez votre clé. Elle sera stockée localement dans votre navigateur.



🔮 Roadmap (Vers le SaaS)

Ce projet est destiné à évoluer vers une véritable application SaaS. Les prochaines étapes techniques envisagées sont :

[ ] Migration Stack : Passage vers Next.js (React) + TypeScript.

[ ] Backend : Utilisation de Supabase (PostgreSQL) pour remplacer le LocalStorage.

[ ] Sécurité : Déplacer les appels API Lighthouse côté serveur (Serverless Functions) pour protéger la clé API.

[ ] Automatisation : Cron Jobs pour lancer des audits automatiques chaque nuit.

[ ] Authentification : Gestion multi-utilisateurs.

