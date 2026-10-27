# Roadmap StaticDesk

> **Pitch** : des formulaires et des interactions embarquables pour les sites statiques
> (GitHub Pages, GitLab Pages, MkDocs, Docusaurus, Jekyll, Hugo, VitePress, Astro…).
> Disqus + Crisp/Intercom, **sans le live chat** : formulaire de contact, commentaires,
> likes, avis, boîte mail partagée, réponses automatiques et analytics simples.
> Open source, auto-hébergeable gratuitement, ou en SaaS payant.

**Stack** : Nuxt 4 · Nuxt UI 4 · Vercel · Supabase · Resend · Stripe

Légende : 🧑 = action manuelle (compte, configuration, décision) · 💻 = développement

---

## Phase 0 : nom, marque et décisions structurantes

### Nom et domaine
- [x] Vérifier `formdesk.app` → **pris** (ainsi que `formdesk.com`, `.io` et `.so`)
- [x] Écarter « FormDesk » : il existe déjà un produit *Formdesk* (constructeur de formulaires en ligne, formdesk.com), dans la même catégorie, d'où un risque de confusion et de litige de marque
- [x] Shortlist des noms disponibles (vérifiés le 27/10/2026) :
  - **StaticDesk** : `staticdesk.app` ✅, `staticdesk.dev` ✅ (`staticdesk.com` ❌). **Recommandé.**
  - SiteBell : `sitebell.app` ✅
  - KnockBox : `knockbox.app` ✅
  - FormNook : `formnook.app` ✅
  - StaticBox : `staticbox.app` ✅, `staticbox.dev` ✅
