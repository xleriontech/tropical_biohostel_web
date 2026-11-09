-- ============================================================
-- SCRIPT MÍNIMO: Solo crear tablas (sin datos de ejemplo)
-- Ejecutar en phpMyAdmin -> SQL -> pegar y ejecutar
-- ============================================================

-- Tabla 1: site_config
CREATE TABLE IF NOT EXISTS `site_config` (
  `id` VARCHAR(36) NOT NULL,
  `key` VARCHAR(255) NOT NULL,
  `value` LONGTEXT,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla 2: proyecto_donacion
CREATE TABLE IF NOT EXISTS `proyecto_donacion` (
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

-- Tabla 3: parcela
CREATE TABLE IF NOT EXISTS `parcela` (
  `id` VARCHAR(36) NOT NULL,
  `fila` INT NOT NULL,
  `columna` INT NOT NULL,
  `estado` VARCHAR(20) DEFAULT 'LIBRE',
  `expiraAt` DATETIME DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla 4: apadrinamiento
CREATE TABLE IF NOT EXISTS `apadrinamiento` (
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

-- Tabla 5: donacion
CREATE TABLE IF NOT EXISTS `donacion` (
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

-- Tabla 6: item_cuidado
CREATE TABLE IF NOT EXISTS `item_cuidado` (
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

-- Tabla 7: cuidado_aplicado
CREATE TABLE IF NOT EXISTS `cuidado_aplicado` (
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
-- FIN: Todas las tablas creadas sin errores
-- ============================================================