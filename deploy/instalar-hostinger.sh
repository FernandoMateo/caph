#!/usr/bin/env bash
# Instalación de CAPH en un VPS que YA tiene nginx atendiendo 80/443 con otros sitios (VPS de Hostinger).
# No toca los otros sitios, Docker, el firewall ni el SSH: agrega un usuario "caph", dos servicios que
# escuchan solo en 127.0.0.1 (web 3000, PocketBase 8091) y un sitio de nginx propio para el dominio.
# Se corre como root, una sola vez:
#   DOMINIO=caphsf.ar bash instalar-hostinger.sh
# El HTTPS se saca después, cuando el DNS del dominio ya apunte a este VPS (lo indica al final).
set -euo pipefail

DOMINIO="${DOMINIO:-}"
WEB_PORT=3000
PB_PORT=8091
USUARIO=caph
REPO="https://github.com/FernandoMateo/caph.git"
PB_VERSION="0.40.6"
BASE=/opt/caph
SITIO=/etc/nginx/sites-available/caph

[ -n "$DOMINIO" ] || { echo "Falta el dominio: DOMINIO=caphsf.ar bash instalar-hostinger.sh" >&2; exit 1; }
[ "$(id -u)" = 0 ] || { echo "Correlo como root." >&2; exit 1; }
command -v nginx >/dev/null || { echo "Este script es para un VPS con nginx." >&2; exit 1; }

# Los puertos tienen que estar libres (salvo que ya sean nuestros, si se corre de nuevo)
for p in $WEB_PORT $PB_PORT; do
  if ss -tln | grep -q "127.0.0.1:$p \|0.0.0.0:$p \|\*:$p " && ! systemctl is-active --quiet caph-web caph-pocketbase; then
    echo "El puerto $p ya está en uso por otro programa. No sigo." >&2
    exit 1
  fi
done

apt-get update
apt-get install -y curl git unzip rsync sqlite3 certbot python3-certbot-nginx

# Node.js 22 (si no hay uno 20 o más nuevo)
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# Usuario propio: la web no corre como root ni comparte usuario con lo demás del servidor
id "$USUARIO" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$USUARIO"
mkdir -p "$BASE/pocketbase"
chown -R "$USUARIO:$USUARIO" "$BASE"
como_caph() { sudo -u "$USUARIO" -H "$@"; }

[ -d "$BASE/web/.git" ] || como_caph git clone "$REPO" "$BASE/web"
[ -f "$BASE/web/.env.local" ] || como_caph bash -c "printf 'PB_URL=http://127.0.0.1:$PB_PORT\n' > '$BASE/web/.env.local'"

if [ ! -f "$BASE/pocketbase/.env" ]; then
  printf 'CAPH_PRODUCCION=1\nTURNSTILE_SECRET=\n' > "$BASE/pocketbase/.env"
  chown "$USUARIO:$USUARIO" "$BASE/pocketbase/.env"
  chmod 600 "$BASE/pocketbase/.env"
fi

if [ ! -x "$BASE/pocketbase/pocketbase" ]; then
  cd "$BASE/pocketbase"
  como_caph curl -fsSLO "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip"
  como_caph unzip -o "pocketbase_${PB_VERSION}_linux_amd64.zip" pocketbase
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
User=$USUARIO
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
User=$USUARIO
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# El usuario caph solo puede reiniciar sus dos servicios (lo usa el despliegue automático)
cat > /etc/sudoers.d/caph-deploy <<EOF
$USUARIO ALL=(root) NOPASSWD: /usr/bin/systemctl restart caph-web, /usr/bin/systemctl restart caph-pocketbase
EOF
chmod 440 /etc/sudoers.d/caph-deploy
visudo -cf /etc/sudoers.d/caph-deploy

# Sitio de nginx propio. /api va directo a PocketBase y el resto a la web.
# Lo privado de PocketBase (dashboard, superusuarios, backups, ajustes, logs) no se publica.
if [ ! -f "$SITIO" ]; then
  cat > "$SITIO" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMINIO www.$DOMINIO;

    client_max_body_size 40M;

    location = /_ { return 404; }
    location ^~ /_/ { return 404; }
    location ~ ^/api/(collections/_superusers/|backups|settings|logs|crons) { return 404; }

    location /api/ {
        proxy_pass http://127.0.0.1:$PB_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 360s;
    }

    location / {
        proxy_pass http://127.0.0.1:$WEB_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
    }
}
EOF
fi
ln -sf "$SITIO" /etc/nginx/sites-enabled/caph
if ! nginx -t; then
  # si algo falla, se saca el sitio nuevo y nginx sigue como estaba
  rm -f /etc/nginx/sites-enabled/caph
  echo "nginx rechazó la configuración: no se tocó nada de lo que ya funcionaba." >&2
  exit 1
fi
systemctl reload nginx

# Primera compilación y arranque
como_caph bash "$BASE/web/deploy/deploy.sh"
systemctl daemon-reload
systemctl enable --now caph-pocketbase caph-web

# Despliegue automático: cada minuto revisa GitHub y actualiza si hay cambios
como_caph bash "$BASE/web/deploy/install-cron.sh"

sleep 3
echo
systemctl is-active caph-pocketbase caph-web
curl -s -o /dev/null -w "Web local: HTTP %{http_code}\n" "http://127.0.0.1:$WEB_PORT/" || true
echo
echo "Listo. Falta:"
echo "  1. DNS en DonWeb: registros A de $DOMINIO y www.$DOMINIO → $(curl -s -4 ifconfig.me || echo 'IP de este VPS')"
echo "  2. Cuando el dominio ya abra la web, el HTTPS:"
echo "     certbot --nginx -d $DOMINIO -d www.$DOMINIO --redirect"
