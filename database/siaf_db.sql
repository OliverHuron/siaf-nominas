--
-- PostgreSQL database dump
--

\restrict 8cEnU8ta4l5OkravIIwZRmCeq5VsTZ5joJqQLXd17cqT66j38hvQVVsIvKqUD7z

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
    telefono character varying(50),
    dependencia_id integer,
    tipo character varying(255) DEFAULT 'docente'::character varying,
    estatus character varying(255) DEFAULT 'activo'::character varying,
    activo boolean DEFAULT true,
    fecha_nacimiento date,
    genero character varying(10),
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    unidad_responsable character varying(255),
    subtipo_administrativo character varying(255)
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
    tipo_inventario character varying(20),
    registro_patrimonial character varying(100),
    registro_interno character varying(100),
    elaboro_nombre character varying(200),
    fecha_elaboracion date,
    ures_asignacion character varying(100),
    recurso character varying(100),
    ur character varying(100),
    id_patrimonio character varying(100),
    clave_patrimonial character varying(100),
    ures_gasto character varying(100),
    ejercicio character varying(10),
    solicitud_compra character varying(100),
    idcon character varying(50),
    usu_asig character varying(200),
    fecha_registro date,
    fecha_asignacion date,
    imagenes jsonb DEFAULT '[]'::jsonb,
    responsable_entrega_id integer,
    ubicacion_id integer,
    ubicacion_especifica character varying(255),
    fecha_factura date,
    numero_empleado character varying(50),
    numero_inventario character varying(100),
    descripcion_bien text,
    CONSTRAINT inventario_estado_uso_check CHECK (((estado_uso)::text = ANY ((ARRAY['operativo'::character varying, 'en_reparacion'::character varying, 'de_baja'::character varying, 'obsoleto'::character varying, 'resguardo_temporal'::character varying])::text[]))),
    CONSTRAINT inventario_estatus_validacion_check CHECK (((estatus_validacion)::text = ANY ((ARRAY['borrador'::character varying, 'revision'::character varying, 'validado'::character varying, 'rechazado'::character varying])::text[]))),
    CONSTRAINT inventario_stage_check CHECK (((stage)::text = ANY ((ARRAY['FISCAL'::character varying, 'EN_TRANSITO'::character varying, 'FISICO'::character varying, 'COMPLETO'::character varying, 'PENDIENTE_FISCAL'::character varying])::text[]))),
    CONSTRAINT inventario_tipo_inventario_check CHECK (((tipo_inventario)::text = ANY ((ARRAY['INTERNO'::character varying, 'EXTERNO'::character varying])::text[])))
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
-- Name: COLUMN inventario.tipo_inventario; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.tipo_inventario IS 'Discriminator: INTERNO (<70 UMAs) or EXTERNO (>70 UMAs)';


--
-- Name: COLUMN inventario.imagenes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.imagenes IS 'JSON array of image URLs (WebP format, max 3 photos)';


--
-- Name: COLUMN inventario.responsable_entrega_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.responsable_entrega_id IS 'FK to jerarquias_responsables for organizational responsibility';


--
-- Name: COLUMN inventario.ubicacion_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventario.ubicacion_id IS 'FK to ubicaciones for normalized location data';


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
-- Name: jerarquias_responsables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jerarquias_responsables (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    tipo character varying(50) NOT NULL,
    codigo character varying(20),
    parent_id integer,
    nivel integer DEFAULT 1,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT jerarquias_responsables_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['DIRECTOR'::character varying, 'SUBDIRECTOR'::character varying, 'JEFE_DIVISION'::character varying, 'COMISION'::character varying])::text[])))
);


ALTER TABLE public.jerarquias_responsables OWNER TO postgres;

--
-- Name: TABLE jerarquias_responsables; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.jerarquias_responsables IS 'Recursive hierarchy for organizational structure (Directors, Subdirectors, Comisiones)';


--
-- Name: jerarquias_responsables_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jerarquias_responsables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jerarquias_responsables_id_seq OWNER TO postgres;

