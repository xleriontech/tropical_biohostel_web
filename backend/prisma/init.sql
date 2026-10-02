CREATE TYPE "TipoPropiedad" AS ENUM ('hotel', 'hostal', 'centro_turistico');
CREATE TYPE "EstadoPropiedad" AS ENUM ('BORRADOR', 'PUBLICADO', 'ARCHIVADO');
CREATE TYPE "PlacementType" AS ENUM ('HOME_BANNER', 'SEARCH_RESULTS_TOP', 'SEARCH_RESULTS_SIDEBAR', 'PROPERTY_DETAIL');
CREATE TYPE "UserRole" AS ENUM ('turista', 'propietario', 'admin');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'turista',
    "supabaseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");

CREATE TABLE "Propiedad" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoPropiedad" NOT NULL,
    "descripcion" TEXT,
    "ubicacion" TEXT,
    "coordenadas" JSONB,
    "admiteMascotas" BOOLEAN NOT NULL DEFAULT false,
    "seguroDisponible" BOOLEAN NOT NULL DEFAULT false,
    "capacidadMaxima" INTEGER NOT NULL,
    "numeroHabitaciones" INTEGER,
    "precioNoche" DOUBLE PRECISION NOT NULL,
    "actividades" TEXT[] NOT NULL DEFAULT '{}',
    "estado" "EstadoPropiedad" NOT NULL DEFAULT 'BORRADOR',
    "slug" TEXT NOT NULL,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Propiedad_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Propiedad_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Propiedad_slug_key" ON "Propiedad"("slug");
CREATE INDEX "Propiedad_tipo_idx" ON "Propiedad"("tipo");
CREATE INDEX "Propiedad_admiteMascotas_idx" ON "Propiedad"("admiteMascotas");
CREATE INDEX "Propiedad_capacidadMaxima_idx" ON "Propiedad"("capacidadMaxima");
CREATE INDEX "Propiedad_estado_idx" ON "Propiedad"("estado");
CREATE INDEX "Propiedad_precioNoche_idx" ON "Propiedad"("precioNoche");

CREATE TABLE "PropiedadImage" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbUrl" TEXT,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropiedadImage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PropiedadImage_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Certificate_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AIProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiEndpoint" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AIProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "APIKey" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "APIKey_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "APIKey_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AIProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "APIKey_providerId_key_key" ON "APIKey"("providerId", "key");

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
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "impresiones" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Advertisement_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Advertisement_placement_activo_fechaFin_idx" ON "Advertisement"("placement", "activo", "fechaFin");

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
    CONSTRAINT "SponsoredListing_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SponsoredListing_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SponsoredListing_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SponsoredListing_placement_activo_fechaFin_idx" ON "SponsoredListing"("placement", "activo", "fechaFin");
