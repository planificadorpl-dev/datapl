-- Script para añadir columna UID a la tabla actividades
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actividades' AND column_name='uid') THEN
        ALTER TABLE actividades ADD COLUMN uid TEXT;
    END IF;
END $$;
