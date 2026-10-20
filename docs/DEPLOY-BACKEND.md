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

Ese archivo contiene credenciales reales (AWS, Resend, Groq, OpenAI, Deepseek, OpenRouter) y está
versionado en git. **No debería seguir ahí**: hay que sacarlo del seguimiento
(`git rm --cached CredencialesAdmin.txt`), añadirlo a `.gitignore` y **rotar todas las claves**.
