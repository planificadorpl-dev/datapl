-- Actualización para la tabla asesores_config
ALTER TABLE asesores_config 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
