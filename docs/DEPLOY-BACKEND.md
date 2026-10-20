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

## Scripts disponibles (en `backend/`)

| Comando | Qué hace |
|---|---|
| `npm run prisma:generate` | Regenera el cliente de Prisma |
| `npm run prisma:migrate` | Crea y aplica una migración nueva en desarrollo |
| `npm run prisma:deploy` | Aplica migraciones pendientes (producción) |
| `npm run prisma:baseline` | Registra `0_init` como aplicada si la base es preexistente |
| `npm run prisma:seed` | Siembra datos (idempotente). Funciona en Windows y Linux |
| `npm run prisma:seed:prod` | Igual, pero desde el JS compilado (sin `ts-node`) |

## Railway — aplicar el seed (las rutas del café)

El frontend ya está desplegado en Cloudflare Pages, pero la base de datos de **Railway** es otra
distinta a la local. Por eso las rutas del café todavía no existen en producción.

### Opción A — Desde la consola de Railway (recomendada)

Abrir el servicio del backend en el dashboard de Railway → **Shell** (o `railway ssh` desde local) y ejecutar:

```bash
cd /app
npx prisma migrate deploy      # aplica migraciones pendientes (0_init ya está baselinada)
node prisma/dist/seed.js       # siembra las 3 rutas del café
```

Salida esperada del seed:

```
   - 3 rutas del café creadas
ℹ️  La base de datos ya tiene datos. Seed omitido.
```

> `node prisma/dist/seed.js` usa el seed compilado a JS plano y no depende de `ts-node`.
> Si el build de la imagen aún no lo generó, sirve `npm run prisma:seed`.

### Opción B — Desde el equipo local

Con el `DATABASE_URL` de producción (Postgres de Railway):

```bash
cd backend
$env:DATABASE_URL="postgresql://..."   # en PowerShell
node -r ts-node/register prisma/seed.ts
```

## Verificación

```bash
# ¿La ruta existe en producción?
curl https://tropicalbiohostelweb-production.up.railway.app/api/properties/ruta-del-bosque-a-tu-taza
```

Si responde `200` con el JSON de la ruta, la base de producción ya está lista.

## Nota sobre `CredencialesAdmin.txt`

Ese archivo contiene credenciales reales (AWS, Resend, Groq, OpenAI, Deepseek, OpenRouter) y está
versionado en git. **No debería seguir ahí**: hay que sacarlo del seguimiento
(`git rm --cached CredencialesAdmin.txt`), añadirlo a `.gitignore` y **rotar todas las claves**.
