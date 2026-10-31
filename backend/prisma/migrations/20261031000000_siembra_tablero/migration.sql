-- CreateEnum
CREATE TYPE "EspecieSiembra" AS ENUM ('CAFE', 'CACAO');

-- CreateEnum
CREATE TYPE "EtapaArbol" AS ENUM ('SEMILLA', 'BROTE', 'JUVENIL', 'PRODUCTIVO');

-- CreateEnum
CREATE TYPE "EstadoParcela" AS ENUM ('LIBRE', 'RESERVADA', 'OCUPADA');

-- CreateTable
CREATE TABLE "Parcela" (
    "id" TEXT NOT NULL,
    "fila" INTEGER NOT NULL,
    "columna" INTEGER NOT NULL,
    "estado" "EstadoParcela" NOT NULL DEFAULT 'LIBRE',
    "expiraAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parcela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apadrinamiento" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "parcelaId" TEXT NOT NULL,
    "proyectoId" TEXT,
    "donacionId" TEXT,
    "especie" "EspecieSiembra" NOT NULL,
    "etapa" "EtapaArbol" NOT NULL DEFAULT 'SEMILLA',
    "alias" TEXT,
    "padrino" TEXT,
    "pais" TEXT,
    "mensaje" TEXT,
    "confirmado" BOOLEAN NOT NULL DEFAULT false,
    "fechaSiembra" TIMESTAMP(3),
    "notasFinca" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Apadrinamiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Parcela_estado_idx" ON "Parcela"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "Parcela_fila_columna_key" ON "Parcela"("fila", "columna");

-- CreateIndex
CREATE UNIQUE INDEX "Apadrinamiento_codigo_key" ON "Apadrinamiento"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Apadrinamiento_parcelaId_key" ON "Apadrinamiento"("parcelaId");

-- CreateIndex
CREATE UNIQUE INDEX "Apadrinamiento_donacionId_key" ON "Apadrinamiento"("donacionId");

-- CreateIndex
CREATE INDEX "Apadrinamiento_especie_idx" ON "Apadrinamiento"("especie");

-- CreateIndex
CREATE INDEX "Apadrinamiento_confirmado_idx" ON "Apadrinamiento"("confirmado");

-- AddForeignKey
ALTER TABLE "Apadrinamiento" ADD CONSTRAINT "Apadrinamiento_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "Parcela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apadrinamiento" ADD CONSTRAINT "Apadrinamiento_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoDonacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apadrinamiento" ADD CONSTRAINT "Apadrinamiento_donacionId_fkey" FOREIGN KEY ("donacionId") REFERENCES "Donacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

