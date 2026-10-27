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

  # Migraciones y hooks de PocketBase: se aplican al reiniciar el servicio
  local pb_cambio=0
  for dir in pb_migrations pb_hooks; do
    if ! diff -rq "pocketbase/$dir" "$BASE/pocketbase/$dir" >/dev/null 2>&1; then
      mkdir -p "$BASE/pocketbase/$dir"
      rsync -a --delete "pocketbase/$dir/" "$BASE/pocketbase/$dir/"
      pb_cambio=1
    fi
  done
  if [ "$pb_cambio" = 1 ] && systemctl is-enabled --quiet caph-pocketbase; then sudo -n systemctl restart caph-pocketbase; fi

  if systemctl is-enabled --quiet caph-web; then sudo -n systemctl restart caph-web; fi
  echo "Desplegado $(git rev-parse --short HEAD)"
}

main "$@"
