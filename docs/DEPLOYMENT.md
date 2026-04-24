# Déploiement VPS

L'API tourne sur un VPS Linux accessible via **https://api.molyscan.fr**.

## Accès SSH

```bash
ssh <user>@<ip-vps>
# Ex: ssh ubuntu@51.xxx.xxx.xxx
```

Les identifiants SSH doivent être stockés dans un gestionnaire de secrets (Bitwarden, 1Password) — ne jamais les committer.

## Structure sur le VPS

```
/home/<user>/molyscan-apps/   → clone du repo
/etc/nginx/sites-available/   → reverse proxy (api.molyscan.fr)
```

## Déployer une nouvelle version

```bash
# 1. Pousser les changements depuis le poste local
git push origin main

# 2. Se connecter au VPS
ssh <user>@<ip-vps>

# 3. Mettre à jour le code
cd ~/molyscan-apps
git pull origin main

# 4. Installer les dépendances si nécessaire
cd apps/api
npm install

# 5. Compiler
npm run build

# 6. Appliquer les migrations de base de données
npx prisma migrate deploy

# 7. Redémarrer le processus
pm2 restart molyscan-api
```

## Première installation sur un VPS vierge

### Prérequis système

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 (gestionnaire de processus)
sudo npm install -g pm2

# PostgreSQL 16 avec pgvector
sudo apt install postgresql-16
# Activer pgvector
sudo apt install postgresql-16-pgvector

# Nginx
sudo apt install nginx
```

### Cloner et configurer

```bash
git clone https://github.com/YounesEssl/molyscan-apps.git
cd molyscan-apps/apps/api

# Copier et remplir les variables d'environnement
cp .env.example .env
nano .env
```

### Base de données

```bash
# Créer la DB
sudo -u postgres psql -c "CREATE DATABASE molyscan;"
sudo -u postgres psql -c "CREATE USER molyscan WITH PASSWORD 'xxx';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE molyscan TO molyscan;"
sudo -u postgres psql molyscan -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Appliquer le schéma
npx prisma migrate deploy
npx prisma db seed   # optionnel — données de démo
```

### Lancer avec PM2

```bash
npm run build

pm2 start dist/main.js --name molyscan-api
pm2 save
pm2 startup   # pour démarrer automatiquement au reboot
```

### Nginx — reverse proxy

Fichier `/etc/nginx/sites-available/api.molyscan.fr` :

```nginx
server {
    listen 80;
    server_name api.molyscan.fr;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;

        # SSE (streaming chat)
        proxy_read_timeout 120s;
        proxy_buffering off;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/api.molyscan.fr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# HTTPS avec Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.molyscan.fr
```

## Commandes PM2 utiles

```bash
pm2 status                  # État des processus
pm2 logs molyscan-api       # Logs en temps réel
pm2 logs molyscan-api --lines 100  # 100 dernières lignes
pm2 restart molyscan-api    # Redémarrer
pm2 stop molyscan-api       # Arrêter
pm2 monit                   # Dashboard temps réel
```

## Vérifier que l'API fonctionne

```bash
curl https://api.molyscan.fr/api/health
# Réponse attendue: {"status":"ok"}
```

## Variables d'environnement en production

Le fichier `.env` sur le VPS doit avoir :

```env
NODE_ENV=production
PORT=3000
API_PREFIX=api

DATABASE_URL=postgresql://molyscan:<password>@localhost:5432/molyscan?schema=public

JWT_SECRET=<secret-très-long-et-aléatoire>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AI...
OPENAI_API_KEY=sk-...

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=<key>
MINIO_SECRET_KEY=<secret>
MINIO_BUCKET=molyscan
MINIO_USE_SSL=false

EXPO_PUSH_ACCESS_TOKEN=<token>
```

Ne jamais committer ce fichier. Il ne doit exister que sur le VPS.

## Workflow complet (poste local → prod)

```
1. Développer et tester localement
2. git commit + git push origin main
3. SSH sur le VPS
4. git pull + npm run build + npx prisma migrate deploy + pm2 restart
5. Vérifier: curl https://api.molyscan.fr/api/health
6. Rebuild APK si l'API a changé: eas build --platform android --profile preview
```
