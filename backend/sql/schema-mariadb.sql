-- Esquema base MariaDB/MySQL para Tropical Biohostel (backend PHP)
-- Ajustar según necesidades. Ejecutar en phpMyAdmin o mysql CLI.

CREATE TABLE IF NOT EXISTS site_config (
  config_key VARCHAR(100) PRIMARY KEY,
  value_json JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS properties (
  id CHAR(36) PRIMARY KEY,
  slug VARCHAR(191) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  descripcion LONGTEXT NULL,
  ubicacion VARCHAR(255) NULL,
  direccion VARCHAR(255) NULL,
  ciudad VARCHAR(120) NULL,
  departamento VARCHAR(120) NULL,
  telefono VARCHAR(50) NULL,
  email VARCHAR(191) NULL,
  whatsapp VARCHAR(50) NULL,
  estrellas INT DEFAULT 0,
  calificacion DECIMAL(3,2) DEFAULT 0,
  precioNoche DECIMAL(12,2) DEFAULT 0,
  capacidadMaxima INT DEFAULT 1,
  numeroHabitaciones INT DEFAULT 1,
  horarioCheckIn VARCHAR(20) NULL,
  horarioCheckOut VARCHAR(20) NULL,
  reglamento LONGTEXT NULL,
  politicasCancelacion LONGTEXT NULL,
  admiteMascotas TINYINT(1) DEFAULT 0,
  seguroDisponible TINYINT(1) DEFAULT 0,
  actividades JSON NULL,
  imagenes JSON NULL,
  videos JSON NULL,
  servicioImagenes JSON NULL,
  redesSociales JSON NULL,
  coordenadas JSON NULL,
  estado ENUM('BORRADOR','PUBLICADO','ARCHIVADO') DEFAULT 'BORRADOR',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_properties_tipo (tipo),
  INDEX idx_properties_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reviews (
  id CHAR(36) PRIMARY KEY,
  property_id CHAR(36) NOT NULL,
  autorNombre VARCHAR(191) NOT NULL,
  autorEmail VARCHAR(191) NULL,
  calificacion INT NOT NULL,
  comentario LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reviews_property (property_id),
  CONSTRAINT fk_reviews_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS advertisements (
  id CHAR(36) PRIMARY KEY,
  placement VARCHAR(100) NOT NULL,
  titulo VARCHAR(255) NULL,
  imagenUrl TEXT NULL,
  linkUrl TEXT NULL,
  activo TINYINT(1) DEFAULT 1,
  prioridad INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ads_placement (placement, activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS donacion_proyectos (
  id CHAR(36) PRIMARY KEY,
  slug VARCHAR(191) NOT NULL UNIQUE,
  titulo VARCHAR(255) NOT NULL,
  descripcion LONGTEXT NULL,
  categoria VARCHAR(50) DEFAULT 'GENERAL',
  imagenUrl TEXT NULL,
  media JSON NULL,
  meta DECIMAL(12,2) NULL,
  moneda VARCHAR(10) DEFAULT 'USD',
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS donaciones (
  id CHAR(36) PRIMARY KEY,
  proyecto_id CHAR(36) NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  moneda VARCHAR(10) DEFAULT 'USD',
  nombre VARCHAR(191) NULL,
  email VARCHAR(191) NULL,
  mensaje TEXT NULL,
  estado VARCHAR(30) DEFAULT 'PENDIENTE',
  paypal_order_id VARCHAR(191) NULL,
  paypal_capture JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_donaciones_proyecto (proyecto_id),
  INDEX idx_donaciones_estado (estado),
  INDEX idx_donaciones_paypal (paypal_order_id),
  CONSTRAINT fk_donaciones_proyecto FOREIGN KEY (proyecto_id) REFERENCES donacion_proyectos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reservas (
  id CHAR(36) PRIMARY KEY,
  propiedad_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  nombre VARCHAR(191) NOT NULL,
  email VARCHAR(191) NOT NULL,
  telefono VARCHAR(50) NOT NULL,
  identificacion VARCHAR(100) NOT NULL,
  fecha_llegada DATE NOT NULL,
  fecha_salida DATE NOT NULL,
  huespedes INT NOT NULL DEFAULT 1,
  metodo_pago VARCHAR(30) NOT NULL DEFAULT 'EFECTIVO',
  estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
  total DECIMAL(12,2) NULL,
  notas TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reservas_propiedad (propiedad_id),
  INDEX idx_reservas_email (email),
  INDEX idx_reservas_estado (estado),
  INDEX idx_reservas_fechas (fecha_llegada, fecha_salida),
  CONSTRAINT fk_reservas_propiedad FOREIGN KEY (propiedad_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
