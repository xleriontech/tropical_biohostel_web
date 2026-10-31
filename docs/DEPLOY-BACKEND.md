# Despliegue del backend y esquema de base de datos

## Situación actual

El esquema de la base de datos **nació aplicado a mano** (`backend/prisma/init.sql`, que ya está
desactualizado: solo define 3 de los 8 tipos de propiedad). Por eso el proyecto no tenía historial
de migraciones de Prisma y `prisma migrate deploy` fallaba con `P3005`.

Se resolvió así:

| Archivo | Función |
|---|---|
| `backend/prisma/migrations/0_init/migration.sql` | Migración base generada desde `schema.prisma` (563 líneas) |
| `backend/prisma/migrations/migration_lock.toml` | Lock file de Prisma |
| `backend/prisma/baseline.js` | Marca `0_init` como **aplicada** en bases preexistentes, sin ejecutar su SQL |

`backend/Dockerfile` ejecuta en cada build:

```dockerfile
RUN node prisma/baseline.js      || echo "…omitido…"
RUN npx prisma migrate deploy    || echo "…omitido…"
```

Ambos pasos son **tolerantes**: si la base no es accesible durante el build, el despliegue **no**
se rompe (se aplican después con `npm run prisma:deploy`).

> `backend/prisma/init.sql` queda obsoleto: el esquema real ya es `schema.prisma` + la migración `0_init`.

## Arranque automático (baseline + migraciones + seed)

`backend/scripts/start.js` es el entrypoint del backend. Antes de levantar la API se asegura
que la base de datos esté lista:

1. **baseline** → registra la migración inicial en bases preexistentes (sin ejecutar su SQL)
2. **migrate deploy** → aplica las migraciones pendientes (crea el esquema si falta)
3. **seed** → inserta los datos base del catálogo (hostal, actividades, **rutas del café**…)

Los tres pasos son **idempotentes** y **tolerantes a fallos**: si la base no responde se reintenta
5 veces y la API arranca igual, de modo que un arranque nunca se rompe por un problema puntual de
conectividad. Si una corrida de seed se interrumpe a mitad, la siguiente completa lo que falte.

Se usa en el `Dockerfile` (`CMD ["node", "scripts/start.js"]`) y en los scripts de npm
(`npm start` / `npm run start:prod`), así que funciona igual con Docker o Nixpacks.

> Esto significa que **no hay que ejecutar el seed a mano** en cada despliegue: al arrancar el
> contenedor, las rutas del café aparecen solas en la base de datos.

## Scripts disponibles (en `backend/`)

| Comando | Qué hace |
|---|---|
| `npm start` / `npm run start:prod` | Arranque: baseline + migraciones + seed + API |
| `npm run prisma:generate` | Regenera el cliente de Prisma |
| `npm run prisma:migrate` | Crea y aplica una migración nueva en desarrollo |
| `npm run prisma:deploy` | Aplica migraciones pendientes (producción) |
| `npm run prisma:baseline` | Registra `0_init` como aplicada si la base es preexistente |
| `npm run prisma:seed` | Siembra datos (idempotente). Funciona en Windows y Linux |
| `npm run prisma:seed:prod` | Igual, pero desde el JS compilado (sin `ts-node`) |

## Railway — verificar que las rutas están en producción

El push a `main` dispara el build en Railway. Al arrancar el contenedor, el seed aplica las
rutas del café automáticamente. Para comprobarlo:

```bash
curl https://tropicalbiohostelweb-production.up.railway.app/api/properties/ruta-del-bosque-a-tu-taza
```

Debe responder `200` con el JSON de la ruta. Si aún responde `404`, revisa los logs del servicio
en Railway: debería aparecer `3 rutas del café creadas` o `rutas del café ya presentes`.

Si aun así hiciera falta aplicarlo a mano, desde el shell del servicio:

```bash
cd /app
npx prisma migrate deploy
node prisma/dist/seed.js
```

## Nota sobre `CredencialesAdmin.txt`

Ese archivo contiene credenciales reales (AWS, Resend, Groq, OpenAI, DeepSeek, OpenRouter). Ya no
está en el índice ni en el historial (salió del seguimiento con el mensaje `chore: deja de
versionar CredencialesAdmin.txt` y se purgó del historial el 2026-10-30 con `git filter-repo`),
pero **eso no las hace seguras**: el repositorio fue público con esas claves vivas, así que cada
una de ellas sigue pendiente de rotar en su proveedor. El archivo queda como nota local (0600) y
debería migrar a un gestor de contraseñas.

## Claves de entorno que no van en el repositorio

Tres familias de secretos, tres orígenes distintos. Ninguno se copia ya de
`.env.example` con valores reales:

| Variable | Dónde vive | Quién la genera |
| --- | --- | --- |
| `TURISMO_PG_PASSWORD`, `REDIS_PASSWORD` | `.env` (raíz, sin versionar) | `node bin/credenciales.js` |
| `AI_MASTER_KEY` | `.env` de cada entorno | `openssl rand -base64 48` |
| `ADMIN_PASSWORD` | panel de Railway | uno mismo, o `node bin/rotar-admin.js --aplicar` |
| LLM, R2, Google, pasarelas | panel de Railway / `ClaveApi` cifrada | el proveedor |

El seed ya no pone clave de fábrica en el `/admin`. Con `ADMIN_PASSWORD` definida
la usa; en local, sin definirla, genera una legible y la anota en
`CredencialesAdmin.txt` (por eso `arrancar-db.bat` y `instalar.bat` funcionan sin
configure nada). En un contenedor no hay repo donde anotar nada: sin
`ADMIN_PASSWORD` el seed avisa `SIN ADMIN` y deja la base sin administrador, que
es lo que debe pasar en un despliegue.

`arrancar-db.bat` publica Postgres y Redis solo en `127.0.0.1` y exige
autenticación en Redis. Si un contenedor `tropical-redis-1` ya existía sin
`--requirepass`, el script lo recrea: en Redis únicamente hay caché y sesiones
de Nati, no datos de negocio.

### Cambiar `AI_MASTER_KEY`

Cifra las API keys de los proveedores guardadas en la base
(`backend/src/ai/ai.service.ts`, AES-256-CBC). No es una variable que se pueda
rotar a mitad de camino:

1. Cifrar de nuevo las filas de `APIKey` y `ClaveApi` con la clave **anterior**.
2. Cambiar la clave del entorno.
3. Re-cifrar con la nueva.

Sin el paso 1, `decrypt()` falla y la app se queda sin proveedor de IA.
`decrypt()` devuelve el texto tal cual cuando no trae el formato `iv:hex`, así
que conviene auditar si hay filas ya en claro antes de tocar nada.

En el entorno local hay dos valores distintos conviviendo: la raíz `.env` tiene
una clave de 33 caracteres y `backend/.env` una de 55. Como el backend arranca
desde `backend/`, la que usa la aplicación es la de 55; la otra solo la leerían
las herramientas ejecutadas desde la raíz. Unificarlas es parte de la rotación.
