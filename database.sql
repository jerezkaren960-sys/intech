-- ============================================================
-- BASE DE DATOS: InTech - Sistema de Control de Inventarios
-- ============================================================

CREATE DATABASE IF NOT EXISTS intech_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE intech_db;

-- ============================================================
-- TABLA 1: CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  cedula      VARCHAR(10)   NOT NULL UNIQUE,
  nombre      VARCHAR(100)  NOT NULL,
  apellido    VARCHAR(100)  NOT NULL,
  telefono    VARCHAR(10)   NOT NULL,
  correo      VARCHAR(150)  NOT NULL UNIQUE,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_cedula_len   CHECK (CHAR_LENGTH(cedula)   = 10),
  CONSTRAINT chk_telefono_len CHECK (CHAR_LENGTH(telefono) = 10)
) ENGINE=InnoDB;

-- ============================================================
-- TABLA 2: PRODUCTOS / SERVICIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS productos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  numero_serie    VARCHAR(50)      NOT NULL UNIQUE,
  descripcion     VARCHAR(255)     NOT NULL,
  marca           VARCHAR(100)     NOT NULL,
  precio_compra   DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
  margen_ganancia DECIMAL(5,2)     NOT NULL DEFAULT 30.00,
  ganancia        DECIMAL(10,2)    GENERATED ALWAYS AS (precio_compra * margen_ganancia / 100) STORED,
  subtotal        DECIMAL(10,2)    GENERATED ALWAYS AS (precio_compra + (precio_compra * margen_ganancia / 100)) STORED,
  iva             DECIMAL(10,2)    GENERATED ALWAYS AS ((precio_compra + (precio_compra * margen_ganancia / 100)) * 0.12) STORED,
  pvp             DECIMAL(10,2)    GENERATED ALWAYS AS ((precio_compra + (precio_compra * margen_ganancia / 100)) * 1.12) STORED,
  cantidad_stock  INT              NOT NULL DEFAULT 0,
  total_inventario DECIMAL(12,2)  GENERATED ALWAYS AS (((precio_compra + (precio_compra * margen_ganancia / 100)) * 1.12) * cantidad_stock) STORED,
  estado          ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  fecha_registro  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- TABLA 3: VENTAS  (relacionada con clientes y productos)
-- ============================================================
CREATE TABLE IF NOT EXISTS ventas (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  fecha_venta  DATE             NOT NULL,
  cliente_id   INT              NOT NULL,
  producto_id  INT              NOT NULL,
  cantidad     INT              NOT NULL DEFAULT 1,
  subtotal     DECIMAL(10,2)    NOT NULL,
  iva          DECIMAL(10,2)    NOT NULL,
  total        DECIMAL(10,2)    NOT NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Relaciones
  CONSTRAINT fk_venta_cliente  FOREIGN KEY (cliente_id)  REFERENCES clientes(id)  ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_venta_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT chk_cantidad_pos CHECK (cantidad > 0)
) ENGINE=InnoDB;

-- ============================================================
-- ÍNDICES para búsquedas frecuentes
-- ============================================================
CREATE INDEX idx_clientes_cedula  ON clientes(cedula);
CREATE INDEX idx_productos_serie  ON productos(numero_serie);
CREATE INDEX idx_ventas_fecha     ON ventas(fecha_venta);
CREATE INDEX idx_ventas_cliente   ON ventas(cliente_id);
CREATE INDEX idx_ventas_producto  ON ventas(producto_id);
