# LOGINET Huissiers — Plateforme de gestion pour cabinets d'huissiers

Scaffold **Sprint 1** conforme au cahier des charges technique
(Réf. contrat N°001/06/2026/DEV/LOGINET) : architecture, authentification,
multi-tenant, base de données.

## Structure du projet

```
loginet-huissiers/
├── backend/          # API NestJS + Prisma (schéma public) + pg (schémas tenant)
│   ├── prisma/
│   │   ├── schema.prisma       # Cabinets, Super Admins, audit log (schéma public)
│   │   └── tenant-schema.sql   # Gabarit DDL provisionné pour chaque nouveau cabinet
│   └── src/
│       ├── auth/                # JWT access+refresh, guards, RBAC
│       ├── tenant/               # Résolution & isolation multi-tenant
│       ├── cabinets/              # Gestion des cabinets (Super Admin)
│       └── users/                  # Gestion du personnel d'un cabinet
├── frontend/         # React + TypeScript + Vite + Tailwind
├── nginx/nginx.conf  # Reverse proxy VPS (sous-domaines + SSL)
└── docker-compose.yml
```

## Comment fonctionne l'isolation multi-tenant

- Un schéma PostgreSQL **`public`** contient les tables communes (`cabinets`,
  `super_admins`, `audit_logs`), gérées par Prisma.
- Chaque cabinet reçoit son propre schéma **`cabinet_<slug>`**, créé
  dynamiquement à partir de `tenant-schema.sql` lorsqu'un Super Admin crée
  un cabinet (`POST /api/cabinets`).
- Prisma ne gère pas nativement des schémas créés à l'exécution : les
  tables tenant sont donc interrogées via `pg` (`TenantDbService`), avec
  `SET search_path` verrouillé sur le schéma du cabinet courant à chaque
  requête. Aucune requête ne peut atteindre les données d'un autre cabinet.
- Le cabinet courant est résolu soit par le **sous-domaine** de la requête
  (`cabinet1.app.domaine.tld`), soit par le **JWT** (`cabinetId`/`schemaName`
  dans le payload) — les deux mécanismes prévus au §3.2 du CDC.

## Développement local

Prérequis : Node.js 20+, PostgreSQL 16, npm.

```bash
# Base de données
createdb loginet_huissiers

# Backend
cd backend
cp .env.example .env      # ajustez DATABASE_URL, secrets JWT
npm install
npx prisma migrate deploy # crée les tables du schéma public
npm run seed               # crée le Super Admin initial (affiché en console)
npm run start:dev          # http://localhost:3000/api

# Frontend (autre terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

En local, sans sous-domaines, connectez-vous d'abord en Super Admin
(`POST /api/auth/super-admin/login`) pour créer un premier cabinet — cela
provisionne son schéma et un compte Huissier avec mot de passe temporaire.
Pour tester le login cabinet en local, ajoutez une entrée dans
`/etc/hosts` (ex: `127.0.0.1 cabinet1.localhost`) et appelez l'API avec ce Host.

## Déploiement — rendre la plateforme accessible aux utilisateurs

Le CDC prévoit un VPS Ubuntu 22.04 avec Nginx + Let's Encrypt. Voici le
chemin complet, du serveur vide à la plateforme en ligne.

### 1. Prérequis

- Un VPS Ubuntu 22.04 (2 vCPU / 4 Go RAM minimum recommandé)
- Un nom de domaine (ex: `loginet-huissiers.com`)
- Accès SSH root ou sudo

### 2. DNS

Chez votre registrar / fournisseur DNS, créez :

| Type | Nom | Valeur |
|---|---|---|
| A | `api` | IP du VPS |
| A | `app` | IP du VPS |
| A | `*` | IP du VPS (sous-domaines des cabinets, ex: `sonatel.loginet-huissiers.com`) |

### 3. Installer Docker sur le VPS

```bash
ssh root@VOTRE_IP
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin
```

### 4. Récupérer le code

```bash
git clone <votre-dépôt-git-privé> /opt/loginet-huissiers
cd /opt/loginet-huissiers
```

### 5. Configurer les secrets

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Renseignez : `DATABASE_URL` (utilisateur `loginet`, mot de passe fort),
`JWT_ACCESS_SECRET` et `JWT_REFRESH_SECRET` (générez avec
`openssl rand -base64 48`), les identifiants SMTP, et
`CORS_ORIGIN=https://app.VOTRE-DOMAINE.tld`.

