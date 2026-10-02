# TROPICAL BIOHOSTEL — Descripción Técnica de la Plataforma

**Eco-hostel · Naturaleza, descanso y aventura (Cundinamarca, Colombia)**
Documento técnico y comercial para inversionistas · Septiembre 2026 · Versión 1.0

---

## 1. Resumen ejecutivo

TROPICAL BIOHOSTEL es un marketplace turístico municipal de propiedad pública que conecta visitantes con la
oferta real de Nocaima: hospedajes, restaurantes, bares, fincas y actividades. A diferencia de
directorios estáticos o de las OTAs globales (Booking, Airbnb), TROPICAL BIOHOSTEL combina tres activos
diferenciales:

1. **Búsqueda en lenguaje natural** — el visitante describe su plan ("glamping romántico para 2
   con mascota") y la plataforma filtra por 22 descriptores, 16 actividades, presupuesto en COP,
   capacidad y ubicación.
2. **Nati, asistente conversacional con IA** — guía virtual con memoria de conversación (24 h),
   clave de IA propia e independiente, y motor local de respaldo que funciona sin internet ni claves.
3. **Motor anti-doble-reserva** — validación de solapes en tiempo real + sincronización iCal con
   Airbnb/Booking + calendario ICS público por propiedad.

**Estado actual:** producto funcional y verificado, con 45 sitios turísticos cargados, panel
administrativo completo y despliegue portátil (USB + Docker + túneles seguros).

---

## 2. Arquitectura del sistema

```
┌─────────────────────────────┐      ┌─────────────────────────────┐
│  FRONTEND (Next.js 15)      │      │  BACKEND (NestJS / Node 22) │
│  Puerto 3000                │◄────►│  Puerto 3001 (/api)         │
│  React + TypeScript         │ REST │  17 módulos independientes  │
│  Responsive + 11 temas      │      │  API documentada (Swagger)  │
└─────────────────────────────┘      └──────────────┬──────────────┘
                                                    │
                        ┌───────────────────────────┼───────────────────────────┐
                        │                           │                           │
              ┌─────────▼─────────┐       ┌─────────▼─────────┐       ┌─────────▼─────────┐
              │ PostgreSQL 16     │       │ Redis 7           │       │ Proveedores IA    │
              │ + pgvector        │       │ caché + sesiones  │       │ Gemini / OpenAI / │
              │ Puerto 5433       │       │ Puerto 6379       │       │ Claude (AES-256)  │
              └───────────────────┘       └───────────────────┘       └───────────────────┘
```

| Capa | Tecnología | Observaciones |
|---|---|---|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS, lucide-react | Renderizado híbrido, PWA-ready, 100 % responsive |
| Backend | NestJS 10, Node.js 22, Prisma 5.22 | Arquitectura modular, Swagger en `/api/docs` |
| Base de datos | PostgreSQL 16 + pgvector (Docker) | Búsqueda vectorial/semántica habilitada |
| Caché y sesiones | Redis 7 (Docker) | Sesiones de chat con TTL de 24 h |
| IA | Gemini 2.0 Flash / OpenAI / Claude / compatibles OpenAI | Claves cifradas AES-256, motor local de respaldo |
| Infraestructura | Docker Compose, Cloudflare Tunnel, scripts `.bat` portátiles | Instalación USB, vigía automático cada 5 min |
| Medios | Upload local + Cloudflare R2, validación HEAD/GET de imágenes | `SafeImage` con fallback elegante ante enlaces muertos |

---

## 3. Catálogo de módulos

### 3.1. Catálogo de sitios turísticos (45 activos)
- 8 tipos: hotel, hostal, glamping, centro turístico, restaurante, bar, finca y actividad.
- Ficha completa: galerías, descripción, ubicación, precios en COP, servicios, mascotas, capacidad.
- Categorías públicas (`/categoria/[tipo]`), detalle (`/sitios/[slug]`), favoritos (`/guardados`).
- **Valor de desarrollo:** $14,4M COP.

### 3.2. Búsqueda inteligente
- Filtro multi-descriptor: 22 palabras clave, 16 actividades, presupuesto COP, huéspedes,
  mascotas, seguro, ubicación (normalización con/sin tildes).
- Cuestionario contextual por tipo de plan, persistencia en `localStorage`, % de compatibilidad
  con motivos explicados.
- **Valor de desarrollo:** $12,0M COP. Comparable internacional: USD 15.000–40.000.

### 3.3. Nati — asistente conversacional con IA
- Memoria de conversación por sesión (tipo, presupuesto, acompañantes, mascota, actividad).
- Seguimiento de pregunta (`askedSlot`): entiende respuestas cortas ("sí", "2", "150 mil",
  "glamping") en contexto; jamás repite preguntas ya respondidas.
- Guardia de alcance: solo Tropical Biohostel; redirige con amabilidad cualquier otro tema.
- Respuestas con tarjetas (foto, precio, enlace directo a reservar) y sugerencias contextuales.
- Clave de IA propia e independiente (admin → Proveedores de IA → "Usar para Nati"); sin clave,
  responde con su motor local.
- Widget flotante disponible en todas las páginas.
- **Valor de desarrollo:** $10,8M COP. Comparable internacional: USD 15.000–35.000.

### 3.4. Reservas con anti-doble-reserva
- Validación de solapes con respuesta HTTP 409 ante conflicto.
- Importación iCal (URLs de Airbnb/Booking) con sincronización programada.
- Calendario de disponibilidad en tiempo real y ICS público por propiedad (`/calendar/:slug`).
- Flujo de reserva guiado (`BookingModal` con validaciones).
- **Valor de desarrollo:** $14,4M COP. Comparable internacional: USD 10.000–25.000.

### 3.5. Ingestión y alimentación de oferta
- Carga masiva JSON/CSV/texto libre (con IA) desde el panel.
- Scraping OpenStreetMap (Nominatim + Overpass con reintentos) y enriquecimiento web
  (JSON-LD/OpenGraph, clasificación automática, validación de imágenes).
- Integración Google Places (API New) y verificación diaria con registro de actualizaciones.
- **Valor de desarrollo:** $13,2M COP.

### 3.6. Panel administrativo
- Gestión de propiedades, reservas, alimentación, claves API, proveedores de IA, anuncios/
  patrocinios y configuración del sitio (marca, logo, temas).
- Acceso: `admin@tropicalbiohostel.com` (credenciales bajo custodia de la Alcaldía).
- **Valor de desarrollo:** $15,6M COP. Comparable internacional: USD 8.000–20.000.

### 3.7. Opiniones y reputación
- Reseñas por propiedad, ranking top-rated automático y widgets de reseñas.
- **Valor de desarrollo:** $4,8M COP. Comparable internacional: USD 5.000–10.000.

### 3.8. Monetización integrada
- Carrusel de anuncios, listings patrocinados y módulo de sponsors con facturación base.
- **Valor de desarrollo:** $4,8M COP.

### 3.9. Plataforma base y transversal
- Autenticación JWT con roles, CORS flexible (LAN + túneles), notificaciones (WhatsApp/email),
  conversor de moneda, subidas R2/local, calendario iCal, 11 temas visuales, diseño responsive,
  scripts de instalación/operación USB, documentación.
- **Valor de desarrollo:** $45,6M COP.

> **Valor total de desarrollo (costo de reposición, casa de software Colombia @ $120.000/hora):**
> **≈ $135,6 millones COP** (~1.130 horas senior full-stack).

---

## 4. Datos y validación técnica

| Indicador | Valor |
|---|---|
| Sitios turísticos cargados y verificados | 45 |
| Módulos backend independientes | 17 |
| Compilación backend (`tsc`) | Limpia, 0 errores |
| Compilación frontend (`next build`) | Exitosa |
| Pruebas de conversación multi-turno (Nati) | Superadas (saludo, filtros, reserva, fuera de tema) |
| Pruebas de ingestión y enriquecimiento | Superadas (OSM, Yagüari, La Gregorienne) |
| Auditoría de imágenes | 100 % del catálogo verificado |
| Verificación en navegador automatizada | Sin errores de consola propios |

---

## 5. Modelo de negocio e ingresos proyectados

| Línea de ingreso | Detalle | Referencia de mercado |
|---|---|---|
| Comisión por reserva | 8–12 % por transacción | Booking cobra 15–20 % |
| Suscripción de prestadores | $49.000–99.000/mes por sitio destacado | eBiz PMS: $230.000–395.000/mes |
| Pauta local | Carrusel, home y categorías | — |
| Réplica SaaS a otros municipios | Licencia $25–40M + soporte $1,5M/mes | 1.100+ municipios en Colombia |
| Inteligencia para gobierno | Reportes de ocupación y flujo turístico | Convenios interadministrativos |

**Escenario conservador (año 2):** 3 municipios + 150 prestadores con suscripción media de
$69.000 → ~$124M/año en suscripciones, más comisiones y pauta.

---

## 6. Costos de implementación por municipio

| Concepto | Tipo | Valor |
|---|---|---|
| Instalación, configuración y carga inicial (hasta 60 sitios) | Único | $8–12M |
| Capacitación a funcionarios y prestadores | Único | $2–3M |
| VPS + dominio + respaldos | Mensual | ~$80.000 |
| APIs (Google Places + LLM, uso moderado) | Mensual | $100.000–300.000 |
| Soporte, monitoreo y evolución | Mensual | $1,5–2,5M |
| **Total estimado año 1** | | **$30–45M** |

---

## 7. Roadmap de inversión

| Fase | Alcance | Costo | Tiempo |
|---|---|---|---|
| **Actual (entregada)** | Plataforma funcional, 45 sitios, IA operativa | — | — |
| Fase 2 | Pagos PSE/tarjeta, facturación electrónica, app móvil liviana | $25M | 2 meses |
| Fase 3 | Channel manager (Booking/Airbnb), multi-municipio, analítica avanzada | $40M | 3 meses |

---

## 8. Propuesta al inversionista

- **Valor de la plataforma hoy:** $135M (reposición) · $180–220M llave en mano.
- **Inversión buscada:** **$65M por 15–20 % de participación** en la sociedad operadora.
- **Uso de fondos:** Fase 2 ($25M) + piloto comercial en 3 municipios ($25M) + equipo comercial
  y soporte ($15M).
- **Punto de equilibrio estimado:** mes 10 con 3 municipios y 150 prestadores pagos.
- **Ventaja competitiva:** primer marketplace turístico municipal con IA conversacional en
  Colombia; costo de réplica para un competidor: mínimo $135M y 8–10 meses.

---

## 9. Contacto y custodia

- **Titular del proyecto:** Tropical Biohostel — Secretaría de Turismo.
- **Activos entregables:** código fuente completo, base de datos, credenciales, documentación
  operativa (LEEME-USB), scripts de instalación y marca TROPICAL BIOHOSTEL.
- **Propiedad intelectual:** el software se entrega con licencia de uso y explotación a favor
  del inversionista/operador según acuerdo de inversión.

*Documento generado a partir del código fuente verificado del proyecto. Cifras en pesos
colombianos (COP), TRM de referencia $4.000/USD. Septiembre 2026.*
