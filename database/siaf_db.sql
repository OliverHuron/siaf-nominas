--
-- PostgreSQL database dump
--

\restrict SFpdIjzpkDZCYOGfcR8WdEmdffZPKl6vdBRglnrH8orsKpIjwr34oN3fQ4K5Ewc

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: actualizar_stage_inventario(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.actualizar_stage_inventario() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Si tiene datos fiscales Y físicos (numero_serie) → COMPLETO
  IF NEW.proveedor IS NOT NULL AND NEW.numero_serie IS NOT NULL THEN
    NEW.stage := 'COMPLETO';
  
  -- Si solo tiene fiscal y hay coordinacion_id → EN_TRANSITO
  ELSIF NEW.proveedor IS NOT NULL AND NEW.numero_serie IS NULL AND NEW.coordinacion_id IS NOT NULL THEN
    NEW.stage := 'EN_TRANSITO';
  
  -- Si solo tiene fiscal sin coordinacion → FISCAL
  ELSIF NEW.proveedor IS NOT NULL AND NEW.numero_serie IS NULL THEN
    NEW.stage := 'FISCAL';
  
  -- Si solo tiene físico (serie) → PENDIENTE_FISCAL
  ELSIF NEW.numero_serie IS NOT NULL AND NEW.proveedor IS NULL THEN
    NEW.stage := 'PENDIENTE_FISCAL';
  
  -- Si tiene físico y ya fue recibido → FISICO
  ELSIF NEW.numero_serie IS NOT NULL AND NEW.fecha_recepcion IS NOT NULL THEN
    NEW.stage := 'FISICO';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.actualizar_stage_inventario() OWNER TO postgres;

--
-- Name: generar_folio_inventario(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generar_folio_inventario() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    anio_actual INTEGER;
    secuencia INTEGER;
BEGIN
    -- Si ya tiene folio, no hacer nada
    IF NEW.folio IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    anio_actual := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Obtener el siguiente nÃºmero de secuencia para este aÃ±o
    SELECT COALESCE(MAX(CAST(SUBSTRING(folio FROM 'INV-' || anio_actual || '-(.*)') AS INTEGER)), 0) + 1
    INTO secuencia
    FROM public.inventario
    WHERE folio LIKE 'INV-' || anio_actual || '-%';
    
    -- Generar folio con formato: INV-2026-001
    NEW.folio := 'INV-' || anio_actual || '-' || LPAD(secuencia::TEXT, 3, '0');
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.generar_folio_inventario() OWNER TO postgres;

--
-- Name: get_dependency_stats(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_dependency_stats(dep_id integer) RETURNS TABLE(total_empleados bigint, empleados_activos bigint, total_inventario bigint, inventario_disponible bigint, solicitudes_pendientes bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM empleados WHERE dependencia_id = dep_id),
        (SELECT COUNT(*) FROM empleados WHERE dependencia_id = dep_id AND activo = true),
        (SELECT COUNT(*) FROM inventario WHERE dependencia_id = dep_id),
        (SELECT COUNT(*) FROM inventario WHERE dependencia_id = dep_id AND estado = 'disponible'),
        (SELECT COUNT(*) FROM solicitudes WHERE dependencia_id = dep_id AND estado = 'pendiente');
END;
$$;


ALTER FUNCTION public.get_dependency_stats(dep_id integer) OWNER TO postgres;

--
-- Name: FUNCTION get_dependency_stats(dep_id integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_dependency_stats(dep_id integer) IS 'Obtiene estadÃ­sticas generales de una dependencia especÃ­fica';


--
-- Name: refresh_materialized_views(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_materialized_views() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventario_stats;
    RAISE NOTICE 'Vistas materializadas actualizadas exitosamente en %', NOW();
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error al refrescar vistas: %', SQLERRM;
END;
$$;


ALTER FUNCTION public.refresh_materialized_views() OWNER TO postgres;

--
-- Name: FUNCTION refresh_materialized_views(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.refresh_materialized_views() IS 'Refresca todas las vistas materializadas del sistema de forma concurrente';


--
-- Name: set_current_user(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_current_user(user_id integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::TEXT, false);
END;
$$;


ALTER FUNCTION public.set_current_user(user_id integer) OWNER TO postgres;

--
-- Name: FUNCTION set_current_user(user_id integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.set_current_user(user_id integer) IS 'Establece el contexto del usuario actual para RLS';


--
-- Name: trigger_set_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_set_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_set_timestamp() OWNER TO postgres;

--
-- Name: trigger_set_timestamp_transfers(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_set_timestamp_transfers() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_set_timestamp_transfers() OWNER TO postgres;

--
-- Name: update_conceptos_nomina_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_conceptos_nomina_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_conceptos_nomina_timestamp() OWNER TO postgres;

--
-- Name: update_empleado_concepto_nomina_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_empleado_concepto_nomina_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_empleado_concepto_nomina_timestamp() OWNER TO postgres;

--
-- Name: update_fecha_actualizacion(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_fecha_actualizacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_fecha_actualizacion() OWNER TO postgres;

--
-- Name: update_fichas_tecnicas_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_fichas_tecnicas_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_fichas_tecnicas_updated_at() OWNER TO postgres;

--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_modified_column() OWNER TO postgres;

--
-- Name: update_usuarios_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_usuarios_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_usuarios_timestamp() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: areas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.areas (
    id integer NOT NULL,
    dependencia_id integer,
    nombre character varying(200) NOT NULL,
    descripcion text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.areas OWNER TO postgres;

--
-- Name: areas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.areas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.areas_id_seq OWNER TO postgres;

--
-- Name: areas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.areas_id_seq OWNED BY public.areas.id;


--
-- Name: asistencias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asistencias (
    id integer NOT NULL,
    empleado_id integer,
    fecha date NOT NULL,
    quincena integer NOT NULL,
    presente boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.asistencias OWNER TO postgres;

--
-- Name: TABLE asistencias; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.asistencias IS 'Registro de asistencias por quincena';


--
-- Name: asistencias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.asistencias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asistencias_id_seq OWNER TO postgres;

--
-- Name: asistencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asistencias_id_seq OWNED BY public.asistencias.id;


--
-- Name: asistencias_quincenales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asistencias_quincenales (
    id integer NOT NULL,
    empleado_id integer,
    anio integer NOT NULL,
    enero_q1 character varying(1),
    enero_q2 character varying(1),
    febrero_q1 character varying(1),
    febrero_q2 character varying(1),
    marzo_q1 character varying(1),
    marzo_q2 character varying(1),
    abril_q1 character varying(1),
    abril_q2 character varying(1),
    mayo_q1 character varying(1),
    mayo_q2 character varying(1),
    junio_q1 character varying(1),
    junio_q2 character varying(1),
    julio_q1 character varying(1),
    julio_q2 character varying(1),
    agosto_q1 character varying(1),
    agosto_q2 character varying(1),
    septiembre_q1 character varying(1),
    septiembre_q2 character varying(1),
    octubre_q1 character varying(1),
    octubre_q2 character varying(1),
    noviembre_q1 character varying(1),
    noviembre_q2 character varying(1),
    diciembre_q1 character varying(1),
    diciembre_q2 character varying(1),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT asistencias_quincenales_abril_q1_check CHECK (((abril_q1)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_abril_q2_check CHECK (((abril_q2)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_agosto_q1_check CHECK (((agosto_q1)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_agosto_q2_check CHECK (((agosto_q2)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_diciembre_q1_check CHECK (((diciembre_q1)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_diciembre_q2_check CHECK (((diciembre_q2)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_enero_q1_check CHECK (((enero_q1)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_enero_q2_check CHECK (((enero_q2)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_febrero_q1_check CHECK (((febrero_q1)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_febrero_q2_check CHECK (((febrero_q2)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_julio_q1_check CHECK (((julio_q1)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_julio_q2_check CHECK (((julio_q2)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_junio_q1_check CHECK (((junio_q1)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_junio_q2_check CHECK (((junio_q2)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_marzo_q1_check CHECK (((marzo_q1)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_marzo_q2_check CHECK (((marzo_q2)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_mayo_q1_check CHECK (((mayo_q1)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_mayo_q2_check CHECK (((mayo_q2)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_noviembre_q1_check CHECK (((noviembre_q1)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_noviembre_q2_check CHECK (((noviembre_q2)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_octubre_q1_check CHECK (((octubre_q1)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_octubre_q2_check CHECK (((octubre_q2)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_septiembre_q1_check CHECK (((septiembre_q1)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[]))),
    CONSTRAINT asistencias_quincenales_septiembre_q2_check CHECK (((septiembre_q2)::text = ANY ((ARRAY['A'::character varying, 'F'::character varying])::text[])))
);


ALTER TABLE public.asistencias_quincenales OWNER TO postgres;

--
-- Name: asistencias_quincenales_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.asistencias_quincenales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asistencias_quincenales_id_seq OWNER TO postgres;

--
-- Name: asistencias_quincenales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asistencias_quincenales_id_seq OWNED BY public.asistencias_quincenales.id;


--
-- Name: conceptos_nomina; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conceptos_nomina (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.conceptos_nomina OWNER TO postgres;

--
-- Name: TABLE conceptos_nomina; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.conceptos_nomina IS 'Catálogo de conceptos que pueden aplicarse en la nómina';


--
-- Name: conceptos_nomina_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conceptos_nomina_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conceptos_nomina_id_seq OWNER TO postgres;

--
-- Name: conceptos_nomina_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conceptos_nomina_id_seq OWNED BY public.conceptos_nomina.id;


--
-- Name: coordinaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coordinaciones (
    id integer NOT NULL,
    dependencia_id integer,
    nombre character varying(200) NOT NULL,
    descripcion text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.coordinaciones OWNER TO postgres;

--
-- Name: coordinaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.coordinaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.coordinaciones_id_seq OWNER TO postgres;

--
-- Name: coordinaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.coordinaciones_id_seq OWNED BY public.coordinaciones.id;


--
-- Name: dependencias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dependencias (
    id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    descripcion text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.dependencias OWNER TO postgres;

--
-- Name: dependencias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dependencias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dependencias_id_seq OWNER TO postgres;

--
-- Name: dependencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dependencias_id_seq OWNED BY public.dependencias.id;


--
-- Name: edificios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.edificios (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.edificios OWNER TO postgres;

--
-- Name: edificios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.edificios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.edificios_id_seq OWNER TO postgres;

--
-- Name: edificios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.edificios_id_seq OWNED BY public.edificios.id;


--
-- Name: email_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_history (
    id integer NOT NULL,
    subject character varying(500) NOT NULL,
    message text NOT NULL,
    sender_name character varying(100),
    recipients_count integer DEFAULT 0,
    recipients_data jsonb DEFAULT '[]'::jsonb,
    sent_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    failed_emails jsonb DEFAULT '[]'::jsonb,
    template_id integer,
    used_variables boolean DEFAULT false,
    sent_by_user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tracking_id uuid DEFAULT gen_random_uuid(),
    opened_count integer DEFAULT 0,
    first_opened_at timestamp without time zone,
    last_opened_at timestamp without time zone,
    confirmed_count integer DEFAULT 0,
    first_confirmed_at timestamp without time zone,
    last_confirmed_at timestamp without time zone
);


ALTER TABLE public.email_history OWNER TO postgres;

--
-- Name: TABLE email_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.email_history IS 'Historial de correos masivos enviados';


--
-- Name: COLUMN email_history.tracking_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.email_history.tracking_id IS 'ID único para rastrear apertura del correo';


--
-- Name: COLUMN email_history.opened_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.email_history.opened_count IS 'Número de veces que se abrió el correo';


--
-- Name: COLUMN email_history.first_opened_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.email_history.first_opened_at IS 'Primera vez que se abrió el correo';


--
-- Name: COLUMN email_history.last_opened_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.email_history.last_opened_at IS 'Última vez que se abrió el correo';


--
-- Name: COLUMN email_history.confirmed_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.email_history.confirmed_count IS 'Numero de veces que se dio clic en confirmar';


--
-- Name: COLUMN email_history.first_confirmed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.email_history.first_confirmed_at IS 'Primera vez que se confirmo el correo';


--
-- Name: COLUMN email_history.last_confirmed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.email_history.last_confirmed_at IS 'Ultima vez que se confirmo el correo';


--
-- Name: email_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_history_id_seq OWNER TO postgres;

--
-- Name: email_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_history_id_seq OWNED BY public.email_history.id;


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_logs (
    id integer NOT NULL,
    usuario_id integer,
    destinatarios text NOT NULL,
    asunto character varying(255),
    estado character varying(50) DEFAULT 'enviado'::character varying,
    message_id character varying(255),
    abierto boolean DEFAULT false,
    fecha_apertura timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.email_logs OWNER TO postgres;

--
-- Name: email_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_logs_id_seq OWNER TO postgres;

--
-- Name: email_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_logs_id_seq OWNED BY public.email_logs.id;


--
-- Name: email_recipient_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_recipient_history (
    id integer NOT NULL,
    history_id integer NOT NULL,
    recipient_email character varying(255) NOT NULL,
    recipient_name character varying(200),
    status character varying(20) DEFAULT 'enviado'::character varying NOT NULL,
    sent_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    opened_at timestamp without time zone,
    confirmed_at timestamp without time zone,
    error_message text,
    tracking_token uuid DEFAULT gen_random_uuid()
);


ALTER TABLE public.email_recipient_history OWNER TO postgres;

--
-- Name: TABLE email_recipient_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.email_recipient_history IS 'Historial detallado por destinatario para envíos masivos de correo.';


--
-- Name: COLUMN email_recipient_history.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.email_recipient_history.status IS 'Estado del correo: enviado, fallido, abierto, confirmado.';


--
-- Name: email_recipient_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_recipient_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_recipient_history_id_seq OWNER TO postgres;

--
-- Name: email_recipient_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_recipient_history_id_seq OWNED BY public.email_recipient_history.id;


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_templates (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    subject character varying(200) NOT NULL,
    message text NOT NULL,
    variables jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.email_templates OWNER TO postgres;

--
-- Name: TABLE email_templates; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.email_templates IS 'Plantillas de correo electrónico reutilizables';


--
-- Name: email_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_templates_id_seq OWNER TO postgres;

--
-- Name: email_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_templates_id_seq OWNED BY public.email_templates.id;


--
-- Name: empleado_concepto_nomina; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empleado_concepto_nomina (
    id integer NOT NULL,
    empleado_id integer NOT NULL,
    concepto_nomina_id integer NOT NULL,
    activo boolean DEFAULT true,
    firmado boolean DEFAULT false,
    fecha_firma timestamp without time zone,
    periodo_aplicacion character varying(20),
    observaciones text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.empleado_concepto_nomina OWNER TO postgres;

--
-- Name: TABLE empleado_concepto_nomina; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.empleado_concepto_nomina IS 'Relación entre empleados y conceptos de nómina, con control de firmas';


--
-- Name: COLUMN empleado_concepto_nomina.firmado; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.empleado_concepto_nomina.firmado IS 'Indica si el empleado ya firmó el documento correspondiente a este concepto';


--
-- Name: COLUMN empleado_concepto_nomina.periodo_aplicacion; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.empleado_concepto_nomina.periodo_aplicacion IS 'Periodo en formato YYYY-MM (ejemplo: 2026-01 para enero 2026)';


--
-- Name: empleado_concepto_nomina_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.empleado_concepto_nomina_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.empleado_concepto_nomina_id_seq OWNER TO postgres;

--
-- Name: empleado_concepto_nomina_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.empleado_concepto_nomina_id_seq OWNED BY public.empleado_concepto_nomina.id;


--
-- Name: empleados; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empleados (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido_paterno character varying(100) NOT NULL,
    apellido_materno character varying(100),
    email character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    rfc character varying(13),
    telefono character varying(15),
    dependencia_id integer,
    tipo character varying(50) DEFAULT 'docente'::character varying,
    estatus character varying(50) DEFAULT 'activo'::character varying,
    activo boolean DEFAULT true,
    fecha_nacimiento date,
    genero character varying(10),
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    unidad_responsable character varying(10),
    subtipo_administrativo character varying(50),
    CONSTRAINT empleados_subtipo_administrativo_check CHECK (((subtipo_administrativo IS NULL) OR ((subtipo_administrativo)::text = ANY ((ARRAY['Administrativo de Base'::character varying, 'Administrativo de Apoyo'::character varying])::text[])))),
    CONSTRAINT empleados_unidad_responsable_check CHECK (((unidad_responsable)::text = ANY ((ARRAY['231'::character varying, '231-1'::character varying, '231-2'::character varying, '231-3'::character varying])::text[])))
);


ALTER TABLE public.empleados OWNER TO postgres;

--
-- Name: TABLE empleados; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.empleados IS 'Empleados para el sistema SIGAP';


--
-- Name: COLUMN empleados.unidad_responsable; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.empleados.unidad_responsable IS 'Clave de unidad responsable: 231 (Morelia), 231-1 (Cd. Hidalgo), 231-2 (Lázaro Cárdenas), 231-3 (Uruapan)';


--
-- Name: COLUMN empleados.subtipo_administrativo; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.empleados.subtipo_administrativo IS 'Clasificación del personal administrativo';


--
-- Name: empleados_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.empleados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.empleados_id_seq OWNER TO postgres;

--
-- Name: empleados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.empleados_id_seq OWNED BY public.empleados.id;


--
-- Name: fichas_tecnicas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fichas_tecnicas (
    id integer NOT NULL,
    nombre_coordinacion character varying(255),
    nombre_coordinador character varying(255),
    nombre_evento character varying(500) NOT NULL,
    fecha_evento date NOT NULL,
    tipo_evento character varying(100) NOT NULL,
    modalidad character varying(50),
    fecha_limite_inscripcion date,
    requiere_inscripcion boolean DEFAULT false,
    es_gratuito boolean DEFAULT true,
    costo numeric(10,2),
    dirigido_a text,
    lugar_evento character varying(255),
    talleristas text,
    objetivos text,
    temas text,
    observaciones text,
    usuario_id integer NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    motivo_rechazo text,
    domicilio text,
    duracion text,
    telefono_contacto text,
    requiere_montaje boolean DEFAULT false,
    autoridades_invitadas text,
    programa_evento text,
    datos_estadisticos text,
    informacion_historica text,
    presupuesto text,
    requiere_diseno_grafico boolean DEFAULT false,
    requiere_publicacion boolean DEFAULT false,
    requiere_transmision text,
    compromiso_rectora boolean DEFAULT false,
    CONSTRAINT fichas_tecnicas_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'aprobado'::character varying, 'rechazado'::character varying])::text[])))
);


ALTER TABLE public.fichas_tecnicas OWNER TO postgres;

--
-- Name: fichas_tecnicas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fichas_tecnicas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fichas_tecnicas_id_seq OWNER TO postgres;

--
-- Name: fichas_tecnicas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fichas_tecnicas_id_seq OWNED BY public.fichas_tecnicas.id;


--
-- Name: grupos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grupos (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    semestre integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.grupos OWNER TO postgres;

--
-- Name: grupos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grupos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grupos_id_seq OWNER TO postgres;

--
-- Name: grupos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grupos_id_seq OWNED BY public.grupos.id;


--
-- Name: horarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.horarios (
    id integer NOT NULL,
    salon_id integer,
    maestro_id integer,
    grupo_id integer,
    dia character varying(20) NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.horarios OWNER TO postgres;

--
-- Name: TABLE horarios; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.horarios IS 'Control de horarios por aula';


--
-- Name: horarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.horarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.horarios_id_seq OWNER TO postgres;

--
-- Name: horarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.horarios_id_seq OWNED BY public.horarios.id;


--
-- Name: inventario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventario (
    id integer NOT NULL,
    marca character varying(100),
    modelo character varying(100),
    dependencia_id integer,
    ubicacion character varying(200),
    estado character varying(50) DEFAULT 'buena'::character varying NOT NULL,
    descripcion text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    numero_patrimonio character varying(50),
    numero_serie character varying(100),
    coordinacion_id integer,
    es_oficial_siia boolean DEFAULT false,
    es_local boolean DEFAULT true,
    es_investigacion boolean DEFAULT false,
    folio character varying(50),
    tipo_bien character varying(100),
    comentarios text,
    estado_uso character varying(50) DEFAULT 'operativo'::character varying,
    costo numeric(12,2),
    cog character varying(50),
    uuid character varying(100),
    factura character varying(100),
    fondo character varying(255),
    cuenta_por_pagar character varying(100),
    empleado_resguardante_id integer,
    usuario_asignado_id integer,
    numero_resguardo_interno character varying(50),
    estatus_validacion character varying(50) DEFAULT 'borrador'::character varying,
    fecha_adquisicion date,
    fecha_baja date,
    motivo_baja text,
    vida_util_anios integer DEFAULT 5,
    depreciacion_anual numeric(12,2),
    valor_actual numeric(12,2),
    ultimo_mantenimiento date,
    proximo_mantenimiento date,
    garantia_meses integer,
    proveedor character varying(200),
    observaciones_tecnicas text,
    foto_url character varying(500),
    documento_adjunto_url character varying(500),
    stage character varying(50) DEFAULT 'COMPLETO'::character varying,
    uuid_fiscal character varying(100),
    numero_factura character varying(100),
    fecha_compra date,
    fecha_envio timestamp without time zone,
    fecha_recepcion timestamp without time zone,
    enviado_por integer,
    recibido_por integer,
    CONSTRAINT inventario_estado_uso_check CHECK (((estado_uso)::text = ANY ((ARRAY['operativo'::character varying, 'en_reparacion'::character varying, 'de_baja'::character varying, 'obsoleto'::character varying, 'resguardo_temporal'::character varying])::text[]))),
    CONSTRAINT inventario_estatus_validacion_check CHECK (((estatus_validacion)::text = ANY ((ARRAY['borrador'::character varying, 'revision'::character varying, 'validado'::character varying, 'rechazado'::character varying])::text[]))),
    CONSTRAINT inventario_stage_check CHECK (((stage)::text = ANY ((ARRAY['FISCAL'::character varying, 'EN_TRANSITO'::character varying, 'FISICO'::character varying, 'COMPLETO'::character varying, 'PENDIENTE_FISCAL'::character varying])::text[])))
);


ALTER TABLE public.inventario OWNER TO postgres;

--
-- Name: TABLE inventario; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.inventario IS 'GestiÃ³n de inventario de equipos';


--
-- Name: COLUMN inventario.numero_patrimonio; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.numero_patrimonio IS 'N£mero de patrimonio £nico del art¡culo';


--
-- Name: COLUMN inventario.numero_serie; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.numero_serie IS 'N£mero de serie del fabricante';


--
-- Name: COLUMN inventario.coordinacion_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.coordinacion_id IS 'CoordinaciÃ³n responsable del activo (FK a coordinaciones)';


--
-- Name: COLUMN inventario.es_oficial_siia; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.es_oficial_siia IS 'Indica si pertenece al inventario oficial reportado a SIIA';


--
-- Name: COLUMN inventario.es_local; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.es_local IS 'Inventario local de la coordinaciÃ³n';


--
-- Name: COLUMN inventario.es_investigacion; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.es_investigacion IS 'Inventario de proyectos de investigaciÃ³n';


--
-- Name: COLUMN inventario.folio; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.folio IS 'Folio Ãºnico generado del sistema (ej: INV-2026-001)';


--
-- Name: COLUMN inventario.costo; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.costo IS 'Costo de adquisiciÃ³n (dato fiscal)';


--
-- Name: COLUMN inventario.cog; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.cog IS 'Clasificador por Objeto del Gasto';


--
-- Name: COLUMN inventario.fondo; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.fondo IS 'Fondo presupuestal usado (Estatal, Federal, etc)';


--
-- Name: COLUMN inventario.estatus_validacion; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.estatus_validacion IS 'Estado del flujo de validaciÃ³n: borrador, revision, validado, rechazado';


--
-- Name: COLUMN inventario.proveedor; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.proveedor IS 'Proveedor que vendiÃ³ el equipo (dato fiscal)';


--
-- Name: COLUMN inventario.stage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.stage IS 'Etapa del flujo: FISCAL (admin solo), EN_TRANSITO (enviado), FISICO (coord solo), COMPLETO, PENDIENTE_FISCAL';


--
-- Name: COLUMN inventario.uuid_fiscal; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.uuid_fiscal IS 'UUID del CFDI/Factura electrÃ³nica';


--
-- Name: COLUMN inventario.numero_factura; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.numero_factura IS 'NÃºmero de factura fÃ­sica';


--
-- Name: COLUMN inventario.fecha_envio; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.fecha_envio IS 'Fecha en que admin enviÃ³ a coordinaciÃ³n';


--
-- Name: COLUMN inventario.fecha_recepcion; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.fecha_recepcion IS 'Fecha en que coordinador recibiÃ³';


--
-- Name: COLUMN inventario.enviado_por; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.enviado_por IS 'Usuario admin que enviÃ³ el equipo';


--
-- Name: COLUMN inventario.recibido_por; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.recibido_por IS 'Usuario coordinador que recibiÃ³';


--
-- Name: inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventario_id_seq OWNER TO postgres;

--
-- Name: inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventario_id_seq OWNED BY public.inventario.id;


--
-- Name: maestros; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maestros (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido_paterno character varying(100) NOT NULL,
    apellido_materno character varying(100),
    email character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.maestros OWNER TO postgres;

--
-- Name: maestros_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.maestros_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maestros_id_seq OWNER TO postgres;

--
-- Name: maestros_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.maestros_id_seq OWNED BY public.maestros.id;


--
-- Name: mv_inventario_stats; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.mv_inventario_stats AS
 SELECT dependencia_id,
    estado,
    count(*) AS total,
    count(
        CASE
            WHEN ((estado)::text = 'disponible'::text) THEN 1
            ELSE NULL::integer
        END) AS disponibles,
    count(
        CASE
            WHEN ((estado)::text = 'en_uso'::text) THEN 1
            ELSE NULL::integer
        END) AS en_uso,
    count(
        CASE
            WHEN ((estado)::text = 'mantenimiento'::text) THEN 1
            ELSE NULL::integer
        END) AS mantenimiento,
    count(
        CASE
            WHEN ((estado)::text = 'baja'::text) THEN 1
            ELSE NULL::integer
        END) AS baja
   FROM public.inventario
  GROUP BY dependencia_id, estado
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.mv_inventario_stats OWNER TO postgres;

--
-- Name: MATERIALIZED VIEW mv_inventario_stats; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON MATERIALIZED VIEW public.mv_inventario_stats IS 'EstadÃ­sticas agregadas de inventario por dependencia y estado';


--
-- Name: salones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salones (
    id integer NOT NULL,
    edificio_id integer,
    nombre character varying(50) NOT NULL,
    piso integer NOT NULL,
    lado character varying(20),
    capacidad_butacas integer DEFAULT 0,
    alumnos_actuales integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.salones OWNER TO postgres;

--
-- Name: salones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salones_id_seq OWNER TO postgres;

--
-- Name: salones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salones_id_seq OWNED BY public.salones.id;


--
-- Name: solicitudes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.solicitudes (
    id integer NOT NULL,
    usuario_id integer,
    tipo_solicitud character varying(100) NOT NULL,
    asunto character varying(255) NOT NULL,
    descripcion text,
    estado character varying(50) DEFAULT 'pendiente'::character varying,
    prioridad character varying(50) DEFAULT 'media'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta timestamp without time zone,
    respuesta text,
    observaciones text
);


ALTER TABLE public.solicitudes OWNER TO postgres;

--
-- Name: TABLE solicitudes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.solicitudes IS 'Solicitudes de mantenimiento y soporte';


--
-- Name: solicitudes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.solicitudes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.solicitudes_id_seq OWNER TO postgres;

--
-- Name: solicitudes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.solicitudes_id_seq OWNED BY public.solicitudes.id;


--
-- Name: space_audit_scans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.space_audit_scans (
    id integer NOT NULL,
    audit_id integer NOT NULL,
    inventory_id integer,
    codigo character varying(255),
    estado character varying(50),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.space_audit_scans OWNER TO postgres;

--
-- Name: space_audit_scans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.space_audit_scans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.space_audit_scans_id_seq OWNER TO postgres;

--
-- Name: space_audit_scans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.space_audit_scans_id_seq OWNED BY public.space_audit_scans.id;


--
-- Name: space_audits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.space_audits (
    id integer NOT NULL,
    space_id integer NOT NULL,
    started_by integer,
    status character varying(50) DEFAULT 'in_progress'::character varying,
    started_at timestamp with time zone DEFAULT now(),
    closed_at timestamp with time zone,
    summary jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.space_audits OWNER TO postgres;

--
-- Name: space_audits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.space_audits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.space_audits_id_seq OWNER TO postgres;

--
-- Name: space_audits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.space_audits_id_seq OWNED BY public.space_audits.id;


--
-- Name: spaces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.spaces (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    parent_id integer,
    type character varying(50) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    audit_status character varying(50) DEFAULT 'not_audited'::character varying,
    assigned_quadrant character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.spaces OWNER TO postgres;

--
-- Name: spaces_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.spaces_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.spaces_id_seq OWNER TO postgres;

--
-- Name: spaces_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.spaces_id_seq OWNED BY public.spaces.id;


--
-- Name: transfers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transfers (
    id integer NOT NULL,
    inventory_id integer NOT NULL,
    from_space integer,
    to_space integer,
    requested_by integer,
    approved_by integer,
    status character varying(50) DEFAULT 'completed'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.transfers OWNER TO postgres;

--
-- Name: transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transfers_id_seq OWNER TO postgres;

--
-- Name: transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transfers_id_seq OWNED BY public.transfers.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido_paterno character varying(100) NOT NULL,
    apellido_materno character varying(100),
    role character varying(50) DEFAULT 'usuario'::character varying NOT NULL,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    dependencia_id integer,
    rfc character varying(13),
    telefono character varying(20),
    coordinacion_id integer
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: TABLE usuarios; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.usuarios IS 'Usuarios del sistema con autenticaciÃ³n';


--
-- Name: COLUMN usuarios.activo; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.usuarios.activo IS 'Indica si el usuario est?? activo en el sistema';


--
-- Name: COLUMN usuarios.rfc; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.usuarios.rfc IS 'RFC del usuario (para resguardo fiscal)';


--
-- Name: COLUMN usuarios.telefono; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.usuarios.telefono IS 'Tel??fono de contacto del usuario';


--
-- Name: COLUMN usuarios.coordinacion_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.usuarios.coordinacion_id IS 'Coordinaci??n a la que pertenece el usuario';


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: v_control_firmas; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_control_firmas AS
 SELECT e.id AS empleado_id,
    e.nombre,
    e.apellido_paterno,
    e.apellido_materno,
    e.rfc,
    e.tipo,
    e.subtipo_administrativo,
    e.unidad_responsable,
    e.dependencia_id,
    d.nombre AS dependencia_nombre,
    cn.id AS concepto_id,
    cn.nombre AS concepto_nombre,
    ecn.activo AS concepto_activo,
    ecn.firmado,
    ecn.fecha_firma,
    ecn.periodo_aplicacion,
    ecn.observaciones
   FROM (((public.empleados e
     LEFT JOIN public.dependencias d ON ((e.dependencia_id = d.id)))
     LEFT JOIN public.empleado_concepto_nomina ecn ON ((e.id = ecn.empleado_id)))
     LEFT JOIN public.conceptos_nomina cn ON ((ecn.concepto_nomina_id = cn.id)))
  WHERE (e.activo = true)
  ORDER BY e.apellido_paterno, e.apellido_materno, e.nombre, cn.nombre;


ALTER VIEW public.v_control_firmas OWNER TO postgres;

--
-- Name: VIEW v_control_firmas; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_control_firmas IS 'Vista consolidada para el control de firmas por empleado y concepto de nómina';


--
-- Name: v_inventario_completo; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_inventario_completo AS
 SELECT i.id,
    i.marca,
    i.modelo,
    i.dependencia_id,
    i.ubicacion,
    i.estado,
    i.descripcion,
    i.created_at,
    i.updated_at,
    i.numero_patrimonio,
    i.numero_serie,
    i.coordinacion_id,
    i.es_oficial_siia,
    i.es_local,
    i.es_investigacion,
    i.folio,
    i.tipo_bien,
    i.comentarios,
    i.estado_uso,
    i.costo,
    i.cog,
    i.uuid,
    i.factura,
    i.fondo,
    i.cuenta_por_pagar,
    i.empleado_resguardante_id,
    i.usuario_asignado_id,
    i.numero_resguardo_interno,
    i.estatus_validacion,
    i.fecha_adquisicion,
    i.fecha_baja,
    i.motivo_baja,
    i.vida_util_anios,
    i.depreciacion_anual,
    i.valor_actual,
    i.ultimo_mantenimiento,
    i.proximo_mantenimiento,
    i.garantia_meses,
    i.proveedor,
    i.observaciones_tecnicas,
    i.foto_url,
    i.documento_adjunto_url,
    c.nombre AS coordinacion_nombre,
    d.nombre AS dependencia_nombre,
    (((e.nombre)::text || ' '::text) || (e.apellido_paterno)::text) AS resguardante_nombre,
    (((u.nombre)::text || ' '::text) || (u.apellido_paterno)::text) AS usuario_asignado_nombre
   FROM ((((public.inventario i
     LEFT JOIN public.coordinaciones c ON ((i.coordinacion_id = c.id)))
     LEFT JOIN public.dependencias d ON ((i.dependencia_id = d.id)))
     LEFT JOIN public.empleados e ON ((i.empleado_resguardante_id = e.id)))
     LEFT JOIN public.usuarios u ON ((i.usuario_asignado_id = u.id)));


ALTER VIEW public.v_inventario_completo OWNER TO postgres;

--
-- Name: VIEW v_inventario_completo; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_inventario_completo IS 'Vista desnormalizada con joins de todas las relaciones del inventario';


--
-- Name: areas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.areas ALTER COLUMN id SET DEFAULT nextval('public.areas_id_seq'::regclass);


--
-- Name: asistencias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias ALTER COLUMN id SET DEFAULT nextval('public.asistencias_id_seq'::regclass);


--
-- Name: asistencias_quincenales id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias_quincenales ALTER COLUMN id SET DEFAULT nextval('public.asistencias_quincenales_id_seq'::regclass);


--
-- Name: conceptos_nomina id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conceptos_nomina ALTER COLUMN id SET DEFAULT nextval('public.conceptos_nomina_id_seq'::regclass);


--
-- Name: coordinaciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coordinaciones ALTER COLUMN id SET DEFAULT nextval('public.coordinaciones_id_seq'::regclass);


--
-- Name: dependencias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dependencias ALTER COLUMN id SET DEFAULT nextval('public.dependencias_id_seq'::regclass);


--
-- Name: edificios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edificios ALTER COLUMN id SET DEFAULT nextval('public.edificios_id_seq'::regclass);


--
-- Name: email_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_history ALTER COLUMN id SET DEFAULT nextval('public.email_history_id_seq'::regclass);


--
-- Name: email_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_logs ALTER COLUMN id SET DEFAULT nextval('public.email_logs_id_seq'::regclass);


--
-- Name: email_recipient_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_recipient_history ALTER COLUMN id SET DEFAULT nextval('public.email_recipient_history_id_seq'::regclass);


--
-- Name: email_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates ALTER COLUMN id SET DEFAULT nextval('public.email_templates_id_seq'::regclass);


--
-- Name: empleado_concepto_nomina id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleado_concepto_nomina ALTER COLUMN id SET DEFAULT nextval('public.empleado_concepto_nomina_id_seq'::regclass);


--
-- Name: empleados id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleados ALTER COLUMN id SET DEFAULT nextval('public.empleados_id_seq'::regclass);


--
-- Name: fichas_tecnicas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fichas_tecnicas ALTER COLUMN id SET DEFAULT nextval('public.fichas_tecnicas_id_seq'::regclass);


--
-- Name: grupos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos ALTER COLUMN id SET DEFAULT nextval('public.grupos_id_seq'::regclass);


--
-- Name: horarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horarios ALTER COLUMN id SET DEFAULT nextval('public.horarios_id_seq'::regclass);


--
-- Name: inventario id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario ALTER COLUMN id SET DEFAULT nextval('public.inventario_id_seq'::regclass);


--
-- Name: maestros id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maestros ALTER COLUMN id SET DEFAULT nextval('public.maestros_id_seq'::regclass);


--
-- Name: salones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salones ALTER COLUMN id SET DEFAULT nextval('public.salones_id_seq'::regclass);


--
-- Name: solicitudes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes ALTER COLUMN id SET DEFAULT nextval('public.solicitudes_id_seq'::regclass);


--
-- Name: space_audit_scans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_audit_scans ALTER COLUMN id SET DEFAULT nextval('public.space_audit_scans_id_seq'::regclass);


--
-- Name: space_audits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_audits ALTER COLUMN id SET DEFAULT nextval('public.space_audits_id_seq'::regclass);


--
-- Name: spaces id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.spaces ALTER COLUMN id SET DEFAULT nextval('public.spaces_id_seq'::regclass);


--
-- Name: transfers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfers ALTER COLUMN id SET DEFAULT nextval('public.transfers_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: areas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.areas (id, dependencia_id, nombre, descripcion, created_at) FROM stdin;
\.


--
-- Data for Name: asistencias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asistencias (id, empleado_id, fecha, quincena, presente, created_at) FROM stdin;
\.


--
-- Data for Name: asistencias_quincenales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asistencias_quincenales (id, empleado_id, anio, enero_q1, enero_q2, febrero_q1, febrero_q2, marzo_q1, marzo_q2, abril_q1, abril_q2, mayo_q1, mayo_q2, junio_q1, junio_q2, julio_q1, julio_q2, agosto_q1, agosto_q2, septiembre_q1, septiembre_q2, octubre_q1, octubre_q2, noviembre_q1, noviembre_q2, diciembre_q1, diciembre_q2, created_at, updated_at) FROM stdin;
7	2	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-04 00:11:33.282453	2026-01-04 00:11:33.282453
9	4	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-04 00:11:33.282912	2026-01-04 00:11:33.282912
11	7	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-04 00:11:33.283481	2026-01-04 00:11:33.283481
12	8	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-04 00:11:33.283859	2026-01-04 00:11:33.283859
13	7	2025	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-13 23:11:19.840612	2026-01-13 23:11:19.840612
14	2	2025	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-13 23:11:19.842524	2026-01-13 23:11:19.842524
15	4	2025	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-13 23:11:19.842943	2026-01-13 23:11:19.842943
16	8	2025	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-13 23:11:19.843202	2026-01-13 23:11:19.843202
10	5	2026	F	F	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-04 00:11:33.28309	2026-01-13 23:41:03.885303
5	6	2026	A	A	F	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-03 22:50:04.941155	2026-01-13 23:43:17.016694
8	3	2026	A	A	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-04 00:11:33.282715	2026-01-13 23:43:22.304428
6	1	2026	A	A	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-04 00:11:33.28077	2026-01-13 23:51:36.959328
17	10	2026	F	F	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-15 10:09:10.405693	2026-01-15 10:09:13.692434
2	3	2025	\N	\N	A	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-11-07 11:09:28.69157	2025-11-10 12:12:58.810788
1	1	2025	\N	\N	\N	A	\N	\N	A	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-11-03 02:54:10.895754	2025-11-10 12:13:42.690371
4	5	2025	\N	\N	\N	\N	\N	F	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-11-10 12:13:43.386495	2025-11-10 12:13:43.666206
18	9	2026	A	F	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-15 10:09:10.843593	2026-01-15 10:10:56.300847
3	6	2025	A	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-11-07 11:09:31.173465	2025-11-10 13:59:02.854883
\.


--
-- Data for Name: conceptos_nomina; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conceptos_nomina (id, nombre, descripcion, activo, created_at, updated_at) FROM stdin;
1	Quincena Normal	Pago quincenal regular	t	2026-01-13 22:05:46.859215	2026-01-13 22:05:46.859215
2	Convenio 4	Pago por convenio específico tipo 4	t	2026-01-13 22:05:46.859215	2026-01-13 22:05:46.859215
3	Beca al desempeño	Incentivo por desempeño académico	t	2026-01-13 22:05:46.859215	2026-01-13 22:05:46.859215
4	Prejubilatorio	Compensación prejubilatoria	t	2026-01-13 22:05:46.859215	2026-01-13 22:05:46.859215
\.


--
-- Data for Name: coordinaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.coordinaciones (id, dependencia_id, nombre, descripcion, created_at) FROM stdin;
1	1	Coordinación de Infraestructura TI	Coordinación de infraestructura tecnológica	2026-01-04 01:35:34.832111
2	2	Coordinación de Servicios Informáticos	Gestión de servicios informáticos	2026-01-04 01:35:34.832111
3	3	Coordinación de Diseño y Comunicación	Diseño y comunicación digital	2026-01-04 01:35:34.832111
\.


--
-- Data for Name: dependencias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dependencias (id, nombre, descripcion, created_at) FROM stdin;
2	Coordinación de Servicios Informáticos	Servicios de TI para la facultad	2025-11-04 00:36:35.314155
1	Coordinación de Infraestructura Informática	Gestión de infraestructura tecnológica	2025-11-04 00:36:35.314155
3	Coordinación de Diseño y Comunicación	Diseño gráfico y comunicación institucional	2025-11-04 00:36:35.314155
\.


--
-- Data for Name: edificios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.edificios (id, nombre, descripcion, created_at) FROM stdin;
1	Z	Edificio Z - 17 salones (7 abajo, 10 arriba)	2025-11-04 00:36:35.314796
2	Y	Edificio Y - 8 salones (4 por lado)	2025-11-04 00:36:35.314796
3	A2	Edificio A2 - 8 salones (3 abajo, 5 arriba)	2025-11-04 00:36:35.314796
4	A4	Edificio A4 - 11 salones (5 abajo, 6 arriba)	2025-11-04 00:36:35.314796
5	A5	Edificio A5 - 29 salones (3 pisos)	2025-11-04 00:36:35.314796
6	A6	Edificio A6 - En construcciÃ³n	2025-11-04 00:36:35.314796
\.


--
-- Data for Name: email_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_history (id, subject, message, sender_name, recipients_count, recipients_data, sent_count, failed_count, failed_emails, template_id, used_variables, sent_by_user_id, created_at, tracking_id, opened_count, first_opened_at, last_opened_at, confirmed_count, first_confirmed_at, last_confirmed_at) FROM stdin;
3	Recordatorio - Registro de Asistencia	Estimado/a {nombre_completo},\n\nLe recordamos registrar su asistencia correspondiente.\n\nSaludos	SIAF Sistema	1	[{"id": 9, "tipo": "docente", "email": "2211930x@umich.mx", "nombre": "Oliver Otoniel", "apellido_materno": "Montero", "apellido_paterno": "Virrueta"}]	1	0	[]	5	t	\N	2026-01-14 00:41:31.865014	7c7ab475-e83f-4e17-8e0e-39be64a89c95	0	\N	\N	0	\N	\N
\.


--
-- Data for Name: email_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_logs (id, usuario_id, destinatarios, asunto, estado, message_id, abierto, fecha_apertura, created_at) FROM stdin;
\.


--
-- Data for Name: email_recipient_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_recipient_history (id, history_id, recipient_email, recipient_name, status, sent_at, opened_at, confirmed_at, error_message, tracking_token) FROM stdin;
2	3	2211930x@umich.mx	Oliver Otoniel Virrueta Montero	enviado	2026-01-14 00:41:32.153537	\N	\N	\N	3c0bd228-d546-41ef-8fd0-5377b5c14881
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_templates (id, name, subject, message, variables, created_at, updated_at) FROM stdin;
1	FelicitaciÃ³n por Asistencia Perfecta	Felicitaciones por tu Asistencia Perfecta - {nombre}	<h2>¡Felicitaciones {nombre_completo}!</h2>\r\n <p>Nos complace informarte que has mantenido una <strong>asistencia perfecta</strong> durante el año {año_actual}.</p>\r\n <p>Tu dedicación y compromiso como <strong>{puesto}</strong> en <strong>{dependencia}</strong> es ejemplar.</p>\r\n <p>Gracias por ser parte fundamental del equipo SIAF.</p>\r\n <br>\r\n <p>Atentamente,<br>\r\n Dirección de Recursos Humanos<br>\r\n SIAF - Sistema Integral de Administración Facultad</p>	["nombre", "nombre_completo", "puesto", "dependencia", "aÃ±o_actual"]	2025-11-03 02:12:26.584117	2025-11-03 02:12:26.584117
2	NotificaciÃ³n General	Comunicado Importante para {dependencia}	<h2>Estimado(a) {nombre_completo}</h2>\r\n <p>Por medio del presente le informamos que...</p>\r\n <p>[Contenido del comunicado]</p>\r\n <br>\r\n <p>Para cualquier consulta, no dude en contactarnos.</p>\r\n <p>Atentamente,<br>\r\n Administración SIAF</p>	["nombre", "nombre_completo", "dependencia"]	2025-11-03 02:12:26.584117	2025-11-03 02:12:26.584117
3	InvitaciÃ³n a Evento	InvitaciÃ³n Especial: [Nombre del Evento]	<h2>Cordial invitación para {nombre_completo}</h2>\r\n <p>Tenemos el gusto de invitarle al siguiente evento:</p>\r\n <ul>\r\n <li><strong>Evento:</strong> [Nombre del evento]</li>\r\n <li><strong>Fecha:</strong> [Fecha]</li>\r\n <li><strong>Hora:</strong> [Hora]</li>\r\n <li><strong>Lugar:</strong> [Lugar]</li>\r\n </ul>\r\n <p>Su participación como miembro de <strong>{dependencia}</strong> es muy importante para nosotros.</p>\r\n <p>Confirme su asistencia respondiendo a este correo.</p>\r\n <br>\r\n <p>Saludos cordiales,<br>\r\n Comité Organizador</p>	["nombre_completo", "dependencia"]	2025-11-03 02:12:26.584117	2025-11-03 02:12:26.584117
4	Bienvenida	Bienvenido al Sistema SIAF	Estimado/a {nombre_completo},\n\nBienvenido al Sistema Integrado de Administración y Finanzas.\n\nSaludos cordiales	["nombre_completo"]	2026-01-13 23:59:32.80986	2026-01-13 23:59:32.80986
5	Recordatorio Asistencia	Recordatorio - Registro de Asistencia	Estimado/a {nombre_completo},\n\nLe recordamos registrar su asistencia correspondiente.\n\nSaludos	["nombre_completo"]	2026-01-13 23:59:32.80986	2026-01-13 23:59:32.80986
6	Notificación General	Notificación Importante	Estimado/a {nombre_completo},\n\n[Escriba su mensaje aquí]\n\nAtentamente,\nEquipo SIAF	["nombre_completo"]	2026-01-13 23:59:32.80986	2026-01-13 23:59:32.80986
\.


--
-- Data for Name: empleado_concepto_nomina; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.empleado_concepto_nomina (id, empleado_id, concepto_nomina_id, activo, firmado, fecha_firma, periodo_aplicacion, observaciones, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: empleados; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.empleados (id, nombre, apellido_paterno, apellido_materno, email, created_at, rfc, telefono, dependencia_id, tipo, estatus, activo, fecha_nacimiento, genero, updated_at, unidad_responsable, subtipo_administrativo) FROM stdin;
9	Oliver Otoniel	Virrueta	Montero	2211930x@umich.mx	2026-01-14 00:16:28.218101	VIMO000829GN1	4431024872	\N	docente	activo	t	\N	\N	2026-01-14 00:16:28.218101	231	\N
10	Citlali	Hernandez	Morales	2130165c@umich.mx	2026-01-15 09:52:51.603172	VIMO000829GN2	1234567890	\N	docente	activo	f	\N	\N	2026-01-15 10:08:31.574193	231-1	\N
\.


--
-- Data for Name: fichas_tecnicas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fichas_tecnicas (id, nombre_coordinacion, nombre_coordinador, nombre_evento, fecha_evento, tipo_evento, modalidad, fecha_limite_inscripcion, requiere_inscripcion, es_gratuito, costo, dirigido_a, lugar_evento, talleristas, objetivos, temas, observaciones, usuario_id, estado, created_at, updated_at, motivo_rechazo, domicilio, duracion, telefono_contacto, requiere_montaje, autoridades_invitadas, programa_evento, datos_estadisticos, informacion_historica, presupuesto, requiere_diseno_grafico, requiere_publicacion, requiere_transmision, compromiso_rectora) FROM stdin;
6	Infraestructura Informatica	Aldo Flores Morales	SSS	2025-12-12	conferencia	presencial	2025-12-10	t	t	\N	s	s	s	s	s	s	3	aprobado	2025-12-03 02:11:43.489157	2025-12-03 22:28:54.096457	\N	s	2	1111111111	t	s	s	s	s	s	t	t	s	t
7	Infraestructura Informatica	Aldo Flores Morales	fff	2025-12-19	diplomado	virtual	2025-12-11	t	t	\N	ff	ff	ffsdddddddddddddddddddddddddddddddddd	fffffsdssssssssssssssssssssssssssssss	ffffffffffffffffffffffffffffffffffffffff	sdddddddddddddddddddddddddddddddddddddddddd	3	aprobado	2025-12-03 22:36:32.10794	2025-12-03 23:08:32.80158	\N	ff	ff	ff	t	sddddddddddddddddddddddddddddddddddddddd	sdddddddddddddddddddddddddddddddddddddddddd	sdddddddddddddddddddddddddddddd	sddddddddddddddddddddddddddddddddd	sddddddddddddddddddddddddddd	t	t	sdsdsdsdsdsdsdsdsdsdsdsdsdsdsdsdsdsdsdsdsdsdsdsdsdsdsd	t
\.


--
-- Data for Name: grupos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.grupos (id, nombre, semestre, created_at) FROM stdin;
\.


--
-- Data for Name: horarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.horarios (id, salon_id, maestro_id, grupo_id, dia, hora_inicio, hora_fin, created_at) FROM stdin;
\.


--
-- Data for Name: inventario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventario (id, marca, modelo, dependencia_id, ubicacion, estado, descripcion, created_at, updated_at, numero_patrimonio, numero_serie, coordinacion_id, es_oficial_siia, es_local, es_investigacion, folio, tipo_bien, comentarios, estado_uso, costo, cog, uuid, factura, fondo, cuenta_por_pagar, empleado_resguardante_id, usuario_asignado_id, numero_resguardo_interno, estatus_validacion, fecha_adquisicion, fecha_baja, motivo_baja, vida_util_anios, depreciacion_anual, valor_actual, ultimo_mantenimiento, proximo_mantenimiento, garantia_meses, proveedor, observaciones_tecnicas, foto_url, documento_adjunto_url, stage, uuid_fiscal, numero_factura, fecha_compra, fecha_envio, fecha_recepcion, enviado_por, recibido_por) FROM stdin;
1530	HP	EliteBook 840 G8	1	Edificio A4, CSER	buena	\N	2026-01-08 03:58:55.294454	2026-01-08 04:12:01.301933	\N	12345678	3	f	t	f	\N	VideoCamara	\N	\N	12334.00	52101000	F792FB7C-42F2-428E-B6A8-D5723A817310	LWBJ177059	4173048 - PRODEP (Ejercicio 2018)	4689653	\N	\N	\N	borrador	2025-12-31	\N	\N	5	\N	\N	\N	\N	12	DLI931201MI9 - DISTRIBUIDORA LIVERPOOL, S.A. DE C.V.	\N	\N	\N	COMPLETO	\N	\N	\N	\N	2026-01-08 04:12:01.301933	\N	8
1533	HP	7 Silver GoPro	1	\N	buena	\N	2026-01-08 04:21:44.77575	2026-01-08 04:21:44.77575	\N	\N	3	f	t	f	INV-2026-002	VideoCamara	\N	operativo	323432.00	51501100	C6FE4FE8-09A7-4294-8A8B-B96CE9440A23	2733	6378371 - Ingresos Generados 23110100 Dirección de la Facultad de Contaduría y Ciencias Administrativas	7223305	\N	\N	\N	borrador	2025-12-29	\N	\N	5	\N	\N	\N	\N	9	MVA991029SE0 - MULTISISTEMAS VALCER	\N	\N	\N	EN_TRANSITO	\N	\N	\N	\N	\N	\N	\N
1532	HP	LaserJet Pro M404dn	1	Edificio A4	buena	\N	2026-01-08 04:13:12.967991	2026-01-08 04:28:16.01554	abcdefghih	123456789	\N	f	t	f	INV-2026-001	Impresora	\N	operativo	34000.00	PRUEBA	\N	\N	PRUEBA	\N	\N	\N	\N	borrador	\N	\N	\N	5	\N	\N	\N	\N	\N	PRUEBA	\N	\N	\N	COMPLETO	\N	PRUEBA	2026-01-01	\N	\N	\N	\N
1534	Lenovo	HGJJ	1	Edificio Y	buena	\N	2026-01-08 04:29:24.911067	2026-01-08 04:29:24.911067	GHJ34	22998833	\N	f	t	f	INV-2026-003	TABLET	\N	operativo	\N	\N	\N	\N	\N	\N	\N	\N	\N	borrador	\N	\N	\N	5	\N	\N	\N	\N	\N	\N	\N	\N	\N	PENDIENTE_FISCAL	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: maestros; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maestros (id, nombre, apellido_paterno, apellido_materno, email, created_at) FROM stdin;
\.


--
-- Data for Name: salones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salones (id, edificio_id, nombre, piso, lado, capacidad_butacas, alumnos_actuales, created_at) FROM stdin;
1	1	Z-101	0	\N	40	0	2025-11-04 00:36:35.315637
2	1	Z-102	0	\N	40	0	2025-11-04 00:36:35.315637
3	1	Z-103	0	\N	40	0	2025-11-04 00:36:35.315637
4	1	Z-104	0	\N	40	0	2025-11-04 00:36:35.315637
5	1	Z-105	0	\N	40	0	2025-11-04 00:36:35.315637
6	1	Z-106	0	\N	40	0	2025-11-04 00:36:35.315637
7	1	Z-107	0	\N	40	0	2025-11-04 00:36:35.315637
8	1	Z-201	1	\N	35	0	2025-11-04 00:36:35.315637
9	1	Z-202	1	\N	35	0	2025-11-04 00:36:35.315637
10	1	Z-203	1	\N	35	0	2025-11-04 00:36:35.315637
11	1	Z-204	1	\N	35	0	2025-11-04 00:36:35.315637
12	1	Z-205	1	\N	35	0	2025-11-04 00:36:35.315637
13	1	Z-206	1	\N	35	0	2025-11-04 00:36:35.315637
14	1	Z-207	1	\N	35	0	2025-11-04 00:36:35.315637
15	1	Z-208	1	\N	35	0	2025-11-04 00:36:35.315637
16	1	Z-209	1	\N	35	0	2025-11-04 00:36:35.315637
17	1	Z-210	1	\N	35	0	2025-11-04 00:36:35.315637
18	2	Y-101	0	izquierdo	30	0	2025-11-04 00:36:35.316551
19	2	Y-102	0	izquierdo	30	0	2025-11-04 00:36:35.316551
20	2	Y-103	0	derecho	30	0	2025-11-04 00:36:35.316551
21	2	Y-104	0	derecho	30	0	2025-11-04 00:36:35.316551
22	2	Y-201	1	izquierdo	30	0	2025-11-04 00:36:35.316551
23	2	Y-202	1	izquierdo	30	0	2025-11-04 00:36:35.316551
24	2	Y-203	1	derecho	30	0	2025-11-04 00:36:35.316551
25	2	Y-204	1	derecho	30	0	2025-11-04 00:36:35.316551
26	3	A2-101	0	\N	45	0	2025-11-04 00:36:35.316884
27	3	A2-102	0	\N	45	0	2025-11-04 00:36:35.316884
28	3	A2-103	0	\N	45	0	2025-11-04 00:36:35.316884
29	3	A2-201	1	\N	40	0	2025-11-04 00:36:35.316884
30	3	A2-202	1	\N	40	0	2025-11-04 00:36:35.316884
31	3	A2-203	1	\N	40	0	2025-11-04 00:36:35.316884
32	3	A2-204	1	\N	40	0	2025-11-04 00:36:35.316884
33	3	A2-205	1	\N	40	0	2025-11-04 00:36:35.316884
34	4	A4-101	0	\N	45	0	2025-11-04 00:36:35.317167
35	4	A4-102	0	\N	45	0	2025-11-04 00:36:35.317167
36	4	A4-103	0	\N	45	0	2025-11-04 00:36:35.317167
37	4	A4-104	0	\N	45	0	2025-11-04 00:36:35.317167
38	4	A4-105	0	\N	45	0	2025-11-04 00:36:35.317167
39	4	A4-201	1	\N	40	0	2025-11-04 00:36:35.317167
40	4	A4-202	1	\N	40	0	2025-11-04 00:36:35.317167
41	4	A4-203	1	\N	40	0	2025-11-04 00:36:35.317167
42	4	A4-204	1	\N	40	0	2025-11-04 00:36:35.317167
43	4	A4-205	1	\N	40	0	2025-11-04 00:36:35.317167
44	4	A4-206	1	\N	40	0	2025-11-04 00:36:35.317167
45	5	A5-101	0	izquierdo	35	0	2025-11-04 00:36:35.317449
46	5	A5-102	0	izquierdo	35	0	2025-11-04 00:36:35.317449
47	5	A5-103	0	izquierdo	35	0	2025-11-04 00:36:35.317449
48	5	A5-104	0	izquierdo	35	0	2025-11-04 00:36:35.317449
49	5	A5-105	0	izquierdo	35	0	2025-11-04 00:36:35.317449
50	5	A5-106	0	izquierdo	35	0	2025-11-04 00:36:35.317449
51	5	A5-107	0	izquierdo	35	0	2025-11-04 00:36:35.317449
52	5	A5-108	0	izquierdo	35	0	2025-11-04 00:36:35.317449
53	5	A5-201	1	izquierdo	30	0	2025-11-04 00:36:35.317449
54	5	A5-202	1	izquierdo	30	0	2025-11-04 00:36:35.317449
55	5	A5-203	1	izquierdo	30	0	2025-11-04 00:36:35.317449
56	5	A5-204	1	izquierdo	30	0	2025-11-04 00:36:35.317449
57	5	A5-205	1	izquierdo	30	0	2025-11-04 00:36:35.317449
58	5	A5-206	1	izquierdo	30	0	2025-11-04 00:36:35.317449
59	5	A5-207	1	izquierdo	30	0	2025-11-04 00:36:35.317449
60	5	A5-208	1	izquierdo	30	0	2025-11-04 00:36:35.317449
61	5	A5-209	1	derecho	30	0	2025-11-04 00:36:35.317449
62	5	A5-210	1	derecho	30	0	2025-11-04 00:36:35.317449
63	5	A5-211	1	derecho	30	0	2025-11-04 00:36:35.317449
64	5	A5-212	1	derecho	30	0	2025-11-04 00:36:35.317449
65	5	A5-213	1	derecho	30	0	2025-11-04 00:36:35.317449
66	5	A5-214	1	derecho	30	0	2025-11-04 00:36:35.317449
67	5	A5-215	1	derecho	30	0	2025-11-04 00:36:35.317449
68	5	A5-301	2	izquierdo	25	0	2025-11-04 00:36:35.317449
69	5	A5-302	2	izquierdo	25	0	2025-11-04 00:36:35.317449
70	5	A5-303	2	izquierdo	25	0	2025-11-04 00:36:35.317449
71	5	A5-304	2	izquierdo	25	0	2025-11-04 00:36:35.317449
72	5	A5-305	2	izquierdo	25	0	2025-11-04 00:36:35.317449
73	5	A5-306	2	izquierdo	25	0	2025-11-04 00:36:35.317449
\.


--
-- Data for Name: solicitudes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.solicitudes (id, usuario_id, tipo_solicitud, asunto, descripcion, estado, prioridad, created_at, updated_at, fecha_respuesta, respuesta, observaciones) FROM stdin;
7	2	soporte_tecnico	Problema con computadora	La computadora del aula 101 no enciende correctamente	pendiente	alta	2025-11-04 01:01:38.379589	2025-11-04 01:01:38.379589	\N	\N	\N
8	2	mantenimiento	Reparación de proyector	El proyector del aula 205 no proyecta imagen	en_proceso	media	2025-11-04 01:01:38.380963	2025-11-04 01:01:38.380963	\N	\N	\N
11	3	mantenimiento	Prueba desde API	Descripción de prueba desde API	pendiente	media	2025-11-10 09:13:54.935437	2025-11-10 09:13:54.935437	\N	\N	\N
9	2	solicitud_material	Solicitud de material de oficina	Necesito papel, bolígrafos y folders para el departamento	en_proceso	baja	2025-11-04 01:01:38.381414	2025-12-03 19:28:58.30739	\N	\N	\N
12	3	mantenimiento	dd	dd	en_proceso	media	2025-11-10 09:14:30.878956	2026-01-03 23:34:43.300944	\N	\N	\N
\.


--
-- Data for Name: space_audit_scans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.space_audit_scans (id, audit_id, inventory_id, codigo, estado, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: space_audits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.space_audits (id, space_id, started_by, status, started_at, closed_at, summary, created_at) FROM stdin;
\.


--
-- Data for Name: spaces; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.spaces (id, name, parent_id, type, metadata, audit_status, assigned_quadrant, created_at, updated_at) FROM stdin;
1	Edificio A	\N	building	{"address": "Av. Principal 123"}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
2	Edificio B	\N	building	{"address": "Av. Secundaria 45"}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
3	Piso 1	1	floor	{"level": 1}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
4	Piso 2	1	floor	{"level": 2}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
5	Piso 3	1	floor	{"level": 3}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
6	Piso 1	2	floor	{"level": 1}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
7	Piso 2	2	floor	{"level": 2}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
8	Piso 3	2	floor	{"level": 3}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
9	Aula A102	3	classroom	{"code": "A102", "capacity": 35}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
10	Aula A101	3	classroom	{"code": "A101", "capacity": 40}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
11	Aula A104	3	classroom	{"code": "A104", "capacity": 30}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
12	Aula A103	3	classroom	{"code": "A103", "capacity": 30}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
13	Aula A105	3	classroom	{"code": "A105", "capacity": 25}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
14	Aula A204	4	classroom	{"code": "A204", "capacity": 30}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
15	Aula A201	4	classroom	{"code": "A201", "capacity": 40}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
16	Aula A202	4	classroom	{"code": "A202", "capacity": 35}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
17	Aula A203	4	classroom	{"code": "A203", "capacity": 30}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
18	Aula A205	4	classroom	{"code": "A205", "capacity": 25}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
19	Aula A302	5	classroom	{"code": "A302", "capacity": 35}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
20	Aula A305	5	classroom	{"code": "A305", "capacity": 25}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
21	Aula A304	5	classroom	{"code": "A304", "capacity": 30}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
22	Aula A301	5	classroom	{"code": "A301", "capacity": 40}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
23	Aula A303	5	classroom	{"code": "A303", "capacity": 30}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
24	Aula B105	6	classroom	{"code": "B105", "capacity": 25}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
25	Aula B104	6	classroom	{"code": "B104", "capacity": 30}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
26	Aula B102	6	classroom	{"code": "B102", "capacity": 35}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
27	Aula B101	6	classroom	{"code": "B101", "capacity": 40}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
28	Aula B103	6	classroom	{"code": "B103", "capacity": 30}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
29	Aula B203	7	classroom	{"code": "B203", "capacity": 30}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
30	Aula B202	7	classroom	{"code": "B202", "capacity": 35}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
31	Aula B201	7	classroom	{"code": "B201", "capacity": 40}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
32	Aula B205	7	classroom	{"code": "B205", "capacity": 25}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
33	Aula B204	7	classroom	{"code": "B204", "capacity": 30}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
34	Aula B305	8	classroom	{"code": "B305", "capacity": 25}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
35	Aula B303	8	classroom	{"code": "B303", "capacity": 30}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
36	Aula B304	8	classroom	{"code": "B304", "capacity": 30}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
37	Aula B301	8	classroom	{"code": "B301", "capacity": 40}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
38	Aula B302	8	classroom	{"code": "B302", "capacity": 35}	not_audited	\N	2025-12-22 01:56:41.794077-06	2025-12-22 01:56:41.794077-06
\.


--
-- Data for Name: transfers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transfers (id, inventory_id, from_space, to_space, requested_by, approved_by, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, email, password, nombre, apellido_paterno, apellido_materno, role, activo, created_at, updated_at, dependencia_id, rfc, telefono, coordinacion_id) FROM stdin;
3	oliver.virrueta@umich.mx	$2a$10$adwNaDHZr/FEF2lr9RJ2puw37jDe1Glleh1HQyQ5DTShG7k9q.R5e	Oliver	Virrueta	Montero	usuario	t	2025-11-05 23:21:35.078577	2026-01-05 23:47:31.348789	\N	VIRO900815XYZ	4431234568	2
4	aldo.flores@umich.mx	$2a$10$PD5dYkxqIZS9urwgx6tYKeWIbixj8CnRJ464jk8PR8fNglxk488oe	Aldo	Flores	Morales	coordinador	t	2026-01-05 23:13:27.025609	2026-01-07 01:33:48.496157	\N	FLOA880920MNO	4431234569	1
5	maria.lopez@umich.mx	\\\\\\	Maria	López	García	coordinador	f	2026-01-05 23:47:31.348789	2026-01-07 02:19:22.083639	\N	LOGM850315PQR	4431234570	2
7	ana.martinez@umich.mx	\\\\\\	Ana	Martínez	Sánchez	usuario	f	2026-01-05 23:47:31.348789	2026-01-07 02:19:24.315368	\N	MASA920710VWX	4431234572	1
6	juan.perez@umich.mx	\\\\\\	Juan	Pérez	Ramírez	usuario	f	2026-01-05 23:47:31.348789	2026-01-07 02:19:30.635832	\N	PERJ900520STU	4431234571	3
2	2211930x@umich.mx	$2a$10$acTy7x2ttxl4ZQJZhuYIkuam9o7tFJNyuKGQ1BQauk9rEX5aKm/o6	oliver otoniel	virrueta	montero	admin	t	2025-11-04 00:42:04.30543	2026-01-07 15:47:05.575985	\N	VIRO850615ABC	4431234567	\N
8	jesus.plata@umich.mx	$2a$10$fntXI.7sspoBySqf7Dc3XON5lu353ke8dRmaTDo/a3Vrb8LWUISe.	Jesus	Plata	Sanchez	coordinador	t	2026-01-07 02:21:38.025766	2026-01-08 02:14:13.694277	\N	\N	\N	3
\.


--
-- Name: areas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.areas_id_seq', 1, false);


--
-- Name: asistencias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.asistencias_id_seq', 1, false);


--
-- Name: asistencias_quincenales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.asistencias_quincenales_id_seq', 18, true);


--
-- Name: conceptos_nomina_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.conceptos_nomina_id_seq', 4, true);


--
-- Name: coordinaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.coordinaciones_id_seq', 3, true);


--
-- Name: dependencias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dependencias_id_seq', 3, true);


--
-- Name: edificios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.edificios_id_seq', 6, true);


--
-- Name: email_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_history_id_seq', 3, true);


--
-- Name: email_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_logs_id_seq', 1, false);


--
-- Name: email_recipient_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_recipient_history_id_seq', 2, true);


--
-- Name: email_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_templates_id_seq', 6, true);


--
-- Name: empleado_concepto_nomina_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.empleado_concepto_nomina_id_seq', 9, true);


--
-- Name: empleados_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.empleados_id_seq', 10, true);


--
-- Name: fichas_tecnicas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fichas_tecnicas_id_seq', 7, true);


--
-- Name: grupos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.grupos_id_seq', 1, false);


--
-- Name: horarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.horarios_id_seq', 1, false);


--
-- Name: inventario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventario_id_seq', 1534, true);


--
-- Name: maestros_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.maestros_id_seq', 1, false);


--
-- Name: salones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salones_id_seq', 73, true);


--
-- Name: solicitudes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.solicitudes_id_seq', 12, true);


--
-- Name: space_audit_scans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.space_audit_scans_id_seq', 1, false);


--
-- Name: space_audits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.space_audits_id_seq', 1, false);


--
-- Name: spaces_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.spaces_id_seq', 38, true);


--
-- Name: transfers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transfers_id_seq', 1, false);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 8, true);


--
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (id);


--
-- Name: asistencias asistencias_empleado_id_fecha_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_empleado_id_fecha_key UNIQUE (empleado_id, fecha);


--
-- Name: asistencias asistencias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_pkey PRIMARY KEY (id);


--
-- Name: asistencias_quincenales asistencias_quincenales_empleado_id_anio_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias_quincenales
    ADD CONSTRAINT asistencias_quincenales_empleado_id_anio_key UNIQUE (empleado_id, anio);


--
-- Name: asistencias_quincenales asistencias_quincenales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias_quincenales
    ADD CONSTRAINT asistencias_quincenales_pkey PRIMARY KEY (id);


--
-- Name: conceptos_nomina conceptos_nomina_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conceptos_nomina
    ADD CONSTRAINT conceptos_nomina_nombre_key UNIQUE (nombre);


--
-- Name: conceptos_nomina conceptos_nomina_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conceptos_nomina
    ADD CONSTRAINT conceptos_nomina_pkey PRIMARY KEY (id);


--
-- Name: coordinaciones coordinaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coordinaciones
    ADD CONSTRAINT coordinaciones_pkey PRIMARY KEY (id);


--
-- Name: dependencias dependencias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dependencias
    ADD CONSTRAINT dependencias_pkey PRIMARY KEY (id);


--
-- Name: edificios edificios_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edificios
    ADD CONSTRAINT edificios_nombre_key UNIQUE (nombre);


--
-- Name: edificios edificios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edificios
    ADD CONSTRAINT edificios_pkey PRIMARY KEY (id);


--
-- Name: email_history email_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_history
    ADD CONSTRAINT email_history_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: email_recipient_history email_recipient_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_recipient_history
    ADD CONSTRAINT email_recipient_history_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: empleado_concepto_nomina empleado_concepto_nomina_empleado_id_concepto_nomina_id_per_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleado_concepto_nomina
    ADD CONSTRAINT empleado_concepto_nomina_empleado_id_concepto_nomina_id_per_key UNIQUE (empleado_id, concepto_nomina_id, periodo_aplicacion);


--
-- Name: empleado_concepto_nomina empleado_concepto_nomina_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleado_concepto_nomina
    ADD CONSTRAINT empleado_concepto_nomina_pkey PRIMARY KEY (id);


--
-- Name: empleados empleados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_pkey PRIMARY KEY (id);


--
-- Name: fichas_tecnicas fichas_tecnicas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fichas_tecnicas
    ADD CONSTRAINT fichas_tecnicas_pkey PRIMARY KEY (id);


--
-- Name: grupos grupos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_pkey PRIMARY KEY (id);


--
-- Name: horarios horarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_pkey PRIMARY KEY (id);


--
-- Name: horarios horarios_salon_id_dia_hora_inicio_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_salon_id_dia_hora_inicio_key UNIQUE (salon_id, dia, hora_inicio);


--
-- Name: inventario inventario_folio_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_folio_key UNIQUE (folio);


--
-- Name: inventario inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_pkey PRIMARY KEY (id);


--
-- Name: inventario inventario_uuid_fiscal_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_uuid_fiscal_key UNIQUE (uuid_fiscal);


--
-- Name: maestros maestros_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maestros
    ADD CONSTRAINT maestros_pkey PRIMARY KEY (id);


--
-- Name: salones salones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salones
    ADD CONSTRAINT salones_pkey PRIMARY KEY (id);


--
-- Name: solicitudes solicitudes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT solicitudes_pkey PRIMARY KEY (id);


--
-- Name: space_audit_scans space_audit_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_audit_scans
    ADD CONSTRAINT space_audit_scans_pkey PRIMARY KEY (id);


--
-- Name: space_audits space_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_audits
    ADD CONSTRAINT space_audits_pkey PRIMARY KEY (id);


--
-- Name: spaces spaces_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.spaces
    ADD CONSTRAINT spaces_pkey PRIMARY KEY (id);


--
-- Name: transfers transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_asistencias_empleado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asistencias_empleado ON public.asistencias USING btree (empleado_id);


--
-- Name: idx_asistencias_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asistencias_fecha ON public.asistencias USING btree (fecha);


--
-- Name: idx_asistencias_fecha_range; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asistencias_fecha_range ON public.asistencias USING btree (fecha);


--
-- Name: idx_asistencias_quincenales_empleado_anio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asistencias_quincenales_empleado_anio ON public.asistencias_quincenales USING btree (empleado_id, anio);


--
-- Name: idx_coordinaciones_nombre_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_coordinaciones_nombre_trgm ON public.coordinaciones USING gin (nombre public.gin_trgm_ops);


--
-- Name: idx_email_history_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_history_created_at ON public.email_history USING btree (created_at DESC);


--
-- Name: idx_email_history_template; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_history_template ON public.email_history USING btree (template_id);


--
-- Name: idx_email_history_tracking; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_history_tracking ON public.email_history USING btree (tracking_id);


--
-- Name: idx_email_history_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_history_user ON public.email_history USING btree (sent_by_user_id);


--
-- Name: idx_email_recipient_history_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_recipient_history_email ON public.email_recipient_history USING btree (recipient_email);


--
-- Name: idx_email_recipient_history_history; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_recipient_history_history ON public.email_recipient_history USING btree (history_id);


--
-- Name: idx_email_recipient_history_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_recipient_history_status ON public.email_recipient_history USING btree (status);


--
-- Name: idx_email_templates_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_templates_created_at ON public.email_templates USING btree (created_at);


--
-- Name: idx_email_templates_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_templates_name ON public.email_templates USING btree (name);


--
-- Name: idx_empleado_concepto_empleado_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleado_concepto_empleado_id ON public.empleado_concepto_nomina USING btree (empleado_id);


--
-- Name: idx_empleado_concepto_firmado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleado_concepto_firmado ON public.empleado_concepto_nomina USING btree (firmado);


--
-- Name: idx_empleado_concepto_periodo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleado_concepto_periodo ON public.empleado_concepto_nomina USING btree (periodo_aplicacion);


--
-- Name: idx_empleados_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleados_activo ON public.empleados USING btree (activo);


--
-- Name: idx_empleados_dependencia; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleados_dependencia ON public.empleados USING btree (dependencia_id);


--
-- Name: idx_empleados_dependencia_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleados_dependencia_id ON public.empleados USING btree (dependencia_id);


--
-- Name: idx_empleados_email_lower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleados_email_lower ON public.empleados USING btree (lower((email)::text));


--
-- Name: idx_empleados_rfc_lower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleados_rfc_lower ON public.empleados USING btree (lower((rfc)::text));


--
-- Name: idx_empleados_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleados_status ON public.empleados USING btree (activo) WHERE (activo = true);


--
-- Name: idx_empleados_subtipo_administrativo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleados_subtipo_administrativo ON public.empleados USING btree (subtipo_administrativo);


--
-- Name: idx_empleados_unidad_responsable; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleados_unidad_responsable ON public.empleados USING btree (unidad_responsable);


--
-- Name: idx_fichas_tecnicas_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fichas_tecnicas_created_at ON public.fichas_tecnicas USING btree (created_at DESC);


--
-- Name: idx_fichas_tecnicas_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fichas_tecnicas_estado ON public.fichas_tecnicas USING btree (estado);


--
-- Name: idx_fichas_tecnicas_fecha_evento; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fichas_tecnicas_fecha_evento ON public.fichas_tecnicas USING btree (fecha_evento);


--
-- Name: idx_fichas_tecnicas_usuario_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fichas_tecnicas_usuario_id ON public.fichas_tecnicas USING btree (usuario_id);


--
-- Name: idx_horarios_dia; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_horarios_dia ON public.horarios USING btree (dia);


--
-- Name: idx_horarios_salon; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_horarios_salon ON public.horarios USING btree (salon_id);


--
-- Name: idx_inventario_coordinacion_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_coordinacion_id ON public.inventario USING btree (coordinacion_id);


--
-- Name: idx_inventario_created_at_desc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_created_at_desc ON public.inventario USING btree (created_at DESC);


--
-- Name: idx_inventario_dependencia; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_dependencia ON public.inventario USING btree (dependencia_id);


--
-- Name: idx_inventario_descripcion_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_descripcion_trgm ON public.inventario USING gin (descripcion public.gin_trgm_ops);


--
-- Name: idx_inventario_disponible; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_disponible ON public.inventario USING btree (dependencia_id, created_at) WHERE ((estado)::text = 'disponible'::text);


--
-- Name: idx_inventario_empleado_resguardante; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_empleado_resguardante ON public.inventario USING btree (empleado_resguardante_id);


--
-- Name: idx_inventario_en_transito; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_en_transito ON public.inventario USING btree (stage, coordinacion_id) WHERE ((stage)::text = 'EN_TRANSITO'::text);


--
-- Name: idx_inventario_es_investigacion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_es_investigacion ON public.inventario USING btree (es_investigacion) WHERE (es_investigacion = true);


--
-- Name: idx_inventario_es_local; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_es_local ON public.inventario USING btree (es_local) WHERE (es_local = true);


--
-- Name: idx_inventario_es_oficial_siia; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_es_oficial_siia ON public.inventario USING btree (es_oficial_siia);


--
-- Name: idx_inventario_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_estado ON public.inventario USING btree (estado);


--
-- Name: idx_inventario_estado_dep; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_estado_dep ON public.inventario USING btree (estado, dependencia_id);


--
-- Name: idx_inventario_estado_uso; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_estado_uso ON public.inventario USING btree (estado_uso) WHERE (estado_uso IS NOT NULL);


--
-- Name: idx_inventario_estatus_validacion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_estatus_validacion ON public.inventario USING btree (estatus_validacion);


--
-- Name: idx_inventario_folio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_folio ON public.inventario USING btree (folio);


--
-- Name: idx_inventario_folio_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_folio_trgm ON public.inventario USING gin (folio public.gin_trgm_ops);


--
-- Name: idx_inventario_marca_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_marca_trgm ON public.inventario USING gin (marca public.gin_trgm_ops);


--
-- Name: idx_inventario_modelo_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_modelo_trgm ON public.inventario USING gin (modelo public.gin_trgm_ops);


--
-- Name: idx_inventario_numero_patrimonio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_numero_patrimonio ON public.inventario USING btree (numero_patrimonio);


--
-- Name: idx_inventario_numero_patrimonio_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_inventario_numero_patrimonio_unique ON public.inventario USING btree (numero_patrimonio) WHERE ((numero_patrimonio IS NOT NULL) AND ((numero_patrimonio)::text <> ''::text));


--
-- Name: idx_inventario_numero_serie; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_numero_serie ON public.inventario USING btree (numero_serie);


--
-- Name: idx_inventario_numero_serie_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_inventario_numero_serie_unique ON public.inventario USING btree (numero_serie) WHERE ((numero_serie IS NOT NULL) AND ((numero_serie)::text <> ''::text));


--
-- Name: idx_inventario_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_stage ON public.inventario USING btree (stage);


--
-- Name: idx_inventario_uuid_fiscal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_uuid_fiscal ON public.inventario USING btree (uuid_fiscal) WHERE (uuid_fiscal IS NOT NULL);


--
-- Name: idx_mv_inventario_stats_dep_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_mv_inventario_stats_dep_estado ON public.mv_inventario_stats USING btree (dependencia_id, estado);


--
-- Name: idx_solicitudes_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_solicitudes_created_at ON public.solicitudes USING btree (created_at DESC);


--
-- Name: idx_solicitudes_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_solicitudes_estado ON public.solicitudes USING btree (estado);


--
-- Name: idx_solicitudes_pendientes; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_solicitudes_pendientes ON public.solicitudes USING btree (usuario_id, created_at DESC) WHERE ((estado)::text = 'pendiente'::text);


--
-- Name: idx_solicitudes_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_solicitudes_usuario ON public.solicitudes USING btree (usuario_id);


--
-- Name: idx_spaces_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_spaces_parent_id ON public.spaces USING btree (parent_id);


--
-- Name: idx_spaces_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_spaces_type ON public.spaces USING btree (type);


--
-- Name: idx_transfers_inventory_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transfers_inventory_id ON public.transfers USING btree (inventory_id);


--
-- Name: idx_usuarios_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuarios_activo ON public.usuarios USING btree (activo);


--
-- Name: idx_usuarios_coordinacion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuarios_coordinacion ON public.usuarios USING btree (coordinacion_id);


--
-- Name: idx_usuarios_dependencia; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuarios_dependencia ON public.usuarios USING btree (dependencia_id);


--
-- Name: idx_usuarios_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuarios_role ON public.usuarios USING btree (role);


--
-- Name: spaces set_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.spaces FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: transfers set_timestamp_transfers; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_timestamp_transfers BEFORE UPDATE ON public.transfers FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp_transfers();


--
-- Name: inventario trigger_actualizar_stage; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_actualizar_stage BEFORE INSERT OR UPDATE ON public.inventario FOR EACH ROW EXECUTE FUNCTION public.actualizar_stage_inventario();


--
-- Name: inventario trigger_generar_folio_inventario; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_generar_folio_inventario BEFORE INSERT ON public.inventario FOR EACH ROW EXECUTE FUNCTION public.generar_folio_inventario();


--
-- Name: conceptos_nomina trigger_update_conceptos_nomina_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_conceptos_nomina_timestamp BEFORE UPDATE ON public.conceptos_nomina FOR EACH ROW EXECUTE FUNCTION public.update_conceptos_nomina_timestamp();


--
-- Name: empleado_concepto_nomina trigger_update_empleado_concepto_nomina_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_empleado_concepto_nomina_timestamp BEFORE UPDATE ON public.empleado_concepto_nomina FOR EACH ROW EXECUTE FUNCTION public.update_empleado_concepto_nomina_timestamp();


--
-- Name: empleados update_empleados_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_empleados_modtime BEFORE UPDATE ON public.empleados FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: inventario update_inventario_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_inventario_modtime BEFORE UPDATE ON public.inventario FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: solicitudes update_solicitudes_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_solicitudes_modtime BEFORE UPDATE ON public.solicitudes FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: usuarios update_usuarios_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_usuarios_modtime BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: usuarios usuarios_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER usuarios_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.update_usuarios_timestamp();


--
-- Name: areas areas_dependencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_dependencia_id_fkey FOREIGN KEY (dependencia_id) REFERENCES public.dependencias(id) ON DELETE CASCADE;


--
-- Name: asistencias asistencias_empleado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados(id) ON DELETE CASCADE;


--
-- Name: coordinaciones coordinaciones_dependencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coordinaciones
    ADD CONSTRAINT coordinaciones_dependencia_id_fkey FOREIGN KEY (dependencia_id) REFERENCES public.dependencias(id) ON DELETE CASCADE;


--
-- Name: email_history email_history_sent_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_history
    ADD CONSTRAINT email_history_sent_by_user_id_fkey FOREIGN KEY (sent_by_user_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: email_history email_history_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_history
    ADD CONSTRAINT email_history_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id) ON DELETE SET NULL;


--
-- Name: email_logs email_logs_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: empleado_concepto_nomina empleado_concepto_nomina_concepto_nomina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleado_concepto_nomina
    ADD CONSTRAINT empleado_concepto_nomina_concepto_nomina_id_fkey FOREIGN KEY (concepto_nomina_id) REFERENCES public.conceptos_nomina(id) ON DELETE CASCADE;


--
-- Name: empleado_concepto_nomina empleado_concepto_nomina_empleado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleado_concepto_nomina
    ADD CONSTRAINT empleado_concepto_nomina_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados(id) ON DELETE CASCADE;


--
-- Name: empleados empleados_dependencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_dependencia_id_fkey FOREIGN KEY (dependencia_id) REFERENCES public.dependencias(id);


--
-- Name: fichas_tecnicas fichas_tecnicas_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fichas_tecnicas
    ADD CONSTRAINT fichas_tecnicas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: email_recipient_history fk_email_history; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_recipient_history
    ADD CONSTRAINT fk_email_history FOREIGN KEY (history_id) REFERENCES public.email_history(id) ON DELETE CASCADE;


--
-- Name: horarios horarios_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE SET NULL;


--
-- Name: horarios horarios_maestro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_maestro_id_fkey FOREIGN KEY (maestro_id) REFERENCES public.maestros(id) ON DELETE SET NULL;


--
-- Name: horarios horarios_salon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_salon_id_fkey FOREIGN KEY (salon_id) REFERENCES public.salones(id) ON DELETE CASCADE;


--
-- Name: inventario inventario_coordinacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_coordinacion_id_fkey FOREIGN KEY (coordinacion_id) REFERENCES public.coordinaciones(id) ON DELETE RESTRICT;


--
-- Name: inventario inventario_dependencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_dependencia_id_fkey FOREIGN KEY (dependencia_id) REFERENCES public.dependencias(id) ON DELETE SET NULL;


--
-- Name: inventario inventario_empleado_resguardante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_empleado_resguardante_id_fkey FOREIGN KEY (empleado_resguardante_id) REFERENCES public.empleados(id) ON DELETE SET NULL;


--
-- Name: inventario inventario_enviado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_enviado_por_fkey FOREIGN KEY (enviado_por) REFERENCES public.usuarios(id);


--
-- Name: inventario inventario_recibido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_recibido_por_fkey FOREIGN KEY (recibido_por) REFERENCES public.usuarios(id);


--
-- Name: inventario inventario_usuario_asignado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_usuario_asignado_id_fkey FOREIGN KEY (usuario_asignado_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: salones salones_edificio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salones
    ADD CONSTRAINT salones_edificio_id_fkey FOREIGN KEY (edificio_id) REFERENCES public.edificios(id) ON DELETE CASCADE;


--
-- Name: solicitudes solicitudes_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT solicitudes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: space_audit_scans space_audit_scans_audit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_audit_scans
    ADD CONSTRAINT space_audit_scans_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.space_audits(id) ON DELETE CASCADE;


--
-- Name: space_audits space_audits_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_audits
    ADD CONSTRAINT space_audits_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: spaces spaces_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.spaces
    ADD CONSTRAINT spaces_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.spaces(id) ON DELETE SET NULL;


--
-- Name: transfers transfers_from_space_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_from_space_fkey FOREIGN KEY (from_space) REFERENCES public.spaces(id);


--
-- Name: transfers transfers_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventario(id) ON DELETE SET NULL;


--
-- Name: transfers transfers_to_space_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_to_space_fkey FOREIGN KEY (to_space) REFERENCES public.spaces(id);


--
-- Name: usuarios usuarios_coordinacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_coordinacion_id_fkey FOREIGN KEY (coordinacion_id) REFERENCES public.coordinaciones(id);


--
-- Name: usuarios usuarios_dependencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_dependencia_id_fkey FOREIGN KEY (dependencia_id) REFERENCES public.dependencias(id);


--
-- Name: inventario inventario_admin_all_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY inventario_admin_all_access ON public.inventario USING ((EXISTS ( SELECT 1
   FROM public.usuarios
  WHERE ((usuarios.id = (current_setting('app.current_user_id'::text, true))::integer) AND ((usuarios.role)::text = 'admin'::text)))));


--
-- Name: inventario inventario_coordinador_own_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY inventario_coordinador_own_access ON public.inventario USING ((EXISTS ( SELECT 1
   FROM (public.usuarios u
     JOIN public.coordinaciones c ON ((u.dependencia_id = c.dependencia_id)))
  WHERE ((u.id = (current_setting('app.current_user_id'::text))::integer) AND ((u.role)::text = 'coordinador'::text) AND (inventario.coordinacion_id = c.id)))));


--
-- Name: inventario inventario_usuario_readonly; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY inventario_usuario_readonly ON public.inventario FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.usuarios u
     JOIN public.coordinaciones c ON ((u.dependencia_id = c.dependencia_id)))
  WHERE ((u.id = (current_setting('app.current_user_id'::text))::integer) AND ((u.role)::text = 'usuario'::text) AND (inventario.coordinacion_id = c.id)))));


--
-- Name: mv_inventario_stats; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: postgres
--

REFRESH MATERIALIZED VIEW public.mv_inventario_stats;


--
-- PostgreSQL database dump complete
--

-- =====================================================
-- ÍNDICES DE RENDIMIENTO PARA FILTROS SIGAP
-- Agregados: 2026-01-19
-- Descripción: Mejoran el rendimiento de queries con filtros
-- =====================================================

--
-- Índices para tabla empleados
--
CREATE INDEX IF NOT EXISTS idx_empleados_unidad_responsable ON public.empleados(unidad_responsable);
CREATE INDEX IF NOT EXISTS idx_empleados_subtipo_administrativo ON public.empleados(subtipo_administrativo);
CREATE INDEX IF NOT EXISTS idx_empleados_activo ON public.empleados(activo);
CREATE INDEX IF NOT EXISTS idx_empleados_tipo ON public.empleados(tipo);

-- Índice compuesto para búsquedas con múltiples filtros
CREATE INDEX IF NOT EXISTS idx_empleados_filtros ON public.empleados(activo, tipo, unidad_responsable);

-- Índice para búsqueda por nombre (trigram para LIKE queries)
CREATE INDEX IF NOT EXISTS idx_empleados_nombre_trgm ON public.empleados USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_empleados_apellido_trgm ON public.empleados USING gin (apellido_paterno gin_trgm_ops);

--
-- Índices para tabla asistencias_quincenales
--
CREATE INDEX IF NOT EXISTS idx_asistencias_quincenales_empleado ON public.asistencias_quincenales(empleado_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_quincenales_anio ON public.asistencias_quincenales(anio);
CREATE INDEX IF NOT EXISTS idx_asistencias_quincenales_emp_anio ON public.asistencias_quincenales(empleado_id, anio);

\unrestrict SFpdIjzpkDZCYOGfcR8WdEmdffZPKl6vdBRglnrH8orsKpIjwr34oN3fQ4K5Ewc