--
-- Name: jerarquias_responsables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jerarquias_responsables_id_seq OWNED BY public.jerarquias_responsables.id;


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
-- Name: ubicaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ubicaciones (
    id integer NOT NULL,
    edificio_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    piso character varying(50),
    descripcion text,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ubicaciones OWNER TO postgres;

--
-- Name: TABLE ubicaciones; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ubicaciones IS 'Normalized locations within buildings';


--
-- Name: ubicaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ubicaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ubicaciones_id_seq OWNER TO postgres;

--
-- Name: ubicaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ubicaciones_id_seq OWNED BY public.ubicaciones.id;


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
-- Name: jerarquias_responsables id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jerarquias_responsables ALTER COLUMN id SET DEFAULT nextval('public.jerarquias_responsables_id_seq'::regclass);


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
-- Name: ubicaciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ubicaciones ALTER COLUMN id SET DEFAULT nextval('public.ubicaciones_id_seq'::regclass);


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
1658	2009	2026	A	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.678595	2026-01-21 23:37:16.935965
13	7	2025	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-13 23:11:19.840612	2026-01-13 23:11:19.840612
14	2	2025	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-13 23:11:19.842524	2026-01-13 23:11:19.842524
15	4	2025	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-13 23:11:19.842943	2026-01-13 23:11:19.842943
16	8	2025	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-13 23:11:19.843202	2026-01-13 23:11:19.843202
10	5	2026	F	F	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-04 00:11:33.28309	2026-01-13 23:41:03.885303
21	2011	2026	F	F	F	A	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.129149	2026-01-22 01:13:33.810393
1812	2022	2026	A	A	F	A	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-22 01:13:34.466827	2026-01-22 01:13:37.997081
5	6	2026	A	A	F	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-03 22:50:04.941155	2026-01-13 23:43:17.016694
1494	2010	2026	F	A	A	A	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.628619	2026-01-22 01:13:38.948383
8	3	2026	A	A	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-04 00:11:33.282715	2026-01-13 23:43:22.304428
6	1	2026	A	A	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-04 00:11:33.28077	2026-01-13 23:51:36.959328
2	3	2025	\N	\N	A	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-11-07 11:09:28.69157	2025-11-10 12:12:58.810788
1	1	2025	\N	\N	\N	A	\N	\N	A	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-11-03 02:54:10.895754	2025-11-10 12:13:42.690371
4	5	2025	\N	\N	\N	\N	\N	F	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-11-10 12:13:43.386495	2025-11-10 12:13:43.666206
3	6	2025	A	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-11-07 11:09:31.173465	2025-11-10 13:59:02.854883
17	10	2026	F	F	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-15 10:09:10.405693	2026-01-18 23:09:45.438882
18	9	2026	A	A	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-15 10:09:10.843593	2026-01-18 23:13:28.377868
20	1685	2026	A	F	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-19 00:03:40.545122	2026-01-19 00:03:41.719749
19	909	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-19 00:02:40.796717	2026-01-19 00:05:21.751764
22	3242	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.131945	2026-01-21 23:14:46.131945
23	3260	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.13252	2026-01-21 23:14:46.13252
24	3280	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.13294	2026-01-21 23:14:46.13294
25	3300	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.133297	2026-01-21 23:14:46.133297
26	3321	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.133642	2026-01-21 23:14:46.133642
27	3338	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.133977	2026-01-21 23:14:46.133977
28	3359	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.134312	2026-01-21 23:14:46.134312
29	3398	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.134649	2026-01-21 23:14:46.134649
30	3418	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.134993	2026-01-21 23:14:46.134993
31	3440	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.135324	2026-01-21 23:14:46.135324
32	3460	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.135651	2026-01-21 23:14:46.135651
33	3482	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.136846	2026-01-21 23:14:46.136846
34	3502	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.137245	2026-01-21 23:14:46.137245
35	3523	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.1376	2026-01-21 23:14:46.1376
36	3539	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.137927	2026-01-21 23:14:46.137927
37	3559	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.13825	2026-01-21 23:14:46.13825
38	3578	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.138572	2026-01-21 23:14:46.138572
39	3597	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.138886	2026-01-21 23:14:46.138886
40	3638	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.139269	2026-01-21 23:14:46.139269
41	3658	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.139593	2026-01-21 23:14:46.139593
42	3679	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.139906	2026-01-21 23:14:46.139906
43	3699	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.140314	2026-01-21 23:14:46.140314
44	3718	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.140747	2026-01-21 23:14:46.140747
45	3739	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.141093	2026-01-21 23:14:46.141093
46	3759	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.14142	2026-01-21 23:14:46.14142
47	3778	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.141738	2026-01-21 23:14:46.141738
48	3788	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.142052	2026-01-21 23:14:46.142052
49	3798	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.142457	2026-01-21 23:14:46.142457
50	3808	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.142833	2026-01-21 23:14:46.142833
51	3818	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.143231	2026-01-21 23:14:46.143231
52	3841	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.143577	2026-01-21 23:14:46.143577
53	3847	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.143918	2026-01-21 23:14:46.143918
54	3848	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.144306	2026-01-21 23:14:46.144306
55	3860	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.144687	2026-01-21 23:14:46.144687
56	3861	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.145056	2026-01-21 23:14:46.145056
57	3867	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.145349	2026-01-21 23:14:46.145349
58	3868	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.145633	2026-01-21 23:14:46.145633
59	3874	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.145903	2026-01-21 23:14:46.145903
60	3880	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.146166	2026-01-21 23:14:46.146166
61	3881	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.146427	2026-01-21 23:14:46.146427
62	2012	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.146688	2026-01-21 23:14:46.146688
63	2014	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.146951	2026-01-21 23:14:46.146951
64	2016	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.147221	2026-01-21 23:14:46.147221
65	2018	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.147501	2026-01-21 23:14:46.147501
66	2020	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.149114	2026-01-21 23:14:46.149114
67	2024	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.149648	2026-01-21 23:14:46.149648
68	2026	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.150026	2026-01-21 23:14:46.150026
69	2028	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.150411	2026-01-21 23:14:46.150411
70	2030	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.150785	2026-01-21 23:14:46.150785
71	2032	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.151085	2026-01-21 23:14:46.151085
72	2034	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.151359	2026-01-21 23:14:46.151359
73	2038	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.151626	2026-01-21 23:14:46.151626
74	2040	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.151883	2026-01-21 23:14:46.151883
75	2042	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.152144	2026-01-21 23:14:46.152144
76	2044	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.152395	2026-01-21 23:14:46.152395
77	2046	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.152651	2026-01-21 23:14:46.152651
78	2050	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.152905	2026-01-21 23:14:46.152905
79	2052	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.15316	2026-01-21 23:14:46.15316
80	2054	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.154191	2026-01-21 23:14:46.154191
81	2058	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.154693	2026-01-21 23:14:46.154693
82	2060	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.155044	2026-01-21 23:14:46.155044
83	2062	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.15536	2026-01-21 23:14:46.15536
84	2064	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.155771	2026-01-21 23:14:46.155771
85	2066	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.156136	2026-01-21 23:14:46.156136
86	2068	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.156511	2026-01-21 23:14:46.156511
87	2072	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.156824	2026-01-21 23:14:46.156824
88	2074	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.157096	2026-01-21 23:14:46.157096
89	2078	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.157355	2026-01-21 23:14:46.157355
90	2082	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.157606	2026-01-21 23:14:46.157606
91	2084	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.157864	2026-01-21 23:14:46.157864
92	2086	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.158119	2026-01-21 23:14:46.158119
93	2088	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.158373	2026-01-21 23:14:46.158373
94	2090	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.158638	2026-01-21 23:14:46.158638
95	2091	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.158902	2026-01-21 23:14:46.158902
96	2093	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.159198	2026-01-21 23:14:46.159198
97	2095	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.15982	2026-01-21 23:14:46.15982
98	2097	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.160137	2026-01-21 23:14:46.160137
99	2099	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.160418	2026-01-21 23:14:46.160418
100	2101	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.160738	2026-01-21 23:14:46.160738
101	2103	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.161031	2026-01-21 23:14:46.161031
102	2013	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.16139	2026-01-21 23:14:46.16139
103	2015	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.161789	2026-01-21 23:14:46.161789
104	2017	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.162134	2026-01-21 23:14:46.162134
105	2019	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.162441	2026-01-21 23:14:46.162441
106	2021	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.163316	2026-01-21 23:14:46.163316
107	2025	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.163606	2026-01-21 23:14:46.163606
108	2027	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.163856	2026-01-21 23:14:46.163856
109	2029	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.164101	2026-01-21 23:14:46.164101
110	2031	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.16435	2026-01-21 23:14:46.16435
111	2033	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.164592	2026-01-21 23:14:46.164592
112	2037	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.164837	2026-01-21 23:14:46.164837
113	2039	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.165083	2026-01-21 23:14:46.165083
114	2041	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.165329	2026-01-21 23:14:46.165329
115	2043	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.165578	2026-01-21 23:14:46.165578
116	2045	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.165825	2026-01-21 23:14:46.165825
117	2047	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.166069	2026-01-21 23:14:46.166069
118	2049	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.16632	2026-01-21 23:14:46.16632
119	2051	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.16657	2026-01-21 23:14:46.16657
120	2055	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.166848	2026-01-21 23:14:46.166848
121	2057	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.167326	2026-01-21 23:14:46.167326
122	2059	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.16775	2026-01-21 23:14:46.16775
123	2061	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.16824	2026-01-21 23:14:46.16824
124	2063	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.168636	2026-01-21 23:14:46.168636
125	2065	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.168952	2026-01-21 23:14:46.168952
126	2067	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.169229	2026-01-21 23:14:46.169229
127	2069	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.169491	2026-01-21 23:14:46.169491
128	2071	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.169758	2026-01-21 23:14:46.169758
129	2073	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.170014	2026-01-21 23:14:46.170014
130	2077	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.170263	2026-01-21 23:14:46.170263
131	2079	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.170531	2026-01-21 23:14:46.170531
132	2081	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.170781	2026-01-21 23:14:46.170781
133	2083	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.171028	2026-01-21 23:14:46.171028
134	2085	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.171274	2026-01-21 23:14:46.171274
135	2087	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.171536	2026-01-21 23:14:46.171536
136	2089	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.171831	2026-01-21 23:14:46.171831
137	2092	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.172086	2026-01-21 23:14:46.172086
138	2096	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.172344	2026-01-21 23:14:46.172344
139	2098	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.172601	2026-01-21 23:14:46.172601
140	2100	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.172894	2026-01-21 23:14:46.172894
141	2102	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.173197	2026-01-21 23:14:46.173197
142	2104	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.173678	2026-01-21 23:14:46.173678
143	2106	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.174022	2026-01-21 23:14:46.174022
144	2107	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.174353	2026-01-21 23:14:46.174353
145	2109	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.174608	2026-01-21 23:14:46.174608
146	2113	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.174855	2026-01-21 23:14:46.174855
147	2121	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.17515	2026-01-21 23:14:46.17515
148	2126	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.175399	2026-01-21 23:14:46.175399
149	2134	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.175682	2026-01-21 23:14:46.175682
150	2139	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.175936	2026-01-21 23:14:46.175936
151	2145	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.176202	2026-01-21 23:14:46.176202
152	2152	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.176454	2026-01-21 23:14:46.176454
153	2158	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.176755	2026-01-21 23:14:46.176755
154	2165	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.177011	2026-01-21 23:14:46.177011
155	2174	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.177268	2026-01-21 23:14:46.177268
156	2183	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.177933	2026-01-21 23:14:46.177933
157	2194	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.178248	2026-01-21 23:14:46.178248
158	2216	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.178513	2026-01-21 23:14:46.178513
159	2228	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.178885	2026-01-21 23:14:46.178885
160	2243	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.17964	2026-01-21 23:14:46.17964
161	2260	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.180046	2026-01-21 23:14:46.180046
162	2280	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.180437	2026-01-21 23:14:46.180437
163	2300	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.180787	2026-01-21 23:14:46.180787
164	2319	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.181077	2026-01-21 23:14:46.181077
165	2336	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.181351	2026-01-21 23:14:46.181351
166	2356	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.181622	2026-01-21 23:14:46.181622
167	2376	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.181886	2026-01-21 23:14:46.181886
168	2396	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.182147	2026-01-21 23:14:46.182147
169	2439	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.182407	2026-01-21 23:14:46.182407
170	2478	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.182667	2026-01-21 23:14:46.182667
171	2498	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.182938	2026-01-21 23:14:46.182938
172	2518	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.18321	2026-01-21 23:14:46.18321
173	2538	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.184396	2026-01-21 23:14:46.184396
174	2558	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.184943	2026-01-21 23:14:46.184943
175	2579	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.185322	2026-01-21 23:14:46.185322
176	2598	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.185703	2026-01-21 23:14:46.185703
177	2618	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.186066	2026-01-21 23:14:46.186066
178	2638	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.186378	2026-01-21 23:14:46.186378
179	2657	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.186734	2026-01-21 23:14:46.186734
180	2677	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.187028	2026-01-21 23:14:46.187028
181	2697	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.187428	2026-01-21 23:14:46.187428
182	2717	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.187807	2026-01-21 23:14:46.187807
183	2737	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.188107	2026-01-21 23:14:46.188107
184	2758	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.188383	2026-01-21 23:14:46.188383
185	2777	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.188644	2026-01-21 23:14:46.188644
186	2108	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.188907	2026-01-21 23:14:46.188907
187	2110	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.189365	2026-01-21 23:14:46.189365
188	2114	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.189823	2026-01-21 23:14:46.189823
189	2118	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.190154	2026-01-21 23:14:46.190154
190	2122	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.19061	2026-01-21 23:14:46.19061
191	2127	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.191194	2026-01-21 23:14:46.191194
192	2132	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.19179	2026-01-21 23:14:46.19179
193	2137	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.192244	2026-01-21 23:14:46.192244
194	2143	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.192745	2026-01-21 23:14:46.192745
195	2148	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.193165	2026-01-21 23:14:46.193165
196	2155	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.193531	2026-01-21 23:14:46.193531
197	2161	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.193884	2026-01-21 23:14:46.193884
198	2170	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.194237	2026-01-21 23:14:46.194237
199	2177	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.194679	2026-01-21 23:14:46.194679
200	2186	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.195213	2026-01-21 23:14:46.195213
201	2196	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.195669	2026-01-21 23:14:46.195669
202	2206	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.19602	2026-01-21 23:14:46.19602
203	2218	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.196432	2026-01-21 23:14:46.196432
204	2229	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.196784	2026-01-21 23:14:46.196784
205	2244	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.197156	2026-01-21 23:14:46.197156
206	2259	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.197556	2026-01-21 23:14:46.197556
207	2275	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.198012	2026-01-21 23:14:46.198012
208	2312	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.198463	2026-01-21 23:14:46.198463
209	2332	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.198913	2026-01-21 23:14:46.198913
210	2373	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.199289	2026-01-21 23:14:46.199289
211	2393	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.199658	2026-01-21 23:14:46.199658
212	2413	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.200022	2026-01-21 23:14:46.200022
213	2433	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.2004	2026-01-21 23:14:46.2004
214	2454	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.200747	2026-01-21 23:14:46.200747
215	2471	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.201029	2026-01-21 23:14:46.201029
216	2491	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.201297	2026-01-21 23:14:46.201297
217	2512	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.201567	2026-01-21 23:14:46.201567
218	2532	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.201829	2026-01-21 23:14:46.201829
219	2552	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.202101	2026-01-21 23:14:46.202101
220	2572	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.20237	2026-01-21 23:14:46.20237
221	2592	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.202656	2026-01-21 23:14:46.202656
222	2612	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.202953	2026-01-21 23:14:46.202953
223	2629	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.203379	2026-01-21 23:14:46.203379
224	2649	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.203807	2026-01-21 23:14:46.203807
225	2669	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.204362	2026-01-21 23:14:46.204362
226	2688	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.204718	2026-01-21 23:14:46.204718
227	2712	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.205082	2026-01-21 23:14:46.205082
228	2732	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.205399	2026-01-21 23:14:46.205399
229	2751	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.205722	2026-01-21 23:14:46.205722
230	2772	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.206017	2026-01-21 23:14:46.206017
231	2115	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.206318	2026-01-21 23:14:46.206318
232	2120	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.206623	2026-01-21 23:14:46.206623
233	2129	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.206928	2026-01-21 23:14:46.206928
234	2131	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.207246	2026-01-21 23:14:46.207246
235	2142	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.207558	2026-01-21 23:14:46.207558
236	2146	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.207852	2026-01-21 23:14:46.207852
237	2153	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.208139	2026-01-21 23:14:46.208139
238	2159	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.208419	2026-01-21 23:14:46.208419
239	2167	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.208689	2026-01-21 23:14:46.208689
240	2184	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.208959	2026-01-21 23:14:46.208959
241	2195	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.209345	2026-01-21 23:14:46.209345
242	2205	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.209637	2026-01-21 23:14:46.209637
243	2217	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.2099	2026-01-21 23:14:46.2099
244	2227	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.210976	2026-01-21 23:14:46.210976
245	2242	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.211384	2026-01-21 23:14:46.211384
246	2255	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.211908	2026-01-21 23:14:46.211908
247	2273	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.212187	2026-01-21 23:14:46.212187
248	2288	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.212605	2026-01-21 23:14:46.212605
249	2308	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.213334	2026-01-21 23:14:46.213334
250	2329	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.213895	2026-01-21 23:14:46.213895
251	2348	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.214379	2026-01-21 23:14:46.214379
252	2367	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.214749	2026-01-21 23:14:46.214749
253	2387	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.215089	2026-01-21 23:14:46.215089
254	2428	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.21545	2026-01-21 23:14:46.21545
255	2448	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.215809	2026-01-21 23:14:46.215809
256	2466	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.216212	2026-01-21 23:14:46.216212
257	2486	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.216623	2026-01-21 23:14:46.216623
258	2505	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.217047	2026-01-21 23:14:46.217047
259	2525	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.217451	2026-01-21 23:14:46.217451
260	2545	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.217812	2026-01-21 23:14:46.217812
261	2565	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.218142	2026-01-21 23:14:46.218142
262	2584	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.218513	2026-01-21 23:14:46.218513
263	2606	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.218837	2026-01-21 23:14:46.218837
264	2626	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.219219	2026-01-21 23:14:46.219219
265	2646	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.2195	2026-01-21 23:14:46.2195
266	2666	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.219859	2026-01-21 23:14:46.219859
267	2687	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.220191	2026-01-21 23:14:46.220191
268	2705	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.22051	2026-01-21 23:14:46.22051
269	2744	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.220827	2026-01-21 23:14:46.220827
270	2764	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.221142	2026-01-21 23:14:46.221142
271	2784	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.221473	2026-01-21 23:14:46.221473
272	2119	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.221789	2026-01-21 23:14:46.221789
273	2123	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.222101	2026-01-21 23:14:46.222101
274	2133	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.222414	2026-01-21 23:14:46.222414
275	2138	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.222729	2026-01-21 23:14:46.222729
276	2144	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.223038	2026-01-21 23:14:46.223038
277	2149	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.223345	2026-01-21 23:14:46.223345
278	2156	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.223655	2026-01-21 23:14:46.223655
279	2163	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.223978	2026-01-21 23:14:46.223978
280	2172	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.224287	2026-01-21 23:14:46.224287
281	2181	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.224613	2026-01-21 23:14:46.224613
282	2190	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.224976	2026-01-21 23:14:46.224976
283	2201	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.22533	2026-01-21 23:14:46.22533
284	2211	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.225646	2026-01-21 23:14:46.225646
285	2223	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.225953	2026-01-21 23:14:46.225953
286	2238	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.22626	2026-01-21 23:14:46.22626
287	2250	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.226565	2026-01-21 23:14:46.226565
288	2266	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.226872	2026-01-21 23:14:46.226872
289	2284	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.227176	2026-01-21 23:14:46.227176
290	2304	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.22749	2026-01-21 23:14:46.22749
291	2325	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.227799	2026-01-21 23:14:46.227799
292	2346	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.228103	2026-01-21 23:14:46.228103
293	2366	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.228405	2026-01-21 23:14:46.228405
294	2386	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.228707	2026-01-21 23:14:46.228707
295	2406	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.229044	2026-01-21 23:14:46.229044
296	2426	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.229422	2026-01-21 23:14:46.229422
297	2446	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.229769	2026-01-21 23:14:46.229769
298	2485	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.230141	2026-01-21 23:14:46.230141
299	2506	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.230482	2026-01-21 23:14:46.230482
300	2526	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.230804	2026-01-21 23:14:46.230804
301	2546	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.231116	2026-01-21 23:14:46.231116
302	2566	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.231426	2026-01-21 23:14:46.231426
303	2586	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.231733	2026-01-21 23:14:46.231733
304	2609	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.232746	2026-01-21 23:14:46.232746
305	2628	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.233057	2026-01-21 23:14:46.233057
306	2648	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.23337	2026-01-21 23:14:46.23337
307	2693	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.233753	2026-01-21 23:14:46.233753
308	2713	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.234052	2026-01-21 23:14:46.234052
309	2733	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.234379	2026-01-21 23:14:46.234379
310	2753	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.234696	2026-01-21 23:14:46.234696
311	2774	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.235008	2026-01-21 23:14:46.235008
312	2794	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.235314	2026-01-21 23:14:46.235314
313	2814	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.235617	2026-01-21 23:14:46.235617
314	2830	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.23592	2026-01-21 23:14:46.23592
315	2116	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.236221	2026-01-21 23:14:46.236221
316	2125	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.236525	2026-01-21 23:14:46.236525
317	2130	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.236825	2026-01-21 23:14:46.236825
318	2135	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.237163	2026-01-21 23:14:46.237163
319	2140	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.237491	2026-01-21 23:14:46.237491
320	2147	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.237817	2026-01-21 23:14:46.237817
321	2154	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.238192	2026-01-21 23:14:46.238192
322	2160	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.238526	2026-01-21 23:14:46.238526
323	2168	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.238843	2026-01-21 23:14:46.238843
324	2176	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.239216	2026-01-21 23:14:46.239216
325	2185	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.23957	2026-01-21 23:14:46.23957
326	2193	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.239882	2026-01-21 23:14:46.239882
327	2213	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.240187	2026-01-21 23:14:46.240187
328	2224	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.240507	2026-01-21 23:14:46.240507
329	2239	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.240812	2026-01-21 23:14:46.240812
330	2251	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.241116	2026-01-21 23:14:46.241116
331	2267	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.24142	2026-01-21 23:14:46.24142
332	2285	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.241722	2026-01-21 23:14:46.241722
333	2305	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.242023	2026-01-21 23:14:46.242023
334	2326	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.242324	2026-01-21 23:14:46.242324
335	2345	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.242623	2026-01-21 23:14:46.242623
336	2365	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.242925	2026-01-21 23:14:46.242925
337	2385	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.243225	2026-01-21 23:14:46.243225
338	2405	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.243541	2026-01-21 23:14:46.243541
339	2425	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.243834	2026-01-21 23:14:46.243834
340	2444	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.244201	2026-01-21 23:14:46.244201
341	2464	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.24457	2026-01-21 23:14:46.24457
342	2484	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.24492	2026-01-21 23:14:46.24492
343	2503	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.245195	2026-01-21 23:14:46.245195
344	2523	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.245549	2026-01-21 23:14:46.245549
345	2543	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.245885	2026-01-21 23:14:46.245885
346	2562	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.246217	2026-01-21 23:14:46.246217
347	2582	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.246549	2026-01-21 23:14:46.246549
348	2602	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.246886	2026-01-21 23:14:46.246886
349	2623	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.24722	2026-01-21 23:14:46.24722
350	2642	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.247546	2026-01-21 23:14:46.247546
351	2662	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.247873	2026-01-21 23:14:46.247873
352	2682	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.248201	2026-01-21 23:14:46.248201
353	2721	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.24854	2026-01-21 23:14:46.24854
354	2742	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.248941	2026-01-21 23:14:46.248941
355	2760	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.249327	2026-01-21 23:14:46.249327
356	2780	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.249633	2026-01-21 23:14:46.249633
357	2800	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.249907	2026-01-21 23:14:46.249907
358	2817	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.250289	2026-01-21 23:14:46.250289
359	2837	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.250648	2026-01-21 23:14:46.250648
360	2141	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.250971	2026-01-21 23:14:46.250971
361	2150	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.251289	2026-01-21 23:14:46.251289
362	2157	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.251603	2026-01-21 23:14:46.251603
363	2164	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.251919	2026-01-21 23:14:46.251919
364	2173	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.252232	2026-01-21 23:14:46.252232
365	2182	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.252543	2026-01-21 23:14:46.252543
366	2192	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.252851	2026-01-21 23:14:46.252851
367	2202	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.253157	2026-01-21 23:14:46.253157
368	2214	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.253463	2026-01-21 23:14:46.253463
369	2225	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.253769	2026-01-21 23:14:46.253769
370	2240	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.254072	2026-01-21 23:14:46.254072
371	2253	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.254374	2026-01-21 23:14:46.254374
372	2286	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.254676	2026-01-21 23:14:46.254676
373	2306	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.254977	2026-01-21 23:14:46.254977
374	2322	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.255286	2026-01-21 23:14:46.255286
375	2342	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.25561	2026-01-21 23:14:46.25561
376	2362	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.255919	2026-01-21 23:14:46.255919
377	2380	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.256235	2026-01-21 23:14:46.256235
378	2400	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.256556	2026-01-21 23:14:46.256556
379	2420	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.256861	2026-01-21 23:14:46.256861
380	2440	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.257164	2026-01-21 23:14:46.257164
381	2460	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.257465	2026-01-21 23:14:46.257465
382	2502	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.257766	2026-01-21 23:14:46.257766
383	2521	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.258066	2026-01-21 23:14:46.258066
384	2560	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.258367	2026-01-21 23:14:46.258367
385	2580	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.258666	2026-01-21 23:14:46.258666
386	2601	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.258963	2026-01-21 23:14:46.258963
387	2621	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.259261	2026-01-21 23:14:46.259261
388	2640	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.259559	2026-01-21 23:14:46.259559
389	2654	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.259856	2026-01-21 23:14:46.259856
390	2673	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.260168	2026-01-21 23:14:46.260168
391	2692	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.260469	2026-01-21 23:14:46.260469
392	2710	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.260784	2026-01-21 23:14:46.260784
393	2730	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.261054	2026-01-21 23:14:46.261054
394	2750	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.261417	2026-01-21 23:14:46.261417
395	2770	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.261761	2026-01-21 23:14:46.261761
396	2790	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.26207	2026-01-21 23:14:46.26207
397	2807	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.262375	2026-01-21 23:14:46.262375
398	2822	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.262676	2026-01-21 23:14:46.262676
399	2842	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.262976	2026-01-21 23:14:46.262976
400	2860	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.263275	2026-01-21 23:14:46.263275
401	2880	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.263574	2026-01-21 23:14:46.263574
402	2919	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.263885	2026-01-21 23:14:46.263885
403	2151	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.264105	2026-01-21 23:14:46.264105
404	2162	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.264422	2026-01-21 23:14:46.264422
405	2171	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.264741	2026-01-21 23:14:46.264741
406	2180	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.265032	2026-01-21 23:14:46.265032
407	2189	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.265456	2026-01-21 23:14:46.265456
408	2199	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.265769	2026-01-21 23:14:46.265769
409	2210	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.266747	2026-01-21 23:14:46.266747
410	2234	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.267081	2026-01-21 23:14:46.267081
411	2248	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.267394	2026-01-21 23:14:46.267394
412	2264	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.267702	2026-01-21 23:14:46.267702
413	2282	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.268008	2026-01-21 23:14:46.268008
414	2302	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.268281	2026-01-21 23:14:46.268281
415	2321	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.26859	2026-01-21 23:14:46.26859
416	2341	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.268899	2026-01-21 23:14:46.268899
417	2361	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.269201	2026-01-21 23:14:46.269201
418	2381	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.269505	2026-01-21 23:14:46.269505
419	2401	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.269818	2026-01-21 23:14:46.269818
420	2421	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.270119	2026-01-21 23:14:46.270119
421	2442	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.270419	2026-01-21 23:14:46.270419
422	2462	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.270721	2026-01-21 23:14:46.270721
423	2501	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.271022	2026-01-21 23:14:46.271022
424	2522	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.271377	2026-01-21 23:14:46.271377
425	2563	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.271678	2026-01-21 23:14:46.271678
426	2583	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.271977	2026-01-21 23:14:46.271977
427	2603	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.272279	2026-01-21 23:14:46.272279
428	2622	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.272578	2026-01-21 23:14:46.272578
429	2643	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.272875	2026-01-21 23:14:46.272875
430	2664	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.273171	2026-01-21 23:14:46.273171
431	2700	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.27348	2026-01-21 23:14:46.27348
432	2720	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.273777	2026-01-21 23:14:46.273777
433	2740	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.274074	2026-01-21 23:14:46.274074
434	2762	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.274371	2026-01-21 23:14:46.274371
435	2782	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.274667	2026-01-21 23:14:46.274667
436	2803	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.274964	2026-01-21 23:14:46.274964
437	2834	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.275259	2026-01-21 23:14:46.275259
438	2854	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.275557	2026-01-21 23:14:46.275557
439	2871	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.275851	2026-01-21 23:14:46.275851
440	2891	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.276197	2026-01-21 23:14:46.276197
441	2911	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.276498	2026-01-21 23:14:46.276498
442	2931	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.276794	2026-01-21 23:14:46.276794
443	2971	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.27709	2026-01-21 23:14:46.27709
444	2991	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.278291	2026-01-21 23:14:46.278291
445	2166	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.278628	2026-01-21 23:14:46.278628
446	2178	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.27896	2026-01-21 23:14:46.27896
447	2187	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.279285	2026-01-21 23:14:46.279285
448	2197	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.279595	2026-01-21 23:14:46.279595
449	2207	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.279895	2026-01-21 23:14:46.279895
450	2219	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.280161	2026-01-21 23:14:46.280161
451	2231	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.280612	2026-01-21 23:14:46.280612
452	2246	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.280941	2026-01-21 23:14:46.280941
453	2262	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.281328	2026-01-21 23:14:46.281328
454	2278	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.281762	2026-01-21 23:14:46.281762
455	2298	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.282354	2026-01-21 23:14:46.282354
456	2316	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.282868	2026-01-21 23:14:46.282868
457	2359	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.28331	2026-01-21 23:14:46.28331
458	2379	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.283663	2026-01-21 23:14:46.283663
459	2399	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.284086	2026-01-21 23:14:46.284086
460	2419	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.284468	2026-01-21 23:14:46.284468
461	2438	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.284829	2026-01-21 23:14:46.284829
462	2458	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.285163	2026-01-21 23:14:46.285163
463	2477	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.285489	2026-01-21 23:14:46.285489
464	2496	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.28581	2026-01-21 23:14:46.28581
465	2515	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.286129	2026-01-21 23:14:46.286129
466	2554	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.286446	2026-01-21 23:14:46.286446
467	2573	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.28676	2026-01-21 23:14:46.28676
468	2593	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.287071	2026-01-21 23:14:46.287071
469	2613	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.287383	2026-01-21 23:14:46.287383
470	2633	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.287694	2026-01-21 23:14:46.287694
471	2653	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.288001	2026-01-21 23:14:46.288001
472	2674	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.288308	2026-01-21 23:14:46.288308
473	2694	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.288628	2026-01-21 23:14:46.288628
474	2714	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.28895	2026-01-21 23:14:46.28895
475	2734	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.289279	2026-01-21 23:14:46.289279
476	2755	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.289616	2026-01-21 23:14:46.289616
477	2820	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.289901	2026-01-21 23:14:46.289901
478	2839	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.290256	2026-01-21 23:14:46.290256
479	2864	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.290595	2026-01-21 23:14:46.290595
480	2884	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.290909	2026-01-21 23:14:46.290909
481	2904	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.291215	2026-01-21 23:14:46.291215
482	2920	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.291518	2026-01-21 23:14:46.291518
483	2940	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.291819	2026-01-21 23:14:46.291819
484	2960	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.292119	2026-01-21 23:14:46.292119
485	2982	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.29242	2026-01-21 23:14:46.29242
486	3003	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.292732	2026-01-21 23:14:46.292732
487	2169	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.293033	2026-01-21 23:14:46.293033
488	2179	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.293333	2026-01-21 23:14:46.293333
489	2188	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.293632	2026-01-21 23:14:46.293632
490	2198	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.293933	2026-01-21 23:14:46.293933
491	2209	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.294233	2026-01-21 23:14:46.294233
492	2221	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.294529	2026-01-21 23:14:46.294529
493	2236	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.294824	2026-01-21 23:14:46.294824
494	2249	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.295123	2026-01-21 23:14:46.295123
495	2265	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.295421	2026-01-21 23:14:46.295421
496	2283	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.295716	2026-01-21 23:14:46.295716
497	2303	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.296096	2026-01-21 23:14:46.296096
498	2323	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.296473	2026-01-21 23:14:46.296473
499	2344	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.29681	2026-01-21 23:14:46.29681
500	2364	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.297087	2026-01-21 23:14:46.297087
501	2382	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.297448	2026-01-21 23:14:46.297448
502	2402	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.297796	2026-01-21 23:14:46.297796
503	2422	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.298106	2026-01-21 23:14:46.298106
504	2441	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.298409	2026-01-21 23:14:46.298409
505	2461	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.298709	2026-01-21 23:14:46.298709
506	2480	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.299007	2026-01-21 23:14:46.299007
507	2519	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.299305	2026-01-21 23:14:46.299305
508	2559	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.299615	2026-01-21 23:14:46.299615
509	2578	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.299915	2026-01-21 23:14:46.299915
510	2599	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.300218	2026-01-21 23:14:46.300218
511	2619	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.300514	2026-01-21 23:14:46.300514
512	2639	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.300813	2026-01-21 23:14:46.300813
513	2658	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.301108	2026-01-21 23:14:46.301108
514	2678	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.301404	2026-01-21 23:14:46.301404
515	2698	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.301699	2026-01-21 23:14:46.301699
516	2719	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.301992	2026-01-21 23:14:46.301992
517	2739	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.302286	2026-01-21 23:14:46.302286
518	2778	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.302581	2026-01-21 23:14:46.302581
519	2798	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.302873	2026-01-21 23:14:46.302873
520	2821	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.303165	2026-01-21 23:14:46.303165
521	2841	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.303457	2026-01-21 23:14:46.303457
522	2862	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.303778	2026-01-21 23:14:46.303778
523	2882	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.304078	2026-01-21 23:14:46.304078
524	2902	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.304374	2026-01-21 23:14:46.304374
525	2922	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.304668	2026-01-21 23:14:46.304668
526	2942	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.304961	2026-01-21 23:14:46.304961
527	2961	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.305254	2026-01-21 23:14:46.305254
528	2980	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.305548	2026-01-21 23:14:46.305548
529	3019	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.305841	2026-01-21 23:14:46.305841
530	2191	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.306134	2026-01-21 23:14:46.306134
531	2220	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.306426	2026-01-21 23:14:46.306426
532	2232	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.30672	2026-01-21 23:14:46.30672
533	2247	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.307022	2026-01-21 23:14:46.307022
534	2263	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.307318	2026-01-21 23:14:46.307318
535	2281	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.307613	2026-01-21 23:14:46.307613
536	2320	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.307907	2026-01-21 23:14:46.307907
537	2340	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.308205	2026-01-21 23:14:46.308205
538	2383	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.308497	2026-01-21 23:14:46.308497
539	2403	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.308791	2026-01-21 23:14:46.308791
540	2423	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.309082	2026-01-21 23:14:46.309082
541	2443	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.309373	2026-01-21 23:14:46.309373
542	2463	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.309706	2026-01-21 23:14:46.309706
543	2483	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.310036	2026-01-21 23:14:46.310036
544	2504	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.310369	2026-01-21 23:14:46.310369
545	2524	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.31061	2026-01-21 23:14:46.31061
546	2544	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.310935	2026-01-21 23:14:46.310935
547	2564	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.311252	2026-01-21 23:14:46.311252
548	2585	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.311709	2026-01-21 23:14:46.311709
549	2624	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.312117	2026-01-21 23:14:46.312117
550	2644	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.312509	2026-01-21 23:14:46.312509
551	2679	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.312809	2026-01-21 23:14:46.312809
552	2699	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.313151	2026-01-21 23:14:46.313151
553	2718	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.313485	2026-01-21 23:14:46.313485
554	2738	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.313791	2026-01-21 23:14:46.313791
555	2759	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.314105	2026-01-21 23:14:46.314105
556	2779	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.314407	2026-01-21 23:14:46.314407
557	2799	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.314706	2026-01-21 23:14:46.314706
558	2818	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.315002	2026-01-21 23:14:46.315002
559	2838	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.315298	2026-01-21 23:14:46.315298
560	2858	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.315651	2026-01-21 23:14:46.315651
561	2877	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.315975	2026-01-21 23:14:46.315975
562	2896	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.316291	2026-01-21 23:14:46.316291
563	2918	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.316594	2026-01-21 23:14:46.316594
564	2938	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.316891	2026-01-21 23:14:46.316891
565	2959	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.317187	2026-01-21 23:14:46.317187
566	2975	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.317484	2026-01-21 23:14:46.317484
567	2995	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.31778	2026-01-21 23:14:46.31778
568	3015	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.318091	2026-01-21 23:14:46.318091
569	3033	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.318426	2026-01-21 23:14:46.318426
570	3053	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.318771	2026-01-21 23:14:46.318771
571	2215	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.319127	2026-01-21 23:14:46.319127
572	2226	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.320316	2026-01-21 23:14:46.320316
573	2257	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.320631	2026-01-21 23:14:46.320631
574	2309	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.320936	2026-01-21 23:14:46.320936
575	2330	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.321238	2026-01-21 23:14:46.321238
576	2350	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.321546	2026-01-21 23:14:46.321546
577	2370	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.321863	2026-01-21 23:14:46.321863
578	2390	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.322167	2026-01-21 23:14:46.322167
579	2410	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.322467	2026-01-21 23:14:46.322467
580	2430	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.322764	2026-01-21 23:14:46.322764
581	2450	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.32306	2026-01-21 23:14:46.32306
582	2468	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.323355	2026-01-21 23:14:46.323355
583	2488	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.32365	2026-01-21 23:14:46.32365
584	2508	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.323946	2026-01-21 23:14:46.323946
585	2528	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.324241	2026-01-21 23:14:46.324241
586	2547	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.324535	2026-01-21 23:14:46.324535
587	2567	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.324831	2026-01-21 23:14:46.324831
588	2587	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.325141	2026-01-21 23:14:46.325141
589	2605	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.325439	2026-01-21 23:14:46.325439
590	2625	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.325734	2026-01-21 23:14:46.325734
591	2645	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.326027	2026-01-21 23:14:46.326027
592	2665	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.326324	2026-01-21 23:14:46.326324
593	2685	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.326617	2026-01-21 23:14:46.326617
594	2704	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.326909	2026-01-21 23:14:46.326909
595	2724	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.327201	2026-01-21 23:14:46.327201
596	2748	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.327521	2026-01-21 23:14:46.327521
597	2768	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.327895	2026-01-21 23:14:46.327895
598	2787	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.328341	2026-01-21 23:14:46.328341
599	2809	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.328737	2026-01-21 23:14:46.328737
600	2825	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.329116	2026-01-21 23:14:46.329116
601	2915	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.329487	2026-01-21 23:14:46.329487
602	2935	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.329847	2026-01-21 23:14:46.329847
603	2978	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.330179	2026-01-21 23:14:46.330179
604	2998	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.330485	2026-01-21 23:14:46.330485
605	3018	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.330787	2026-01-21 23:14:46.330787
606	3039	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.331082	2026-01-21 23:14:46.331082
607	3059	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.331334	2026-01-21 23:14:46.331334
608	3079	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.331651	2026-01-21 23:14:46.331651
609	3100	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.331953	2026-01-21 23:14:46.331953
610	3120	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.33225	2026-01-21 23:14:46.33225
611	2212	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.332545	2026-01-21 23:14:46.332545
612	2230	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.332841	2026-01-21 23:14:46.332841
613	2245	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.333137	2026-01-21 23:14:46.333137
614	2279	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.333432	2026-01-21 23:14:46.333432
615	2299	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.333727	2026-01-21 23:14:46.333727
616	2317	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.334035	2026-01-21 23:14:46.334035
617	2335	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.334332	2026-01-21 23:14:46.334332
618	2355	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.334627	2026-01-21 23:14:46.334627
619	2375	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.334929	2026-01-21 23:14:46.334929
620	2415	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.335242	2026-01-21 23:14:46.335242
621	2435	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.335542	2026-01-21 23:14:46.335542
622	2455	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.33591	2026-01-21 23:14:46.33591
623	2476	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.336248	2026-01-21 23:14:46.336248
624	2494	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.336557	2026-01-21 23:14:46.336557
625	2514	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.336859	2026-01-21 23:14:46.336859
626	2534	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.337157	2026-01-21 23:14:46.337157
627	2557	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.337454	2026-01-21 23:14:46.337454
628	2577	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.337751	2026-01-21 23:14:46.337751
629	2617	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.338045	2026-01-21 23:14:46.338045
630	2637	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.338344	2026-01-21 23:14:46.338344
631	2655	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.338641	2026-01-21 23:14:46.338641
632	2676	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.338936	2026-01-21 23:14:46.338936
633	2696	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.339234	2026-01-21 23:14:46.339234
634	2716	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.33953	2026-01-21 23:14:46.33953
635	2754	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.339824	2026-01-21 23:14:46.339824
636	2773	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.340117	2026-01-21 23:14:46.340117
637	2793	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.340409	2026-01-21 23:14:46.340409
638	2813	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.3407	2026-01-21 23:14:46.3407
639	2832	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.340993	2026-01-21 23:14:46.340993
640	2852	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.341287	2026-01-21 23:14:46.341287
641	2912	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.34158	2026-01-21 23:14:46.34158
642	2932	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.34187	2026-01-21 23:14:46.34187
643	2952	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.342162	2026-01-21 23:14:46.342162
644	2972	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.342464	2026-01-21 23:14:46.342464
645	3013	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.342759	2026-01-21 23:14:46.342759
646	3036	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.343066	2026-01-21 23:14:46.343066
647	3056	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.343359	2026-01-21 23:14:46.343359
648	3076	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.343731	2026-01-21 23:14:46.343731
649	3096	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.344953	2026-01-21 23:14:46.344953
650	2233	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.345861	2026-01-21 23:14:46.345861
651	2254	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.347095	2026-01-21 23:14:46.347095
652	2270	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.348032	2026-01-21 23:14:46.348032
653	2287	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.348924	2026-01-21 23:14:46.348924
654	2307	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.349889	2026-01-21 23:14:46.349889
655	2324	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.350945	2026-01-21 23:14:46.350945
656	2343	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.351862	2026-01-21 23:14:46.351862
657	2363	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.3522	2026-01-21 23:14:46.3522
658	2384	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.35252	2026-01-21 23:14:46.35252
659	2404	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.352824	2026-01-21 23:14:46.352824
660	2424	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.353125	2026-01-21 23:14:46.353125
661	2445	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.353423	2026-01-21 23:14:46.353423
662	2475	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.353724	2026-01-21 23:14:46.353724
663	2492	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.35402	2026-01-21 23:14:46.35402
664	2511	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.35822	2026-01-21 23:14:46.35822
665	2531	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.358514	2026-01-21 23:14:46.358514
666	2551	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.35881	2026-01-21 23:14:46.35881
667	2571	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.359114	2026-01-21 23:14:46.359114
668	2610	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.359527	2026-01-21 23:14:46.359527
669	2651	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.359903	2026-01-21 23:14:46.359903
670	2671	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.360291	2026-01-21 23:14:46.360291
671	2689	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.360627	2026-01-21 23:14:46.360627
672	2709	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.360956	2026-01-21 23:14:46.360956
673	2729	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.361257	2026-01-21 23:14:46.361257
674	2749	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.361552	2026-01-21 23:14:46.361552
675	2769	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.361845	2026-01-21 23:14:46.361845
676	2788	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.362138	2026-01-21 23:14:46.362138
677	2810	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.36243	2026-01-21 23:14:46.36243
678	2827	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.362729	2026-01-21 23:14:46.362729
679	2846	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.36304	2026-01-21 23:14:46.36304
680	2865	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.363405	2026-01-21 23:14:46.363405
681	2885	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.363754	2026-01-21 23:14:46.363754
682	2906	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.364055	2026-01-21 23:14:46.364055
683	2925	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.364355	2026-01-21 23:14:46.364355
684	2945	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.364652	2026-01-21 23:14:46.364652
685	2964	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.364946	2026-01-21 23:14:46.364946
686	3005	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.365239	2026-01-21 23:14:46.365239
687	3025	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.365533	2026-01-21 23:14:46.365533
688	3045	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.365825	2026-01-21 23:14:46.365825
689	3065	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.366116	2026-01-21 23:14:46.366116
690	3103	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.366408	2026-01-21 23:14:46.366408
691	3123	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.3667	2026-01-21 23:14:46.3667
692	3144	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.367003	2026-01-21 23:14:46.367003
693	2237	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.367297	2026-01-21 23:14:46.367297
694	2258	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.367594	2026-01-21 23:14:46.367594
695	2276	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.367901	2026-01-21 23:14:46.367901
696	2292	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.368196	2026-01-21 23:14:46.368196
697	2311	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.368489	2026-01-21 23:14:46.368489
698	2331	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.36882	2026-01-21 23:14:46.36882
699	2351	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.369127	2026-01-21 23:14:46.369127
700	2371	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.369464	2026-01-21 23:14:46.369464
701	2431	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.369763	2026-01-21 23:14:46.369763
702	2451	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.370063	2026-01-21 23:14:46.370063
703	2469	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.370361	2026-01-21 23:14:46.370361
704	2489	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.370657	2026-01-21 23:14:46.370657
705	2530	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.370977	2026-01-21 23:14:46.370977
706	2549	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.371364	2026-01-21 23:14:46.371364
707	2569	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.371808	2026-01-21 23:14:46.371808
708	2588	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.372203	2026-01-21 23:14:46.372203
709	2608	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.372536	2026-01-21 23:14:46.372536
710	2630	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.372862	2026-01-21 23:14:46.372862
711	2650	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.373192	2026-01-21 23:14:46.373192
712	2690	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.373714	2026-01-21 23:14:46.373714
713	2708	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.374064	2026-01-21 23:14:46.374064
714	2728	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.374398	2026-01-21 23:14:46.374398
715	2747	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.374885	2026-01-21 23:14:46.374885
716	2766	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.375383	2026-01-21 23:14:46.375383
717	2786	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.375752	2026-01-21 23:14:46.375752
718	2806	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.376108	2026-01-21 23:14:46.376108
719	2828	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.376431	2026-01-21 23:14:46.376431
720	2848	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.377603	2026-01-21 23:14:46.377603
721	2867	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.377916	2026-01-21 23:14:46.377916
722	2887	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.378226	2026-01-21 23:14:46.378226
723	2907	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.378533	2026-01-21 23:14:46.378533
724	2948	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.378847	2026-01-21 23:14:46.378847
725	2968	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.379163	2026-01-21 23:14:46.379163
726	2988	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.37947	2026-01-21 23:14:46.37947
727	3008	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.379817	2026-01-21 23:14:46.379817
728	3028	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.380123	2026-01-21 23:14:46.380123
729	3048	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.380423	2026-01-21 23:14:46.380423
730	3068	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.380726	2026-01-21 23:14:46.380726
731	3089	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.381027	2026-01-21 23:14:46.381027
732	3109	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.381326	2026-01-21 23:14:46.381326
733	3128	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.381638	2026-01-21 23:14:46.381638
734	3148	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.381939	2026-01-21 23:14:46.381939
735	2235	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.382239	2026-01-21 23:14:46.382239
736	2256	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.382541	2026-01-21 23:14:46.382541
737	2272	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.383102	2026-01-21 23:14:46.383102
738	2291	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.38341	2026-01-21 23:14:46.38341
739	2310	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.383738	2026-01-21 23:14:46.383738
740	2328	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.384074	2026-01-21 23:14:46.384074
741	2349	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.384436	2026-01-21 23:14:46.384436
742	2369	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.384801	2026-01-21 23:14:46.384801
743	2389	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.385124	2026-01-21 23:14:46.385124
744	2409	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.385431	2026-01-21 23:14:46.385431
745	2429	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.385731	2026-01-21 23:14:46.385731
746	2449	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.38603	2026-01-21 23:14:46.38603
747	2467	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.38633	2026-01-21 23:14:46.38633
748	2487	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.386641	2026-01-21 23:14:46.386641
749	2507	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.386938	2026-01-21 23:14:46.386938
750	2550	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.387233	2026-01-21 23:14:46.387233
751	2570	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.387529	2026-01-21 23:14:46.387529
752	2591	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.387822	2026-01-21 23:14:46.387822
753	2611	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.388116	2026-01-21 23:14:46.388116
754	2632	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.388423	2026-01-21 23:14:46.388423
755	2652	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.388721	2026-01-21 23:14:46.388721
756	2672	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.389016	2026-01-21 23:14:46.389016
757	2691	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.38931	2026-01-21 23:14:46.38931
758	2711	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.389606	2026-01-21 23:14:46.389606
759	2752	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.389899	2026-01-21 23:14:46.389899
760	2771	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.390192	2026-01-21 23:14:46.390192
761	2791	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.390486	2026-01-21 23:14:46.390486
762	2812	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.390779	2026-01-21 23:14:46.390779
763	2833	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.391224	2026-01-21 23:14:46.391224
764	2853	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.391566	2026-01-21 23:14:46.391566
765	2873	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.391884	2026-01-21 23:14:46.391884
766	2893	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.392262	2026-01-21 23:14:46.392262
767	2913	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.392615	2026-01-21 23:14:46.392615
768	2933	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.392952	2026-01-21 23:14:46.392952
769	2953	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.393276	2026-01-21 23:14:46.393276
770	2973	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.393596	2026-01-21 23:14:46.393596
771	2992	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.393992	2026-01-21 23:14:46.393992
772	3012	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.39437	2026-01-21 23:14:46.39437
773	3034	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.394709	2026-01-21 23:14:46.394709
774	3054	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.395038	2026-01-21 23:14:46.395038
775	3074	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.39545	2026-01-21 23:14:46.39545
776	3095	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.395766	2026-01-21 23:14:46.395766
777	3115	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.396076	2026-01-21 23:14:46.396076
778	3135	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.396381	2026-01-21 23:14:46.396381
779	3155	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.396694	2026-01-21 23:14:46.396694
780	2252	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.397027	2026-01-21 23:14:46.397027
781	2277	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.397335	2026-01-21 23:14:46.397335
782	2297	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.397637	2026-01-21 23:14:46.397637
783	2318	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.397937	2026-01-21 23:14:46.397937
784	2338	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.398235	2026-01-21 23:14:46.398235
785	2358	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.398533	2026-01-21 23:14:46.398533
786	2377	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.398831	2026-01-21 23:14:46.398831
787	2397	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.399128	2026-01-21 23:14:46.399128
788	2417	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.399425	2026-01-21 23:14:46.399425
789	2437	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.399721	2026-01-21 23:14:46.399721
790	2456	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.400018	2026-01-21 23:14:46.400018
791	2473	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.400313	2026-01-21 23:14:46.400313
792	2497	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.400624	2026-01-21 23:14:46.400624
793	2517	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.400931	2026-01-21 23:14:46.400931
794	2537	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.401297	2026-01-21 23:14:46.401297
795	2555	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.401634	2026-01-21 23:14:46.401634
796	2575	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.401953	2026-01-21 23:14:46.401953
797	2594	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.402253	2026-01-21 23:14:46.402253
798	2615	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.402551	2026-01-21 23:14:46.402551
799	2635	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.402848	2026-01-21 23:14:46.402848
800	2660	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.403259	2026-01-21 23:14:46.403259
801	2684	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.403559	2026-01-21 23:14:46.403559
802	2707	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.403855	2026-01-21 23:14:46.403855
803	2727	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.404148	2026-01-21 23:14:46.404148
804	2746	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.404442	2026-01-21 23:14:46.404442
805	2767	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.404734	2026-01-21 23:14:46.404734
806	2808	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.405026	2026-01-21 23:14:46.405026
807	2826	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.405317	2026-01-21 23:14:46.405317
808	2847	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.405611	2026-01-21 23:14:46.405611
809	2866	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.405914	2026-01-21 23:14:46.405914
810	2886	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.406208	2026-01-21 23:14:46.406208
811	2905	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.406502	2026-01-21 23:14:46.406502
812	2926	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.406793	2026-01-21 23:14:46.406793
813	2946	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.407192	2026-01-21 23:14:46.407192
814	2966	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.407575	2026-01-21 23:14:46.407575
815	2987	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.40791	2026-01-21 23:14:46.40791
816	3007	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.408231	2026-01-21 23:14:46.408231
817	3031	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.408548	2026-01-21 23:14:46.408548
818	3051	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.408863	2026-01-21 23:14:46.408863
819	3071	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.409227	2026-01-21 23:14:46.409227
820	3091	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.409631	2026-01-21 23:14:46.409631
821	3110	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.409979	2026-01-21 23:14:46.409979
822	3131	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.410347	2026-01-21 23:14:46.410347
823	3151	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.410698	2026-01-21 23:14:46.410698
824	3162	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.411041	2026-01-21 23:14:46.411041
825	3186	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.41136	2026-01-21 23:14:46.41136
826	2268	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.411739	2026-01-21 23:14:46.411739
827	2296	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.412086	2026-01-21 23:14:46.412086
828	2313	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.412429	2026-01-21 23:14:46.412429
829	2333	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.412741	2026-01-21 23:14:46.412741
830	2353	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.413044	2026-01-21 23:14:46.413044
831	2372	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.413346	2026-01-21 23:14:46.413346
832	2392	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.413647	2026-01-21 23:14:46.413647
833	2412	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.413948	2026-01-21 23:14:46.413948
834	2432	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.414245	2026-01-21 23:14:46.414245
835	2452	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.41454	2026-01-21 23:14:46.41454
836	2510	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.414834	2026-01-21 23:14:46.414834
837	2529	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.415123	2026-01-21 23:14:46.415123
838	2548	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.415396	2026-01-21 23:14:46.415396
839	2568	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.41574	2026-01-21 23:14:46.41574
840	2589	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.416063	2026-01-21 23:14:46.416063
841	2607	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.416427	2026-01-21 23:14:46.416427
842	2647	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.416832	2026-01-21 23:14:46.416832
843	2686	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.417149	2026-01-21 23:14:46.417149
844	2726	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.417482	2026-01-21 23:14:46.417482
845	2765	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.418482	2026-01-21 23:14:46.418482
846	2785	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.418799	2026-01-21 23:14:46.418799
847	2805	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.419106	2026-01-21 23:14:46.419106
848	2850	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.419416	2026-01-21 23:14:46.419416
849	2869	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.419716	2026-01-21 23:14:46.419716
850	2888	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.420013	2026-01-21 23:14:46.420013
851	2908	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.420312	2026-01-21 23:14:46.420312
852	2928	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.420608	2026-01-21 23:14:46.420608
853	2947	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.420905	2026-01-21 23:14:46.420905
854	2986	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.4212	2026-01-21 23:14:46.4212
855	3006	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.421513	2026-01-21 23:14:46.421513
856	3026	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.421852	2026-01-21 23:14:46.421852
857	3046	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.422172	2026-01-21 23:14:46.422172
858	3066	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.422536	2026-01-21 23:14:46.422536
859	3106	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.422879	2026-01-21 23:14:46.422879
860	3126	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.423315	2026-01-21 23:14:46.423315
861	3183	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.423718	2026-01-21 23:14:46.423718
862	2294	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.424052	2026-01-21 23:14:46.424052
863	2334	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.424449	2026-01-21 23:14:46.424449
864	2354	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.424878	2026-01-21 23:14:46.424878
865	2374	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.425272	2026-01-21 23:14:46.425272
866	2394	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.425637	2026-01-21 23:14:46.425637
867	2414	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.425949	2026-01-21 23:14:46.425949
868	2434	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.426253	2026-01-21 23:14:46.426253
869	2453	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.426554	2026-01-21 23:14:46.426554
870	2500	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.426867	2026-01-21 23:14:46.426867
871	2520	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.427163	2026-01-21 23:14:46.427163
872	2541	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.4275	2026-01-21 23:14:46.4275
873	2561	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.427787	2026-01-21 23:14:46.427787
874	2581	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.428135	2026-01-21 23:14:46.428135
875	2600	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.428457	2026-01-21 23:14:46.428457
876	2661	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.42881	2026-01-21 23:14:46.42881
877	2683	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.429168	2026-01-21 23:14:46.429168
878	2703	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.429486	2026-01-21 23:14:46.429486
879	2723	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.429798	2026-01-21 23:14:46.429798
880	2743	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.430098	2026-01-21 23:14:46.430098
881	2763	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.430394	2026-01-21 23:14:46.430394
882	2783	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.43069	2026-01-21 23:14:46.43069
883	2823	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.43106	2026-01-21 23:14:46.43106
884	2843	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.431401	2026-01-21 23:14:46.431401
885	2863	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.431699	2026-01-21 23:14:46.431699
886	2883	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.431993	2026-01-21 23:14:46.431993
887	2903	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.432285	2026-01-21 23:14:46.432285
888	2923	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.43261	2026-01-21 23:14:46.43261
889	2943	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.432911	2026-01-21 23:14:46.432911
890	2963	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.433203	2026-01-21 23:14:46.433203
891	2983	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.433546	2026-01-21 23:14:46.433546
892	3002	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.433886	2026-01-21 23:14:46.433886
893	3022	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.434201	2026-01-21 23:14:46.434201
894	3043	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.434531	2026-01-21 23:14:46.434531
895	3063	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.434862	2026-01-21 23:14:46.434862
896	3082	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.435182	2026-01-21 23:14:46.435182
897	3141	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.435481	2026-01-21 23:14:46.435481
898	3182	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.435775	2026-01-21 23:14:46.435775
899	3202	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.436066	2026-01-21 23:14:46.436066
900	2290	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.436358	2026-01-21 23:14:46.436358
901	2315	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.436647	2026-01-21 23:14:46.436647
902	2337	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.436935	2026-01-21 23:14:46.436935
903	2357	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.437224	2026-01-21 23:14:46.437224
904	2378	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.437512	2026-01-21 23:14:46.437512
905	2398	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.437802	2026-01-21 23:14:46.437802
906	2418	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.438089	2026-01-21 23:14:46.438089
907	2457	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.438382	2026-01-21 23:14:46.438382
908	2474	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.43874	2026-01-21 23:14:46.43874
909	2493	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.439188	2026-01-21 23:14:46.439188
910	2513	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.439569	2026-01-21 23:14:46.439569
911	2533	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.439952	2026-01-21 23:14:46.439952
912	2553	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.440311	2026-01-21 23:14:46.440311
913	2595	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.440618	2026-01-21 23:14:46.440618
914	2614	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.440969	2026-01-21 23:14:46.440969
915	2634	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.44132	2026-01-21 23:14:46.44132
916	2659	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.441633	2026-01-21 23:14:46.441633
917	2681	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.441963	2026-01-21 23:14:46.441963
918	2701	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.442256	2026-01-21 23:14:46.442256
919	2722	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.442608	2026-01-21 23:14:46.442608
920	2741	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.442963	2026-01-21 23:14:46.442963
921	2761	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.443288	2026-01-21 23:14:46.443288
922	2781	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.443648	2026-01-21 23:14:46.443648
923	2801	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.444003	2026-01-21 23:14:46.444003
924	2819	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.444318	2026-01-21 23:14:46.444318
925	2840	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.444624	2026-01-21 23:14:46.444624
926	2859	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.444928	2026-01-21 23:14:46.444928
927	2878	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.445231	2026-01-21 23:14:46.445231
928	2898	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.445565	2026-01-21 23:14:46.445565
929	2917	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.445845	2026-01-21 23:14:46.445845
930	2937	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.446208	2026-01-21 23:14:46.446208
931	2955	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.44654	2026-01-21 23:14:46.44654
932	2977	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.446869	2026-01-21 23:14:46.446869
933	2997	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.447193	2026-01-21 23:14:46.447193
934	3017	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.4475	2026-01-21 23:14:46.4475
935	3037	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.447802	2026-01-21 23:14:46.447802
936	3057	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.448102	2026-01-21 23:14:46.448102
937	3077	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.448399	2026-01-21 23:14:46.448399
938	3097	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.448707	2026-01-21 23:14:46.448707
939	3119	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.449125	2026-01-21 23:14:46.449125
940	3138	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.449424	2026-01-21 23:14:46.449424
941	3178	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.449732	2026-01-21 23:14:46.449732
942	3198	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.450029	2026-01-21 23:14:46.450029
943	3222	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.450323	2026-01-21 23:14:46.450323
944	2295	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.450633	2026-01-21 23:14:46.450633
945	2327	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.450929	2026-01-21 23:14:46.450929
946	2347	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.451221	2026-01-21 23:14:46.451221
947	2368	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.451527	2026-01-21 23:14:46.451527
948	2388	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.451807	2026-01-21 23:14:46.451807
949	2408	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.45212	2026-01-21 23:14:46.45212
950	2427	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.45242	2026-01-21 23:14:46.45242
951	2447	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.452715	2026-01-21 23:14:46.452715
952	2472	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.45301	2026-01-21 23:14:46.45301
953	2495	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.453302	2026-01-21 23:14:46.453302
954	2516	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.453592	2026-01-21 23:14:46.453592
955	2536	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.453933	2026-01-21 23:14:46.453933
956	2556	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.4543	2026-01-21 23:14:46.4543
957	2576	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.454705	2026-01-21 23:14:46.454705
958	2596	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.455011	2026-01-21 23:14:46.455011
959	2616	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.455302	2026-01-21 23:14:46.455302
960	2636	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.455593	2026-01-21 23:14:46.455593
961	2656	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.455823	2026-01-21 23:14:46.455823
962	2675	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.456211	2026-01-21 23:14:46.456211
963	2695	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.456471	2026-01-21 23:14:46.456471
964	2715	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.456718	2026-01-21 23:14:46.456718
965	2736	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.457001	2026-01-21 23:14:46.457001
966	2756	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.457422	2026-01-21 23:14:46.457422
967	2776	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.457909	2026-01-21 23:14:46.457909
968	2795	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.458326	2026-01-21 23:14:46.458326
969	2815	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.4587	2026-01-21 23:14:46.4587
970	2835	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.459027	2026-01-21 23:14:46.459027
971	2855	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.459349	2026-01-21 23:14:46.459349
972	2875	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.459661	2026-01-21 23:14:46.459661
973	2894	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.459996	2026-01-21 23:14:46.459996
974	2914	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.460352	2026-01-21 23:14:46.460352
975	2934	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.46068	2026-01-21 23:14:46.46068
976	2954	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.461011	2026-01-21 23:14:46.461011
977	2994	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.461301	2026-01-21 23:14:46.461301
978	3014	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.461657	2026-01-21 23:14:46.461657
979	3032	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.461989	2026-01-21 23:14:46.461989
980	3052	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.462312	2026-01-21 23:14:46.462312
981	3072	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.462634	2026-01-21 23:14:46.462634
982	3092	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.462952	2026-01-21 23:14:46.462952
983	3112	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.463378	2026-01-21 23:14:46.463378
984	3132	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.463749	2026-01-21 23:14:46.463749
985	3153	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.46407	2026-01-21 23:14:46.46407
986	3172	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.464388	2026-01-21 23:14:46.464388
987	3192	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.464715	2026-01-21 23:14:46.464715
988	3212	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.465028	2026-01-21 23:14:46.465028
989	3232	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.465333	2026-01-21 23:14:46.465333
990	3247	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.465636	2026-01-21 23:14:46.465636
991	2792	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.465938	2026-01-21 23:14:46.465938
992	2811	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.466242	2026-01-21 23:14:46.466242
993	2831	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.470808	2026-01-21 23:14:46.470808
994	2849	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.471126	2026-01-21 23:14:46.471126
995	2868	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.471431	2026-01-21 23:14:46.471431
996	2889	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.471754	2026-01-21 23:14:46.471754
997	2909	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.472028	2026-01-21 23:14:46.472028
998	2929	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.472369	2026-01-21 23:14:46.472369
999	2949	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.472688	2026-01-21 23:14:46.472688
1000	2970	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.473005	2026-01-21 23:14:46.473005
1001	2989	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.473317	2026-01-21 23:14:46.473317
1002	3010	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.473627	2026-01-21 23:14:46.473627
1003	3049	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.473939	2026-01-21 23:14:46.473939
1004	3069	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.47425	2026-01-21 23:14:46.47425
1005	3085	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.474558	2026-01-21 23:14:46.474558
1006	3105	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.474912	2026-01-21 23:14:46.474912
1007	3124	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.47515	2026-01-21 23:14:46.47515
1008	3143	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.475462	2026-01-21 23:14:46.475462
1009	3161	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.475861	2026-01-21 23:14:46.475861
1010	3181	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.476222	2026-01-21 23:14:46.476222
1011	3201	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.476541	2026-01-21 23:14:46.476541
1012	3221	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.47685	2026-01-21 23:14:46.47685
1013	3239	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.477154	2026-01-21 23:14:46.477154
1014	3243	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.477459	2026-01-21 23:14:46.477459
1015	3262	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.47776	2026-01-21 23:14:46.47776
1016	3265	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.478058	2026-01-21 23:14:46.478058
1017	3284	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.478367	2026-01-21 23:14:46.478367
1018	3304	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.478663	2026-01-21 23:14:46.478663
1019	3324	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.478966	2026-01-21 23:14:46.478966
1020	3343	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.47926	2026-01-21 23:14:46.47926
1021	3347	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.479554	2026-01-21 23:14:46.479554
1022	3364	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.479846	2026-01-21 23:14:46.479846
1023	3368	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.480135	2026-01-21 23:14:46.480135
1024	3382	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.480428	2026-01-21 23:14:46.480428
1025	3389	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.480773	2026-01-21 23:14:46.480773
1026	3402	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.481112	2026-01-21 23:14:46.481112
1027	3409	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.481429	2026-01-21 23:14:46.481429
1028	3422	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.481734	2026-01-21 23:14:46.481734
1029	3429	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.48203	2026-01-21 23:14:46.48203
1030	3445	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.482325	2026-01-21 23:14:46.482325
1031	3465	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.482616	2026-01-21 23:14:46.482616
1032	3473	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.482956	2026-01-21 23:14:46.482956
1033	2797	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.483251	2026-01-21 23:14:46.483251
1034	2816	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.483541	2026-01-21 23:14:46.483541
1035	2836	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.483838	2026-01-21 23:14:46.483838
1036	2856	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.484128	2026-01-21 23:14:46.484128
1037	2876	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.484417	2026-01-21 23:14:46.484417
1038	2897	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.484707	2026-01-21 23:14:46.484707
1039	2916	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.485058	2026-01-21 23:14:46.485058
1040	2936	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.48542	2026-01-21 23:14:46.48542
1041	2956	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.485727	2026-01-21 23:14:46.485727
1042	2979	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.486035	2026-01-21 23:14:46.486035
1043	3000	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.486865	2026-01-21 23:14:46.486865
1044	3040	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.487159	2026-01-21 23:14:46.487159
1045	3060	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.487449	2026-01-21 23:14:46.487449
1046	3080	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.487739	2026-01-21 23:14:46.487739
1047	3118	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.488026	2026-01-21 23:14:46.488026
1048	3137	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.488315	2026-01-21 23:14:46.488315
1049	3157	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.488604	2026-01-21 23:14:46.488604
1050	3176	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.48889	2026-01-21 23:14:46.48889
1051	3196	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.489176	2026-01-21 23:14:46.489176
1052	3216	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.489462	2026-01-21 23:14:46.489462
1053	3236	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.489746	2026-01-21 23:14:46.489746
1054	3255	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.490033	2026-01-21 23:14:46.490033
1055	3268	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.49032	2026-01-21 23:14:46.49032
1056	3275	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.49061	2026-01-21 23:14:46.49061
1057	3288	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.490894	2026-01-21 23:14:46.490894
1058	3295	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.491177	2026-01-21 23:14:46.491177
1059	3309	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.491461	2026-01-21 23:14:46.491461
1060	3315	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.491756	2026-01-21 23:14:46.491756
1061	3329	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.492043	2026-01-21 23:14:46.492043
1062	3335	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.492332	2026-01-21 23:14:46.492332
1063	3349	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.492681	2026-01-21 23:14:46.492681
1064	3369	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.493008	2026-01-21 23:14:46.493008
1065	3375	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.493298	2026-01-21 23:14:46.493298
1066	3388	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.493585	2026-01-21 23:14:46.493585
1067	3408	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.493887	2026-01-21 23:14:46.493887
1068	3428	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.494222	2026-01-21 23:14:46.494222
1069	3435	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.494552	2026-01-21 23:14:46.494552
1070	3447	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.494933	2026-01-21 23:14:46.494933
1071	3467	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.495283	2026-01-21 23:14:46.495283
1072	3475	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.495623	2026-01-21 23:14:46.495623
1073	2802	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.495926	2026-01-21 23:14:46.495926
1074	2824	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.496224	2026-01-21 23:14:46.496224
1075	2844	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.496517	2026-01-21 23:14:46.496517
1076	2881	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.496812	2026-01-21 23:14:46.496812
1077	2921	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.497102	2026-01-21 23:14:46.497102
1078	2941	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.497396	2026-01-21 23:14:46.497396
1079	2981	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.497686	2026-01-21 23:14:46.497686
1080	3001	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.497974	2026-01-21 23:14:46.497974
1081	3021	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.498261	2026-01-21 23:14:46.498261
1082	3041	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.498552	2026-01-21 23:14:46.498552
1083	3061	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.498841	2026-01-21 23:14:46.498841
1084	3081	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.499129	2026-01-21 23:14:46.499129
1085	3101	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.499416	2026-01-21 23:14:46.499416
1086	3122	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.499701	2026-01-21 23:14:46.499701
1087	3145	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.499987	2026-01-21 23:14:46.499987
1088	3166	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.500276	2026-01-21 23:14:46.500276
1089	3185	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.500576	2026-01-21 23:14:46.500576
1090	3205	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.500849	2026-01-21 23:14:46.500849
1091	3225	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.501222	2026-01-21 23:14:46.501222
1092	3254	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.501578	2026-01-21 23:14:46.501578
1093	3273	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.501942	2026-01-21 23:14:46.501942
1094	3292	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.502288	2026-01-21 23:14:46.502288
1095	3313	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.502594	2026-01-21 23:14:46.502594
1096	3391	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.502889	2026-01-21 23:14:46.502889
1097	3411	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.503187	2026-01-21 23:14:46.503187
1098	3431	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.503491	2026-01-21 23:14:46.503491
1099	3450	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.503791	2026-01-21 23:14:46.503791
1100	3470	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.504086	2026-01-21 23:14:46.504086
1101	3505	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.504377	2026-01-21 23:14:46.504377
1102	3509	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.504713	2026-01-21 23:14:46.504713
1103	3524	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.50501	2026-01-21 23:14:46.50501
1104	3529	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.505344	2026-01-21 23:14:46.505344
1105	3547	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.505638	2026-01-21 23:14:46.505638
1106	3550	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.505927	2026-01-21 23:14:46.505927
1107	3568	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.506216	2026-01-21 23:14:46.506216
1108	3569	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.506502	2026-01-21 23:14:46.506502
1109	3588	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.506786	2026-01-21 23:14:46.506786
1110	3590	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.507077	2026-01-21 23:14:46.507077
1111	3609	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.507366	2026-01-21 23:14:46.507366
1112	2851	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.507652	2026-01-21 23:14:46.507652
1113	2870	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.507937	2026-01-21 23:14:46.507937
1114	2890	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.508222	2026-01-21 23:14:46.508222
1115	2910	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.508506	2026-01-21 23:14:46.508506
1116	2950	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.508804	2026-01-21 23:14:46.508804
1117	2969	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.509089	2026-01-21 23:14:46.509089
1118	2990	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.509371	2026-01-21 23:14:46.509371
1119	3009	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.509655	2026-01-21 23:14:46.509655
1120	3027	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.509965	2026-01-21 23:14:46.509965
1121	3067	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.510283	2026-01-21 23:14:46.510283
1122	3088	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.510592	2026-01-21 23:14:46.510592
1123	3108	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.510882	2026-01-21 23:14:46.510882
1124	3129	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.511168	2026-01-21 23:14:46.511168
1125	3149	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.511456	2026-01-21 23:14:46.511456
1126	3168	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.51174	2026-01-21 23:14:46.51174
1127	3190	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.512025	2026-01-21 23:14:46.512025
1128	3210	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.512322	2026-01-21 23:14:46.512322
1129	3230	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.512609	2026-01-21 23:14:46.512609
1130	3248	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.512895	2026-01-21 23:14:46.512895
1131	3267	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.513188	2026-01-21 23:14:46.513188
1132	3289	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.51349	2026-01-21 23:14:46.51349
1133	3308	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.51378	2026-01-21 23:14:46.51378
1134	3327	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.514067	2026-01-21 23:14:46.514067
1135	3344	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.514354	2026-01-21 23:14:46.514354
1136	3363	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.514638	2026-01-21 23:14:46.514638
1137	3383	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.514922	2026-01-21 23:14:46.514922
1138	3403	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.515205	2026-01-21 23:14:46.515205
1139	3423	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.515502	2026-01-21 23:14:46.515502
1140	3441	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.515796	2026-01-21 23:14:46.515796
1141	3461	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.516957	2026-01-21 23:14:46.516957
1142	3480	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.517262	2026-01-21 23:14:46.517262
1143	3488	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.517531	2026-01-21 23:14:46.517531
1144	3501	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.517896	2026-01-21 23:14:46.517896
1145	3508	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.518244	2026-01-21 23:14:46.518244
1146	3521	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.518554	2026-01-21 23:14:46.518554
1147	3528	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.518847	2026-01-21 23:14:46.518847
1148	3541	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.519133	2026-01-21 23:14:46.519133
1149	3545	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.519418	2026-01-21 23:14:46.519418
1150	3561	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.519702	2026-01-21 23:14:46.519702
1151	3566	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.519993	2026-01-21 23:14:46.519993
1152	3580	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.520281	2026-01-21 23:14:46.520281
1153	3587	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.520566	2026-01-21 23:14:46.520566
1154	3600	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.520879	2026-01-21 23:14:46.520879
1155	3607	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.521218	2026-01-21 23:14:46.521218
1156	2857	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.521529	2026-01-21 23:14:46.521529
1157	2879	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.521825	2026-01-21 23:14:46.521825
1158	2899	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.522116	2026-01-21 23:14:46.522116
1159	2924	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.522402	2026-01-21 23:14:46.522402
1160	2965	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.522716	2026-01-21 23:14:46.522716
1161	2985	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.523015	2026-01-21 23:14:46.523015
1162	3004	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.5233	2026-01-21 23:14:46.5233
1163	3023	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.5236	2026-01-21 23:14:46.5236
1164	3042	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.523892	2026-01-21 23:14:46.523892
1165	3062	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.52419	2026-01-21 23:14:46.52419
1166	3084	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.52448	2026-01-21 23:14:46.52448
1167	3104	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.524767	2026-01-21 23:14:46.524767
1168	3125	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.525052	2026-01-21 23:14:46.525052
1169	3142	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.525337	2026-01-21 23:14:46.525337
1170	3174	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.525618	2026-01-21 23:14:46.525618
1171	3194	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.525901	2026-01-21 23:14:46.525901
1172	3214	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.526184	2026-01-21 23:14:46.526184
1173	3234	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.526467	2026-01-21 23:14:46.526467
1174	3253	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.52675	2026-01-21 23:14:46.52675
1175	3274	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.527032	2026-01-21 23:14:46.527032
1176	3294	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.527315	2026-01-21 23:14:46.527315
1177	3314	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.527599	2026-01-21 23:14:46.527599
1178	3334	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.527885	2026-01-21 23:14:46.527885
1179	3354	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.528168	2026-01-21 23:14:46.528168
1180	3374	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.528454	2026-01-21 23:14:46.528454
1181	3394	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.528737	2026-01-21 23:14:46.528737
1182	3414	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.52902	2026-01-21 23:14:46.52902
1183	3434	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.529304	2026-01-21 23:14:46.529304
1184	3452	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.529612	2026-01-21 23:14:46.529612
1185	3472	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.529906	2026-01-21 23:14:46.529906
1186	3492	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.530291	2026-01-21 23:14:46.530291
1187	3512	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.530614	2026-01-21 23:14:46.530614
1188	3515	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.530922	2026-01-21 23:14:46.530922
1189	3532	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.531215	2026-01-21 23:14:46.531215
1190	3540	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.531502	2026-01-21 23:14:46.531502
1191	3551	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.531787	2026-01-21 23:14:46.531787
1192	3560	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.532072	2026-01-21 23:14:46.532072
1193	3571	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.532486	2026-01-21 23:14:46.532486
1194	3581	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.532856	2026-01-21 23:14:46.532856
1195	3591	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.533185	2026-01-21 23:14:46.533185
1196	3604	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.53347	2026-01-21 23:14:46.53347
1197	3624	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.533819	2026-01-21 23:14:46.533819
1198	3633	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.534156	2026-01-21 23:14:46.534156
1199	3647	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.534517	2026-01-21 23:14:46.534517
1200	2939	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.534922	2026-01-21 23:14:46.534922
1201	2976	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.535461	2026-01-21 23:14:46.535461
1202	2996	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.535759	2026-01-21 23:14:46.535759
1203	3016	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.536078	2026-01-21 23:14:46.536078
1204	3035	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.53638	2026-01-21 23:14:46.53638
1205	3055	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.536683	2026-01-21 23:14:46.536683
1206	3075	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.536971	2026-01-21 23:14:46.536971
1207	3094	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.537255	2026-01-21 23:14:46.537255
1208	3114	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.53754	2026-01-21 23:14:46.53754
1209	3134	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.537824	2026-01-21 23:14:46.537824
1210	3154	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.538107	2026-01-21 23:14:46.538107
1211	3169	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.538391	2026-01-21 23:14:46.538391
1212	3188	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.538924	2026-01-21 23:14:46.538924
1213	3208	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.539219	2026-01-21 23:14:46.539219
1214	3229	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.539506	2026-01-21 23:14:46.539506
1215	3249	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.539791	2026-01-21 23:14:46.539791
1216	3269	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.540081	2026-01-21 23:14:46.540081
1217	3291	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.540365	2026-01-21 23:14:46.540365
1218	3312	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.540649	2026-01-21 23:14:46.540649
1219	3332	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.540932	2026-01-21 23:14:46.540932
1220	3353	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.541214	2026-01-21 23:14:46.541214
1221	3373	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.541496	2026-01-21 23:14:46.541496
1222	3393	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.541778	2026-01-21 23:14:46.541778
1223	3433	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.542061	2026-01-21 23:14:46.542061
1224	3453	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.542341	2026-01-21 23:14:46.542341
1225	3474	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.542622	2026-01-21 23:14:46.542622
1226	3494	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.542903	2026-01-21 23:14:46.542903
1227	3495	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.543188	2026-01-21 23:14:46.543188
1228	3513	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.54347	2026-01-21 23:14:46.54347
1229	3514	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.54375	2026-01-21 23:14:46.54375
1230	3533	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.544029	2026-01-21 23:14:46.544029
1231	3536	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.544321	2026-01-21 23:14:46.544321
1232	3553	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.544603	2026-01-21 23:14:46.544603
1233	3556	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.544899	2026-01-21 23:14:46.544899
1234	3576	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.545187	2026-01-21 23:14:46.545187
1235	3592	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.545484	2026-01-21 23:14:46.545484
1236	3596	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.545771	2026-01-21 23:14:46.545771
1237	3611	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.546054	2026-01-21 23:14:46.546054
1238	3615	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.546341	2026-01-21 23:14:46.546341
1239	3631	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.546625	2026-01-21 23:14:46.546625
1240	3635	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.546907	2026-01-21 23:14:46.546907
1241	3650	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.547191	2026-01-21 23:14:46.547191
1242	3656	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.547543	2026-01-21 23:14:46.547543
1243	3011	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.547881	2026-01-21 23:14:46.547881
1244	3030	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.548114	2026-01-21 23:14:46.548114
1245	3050	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.548441	2026-01-21 23:14:46.548441
1246	3070	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.548734	2026-01-21 23:14:46.548734
1247	3090	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.549022	2026-01-21 23:14:46.549022
1248	3111	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.54931	2026-01-21 23:14:46.54931
1249	3130	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.549595	2026-01-21 23:14:46.549595
1250	3150	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.54988	2026-01-21 23:14:46.54988
1251	3170	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.550165	2026-01-21 23:14:46.550165
1252	3187	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.550449	2026-01-21 23:14:46.550449
1253	3207	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.550732	2026-01-21 23:14:46.550732
1254	3227	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.551028	2026-01-21 23:14:46.551028
1255	3244	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.551317	2026-01-21 23:14:46.551317
1256	3279	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.551601	2026-01-21 23:14:46.551601
1257	3299	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.551899	2026-01-21 23:14:46.551899
1258	3319	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.552186	2026-01-21 23:14:46.552186
1259	3339	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.55247	2026-01-21 23:14:46.55247
1260	3358	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.552754	2026-01-21 23:14:46.552754
1261	3379	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.553038	2026-01-21 23:14:46.553038
1262	3399	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.554249	2026-01-21 23:14:46.554249
1263	3419	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.554552	2026-01-21 23:14:46.554552
1264	3439	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.554845	2026-01-21 23:14:46.554845
1265	3478	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.555146	2026-01-21 23:14:46.555146
1266	3498	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.555436	2026-01-21 23:14:46.555436
1267	3519	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.555721	2026-01-21 23:14:46.555721
1268	3544	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.556018	2026-01-21 23:14:46.556018
1269	3564	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.556306	2026-01-21 23:14:46.556306
1270	3585	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.556593	2026-01-21 23:14:46.556593
1271	3605	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.556876	2026-01-21 23:14:46.556876
1272	3610	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.557159	2026-01-21 23:14:46.557159
1273	3629	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.557445	2026-01-21 23:14:46.557445
1274	3646	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.557732	2026-01-21 23:14:46.557732
1275	3649	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.558016	2026-01-21 23:14:46.558016
1276	3666	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.558301	2026-01-21 23:14:46.558301
1277	3690	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.558586	2026-01-21 23:14:46.558586
1278	3706	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.558869	2026-01-21 23:14:46.558869
1279	3711	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.559151	2026-01-21 23:14:46.559151
1280	3726	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.559463	2026-01-21 23:14:46.559463
1281	3747	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.559749	2026-01-21 23:14:46.559749
1282	3752	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.560038	2026-01-21 23:14:46.560038
1283	3767	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.560323	2026-01-21 23:14:46.560323
1284	3024	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.560608	2026-01-21 23:14:46.560608
1285	3044	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.560892	2026-01-21 23:14:46.560892
1286	3064	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.561187	2026-01-21 23:14:46.561187
1287	3086	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.561472	2026-01-21 23:14:46.561472
1288	3107	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.561753	2026-01-21 23:14:46.561753
1289	3127	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.562035	2026-01-21 23:14:46.562035
1290	3147	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.562318	2026-01-21 23:14:46.562318
1291	3171	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.56276	2026-01-21 23:14:46.56276
1292	3191	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.563228	2026-01-21 23:14:46.563228
1293	3211	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.56365	2026-01-21 23:14:46.56365
1294	3231	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.564033	2026-01-21 23:14:46.564033
1295	3250	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.564374	2026-01-21 23:14:46.564374
1296	3270	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.564709	2026-01-21 23:14:46.564709
1297	3290	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.564993	2026-01-21 23:14:46.564993
1298	3310	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.56532	2026-01-21 23:14:46.56532
1299	3331	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.565626	2026-01-21 23:14:46.565626
1300	3351	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.565917	2026-01-21 23:14:46.565917
1301	3372	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.566204	2026-01-21 23:14:46.566204
1302	3392	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.56651	2026-01-21 23:14:46.56651
1303	3412	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.566836	2026-01-21 23:14:46.566836
1304	3432	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.567172	2026-01-21 23:14:46.567172
1305	3451	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.567484	2026-01-21 23:14:46.567484
1306	3471	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.567789	2026-01-21 23:14:46.567789
1307	3491	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.568186	2026-01-21 23:14:46.568186
1308	3511	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.568533	2026-01-21 23:14:46.568533
1309	3531	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.568834	2026-01-21 23:14:46.568834
1310	3549	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.569124	2026-01-21 23:14:46.569124
1311	3570	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.569424	2026-01-21 23:14:46.569424
1312	3589	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.569711	2026-01-21 23:14:46.569711
1313	3608	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.569994	2026-01-21 23:14:46.569994
1314	3627	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.570276	2026-01-21 23:14:46.570276
1315	3628	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.570558	2026-01-21 23:14:46.570558
1316	3653	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.570839	2026-01-21 23:14:46.570839
1317	3664	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.571119	2026-01-21 23:14:46.571119
1318	3675	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.57151	2026-01-21 23:14:46.57151
1319	3684	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.57184	2026-01-21 23:14:46.57184
1320	3705	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.572145	2026-01-21 23:14:46.572145
1321	3714	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.572434	2026-01-21 23:14:46.572434
1322	3725	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.572814	2026-01-21 23:14:46.572814
1323	3745	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.573189	2026-01-21 23:14:46.573189
1324	3755	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.57352	2026-01-21 23:14:46.57352
1325	3764	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.573864	2026-01-21 23:14:46.573864
1326	3775	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.574217	2026-01-21 23:14:46.574217
1327	3038	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.574522	2026-01-21 23:14:46.574522
1328	3058	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.574814	2026-01-21 23:14:46.574814
1329	3078	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.575108	2026-01-21 23:14:46.575108
1330	3098	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.575396	2026-01-21 23:14:46.575396
1331	3117	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.575683	2026-01-21 23:14:46.575683
1332	3139	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.575968	2026-01-21 23:14:46.575968
1333	3159	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.576263	2026-01-21 23:14:46.576263
1334	3179	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.576556	2026-01-21 23:14:46.576556
1335	3199	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.576858	2026-01-21 23:14:46.576858
1336	3220	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.577184	2026-01-21 23:14:46.577184
1337	3238	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.577501	2026-01-21 23:14:46.577501
1338	3263	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.580189	2026-01-21 23:14:46.580189
1339	3282	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.58053	2026-01-21 23:14:46.58053
1340	3302	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.580834	2026-01-21 23:14:46.580834
1341	3322	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.581131	2026-01-21 23:14:46.581131
1342	3340	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.581423	2026-01-21 23:14:46.581423
1343	3360	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.581715	2026-01-21 23:14:46.581715
1344	3380	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.582008	2026-01-21 23:14:46.582008
1345	3400	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.582297	2026-01-21 23:14:46.582297
1346	3421	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.582582	2026-01-21 23:14:46.582582
1347	3458	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.582868	2026-01-21 23:14:46.582868
1348	3479	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.583155	2026-01-21 23:14:46.583155
1349	3499	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.583452	2026-01-21 23:14:46.583452
1350	3518	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.58374	2026-01-21 23:14:46.58374
1351	3534	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.584025	2026-01-21 23:14:46.584025
1352	3546	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.584309	2026-01-21 23:14:46.584309
1353	3565	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.584604	2026-01-21 23:14:46.584604
1354	3603	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.584957	2026-01-21 23:14:46.584957
1355	3623	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.585254	2026-01-21 23:14:46.585254
1356	3630	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.585596	2026-01-21 23:14:46.585596
1357	3643	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.585909	2026-01-21 23:14:46.585909
1358	3644	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.586229	2026-01-21 23:14:46.586229
1359	3663	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.58654	2026-01-21 23:14:46.58654
1360	3665	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.586845	2026-01-21 23:14:46.586845
1361	3683	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.587144	2026-01-21 23:14:46.587144
1362	3685	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.587431	2026-01-21 23:14:46.587431
1363	3703	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.587717	2026-01-21 23:14:46.587717
1364	3704	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.588012	2026-01-21 23:14:46.588012
1365	3723	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.588299	2026-01-21 23:14:46.588299
1366	3724	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.588585	2026-01-21 23:14:46.588585
1367	3742	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.58887	2026-01-21 23:14:46.58887
1368	3744	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.589158	2026-01-21 23:14:46.589158
1369	3762	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.589443	2026-01-21 23:14:46.589443
1370	3765	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.589728	2026-01-21 23:14:46.589728
1371	3073	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.590013	2026-01-21 23:14:46.590013
1372	3093	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.590298	2026-01-21 23:14:46.590298
1373	3113	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.590582	2026-01-21 23:14:46.590582
1374	3133	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.590909	2026-01-21 23:14:46.590909
1375	3152	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.591189	2026-01-21 23:14:46.591189
1376	3173	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.591451	2026-01-21 23:14:46.591451
1377	3193	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.591692	2026-01-21 23:14:46.591692
1378	3213	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.591982	2026-01-21 23:14:46.591982
1379	3252	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.592251	2026-01-21 23:14:46.592251
1380	3272	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.592512	2026-01-21 23:14:46.592512
1381	3293	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.592814	2026-01-21 23:14:46.592814
1382	3311	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.593054	2026-01-21 23:14:46.593054
1383	3330	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.593461	2026-01-21 23:14:46.593461
1384	3350	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.593894	2026-01-21 23:14:46.593894
1385	3390	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.594265	2026-01-21 23:14:46.594265
1386	3410	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.594612	2026-01-21 23:14:46.594612
1387	3430	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.594928	2026-01-21 23:14:46.594928
1388	3449	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.595236	2026-01-21 23:14:46.595236
1389	3469	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.595552	2026-01-21 23:14:46.595552
1390	3489	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.595824	2026-01-21 23:14:46.595824
1391	3510	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.596189	2026-01-21 23:14:46.596189
1392	3530	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.596522	2026-01-21 23:14:46.596522
1393	3554	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.596848	2026-01-21 23:14:46.596848
1394	3574	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.597229	2026-01-21 23:14:46.597229
1395	3594	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.597611	2026-01-21 23:14:46.597611
1396	3613	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.597851	2026-01-21 23:14:46.597851
1397	3632	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.598196	2026-01-21 23:14:46.598196
1398	3641	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.59853	2026-01-21 23:14:46.59853
1399	3651	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.59887	2026-01-21 23:14:46.59887
1400	3661	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.599206	2026-01-21 23:14:46.599206
1401	3671	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.599508	2026-01-21 23:14:46.599508
1402	3681	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.599805	2026-01-21 23:14:46.599805
1403	3691	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.600098	2026-01-21 23:14:46.600098
1404	3701	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.60039	2026-01-21 23:14:46.60039
1405	3710	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.600682	2026-01-21 23:14:46.600682
1406	3719	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.600972	2026-01-21 23:14:46.600972
1407	3729	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.601263	2026-01-21 23:14:46.601263
1408	3740	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.601554	2026-01-21 23:14:46.601554
1409	3749	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.602728	2026-01-21 23:14:46.602728
1410	3760	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.603041	2026-01-21 23:14:46.603041
1411	3769	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.603358	2026-01-21 23:14:46.603358
1412	3780	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.603666	2026-01-21 23:14:46.603666
1413	3800	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.603958	2026-01-21 23:14:46.603958
1414	3136	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.604249	2026-01-21 23:14:46.604249
1415	3156	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.604538	2026-01-21 23:14:46.604538
1416	3177	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.604825	2026-01-21 23:14:46.604825
1417	3197	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.605111	2026-01-21 23:14:46.605111
1418	3217	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.605397	2026-01-21 23:14:46.605397
1419	3237	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.605686	2026-01-21 23:14:46.605686
1420	3261	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.605971	2026-01-21 23:14:46.605971
1421	3281	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.606256	2026-01-21 23:14:46.606256
1422	3301	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.60654	2026-01-21 23:14:46.60654
1423	3320	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.606823	2026-01-21 23:14:46.606823
1424	3342	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.607104	2026-01-21 23:14:46.607104
1425	3384	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.607386	2026-01-21 23:14:46.607386
1426	3404	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.60768	2026-01-21 23:14:46.60768
1427	3424	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.607964	2026-01-21 23:14:46.607964
1428	3442	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.608247	2026-01-21 23:14:46.608247
1429	3463	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.608532	2026-01-21 23:14:46.608532
1430	3483	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.608842	2026-01-21 23:14:46.608842
1431	3503	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.609149	2026-01-21 23:14:46.609149
1432	3522	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.609413	2026-01-21 23:14:46.609413
1433	3538	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.609714	2026-01-21 23:14:46.609714
1434	3558	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.610047	2026-01-21 23:14:46.610047
1435	3579	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.610372	2026-01-21 23:14:46.610372
1436	3602	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.610716	2026-01-21 23:14:46.610716
1437	3622	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.611013	2026-01-21 23:14:46.611013
1438	3642	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.611305	2026-01-21 23:14:46.611305
1439	3652	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.611591	2026-01-21 23:14:46.611591
1440	3672	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.611879	2026-01-21 23:14:46.611879
1441	3682	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.612164	2026-01-21 23:14:46.612164
1442	3693	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.612447	2026-01-21 23:14:46.612447
1443	3702	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.612748	2026-01-21 23:14:46.612748
1444	3713	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.613015	2026-01-21 23:14:46.613015
1445	3722	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.61337	2026-01-21 23:14:46.61337
1446	3733	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.613727	2026-01-21 23:14:46.613727
1447	3743	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.614114	2026-01-21 23:14:46.614114
1448	3753	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.614454	2026-01-21 23:14:46.614454
1449	3763	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.61478	2026-01-21 23:14:46.61478
1450	3782	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.615097	2026-01-21 23:14:46.615097
1451	3793	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.615423	2026-01-21 23:14:46.615423
1452	3805	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.615737	2026-01-21 23:14:46.615737
1453	3813	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.616052	2026-01-21 23:14:46.616052
1454	3822	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.616418	2026-01-21 23:14:46.616418
1455	3826	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.61674	2026-01-21 23:14:46.61674
1456	3833	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.617051	2026-01-21 23:14:46.617051
1457	3140	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.617454	2026-01-21 23:14:46.617454
1458	3160	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.617769	2026-01-21 23:14:46.617769
1459	3180	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.618042	2026-01-21 23:14:46.618042
1460	3200	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.618313	2026-01-21 23:14:46.618313
1461	3219	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.61856	2026-01-21 23:14:46.61856
1462	3241	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.618936	2026-01-21 23:14:46.618936
1463	3258	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.619286	2026-01-21 23:14:46.619286
1464	3278	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.619597	2026-01-21 23:14:46.619597
1465	3298	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.619899	2026-01-21 23:14:46.619899
1466	3318	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.620196	2026-01-21 23:14:46.620196
1467	3337	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.62049	2026-01-21 23:14:46.62049
1468	3356	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.620784	2026-01-21 23:14:46.620784
1469	3377	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.621073	2026-01-21 23:14:46.621073
1470	3397	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.621378	2026-01-21 23:14:46.621378
1471	3417	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.621676	2026-01-21 23:14:46.621676
1472	3436	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.621973	2026-01-21 23:14:46.621973
1473	3456	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.622262	2026-01-21 23:14:46.622262
1474	3477	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.622562	2026-01-21 23:14:46.622562
1475	3497	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.622854	2026-01-21 23:14:46.622854
1476	3516	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.623142	2026-01-21 23:14:46.623142
1477	3535	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.623432	2026-01-21 23:14:46.623432
1478	3555	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.623722	2026-01-21 23:14:46.623722
1479	3575	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.624008	2026-01-21 23:14:46.624008
1480	3595	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.624294	2026-01-21 23:14:46.624294
1481	3616	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.624578	2026-01-21 23:14:46.624578
1482	3636	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.624861	2026-01-21 23:14:46.624861
1483	3657	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.625161	2026-01-21 23:14:46.625161
1484	3677	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.625487	2026-01-21 23:14:46.625487
1485	3687	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.625836	2026-01-21 23:14:46.625836
1486	3698	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.626176	2026-01-21 23:14:46.626176
1487	3707	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.626473	2026-01-21 23:14:46.626473
1488	3720	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.62682	2026-01-21 23:14:46.62682
1489	3727	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.627146	2026-01-21 23:14:46.627146
1490	3746	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.627447	2026-01-21 23:14:46.627447
1491	3761	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.627738	2026-01-21 23:14:46.627738
1492	3766	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.628028	2026-01-21 23:14:46.628028
1493	3786	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.628317	2026-01-21 23:14:46.628317
1495	3801	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.628909	2026-01-21 23:14:46.628909
1496	3809	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.6292	2026-01-21 23:14:46.6292
1497	3825	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.629499	2026-01-21 23:14:46.629499
1498	3184	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.629772	2026-01-21 23:14:46.629772
1499	3204	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.630122	2026-01-21 23:14:46.630122
1500	3223	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.630441	2026-01-21 23:14:46.630441
1501	3256	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.630733	2026-01-21 23:14:46.630733
1502	3277	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.631021	2026-01-21 23:14:46.631021
1503	3297	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.631306	2026-01-21 23:14:46.631306
1504	3317	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.631595	2026-01-21 23:14:46.631595
1505	3341	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.63188	2026-01-21 23:14:46.63188
1506	3381	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.632164	2026-01-21 23:14:46.632164
1507	3401	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.6326	2026-01-21 23:14:46.6326
1508	3437	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.632893	2026-01-21 23:14:46.632893
1509	3457	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.633179	2026-01-21 23:14:46.633179
1510	3476	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.633464	2026-01-21 23:14:46.633464
1511	3517	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.633763	2026-01-21 23:14:46.633763
1512	3542	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.634051	2026-01-21 23:14:46.634051
1513	3562	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.634353	2026-01-21 23:14:46.634353
1514	3582	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.634644	2026-01-21 23:14:46.634644
1515	3598	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.634931	2026-01-21 23:14:46.634931
1516	3617	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.635213	2026-01-21 23:14:46.635213
1517	3637	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.635496	2026-01-21 23:14:46.635496
1518	3654	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.63578	2026-01-21 23:14:46.63578
1519	3673	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.636061	2026-01-21 23:14:46.636061
1520	3676	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.636367	2026-01-21 23:14:46.636367
1521	3692	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.636648	2026-01-21 23:14:46.636648
1522	3696	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.636928	2026-01-21 23:14:46.636928
1523	3712	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.637206	2026-01-21 23:14:46.637206
1524	3716	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.637485	2026-01-21 23:14:46.637485
1525	3731	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.637763	2026-01-21 23:14:46.637763
1526	3736	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.638056	2026-01-21 23:14:46.638056
1527	3750	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.638336	2026-01-21 23:14:46.638336
1528	3756	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.638614	2026-01-21 23:14:46.638614
1529	3770	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.638902	2026-01-21 23:14:46.638902
1530	3776	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.639196	2026-01-21 23:14:46.639196
1531	3789	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.639495	2026-01-21 23:14:46.639495
1532	3796	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.639778	2026-01-21 23:14:46.639778
1533	3810	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.640059	2026-01-21 23:14:46.640059
1534	3815	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.640338	2026-01-21 23:14:46.640338
1535	3816	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.640616	2026-01-21 23:14:46.640616
1536	3835	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.640897	2026-01-21 23:14:46.640897
1537	3836	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.641175	2026-01-21 23:14:46.641175
1538	3851	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.641467	2026-01-21 23:14:46.641467
1539	3167	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.641749	2026-01-21 23:14:46.641749
1540	3189	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.642031	2026-01-21 23:14:46.642031
1541	3209	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.642313	2026-01-21 23:14:46.642313
1542	3246	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.642592	2026-01-21 23:14:46.642592
1543	3266	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.642959	2026-01-21 23:14:46.642959
1544	3286	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.643278	2026-01-21 23:14:46.643278
1545	3325	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.643563	2026-01-21 23:14:46.643563
1546	3346	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.643842	2026-01-21 23:14:46.643842
1547	3365	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.644138	2026-01-21 23:14:46.644138
1548	3386	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.644417	2026-01-21 23:14:46.644417
1549	3406	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.644768	2026-01-21 23:14:46.644768
1550	3426	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.645088	2026-01-21 23:14:46.645088
1551	3446	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.645403	2026-01-21 23:14:46.645403
1552	3466	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.64571	2026-01-21 23:14:46.64571
1553	3486	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.646009	2026-01-21 23:14:46.646009
1554	3506	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.646349	2026-01-21 23:14:46.646349
1555	3526	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.647247	2026-01-21 23:14:46.647247
1556	3586	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.647552	2026-01-21 23:14:46.647552
1557	3606	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.647851	2026-01-21 23:14:46.647851
1558	3625	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.648145	2026-01-21 23:14:46.648145
1559	3648	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.648434	2026-01-21 23:14:46.648434
1560	3668	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.648792	2026-01-21 23:14:46.648792
1561	3688	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.649182	2026-01-21 23:14:46.649182
1562	3689	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.649482	2026-01-21 23:14:46.649482
1563	3708	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.649774	2026-01-21 23:14:46.649774
1564	3709	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.650061	2026-01-21 23:14:46.650061
1565	3728	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.650346	2026-01-21 23:14:46.650346
1566	3730	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.65063	2026-01-21 23:14:46.65063
1567	3748	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.650912	2026-01-21 23:14:46.650912
1568	3751	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.651199	2026-01-21 23:14:46.651199
1569	3768	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.651481	2026-01-21 23:14:46.651481
1570	3771	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.651768	2026-01-21 23:14:46.651768
1571	3791	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.652051	2026-01-21 23:14:46.652051
1572	3807	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.652334	2026-01-21 23:14:46.652334
1573	3811	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.652616	2026-01-21 23:14:46.652616
1574	3820	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.652899	2026-01-21 23:14:46.652899
1575	3827	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.653179	2026-01-21 23:14:46.653179
1576	3831	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.653472	2026-01-21 23:14:46.653472
1577	3840	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.653755	2026-01-21 23:14:46.653755
1578	3852	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.654038	2026-01-21 23:14:46.654038
1579	3854	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.654321	2026-01-21 23:14:46.654321
1580	3195	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.654615	2026-01-21 23:14:46.654615
1581	3235	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.654897	2026-01-21 23:14:46.654897
1582	3257	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.65518	2026-01-21 23:14:46.65518
1583	3276	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.655459	2026-01-21 23:14:46.655459
1584	3296	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.655738	2026-01-21 23:14:46.655738
1585	3316	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.656016	2026-01-21 23:14:46.656016
1586	3336	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.656293	2026-01-21 23:14:46.656293
1587	3357	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.656574	2026-01-21 23:14:46.656574
1588	3376	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.656862	2026-01-21 23:14:46.656862
1589	3396	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.657145	2026-01-21 23:14:46.657145
1590	3443	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.657424	2026-01-21 23:14:46.657424
1591	3462	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.657777	2026-01-21 23:14:46.657777
1592	3481	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.658094	2026-01-21 23:14:46.658094
1593	3500	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.658344	2026-01-21 23:14:46.658344
1594	3520	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.65861	2026-01-21 23:14:46.65861
1595	3537	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.658963	2026-01-21 23:14:46.658963
1596	3557	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.659407	2026-01-21 23:14:46.659407
1597	3577	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.659775	2026-01-21 23:14:46.659775
1598	3599	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.660136	2026-01-21 23:14:46.660136
1599	3619	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.660367	2026-01-21 23:14:46.660367
1600	3640	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.660689	2026-01-21 23:14:46.660689
1601	3659	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.660994	2026-01-21 23:14:46.660994
1602	3678	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.661385	2026-01-21 23:14:46.661385
1603	3697	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.661746	2026-01-21 23:14:46.661746
1604	3717	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.662066	2026-01-21 23:14:46.662066
1605	3757	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.662395	2026-01-21 23:14:46.662395
1606	3772	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.662708	2026-01-21 23:14:46.662708
1607	3777	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.663049	2026-01-21 23:14:46.663049
1608	3792	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.6633	2026-01-21 23:14:46.6633
1609	3797	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.663618	2026-01-21 23:14:46.663618
1610	3812	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.663946	2026-01-21 23:14:46.663946
1611	3817	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.664224	2026-01-21 23:14:46.664224
1612	3832	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.664566	2026-01-21 23:14:46.664566
1613	3844	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.664928	2026-01-21 23:14:46.664928
1614	3850	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.665246	2026-01-21 23:14:46.665246
1615	3864	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.665544	2026-01-21 23:14:46.665544
1616	3865	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.665844	2026-01-21 23:14:46.665844
1617	3870	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.666157	2026-01-21 23:14:46.666157
1618	3877	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.666464	2026-01-21 23:14:46.666464
1619	3887	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.666757	2026-01-21 23:14:46.666757
1620	3203	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.667045	2026-01-21 23:14:46.667045
1621	3264	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.667333	2026-01-21 23:14:46.667333
1622	3287	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.667623	2026-01-21 23:14:46.667623
1623	3307	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.667912	2026-01-21 23:14:46.667912
1624	3328	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.668199	2026-01-21 23:14:46.668199
1625	3385	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.668483	2026-01-21 23:14:46.668483
1626	3405	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.668767	2026-01-21 23:14:46.668767
1627	3425	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.669061	2026-01-21 23:14:46.669061
1628	3444	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.669348	2026-01-21 23:14:46.669348
1629	3464	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.669645	2026-01-21 23:14:46.669645
1630	3484	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.669987	2026-01-21 23:14:46.669987
1631	3504	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.670283	2026-01-21 23:14:46.670283
1632	3525	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.670571	2026-01-21 23:14:46.670571
1633	3583	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.670855	2026-01-21 23:14:46.670855
1634	3601	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.671139	2026-01-21 23:14:46.671139
1635	3620	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.671421	2026-01-21 23:14:46.671421
1636	3639	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.671703	2026-01-21 23:14:46.671703
1637	3660	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.671981	2026-01-21 23:14:46.671981
1638	3700	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.672259	2026-01-21 23:14:46.672259
1639	3721	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.67254	2026-01-21 23:14:46.67254
1640	3738	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.672963	2026-01-21 23:14:46.672963
1641	3758	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.673312	2026-01-21 23:14:46.673312
1642	3779	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.673617	2026-01-21 23:14:46.673617
1643	3783	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.673905	2026-01-21 23:14:46.673905
1644	3799	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.674188	2026-01-21 23:14:46.674188
1645	3804	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.674475	2026-01-21 23:14:46.674475
1646	3819	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.674784	2026-01-21 23:14:46.674784
1647	3837	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.675086	2026-01-21 23:14:46.675086
1648	3839	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.675417	2026-01-21 23:14:46.675417
1649	3845	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.675738	2026-01-21 23:14:46.675738
1650	3855	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.676052	2026-01-21 23:14:46.676052
1651	3859	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.676351	2026-01-21 23:14:46.676351
1652	3866	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.676653	2026-01-21 23:14:46.676653
1653	3871	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.676952	2026-01-21 23:14:46.676952
1654	3875	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.677267	2026-01-21 23:14:46.677267
1655	3876	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.677569	2026-01-21 23:14:46.677569
1656	3879	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.677949	2026-01-21 23:14:46.677949
1657	3884	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.678292	2026-01-21 23:14:46.678292
1659	3206	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.678895	2026-01-21 23:14:46.678895
1660	3226	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.679187	2026-01-21 23:14:46.679187
1661	3251	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.679477	2026-01-21 23:14:46.679477
1662	3271	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.679764	2026-01-21 23:14:46.679764
1663	3306	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.680065	2026-01-21 23:14:46.680065
1664	3326	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.680358	2026-01-21 23:14:46.680358
1665	3348	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.680662	2026-01-21 23:14:46.680662
1666	3367	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.680958	2026-01-21 23:14:46.680958
1667	3387	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.681244	2026-01-21 23:14:46.681244
1668	3407	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.681528	2026-01-21 23:14:46.681528
1669	3427	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.681823	2026-01-21 23:14:46.681823
1670	3448	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.68212	2026-01-21 23:14:46.68212
1671	3487	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.682402	2026-01-21 23:14:46.682402
1672	3507	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.682685	2026-01-21 23:14:46.682685
1673	3527	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.682966	2026-01-21 23:14:46.682966
1674	3552	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.686562	2026-01-21 23:14:46.686562
1675	3593	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.686862	2026-01-21 23:14:46.686862
1676	3614	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.687147	2026-01-21 23:14:46.687147
1677	3634	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.687439	2026-01-21 23:14:46.687439
1678	3655	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.687739	2026-01-21 23:14:46.687739
1679	3674	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.688035	2026-01-21 23:14:46.688035
1680	3695	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.688318	2026-01-21 23:14:46.688318
1681	3715	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.688656	2026-01-21 23:14:46.688656
1682	3735	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.688951	2026-01-21 23:14:46.688951
1683	3754	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.68925	2026-01-21 23:14:46.68925
1684	3774	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.689536	2026-01-21 23:14:46.689536
1685	3784	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.689818	2026-01-21 23:14:46.689818
1686	3795	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.690116	2026-01-21 23:14:46.690116
1687	3803	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.690401	2026-01-21 23:14:46.690401
1688	3814	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.690683	2026-01-21 23:14:46.690683
1689	3823	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.690964	2026-01-21 23:14:46.690964
1690	3834	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.691247	2026-01-21 23:14:46.691247
1691	3842	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.691529	2026-01-21 23:14:46.691529
1692	3843	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.691811	2026-01-21 23:14:46.691811
1693	3849	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.692091	2026-01-21 23:14:46.692091
1694	3856	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.69237	2026-01-21 23:14:46.69237
1695	3862	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.692651	2026-01-21 23:14:46.692651
1696	3863	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.69293	2026-01-21 23:14:46.69293
1697	3869	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.693208	2026-01-21 23:14:46.693208
1698	3873	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.693486	2026-01-21 23:14:46.693486
1699	3878	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.693763	2026-01-21 23:14:46.693763
1700	3882	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.694062	2026-01-21 23:14:46.694062
1701	3883	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.694341	2026-01-21 23:14:46.694341
1702	3898	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.694618	2026-01-21 23:14:46.694618
1703	3916	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.69578	2026-01-21 23:14:46.69578
1704	3936	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.696064	2026-01-21 23:14:46.696064
1705	3955	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.696343	2026-01-21 23:14:46.696343
1706	3958	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.696643	2026-01-21 23:14:46.696643
1707	3978	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.696956	2026-01-21 23:14:46.696956
1708	3997	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.697238	2026-01-21 23:14:46.697238
1709	3889	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.697519	2026-01-21 23:14:46.697519
1710	3897	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.697801	2026-01-21 23:14:46.697801
1711	3919	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.698079	2026-01-21 23:14:46.698079
1712	3938	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.69836	2026-01-21 23:14:46.69836
1713	3959	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.698637	2026-01-21 23:14:46.698637
1714	3979	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.698915	2026-01-21 23:14:46.698915
1715	3998	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.699195	2026-01-21 23:14:46.699195
1716	3891	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.699473	2026-01-21 23:14:46.699473
1717	3893	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.699751	2026-01-21 23:14:46.699751
1718	3895	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.700046	2026-01-21 23:14:46.700046
1719	3899	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.700336	2026-01-21 23:14:46.700336
1720	3902	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.70062	2026-01-21 23:14:46.70062
1721	3904	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.700905	2026-01-21 23:14:46.700905
1722	3906	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.701204	2026-01-21 23:14:46.701204
1723	3910	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.701489	2026-01-21 23:14:46.701489
1724	3912	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.701773	2026-01-21 23:14:46.701773
1725	3915	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.702055	2026-01-21 23:14:46.702055
1726	3918	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.702335	2026-01-21 23:14:46.702335
1727	3923	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.702612	2026-01-21 23:14:46.702612
1728	3924	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.702906	2026-01-21 23:14:46.702906
1729	3927	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.703186	2026-01-21 23:14:46.703186
1730	3930	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.703465	2026-01-21 23:14:46.703465
1731	3932	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.703743	2026-01-21 23:14:46.703743
1732	3935	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.704021	2026-01-21 23:14:46.704021
1733	3939	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.704298	2026-01-21 23:14:46.704298
1734	3943	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.704665	2026-01-21 23:14:46.704665
1735	3946	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.704964	2026-01-21 23:14:46.704964
1736	3947	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.705246	2026-01-21 23:14:46.705246
1737	3949	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.705528	2026-01-21 23:14:46.705528
1738	3950	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.705804	2026-01-21 23:14:46.705804
1739	3951	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.706099	2026-01-21 23:14:46.706099
1740	3953	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.706383	2026-01-21 23:14:46.706383
1741	3956	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.706663	2026-01-21 23:14:46.706663
1742	3961	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.706941	2026-01-21 23:14:46.706941
1743	3962	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.707218	2026-01-21 23:14:46.707218
1744	3963	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.707507	2026-01-21 23:14:46.707507
1745	3965	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.707787	2026-01-21 23:14:46.707787
1746	3970	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.708066	2026-01-21 23:14:46.708066
1747	3973	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.708344	2026-01-21 23:14:46.708344
1748	3981	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.708623	2026-01-21 23:14:46.708623
1749	3982	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.708901	2026-01-21 23:14:46.708901
1750	3983	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.709181	2026-01-21 23:14:46.709181
1751	3985	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.709458	2026-01-21 23:14:46.709458
1752	3990	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.709748	2026-01-21 23:14:46.709748
1753	3991	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.710027	2026-01-21 23:14:46.710027
1754	3992	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.710325	2026-01-21 23:14:46.710325
1755	3994	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.710606	2026-01-21 23:14:46.710606
1756	3999	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.710884	2026-01-21 23:14:46.710884
1757	3890	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.711162	2026-01-21 23:14:46.711162
1758	3896	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.711569	2026-01-21 23:14:46.711569
1759	3917	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.711869	2026-01-21 23:14:46.711869
1760	3937	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.712192	2026-01-21 23:14:46.712192
1761	3957	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.712463	2026-01-21 23:14:46.712463
1762	3996	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.712745	2026-01-21 23:14:46.712745
1763	3892	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.713026	2026-01-21 23:14:46.713026
1764	3900	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.713304	2026-01-21 23:14:46.713304
1765	3901	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.713585	2026-01-21 23:14:46.713585
1766	3905	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.713863	2026-01-21 23:14:46.713863
1767	3907	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.714141	2026-01-21 23:14:46.714141
1768	3909	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.714418	2026-01-21 23:14:46.714418
1769	3911	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.714695	2026-01-21 23:14:46.714695
1770	3914	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.714973	2026-01-21 23:14:46.714973
1771	3920	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.715252	2026-01-21 23:14:46.715252
1772	3921	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.715529	2026-01-21 23:14:46.715529
1773	3922	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.715806	2026-01-21 23:14:46.715806
1774	3925	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.716084	2026-01-21 23:14:46.716084
1775	3926	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.71636	2026-01-21 23:14:46.71636
1776	3928	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.716634	2026-01-21 23:14:46.716634
1777	3931	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.716923	2026-01-21 23:14:46.716923
1778	3934	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.717199	2026-01-21 23:14:46.717199
1779	3940	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.717679	2026-01-21 23:14:46.717679
1780	3941	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.718013	2026-01-21 23:14:46.718013
1781	3942	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.718292	2026-01-21 23:14:46.718292
1782	3944	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.718573	2026-01-21 23:14:46.718573
1783	3945	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.71885	2026-01-21 23:14:46.71885
1784	3948	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.719129	2026-01-21 23:14:46.719129
1785	3952	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.719406	2026-01-21 23:14:46.719406
1786	3954	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.719684	2026-01-21 23:14:46.719684
1787	3960	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.719962	2026-01-21 23:14:46.719962
1788	3964	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.720303	2026-01-21 23:14:46.720303
1789	3966	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.720627	2026-01-21 23:14:46.720627
1790	3967	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.721002	2026-01-21 23:14:46.721002
1791	3968	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.721302	2026-01-21 23:14:46.721302
1792	3969	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.721589	2026-01-21 23:14:46.721589
1793	3974	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.721874	2026-01-21 23:14:46.721874
1794	3975	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.722166	2026-01-21 23:14:46.722166
1795	3980	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.72245	2026-01-21 23:14:46.72245
1796	3984	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.722731	2026-01-21 23:14:46.722731
1797	3986	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.72301	2026-01-21 23:14:46.72301
1798	3987	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.723289	2026-01-21 23:14:46.723289
1799	3988	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.723567	2026-01-21 23:14:46.723567
1800	3989	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.723844	2026-01-21 23:14:46.723844
1801	3993	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.724133	2026-01-21 23:14:46.724133
1802	3995	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.724428	2026-01-21 23:14:46.724428
1803	4000	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.724713	2026-01-21 23:14:46.724713
1804	4001	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.724994	2026-01-21 23:14:46.724994
1805	4002	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.725276	2026-01-21 23:14:46.725276
1806	4003	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.725555	2026-01-21 23:14:46.725555
1807	4005	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.725833	2026-01-21 23:14:46.725833
1808	4006	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.726111	2026-01-21 23:14:46.726111
1809	4008	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.726388	2026-01-21 23:14:46.726388
1810	4009	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-21 23:14:46.726665	2026-01-21 23:14:46.726665
1811	10357	2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-22 00:37:28.843663	2026-01-22 00:37:38.270572
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
\.


--
-- Data for Name: fichas_tecnicas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fichas_tecnicas (id, nombre_coordinacion, nombre_coordinador, nombre_evento, fecha_evento, tipo_evento, modalidad, fecha_limite_inscripcion, requiere_inscripcion, es_gratuito, costo, dirigido_a, lugar_evento, talleristas, objetivos, temas, observaciones, usuario_id, estado, created_at, updated_at, motivo_rechazo, domicilio, duracion, telefono_contacto, requiere_montaje, autoridades_invitadas, programa_evento, datos_estadisticos, informacion_historica, presupuesto, requiere_diseno_grafico, requiere_publicacion, requiere_transmision, compromiso_rectora) FROM stdin;
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

COPY public.inventario (id, marca, modelo, dependencia_id, ubicacion, estado, descripcion, created_at, updated_at, numero_patrimonio, numero_serie, coordinacion_id, es_oficial_siia, es_local, es_investigacion, folio, tipo_bien, comentarios, estado_uso, costo, cog, uuid, factura, fondo, cuenta_por_pagar, empleado_resguardante_id, usuario_asignado_id, numero_resguardo_interno, estatus_validacion, fecha_adquisicion, fecha_baja, motivo_baja, vida_util_anios, depreciacion_anual, valor_actual, ultimo_mantenimiento, proximo_mantenimiento, garantia_meses, proveedor, observaciones_tecnicas, foto_url, documento_adjunto_url, stage, uuid_fiscal, numero_factura, fecha_compra, fecha_envio, fecha_recepcion, enviado_por, recibido_por, tipo_inventario, registro_patrimonial, registro_interno, elaboro_nombre, fecha_elaboracion, ures_asignacion, recurso, ur, id_patrimonio, clave_patrimonial, ures_gasto, ejercicio, solicitud_compra, idcon, usu_asig, fecha_registro, fecha_asignacion, imagenes, responsable_entrega_id, ubicacion_id, ubicacion_especifica, fecha_factura, numero_empleado, numero_inventario, descripcion_bien) FROM stdin;
1590073	\N	\N	1	\N	buena	\N	2026-01-29 02:47:12.640029	2026-01-29 02:57:48.461339	\N	\N	\N	f	t	f	INV-2026-001	\N	\N	operativo	\N	\N	\N	\N	\N	\N	\N	2	\N	borrador	\N	\N	\N	5	\N	\N	\N	\N	\N	\N	\N	\N	\N	COMPLETO	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: jerarquias_responsables; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jerarquias_responsables (id, nombre, tipo, codigo, parent_id, nivel, activo, created_at, updated_at) FROM stdin;
1	DIRECTOR	DIRECTOR	1	\N	1	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
2	Jefe de la División de Posgrados	JEFE_DIVISION	1.1	1	2	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
3	SUBDIRECTOR	SUBDIRECTOR	1.2	1	2	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
4	Comisión Académica de Investigación	COMISION	1.1.1	2	3	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
5	Comisión Académica del Doctorado en Administración	COMISION	1.1.2	2	3	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
6	Comisión Académica del Doctorado en Fiscal	COMISION	1.1.3	2	3	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
7	Comisión Académica de la Maestría en Administración	COMISION	1.1.4	2	3	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
8	Comisión Académica de la Maestría en Fiscal	COMISION	1.1.5	2	3	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
9	Comisión Académica de la Maestría de Defensa del Contribuyente	COMISION	1.1.6	2	3	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
10	Comisión Académica de Acreditación y Mejora Continua	COMISION	1.2.1	3	3	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
11	Comisión Académica de Servicios Informáticos	COMISION	1.2.2	3	3	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
12	Comisión Académica de Diseño y Comunicación	COMISION	1.2.3	3	3	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
13	Comisión Académica de Proyectos y Sistemas	COMISION	1.2.4	3	3	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
14	Comisión Académica de Infraestructura Informática	COMISION	1.2.5	3	3	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
15	Secretaria Académica	COMISION	1.2.6	3	3	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
16	Secretaría Administrativa	COMISION	1.2.7	3	3	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
17	Comisión Académica de Atención Integral del Alumnado con Perspectiva de Género	COMISION	1.2.8	3	3	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
18	Consejo de Vinculación	COMISION	1.2.9	3	3	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
19	Comisión Académica de la Licenciatura en Contaduría	COMISION	1.2.6.1	15	4	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
20	Comisión Académica de la Licenciatura en Administración	COMISION	1.2.6.2	15	4	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
21	Comisión Académica de la Licenciatura en Informática administrativa	COMISION	1.2.6.3	15	4	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
22	Comisión Académica de la Licenciatura en Mercadotecnia	COMISION	1.2.6.4	15	4	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
23	Comisión Académica del Sistema Abierto y en Línea	COMISION	1.2.6.5	15	4	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
24	Comisión Académica de Recursos Financieros, Materiales y de Servicios	COMISION	1.2.7.1	16	4	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
25	Comisión Académica de Recursos humanos	COMISION	1.2.7.2	16	4	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
26	Comisión Académica de Bibliotecas	COMISION	1.2.7.3	16	4	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
27	Comisión Académica de Módulos de Apoyo Académico	COMISION	1.2.7.4	16	4	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
28	Comisión Académica de Tutorías	COMISION	1.2.8.1	17	4	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
29	Comisión Académicas de Servicio Social y Prácticas Profesionales y Responsabilidad Social	COMISION	1.2.8.2	17	4	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
30	Comisión Académica de Educación Continua y Seguimiento a Egresados	COMISION	1.2.8.3	17	4	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
31	Comisión Académica de Intercambio Estudiantil y eventos Culturales	COMISION	1.2.8.4	17	4	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
32	Comisión Académica de Vinculación y Desarrollo Empresarial	COMISION	1.2.9.1	18	4	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
33	Comisión Académica de Programas de Emprendimiento	COMISION	1.2.9.2	18	4	t	2026-01-29 01:00:09.164843	2026-01-29 01:00:09.164843
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
9	2	solicitud_material	Solicitud de material de oficina	Necesito papel, bolígrafos y folders para el departamento	en_proceso	baja	2025-11-04 01:01:38.381414	2025-12-03 19:28:58.30739	\N	\N	\N
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
-- Data for Name: ubicaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ubicaciones (id, edificio_id, nombre, piso, descripcion, activo, created_at) FROM stdin;
1	1	Salón 1	\N	\N	t	2026-01-29 01:00:09.164843
2	1	Salón 2	\N	\N	t	2026-01-29 01:00:09.164843
3	1	Salón 3	\N	\N	t	2026-01-29 01:00:09.164843
4	1	Salón 4	\N	\N	t	2026-01-29 01:00:09.164843
5	1	Salón 5	\N	\N	t	2026-01-29 01:00:09.164843
6	1	Salón 6	\N	\N	t	2026-01-29 01:00:09.164843
7	1	Salón 7	\N	\N	t	2026-01-29 01:00:09.164843
8	1	Salón 8	\N	\N	t	2026-01-29 01:00:09.164843
9	1	Salón 9	\N	\N	t	2026-01-29 01:00:09.164843
10	1	Salón 10	\N	\N	t	2026-01-29 01:00:09.164843
11	1	Salón 11	\N	\N	t	2026-01-29 01:00:09.164843
12	1	Salón 12	\N	\N	t	2026-01-29 01:00:09.164843
13	1	Salón 13	\N	\N	t	2026-01-29 01:00:09.164843
14	1	Salón 14	\N	\N	t	2026-01-29 01:00:09.164843
15	1	Salón 15	\N	\N	t	2026-01-29 01:00:09.164843
16	1	Salón 16	\N	\N	t	2026-01-29 01:00:09.164843
17	1	Salón 17	\N	\N	t	2026-01-29 01:00:09.164843
18	1	Salón 18	\N	\N	t	2026-01-29 01:00:09.164843
19	1	Salón 19	\N	\N	t	2026-01-29 01:00:09.164843
20	1	Salón 20	\N	\N	t	2026-01-29 01:00:09.164843
21	1	Salón 21	\N	\N	t	2026-01-29 01:00:09.164843
22	1	Salón 22	\N	\N	t	2026-01-29 01:00:09.164843
23	1	Salón 23	\N	\N	t	2026-01-29 01:00:09.164843
24	1	Salón 24	\N	\N	t	2026-01-29 01:00:09.164843
25	1	Salón 25	\N	\N	t	2026-01-29 01:00:09.164843
26	1	Salón 26	\N	\N	t	2026-01-29 01:00:09.164843
27	1	Salón 27	\N	\N	t	2026-01-29 01:00:09.164843
28	1	Salón 28	\N	\N	t	2026-01-29 01:00:09.164843
29	1	Salón 29	\N	\N	t	2026-01-29 01:00:09.164843
30	1	Salón 30	\N	\N	t	2026-01-29 01:00:09.164843
31	1	Personalizado	\N	\N	t	2026-01-29 01:00:09.164843
32	2	Salón 1	\N	\N	t	2026-01-29 01:00:09.164843
33	2	Salón 2	\N	\N	t	2026-01-29 01:00:09.164843
34	2	Salón 3	\N	\N	t	2026-01-29 01:00:09.164843
35	2	Salón 4	\N	\N	t	2026-01-29 01:00:09.164843
36	2	Salón 5	\N	\N	t	2026-01-29 01:00:09.164843
37	2	Salón 6	\N	\N	t	2026-01-29 01:00:09.164843
38	2	Salón 7	\N	\N	t	2026-01-29 01:00:09.164843
39	2	Salón 8	\N	\N	t	2026-01-29 01:00:09.164843
40	2	Salón 9	\N	\N	t	2026-01-29 01:00:09.164843
41	2	Salón 10	\N	\N	t	2026-01-29 01:00:09.164843
42	2	Salón 11	\N	\N	t	2026-01-29 01:00:09.164843
43	2	Salón 12	\N	\N	t	2026-01-29 01:00:09.164843
44	2	Salón 13	\N	\N	t	2026-01-29 01:00:09.164843
45	2	Salón 14	\N	\N	t	2026-01-29 01:00:09.164843
46	2	Salón 15	\N	\N	t	2026-01-29 01:00:09.164843
47	2	Salón 16	\N	\N	t	2026-01-29 01:00:09.164843
48	2	Salón 17	\N	\N	t	2026-01-29 01:00:09.164843
49	2	Salón 18	\N	\N	t	2026-01-29 01:00:09.164843
50	2	Salón 19	\N	\N	t	2026-01-29 01:00:09.164843
51	2	Salón 20	\N	\N	t	2026-01-29 01:00:09.164843
52	2	Salón 21	\N	\N	t	2026-01-29 01:00:09.164843
53	2	Salón 22	\N	\N	t	2026-01-29 01:00:09.164843
54	2	Salón 23	\N	\N	t	2026-01-29 01:00:09.164843
55	2	Salón 24	\N	\N	t	2026-01-29 01:00:09.164843
56	2	Salón 25	\N	\N	t	2026-01-29 01:00:09.164843
57	2	Salón 26	\N	\N	t	2026-01-29 01:00:09.164843
58	2	Salón 27	\N	\N	t	2026-01-29 01:00:09.164843
59	2	Salón 28	\N	\N	t	2026-01-29 01:00:09.164843
60	2	Salón 29	\N	\N	t	2026-01-29 01:00:09.164843
61	2	Salón 30	\N	\N	t	2026-01-29 01:00:09.164843
62	2	Personalizado	\N	\N	t	2026-01-29 01:00:09.164843
63	3	Salón 1	\N	\N	t	2026-01-29 01:00:09.164843
64	3	Salón 2	\N	\N	t	2026-01-29 01:00:09.164843
65	3	Salón 3	\N	\N	t	2026-01-29 01:00:09.164843
66	3	Salón 4	\N	\N	t	2026-01-29 01:00:09.164843
67	3	Salón 5	\N	\N	t	2026-01-29 01:00:09.164843
68	3	Salón 6	\N	\N	t	2026-01-29 01:00:09.164843
69	3	Salón 7	\N	\N	t	2026-01-29 01:00:09.164843
70	3	Salón 8	\N	\N	t	2026-01-29 01:00:09.164843
71	3	Salón 9	\N	\N	t	2026-01-29 01:00:09.164843
72	3	Salón 10	\N	\N	t	2026-01-29 01:00:09.164843
73	3	Salón 11	\N	\N	t	2026-01-29 01:00:09.164843
74	3	Salón 12	\N	\N	t	2026-01-29 01:00:09.164843
75	3	Salón 13	\N	\N	t	2026-01-29 01:00:09.164843
76	3	Salón 14	\N	\N	t	2026-01-29 01:00:09.164843
77	3	Salón 15	\N	\N	t	2026-01-29 01:00:09.164843
78	3	Salón 16	\N	\N	t	2026-01-29 01:00:09.164843
79	3	Salón 17	\N	\N	t	2026-01-29 01:00:09.164843
80	3	Salón 18	\N	\N	t	2026-01-29 01:00:09.164843
81	3	Salón 19	\N	\N	t	2026-01-29 01:00:09.164843
82	3	Salón 20	\N	\N	t	2026-01-29 01:00:09.164843
83	3	Salón 21	\N	\N	t	2026-01-29 01:00:09.164843
84	3	Salón 22	\N	\N	t	2026-01-29 01:00:09.164843
85	3	Salón 23	\N	\N	t	2026-01-29 01:00:09.164843
86	3	Salón 24	\N	\N	t	2026-01-29 01:00:09.164843
87	3	Salón 25	\N	\N	t	2026-01-29 01:00:09.164843
88	3	Salón 26	\N	\N	t	2026-01-29 01:00:09.164843
89	3	Salón 27	\N	\N	t	2026-01-29 01:00:09.164843
90	3	Salón 28	\N	\N	t	2026-01-29 01:00:09.164843
91	3	Salón 29	\N	\N	t	2026-01-29 01:00:09.164843
92	3	Salón 30	\N	\N	t	2026-01-29 01:00:09.164843
93	3	Personalizado	\N	\N	t	2026-01-29 01:00:09.164843
94	4	Salón 1	\N	\N	t	2026-01-29 01:00:09.164843
95	4	Salón 2	\N	\N	t	2026-01-29 01:00:09.164843
96	4	Salón 3	\N	\N	t	2026-01-29 01:00:09.164843
97	4	Salón 4	\N	\N	t	2026-01-29 01:00:09.164843
98	4	Salón 5	\N	\N	t	2026-01-29 01:00:09.164843
99	4	Salón 6	\N	\N	t	2026-01-29 01:00:09.164843
100	4	Salón 7	\N	\N	t	2026-01-29 01:00:09.164843
101	4	Salón 8	\N	\N	t	2026-01-29 01:00:09.164843
102	4	Salón 9	\N	\N	t	2026-01-29 01:00:09.164843
103	4	Salón 10	\N	\N	t	2026-01-29 01:00:09.164843
104	4	Salón 11	\N	\N	t	2026-01-29 01:00:09.164843
105	4	Salón 12	\N	\N	t	2026-01-29 01:00:09.164843
106	4	Salón 13	\N	\N	t	2026-01-29 01:00:09.164843
107	4	Salón 14	\N	\N	t	2026-01-29 01:00:09.164843
108	4	Salón 15	\N	\N	t	2026-01-29 01:00:09.164843
109	4	Salón 16	\N	\N	t	2026-01-29 01:00:09.164843
110	4	Salón 17	\N	\N	t	2026-01-29 01:00:09.164843
111	4	Salón 18	\N	\N	t	2026-01-29 01:00:09.164843
112	4	Salón 19	\N	\N	t	2026-01-29 01:00:09.164843
113	4	Salón 20	\N	\N	t	2026-01-29 01:00:09.164843
114	4	Salón 21	\N	\N	t	2026-01-29 01:00:09.164843
115	4	Salón 22	\N	\N	t	2026-01-29 01:00:09.164843
116	4	Salón 23	\N	\N	t	2026-01-29 01:00:09.164843
117	4	Salón 24	\N	\N	t	2026-01-29 01:00:09.164843
118	4	Salón 25	\N	\N	t	2026-01-29 01:00:09.164843
119	4	Salón 26	\N	\N	t	2026-01-29 01:00:09.164843
120	4	Salón 27	\N	\N	t	2026-01-29 01:00:09.164843
121	4	Salón 28	\N	\N	t	2026-01-29 01:00:09.164843
122	4	Salón 29	\N	\N	t	2026-01-29 01:00:09.164843
123	4	Salón 30	\N	\N	t	2026-01-29 01:00:09.164843
124	4	Personalizado	\N	\N	t	2026-01-29 01:00:09.164843
125	5	Salón 1	\N	\N	t	2026-01-29 01:00:09.164843
126	5	Salón 2	\N	\N	t	2026-01-29 01:00:09.164843
127	5	Salón 3	\N	\N	t	2026-01-29 01:00:09.164843
128	5	Salón 4	\N	\N	t	2026-01-29 01:00:09.164843
129	5	Salón 5	\N	\N	t	2026-01-29 01:00:09.164843
130	5	Salón 6	\N	\N	t	2026-01-29 01:00:09.164843
131	5	Salón 7	\N	\N	t	2026-01-29 01:00:09.164843
132	5	Salón 8	\N	\N	t	2026-01-29 01:00:09.164843
133	5	Salón 9	\N	\N	t	2026-01-29 01:00:09.164843
134	5	Salón 10	\N	\N	t	2026-01-29 01:00:09.164843
135	5	Salón 11	\N	\N	t	2026-01-29 01:00:09.164843
136	5	Salón 12	\N	\N	t	2026-01-29 01:00:09.164843
137	5	Salón 13	\N	\N	t	2026-01-29 01:00:09.164843
138	5	Salón 14	\N	\N	t	2026-01-29 01:00:09.164843
139	5	Salón 15	\N	\N	t	2026-01-29 01:00:09.164843
140	5	Salón 16	\N	\N	t	2026-01-29 01:00:09.164843
141	5	Salón 17	\N	\N	t	2026-01-29 01:00:09.164843
142	5	Salón 18	\N	\N	t	2026-01-29 01:00:09.164843
143	5	Salón 19	\N	\N	t	2026-01-29 01:00:09.164843
144	5	Salón 20	\N	\N	t	2026-01-29 01:00:09.164843
145	5	Salón 21	\N	\N	t	2026-01-29 01:00:09.164843
146	5	Salón 22	\N	\N	t	2026-01-29 01:00:09.164843
147	5	Salón 23	\N	\N	t	2026-01-29 01:00:09.164843
148	5	Salón 24	\N	\N	t	2026-01-29 01:00:09.164843
149	5	Salón 25	\N	\N	t	2026-01-29 01:00:09.164843
150	5	Salón 26	\N	\N	t	2026-01-29 01:00:09.164843
151	5	Salón 27	\N	\N	t	2026-01-29 01:00:09.164843
152	5	Salón 28	\N	\N	t	2026-01-29 01:00:09.164843
153	5	Salón 29	\N	\N	t	2026-01-29 01:00:09.164843
154	5	Salón 30	\N	\N	t	2026-01-29 01:00:09.164843
155	5	Personalizado	\N	\N	t	2026-01-29 01:00:09.164843
156	6	Salón 1	\N	\N	t	2026-01-29 01:00:09.164843
157	6	Salón 2	\N	\N	t	2026-01-29 01:00:09.164843
158	6	Salón 3	\N	\N	t	2026-01-29 01:00:09.164843
159	6	Salón 4	\N	\N	t	2026-01-29 01:00:09.164843
160	6	Salón 5	\N	\N	t	2026-01-29 01:00:09.164843
161	6	Salón 6	\N	\N	t	2026-01-29 01:00:09.164843
162	6	Salón 7	\N	\N	t	2026-01-29 01:00:09.164843
163	6	Salón 8	\N	\N	t	2026-01-29 01:00:09.164843
164	6	Salón 9	\N	\N	t	2026-01-29 01:00:09.164843
165	6	Salón 10	\N	\N	t	2026-01-29 01:00:09.164843
166	6	Salón 11	\N	\N	t	2026-01-29 01:00:09.164843
167	6	Salón 12	\N	\N	t	2026-01-29 01:00:09.164843
168	6	Salón 13	\N	\N	t	2026-01-29 01:00:09.164843
169	6	Salón 14	\N	\N	t	2026-01-29 01:00:09.164843
170	6	Salón 15	\N	\N	t	2026-01-29 01:00:09.164843
171	6	Salón 16	\N	\N	t	2026-01-29 01:00:09.164843
172	6	Salón 17	\N	\N	t	2026-01-29 01:00:09.164843
173	6	Salón 18	\N	\N	t	2026-01-29 01:00:09.164843
174	6	Salón 19	\N	\N	t	2026-01-29 01:00:09.164843
175	6	Salón 20	\N	\N	t	2026-01-29 01:00:09.164843
176	6	Salón 21	\N	\N	t	2026-01-29 01:00:09.164843
177	6	Salón 22	\N	\N	t	2026-01-29 01:00:09.164843
178	6	Salón 23	\N	\N	t	2026-01-29 01:00:09.164843
179	6	Salón 24	\N	\N	t	2026-01-29 01:00:09.164843
180	6	Salón 25	\N	\N	t	2026-01-29 01:00:09.164843
181	6	Salón 26	\N	\N	t	2026-01-29 01:00:09.164843
182	6	Salón 27	\N	\N	t	2026-01-29 01:00:09.164843
183	6	Salón 28	\N	\N	t	2026-01-29 01:00:09.164843
184	6	Salón 29	\N	\N	t	2026-01-29 01:00:09.164843
185	6	Salón 30	\N	\N	t	2026-01-29 01:00:09.164843
186	6	Personalizado	\N	\N	t	2026-01-29 01:00:09.164843
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, email, password, nombre, apellido_paterno, apellido_materno, role, activo, created_at, updated_at, dependencia_id, rfc, telefono, coordinacion_id) FROM stdin;
2	2211930x@umich.mx	$2a$10$acTy7x2ttxl4ZQJZhuYIkuam9o7tFJNyuKGQ1BQauk9rEX5aKm/o6	oliver otoniel	virrueta	montero	admin	t	2025-11-04 00:42:04.30543	2026-01-07 15:47:05.575985	\N	VIRO850615ABC	4431234567	\N
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

