-- ============================================================
-- Script SIMPLIFICADO para crear tablas de siembra en MariaDB
-- Compatible con MariaDB 11.x - versión sin dependencias complejas
-- IMPORTAR EN phpMyAdmin -> Importar -> Seleccionar archivo -> Continuar
-- ============================================================

-- Eliminar tablas si existen (orden inverso a las dependencias)
DROP TABLE IF EXISTS `cuidado_aplicado`;
DROP TABLE IF EXISTS `donacion`;
DROP TABLE IF EXISTS `apadrinamiento`;
DROP TABLE IF EXISTS `item_cuidado`;
DROP TABLE IF EXISTS `parcela`;
DROP TABLE IF EXISTS `proyecto_donacion`;
DROP TABLE IF EXISTS `site_config`;

-- ============================================================
-- 1. site_config (configuración)
-- ============================================================
CREATE TABLE `site_config` (
  `id` VARCHAR(36) NOT NULL,
  `key` VARCHAR(255) NOT NULL,
  `value` LONGTEXT,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `site_config` (`id`, `key`, `value`) VALUES
('cfg-1', 'siembraTablero', '{"filas":9,"columnas":9,"reservaMinutos":30,"montoPorArbol":null,"moneda":null,"proyectoSlug":"siembra-100-arboles-nativos"}');

INSERT INTO `site_config` (`id`, `key`, `value`) VALUES
('cfg-2', 'paypal-public', '{"clientId":"","mode":"sandbox","currency":"USD","paypalMe":""}');

-- ============================================================
-- 2. proyecto_donacion (proyectos)
-- ============================================================
CREATE TABLE `proyecto_donacion` (
  `id` VARCHAR(36) NOT NULL,
  `titulo` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `descripcion` TEXT,
  `categoria` VARCHAR(20) DEFAULT 'GENERAL',
  `meta` DECIMAL(12,2) DEFAULT NULL,
  `moneda` VARCHAR(3) DEFAULT 'USD',
  `imagenUrl` VARCHAR(500) DEFAULT NULL,
  `paypalLink` VARCHAR(500) DEFAULT NULL,
  `estado` VARCHAR(20) DEFAULT 'ACTIVO',
  `orden` INT DEFAULT 0,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `proyecto_donacion` (`id`, `titulo`, `slug`, `descripcion`, `categoria`, `moneda`, `estado`) VALUES
('proj-1', 'Siembra 100 Árboles Nativos', 'siembra-100-arboles-nativos', 'Apadrina un árbol de café o cacao', 'ARBOLES', 'USD', 'ACTIVO');

-- ============================================================
-- 3. parcela (casillas del tablero 9x9 = 81 parcelas)
-- ============================================================
CREATE TABLE `parcela` (
  `id` VARCHAR(36) NOT NULL,
  `fila` INT NOT NULL,
  `columna` INT NOT NULL,
  `estado` VARCHAR(20) DEFAULT 'LIBRE',
  `expiraAt` DATETIME DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar 81 parcelas (9 filas x 9 columnas)
INSERT INTO `parcela` (`id`, `fila`, `columna`, `estado`) VALUES
('par-0-0', 0, 0, 'LIBRE'), ('par-0-1', 0, 1, 'LIBRE'), ('par-0-2', 0, 2, 'LIBRE'), ('par-0-3', 0, 3, 'LIBRE'), ('par-0-4', 0, 4, 'LIBRE'), ('par-0-5', 0, 5, 'LIBRE'), ('par-0-6', 0, 6, 'LIBRE'), ('par-0-7', 0, 7, 'LIBRE'), ('par-0-8', 0, 8, 'LIBRE'),
('par-1-0', 1, 0, 'LIBRE'), ('par-1-1', 1, 1, 'LIBRE'), ('par-1-2', 1, 2, 'LIBRE'), ('par-1-3', 1, 3, 'LIBRE'), ('par-1-4', 1, 4, 'LIBRE'), ('par-1-5', 1, 5, 'LIBRE'), ('par-1-6', 1, 6, 'LIBRE'), ('par-1-7', 1, 7, 'LIBRE'), ('par-1-8', 1, 8, 'LIBRE'),
('par-2-0', 2, 0, 'LIBRE'), ('par-2-1', 2, 1, 'LIBRE'), ('par-2-2', 2, 2, 'LIBRE'), ('par-2-3', 2, 3, 'LIBRE'), ('par-2-4', 2, 4, 'LIBRE'), ('par-2-5', 2, 5, 'LIBRE'), ('par-2-6', 2, 6, 'LIBRE'), ('par-2-7', 2, 7, 'LIBRE'), ('par-2-8', 2, 8, 'LIBRE'),
('par-3-0', 3, 0, 'LIBRE'), ('par-3-1', 3, 1, 'LIBRE'), ('par-3-2', 3, 2, 'LIBRE'), ('par-3-3', 3, 3, 'LIBRE'), ('par-3-4', 3, 4, 'LIBRE'), ('par-3-5', 3, 5, 'LIBRE'), ('par-3-6', 3, 6, 'LIBRE'), ('par-3-7', 3, 7, 'LIBRE'), ('par-3-8', 3, 8, 'LIBRE'),
('par-4-0', 4, 0, 'LIBRE'), ('par-4-1', 4, 1, 'LIBRE'), ('par-4-2', 4, 2, 'LIBRE'), ('par-4-3', 4, 3, 'LIBRE'), ('par-4-4', 4, 4, 'LIBRE'), ('par-4-5', 4, 5, 'LIBRE'), ('par-4-6', 4, 6, 'LIBRE'), ('par-4-7', 4, 7, 'LIBRE'), ('par-4-8', 4, 8, 'LIBRE'),
('par-5-0', 5, 0, 'LIBRE'), ('par-5-1', 5, 1, 'LIBRE'), ('par-5-2', 5, 2, 'LIBRE'), ('par-5-3', 5, 3, 'LIBRE'), ('par-5-4', 5, 4, 'LIBRE'), ('par-5-5', 5, 5, 'LIBRE'), ('par-5-6', 5, 6, 'LIBRE'), ('par-5-7', 5, 7, 'LIBRE'), ('par-5-8', 5, 8, 'LIBRE'),
('par-6-0', 6, 0, 'LIBRE'), ('par-6-1', 6, 1, 'LIBRE'), ('par-6-2', 6, 2, 'LIBRE'), ('par-6-3', 6, 3, 'LIBRE'), ('par-6-4', 6, 4, 'LIBRE'), ('par-6-5', 6, 5, 'LIBRE'), ('par-6-6', 6, 6, 'LIBRE'), ('par-6-7', 6, 7, 'LIBRE'), ('par-6-8', 6, 8, 'LIBRE'),
('par-7-0', 7, 0, 'LIBRE'), ('par-7-1', 7, 1, 'LIBRE'), ('par-7-2', 7, 2, 'LIBRE'), ('par-7-3', 7, 3, 'LIBRE'), ('par-7-4', 7, 4, 'LIBRE'), ('par-7-5', 7, 5, 'LIBRE'), ('par-7-6', 7, 6, 'LIBRE'), ('par-7-7', 7, 7, 'LIBRE'), ('par-7-8', 7, 8, 'LIBRE'),
('par-8-0', 8, 0, 'LIBRE'), ('par-8-1', 8, 1, 'LIBRE'), ('par-8-2', 8, 2, 'LIBRE'), ('par-8-3', 8, 3, 'LIBRE'), ('par-8-4', 8, 4, 'LIBRE'), ('par-8-5', 8, 5, 'LIBRE'), ('par-8-6', 8, 6, 'LIBRE'), ('par-8-7', 8, 7, 'LIBRE'), ('par-8-8', 8, 8, 'LIBRE');

-- ============================================================
-- 4. apadrinamiento (árboles apadrinados)
-- ============================================================
CREATE TABLE `apadrinamiento` (
  `id` VARCHAR(36) NOT NULL,
  `codigo` VARCHAR(20) NOT NULL,
  `parcelaId` VARCHAR(36) NOT NULL,
  `proyectoId` VARCHAR(36) DEFAULT NULL,
  `donacionId` VARCHAR(36) DEFAULT NULL,
  `especie` VARCHAR(10) NOT NULL,
  `etapa` VARCHAR(20) DEFAULT 'SEMILLA',
  `alias` VARCHAR(40) DEFAULT NULL,
  `padrino` VARCHAR(120) DEFAULT NULL,
  `pais` VARCHAR(60) DEFAULT NULL,
  `mensaje` VARCHAR(500) DEFAULT NULL,
  `confirmado` TINYINT(1) DEFAULT 0,
  `fechaSiembra` DATETIME DEFAULT NULL,
  `notasFinca` TEXT DEFAULT NULL,
  `aguaNivel` INT DEFAULT 55,
  `nutrienteNivel` INT DEFAULT 45,
  `saludNivel` INT DEFAULT 78,
  `nivelesEn` DATETIME DEFAULT NULL,
  `ultimoRiego` DATETIME DEFAULT NULL,
  `ultimoAbono` DATETIME DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar algunos árboles de ejemplo (ocupados)
INSERT INTO `apadrinamiento` (`id`, `codigo`, `parcelaId`, `proyectoId`, `especie`, `etapa`, `alias`, `padrino`, `pais`, `confirmado`, `fechaSiembra`, `aguaNivel`, `nutrienteNivel`, `saludNivel`) VALUES
('arbol-1', 'TB-CAFE-001', 'par-0-0', 'proj-1', 'CAFE', 'JUVENIL', 'Doña María', 'María Fernanda', 'Colombia', 1, '2024-03-15 10:00:00', 70, 60, 85),
('arbol-2', 'TB-CACAO-002', 'par-0-1', 'proj-1', 'CACAO', 'BROTE', 'Don Carlos', 'Carlos Andrés', 'México', 1, '2024-04-20 08:00:00', 55, 45, 78),
('arbol-3', 'TB-CAFE-003', 'par-1-0', 'proj-1', 'CAFE', 'SEMILLA', 'Don Pedro', 'Pedro López', 'Perú', 1, '2024-05-10 09:00:00', 55, 45, 78);

-- Actualizar estado de esas parcelas a OCUPADA
UPDATE `parcela` SET `estado` = 'OCUPADA' WHERE `id` IN ('par-0-0', 'par-0-1', 'par-1-0');

-- Insertar árboles reservados (pendientes de pago)
INSERT INTO `apadrinamiento` (`id`, `codigo`, `parcelaId`, `proyectoId`, `especie`, `etapa`, `alias`, `padrino`, `pais`, `confirmado`, `fechaSiembra`) VALUES
('arbol-4', 'TB-CAFE-004', 'par-2-0', 'proj-1', 'CAFE', 'SEMILLA', 'Doña Ana', 'Ana Gómez', 'Ecuador', 0, NULL),
('arbol-5', 'TB-CACAO-005', 'par-2-1', 'proj-1', 'CACAO', 'SEMILLA', 'Don José', 'José Pérez', 'Costa Rica', 0, NULL);

-- Actualizar estado de esas parcelas a RESERVADA
UPDATE `parcela` SET `estado` = 'RESERVADA', `expiraAt` = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE `id` IN ('par-2-0', 'par-2-1');

-- ============================================================
-- 5. donacion (donaciones)
-- ============================================================
CREATE TABLE `donacion` (
  `id` VARCHAR(36) NOT NULL,
  `proyectoId` VARCHAR(36) NOT NULL,
  `monto` DECIMAL(12,2) NOT NULL,
  `moneda` VARCHAR(3) DEFAULT 'USD',
  `nombre` VARCHAR(120) DEFAULT NULL,
  `email` VARCHAR(160) DEFAULT NULL,
  `mensaje` VARCHAR(500) DEFAULT NULL,
  `paypalOrderId` VARCHAR(255) DEFAULT NULL,
  `paypalCaptureId` VARCHAR(255) DEFAULT NULL,
  `estado` VARCHAR(20) DEFAULT 'PENDIENTE',
  `esManual` TINYINT(1) DEFAULT 0,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar donaciones de ejemplo
INSERT INTO `donacion` (`id`, `proyectoId`, `monto`, `moneda`, `nombre`, `email`, `estado`, `esManual`) VALUES
('don-1', 'proj-1', 50.00, 'USD', 'María Fernanda', 'maria@email.com', 'APROBADA', 0),
('don-2', 'proj-1', 75.00, 'USD', 'Carlos Andrés', 'carlos@email.com', 'APROBADA', 0),
('don-3', 'proj-1', 35.00, 'USD', 'Ana Gómez', 'ana@email.com', 'APROBADA', 1);

-- ============================================================
-- 6. item_cuidado (catálogo de cuidados)
-- ============================================================
CREATE TABLE `item_cuidado` (
  `id` VARCHAR(36) NOT NULL,
  `clave` VARCHAR(50) NOT NULL,
  `etiqueta` VARCHAR(100) NOT NULL,
  `categoria` VARCHAR(20) NOT NULL,
  `unidad` VARCHAR(10) DEFAULT 'u',
  `precio` DECIMAL(10,2) NOT NULL,
  `descripcion` VARCHAR(500) DEFAULT NULL,
  `realceAgua` INT DEFAULT 0,
  `realceNutri` INT DEFAULT 0,
  `realceSalud` INT DEFAULT 0,
  `activo` TINYINT(1) DEFAULT 1,
  `orden` INT DEFAULT 0,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar cuidados de ejemplo
INSERT INTO `item_cuidado` (`id`, `clave`, `etiqueta`, `categoria`, `unidad`, `precio`, `realceAgua`, `realceNutri`, `realceSalud`, `activo`, `orden`) VALUES
('cuid-1', 'RIEGO', 'Riego', 'AGUA', 'L', 5.00, 15, 0, 5, 1, 1),
('cuid-2', 'ABONO', 'Abono orgánico', 'ABONO', 'kg', 8.00, 0, 15, 8, 1, 2),
('cuid-3', 'SUSTRATO', 'Sustrato', 'SUSTRATO', 'kg', 6.00, 0, 10, 5, 1, 3),
('cuid-4', 'JORNAL', 'Jornal mantenimiento', 'CUIDADO', 'u', 25.00, 5, 5, 10, 1, 4);

-- ============================================================
-- 7. cuidado_aplicado (cuidados comprados para árboles)
-- ============================================================
CREATE TABLE `cuidado_aplicado` (
  `id` VARCHAR(36) NOT NULL,
  `arbolId` VARCHAR(36) NOT NULL,
  `itemId` VARCHAR(36) NOT NULL,
  `donacionId` VARCHAR(36) DEFAULT NULL,
  `etiqueta` VARCHAR(100) NOT NULL,
  `unidad` VARCHAR(10) DEFAULT 'u',
  `cantidad` DECIMAL(6,2) NOT NULL,
  `costo` DECIMAL(10,2) NOT NULL,
  `moneda` VARCHAR(3) DEFAULT 'USD',
  `estado` VARCHAR(20) DEFAULT 'PENDIENTE',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SCRIPT COMPLETADO
-- Verifica que las tablas se crearon en phpMyAdmin
-- ============================================================