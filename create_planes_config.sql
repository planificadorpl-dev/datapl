-- ============================================================
-- TABLA DE CONFIGURACIÓN DE PLANES
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Crear la tabla
CREATE TABLE IF NOT EXISTS planes_config (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'Domiciliario' o 'Empresarial'
    has_tv BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Limpiar datos previos si existen
TRUNCATE TABLE planes_config;

-- 3. Insertar Planes Domiciliarios
INSERT INTO planes_config (nombre, tipo, has_tv) VALUES 
('400MB', 'Domiciliario', FALSE),
('600MB', 'Domiciliario', FALSE),
('1GB', 'Domiciliario', FALSE),
('400MB', 'Domiciliario', TRUE),
('600MB', 'Domiciliario', TRUE),
('1GB', 'Domiciliario', TRUE);

-- 4. Insertar Planes Empresariales
INSERT INTO planes_config (nombre, tipo, has_tv) VALUES 
('50MB', 'Empresarial', FALSE),
('100MB', 'Empresarial', FALSE),
('200MB', 'Empresarial', FALSE),
('Plan Dedicado', 'Empresarial', FALSE);

-- ============================================================
-- FIN DE CONFIGURACIÓN
-- ============================================================
