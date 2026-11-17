#!/usr/bin/env bash
# Crea o resetea el acceso de administrador: el superusuario de PocketBase y el usuario del panel /admin
# (colección users, con admin = sí). Si el email ya existe, solo le cambia la contraseña.
# Se corre como root en el VPS:
#   bash /opt/caph/web/deploy/acceso-panel.sh
# Pide el email y la contraseña por teclado: no quedan guardados en ningún archivo.
set -euo pipefail

BASE=/opt/caph
PB="$BASE/pocketbase/pocketbase"
PB_URL=http://127.0.0.1:8091

[ "$(id -u)" = 0 ] || { echo "Correlo como root." >&2; exit 1; }
[ -x "$PB" ] || { echo "No encuentro PocketBase en $PB" >&2; exit 1; }

read -rp "Email: " CAPH_EMAIL
read -rsp "Contraseña nueva (mínimo 10 caracteres): " CAPH_PASS; echo
read -rsp "Repetila: " CAPH_PASS2; echo
[ "$CAPH_PASS" = "$CAPH_PASS2" ] || { echo "No coinciden." >&2; exit 1; }
[ ${#CAPH_PASS} -ge 10 ] || { echo "Tiene que tener al menos 10 caracteres." >&2; exit 1; }

# 1) Superusuario (dashboard de PocketBase)
sudo -u caph -H "$PB" superuser upsert "$CAPH_EMAIL" "$CAPH_PASS" --dir "$BASE/pocketbase/pb_data"

# 2) Usuario del panel, creado o actualizado con la API local usando ese superusuario
CAPH_EMAIL="$CAPH_EMAIL" CAPH_PASS="$CAPH_PASS" PB_URL="$PB_URL" python3 - <<'PY'
import json, os, urllib.parse, urllib.request

url, email, clave = os.environ["PB_URL"], os.environ["CAPH_EMAIL"], os.environ["CAPH_PASS"]

def pedir(metodo, ruta, datos=None, token=None):
    req = urllib.request.Request(url + ruta, method=metodo,
                                 data=json.dumps(datos).encode() if datos is not None else None,
                                 headers={"Content-Type": "application/json", **({"Authorization": token} if token else {})})
    with urllib.request.urlopen(req) as r:
        return json.load(r)

token = pedir("POST", "/api/collections/_superusers/auth-with-password",
              {"identity": email, "password": clave})["token"]
filtro = urllib.parse.quote(f'email = "{email}"')
existentes = pedir("GET", f"/api/collections/users/records?filter={filtro}", token=token)["items"]
datos = {"password": clave, "passwordConfirm": clave, "admin": True, "verified": True}
if existentes:
    pedir("PATCH", f"/api/collections/users/records/{existentes[0]['id']}", datos, token)
    print("Usuario del panel actualizado (contraseña nueva, admin).")
else:
    pedir("POST", "/api/collections/users/records", {**datos, "email": email, "name": "Administrador"}, token)
    print("Usuario del panel creado (admin).")
PY

echo "Listo: entrá a /admin con ese email y esa contraseña."
