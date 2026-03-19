-- ============================================================
-- TABLA DE CONFIGURACIÓN DE PLANES
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Crear la tabla
CREATE TABLE IF NOT EXISTS planes_config (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'Domiciliario' o 'Empresarial'
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Limpiar datos previos si existen
TRUNCATE TABLE planes_config;

-- 3. Insertar Planes Domiciliarios (Sin 200MB ni 300MB)
INSERT INTO planes_config (nombre, tipo) VALUES 
('400MB', 'Domiciliario'),
('600MB', 'Domiciliario'),
('1GB', 'Domiciliario'),
('400MB + TV', 'Domiciliario'),
('600MB + TV', 'Domiciliario'),
('1GB + TV', 'Domiciliario');

-- 4. Insertar Planes Empresariales
INSERT INTO planes_config (nombre, tipo) VALUES 
('50MB', 'Empresarial'),
('100MB', 'Empresarial'),
('200MB', 'Empresarial'),
('Plan Dedicado', 'Empresarial');

-- ============================================================
-- FIN DE CONFIGURACIÓN
-- ============================================================
