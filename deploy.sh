#!/bin/bash
set -e

VPS_USER="ubuntu"
VPS_IP="51.77.158.155"
VPS_KEY="$HOME/.ssh/id_ed25519"
APP_DIR="$HOME/molyscan-apps"

# ── Couleurs ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

step() { echo -e "\n${YELLOW}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ── 1. Push local changes ─────────────────────────────────────────────────────
step "Push vers GitHub"
git push origin main
ok "Push OK"

# ── 2. Déploiement sur le VPS ─────────────────────────────────────────────────
step "Connexion au VPS $VPS_USER@$VPS_IP"

ssh -i "$VPS_KEY" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" bash << 'REMOTE'
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

step() { echo -e "\n${YELLOW}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }

APP_DIR="$HOME/molyscan-apps"

step "Git pull"
cd "$APP_DIR"
git stash --quiet 2>/dev/null || true
git pull origin main
ok "Code mis à jour"

step "npm install"
cd "$APP_DIR/apps/api"
npm install --silent
ok "Dépendances installées"

step "Build NestJS"
npx nest build
ok "Build OK"

step "Migrations Prisma"
npx prisma migrate deploy
ok "Migrations appliquées"

step "Redémarrage PM2"
pm2 restart molyscan-api
sleep 2
ok "API redémarrée"

step "Health check"
HEALTH=$(curl -s http://localhost:3000/api/health)
echo "$HEALTH"
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo -e "\n${GREEN}✓ API opérationnelle${NC}"
else
  echo -e "\n${RED}✗ Health check échoué${NC}"
  pm2 logs molyscan-api --lines 20 --nostream
  exit 1
fi
REMOTE

ok "Déploiement terminé — https://api.molyscan.fr/api/health"