SELECT pg_catalog.setval('public.asistencias_quincenales_id_seq', 1812, true);


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

SELECT pg_catalog.setval('public.empleados_id_seq', 13357181, true);


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

SELECT pg_catalog.setval('public.inventario_id_seq', 1590073, true);


--
-- Name: jerarquias_responsables_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.jerarquias_responsables_id_seq', 33, true);


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
-- Name: ubicaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ubicaciones_id_seq', 186, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 418, true);


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
-- Name: empleados employees_rfc_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT employees_rfc_unique UNIQUE (rfc);


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
-- Name: jerarquias_responsables jerarquias_responsables_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jerarquias_responsables
    ADD CONSTRAINT jerarquias_responsables_pkey PRIMARY KEY (id);


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
-- Name: ubicaciones ubicaciones_edificio_id_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ubicaciones
    ADD CONSTRAINT ubicaciones_edificio_id_nombre_key UNIQUE (edificio_id, nombre);


--
-- Name: ubicaciones ubicaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ubicaciones
    ADD CONSTRAINT ubicaciones_pkey PRIMARY KEY (id);


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
-- Name: idx_inventario_clave_patrimonial; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_clave_patrimonial ON public.inventario USING btree (clave_patrimonial) WHERE (clave_patrimonial IS NOT NULL);


