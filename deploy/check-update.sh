#!/usr/bin/env bash
# Lo corre cron cada minuto en el VPS: si main tiene commits nuevos en GitHub, despliega.
# Instalado con: (crontab -l; echo '* * * * * flock -n /tmp/caph-deploy.lock bash /opt/caph/web/deploy/check-update.sh >> /opt/caph/deploy.log 2>&1') | crontab -
set -euo pipefail

cd /opt/caph/web
git fetch --quiet origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "== $(date '+%F %T') nueva versión $(git rev-parse --short origin/main)"
  bash deploy/deploy.sh
fi
