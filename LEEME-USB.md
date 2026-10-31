# TROPICAL BIOHOSTEL — Llevar el sitio en USB a otro computador

Sí se puede. Esta carpeta es autocontenida: con 2 programas instalados
y 2 doble-clics, el sitio corre en cualquier PC con Windows.

## Lo que necesitas en el otro computador

1. **Windows 10/11** (64 bits), ~3 GB libres y puertos 3000, 3001, 5433 y 6379 libres.
2. **Node.js 22 LTS**: https://nodejs.org (botón verde "LTS", instalar con todo por defecto).
3. **Docker Desktop**: https://www.docker.com/products/docker-desktop/
   instalar, abrirlo y esperar a que diga "Running" (el icono de la ballena
   deja de estar animado). Requiere internet la primera vez.
4. **Internet** solo la primera vez (descarga imágenes de Docker ≈ 500 MB).

## Qué copiar a la USB

Copia **toda esta carpeta** (`PlataformaInteligenteTurismo`).
Puedes excluir para ahorrar espacio (se regeneran solos):

- `frontend\.next\`
- `backend\dist\`

No borres `node_modules` (ahorran mucho tiempo), ni los `.env`.

## Puesta en marcha (solo la primera vez en cada PC)

1. Pega la carpeta desde la USB (ej: `Documentos\PlataformaInteligenteTurismo`).
2. Abre Docker Desktop y espera a que esté en "Running".
3. Doble clic en **`instalar.bat`** y espera a que termine
   (instala dependencias, crea la base de datos y carga los 44 sitios
   de ejemplo). Solo se hace una vez.

## Uso diario

- Doble clic en **`iniciar-tropical.bat`** → abre http://localhost:3000 solo.
- Doble clic en **`detener-tropical.bat`** → apaga todo al terminar.

## Datos útiles

- Admin: `admin@tropicalbiohostel.com`. La clave la genera el seed al instalar y
  queda anotada en `CredencialesAdmin.txt` (archivo local, 0600, nunca se sube a
  git). Ya no existe una clave de fabrica.
- Frontend: http://localhost:3000
- API + docs: http://localhost:3001/api/docs
- Los datos de ejemplo se recrean con `instalar.bat` si algo se daña.
  (Si quieres empezar de cero: borra los contenedores
  `turismo-pg` y `plataformainteligenteturismo-redis-1` desde Docker
  Desktop y vuelve a correr `instalar.bat`).

## Verlo desde fuera de tu casa (internet)

Doble clic en **`exponer-internet.bat`** (con el sitio ya corriendo).
Crea 2 túneles seguros Cloudflare (HTTPS, sin tocar el router) y te
muestra la URL pública para compartir. El PC debe quedar encendido.

- Las URLs de prueba cambian en cada ejecución.
- Para volver a modo local: cierra las ventanas `TROPICAL BIOHOSTEL Tunel-*`,
  corre `detener-tropical.bat` y luego `iniciar-tropical.bat`.
- Si lo dejas publicado, rotá la clave del admin antes de compartir la URL:
  `node bin\rotar-admin.js --aplicar` (la nueva queda en `CredencialesAdmin.txt`).

## Limitaciones

- El sitio corre en `localhost`: se ve en ese PC. Para verlo desde el
  celular u otro equipo de la misma red, avísame y te habilito el
  acceso por red.
- No saques la USB mientras corre: copia primero al disco, corre desde ahí.
- Los contenedores Docker y sus datos viven en cada PC (no viajan en
  la USB); por eso `instalar.bat` los crea de nuevo.
