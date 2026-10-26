#!/usr/bin/env bash
# Instalación inicial del VPS (Ubuntu 24). Se corre UNA sola vez, con el usuario de despliegue y sudo:
#   curl -fsSL https://raw.githubusercontent.com/FernandoMateo/caph/main/deploy/setup-vps.sh | sudo bash -s -- caphsf.ar api.caphsf.ar
# Después, cada push a main se despliega solo (ver .github/workflows/deploy.yml).
set -euo pipefail

WEB_DOMAIN="${1:-caphsf.ar}"
API_DOMAIN="${2:-api.caphsf.ar}"
DEPLOY_USER="${SUDO_USER:-administrator}"
REPO="https://github.com/FernandoMateo/caph.git"
PB_VERSION="0.40.6"
BASE=/opt/caph

apt-get update
apt-get install -y curl git unzip rsync nginx certbot python3-certbot-nginx

# Node.js 22
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# Todo /opt/caph pertenece al usuario de despliegue: así GitHub Actions actualiza sin root
mkdir -p "$BASE/pocketbase"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$BASE"
as_deploy() { sudo -u "$DEPLOY_USER" -H "$@"; }

[ -d "$BASE/web/.git" ] || as_deploy git clone "$REPO" "$BASE/web"
if [ ! -f "$BASE/web/.env.local" ]; then
  as_deploy bash -c "printf 'PB_URL=http://127.0.0.1:8090\nNEXT_PUBLIC_PB_URL=https://%s\n' '$API_DOMAIN' > '$BASE/web/.env.local'"
fi

# PocketBase
if [ ! -x "$BASE/pocketbase/pocketbase" ]; then
  cd "$BASE/pocketbase"
  as_deploy curl -fsSLO "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip"
  as_deploy unzip -o "pocketbase_${PB_VERSION}_linux_amd64.zip" pocketbase
  rm "pocketbase_${PB_VERSION}_linux_amd64.zip"
fi

cat > /etc/systemd/system/caph-pocketbase.service <<EOF
[Unit]
Description=CAPH PocketBase
After=network.target

[Service]
WorkingDirectory=$BASE/pocketbase
ExecStart=$BASE/pocketbase/pocketbase serve --http=127.0.0.1:8090
Restart=always
User=$DEPLOY_USER

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/caph-web.service <<EOF
[Unit]
Description=CAPH web
After=network.target caph-pocketbase.service

[Service]
WorkingDirectory=$BASE/web
ExecStart=/usr/bin/npm run start -- -p 3000
Restart=always
Environment=NODE_ENV=production
User=$DEPLOY_USER

[Install]
WantedBy=multi-user.target
EOF

# El usuario de despliegue solo puede reiniciar estos dos servicios sin contraseña
cat > /etc/sudoers.d/caph-deploy <<EOF
$DEPLOY_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart caph-web, /usr/bin/systemctl restart caph-pocketbase
EOF
chmod 440 /etc/sudoers.d/caph-deploy
visudo -cf /etc/sudoers.d/caph-deploy

# nginx
cat > /etc/nginx/sites-available/caph <<EOF
server {
  server_name $WEB_DOMAIN www.$WEB_DOMAIN;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host \$host; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; }
}
server {
  server_name $API_DOMAIN;
  client_max_body_size 20M;
  location / { proxy_pass http://127.0.0.1:8090; proxy_set_header Host \$host; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; }
}
EOF
ln -sf /etc/nginx/sites-available/caph /etc/nginx/sites-enabled/caph
nginx -t && systemctl reload nginx

# Primera compilación y arranque
as_deploy bash "$BASE/web/deploy/deploy.sh"
systemctl daemon-reload
systemctl enable --now caph-pocketbase caph-web

echo
echo "Listo. Falta:"
echo "  1. Apuntar los DNS de $WEB_DOMAIN, www.$WEB_DOMAIN y $API_DOMAIN a este servidor."
echo "  2. sudo certbot --nginx -d $WEB_DOMAIN -d www.$WEB_DOMAIN -d $API_DOMAIN"
echo "  3. $BASE/pocketbase/pocketbase superuser upsert TU_EMAIL TU_CONTRASEÑA --dir $BASE/pocketbase/pb_data"
