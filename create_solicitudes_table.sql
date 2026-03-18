-- ============================================================
-- TABLA DE SOLICITUDES DE SERVICIO
-- ============================================================

CREATE TABLE IF NOT EXISTS solicitudes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_disponibilidad DATE,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    cedula TEXT NOT NULL,
    genero TEXT NOT NULL,
    estado TEXT NOT NULL,
    municipio TEXT NOT NULL,
    parroquia TEXT NOT NULL,
    direccion TEXT NOT NULL,
    tipo_servicio TEXT NOT NULL,
    plan TEXT NOT NULL,
    promotor TEXT NOT NULL,
    telefono_principal TEXT NOT NULL,
    telefono_secundario TEXT,
    correo TEXT,
    power_go BOOLEAN DEFAULT FALSE,
    fecha_nacimiento DATE,
    fuente TEXT NOT NULL
);

-- ============================================================
-- FIN DE TABLA SOLICITUDES
-- ============================================================
