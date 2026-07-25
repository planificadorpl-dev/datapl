-- Actualización de la tabla de solicitudes para vincularlas a actividades
ALTER TABLE public.solicitudes
ADD COLUMN IF NOT EXISTS actividad_uid text;