--
-- Name: idx_inventario_cog; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_cog ON public.inventario USING btree (cog);


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
-- Name: idx_inventario_fondo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_fondo ON public.inventario USING btree (fondo);


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
-- Name: idx_inventario_registro_patrimonial; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_registro_patrimonial ON public.inventario USING btree (registro_patrimonial) WHERE (registro_patrimonial IS NOT NULL);


--
-- Name: idx_inventario_responsable; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_responsable ON public.inventario USING btree (responsable_entrega_id);


--
-- Name: idx_inventario_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_stage ON public.inventario USING btree (stage);


--
-- Name: idx_inventario_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_tipo ON public.inventario USING btree (tipo_inventario);


--
-- Name: idx_inventario_ubicacion_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_ubicacion_id ON public.inventario USING btree (ubicacion_id);


--
-- Name: idx_inventario_uuid_fiscal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_uuid_fiscal ON public.inventario USING btree (uuid_fiscal) WHERE (uuid_fiscal IS NOT NULL);


--
-- Name: idx_jerarquias_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jerarquias_activo ON public.jerarquias_responsables USING btree (activo);


--
-- Name: idx_jerarquias_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jerarquias_parent ON public.jerarquias_responsables USING btree (parent_id);


--
-- Name: idx_jerarquias_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jerarquias_tipo ON public.jerarquias_responsables USING btree (tipo);


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
-- Name: idx_ubicaciones_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ubicaciones_activo ON public.ubicaciones USING btree (activo);


