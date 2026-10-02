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

## Licencia

Privado - Tropical Biohostel
