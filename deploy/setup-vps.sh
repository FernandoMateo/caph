#!/usr/bin/env bash
# Instalación inicial del VPS (Ubuntu 24). Se corre UNA sola vez, con el usuario de despliegue y sudo:
#   sudo bash setup-vps.sh https://api.caphsf.ar
# El argumento es la URL pública con la que el navegador llega a PocketBase.
# No instala nginx: los dominios y el HTTPS los pone el proxy del proveedor, que reenvía
# cada dominio a un puerto de este VPS (web → WEB_PORT, PocketBase → PB_PORT).
# Después, cada push a main se despliega solo en uno o dos minutos (ver deploy/check-update.sh).
set -euo pipefail

PUBLIC_PB_URL="${1:-https://api.caphsf.ar}"
WEB_PORT=3000
PB_PORT=8091   # el 8090 ya lo usa otro sistema en este VPS
DEPLOY_USER="${SUDO_USER:-administrator}"
REPO="https://github.com/FernandoMateo/caph.git"
PB_VERSION="0.40.6"
BASE=/opt/caph

apt-get update
apt-get install -y curl git unzip rsync

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
  as_deploy bash -c "printf 'PB_URL=http://127.0.0.1:$PB_PORT\nNEXT_PUBLIC_PB_URL=%s\n' '$PUBLIC_PB_URL' > '$BASE/web/.env.local'"
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
ExecStart=$BASE/pocketbase/pocketbase serve --http=0.0.0.0:$PB_PORT
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
ExecStart=/usr/bin/npm run start -- -p $WEB_PORT -H 0.0.0.0
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

if ufw status | grep -q "Status: active"; then
  ufw allow "$WEB_PORT/tcp"
  ufw allow "$PB_PORT/tcp"
fi

# Primera compilación y arranque
as_deploy bash "$BASE/web/deploy/deploy.sh"
systemctl daemon-reload
systemctl enable --now caph-pocketbase caph-web

# Revisar GitHub cada minuto y desplegar si hay commits nuevos
CRON_LINE="* * * * * flock -n /tmp/caph-deploy.lock bash $BASE/web/deploy/check-update.sh >> $BASE/deploy.log 2>&1"
(as_deploy crontab -l 2>/dev/null | grep -v check-update.sh; echo "$CRON_LINE") | as_deploy crontab -

echo
echo "Listo: web en el puerto $WEB_PORT y PocketBase en el $PB_PORT."
echo "Falta:"
echo "  1. En el panel del proveedor, conectar el dominio de la web al puerto $WEB_PORT y el de PocketBase al $PB_PORT."
echo "  2. Crear el superusuario:"
echo "     $BASE/pocketbase/pocketbase superuser upsert TU_EMAIL TU_CONTRASEÑA --dir $BASE/pocketbase/pb_data"