Éditez `nginx/nginx.conf` et remplacez chaque occurrence de
`DOMAINE.tld` par votre vrai domaine.

### 6. Certificat SSL wildcard (obligatoire pour les sous-domaines cabinets)

Un certificat wildcard (`*.domaine.tld`) exige une validation **DNS-01**
(le simple webroot HTTP ne suffit pas pour un wildcard). Exemple avec un
DNS chez un fournisseur supporté par un plugin Certbot (adaptez selon le
vôtre — Cloudflare, OVH, Gandi, etc. ont chacun un plugin) :

```bash
apt install -y certbot python3-certbot-dns-cloudflare   # exemple Cloudflare
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials /root/.cloudflare.ini \
  -d "DOMAINE.tld" -d "*.DOMAINE.tld"
```

Le certificat est stocké dans `/etc/letsencrypt/live/DOMAINE.tld/` — c'est
ce chemin que `docker-compose.yml` monte dans le conteneur Nginx. Le
renouvellement wildcard doit rester automatisé via le même plugin DNS
(planifiez `certbot renew` en cron ; le service `certbot` du
docker-compose fourni gère le cas webroot simple, à adapter si vous
utilisez un plugin DNS).

### 7. Démarrer la plateforme

```bash
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
```

Notez le mot de passe Super Admin temporaire affiché par `npm run seed` et
changez-le dès la première connexion.

### 8. Vérification

- `https://api.DOMAINE.tld/api/auth/super-admin/login` répond (401 si mauvais mot de passe = bon signe, le serveur tourne)
- `https://app.DOMAINE.tld` affiche la page de connexion
- Créez un premier cabinet via l'API Super Admin, puis testez
  `https://<slug>.DOMAINE.tld`

### 9. Sauvegardes automatiques (§5.1 du CDC)

```bash
# Exemple crontab (sauvegarde quotidienne à 2h)
0 2 * * * docker compose exec -T postgres pg_dumpall -U loginet | gzip > /opt/backups/loginet_$(date +\%F).sql.gz
```

## Faire évoluer le schéma tenant (nouveaux champs/tables)

Comme chaque cabinet a son propre schéma PostgreSQL, une évolution du
schéma (ex: nouvelle table) doit être appliquée à **tous** les cabinets
existants, pas seulement via `tenant-schema.sql` (qui ne s'applique
qu'aux *nouveaux* cabinets). Workflow :

1. Ajoutez la nouvelle table/colonne à `prisma/tenant-schema.sql` (pour les futurs cabinets).
2. Créez un fichier idempotent (`CREATE TABLE IF NOT EXISTS...`) dans `prisma/migrations-tenant/`.
3. Appliquez-le à tous les cabinets existants :
   ```bash
   node scripts/apply-tenant-migration.js prisma/migrations-tenant/votre-migration.sql
   ```

## Génération de PDF (module Actes)

- Une seule instance Chromium (Puppeteer) est démarrée au lancement du
  backend et réutilisée pour chaque génération — un lancement par requête
  serait trop lent pour tenir l'objectif de <5s (§Module 3 du CDC).
- Les gabarits d'actes sont du HTML + **Handlebars** (`{{numeroActe}}`,
  `{{client.nom}}`, `{{dossier.numero}}`, etc.), modifiables depuis
  Administration → Modèles d'actes (rôle Huissier).
