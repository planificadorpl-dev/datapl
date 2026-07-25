-- Módulo de Ventas: Tablas de Estudio de Mercado (Competencia)

-- 1. Secuencia y Tabla para Operadores
CREATE SEQUENCE IF NOT EXISTS operadores_competencia_id_seq;

CREATE TABLE public.operadores_competencia (
  id integer NOT NULL DEFAULT nextval('operadores_competencia_id_seq'::regclass),
  nombre text NOT NULL UNIQUE,
  color_hex text DEFAULT '#6b7280'::text,
  created_at timestamp with time zone DEFAULT now(),
  logo_url text,
  sitio_web text,
  telefono text,
  rif text,
  instagram text,
  tecnologia text DEFAULT 'Fibra Óptica'::text,
  cobertura_estados text[],
  CONSTRAINT operadores_competencia_pkey PRIMARY KEY (id)
);

-- 2. Secuencia y Tabla para Ofertas
CREATE SEQUENCE IF NOT EXISTS ofertas_competencia_id_seq;

CREATE TABLE public.ofertas_competencia (
  id integer NOT NULL DEFAULT nextval('ofertas_competencia_id_seq'::regclass),
  operador_id integer,
  estado text NOT NULL,
  municipio text NOT NULL,
  parroquia text NOT NULL,
  tipo_novedad text NOT NULL,
  velocidad_mb integer,
  precio_mensual numeric,
  costo_instalacion numeric DEFAULT 0,
  modalidad_instalacion text,
  incluye_tv boolean DEFAULT false,
  detalle_tv text,
  notas text,
  fecha_reporte date DEFAULT CURRENT_DATE,
  asesor_nombre text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  duracion_promo_meses integer,
  fecha_fin_promo date,
  es_promocion boolean DEFAULT false,
  precio_regular numeric,
  servicios_adicionales jsonb DEFAULT '[]'::jsonb,
  instalacion_opciones jsonb DEFAULT '[]'::jsonb,
  instalacion_metraje integer,
  logo_url text,
  velocidad_subida integer,
  tecnologia text DEFAULT 'FTTH'::text,
  incluye_iptv boolean DEFAULT false,
  nombre_plan text,
  es_simetrico boolean DEFAULT true,
  fuente text DEFAULT 'scraping_web'::text,
  CONSTRAINT ofertas_competencia_pkey PRIMARY KEY (id),
  CONSTRAINT ofertas_competencia_operador_id_fkey FOREIGN KEY (operador_id) REFERENCES public.operadores_competencia(id)
);
