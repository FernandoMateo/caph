# CAPH Santa Fe — web y panel

- **Web pública** (Next.js 15): home con escena 3D, honorarios, capacitaciones, proveedores y galería.
- **Panel** en `/admin`: honorarios, proveedores (con logo), cursos y capacitaciones, galería de la comunidad.
- **Datos** en PocketBase. La web lee en cada visita: lo que se guarda en el panel se ve al instante. Si PocketBase no responde, la web muestra los datos de respaldo de `lib/data.ts` (la galería se oculta).

```
app/                 páginas (home y /admin)
components/          componentes de la web y del panel (components/admin)
lib/content.ts       lectura de PocketBase en el servidor (+ respaldo)
lib/pb-client.ts     cliente PocketBase del panel (navegador)
pocketbase/pb_migrations/   colecciones, reglas de acceso y carga inicial
```

## Desarrollo local (Windows)

1. Descargar PocketBase v0.40.x para Windows en `pocketbase/bin/` (no se versiona).
2. Crear la base y un superusuario:
   ```
   cd pocketbase
   bin\pocketbase.exe migrate up --dir pb_data --migrationsDir pb_migrations
   bin\pocketbase.exe superuser upsert TU_EMAIL TU_CONTRASEÑA --dir pb_data
   bin\pocketbase.exe serve --http=127.0.0.1:8090 --dir pb_data --migrationsDir pb_migrations
   ```
3. Copiar `.env.example` a `.env.local` (`PB_URL=http://127.0.0.1:8090`).
4. `npm install` y `npm run dev` → http://localhost:3000 y http://localhost:3000/admin

## Usuarios del panel

Los usuarios del panel son registros de la colección **users** de PocketBase (no se pueden registrar solos).

1. Entrar al dashboard de PocketBase: `https://caphsf.ar/_/` (la web lo reenvía; en local `http://127.0.0.1:8090/_/`) con el superusuario.
2. Colección **users** → **New record** → email, contraseña y marcar **verified**.
3. Esa persona entra en `https://caphsf.ar/admin`.

Para quitar el acceso, borrar el registro. El superusuario es solo para mantenimiento; no compartirlo.

## Publicación en el VPS (Ubuntu + nginx)

Ejemplo con dos dominios: `caphsf.ar` (web) y `api.caphsf.ar` (PocketBase).

### 1. PocketBase

```bash
sudo mkdir -p /opt/caph/pocketbase && cd /opt/caph/pocketbase
wget https://github.com/pocketbase/pocketbase/releases/download/v0.40.6/pocketbase_0.40.6_linux_amd64.zip
unzip pocketbase_0.40.6_linux_amd64.zip && rm pocketbase_0.40.6_linux_amd64.zip
# copiar la carpeta pb_migrations del repo a /opt/caph/pocketbase/pb_migrations
./pocketbase superuser upsert TU_EMAIL TU_CONTRASEÑA
```

`/etc/systemd/system/caph-pocketbase.service`:

```ini
[Unit]
Description=CAPH PocketBase
After=network.target

[Service]
WorkingDirectory=/opt/caph/pocketbase
ExecStart=/opt/caph/pocketbase/pocketbase serve --http=127.0.0.1:8090
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

Las migraciones se aplican solas al arrancar.

### 2. Web (Next.js)

```bash
cd /opt/caph/web            # el repo
cp .env.example .env.local  # PB_URL=http://127.0.0.1:8090
npm ci && npm run build
```

`/etc/systemd/system/caph-web.service`:

```ini
[Unit]
Description=CAPH web
After=network.target caph-pocketbase.service

[Service]
WorkingDirectory=/opt/caph/web
ExecStart=/usr/bin/npm run start -- -p 3000
Restart=always
Environment=NODE_ENV=production
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now caph-pocketbase caph-web
```

### 3. nginx + HTTPS

```nginx
server {
  server_name caphsf.ar www.caphsf.ar;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
}
server {
  server_name api.caphsf.ar;
  client_max_body_size 20M;   # PDFs y fotos
  location / { proxy_pass http://127.0.0.1:8090; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
}
```

```bash
sudo certbot --nginx -d caphsf.ar -d www.caphsf.ar -d api.caphsf.ar
```

### 4. Copias de seguridad

Todo el contenido (datos, PDFs, fotos y logos) vive en `/opt/caph/pocketbase/pb_data`. En el dashboard de PocketBase → **Settings → Backups** se pueden programar copias automáticas; conviene además copiar esa carpeta fuera del servidor.

## Despliegue automático (push → VPS)

Cada `git push` a `main` llega al VPS solo en uno o dos minutos: un cron del usuario de despliegue corre `deploy/check-update.sh` cada minuto y, si hay commits nuevos, `deploy/deploy.sh` baja el código, compila y reinicia la web (y PocketBase si cambiaron las migraciones). No hace falta cargar secretos en GitHub. El registro queda en `/opt/caph/deploy.log` del VPS.

Puesta en marcha (una sola vez):

1. Desde Windows (PowerShell), autorizar la clave de despliegue en el VPS (pide la contraseña del VPS una vez):
   ```powershell
   type $env:USERPROFILE\.ssh\mateo_deploy_key.pub | ssh -p PUERTO USUARIO@IP_DEL_VPS "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
   ```
2. En el VPS, con el usuario de despliegue (no root), instalar todo (pide la contraseña de sudo):
   ```bash
   curl -fsSL https://raw.githubusercontent.com/FernandoMateo/caph/main/deploy/setup-vps.sh -o /tmp/setup-vps.sh && sudo bash /tmp/setup-vps.sh
   ```
   Deja la web en el puerto 3000 y PocketBase en el 8091, sin nginx: en el VPS actual los dominios y el HTTPS los pone el proxy del proveedor, que se configura en su panel (dominio → puerto). También programa el cron de actualización. Al terminar indica los pasos que faltan.

Para volver a una versión anterior: `git revert` del commit problemático y `git push`.

## Pendientes de contenido

- Validador de asociados: usa datos de ejemplo (`lib/data.ts`, `PADRON_DEMO`) hasta conectar el padrón real.
- Galería: sin fotos reales cargadas; la sección aparece sola cuando se publica la primera.
- Teléfono `36425151500` (M y L Empresa de Limpieza) viene así de la web actual; confirmar.
