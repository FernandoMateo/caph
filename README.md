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
pocketbase/pb_hooks/        lógica de la contabilidad (cuotas, imputación de pagos, mora)
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

## Altas y cuentas del portal

Asociados (administradores de consorcios), proveedores y profesionales se dan de alta solos en `/alta`: crean su cuenta (colección `cuentas`, con DNI/CUIT y teléfono que solo ven ellos y el panel) y cargan su ficha con foto. Quien ya figura en la web marca "Ya figuro" y pide acceso a su ficha actual.

Nada se publica sin aprobación: en `/admin/altas` el panel aprueba (y asigna el N.º), rechaza con un motivo o vincula la cuenta a una ficha existente. Si el dueño cambia una ficha ya publicada, sigue visible y aparece en "Cambios para revisar". Las reglas viven en `pocketbase/pb_hooks/fichas.js`: el dueño no puede tocar estado, visibilidad, verificado ni N.º, y para publicar una ficha (también desde el panel) hacen falta foto/logo, teléfono, email y dirección, más profesión y localidad (matrícula si es profesional) o razón social y rubro (proveedores). Las fichas cargadas antes de esto quedaron aprobadas tal como estaban.

## Portal y carnet digital

En `/portal` cada cuenta ingresa con su email y contraseña (sesión aparte de la del panel). Ve el estado de su alta (en revisión, rechazada con el motivo, suspendida), edita su ficha y cambia su contraseña. Cuando la Cámara aprueba el alta aparece su **carnet digital**: se da vuelta con un toque y se descarga en PDF (A4, frente y dorso a tamaño real para imprimir). El PDF se genera en el navegador (`lib/carnet-pdf.tsx`, con `@react-pdf/renderer`).

El QR del carnet abre `/verificar/<id>`, una página pública que dice si el carnet está vigente: lo está mientras la ficha esté aprobada, visible y sin mora.

Cada socio tiene además su **tarjeta para compartir** en `/carnet/<id>`: el carnet (se da vuelta), sus datos de contacto con botones de WhatsApp, llamar, email y web, "Guardar contacto" (descarga un .vcf para la agenda del teléfono) y "Compartir". Al pegar el link en WhatsApp se ve la vista previa con la foto y el nombre. Desde el portal se copia el link, se manda por WhatsApp o se comparte con el menú del teléfono. Muestra solo datos que ya son públicos en la web, y si la ficha deja de estar vigente el link dice que no está disponible. Si la Cámara la oculta o la da de baja, el mismo QR pasa a decir "No vigente".

## Asociados y profesionales

En `/admin/profesionales`: asociados (administradores de consorcios) y profesionales, distinguidos por el campo `rol` (nombre, estudio, N.º, título, matrícula, contacto, foto y descripción). Los marcados como visibles aparecen en la web en la sección **Profesionales**: un carrusel con la foto del centro grande y a color (las de los costados en gris), contacto sobre la foto y filtros por tipo; también se puede ver como grilla de tarjetas 3D. La sección (y su enlace en el menú) aparece cuando hay al menos uno. Para que una ficha se vea en la web tiene que estar completa (foto incluida); aprobada pero oculta puede estar incompleta. No cargar DNI, CUIT ni domicilios particulares: todo lo que está en esta colección es público.

Los buscadores de proveedores y profesionales (web y panel) buscan en todos los datos, sin distinguir mayúsculas ni acentos, y reconocen teléfonos escritos de cualquier forma (`lib/buscar.ts`).

## Cursos online y certificados

En `/admin/cursos` cada capacitación (de las cargadas en Capacitaciones) puede tener temario para cursarse desde el portal: módulos con lecciones de video (link de YouTube o Vimeo; conviene subirlos «sin listar»), PDF (protegido: solo lo abren los inscriptos) o texto.

