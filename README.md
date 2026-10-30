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

## Contenido y fotos

El sitio tiene una **biblioteca de contenido** en `frontend/src/lib/contenido.ts` (textos en español e
inglés de cada sección) y una **galería real de la finca** en `frontend/public/fotos/sitio/`
(fotografías propias de Tropical Biohostel: café, huerta, frutales, cocina, personas y naturaleza).

| Página | Contenido |
|---|---|
| `/` | Portada con fotos reales de territorio, hospedaje, gastronomía, experiencias y bienestar |
| `/territorio` | Bosque nativo, cultivos, frutales, huerta, fauna |
| `/gastronomia` | Del territorio a la mesa, con la cocina y los postres de la finca |
| `/cosmic-bungalo` | El refugio, su arquitectura y el precio del Bungalow |
| `/rutas` | Las tres rutas del café (Del bosque a tu taza, Respira el bosque, Café y raíces colombianas) |
| `/fical-y-el-cafe` | La historia de la abuela: del fruto a la taza, paso a paso |
| `/bienestar` | Yoga, Chi Kung y Tai Chi en el bosque |
| `/experiencias` | Catálogo de experiencias y actividades |

> La carpeta `ImagenesSitio/` es material de trabajo del usuario y **no se sube al repositorio**
> (está en `.gitignore`). Las fotos que el sitio usa viven en `frontend/public/fotos/sitio/`.

## Manejo de Imagen Tropical Biohostel

El **Manual de Identidad Visual v1.0 (Octubre 2026)** está en
[`docs/Manual-de-Imagen-Tropical-Biohostel.html`](docs/Manual-de-Imagen-Tropical-Biohostel.html):
un HTML autocontenido —se abre directo en el navegador, sin build— con sidebar, muestras de
color copiables al portapapeles y mockups de aplicación. Usa Tailwind y las tipografías desde CDN,
así que necesita internet la primera vez.

| § | Sección | Qué fija |
|---|---|---|
| 01–02 | Inicio · Filosofía | Manifiesto, promesa ("Donde el café comienza y el ruido termina"), arquetipos Creador + Explorador, los 5 pilares (Raíz, Calma, Comunidad, Autenticidad, Regeneración) |
| 03 | Logotipo | Isotipo en SVG: círculo (comunidad) + montaña (geografía) + hoja de café (origen); versión clara, versión sobre fondo bosque y 4 versiones reducidas, con area de respeto y tamaños mínimos |
| 04 | Paleta Cromática | 8 colores con HEX y RGB, uso permitido y proporción 60/30/10 |
| 05 | Tipografía | Familia por rol y jerarquía web |
| 06 | Fotografía | Luz natural cálida y profundidad sutil; reglas de postproducción y qué nunca fotografiar |
| 07 | Iconografía | Set de 10 iconos de línea, trazo 1.5 px sobre retícula 24×24 |
| 08 | Elementos Gráficos | Patrones (hojas, topografía, papel) y texturas (madera, lino, barro, musgo) |
| 09 | Tono de Voz | Vocabulario permitido y prohibido, ejemplos de publicación y hashtags oficiales |
| 10 | Aplicaciones | Tarjeta, sobre, factura, posts e historias, taza, bolsa de café, libreta |
| 11 | Do's & Don'ts | Usos correctos y errores frecuentes de marca |
| 12 | Gobernanza | Custodios, ciclo de revisión y archivos de entrega |

**Paleta** (variables CSS del manual, reutilizables en el sitio). La proporción de uso es
**60 % neutros / 30 % primarios / 10 % secundarios**:

| Token | HEX | Nombre · Uso del manual |
|---|---|---|
| `--bosque` | `#1F3D2B` | Bosque Profundo — color principal, títulos, acentos fuertes |
| `--cafe` | `#6B4423` | Cáscara de Café — acento cálido, detalles, iconografía |
| `--sol` | `#E8A94A` | Sol de Nocaima — CTAs, highlights, energía |
| `--hoja` | `#8FB573` | Hoja Nueva — ilustraciones, elementos orgánicos |
| `--tierra` | `#3E2F23` | Tierra Húmeda — textos secundarios, fondos cálidos |
| `--crema` | `#F5EFE0` | Crema de Leche — fondos principales |
| `--piedra` | `#D4C9B0` | Piedra de Río — separadores, bordes |
| `--carbon` | `#2A241E` | Carbón Suave — texto principal |

**Tipografía:** `Fraunces` (display, serif) para títulos, `Inter` para texto y botones,
`Caveat` (manuscrita) para notas de la finca y frases de marca. Jerarquía web: H1 64/600,
H2 48/400, H3 32/400 en Fraunces; Body 18/400, Caption 14/400, Button 16/500 en Inter.

**Gobernanza:** toda desviación del manual la aprueban por escrito los dos custodios (socio
tecnológico + operadores); revisión mayor anual en octubre, menores cada 6 meses. El pie del
manual lo marca *"Documento confidencial · Uso interno y de partners autorizados"* — como el
repositorio es público, publicar este archivo queda a criterio de Miguel.

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
> (`const VERSION = "v7"` → `"v8"`). Si no, los dispositivos con la app instalada seguirán
> sirviendo la versión anterior. El `activate` borra las cachés de versiones anteriores.

## Licencia

Privado - Tropical Biohostel
