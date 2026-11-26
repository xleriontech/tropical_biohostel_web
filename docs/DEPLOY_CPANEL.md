# Despliegue en cPanel (hosting compartido)

Servidor destino (referencia): cPanel 138, Apache 2.4.71, MariaDB 11.4, AlmaLinux x86_64, sin servicio Node.js expuesto.

## 1. Diagnóstico rápido

| Parte | Stack actual | Compatibilidad cPanel |
|---|---|---|
| Frontend | Next.js 15 (App Router), React 18 | **Parcial**: requiere Node.js para SSR o export estático |
| Backend | NestJS + Prisma | **No directo**: requiere Node.js |
| BD | Prisma `provider=postgresql` | **Incompatible**: el servidor ofrece MariaDB/MySQL, no PostgreSQL |

> Conclusión: no se puede subir tal cual a un hosting cPanel “solo Apache/PHP”. Hay que elegir una de las estrategias de abajo.

## 2. Estrategias recomendadas

### Opción A (recomendada): Frontend en cPanel + Backend en servicio Node
- **Frontend**: build estático o Node app en cPanel si el plan tiene “Setup Node.js App”.
- **Backend**: desplegar en un servicio con Node.js (VPS, Railway, Render, Fly.io, etc.).
- **BD**: PostgreSQL administrado (Supabase/Neon/RDS) **o** migrar Prisma a MySQL/MariaDB.

### Opción B: Todo en un VPS
Si necesitas control total (Node + PostgreSQL + Nginx), un VPS evita las limitaciones de hosting compartido.

### Opción C: Solo frontend estático en cPanel
Funciona solo para páginas que no dependan de datos en tiempo real del backend. Las rutas que hacen `fetch` a la API mostrarán estados vacíos/errores si no hay backend.

## 3. Frontend en cPanel

### 3.1 Si cPanel tiene “Setup Node.js App” (Passenger)
1. En cPanel > Setup Node.js App, crea una app con Node 18/20+.
2. Sube `frontend/` (sin `node_modules`).
3. Variables de entorno:
   - `NEXT_PUBLIC_API_URL=https://api.tu-dominio.com/api`
   - `NODE_ENV=production`
4. Comando build: `npm ci && npm run build`
5. Comando start: `npm run start`
6. Verifica que Apache haga proxy al puerto de la app (cPanel lo configura normalmente).

> Nota: `next.config.js` usa `redirects()` y `headers()`, que requieren servidor Node/Edge. No uses `output: 'export'` en este modo.

### 3.2 Si NO hay Node.js (solo Apache estático)
1. Quita `runtime = "edge"` de páginas/layout si aún existe (ya se quitó de las client pages).
2. En `next.config.js` añade temporalmente `output: 'export'` y `images: { unoptimized: true }`.
3. `npm ci && npm run build` genera `out/`.
4. Sube el contenido de `out/` a `public_html/`.
5. Copia `public/.htaccess` a `public_html/.htaccess`.

Limitaciones del export estático:
- No hay SSR/ISR/API routes.
- `redirects()` y `headers()` de `next.config.js` no se aplican; usa `.htaccess`.
- Rutas dinámicas (`/property/[slug]`, `/donaciones/[slug]`) necesitan `generateStaticParams()` o cambiar a `use client` + fetch.
- El backend debe estar accesible públicamente por CORS/HTTPS.

## 4. Backend (NestJS + Prisma)

cPanel compartido no es adecuado para NestJS en producción salvo que tenga Node.js App. Recomendación: desplegar backend en un VPS/servicio Node.

### Variables mínimas
- `DATABASE_URL` (Postgres o MySQL según decidas)
- `JWT_SECRET`
- `PORT`
- `CORS_ORIGIN=https://tu-dominio.com`

### BD: PostgreSQL vs MariaDB
El schema actual usa `provider = "postgresql"`. El servidor cPanel ofrece MariaDB 11.4. Opciones:
- **Mantener Postgres**: alojar DB en Supabase/Neon/Railway y apuntar `DATABASE_URL`.
- **Migrar a MariaDB/MySQL**: cambiar `provider = "mysql"` en Prisma, revisar tipos incompatibles (`Json`, `String[]`, `Decimal`, enums, `@db.Decimal`, etc.), regenerar migraciones. Esto es un cambio no trivial.

## 5. Checklist antes de subir

- [ ] Definir dominio frontend y dominio/URL API.
- [ ] Configurar `NEXT_PUBLIC_API_URL` con HTTPS.
- [ ] Habilitar CORS en backend para el dominio frontend.
- [ ] Certificado SSL (AutoSSL en cPanel) para frontend y API.
- [ ] Revisar que `NEXT_PUBLIC_*` no contengan secretos.
- [ ] Probar build local: `cd frontend && npm ci && npm run build`.
- [ ] Si se usa export estático, validar rutas dinámicas y 404.
- [ ] Configurar backups de BD (JetBackup está instalado en el servidor, pero confirma cobertura de BD externa si usas Postgres administrado).

## 6. Ajustes ya aplicados en este repo

- Se quitó `runtime = "edge"` de páginas client (`categoria/[tipo]`, `donaciones/[slug]`, `admin/properties/[id]`) para mejorar compatibilidad con Node/estático.
- Se dejó comentado `runtime = "edge"` en `layout.tsx` y `property/[slug]/page.tsx`; descomentar solo para Cloudflare Pages.
- Se agregó `frontend/public/.htaccess` base para Apache (caché/SPA fallback). Ajustar según modo de despliegue.