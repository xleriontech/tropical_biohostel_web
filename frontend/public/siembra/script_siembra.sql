-- ============================================================
-- Script de instalación: Tablas para la sección Siembra
-- Compatible con MariaDB 11.x / MySQL 8.x
-- Importar en phpMyAdmin -> Importar -> Seleccionar archivo -> Ejecutar
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- Tabla: site_config (Configuración del tablero y otros parámetros)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `site_config`;
CREATE TABLE `site_config` (
  `id` VARCHAR(36) NOT NULL,
  `key` VARCHAR(255) NOT NULL,
  `value` JSON NOT NULL,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar configuración por defecto del tablero de siembra
INSERT INTO `site_config` (`id`, `key`, `value`) VALUES
('cfg-siembra-001', 'siembraTablero', JSON_OBJECT(
  'filas', 9,
  'columnas', 9,
  'reservaMinutos', 30,
  'montoPorArbol', NULL,
  'moneda', NULL,
  'proyectoSlug', 'siembra-100-arboles-nativos'
));

-- Insertar configuración PayPal (opcional, modo simulado por defecto)
INSERT INTO `site_config` (`id`, `key`, `value`) VALUES
('cfg-paypal-001', 'paypal-public', JSON_OBJECT(
  'clientId', '',
  'mode', 'sandbox',
  'currency', 'USD',
  'paypalMe', ''
));

-- --------------------------------------------------------
-- Tabla: proyecto_donacion (Proyectos de donación)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `proyecto_donacion`;
CREATE TABLE `proyecto_donacion` (
  `id` VARCHAR(36) NOT NULL,
  `titulo` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `descripcion` TEXT,
  `categoria` ENUM('ARBOLES', 'CARBONO', 'GENERAL') DEFAULT 'GENERAL',
  `meta` DECIMAL(12, 2) DEFAULT NULL,
  `moneda` VARCHAR(3) DEFAULT 'USD',
  `imagenUrl` VARCHAR(500) DEFAULT NULL,
  `media` JSON DEFAULT NULL,
  `paypalLink` VARCHAR(500) DEFAULT NULL,
  `estado` ENUM('ACTIVO', 'PAUSADO', 'COMPLETADO') DEFAULT 'ACTIVO',
  `orden` INT DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar proyecto de siembra por defecto
INSERT INTO `proyecto_donacion` (`id`, `titulo`, `slug`, `descripcion`, `categoria`, `meta`, `moneda`, `estado`) VALUES
('proj-siembra-001', 'Siembra 100 Árboles Nativos', 'siembra-100-arboles-nativos', 'Apadrina un árbol de café o cacao en nuestra finca tropical', 'ARBOLES', NULL, 'USD', 'ACTIVO');

-- --------------------------------------------------------
-- Tabla: parcela (Casillas del tablero de siembra)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `parcela`;
CREATE TABLE `parcela` (
  `id` VARCHAR(36) NOT NULL,
  `fila` INT NOT NULL,
  `columna` INT NOT NULL,
  `estado` ENUM('LIBRE', 'RESERVADA', 'OCUPADA') DEFAULT 'LIBRE',
  `expiraAt` DATETIME DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fila_columna` (`fila`, `columna`),
  KEY `idx_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar 81 parcelas (9x9) para el tablero
-- Se usa una función generadora para insertar todas las combinaciones
INSERT INTO `parcela` (`id`, `fila`, `columna`, `estado`, `expiraAt`)
SELECT 
  CONCAT('par-', LPAD(i, 3, '0'), '-', LPAD(j, 3, '0')),
  i, j, 'LIBRE', NULL
FROM (SELECT 0 AS i UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8) i,
     (SELECT 0 AS j UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8) j;

-- --------------------------------------------------------
-- Tabla: apadrinamiento (Árboles apadrinados)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `apadrinamiento`;
CREATE TABLE `apadrinamiento` (
  `id` VARCHAR(36) NOT NULL,
  `codigo` VARCHAR(20) NOT NULL,
  `parcelaId` VARCHAR(36) NOT NULL,
  `proyectoId` VARCHAR(36) DEFAULT NULL,
  `donacionId` VARCHAR(36) DEFAULT NULL,
  `especie` ENUM('CAFE', 'CACAO') NOT NULL,
  `etapa` ENUM('SEMILLA', 'BROTE', 'JUVENIL', 'PRODUCTIVO') DEFAULT 'SEMILLA',
  `alias` VARCHAR(40) DEFAULT NULL,
  `padrino` VARCHAR(120) DEFAULT NULL,
  `pais` VARCHAR(60) DEFAULT NULL,
  `mensaje` VARCHAR(500) DEFAULT NULL,
  `confirmado` BOOLEAN DEFAULT FALSE,
  `fechaSiembra` DATETIME DEFAULT NULL,
  `notasFinca` TEXT DEFAULT NULL,
  `aguaNivel` INT DEFAULT 55,
  `nutrienteNivel` INT DEFAULT 45,
  `saludNivel` INT DEFAULT 78,
  `nivelesEn` DATETIME DEFAULT NULL,
  `ultimoRiego` DATETIME DEFAULT NULL,
  `ultimoAbono` DATETIME DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  UNIQUE KEY `parcelaId` (`parcelaId`),
  KEY `idx_especie` (`especie`),
  KEY `idx_confirmado` (`confirmado`),
  CONSTRAINT `fk_apadrinamiento_parcela` FOREIGN KEY (`parcelaId`) REFERENCES `parcela` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_apadrinamiento_proyecto` FOREIGN KEY (`proyectoId`) REFERENCES `proyecto_donacion` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Tabla: donacion (Donaciones recibidas)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `donacion`;
CREATE TABLE `donacion` (
  `id` VARCHAR(36) NOT NULL,
  `proyectoId` VARCHAR(36) NOT NULL,
  `monto` DECIMAL(12, 2) NOT NULL,
  `moneda` VARCHAR(3) DEFAULT 'USD',
  `nombre` VARCHAR(120) DEFAULT NULL,
  `email` VARCHAR(160) DEFAULT NULL,
  `mensaje` VARCHAR(500) DEFAULT NULL,
  `paypalOrderId` VARCHAR(255) DEFAULT NULL,
  `paypalCaptureId` VARCHAR(255) DEFAULT NULL,
  `estado` ENUM('PENDIENTE', 'APROBADA', 'CANCELADA') DEFAULT 'PENDIENTE',
  `esManual` BOOLEAN DEFAULT FALSE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `paypalOrderId` (`paypalOrderId`),
  KEY `idx_proyecto` (`proyectoId`),
  KEY `idx_estado` (`estado`),
  CONSTRAINT `fk_donacion_proyecto` FOREIGN KEY (`proyectoId`) REFERENCES `proyecto_donacion` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Tabla: item_cuidado (Catálogo de cuidados: riego, abono, etc.)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `item_cuidado`;
CREATE TABLE `item_cuidado` (
  `id` VARCHAR(36) NOT NULL,
  `clave` VARCHAR(50) NOT NULL,
  `etiqueta` VARCHAR(100) NOT NULL,
  `categoria` ENUM('AGUA', 'ABONO', 'SUSTRATO', 'CUIDADO') NOT NULL,
  `unidad` VARCHAR(10) DEFAULT 'u',
  `precio` DECIMAL(10, 2) NOT NULL,
  `descripcion` VARCHAR(500) DEFAULT NULL,
  `realceAgua` INT DEFAULT 0,
  `realceNutri` INT DEFAULT 0,
  `realceSalud` INT DEFAULT 0,
  `activo` BOOLEAN DEFAULT TRUE,
  `orden` INT DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`),
  KEY `idx_activo_orden` (`activo`, `orden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar algunos cuidados de ejemplo
INSERT INTO `item_cuidado` (`id`, `clave`, `etiqueta`, `categoria`, `unidad`, `precio`, `realceAgua`, `realceNutri`, `realceSalud`, `activo`, `orden`) VALUES
('cuid-riego-001', 'RIEGO', 'Riego', 'AGUA', 'L', 5.00, 15, 0, 5, TRUE, 1),
('cuid-abono-001', 'ABONO', 'Abono orgánico', 'ABONO', 'kg', 8.00, 0, 15, 8, TRUE, 2),
('cuid-sustrato-001', 'SUSTRATO', 'Sustrato', 'SUSTRATO', 'kg', 6.00, 0, 10, 5, TRUE, 3),
('cuid-jornal-001', 'JORNAL', 'Jornal de mantenimiento', 'CUIDADO', 'u', 25.00, 5, 5, 10, TRUE, 4);

-- --------------------------------------------------------
-- Tabla: cuidado_aplicado (Cuidados comprados para árboles)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `cuidado_aplicado`;
CREATE TABLE `cuidado_aplicado` (
  `id` VARCHAR(36) NOT NULL,
  `arbolId` VARCHAR(36) NOT NULL,
  `itemId` VARCHAR(36) NOT NULL,
  `donacionId` VARCHAR(36) DEFAULT NULL,
  `etiqueta` VARCHAR(100) NOT NULL,
  `unidad` VARCHAR(10) DEFAULT 'u',
  `cantidad` DECIMAL(6, 2) NOT NULL,
  `costo` DECIMAL(10, 2) NOT NULL,
  `moneda` VARCHAR(3) DEFAULT 'USD',
  `estado` ENUM('PENDIENTE', 'PAGADO', 'CANCELADO') DEFAULT 'PENDIENTE',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_arbol` (`arbolId`),
  KEY `idx_estado` (`estado`),
  CONSTRAINT `fk_cuidado_arbol` FOREIGN KEY (`arbolId`) REFERENCES `apadrinamiento` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cuidado_item` FOREIGN KEY (`itemId`) REFERENCES `item_cuidado` (`id`),
  CONSTRAINT `fk_cuidado_donacion` FOREIGN KEY (`donacionId`) REFERENCES `donacion` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Insertar algunos datos de ejemplo para probar
-- --------------------------------------------------------

-- Insertar 3 parcelas ocupadas con árboles de ejemplo
INSERT INTO `apadrinamiento` (`id`, `codigo`, `parcelaId`, `proyectoId`, `especie`, `etapa`, `alias`, `padrino`, `pais`, `confirmado`, `fechaSiembra`, `aguaNivel`, `nutrienteNivel`, `saludNivel`) VALUES
('arbol-001', 'TB-CAFE-001', 'par-000-000', 'proj-siembra-001', 'CAFE', 'JUVENIL', 'Doña María', 'María Fernanda', 'Colombia', TRUE, '2024-03-15 10:00:00', 70, 60, 85),
('arbol-002', 'TB-CACAO-002', 'par-000-001', 'proj-siembra-001', 'CACAO', 'BROTE', 'Don Carlos', 'Carlos Andrés', 'México', TRUE, '2024-04-20 08:00:00', 55, 45, 78),
('arbol-003', 'TB-CAFE-003', 'par-001-000', 'proj-siembra-001', 'CAFE', 'SEMILLA', 'Don Pedro', 'Pedro López', 'Perú', TRUE, '2024-05-10 09:00:00', 55, 45, 78);

-- Actualizar estado de esas parcelas a OCUPADA
UPDATE `parcela` SET `estado` = 'OCUPADA' WHERE `id` IN ('par-000-000', 'par-000-001', 'par-001-000');

-- Insertar 2 parcelas reservadas (pendientes de pago)
INSERT INTO `apadrinamiento` (`id`, `codigo`, `parcelaId`, `proyectoId`, `especie`, `etapa`, `alias`, `padrino`, `pais`, `confirmado`, `fechaSiembra`) VALUES
('arbol-004', 'TB-CAFE-004', 'par-002-000', 'proj-siembra-001', 'CAFE', 'SEMILLA', 'Doña Ana', 'Ana Gómez', 'Ecuador', FALSE, NULL),
('arbol-005', 'TB-CACAO-005', 'par-002-001', 'proj-siembra-001', 'CACAO', 'SEMILLA', 'Don José', 'José Pérez', 'Costa Rica', FALSE, NULL);

-- Actualizar estado de esas parcelas a RESERVADA
UPDATE `parcela` SET `estado` = 'RESERVADA', `expiraAt` = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE `id` IN ('par-002-000', 'par-002-001');

-- Insertar algunas donaciones de ejemplo
INSERT INTO `donacion` (`id`, `proyectoId`, `monto`, `moneda`, `nombre`, `email`, `estado`, `esManual`) VALUES
('don-001', 'proj-siembra-001', 50.00, 'USD', 'María Fernanda', 'maria@email.com', 'APROBADA', FALSE),
('don-002', 'proj-siembra-001', 75.00, 'USD', 'Carlos Andrés', 'carlos@email.com', 'APROBADA', FALSE),
('don-003', 'proj-siembra-001', 35.00, 'USD', 'Ana Gómez', 'ana@email.com', 'APROBADA', TRUE);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Script completado exitosamente
-- Verifica las tablas creadas: site_config, proyecto_donacion, 
-- parcela, apadrinamiento, donacion, item_cuidado, cuidado_aplicado
-- ============================================================