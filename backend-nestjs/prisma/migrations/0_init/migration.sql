-- CreateEnum
CREATE TYPE "TipoPropiedad" AS ENUM ('hotel', 'hostal', 'centro_turistico', 'glamping', 'restaurante', 'bar', 'finca', 'actividad');

-- CreateEnum
CREATE TYPE "EstadoPropiedad" AS ENUM ('BORRADOR', 'PUBLICADO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "PlacementType" AS ENUM ('HOME_BANNER', 'SEARCH_RESULTS_TOP', 'SEARCH_RESULTS_SIDEBAR', 'PROPERTY_DETAIL');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('turista', 'propietario', 'admin');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('TARJETA', 'EFECTIVO');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "EstadoProyectoDonacion" AS ENUM ('ACTIVO', 'PAUSADO', 'COMPLETADO');

-- CreateEnum
CREATE TYPE "CategoriaProyecto" AS ENUM ('ARBOLES', 'CARBONO', 'GENERAL');

-- CreateEnum
CREATE TYPE "EstadoDonacion" AS ENUM ('PENDIENTE', 'APROBADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoDocumento" AS ENUM ('PROCESANDO', 'LISTO', 'ERROR');

-- CreateEnum
CREATE TYPE "TipoComida" AS ENUM ('DESAYUNO', 'ALMUERZO', 'CENA', 'MERIENDA', 'CAFETERIA', 'OTRO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'turista',
    "supabaseId" TEXT NOT NULL,
    "passwordHash" TEXT,
    "bannedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Propiedad" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoPropiedad" NOT NULL,
    "descripcion" TEXT,
    "ubicacion" TEXT,
    "coordenadas" JSONB,
    "telefono" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "direccion" TEXT,
    "ciudad" TEXT,
    "departamento" TEXT,
    "estrellas" INTEGER NOT NULL DEFAULT 0,
    "horarioCheckIn" TEXT,
    "horarioCheckOut" TEXT,
    "reglamento" TEXT,
    "politicasCancelacion" TEXT,
    "admiteMascotas" BOOLEAN NOT NULL DEFAULT false,
    "seguroDisponible" BOOLEAN NOT NULL DEFAULT false,
    "capacidadMaxima" INTEGER NOT NULL,
    "numeroHabitaciones" INTEGER,
    "numeroBanos" INTEGER,
    "tieneCocina" BOOLEAN NOT NULL DEFAULT false,
    "tieneParqueadero" BOOLEAN NOT NULL DEFAULT false,
    "tieneWifi" BOOLEAN NOT NULL DEFAULT false,
    "precioNoche" DOUBLE PRECISION NOT NULL,
    "actividades" TEXT[],
    "videos" TEXT[],
    "servicioImagenes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "redesSociales" JSONB,
    "icalImportUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "icalToken" TEXT,
    "lastIcalSyncAt" TIMESTAMP(3),
    "fuenteDatos" TEXT,
    "ultimaVerificacion" TIMESTAMP(3),
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "horarioTexto" TEXT,
    "ratingExterno" DOUBLE PRECISION,
    "resenasExternas" INTEGER DEFAULT 0,
    "estado" "EstadoPropiedad" NOT NULL DEFAULT 'BORRADOR',
    "slug" TEXT NOT NULL,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Propiedad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropiedadImage" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbUrl" TEXT,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropiedadImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "autorNombre" TEXT NOT NULL,
    "autorEmail" TEXT,
    "calificacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiEndpoint" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "paraChat" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "APIKey" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "APIKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "logoUrl" TEXT,
    "sitioWeb" TEXT,
    "contacto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advertisement" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "titulo" TEXT,
    "imagenUrl" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "placement" "PlacementType" NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "prioridad" INTEGER NOT NULL DEFAULT 0,
    "pagoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "impresiones" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsoredListing" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "placement" "PlacementType" NOT NULL DEFAULT 'SEARCH_RESULTS_TOP',
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "prioridad" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsoredListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "userId" TEXT,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "identificacion" TEXT NOT NULL,
    "fechaLlegada" TIMESTAMP(3) NOT NULL,
    "fechaSalida" TIMESTAMP(3) NOT NULL,
    "huespedes" INTEGER NOT NULL DEFAULT 1,
    "metodoPago" "MetodoPago" NOT NULL DEFAULT 'EFECTIVO',
    "estado" "EstadoReserva" NOT NULL DEFAULT 'PENDIENTE',
    "total" DOUBLE PRECISION,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'info',
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroActualizacion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "municipio" TEXT NOT NULL DEFAULT '',
    "titulo" TEXT NOT NULL,
    "detalle" JSONB,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "propiedadId" TEXT,

    CONSTRAINT "RegistroActualizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaveApi" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "webUrl" TEXT,
    "valor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaveApi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadChat" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "nombre" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "mensajesTotal" INTEGER NOT NULL DEFAULT 0,
    "primeraPregunta" TEXT,
    "ultimaPregunta" TEXT,
    "prefs" JSONB,
    "temas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "transcript" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoDonacion" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" "CategoriaProyecto" NOT NULL DEFAULT 'GENERAL',
    "meta" DOUBLE PRECISION,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "imagenUrl" TEXT,
    "media" JSONB,
    "paypalLink" TEXT,
    "estado" "EstadoProyectoDonacion" NOT NULL DEFAULT 'ACTIVO',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyectoDonacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donacion" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "nombre" TEXT,
    "email" TEXT,
    "mensaje" TEXT,
    "paypalOrderId" TEXT,
    "paypalCaptureId" TEXT,
    "estado" "EstadoDonacion" NOT NULL DEFAULT 'PENDIENTE',
    "esManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "fuente" TEXT NOT NULL DEFAULT 'manual',
    "tipo" TEXT NOT NULL DEFAULT 'md',
    "estado" "EstadoDocumento" NOT NULL DEFAULT 'PROCESANDO',
    "error" TEXT,
    "contenido" TEXT,
    "totalChunks" INTEGER NOT NULL DEFAULT 0,
    "modeloEmb" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChunkDocumento" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "contenido" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChunkDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comida" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tipo" "TipoComida" NOT NULL DEFAULT 'OTRO',
    "descripcion" TEXT,
    "imagenUrl" TEXT,
    "videoUrl" TEXT,
    "horario" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plato" (
    "id" TEXT NOT NULL,
    "comidaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT,
    "precio" DOUBLE PRECISION,
    "etiquetas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imagenUrl" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plato_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Propiedad_icalToken_key" ON "Propiedad"("icalToken");

-- CreateIndex
CREATE UNIQUE INDEX "Propiedad_slug_key" ON "Propiedad"("slug");

-- CreateIndex
CREATE INDEX "Propiedad_tipo_idx" ON "Propiedad"("tipo");

-- CreateIndex
CREATE INDEX "Propiedad_admiteMascotas_idx" ON "Propiedad"("admiteMascotas");

-- CreateIndex
CREATE INDEX "Propiedad_capacidadMaxima_idx" ON "Propiedad"("capacidadMaxima");

-- CreateIndex
CREATE INDEX "Propiedad_estado_idx" ON "Propiedad"("estado");

-- CreateIndex
CREATE INDEX "Propiedad_precioNoche_idx" ON "Propiedad"("precioNoche");

-- CreateIndex
CREATE INDEX "Review_propiedadId_idx" ON "Review"("propiedadId");

-- CreateIndex
CREATE INDEX "Review_calificacion_idx" ON "Review"("calificacion");

-- CreateIndex
CREATE UNIQUE INDEX "APIKey_providerId_key_key" ON "APIKey"("providerId", "key");

-- CreateIndex
CREATE INDEX "Advertisement_placement_activo_fechaFin_idx" ON "Advertisement"("placement", "activo", "fechaFin");

-- CreateIndex
CREATE INDEX "SponsoredListing_placement_activo_fechaFin_idx" ON "SponsoredListing"("placement", "activo", "fechaFin");

-- CreateIndex
CREATE INDEX "Reserva_propiedadId_idx" ON "Reserva"("propiedadId");

-- CreateIndex
CREATE INDEX "Reserva_userId_idx" ON "Reserva"("userId");

-- CreateIndex
CREATE INDEX "Reserva_email_idx" ON "Reserva"("email");

-- CreateIndex
CREATE INDEX "Notificacion_userId_leida_idx" ON "Notificacion"("userId", "leida");

-- CreateIndex
CREATE UNIQUE INDEX "SiteConfig_key_key" ON "SiteConfig"("key");

-- CreateIndex
CREATE INDEX "RegistroActualizacion_estado_idx" ON "RegistroActualizacion"("estado");

-- CreateIndex
CREATE INDEX "RegistroActualizacion_createdAt_idx" ON "RegistroActualizacion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClaveApi_clave_key" ON "ClaveApi"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "LeadChat_sessionId_key" ON "LeadChat"("sessionId");

-- CreateIndex
CREATE INDEX "LeadChat_updatedAt_idx" ON "LeadChat"("updatedAt");

-- CreateIndex
CREATE INDEX "LeadChat_nombre_idx" ON "LeadChat"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ProyectoDonacion_slug_key" ON "ProyectoDonacion"("slug");

-- CreateIndex
CREATE INDEX "ProyectoDonacion_estado_idx" ON "ProyectoDonacion"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "Donacion_paypalOrderId_key" ON "Donacion"("paypalOrderId");

-- CreateIndex
CREATE INDEX "Donacion_proyectoId_idx" ON "Donacion"("proyectoId");

-- CreateIndex
CREATE INDEX "Donacion_estado_idx" ON "Donacion"("estado");

-- CreateIndex
CREATE INDEX "Documento_estado_idx" ON "Documento"("estado");

-- CreateIndex
CREATE INDEX "ChunkDocumento_documentoId_idx" ON "ChunkDocumento"("documentoId");

-- CreateIndex
CREATE UNIQUE INDEX "Comida_slug_key" ON "Comida"("slug");

-- CreateIndex
CREATE INDEX "Comida_activo_idx" ON "Comida"("activo");

-- CreateIndex
CREATE INDEX "Comida_tipo_idx" ON "Comida"("tipo");

-- CreateIndex
CREATE INDEX "Plato_comidaId_idx" ON "Plato"("comidaId");

-- AddForeignKey
ALTER TABLE "Propiedad" ADD CONSTRAINT "Propiedad_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropiedadImage" ADD CONSTRAINT "PropiedadImage_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APIKey" ADD CONSTRAINT "APIKey_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AIProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsoredListing" ADD CONSTRAINT "SponsoredListing_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsoredListing" ADD CONSTRAINT "SponsoredListing_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroActualizacion" ADD CONSTRAINT "RegistroActualizacion_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donacion" ADD CONSTRAINT "Donacion_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoDonacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChunkDocumento" ADD CONSTRAINT "ChunkDocumento_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plato" ADD CONSTRAINT "Plato_comidaId_fkey" FOREIGN KEY ("comidaId") REFERENCES "Comida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