- [x] 🧑 Valider le nom définitif → **StaticDesk**
- [ ] 🧑 Rechercher des marques déposées sur le nom retenu (INPI, EUIPO, USPTO)
- [ ] 🧑 Vérifier que les handles sont libres : GitHub org, npm (`@staticdesk/*`), X/Twitter, Bluesky, Mastodon, LinkedIn, Product Hunt, Discord
- [ ] 🧑 Enregistrer `staticdesk.app` via le domaine offert avec Vercel Pro (encore disponible au 27/10/2026)
- [ ] 🧑 (Optionnel) Acheter `staticdesk.dev` pour la doc et la démo, ou en redirection
- [ ] 🧑 Renommer le dépôt GitHub `formdesk` en `staticdesk` (GitHub redirige l'ancienne URL)
- [ ] 🧑 Déposer la marque (optionnel au départ, à faire avant le lancement public)

### Décisions produit et techniques
- [ ] 🧑 Licence : **AGPL-3.0** (recommandée en open-core SaaS, car elle empêche un concurrent de revendre le service sans publier ses modifications) ou MIT/Apache-2.0 (adoption plus large, moins de protection)
- [ ] 🧑 Modèle open source : tout le code dans le dépôt public, les fonctions SaaS (billing, quotas) activées par variables d'environnement, sans dossier `ee/` fermé
- [ ] 🧑 Stratégie d'auto-hébergement : Supabase self-hosted (Docker officiel) **ou** Postgres + auth simple. Recommandation : supporter Supabase self-hosted en v1, sans couplage fort (accès BDD via une couche repository)
- [ ] 🧑 Email en auto-hébergement : Resend **ou** SMTP générique (adaptateur commun)
- [ ] 🧑 Grille tarifaire initiale (proposition) :
  - **Self-hosted** : gratuit, illimité
  - **Free (SaaS)** : 1 site, 100 soumissions/mois, 500 commentaires/mois, branding « Powered by »
  - **Pro** (~9 €/mois) : 5 sites, soumissions illimitées, réponses auto, suppression du branding, 3 membres
  - **Team** (~29 €/mois) : sites illimités, membres illimités, domaine d'envoi personnalisé, export, support prioritaire
- [ ] 🧑 Rédiger la définition du MVP (périmètre de la v0.1 : voir phase 10)

---

## Phase 1 : comptes et configuration (manuel)

### Entreprise et légal
- [ ] 🧑 Choisir une structure juridique (micro-entreprise / SASU) pour encaisser via Stripe
- [ ] 🧑 Ouvrir un compte bancaire professionnel
- [ ] 🧑 Créer une adresse de contact (`hello@`, `support@`, `security@`, `abuse@`)

### Code et outillage
- [ ] 🧑 Créer l'organisation GitHub `staticdesk`, puis y transférer ou créer le dépôt
- [ ] 🧑 Activer GitHub Discussions, Issues (avec templates), Dependabot et le secret scanning
- [ ] 🧑 Réserver le scope npm `@staticdesk`
- [ ] 🧑 Créer un compte Docker Hub ou utiliser GHCR pour les images self-hosted

### Vercel
- [ ] 🧑 Créer le projet Vercel lié au dépôt GitHub
- [ ] 🧑 Configurer les environnements Production / Preview / Development
- [ ] 🧑 Ajouter les domaines : `staticdesk.app` (app + landing), `cdn.staticdesk.app` ou `/widget.js`, `docs.staticdesk.dev`
- [ ] 🧑 Activer Vercel Analytics et Speed Insights (pour la landing)

### Supabase
- [ ] 🧑 Créer l'organisation et deux projets : `staticdesk-prod` et `staticdesk-staging` (région EU pour le RGPD)
- [ ] 🧑 Configurer Auth : magic link, GitHub OAuth et Google OAuth, URL de redirection Vercel
- [ ] 🧑 Créer une OAuth App GitHub et des identifiants Google Cloud pour l'auth
- [ ] 🧑 Activer les sauvegardes (PITR en prod quand le volume le justifie)
- [ ] 🧑 Personnaliser les emails Auth (ou les envoyer via le SMTP de Resend)

### Resend
- [ ] 🧑 Créer le compte et vérifier le domaine d'envoi (`mail.staticdesk.app`) : SPF, DKIM, DMARC
- [ ] 🧑 Configurer la réception (inbound) pour la boîte partagée : `reply+<thread>@in.staticdesk.app`, MX et webhook
- [ ] 🧑 Créer les clés API (prod et staging) et le webhook des événements (bounce, complaint, delivered)
- [ ] 🧑 Brancher Supabase Auth sur le SMTP de Resend

### Stripe
- [ ] 🧑 Créer et activer le compte (KYC, compte bancaire)
- [ ] 🧑 Créer les produits et prix (Pro et Team, mensuel et annuel)
- [ ] 🧑 Configurer le Customer Portal (changement de plan, annulation, factures)
- [ ] 🧑 Activer Stripe Tax (TVA UE) et configurer les factures
- [ ] 🧑 Créer les webhooks (prod et test) et récupérer les secrets

### Observabilité
- [ ] 🧑 Créer un compte Sentry (ou équivalent) pour l'app et le widget
- [ ] 🧑 Mettre en place un uptime monitoring et une status page (Better Stack, Instatus ou Upptime sur GitHub Pages)

### Variables d'environnement
- [ ] 🧑 Renseigner dans Vercel : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SENTRY_DSN`, `APP_URL`, `STATICDESK_EDITION=saas`

---

## Phase 2 : fondations du projet

### Monorepo
- [ ] 💻 Initialiser un monorepo pnpm + Turborepo :
  - `apps/web` : Nuxt 4 (landing, dashboard, API)
  - `apps/docs` : documentation (Nuxt Content / Docus, ou VitePress)
  - `packages/widget` : SDK navigateur en vanilla TS, Web Components et Shadow DOM, bundlé avec Vite en lib
  - `packages/core` : types, schémas Zod et client API partagés
  - `packages/integrations/*` : plugins pour les frameworks (phase 9)
- [ ] 💻 Scaffolder Nuxt 4 + Nuxt UI 4 (`main.css` avec `@import "tailwindcss"; @import "@nuxt/ui";`)
- [ ] 💻 Activer TypeScript strict, ESLint (`@nuxt/eslint`) et Prettier, ou passer par ESLint stylistic
- [ ] 💻 Tests : Vitest (unitaires), `@nuxt/test-utils`, Playwright (e2e et widget sur une page statique de test)
- [ ] 💻 CI GitHub Actions : lint, typecheck, tests, build, taille du bundle widget (budget **< 15 kB gzip** pour le loader)
- [ ] 💻 Conventional commits, Changesets pour versionner les paquets npm, Renovate ou Dependabot
- [ ] 💻 Fichiers communautaires : `README`, `LICENSE`, `CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY.md`, templates d'issues et de PR
- [ ] 💻 Rédiger `AGENTS.md` / `CLAUDE.md` à jour (stack, commandes, conventions)

### Supabase local
- [ ] 💻 Utiliser la CLI Supabase (`supabase init`, `supabase start`), avec les migrations versionnées dans `supabase/migrations`
- [ ] 💻 Générer les types TS (`supabase gen types`) dans la CI
- [ ] 💻 Écrire un seed de développement (un workspace, un site, des formulaires et des messages factices)
- [ ] 💻 Mettre en place `@nuxtjs/supabase` ou un client maison côté serveur (clé service-role **uniquement** côté serveur)

### Modèle de données (v1)
- [ ] 💻 `workspaces` (plan, `stripe_customer_id`, quotas)
- [ ] 💻 `members` (user ↔ workspace, rôle : owner / admin / member)
- [ ] 💻 `sites` (domaine(s) autorisé(s), clé publique, réglages, thème)
- [ ] 💻 `widgets` (type : contact / comments / reactions / reviews ; configuration JSON)
- [ ] 💻 `threads` et `messages` (boîte partagée : statut, assignation, labels, direction in/out)
- [ ] 💻 `contacts` (visiteurs identifiés par email)
- [ ] 💻 `comments` (page_url / page_id, parent_id, statut de modération, auteur)
- [ ] 💻 `reactions` (likes, emoji, upvotes par page)
- [ ] 💻 `reviews` (note 1 à 5, texte, statut)
- [ ] 💻 `auto_replies` (règles, modèles, délais)
- [ ] 💻 `events` (pages vues du widget, ouvertures, envois, pour les analytics)
- [ ] 💻 `subscriptions` (miroir de Stripe)
- [ ] 💻 **Row Level Security** sur toutes les tables, avec des tests de policies (pgTAP ou tests d'intégration)

### Auth et onboarding
- [ ] 💻 Connexion par magic link, GitHub et Google
- [ ] 💻 Création du workspace au premier login
- [ ] 💻 Invitation de membres par email (Resend)
- [ ] 💻 Onboarding : créer un site, choisir un widget, copier le snippet, vérifier l'installation (« premier événement reçu »)

---

## Phase 3 : noyau du widget et API publique

- [ ] 💻 Loader unique `widget.js` : `<script src=".../widget.js" data-site="pk_xxx" defer></script>`
- [ ] 💻 Web Components : `<staticdesk-contact>`, `<staticdesk-comments>`, `<staticdesk-reactions>`, `<staticdesk-reviews>`, ainsi qu'un mode bouton flottant
- [ ] 💻 Isolation par Shadow DOM, thème via CSS variables, dark mode auto (`prefers-color-scheme`), personnalisation des couleurs, de la police et des textes
- [ ] 💻 i18n du widget (FR et EN au départ, détection de `navigator.language`, surcharge possible)
- [ ] 💻 Accessibilité : focus trap, ARIA, navigation clavier, contrastes (WCAG AA)
- [ ] 💻 Compatibilité SPA : détection des changements de route (Docusaurus, VitePress), identifiant de page canonique configurable
- [ ] 💻 API publique `/api/v1/public/*` : CORS limité aux domaines déclarés du site, clé publique par site
- [ ] 💻 Anti-spam : honeypot, délai minimum de remplissage, rate limiting par IP et par site (Upstash ou table Postgres), Cloudflare Turnstile en option
- [ ] 💻 Respect de la vie privée : aucun cookie tiers par défaut et IP hachée, ce qui permet de se passer de bannière cookies
- [ ] 💻 Publication sur npm (`@staticdesk/widget`) et sur le CDN (jsDelivr/unpkg et `staticdesk.app/widget.js` versionné)

---

## Phase 4 : formulaire de contact

- [ ] 💻 Champs par défaut (nom, email, message) avec des champs personnalisés (texte, select, checkbox)
- [ ] 💻 Validation client et serveur (schéma Zod partagé)
- [ ] 💻 Pièces jointes (Supabase Storage, taille limitée, antivirus en option)
- [ ] 💻 Messages de succès et d'erreur personnalisables, redirection optionnelle
- [ ] 💻 Mode « formulaire HTML pur » : `<form action="https://staticdesk.app/f/xxx" method="POST">`, utilisable sans JS
- [ ] 💻 Notification email à l'équipe pour chaque nouveau message (Resend)
- [ ] 💻 Webhooks sortants (Slack, Discord, URL personnalisée)

---

## Phase 5 : boîte mail partagée

- [ ] 💻 Vue inbox : liste des conversations, filtres (statut, site, assigné, label), recherche plein texte (Postgres FTS)
- [ ] 💻 Vue conversation : historique, réponse depuis le dashboard, envoi via Resend avec l'adresse `reply+<id>@`
- [ ] 💻 Réception des réponses du visiteur via le webhook inbound Resend, rattachées au bon thread
- [ ] 💻 Statuts (ouvert / en attente / résolu), assignation, labels, notes internes
- [ ] 💻 Temps réel (Supabase Realtime) : nouveaux messages et indicateur « X est en train de répondre »
- [ ] 💻 Réponses enregistrées (canned responses)
- [ ] 💻 Notifications : email, digest quotidien, préférences par membre
- [ ] 💻 Domaine d'envoi personnalisé par workspace (plan Team) : vérification DNS via l'API Resend
- [ ] 💻 Gestion des bounces et des plaintes (webhook Resend, puis suppression du contact)

---

## Phase 6 : réponses automatiques

- [ ] 💻 Accusé de réception automatique au visiteur (modèle éditable, variables `{{name}}`, `{{site}}`)
- [ ] 💻 Message d'absence et horaires d'ouverture
- [ ] 💻 Règles simples : par site, par formulaire, par mot-clé ou par champ, avec auto-label et auto-assignation
- [ ] 💻 Relance automatique si aucune réponse au bout de X heures (rappel interne)
- [ ] 💻 Éditeur d'emails (Markdown ou React Email / Vue Email) avec prévisualisation
- [ ] 💻 Plus tard : suggestion de réponse générée par IA à partir de la doc du site (option)

---

## Phase 7 : commentaires, likes et avis

### Commentaires
- [ ] 💻 Fil par page, réponses imbriquées (2 niveaux), tri, pagination
- [ ] 💻 Identité : anonyme (nom + email), GitHub OAuth, ou lien magique par email
- [ ] 💻 Rendu Markdown sécurisé (sanitization), aperçu
- [ ] 💻 Modération : pré-modération ou post-modération, liste de mots interdits, file de modération dans le dashboard, signalement
- [ ] 💻 Notifications de réponse par email au commentateur, avec désabonnement
- [ ] 💻 Import depuis Disqus (XML) et Giscus/Utterances (GitHub Discussions) pour faciliter la migration
- [ ] 💻 Rendu SEO-friendly en option : endpoint HTML statique ou JSON à inclure au build (plugins)

### Réactions et likes
- [ ] 💻 « Cette page vous a-t-elle aidé ? 👍 / 👎 » avec un commentaire optionnel (feedback de documentation)
- [ ] 💻 Réactions emoji par page, compteur public
- [ ] 💻 Déduplication sans cookie (hash IP + UA + page, salé et rotatif)

### Avis
- [ ] 💻 Note de 1 à 5 avec texte, modération avant publication
- [ ] 💻 Affichage public avec données structurées `schema.org/Review` et `AggregateRating`
- [ ] 💻 Widget « mur d'avis » / testimonials

---

## Phase 8 : analytics simples

- [ ] 💻 Collecte légère depuis le widget : vues, ouvertures, envois, taux de conversion
- [ ] 💻 Dashboard : messages par jour, temps de première réponse, temps de résolution, volume par site et par formulaire
- [ ] 💻 Pages les plus commentées et likées, score « utile / pas utile » par page de doc
- [ ] 💻 Export CSV, rétention configurable
- [ ] 💻 Agrégats journaliers (vue matérialisée ou job cron via Vercel Cron)

---

## Phase 9 : intégrations frameworks

- [ ] 💻 Snippet universel HTML (copier-coller), qui suffit pour GitHub Pages, GitLab Pages, Netlify et Cloudflare Pages
- [ ] 💻 **Docusaurus** : `@staticdesk/docusaurus-plugin` (swizzle `DocItem/Footer` et bouton flottant)
- [ ] 💻 **MkDocs / Material for MkDocs** : paquet PyPI `mkdocs-staticdesk` (override de template)
- [ ] 💻 **VitePress** : composant ou plugin de thème
- [ ] 💻 **Astro / Starlight** : intégration `@staticdesk/astro`
- [ ] 💻 **Jekyll** : gem `jekyll-staticdesk` et include `{% include staticdesk.html %}`
- [ ] 💻 **Hugo** : module ou partial Hugo
- [ ] 💻 **Eleventy** : plugin et shortcode
- [ ] 💻 **Nuxt / Nuxt Content** : module `@staticdesk/nuxt`
- [ ] 💻 **Next.js / React** : composants `@staticdesk/react`
- [ ] 💻 **Vue** : composants `@staticdesk/vue`
- [ ] 💻 Plus tard : Sphinx, GitBook (via script), Ghost, WordPress
- [ ] 💻 Un site d'exemple par intégration (dossier `examples/`), testé en CI avec Playwright

---

## Phase 10 : MVP (v0.1, bêta privée)

> Objectif : livrer vite un premier usage complet de bout en bout.

- [ ] 💻 Auth, workspace et sites (phase 2)
- [ ] 💻 Widget contact et bouton flottant (phases 3 et 4)
- [ ] 💻 Inbox partagée minimale : liste, lecture, réponse par email, statut (phase 5)
- [ ] 💻 Accusé de réception automatique (phase 6)
- [ ] 💻 Snippet HTML et plugin Docusaurus (phase 9)
- [ ] 💻 Self-host via `docker compose` (phase 12)
- [ ] 🧑 Dogfooding : installer StaticDesk sur sa propre doc et sa landing
- [ ] 🧑 Recruter 10 à 20 bêta-testeurs (mainteneurs open source, rédacteurs techniques)

## v0.2 : commentaires et réactions
- [ ] 💻 Phase 7 (commentaires, likes, feedback de doc)
- [ ] 💻 Plugins MkDocs, VitePress et Astro/Starlight

## v0.3 : monétisation
- [ ] 💻 Phase 11 (Stripe)
- [ ] 💻 Analytics (phase 8)

## v1.0 : lancement public
- [ ] 💻 Avis, règles d'auto-réponse, domaine d'envoi personnalisé, toutes les intégrations de la phase 9
- [ ] 🧑 Lancement (phase 16)

---

## Phase 11 : facturation Stripe (édition SaaS)

- [ ] 💻 Stripe Checkout pour souscrire et Customer Portal pour gérer l'abonnement
- [ ] 💻 Webhooks : `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`, avec idempotence
- [ ] 💻 Synchronisation de la table `subscriptions`, droits par plan (feature flags)
- [ ] 💻 Quotas : compteurs mensuels, alertes à 80 % et à 100 %, dégradation douce (pas de perte de messages : mise en file plutôt que rejet)
- [ ] 💻 Essai gratuit de 14 jours du plan Pro
- [ ] 💻 Code de facturation désactivé quand `STATICDESK_EDITION=selfhost`
- [ ] 💻 Tests avec Stripe CLI (`stripe listen`) et horloges de test

---

## Phase 12 : auto-hébergement

- [ ] 💻 `Dockerfile` (Nuxt en preset `node-server`) et `docker-compose.yml` (app + Supabase self-hosted, ou Postgres)
- [ ] 💻 Adaptateur email : Resend ou SMTP générique
- [ ] 💻 Migrations appliquées au démarrage, création d'un compte admin au premier lancement
- [ ] 💻 Images publiées sur GHCR à chaque release (multi-arch amd64/arm64)
- [ ] 💻 Boutons « Deploy » : Vercel (avec intégration Supabase), Railway, Render, Coolify
- [ ] 💻 Documentation : prérequis, variables, sauvegardes, mises à jour, reverse proxy
- [ ] 💻 Télémétrie anonyme **opt-in** uniquement (nombre d'instances), désactivable

---

## Phase 13 : sécurité, conformité et RGPD

- [ ] 💻 Revue des policies RLS, tests d'accès inter-workspaces
- [ ] 💻 Headers de sécurité (CSP du dashboard, HSTS), validation de l'origine sur l'API publique
- [ ] 💻 Sanitization de tout contenu utilisateur (XSS dans les commentaires et dans l'inbox)
- [ ] 💻 Chiffrement des secrets (clés de webhook, tokens), rotation des clés publiques de site
- [ ] 💻 Export et suppression des données d'un visiteur (droit d'accès et à l'oubli), suppression d'un workspace
- [ ] 💻 Journal d'audit (actions admin)
- [ ] 🧑 Rédiger : CGU, politique de confidentialité, DPA (accord de traitement), liste des sous-traitants (Vercel, Supabase, Resend, Stripe), politique cookies
- [ ] 🧑 Fournir aux clients un modèle de mention RGPD à ajouter sous leurs formulaires
- [ ] 🧑 Publier `SECURITY.md` et un programme de divulgation responsable
- [ ] 🧑 Lancer un audit de dépendances régulier (Dependabot, `npm audit`), voire un pentest léger avant la v1

---

## Phase 14 : documentation

- [ ] 💻 Site de doc (`docs.staticdesk.dev`) avec **le widget StaticDesk intégré** (dogfooding : feedback « utile ? » et contact)
- [ ] 🧑 Quickstart en 2 minutes (snippet HTML)
- [ ] 🧑 Un guide par framework (Docusaurus, MkDocs, Jekyll, Hugo, VitePress, Astro, GitHub Pages, GitLab Pages)
- [ ] 🧑 Référence de configuration du widget (attributs, CSS variables, événements JS)
- [ ] 🧑 Référence de l'API REST et des webhooks (OpenAPI)
- [ ] 🧑 Guide d'auto-hébergement
- [ ] 🧑 Guides de migration : depuis Disqus, Giscus, Formspree, Netlify Forms
- [ ] 🧑 Changelog public

---

## Phase 15 : SEO

### Technique
- [ ] 💻 Landing en SSR/prérendu (Nuxt `routeRules` avec `prerender`), Core Web Vitals au vert
- [ ] 💻 `@nuxtjs/seo` : sitemap, robots, meta, Open Graph et images OG générées, données structurées (`SoftwareApplication`, `FAQPage`, `Organization`)
- [ ] 💻 URLs canoniques, `hreflang` FR/EN si la landing est bilingue
- [ ] 🧑 Inscrire le site sur Google Search Console et Bing Webmaster Tools, soumettre le sitemap

### Contenu (mots-clés cibles)
- [ ] 🧑 Recherche de mots-clés : « contact form github pages », « comments for static site », « disqus alternative », « docusaurus comments », « mkdocs feedback widget », « jekyll contact form », « formspree alternative »
- [ ] 🧑 Pages d'intégration (une par framework) : `/integrations/docusaurus`, etc.
- [ ] 🧑 Pages comparatives : StaticDesk vs Disqus, Giscus, Utterances, Formspree, Netlify Forms, Crisp, Intercom, Commento, Cusdis, Remark42
- [ ] 🧑 Pages « alternative à » : `/alternatives/disqus`, `/alternatives/formspree`
- [ ] 🧑 Tutoriels de blog : « Ajouter un formulaire de contact à GitHub Pages sans backend », « Ajouter des commentaires à Docusaurus », « Collecter du feedback sur sa documentation MkDocs »
- [ ] 🧑 Outils gratuits pour attirer du trafic : générateur de snippet de formulaire HTML, testeur de délivrabilité, etc.

### Netlinking
- [ ] 🧑 Lien « Powered by StaticDesk » dans le widget du plan gratuit
- [ ] 🧑 Soumission dans les listes « awesome » : awesome-static-website-services, awesome-docusaurus, awesome-mkdocs, awesome-jekyll, awesome-selfhosted
- [ ] 🧑 Inscription dans les annuaires : AlternativeTo, SaaSHub, Product Hunt, OpenAlternative, BetaList, There's An AI For That (si une fonction IA existe)
- [ ] 🧑 Pages de plugins officielles : Docusaurus community plugins, MkDocs catalog, Astro integrations, Jekyll plugins, Hugo themes/modules

---

## Phase 16 : marketing et lancement

### Pré-lancement
- [ ] 💻 Landing page : hero, démo interactive du widget en direct, fonctionnalités, intégrations, tarifs, FAQ, comparatif, CTA « Start free » et « Self-host »
- [ ] 💻 Liste d'attente (Resend Audiences) avec email de confirmation
- [ ] 🧑 Identité visuelle : logo, palette, captures, vidéo démo de 60 s
- [ ] 🧑 Construire en public : posts réguliers sur X, Bluesky, Mastodon et LinkedIn (avancement, chiffres, choix techniques)
- [ ] 🧑 Créer un Discord ou utiliser GitHub Discussions comme communauté
- [ ] 🧑 Contacter directement des mainteneurs de projets open source avec une doc Docusaurus ou MkDocs (offre gratuite pour l'open source)

### Lancement
- [ ] 🧑 Release v1.0 sur GitHub avec notes de version soignées
- [ ] 🧑 Show HN (Hacker News)
- [ ] 🧑 Product Hunt (préparer le visuel, la vidéo, le premier commentaire et prévenir la communauté)
- [ ] 🧑 Reddit : r/selfhosted, r/webdev, r/opensource, r/jekyll, r/docusaurus, r/SideProject
- [ ] 🧑 dev.to, Hashnode, Medium : article « Comment j'ai construit… »
- [ ] 🧑 Newsletters : Console.dev, JavaScript Weekly, Vue.js Developers, Nuxt newsletter, selfh.st
- [ ] 🧑 Communautés FR : Journal du Hacker, LinuxFr, Discord/Slack francophones dev

### Croissance
- [ ] 🧑 Plan « Open Source » gratuit (Pro offert aux projets OSS), levier d'adoption et de backlinks
- [ ] 🧑 Programme d'affiliation (Stripe ou Rewardful)
- [ ] 🧑 Études de cas clients, logos sur la landing
- [ ] 🧑 GitHub Sponsors et Open Collective pour l'édition self-hosted
- [ ] 🧑 Emails de cycle de vie (Resend) : bienvenue, aide à l'installation si aucun événement reçu après 48 h, fin d'essai, dépassement de quota
- [ ] 🧑 Suivi des KPIs : inscriptions, sites actifs (au moins 1 événement par semaine), conversion Free → Pro, churn, MRR, étoiles GitHub

---

## Phase 17 : après le lancement

- [ ] 💻 Roadmap publique avec votes (dogfooding : widget de réactions StaticDesk)
- [ ] 💻 API publique et clés API pour les intégrations tierces
- [ ] 💻 Intégrations : Slack (réponse depuis Slack), Discord, Zapier, Make, n8n
- [ ] 💻 Base de connaissances / FAQ intégrée au widget (recherche dans la doc avant envoi)
- [ ] 💻 Sondages et NPS embarquables
- [ ] 💻 Assistant IA optionnel (suggestions de réponse, classification, résumé)
- [ ] 💻 Applications mobiles ou PWA pour l'inbox
- [ ] 🧑 Revue trimestrielle de la roadmap à partir des retours utilisateurs
