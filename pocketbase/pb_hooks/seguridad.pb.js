/// <reference path="../pb_data/types.d.ts" />

// Ajustes de seguridad del servidor. Se aplican en cada arranque solo si el servicio tiene CAPH_PRODUCCION=1
// (lo pone deploy/setup-vps.sh). En local no hacen falta, y fuera del proxy de producción la IP real del
// visitante no llega bien: con límites activos, todos contarían como el mismo visitante.
// - Límites de intentos por IP: login, recuperar contraseña y altas desde la web.
// - IP real del visitante: la manda Caddy en X-Forwarded-For (se toma la última, que es la que agrega Caddy).
// - Backup automático todos los días a las 04:30, se guardan los últimos 14 (pb_data/backups).

onBootstrap((e) => {
  e.next();
  if ($os.getenv("CAPH_PRODUCCION") !== "1") return;
  try {
    const s = e.app.settings();
    s.trustedProxy.headers = ["X-Forwarded-For"];
    s.trustedProxy.useLeftmostIP = false;
    s.rateLimits.enabled = true;
    s.rateLimits.rules = [
      // login del panel y del portal: 10 intentos por minuto por IP
      { label: "*:auth", maxRequests: 10, duration: 60 },
      { label: "*:requestPasswordReset", maxRequests: 3, duration: 300 },
      { label: "*:requestVerification", maxRequests: 3, duration: 300 },
      { label: "*:requestEmailChange", maxRequests: 3, duration: 300 },
      // altas desde la web (cuentas nuevas): 5 cada 10 minutos por IP
      { label: "cuentas:create", maxRequests: 5, duration: 600, audience: "@guest" },
      { label: "/api/batch", maxRequests: 3, duration: 1 },
      // Sin límite general de /api/: la web lee el contenido desde el mismo servidor (127.0.0.1) para todos
      // los visitantes, y la importación masiva del panel crea muchos registros seguidos.
    ];
    s.backups.cron = "30 4 * * *";
    s.backups.cronMaxKeep = 14;
    e.app.save(s);
    console.log("seguridad: límites de intentos y backups diarios activos");
  } catch (err) {
    // nunca impedir que el servidor arranque por esto
    console.log("seguridad: no se pudieron aplicar los ajustes: " + err);
  }
});
