#!/usr/bin/env bash
# Instalación inicial del VPS (Ubuntu 24). Se corre UNA sola vez, con el usuario de despliegue y sudo:
#   sudo DOMINIO=caphsf.ar bash setup-vps.sh
# Opcional: TURNSTILE_SECRET=... (clave secreta de Cloudflare Turnstile para frenar robots en /alta).
#
# Cómo queda:
# - Caddy recibe todo en 80/443 y saca solo el certificado HTTPS del dominio (el DNS tiene que apuntar a este VPS).
#   /api va directo a PocketBase y el resto a la web. El dashboard /_/ y el login de superusuarios no se
#   publican: se entra por túnel SSH (deploy/tunel-vps.ps1).
# - PocketBase y la web escuchan solo en 127.0.0.1: desde internet no se llega a sus puertos.
# - Firewall: solo SSH, 80 y 443. fail2ban contra fuerza bruta en SSH. Actualizaciones de seguridad automáticas.
# - Si el usuario de despliegue ya tiene una llave SSH, se apaga el login por contraseña y el de root.
# - PocketBase con CAPH_PRODUCCION=1: límites de intentos y backup diario (pb_hooks/seguridad.pb.js).
# Después, cada push a main se despliega solo en uno o dos minutos (ver deploy/check-update.sh).
set -euo pipefail

DOMINIO="${DOMINIO:-}"
WEB_PORT=3000
PB_PORT=8091
DEPLOY_USER="${SUDO_USER:-administrator}"
REPO="https://github.com/FernandoMateo/caph.git"
PB_VERSION="0.40.6"
BASE=/opt/caph

if [ -z "$DOMINIO" ]; then
  echo "Falta el dominio: sudo DOMINIO=caphsf.ar bash setup-vps.sh" >&2
  exit 1
fi

apt-get update
apt-get install -y curl git unzip rsync sqlite3 ufw fail2ban unattended-upgrades debian-keyring debian-archive-keyring apt-transport-https gnupg

# Node.js 22
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# Caddy (repositorio oficial)
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi

# Todo /opt/caph pertenece al usuario de despliegue: así el auto-deploy actualiza sin root
mkdir -p "$BASE/pocketbase"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$BASE"
as_deploy() { sudo -u "$DEPLOY_USER" -H "$@"; }

[ -d "$BASE/web/.git" ] || as_deploy git clone "$REPO" "$BASE/web"
if [ ! -f "$BASE/web/.env.local" ]; then
  as_deploy bash -c "printf 'PB_URL=http://127.0.0.1:$PB_PORT\n' > '$BASE/web/.env.local'"
fi

# Secretos de PocketBase: fuera del repo y legibles solo por el usuario de despliegue
if [ ! -f "$BASE/pocketbase/.env" ]; then
  printf 'CAPH_PRODUCCION=1\nTURNSTILE_SECRET=%s\n' "${TURNSTILE_SECRET:-}" > "$BASE/pocketbase/.env"
  chown "$DEPLOY_USER:$DEPLOY_USER" "$BASE/pocketbase/.env"
  chmod 600 "$BASE/pocketbase/.env"
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
EnvironmentFile=$BASE/pocketbase/.env
ExecStart=$BASE/pocketbase/pocketbase serve --http=127.0.0.1:$PB_PORT
Restart=always
User=$DEPLOY_USER
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/caph-web.service <<EOF
[Unit]
Description=CAPH web
After=network.target caph-pocketbase.service

[Service]
WorkingDirectory=$BASE/web
ExecStart=/usr/bin/npm run start -- -p $WEB_PORT -H 127.0.0.1
Restart=always
Environment=NODE_ENV=production
User=$DEPLOY_USER
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# El usuario de despliegue solo puede reiniciar estos dos servicios sin contraseña
cat > /etc/sudoers.d/caph-deploy <<EOF
$DEPLOY_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart caph-web, /usr/bin/systemctl restart caph-pocketbase
EOF
chmod 440 /etc/sudoers.d/caph-deploy
visudo -cf /etc/sudoers.d/caph-deploy

# Caddy: HTTPS, /api a PocketBase, el resto a la web; lo privado de PocketBase no se publica
cat > /etc/caddy/Caddyfile <<EOF
$DOMINIO, www.$DOMINIO {
	encode zstd gzip

	@privado path /_ /_/* /api/collections/_superusers/* /api/backups /api/backups/* /api/settings /api/settings/* /api/logs /api/logs/* /api/crons /api/crons/*
	respond @privado 404

	handle /api/* {
		reverse_proxy 127.0.0.1:$PB_PORT
	}
	handle {
		reverse_proxy 127.0.0.1:$WEB_PORT
	}

	header {
		Strict-Transport-Security "max-age=31536000"
		-Server
	}
}
EOF
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy || systemctl restart caddy

# Firewall: solo SSH (en su puerto actual), HTTP y HTTPS
SSH_PORT="$(sshd -T 2>/dev/null | awk '/^port /{print $2; exit}')"
ufw allow "${SSH_PORT:-22}/tcp"
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# fail2ban: bloquea IPs que prueban contraseñas por SSH
cat > /etc/fail2ban/jail.d/caph.local <<EOF
[sshd]
enabled = true
maxretry = 5
bantime = 1h
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

# Actualizaciones de seguridad automáticas
dpkg-reconfigure -f noninteractive unattended-upgrades

# SSH solo con llave: únicamente si el usuario de despliegue ya tiene una (si no, quedaría afuera)
KEYS="$(getent passwd "$DEPLOY_USER" | cut -d: -f6)/.ssh/authorized_keys"
if [ -s "$KEYS" ]; then
  cat > /etc/ssh/sshd_config.d/10-caph.conf <<EOF
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF
  sshd -t && (systemctl reload ssh || systemctl reload sshd)
  SSH_LLAVE=1
else
  SSH_LLAVE=0
fi

# Primera compilación y arranque
as_deploy bash "$BASE/web/deploy/deploy.sh"
systemctl daemon-reload
systemctl enable --now caph-pocketbase caph-web

# Revisar GitHub cada minuto y desplegar si hay commits nuevos
as_deploy bash "$BASE/web/deploy/install-cron.sh"

echo
echo "Listo: https://$DOMINIO (Caddy) → web en 127.0.0.1:$WEB_PORT y PocketBase en 127.0.0.1:$PB_PORT."
echo "Falta:"
echo "  1. Crear el superusuario (contraseña larga, solo para vos):"
echo "     $BASE/pocketbase/pocketbase superuser upsert TU_EMAIL TU_CONTRASEÑA --dir $BASE/pocketbase/pb_data"
echo "  2. Entrar al dashboard por túnel SSH (deploy/tunel-vps.ps1) y crear los usuarios del panel."
if [ "$SSH_LLAVE" = 0 ]; then
  echo "  3. IMPORTANTE: el SSH todavía acepta contraseña. Cargá tu llave pública en $KEYS"
  echo "     y volvé a correr este script para apagar el login por contraseña."
fi
