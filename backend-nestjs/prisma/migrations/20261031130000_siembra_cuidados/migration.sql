-- Crear el catálogo de cuidados y el historial de mimamientos de cada árbol

-- CreateEnum
CREATE TYPE "CategoriaCuidado" AS ENUM ('AGUA', 'ABONO', 'SUSTRATO', 'CUIDADO');

-- CreateEnum
CREATE TYPE "EstadoCuidado" AS ENUM ('PENDIENTE', 'PAGADO', 'CANCELADO');

-- AlterTable
ALTER TABLE "Apadrinamiento" ADD COLUMN     "aguaNivel" INTEGER NOT NULL DEFAULT 55,
ADD COLUMN     "nutrienteNivel" INTEGER NOT NULL DEFAULT 45,
ADD COLUMN     "saludNivel" INTEGER NOT NULL DEFAULT 78,
ADD COLUMN     "nivelesEn" TIMESTAMP(3),
ADD COLUMN     "ultimoRiego" TIMESTAMP(3),
ADD COLUMN     "ultimoAbono" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ItemCuidado" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "categoria" "CategoriaCuidado" NOT NULL,
    "unidad" TEXT NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "descripcion" TEXT,
    "realceAgua" INTEGER NOT NULL DEFAULT 0,
    "realceNutri" INTEGER NOT NULL DEFAULT 0,
    "realceSalud" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemCuidado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuidadoAplicado" (
    "id" TEXT NOT NULL,
    "arbolId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "donacionId" TEXT,
    "etiqueta" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "cantidad" DECIMAL(6,2) NOT NULL,
    "costo" DECIMAL(10,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "estado" "EstadoCuidado" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuidadoAplicado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemCuidado_clave_key" ON "ItemCuidado"("clave");

-- CreateIndex
CREATE INDEX "ItemCuidado_activo_orden_idx" ON "ItemCuidado"("activo", "orden");

-- CreateIndex
CREATE INDEX "CuidadoAplicado_arbolId_idx" ON "CuidadoAplicado"("arbolId");

-- CreateIndex
CREATE INDEX "CuidadoAplicado_estado_idx" ON "CuidadoAplicado"("estado");

-- AddForeignKey
ALTER TABLE "CuidadoAplicado" ADD CONSTRAINT "CuidadoAplicado_arbolId_fkey" FOREIGN KEY ("arbolId") REFERENCES "Apadrinamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuidadoAplicado" ADD CONSTRAINT "CuidadoAplicado_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemCuidado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuidadoAplicado" ADD CONSTRAINT "CuidadoAplicado_donacionId_fkey" FOREIGN KEY ("donacionId") REFERENCES "Donacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
