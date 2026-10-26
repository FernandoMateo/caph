#!/usr/bin/env bash
# Actualiza el VPS a la última versión de main. Lo corre deploy/check-update.sh cuando hay
# commits nuevos (también se puede correr a mano: bash /opt/caph/web/deploy/deploy.sh).
# Todo va dentro de main() para que bash lea el script entero antes de que git lo reemplace.
set -euo pipefail

main() {
  local BASE=/opt/caph
  cd "$BASE/web"

  git fetch --quiet origin main
  git reset --hard origin/main

  npm ci --no-audit --no-fund
  npm run build

  # Migraciones de PocketBase: se aplican solas al reiniciar el servicio
  if ! diff -rq pocketbase/pb_migrations "$BASE/pocketbase/pb_migrations" >/dev/null 2>&1; then
    rsync -a --delete pocketbase/pb_migrations/ "$BASE/pocketbase/pb_migrations/"
    if systemctl is-enabled --quiet caph-pocketbase; then sudo -n systemctl restart caph-pocketbase; fi
  fi

  if systemctl is-enabled --quiet caph-web; then sudo -n systemctl restart caph-web; fi
  echo "Desplegado $(git rev-parse --short HEAD)"
}

main "$@"
