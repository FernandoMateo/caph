#!/usr/bin/env bash
# Lo corre cron cada minuto en el VPS: si main tiene commits nuevos en GitHub, despliega.
# Se activa con deploy/install-cron.sh.
set -euo pipefail

cd /opt/caph/web
git fetch --quiet origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "== $(date '+%F %T') nueva versión $(git rev-parse --short origin/main)"
  bash deploy/deploy.sh
fi