--
-- Name: idx_ubicaciones_edificio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ubicaciones_edificio ON public.ubicaciones USING btree (edificio_id);


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
-- Name: inventario inventario_responsable_entrega_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_responsable_entrega_id_fkey FOREIGN KEY (responsable_entrega_id) REFERENCES public.jerarquias_responsables(id) ON DELETE SET NULL;


--
-- Name: inventario inventario_ubicacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_ubicacion_id_fkey FOREIGN KEY (ubicacion_id) REFERENCES public.ubicaciones(id) ON DELETE SET NULL;


--
-- Name: inventario inventario_usuario_asignado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_usuario_asignado_id_fkey FOREIGN KEY (usuario_asignado_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: jerarquias_responsables jerarquias_responsables_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jerarquias_responsables
    ADD CONSTRAINT jerarquias_responsables_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.jerarquias_responsables(id) ON DELETE SET NULL;


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
-- Name: ubicaciones ubicaciones_edificio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ubicaciones
    ADD CONSTRAINT ubicaciones_edificio_id_fkey FOREIGN KEY (edificio_id) REFERENCES public.edificios(id) ON DELETE CASCADE;


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

\unrestrict 8cEnU8ta4l5OkravIIwZRmCeq5VsTZ5joJqQLXd17cqT66j38hvQVVsIvKqUD7z