- Chaque cabinet reçoit un modèle de démarrage ("Sommation — modèle
  standard") à sa création ; libre à lui de le dupliquer/adapter.
- Les PDF générés sont stockés sur disque sous `storage/<schema_cabinet>/actes/`
  (volume Docker `actes-storage`, jamais mélangés entre cabinets) et
  servis via `GET /api/actes/:id/pdf`, protégé par JWT + isolation tenant.
- **Important local (hors Docker)** : Puppeteer doit trouver un Chromium.
  En local, laissez `PUPPETEER_EXECUTABLE_PATH` vide dans `.env` pour que
  Puppeteer télécharge son propre Chromium au `npm install` (retirez
  `puppeteer_skip_download=true` de `.npmrc` si vous développez en dehors
  de Docker). En production (Docker), le `Dockerfile` installe Chromium
  système et fixe cette variable — rien à faire.

## Facturation, agenda et notifications (Sprint 4)

- **Facturation** : numérotation auto (`FAC-2026-0001`), paiements multiples
  par facture (espèces/virement/mobile money), passage automatique du
  statut (Envoyée → Partielle → Payée) au fil des encaissements, PDF de
  facture téléchargeable (`GET /api/factures/:id/pdf`).
- **Agenda** : événements liés ou non à un dossier, assignables à un
  utilisateur, avec rappels J-1/J-7 optionnels.
- **Notifications email (Nodemailer)** : les identifiants temporaires
  (création de cabinet, création d'utilisateur) et les relances clients
  sont désormais **envoyés par email** en plus d'être renvoyés par l'API.
  Un job planifié quotidien (`@nestjs/schedule`, 7h) parcourt tous les
  cabinets actifs et envoie les rappels d'agenda dus, en marquant
  chaque rappel comme envoyé pour ne jamais le renvoyer deux fois.
- **Important** : sans `SMTP_HOST` configuré dans `.env`, les emails sont
  simplement journalisés (pas d'échec de la requête) — pratique en
  développement, à configurer avant la mise en production.

## Rapports & tableau de bord (Sprint 5)

- Le Dashboard affiche 4 indicateurs en temps réel (`GET /api/rapports/dashboard`) :
  dossiers actifs, chiffre d'affaires du mois, actes générés, rendez-vous du jour.
- La page Rapports ajoute : chiffre d'affaires encaissé sur 6 mois (graphique),
  répartition des dossiers par statut et par type (camemberts), taux de
  recouvrement global (encaissé / facturé).
- Le détail financier (`dossiers-par-statut`, `chiffre-affaires-mensuel`,
  `taux-recouvrement`) est réservé aux rôles Huissier/Comptable ; le
  dashboard résumé reste visible par tout le personnel.

## Tests & intégration continue

```bash
cd backend
npm test            # 13 tests (validation des DTO, RolesGuard, encaissement de paiements)
npm run test:cov    # avec couverture
```

Un workflow GitHub Actions (`.github/workflows/ci.yml`) compile et teste
automatiquement le backend et le frontend à chaque push/PR sur `main`.

## Checklist avant mise en production

- [ ] `backend/.env` : secrets JWT générés (`openssl rand -base64 48`), jamais ceux d'exemple
- [ ] `nginx/nginx.conf` : `DOMAINE.tld` remplacé partout
- [ ] Certificat SSL wildcard obtenu (DNS-01, voir §Certificat SSL ci-dessus)
- [ ] SMTP configuré et testé (`backend/.env` : `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`)
- [ ] `npm run seed` exécuté, mot de passe Super Admin changé
- [ ] Sauvegarde quotidienne PostgreSQL programmée (cron, voir §Sauvegardes)
- [ ] `docker compose ps` : tous les services `healthy`/`running`
- [ ] Un cabinet de test créé et parcouru de bout en bout (connexion → dossier → acte PDF → facture → paiement → rapport)

## Récapitulatif des 5 sprints livrés

| Sprint | Contenu |
|---|---|
| 1 | Architecture, auth JWT, multi-tenant par schéma, base de données |
| 2 | Dossiers (numérotation auto, historique) + Clients/Débiteurs |
| 3 | Actes : génération PDF (Puppeteer + Handlebars), modèles configurables |
| 4 | Facturation & paiements, Agenda avec rappels, notifications email (Nodemailer) |
| 5 | Rapports & tableau de bord, tests automatisés, CI, préparation production |

Chaque sprint a été démontré avant passage au suivant, conformément au §7 du CDC. La plateforme est maintenant fonctionnellement complète pour le déploiement décrit plus haut.
