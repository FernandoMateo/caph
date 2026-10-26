#!/usr/bin/env bash
# Activa la actualización automática: agrega al crontab del usuario actual una línea que
# corre deploy/check-update.sh cada minuto. Se puede correr varias veces sin duplicarla.
set -euo pipefail

LINE='* * * * * flock -n /tmp/caph-deploy.lock bash /opt/caph/web/deploy/check-update.sh >> /opt/caph/deploy.log 2>&1'
{ crontab -l 2>/dev/null | grep -v 'check-update.sh' || true; echo "$LINE"; } | crontab -
crontab -l | grep -q 'check-update.sh' && echo AUTO_DEPLOY_ACTIVADO