- **Inscripción y avance:** una cuenta aprobada se inscribe desde su portal y cursa en `/portal/curso/<id>`, marcando cada lección como vista. Los títulos de los módulos los ve cualquier cuenta; las lecciones, solo los inscriptos.
- **Certificado:** si la capacitación tiene "Emite certificado", al completar todas las lecciones `pocketbase/pb_hooks/cursos.js` le asigna un código único. Desde el portal se descarga el PDF (A4 apaisado, con la carga horaria y un QR); el QR abre `/verificar/certificado/<código>`, que confirma que es válido.
- **Presenciales:** en Inscriptos, el panel puede inscribir a una cuenta como "ya lo completó (asistió)" y el certificado se emite al instante. Los inscriptos se exportan a Excel.
- En la web, las capacitaciones online muestran "Cursalo online en tu portal" en lugar del link de inscripción.

## Textos, rubros, importar y exportar

- **Textos y rubros** (`/admin/textos`): los textos principales de la home (inicio, La Cámara, Asociate y sus beneficios, la convocatoria con su interruptor para mostrarla u ocultarla) y los rubros del directorio de proveedores (agregar, renombrar, ordenar; un rubro con proveedores no se puede borrar). Un texto vacío vuelve al original (`lib/textos.ts`). `pocketbase/pb_hooks/rubros.pb.js` mantiene las opciones de `proveedores.rubro` iguales a la colección.
- **Importar y exportar** (`/admin/datos`): bajar a Excel las colecciones elegidas (una hoja cada una; sirve de copia de seguridad) e importar asociados, profesionales o proveedores desde Excel o CSV, con vista previa fila por fila. Se reconocen por N.º o por nombre: los que existen se actualizan (una celda vacía no borra datos) y los nuevos entran aprobados pero ocultos, hasta completar la ficha con foto. Hay una plantilla para descargar. Las listas de Proveedores y de Asociados y profesionales tienen además su botón **Exportar**, que baja lo que se ve con el filtro actual.
- **Cuota para todos los que no tienen** (en Contabilidad): da de alta la cuota con la tarifa vigente a todos los de un tipo que no tienen, desde la fecha elegida y con o sin inscripción.

## Contabilidad (cuotas de asociados, proveedores y profesionales)

En `/admin/contabilidad`. No es público: lo ven los usuarios del panel y, cada uno lo suyo, los usuarios del portal.

- **Tarifas:** al pie de Contabilidad, la cuota e inscripción de cada tipo (asociados $ 37.500, proveedores $ 18.750; profesionales sin cargo por ahora, con el interruptor "Pagan cuota" apagado) y los datos para transferir que ven los usuarios. Se aplican a las altas nuevas: al aprobar un alta desde Altas se le crea la cuota con la tarifa de su tipo.
- **Alta manual:** al crear un proveedor desde el panel se carga su cuota (arranca con la tarifa). A quienes ya existían (por ejemplo, los asociados cargados antes del portal) se les da de alta la cuota desde Contabilidad.
- **Cuotas:** `pocketbase/pb_hooks/contabilidad.js` genera una por mes desde el mes del alta; vence el día elegido (en meses más cortos, el último día). Se generan con el cron diario de PocketBase y cada vez que se abre Contabilidad. Cambiar el monto o el día afecta solo a las cuotas que todavía no vencieron; una cuota puntual se puede ajustar a mano (por ejemplo, bonificarla).
- **Pagos:** el panel los registra con fecha, monto, medio y comprobante. Desde el portal, cada usuario **informa** su pago con el comprobante obligatorio: queda "a confirmar" y no cuenta hasta que el panel lo confirma (o lo rechaza con un motivo que el usuario ve). Los confirmados se imputan solos a las cuotas más viejas, así que sirven pagos parciales o de varios meses juntos.
- **Mora (suspensión automática):** si una cuota sigue impaga 1 mes y 10 días después de su vencimiento, la ficha se oculta de la web y el carnet pasa a "No vigente" (`oculto_mora`); se reactivan solos cuando se confirma el pago. No hay recargos.
- **Débito automático:** la colección `medios_debito` (CBU, Mercado Pago o tarjeta, con su id de mandato) y el campo `suscripciones.debito` quedan listos para integrarlo; todavía no se usa.

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