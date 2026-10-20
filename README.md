# Plataforma Inteligente de Turismo

Plataforma web que permite a turistas encontrar alojamientos mediante **búsqueda en lenguaje natural** asistida por inteligencia artificial.

## Arquitectura

```
Cliente Next.js (Frontend) ──> API NestJS (Backend)
                                    │
                                    ├── PostgreSQL + pgvector
                                    ├── Redis (caché/colas)
                                    ├── Cloudflare R2 (archivos)
                                    └── IA (Gemini/OpenAI/Claude)
```

## Requisitos

- Node.js 18+
- Docker y Docker Compose
- npm o yarn

## Instalación

### 1. Iniciar servicios base

```bash
docker compose up -d
```

Esto levanta PostgreSQL (con pgvector) y Redis.

### 2. Configurar variables de entorno

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Editar los archivos `.env` con tus credenciales de Supabase, R2, y API keys de IA.

### 3. Instalar dependencias

```bash
npm install
```

### 4. Configurar base de datos

```bash
cd backend
npx prisma migrate dev
npx prisma generate
npx prisma db seed
```

### 5. Iniciar desarrollo

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Swagger Docs: http://localhost:3001/api/docs

## Estructura del Proyecto

```
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── ai/                # Servicio de IA con adaptadores
│   │   │   └── adapters/      # Gemini, OpenAI, Claude
│   │   ├── auth/              # Autenticación Supabase
│   │   ├── properties/        # CRUD de propiedades
│   │   ├── search/            # Búsqueda inteligente
│   │   ├── ads/               # Anuncios y patrocinadores
│   │   ├── upload/            # Subida a R2
│   │   ├── prisma/            # Cliente Prisma
│   │   └── redis/             # Servicio de caché
│   └── prisma/
│       └── schema.prisma      # Modelo de datos
├── frontend/                   # Next.js App
│   ├── src/
│   │   ├── app/               # App Router
│   │   │   ├── search/        # Búsqueda
│   │   │   ├── property/      # Detalle propiedad
│   │   │   ├── auth/          # Login/Registro
│   │   │   └── admin/         # Panel administrativo
│   │   ├── lib/               # Helpers (API, Supabase)
│   │   └── types/             # Tipos TypeScript
│   └── tailwind.config.js
└── docker-compose.yml
```

## API Endpoints Principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/search` | Búsqueda inteligente |
| GET | `/api/properties` | Listar propiedades públicas |
| GET | `/api/properties/:slug` | Detalle propiedad |
| POST | `/api/auth/signin` | Iniciar sesión |
| POST | `/api/auth/signup` | Registrarse |
| GET | `/api/admin/properties` | CRUD propiedades (admin) |
| GET | `/api/admin/ai-providers` | Gestionar proveedores IA |
| GET | `/api/ads?placement=X` | Obtener anuncio activo |

## Motor de IA

La plataforma usa un patrón de **adaptadores intercambiables**:

1. **Gemini 1.5 Flash** (gratuito) - MVP inicial
2. **OpenAI GPT-4o** - Producción
3. **Claude 3.5 Sonnet** - Alternativa

Para cambiar de proveedor, solo activa una nueva API key en el panel admin.

## Seguridad

- API keys cifradas con AES-256-GCM
- Rate limiting en endpoints
- Autenticación JWT via Supabase
- CORS configurado

## PWA (app instalable)

El sitio es una **Progressive Web App**: se puede instalar desde el navegador (Chrome, Edge, Safari
en iOS: *Compartir → Añadir a pantalla de inicio*) y funciona sin conexión.

| Archivo | Función |
|---|---|
| `frontend/public/manifest.webmanifest` | Nombre, colores, iconos y accesos directos |
| `frontend/public/sw.js` | Service worker (caché y modo offline) |
| `frontend/public/offline.html` | Página offline estática (último recurso) |
| `frontend/public/icons/` | Iconos 192, 512, maskable y apple-touch-icon |
| `frontend/src/components/ServiceWorkerRegister.tsx` | Registro del service worker |
| `frontend/src/components/InstallPrompt.tsx` | Aviso para instalar la app |
| `frontend/src/app/offline/page.tsx` | Página `/offline` del sitio |

**Estrategias de caché:** navegación *red primero* (respaldo en caché → portada → `/offline.html`),
estáticos *caché primero*, API GET *red primero* con respaldo. Las escrituras (reservas, chat,
panel admin) **nunca** se cachean.

> **Al publicar cambios hay que subir la versión** en `frontend/public/sw.js`
> (`const VERSION = "v4"` → `"v5"`). Si no, los dispositivos con la app instalada seguirán
> sirviendo la versión anterior. El `activate` borra las cachés de versiones anteriores.

## Licencia

Privado - Tropical Biohostel
