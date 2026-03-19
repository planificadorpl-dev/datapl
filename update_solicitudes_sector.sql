-- ============================================================
-- ACTUALIZACIÓN DE TABLA SOLICITUDES: CAMPO SECTOR
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Añadir la columna 'sector' si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='solicitudes' AND column_name='sector') THEN
        ALTER TABLE solicitudes ADD COLUMN sector TEXT;
    END IF;
END $$;

-- 2. (Opcional) Si quieres que sea obligatorio, primero llena los nulos y luego añade el constraint
-- UPDATE solicitudes SET sector = 'N/A' WHERE sector IS NULL;
-- ALTER TABLE solicitudes ALTER COLUMN sector SET NOT NULL;

-- ============================================================
-- FIN DE ACTUALIZACIÓN
-- ============================================================
