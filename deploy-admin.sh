#!/bin/bash
set -e

# Déploiement de la plateforme web d'administration (SPA statique) sur le VPS.
# Build local (apps/admin) → upload dans /var/www/admin.molyscan.fr servi par nginx.
# Le HTTPS est géré par certbot (voir docs/DEPLOYMENT.md).

VPS_USER="ubuntu"
VPS_IP="51.77.158.155"
VPS_KEY="$HOME/.ssh/molyscan_deploy"
WEB_ROOT="/var/www/admin.molyscan.fr"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
step() { echo -e "\n${YELLOW}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }

cd "$(dirname "$0")"

step "Push vers GitHub"
git push origin main
ok "Push OK"

cd apps/admin

step "Build admin (mode production)"
npm install --silent
npm run build
ok "Build OK ($(du -sh dist | cut -f1))"

step "Upload vers $VPS_USER@$VPS_IP:$WEB_ROOT"
tar -C dist -czf - . | ssh -i "$VPS_KEY" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" \
  "cat > /tmp/admin.tgz \
   && sudo mkdir -p $WEB_ROOT \
   && sudo rm -rf $WEB_ROOT/* \
   && sudo tar -C $WEB_ROOT -xzf /tmp/admin.tgz \
   && rm -f /tmp/admin.tgz \
   && sudo chown -R www-data:www-data $WEB_ROOT"
ok "Admin déployé — https://admin.molyscan.fr"
