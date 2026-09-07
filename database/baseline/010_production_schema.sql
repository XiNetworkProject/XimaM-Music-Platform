-- Synaura canonical PostgreSQL baseline (Phase 1A)
-- Source: production PostgreSQL 17.11, schema-only, captured 2026-09-07.
-- Raw structural snapshot SHA-256: f71db9ee3f9a74f9218d5994e82cb1305b3749ffd4620caa315794a09e937293
-- Contains no table data and no role passwords. Apply only to an empty isolated database.

--
-- PostgreSQL database dump
--

\restrict synaura_phase1a_canonical_baseline
-- Dumped from database version 17.11 (Debian 17.11-1.pgdg12+2)
-- Dumped by pg_dump version 17.11 (Debian 17.11-1.pgdg12+2)

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
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO postgres;

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql;


ALTER SCHEMA graphql OWNER TO supabase_admin;

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql_public;


ALTER SCHEMA graphql_public OWNER TO supabase_admin;

--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO supabase_admin;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA supabase_migrations;


ALTER SCHEMA supabase_migrations OWNER TO postgres;

--
-- Name: synaura_private; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA synaura_private;


ALTER SCHEMA synaura_private OWNER TO postgres;

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA vault;


ALTER SCHEMA vault OWNER TO supabase_admin;

--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


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
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE auth.oauth_authorization_status OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE auth.oauth_client_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE auth.oauth_registration_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


ALTER TYPE auth.oauth_response_type OWNER TO supabase_auth_admin;

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- Name: track_event_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.track_event_type AS ENUM (
    'view',
    'play_start',
    'play_progress',
    'play_complete',
    'like',
    'unlike',
    'share',
    'favorite',
    'unfavorite',
    'skip',
    'next',
    'prev',
    'add_to_playlist'
);


ALTER TYPE public.track_event_type OWNER TO postgres;

--
-- Name: action; Type: TYPE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


ALTER TYPE realtime.action OWNER TO supabase_realtime_admin;

--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in',
    'like',
    'ilike',
    'is',
    'match',
    'imatch',
    'isdistinct'
);


ALTER TYPE realtime.equality_op OWNER TO supabase_realtime_admin;

--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text,
	negate boolean
);


ALTER TYPE realtime.user_defined_filter OWNER TO supabase_realtime_admin;

--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


ALTER TYPE realtime.wal_column OWNER TO supabase_realtime_admin;

--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


ALTER TYPE realtime.wal_rls OWNER TO supabase_realtime_admin;

--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE storage.buckettype OWNER TO supabase_storage_admin;

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_cron_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


ALTER FUNCTION extensions.grant_pg_graphql_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_net_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_ddl_watch() OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_drop_watch() OWNER TO supabase_admin;

--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


ALTER FUNCTION extensions.set_graphql_placeholder() OWNER TO supabase_admin;

--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: graphql(text, text, jsonb, jsonb); Type: FUNCTION; Schema: graphql_public; Owner: supabase_admin
--

CREATE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;


ALTER FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) OWNER TO supabase_admin;

--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: _ensure_track_stats(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._ensure_track_stats(p_track_id text) RETURNS void
    LANGUAGE plpgsql
    AS $$
begin
  insert into public.track_stats as ts (track_id, likes_count, views_count, updated_at)
  values (p_track_id, 0, 0, now())
  on conflict (track_id) do nothing;
end;
$$;


ALTER FUNCTION public._ensure_track_stats(p_track_id text) OWNER TO postgres;

--
-- Name: ai_add_credits(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ai_add_credits(p_user_id uuid, p_amount integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.ai_credit_balances(user_id, balance)
  VALUES (p_user_id, GREATEST(p_amount, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.ai_credit_balances.balance + GREATEST(p_amount, 0),
        updated_at = NOW();
END;
$$;


ALTER FUNCTION public.ai_add_credits(p_user_id uuid, p_amount integer) OWNER TO postgres;

--
-- Name: ai_add_credits(uuid, integer, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ai_add_credits(p_user_id uuid, p_amount integer, p_source text DEFAULT 'admin_adjustment'::text, p_description text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  new_balance integer;
BEGIN
  INSERT INTO public.ai_credit_balances(user_id, balance)
  VALUES (p_user_id, GREATEST(p_amount, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.ai_credit_balances.balance + GREATEST(p_amount, 0),
        updated_at = NOW()
  RETURNING balance INTO new_balance;

  INSERT INTO public.credit_ledger(user_id, delta, balance_after, source, description)
  VALUES (p_user_id, GREATEST(p_amount, 0), COALESCE(new_balance, p_amount), p_source, p_description);
END;
$$;


ALTER FUNCTION public.ai_add_credits(p_user_id uuid, p_amount integer, p_source text, p_description text) OWNER TO postgres;

--
-- Name: ai_debit_credits(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ai_debit_credits(p_user_id uuid, p_amount integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  current_balance integer;
BEGIN
  SELECT balance INTO current_balance FROM public.ai_credit_balances WHERE user_id = p_user_id FOR UPDATE;
  IF current_balance IS NULL THEN
    current_balance := 0;
  END IF;
  IF current_balance < p_amount THEN
    RETURN FALSE; -- solde insuffisant
  END IF;
  UPDATE public.ai_credit_balances SET balance = balance - p_amount, updated_at = NOW() WHERE user_id = p_user_id;
  RETURN TRUE;
END;
$$;


ALTER FUNCTION public.ai_debit_credits(p_user_id uuid, p_amount integer) OWNER TO postgres;

--
-- Name: ai_debit_credits(uuid, integer, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ai_debit_credits(p_user_id uuid, p_amount integer, p_source text DEFAULT 'action_spend'::text, p_description text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  new_balance integer;
BEGIN
  UPDATE public.ai_credit_balances
    SET balance = balance - p_amount, updated_at = NOW()
    WHERE user_id = p_user_id AND balance >= p_amount
    RETURNING balance INTO new_balance;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.credit_ledger(user_id, delta, balance_after, source, description)
  VALUES (p_user_id, -p_amount, new_balance, p_source, p_description);

  RETURN TRUE;
END;
$$;


ALTER FUNCTION public.ai_debit_credits(p_user_id uuid, p_amount integer, p_source text, p_description text) OWNER TO postgres;

--
-- Name: ai_grant_monthly_plan_credits(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ai_grant_monthly_plan_credits() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  r RECORD;
  plan_name text;
  amount integer;
BEGIN
  FOR r IN SELECT id, plan FROM public.profiles LOOP
    plan_name := COALESCE(r.plan, 'free');
    amount := CASE plan_name
      WHEN 'starter' THEN 600
      WHEN 'pro' THEN 2400
      ELSE 0
    END;
    IF amount > 0 THEN
      PERFORM public.ai_add_credits(r.id, amount, 'subscription_grant',
        'Crédits mensuels plan ' || plan_name);
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION public.ai_grant_monthly_plan_credits() OWNER TO postgres;

--
-- Name: ai_grant_welcome_credits(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ai_grant_welcome_credits() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM public.ai_add_credits(NEW.id, 50, 'welcome_bonus', 'Bonus inscription');
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.ai_grant_welcome_credits() OWNER TO postgres;

--
-- Name: auto_generate_referral_code(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_generate_referral_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.referral_code IS NULL AND NEW.username IS NOT NULL THEN
    NEW.referral_code := 'SYN-' || UPPER(SUBSTRING(NEW.username FROM 1 FOR 12)) || '-' || SUBSTRING(NEW.id::text FROM 1 FOR 4);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.auto_generate_referral_code() OWNER TO postgres;

--
-- Name: check_user_quota(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_user_quota(user_uuid uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    user_plan VARCHAR(20);
    current_usage INTEGER;
    max_generations INTEGER;
BEGIN
    -- Récupérer le plan de l'utilisateur
    SELECT subscription_plan INTO user_plan
    FROM users
    WHERE id = user_uuid;

    -- Compter les générations du mois
    SELECT get_monthly_generations_count(user_uuid) INTO current_usage;

    -- Définir les limites selon le plan
    CASE user_plan
        WHEN 'free' THEN max_generations := 10;
        WHEN 'starter' THEN max_generations := 50;
        WHEN 'creator' THEN max_generations := 200;
        WHEN 'pro' THEN max_generations := 1000;
        WHEN 'enterprise' THEN max_generations := 9999;
        ELSE max_generations := 10;
    END CASE;

    RETURN current_usage < max_generations;
END;
$$;


ALTER FUNCTION public.check_user_quota(user_uuid uuid) OWNER TO postgres;

--
-- Name: get_active_members_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_active_members_count() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    active_count INTEGER;
    thirty_days_ago TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculer la date d'il y a 30 jours
    thirty_days_ago := NOW() - INTERVAL '30 days';

    -- Compter les utilisateurs uniques qui ont posté ou répondu dans les 30 derniers jours
    SELECT COUNT(DISTINCT user_id) INTO active_count
    FROM (
        -- Utilisateurs ayant posté dans les 30 derniers jours
        SELECT user_id FROM forum_posts
        WHERE created_at >= thirty_days_ago

        UNION

        -- Utilisateurs ayant répondu dans les 30 derniers jours
        SELECT user_id FROM forum_replies
        WHERE created_at >= thirty_days_ago
    ) AS active_users;

    RETURN COALESCE(active_count, 0);
END;
$$;


ALTER FUNCTION public.get_active_members_count() OWNER TO postgres;

--
-- Name: get_monthly_generations_count(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_monthly_generations_count(user_uuid uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM ai_generations
        WHERE user_id = user_uuid
        AND created_at >= date_trunc('month', NOW())
    );
END;
$$;


ALTER FUNCTION public.get_monthly_generations_count(user_uuid uuid) OWNER TO postgres;

--
-- Name: get_user_ai_stats(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_ai_stats(user_uuid uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_generations', COUNT(*),
        'total_tracks', (
            SELECT COUNT(*) FROM ai_tracks
            WHERE generation_id IN (
                SELECT id FROM ai_generations WHERE user_id = user_uuid
            )
        ),
        'total_favorites', (
            SELECT COUNT(*) FROM ai_generations
            WHERE user_id = user_uuid AND is_favorite = true
        ),
        'total_plays', (
            SELECT COALESCE(SUM(play_count), 0) FROM ai_generations
            WHERE user_id = user_uuid
        ),
        'total_likes', (
            SELECT COALESCE(SUM(like_count), 0) FROM ai_generations
            WHERE user_id = user_uuid
        )
    ) INTO result
    FROM ai_generations
    WHERE user_id = user_uuid;

    RETURN COALESCE(result, '{}'::json);
END;
$$;


ALTER FUNCTION public.get_user_ai_stats(user_uuid uuid) OWNER TO postgres;

--
-- Name: get_user_quota_remaining(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_quota_remaining(user_uuid uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    user_quota RECORD;
    used_count INTEGER;
BEGIN
    -- Récupérer le quota de l'utilisateur
    SELECT * INTO user_quota FROM user_quotas WHERE user_id = user_uuid;

    IF user_quota IS NULL THEN
        -- Créer un quota par défaut si l'utilisateur n'en a pas
        INSERT INTO user_quotas (user_id, plan_type, monthly_limit, used_this_month, reset_date)
        VALUES (user_uuid, 'free', 5, 0, NOW() + INTERVAL '1 month')
        ON CONFLICT (user_id) DO NOTHING;

        SELECT * INTO user_quota FROM user_quotas WHERE user_id = user_uuid;
    END IF;

    -- Vérifier si le mois a changé
    IF user_quota.reset_date < NOW() THEN
        -- Réinitialiser le compteur
        UPDATE user_quotas
        SET used_this_month = 0, reset_date = NOW() + INTERVAL '1 month'
        WHERE user_id = user_uuid;
        user_quota.used_this_month := 0;
    END IF;

    -- Retourner le nombre restant
    RETURN GREATEST(0, user_quota.monthly_limit - user_quota.used_this_month);
END;
$$;


ALTER FUNCTION public.get_user_quota_remaining(user_uuid uuid) OWNER TO postgres;

--
-- Name: get_user_stats(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_stats(user_uuid uuid) RETURNS TABLE(total_tracks bigint, total_playlists bigint, total_followers bigint, total_following bigint, total_likes bigint, total_plays bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM tracks WHERE creator_id = user_uuid)::BIGINT,
    (SELECT COUNT(*) FROM playlists WHERE creator_id = user_uuid)::BIGINT,
    (SELECT COUNT(*) FROM user_follows WHERE following_id = user_uuid)::BIGINT,
    (SELECT COUNT(*) FROM user_follows WHERE follower_id = user_uuid)::BIGINT,
    (SELECT COUNT(*) FROM track_likes WHERE user_id = user_uuid)::BIGINT,
    (SELECT COALESCE(SUM(plays), 0) FROM tracks WHERE creator_id = user_uuid)::BIGINT;
END;
$$;


ALTER FUNCTION public.get_user_stats(user_uuid uuid) OWNER TO postgres;

--
-- Name: increment_ai_usage(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.increment_ai_usage(user_uuid uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    current_quota INTEGER;
BEGIN
    -- Vérifier le quota restant
    current_quota := get_user_quota_remaining(user_uuid);

    IF current_quota <= 0 THEN
        RETURN FALSE;
    END IF;

    -- Incrémenter l'utilisation
    UPDATE user_quotas
    SET used_this_month = used_this_month + 1
    WHERE user_id = user_uuid;

    RETURN TRUE;
END;
$$;


ALTER FUNCTION public.increment_ai_usage(user_uuid uuid) OWNER TO postgres;

--
-- Name: move_profile_email_to_private(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.move_profile_email_to_private() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if new.email is not null then
    insert into public.account_private (user_id, email)
    values (new.id, lower(new.email))
    on conflict (user_id) do update
      set email = excluded.email;
    new.email = null;
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.move_profile_email_to_private() OWNER TO postgres;

--
-- Name: record_track_view(text, uuid, inet, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.record_track_view(p_track_id text, p_user_id uuid, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  view_exists BOOLEAN;
  new_views_count INTEGER;
BEGIN
  -- Vérifier si une vue existe déjà aujourd'hui pour cet utilisateur
  SELECT EXISTS(
    SELECT 1 FROM track_views
    WHERE track_id = p_track_id
    AND user_id = p_user_id
    AND viewed_date = CURRENT_DATE
  ) INTO view_exists;

  IF NOT view_exists THEN
    -- Enregistrer la vue
    INSERT INTO track_views (track_id, user_id, ip_address, user_agent, viewed_date)
    VALUES (p_track_id, p_user_id, p_ip_address, p_user_agent, CURRENT_DATE);
  END IF;

  -- Récupérer le compteur total de vues
  SELECT views_count INTO new_views_count
  FROM tracks
  WHERE id = p_track_id;

  RETURN json_build_object(
    'success', true,
    'views_count', new_views_count,
    'new_view', NOT view_exists
  );
END;
$$;


ALTER FUNCTION public.record_track_view(p_track_id text, p_user_id uuid, p_ip_address inet, p_user_agent text) OWNER TO postgres;

--
-- Name: require_city_battle_winner_vote(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.require_city_battle_winner_vote() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if exists (
    select 1
    from public.city_events event
    where event.id = new.event_id
      and event.kind = 'battle'
  ) and not exists (
    select 1
    from public.city_event_votes vote
    where vote.event_id = new.event_id
      and vote.track_id = new.track_id
  ) then
    raise exception 'A city battle winner must have at least one persisted vote';
  end if;

  return new;
end;
$$;


ALTER FUNCTION public.require_city_battle_winner_vote() OWNER TO postgres;

--
-- Name: search_tracks(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_tracks(search_query text) RETURNS TABLE(id text, title text, description text, audio_url text, cover_url text, duration integer, genre text[], creator_id uuid, plays integer, likes integer, creator_name text, creator_username text, similarity real)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.description,
    t.audio_url,
    t.cover_url,
    t.duration,
    t.genre,
    t.creator_id,
    t.plays,
    t.likes,
    p.name as creator_name,
    p.username as creator_username,
    GREATEST(
      similarity(t.title, search_query),
      similarity(t.description, search_query),
      similarity(p.name, search_query),
      similarity(p.username, search_query)
    ) as similarity
  FROM tracks t
  LEFT JOIN profiles p ON t.creator_id = p.id
  WHERE
    t.is_public = true AND (
      t.title ILIKE '%' || search_query || '%' OR
      t.description ILIKE '%' || search_query || '%' OR
      p.name ILIKE '%' || search_query || '%' OR
      p.username ILIKE '%' || search_query || '%' OR
      search_query = ANY(t.genre)
    )
  ORDER BY similarity DESC, t.plays DESC, t.likes DESC;
END;
$$;


ALTER FUNCTION public.search_tracks(search_query text) OWNER TO postgres;

--
-- Name: set_city_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_city_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.set_city_updated_at() OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: synaura_cleanup_realtime_events(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.synaura_cleanup_realtime_events() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  delete from public.conversation_realtime_events where expires_at <= now();
  return new;
end;
$$;


ALTER FUNCTION public.synaura_cleanup_realtime_events() OWNER TO postgres;

--
-- Name: synaura_sync_message_relation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.synaura_sync_message_relation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  select message.conversation_id
  into new.conversation_id
  from public.messages message
  where message.id = new.message_id;
  if new.conversation_id is null then
    raise exception 'Message relation not found';
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.synaura_sync_message_relation() OWNER TO postgres;

--
-- Name: synaura_touch_conversation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.synaura_touch_conversation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.conversations
  set
    last_message_id = new.id,
    last_message_at = new.created_at,
    updated_at = new.created_at,
    is_active = true
  where id = new.conversation_id;
  return new;
end;
$$;


ALTER FUNCTION public.synaura_touch_conversation() OWNER TO postgres;

--
-- Name: toggle_track_like(text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.toggle_track_like(p_track_id text, p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  like_exists BOOLEAN;
  new_likes_count INTEGER;
  is_liked BOOLEAN;
BEGIN
  -- Vérifier si le like existe déjà
  SELECT EXISTS(
    SELECT 1 FROM track_likes
    WHERE track_id = p_track_id AND user_id = p_user_id
  ) INTO like_exists;

  IF like_exists THEN
    -- Supprimer le like
    DELETE FROM track_likes
    WHERE track_id = p_track_id AND user_id = p_user_id;
    is_liked := false;
  ELSE
    -- Ajouter le like
    INSERT INTO track_likes (track_id, user_id)
    VALUES (p_track_id, p_user_id);
    is_liked := true;
  END IF;

  -- Récupérer le nouveau compteur
  SELECT likes_count INTO new_likes_count
  FROM tracks
  WHERE id = p_track_id;

  RETURN json_build_object(
    'success', true,
    'is_liked', is_liked,
    'likes_count', new_likes_count
  );
END;
$$;


ALTER FUNCTION public.toggle_track_like(p_track_id text, p_user_id uuid) OWNER TO postgres;

--
-- Name: touch_account_private_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.touch_account_private_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.touch_account_private_updated_at() OWNER TO postgres;

--
-- Name: touch_editorial_collections_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.touch_editorial_collections_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.touch_editorial_collections_updated_at() OWNER TO postgres;

--
-- Name: touch_music_clips_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.touch_music_clips_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.touch_music_clips_updated_at() OWNER TO postgres;

--
-- Name: trg_track_likes_after_delete(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_track_likes_after_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  update public.track_stats
    set likes_count = greatest(likes_count - 1, 0),
        updated_at = now()
  where track_id = old.track_id;
  return old;
end;
$$;


ALTER FUNCTION public.trg_track_likes_after_delete() OWNER TO postgres;

--
-- Name: trg_track_likes_after_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_track_likes_after_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  perform public._ensure_track_stats(new.track_id);
  update public.track_stats
    set likes_count = likes_count + 1,
        updated_at = now()
  where track_id = new.track_id;
  return new;
end;
$$;


ALTER FUNCTION public.trg_track_likes_after_insert() OWNER TO postgres;

--
-- Name: trg_track_views_after_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_track_views_after_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  perform public._ensure_track_stats(new.track_id);
  update public.track_stats
    set views_count = views_count + 1,
        updated_at = now()
  where track_id = new.track_id;
  return new;
end;
$$;


ALTER FUNCTION public.trg_track_views_after_insert() OWNER TO postgres;

--
-- Name: trigger_update_follow_counts(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_update_follow_counts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Mettre à jour les compteurs pour l'utilisateur suivi (follower_count)
  PERFORM update_follow_counts(NEW.following_id);

  -- Mettre à jour les compteurs pour l'utilisateur qui suit (following_count)
  PERFORM update_follow_counts(NEW.follower_id);

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_update_follow_counts() OWNER TO postgres;

--
-- Name: update_ai_usage_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_ai_usage_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO ai_usage_stats (user_id, generations_count)
    VALUES (NEW.user_id, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        generations_count = ai_usage_stats.generations_count + 1;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_ai_usage_stats() OWNER TO postgres;

--
-- Name: update_comment_likes_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_comment_likes_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments
    SET likes_count = likes_count + 1
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION public.update_comment_likes_count() OWNER TO postgres;

--
-- Name: update_follow_counts(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_follow_counts(user_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Mettre à jour le nombre de followers (combien de personnes suivent cet utilisateur)
  UPDATE profiles
  SET follower_count = (
    SELECT COUNT(*)
    FROM user_follows
    WHERE following_id = user_id
  )
  WHERE id = user_id;

  -- Mettre à jour le nombre de following (combien de personnes cet utilisateur suit)
  UPDATE profiles
  SET following_count = (
    SELECT COUNT(*)
    FROM user_follows
    WHERE follower_id = user_id
  )
  WHERE id = user_id;
END;
$$;


ALTER FUNCTION public.update_follow_counts(user_id uuid) OWNER TO postgres;

--
-- Name: update_forum_post_likes_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_forum_post_likes_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION public.update_forum_post_likes_count() OWNER TO postgres;

--
-- Name: update_forum_post_replies_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_forum_post_replies_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts SET replies_count = replies_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts SET replies_count = replies_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION public.update_forum_post_replies_count() OWNER TO postgres;

--
-- Name: update_forum_reply_likes_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_forum_reply_likes_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_replies SET likes_count = likes_count + 1 WHERE id = NEW.reply_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_replies SET likes_count = likes_count - 1 WHERE id = OLD.reply_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION public.update_forum_reply_likes_count() OWNER TO postgres;

--
-- Name: update_meteo_bulletins_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_meteo_bulletins_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_meteo_bulletins_updated_at() OWNER TO postgres;

--
-- Name: update_music_challenges_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_music_challenges_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_music_challenges_updated_at() OWNER TO postgres;

--
-- Name: update_sa_staff_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_sa_staff_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


ALTER FUNCTION public.update_sa_staff_updated_at() OWNER TO postgres;

--
-- Name: update_sa_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_sa_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


ALTER FUNCTION public.update_sa_updated_at() OWNER TO postgres;

--
-- Name: update_track_likes_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_track_likes_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tracks
    SET likes_count = likes_count + 1
    WHERE id = NEW.track_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tracks
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.track_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION public.update_track_likes_count() OWNER TO postgres;

--
-- Name: update_track_views_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_track_views_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE tracks
  SET views_count = views_count + 1
  WHERE id = NEW.track_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_track_views_count() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: validate_account_private_birth_date(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_account_private_birth_date() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if new.birth_date is not null
    and new.birth_date > (current_date - interval '15 years')::date then
    raise exception 'ACCOUNT_MINIMUM_AGE_15';
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.validate_account_private_birth_date() OWNER TO postgres;

--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
    -- Regclass of the table e.g. public.notes
    entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

    -- I, U, D, T: insert, update ...
    action realtime.action = (
        case wal ->> 'action'
            when 'I' then 'INSERT'
            when 'U' then 'UPDATE'
            when 'D' then 'DELETE'
            else 'ERROR'
        end
    );

    -- Is row level security enabled for the table
    is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

    subscriptions realtime.subscription[] = array_agg(subs)
        from
            realtime.subscription subs
        where
            subs.entity = entity_
            -- Filter by action early - only get subscriptions interested in this action
            -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
            and (subs.action_filter = '*' or subs.action_filter = action::text);

    -- Subscription vars
    working_role regrole;
    working_selected_columns text[];
    claimed_role regrole;
    claims jsonb;

    subscription_id uuid;
    subscription_has_access bool;
    visible_to_subscription_ids uuid[] = '{}';

    -- structured info for wal's columns
    columns realtime.wal_column[];
    -- previous identity values for update/delete
    old_columns realtime.wal_column[];

    error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

    -- Primary jsonb output for record
    output jsonb;

    -- Loop record for iterating unique roles (outer loop)
    role_record record;
    -- Loop record for iterating unique selected_columns within a role (inner loop)
    cols_record record;
    -- Subscription ids visible at the role level (before fanning out by selected_columns)
    visible_role_sub_ids uuid[] = '{}';

begin
    perform set_config('role', null, true);

    columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'columns') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    old_columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'identity') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    for role_record in
        select claims_role
        from (select distinct claims_role from unnest(subscriptions)) t
        order by claims_role::text
    loop
        working_role := role_record.claims_role;

        -- Update `is_selectable` for columns and old_columns (once per role)
        columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(columns) c;

        old_columns =
                array_agg(
                    (
                        c.name,
                        c.type_name,
                        c.type_oid,
                        c.value,
                        c.is_pkey,
                        pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                    )::realtime.wal_column
                )
                from
                    unnest(old_columns) c;

        if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
            -- Fan out 400 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 400: Bad Request, no primary key']
                )::realtime.wal_rls;
            end loop;

        -- The claims role does not have SELECT permission to the primary key of entity
        elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
            -- Fan out 401 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 401: Unauthorized']
                )::realtime.wal_rls;
            end loop;

        else
            -- Create the prepared statement (once per role)
            if is_rls_enabled and action <> 'DELETE' then
                if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                    deallocate walrus_rls_stmt;
                end if;
                execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
            end if;

            -- Collect all visible subscription IDs for this role (filter check + RLS check)
            visible_role_sub_ids = '{}';

            for subscription_id, claims in (
                    select
                        subs.subscription_id,
                        subs.claims
                    from
                        unnest(subscriptions) subs
                    where
                        subs.entity = entity_
                        and subs.claims_role = working_role
                        and (
                            realtime.is_visible_through_filters(columns, subs.filters)
                            or (
                              action = 'DELETE'
                              and realtime.is_visible_through_filters(old_columns, subs.filters)
                            )
                        )
            ) loop

                if not is_rls_enabled or action = 'DELETE' then
                    visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                else
                    -- Check if RLS allows the role to see the record
                    perform
                        -- Trim leading and trailing quotes from working_role because set_config
                        -- doesn't recognize the role as valid if they are included
                        set_config('role', trim(both '"' from working_role::text), true),
                        set_config('request.jwt.claims', claims::text, true);

                    execute 'execute walrus_rls_stmt' into subscription_has_access;

                    -- Reset the role on every FOR..LOOP batch execution.
                    -- The first batch of 10 rows is pre-fetched using the current connection role (PG internal behaviour)
                    -- then we have to reset it again otherwise it would use the role defined in the `set_config` above
                    -- to fetch the remaining rows when rows>10, which could be a user-defined role that lacks execution grants.
                    -- The flow is:
                    --   1. run batch with conn role
                    --   2. set_config working_role
                    --   3. execute walrus
                    --   4. reset role (revert)
                    --   5. repeat
                    perform set_config('role', null, true);

                    if subscription_has_access then
                        visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                    end if;
                end if;
            end loop;

            perform set_config('role', null, true);

            -- Inner loop: per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;

                output = jsonb_build_object(
                    'schema', wal ->> 'schema',
                    'table', wal ->> 'table',
                    'type', action,
                    'commit_timestamp', to_char(
                        ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                    ),
                    'columns', (
                        select
                            jsonb_agg(
                                jsonb_build_object(
                                    'name', pa.attname,
                                    'type', pt.typname
                                )
                                order by pa.attnum asc
                            )
                        from
                            pg_attribute pa
                            join pg_type pt
                                on pa.atttypid = pt.oid
                            left join (
                                select unnest(conkey) as pkey_attnum
                                from pg_constraint
                                where conrelid = entity_ and contype = 'p'
                            ) pk on pk.pkey_attnum = pa.attnum
                        where
                            attrelid = entity_
                            and attnum > 0
                            and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
                            and (working_selected_columns is null or pa.attname = any(working_selected_columns) or pk.pkey_attnum is not null)
                    )
                )
                -- Add "record" key for insert and update
                || case
                    when action in ('INSERT', 'UPDATE') then
                        jsonb_build_object(
                            'record',
                            (
                                select
                                    jsonb_object_agg(
                                        -- if unchanged toast, get column name and value from old record
                                        coalesce((c).name, (oc).name),
                                        case
                                            when (c).name is null then (oc).value
                                            else (c).value
                                        end
                                    )
                                from
                                    unnest(columns) c
                                    full outer join unnest(old_columns) oc
                                        on (c).name = (oc).name
                                where
                                    coalesce((c).is_selectable, (oc).is_selectable)
                                    and (working_selected_columns is null or coalesce((c).name, (oc).name) = any(working_selected_columns) or coalesce((c).is_pkey, (oc).is_pkey))
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            )
                        )
                    else '{}'::jsonb
                end
                -- Add "old_record" key for update and delete
                || case
                    when action = 'UPDATE' then
                        jsonb_build_object(
                                'old_record',
                                (
                                    select jsonb_object_agg((c).name, (c).value)
                                    from unnest(old_columns) c
                                    where
                                        (c).is_selectable
                                        and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                        and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                )
                            )
                    when action = 'DELETE' then
                        jsonb_build_object(
                            'old_record',
                            (
                                select jsonb_object_agg((c).name, (c).value)
                                from unnest(old_columns) c
                                where
                                    (c).is_selectable
                                    and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                    and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                            )
                        )
                    else '{}'::jsonb
                end;

                -- Filter visible_role_sub_ids to those matching the current selected_columns group
                visible_to_subscription_ids = coalesce(
                    (
                        select array_agg(s.subscription_id)
                        from unnest(subscriptions) s
                        where s.claims_role = working_role
                          and (s.selected_columns is not distinct from working_selected_columns)
                          and s.subscription_id = any(visible_role_sub_ids)
                    ),
                    '{}'::uuid[]
                );

                return next (
                    output,
                    is_rls_enabled,
                    visible_to_subscription_ids,
                    case
                        when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                        else '{}'
                    end
                )::realtime.wal_rls;
            end loop;

        end if;
    end loop;

    perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) OWNER TO supabase_realtime_admin;

--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) OWNER TO supabase_realtime_admin;

--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) OWNER TO supabase_realtime_admin;

--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


ALTER FUNCTION realtime."cast"(val text, type_ regtype) OWNER TO supabase_realtime_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
/*
Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
*/
declare
    op_symbol text = (
        case
            when op = 'eq' then '='
            when op = 'neq' then '!='
            when op = 'lt' then '<'
            when op = 'lte' then '<='
            when op = 'gt' then '>'
            when op = 'gte' then '>='
            when op = 'in' then '= any'
            else 'UNKNOWN OP'
        end
    );
    res boolean;
begin
    execute format(
        'select %L::'|| type_::text || ' ' || op_symbol
        || ' ( %L::'
        || (
            case
                when op = 'in' then type_::text || '[]'
                else type_::text end
        )
        || ')', val_1, val_2) into res;
    return res;
end;
$$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) OWNER TO supabase_realtime_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
declare
    op_symbol text;
    res boolean;
begin
    -- IS DISTINCT FROM / IS NOT DISTINCT FROM: infix, both sides typed literals
    if op = 'isdistinct' then
        execute format(
            'select %L::%s %s %L::%s',
            val_1,
            type_::text,
            case when negate then 'IS NOT DISTINCT FROM' else 'IS DISTINCT FROM' end,
            val_2,
            type_::text
        ) into res;
        return res;
    end if;

    -- IS requires a keyword RHS (NULL, TRUE, FALSE, UNKNOWN), not a typed literal
    if op = 'is' then
        if val_2 not in ('null', 'true', 'false', 'unknown') then
            raise exception 'invalid value for is filter: must be null, true, false, or unknown';
        end if;
        execute format(
            'select %L::%s %s %s',
            val_1,
            type_::text,
            case when negate then 'IS NOT' else 'IS' end,
            upper(val_2)
        ) into res;
        return res;
    end if;

    op_symbol = case
        when op = 'eq'    then '='
        when op = 'neq'   then '!='
        when op = 'lt'    then '<'
        when op = 'lte'   then '<='
        when op = 'gt'    then '>'
        when op = 'gte'   then '>='
        when op = 'in'    then '= any'
        when op = 'like'   then 'LIKE'
        when op = 'ilike'  then 'ILIKE'
        when op = 'match'  then '~'
        when op = 'imatch' then '~*'
        else null
    end;

    if op_symbol is null then
        raise exception 'unsupported equality operator: %', op::text;
    end if;

    execute format(
        'select %L::%s %s (%L::%s)',
        val_1,
        type_::text,
        op_symbol,
        val_2,
        case when op = 'in' then type_::text || '[]' else type_::text end
    ) into res;

    return case when negate then not res else res end;
end;
$$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) OWNER TO supabase_realtime_admin;

--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
    select
        filters is null
        or array_length(filters, 1) is null
        or coalesce(
            count(col.name) = count(1)
            and sum(
                realtime.check_equality_op(
                    op:=f.op,
                    type_:=coalesce(col.type_oid::regtype, col.type_name::regtype),
                    val_1:=col.value #>> '{}',
                    val_2:=f.value,
                    negate:=coalesce(f.negate, false)
                )::int
            ) filter (where col.name is not null) = count(col.name),
            false
        )
    from
        unnest(filters) f
        left join unnest(columns) col
            on f.column_name = col.name;
$$;


ALTER FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) OWNER TO supabase_realtime_admin;

--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


ALTER FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) OWNER TO supabase_realtime_admin;

--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  SELECT
    realtime.wal2json_escape_identifier(nsp.nspname::text)
    || '.'
    || realtime.wal2json_escape_identifier(pc.relname::text)
  FROM pg_class pc
  JOIN pg_namespace nsp ON pc.relnamespace = nsp.oid
  WHERE pc.oid = entity
$$;


ALTER FUNCTION realtime.quote_wal2json(entity regclass) OWNER TO supabase_realtime_admin;

--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) OWNER TO supabase_realtime_admin;

--
-- Name: send_binary(bytea, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, binary_payload, event, topic, private, extension)
    VALUES (generated_id, payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean) OWNER TO supabase_realtime_admin;

--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    col_names text[] = coalesce(
            array_agg(a.attname order by a.attnum),
            '{}'::text[]
        )
        from
            pg_catalog.pg_attribute a
        where
            a.attrelid = new.entity
            and a.attnum > 0
            and not a.attisdropped
            and pg_catalog.has_column_privilege(
                (new.claims ->> 'role'),
                a.attrelid,
                a.attnum,
                'SELECT'
            );
    filter realtime.user_defined_filter;
    col_type regtype;
    in_val jsonb;
    selected_col text;
begin
    for filter in select * from unnest(new.filters) loop
        if not filter.column_name = any(col_names) then
            raise exception 'invalid column for filter %', filter.column_name;
        end if;

        col_type = (
            select atttypid::regtype
            from pg_catalog.pg_attribute
            where attrelid = new.entity
                  and attname = filter.column_name
        );
        if col_type is null then
            raise exception 'failed to lookup type for column %', filter.column_name;
        end if;

        if filter.op = 'in'::realtime.equality_op then
            in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
            if coalesce(jsonb_array_length(in_val), 0) > 100 then
                raise exception 'too many values for `in` filter. Maximum 100';
            end if;
        elsif filter.op = 'is'::realtime.equality_op then
            -- `is` requires a keyword RHS rather than a typed literal
            if filter.value not in ('null', 'true', 'false', 'unknown') then
                raise exception 'invalid value for is filter: must be null, true, false, or unknown';
            end if;
            -- IS NULL works for any type, but IS TRUE/FALSE/UNKNOWN require a boolean
            -- operand. Reject the non-null keywords on non-boolean columns here so they
            -- don't abort apply_rls at WAL time.
            if filter.value <> 'null' and col_type <> 'boolean'::regtype then
                raise exception 'is % filter requires a boolean column, got %', filter.value, col_type::text;
            end if;
        elsif filter.op in ('like'::realtime.equality_op, 'ilike'::realtime.equality_op) then
            -- like/ilike apply the text pattern operator (~~); reject column types that
            -- have no such operator instead of failing at WAL time
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = '~~' and oprleft = col_type
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
        elsif filter.op in ('match'::realtime.equality_op, 'imatch'::realtime.equality_op) then
            -- match/imatch apply the regex operators ~ / ~*; reject column types that have
            -- no such operator (e.g. integer) instead of failing at WAL time, mirroring the
            -- like/ilike guard above.
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = case when filter.op = 'imatch'::realtime.equality_op then '~*' else '~' end
                  and oprleft = col_type
                  and oprright = col_type
                  and oprresult = 'boolean'::regtype
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
            -- validate the regex eagerly so a bad pattern is rejected here, not inside
            -- apply_rls where it would abort the WAL stream for the entity
            begin
                perform '' ~ filter.value;
            exception when others then
                raise exception 'invalid regular expression for % filter: %', filter.op::text, sqlerrm;
            end;
        else
            -- eq/neq/lt/lte/gt/gte: value must be coercable to the type
            perform realtime.cast(filter.value, col_type);
        end if;
    end loop;

    if new.selected_columns is not null then
        for selected_col in select * from unnest(new.selected_columns) loop
            if not selected_col = any(col_names) then
                raise exception 'invalid column for select %', selected_col;
            end if;
        end loop;
    end if;

    -- Apply consistent order to filters so the unique constraint can't be tricked by a
    -- different filter order. negate is part of the sort key.
    new.filters = coalesce(
        array_agg(f order by f.column_name, f.op, f.value, f.negate),
        '{}'
    ) from unnest(new.filters) f;

    new.selected_columns = (
        select array_agg(c order by c)
        from unnest(new.selected_columns) c
    );

    return new;
end;
$$;


ALTER FUNCTION realtime.subscription_check_filters() OWNER TO supabase_realtime_admin;

--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


ALTER FUNCTION realtime.to_regrole(role_name text) OWNER TO supabase_realtime_admin;

--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


ALTER FUNCTION realtime.topic() OWNER TO supabase_realtime_admin;

--
-- Name: wal2json_escape_identifier(text); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.wal2json_escape_identifier(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  -- Prefix `\`, `,`, `.`, and any whitespace with `\`
  SELECT regexp_replace(name, '([\\,.[:space:]])', '\\\1', 'g')
$$;


ALTER FUNCTION realtime.wal2json_escape_identifier(name text) OWNER TO supabase_realtime_admin;

--
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


ALTER FUNCTION storage.allow_any_operation(expected_operations text[]) OWNER TO supabase_storage_admin;

--
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


ALTER FUNCTION storage.allow_only_operation(expected_operation text) OWNER TO supabase_storage_admin;

--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO supabase_storage_admin;

--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION storage.enforce_bucket_name_length() OWNER TO supabase_storage_admin;

--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION storage.extension(name text) OWNER TO supabase_storage_admin;

--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION storage.filename(name text) OWNER TO supabase_storage_admin;

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


ALTER FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) OWNER TO supabase_storage_admin;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION storage.get_size_by_bucket() OWNER TO supabase_storage_admin;

--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) OWNER TO supabase_storage_admin;

--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text) OWNER TO supabase_storage_admin;

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION storage.operation() OWNER TO supabase_storage_admin;

--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.protect_delete() OWNER TO supabase_storage_admin;

--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


ALTER FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


ALTER FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO supabase_storage_admin;

--
-- Name: is_conversation_member(text); Type: FUNCTION; Schema: synaura_private; Owner: postgres
--

CREATE FUNCTION synaura_private.is_conversation_member(target_conversation_id text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.conversation_participants participant
      where participant.conversation_id = target_conversation_id
        and participant.user_id = (select auth.uid())
    );
$$;


ALTER FUNCTION synaura_private.is_conversation_member(target_conversation_id text) OWNER TO postgres;

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_claims_allowlist text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


ALTER TABLE auth.custom_oauth_providers OWNER TO supabase_auth_admin;

--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


ALTER TABLE auth.oauth_authorizations OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE auth.oauth_client_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


ALTER TABLE auth.oauth_consents OWNER TO supabase_auth_admin;

--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


ALTER TABLE auth.webauthn_challenges OWNER TO supabase_auth_admin;

--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


ALTER TABLE auth.webauthn_credentials OWNER TO supabase_auth_admin;

--
-- Name: account_private; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_private (
    user_id uuid NOT NULL,
    email text,
    first_name text,
    last_name text,
    birth_date date,
    birthday_visibility text DEFAULT 'private'::text NOT NULL,
    discoverable_by_email boolean DEFAULT false NOT NULL,
    discoverable_by_phone boolean DEFAULT false NOT NULL,
    mfa_enabled boolean DEFAULT false NOT NULL,
    profile_completed_at timestamp with time zone,
    terms_version text,
    terms_accepted_at timestamp with time zone,
    privacy_version text,
    privacy_accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_private_birthday_visibility_check CHECK ((birthday_visibility = ANY (ARRAY['private'::text, 'friends'::text, 'public'::text]))),
    CONSTRAINT account_private_first_name_length CHECK (((first_name IS NULL) OR ((char_length(first_name) >= 1) AND (char_length(first_name) <= 80)))),
    CONSTRAINT account_private_last_name_length CHECK (((last_name IS NULL) OR ((char_length(last_name) >= 1) AND (char_length(last_name) <= 80))))
);


ALTER TABLE public.account_private OWNER TO postgres;

--
-- Name: active_artist_boosts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.active_artist_boosts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    artist_id uuid NOT NULL,
    user_id uuid,
    booster_id uuid NOT NULL,
    multiplier numeric NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    source text DEFAULT 'booster'::text NOT NULL,
    CONSTRAINT active_artist_boosts_multiplier_check CHECK ((multiplier >= 1.0))
);


ALTER TABLE public.active_artist_boosts OWNER TO postgres;

--
-- Name: active_track_boosts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.active_track_boosts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    track_id text NOT NULL,
    user_id uuid,
    booster_id uuid NOT NULL,
    multiplier numeric NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    source text DEFAULT 'booster'::text NOT NULL,
    CONSTRAINT active_track_boosts_multiplier_check CHECK ((multiplier >= 1.0))
);


ALTER TABLE public.active_track_boosts OWNER TO postgres;

--
-- Name: admin_broadcasts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_broadcasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    category text DEFAULT 'announcement'::text,
    target text DEFAULT 'all'::text,
    target_data jsonb DEFAULT '{}'::jsonb,
    sent_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.admin_broadcasts OWNER TO postgres;

--
-- Name: ai_credit_balances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_credit_balances (
    user_id uuid NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_credit_balances OWNER TO postgres;

--
-- Name: ai_generations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_generations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prompt text NOT NULL,
    model character varying(50) DEFAULT 'audiocraft'::character varying NOT NULL,
    style character varying(50),
    quality character varying(20) DEFAULT '256kbps'::character varying,
    status character varying(20) DEFAULT 'pending'::character varying,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    task_id character varying(255),
    is_favorite boolean DEFAULT false,
    is_public boolean DEFAULT false,
    play_count integer DEFAULT 0,
    like_count integer DEFAULT 0,
    share_count integer DEFAULT 0,
    is_trashed boolean DEFAULT false
);


ALTER TABLE public.ai_generations OWNER TO postgres;

--
-- Name: TABLE ai_generations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ai_generations IS 'Générations IA des utilisateurs';


--
-- Name: ai_playlist_tracks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_playlist_tracks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    playlist_id uuid,
    track_id uuid,
    added_at timestamp with time zone DEFAULT now(),
    "position" integer DEFAULT 0
);


ALTER TABLE public.ai_playlist_tracks OWNER TO postgres;

--
-- Name: ai_playlists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_playlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name character varying(255) NOT NULL,
    description text,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ai_playlists OWNER TO postgres;

--
-- Name: TABLE ai_playlists; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ai_playlists IS 'Playlists de musiques IA';


--
-- Name: ai_track_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_track_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    track_id uuid,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ai_track_likes OWNER TO postgres;

--
-- Name: ai_tracks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_tracks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    generation_id uuid,
    suno_id character varying(255),
    title character varying(255),
    audio_url text,
    stream_audio_url text,
    image_url text,
    duration integer,
    prompt text,
    model_name character varying(50),
    tags text[],
    created_at timestamp with time zone DEFAULT now(),
    is_favorite boolean DEFAULT false,
    play_count integer DEFAULT 0,
    like_count integer DEFAULT 0,
    lyrics text,
    style text,
    source_links jsonb,
    album_id uuid,
    track_number integer,
    is_public boolean,
    allow_clips boolean DEFAULT false NOT NULL,
    allow_audio_remix boolean DEFAULT false NOT NULL,
    allow_ai_variation boolean DEFAULT false NOT NULL,
    remix_approval_required boolean DEFAULT false NOT NULL,
    remix_visibility text DEFAULT 'disabled'::text NOT NULL,
    CONSTRAINT ai_tracks_remix_visibility_check CHECK ((remix_visibility = ANY (ARRAY['everyone'::text, 'followers'::text, 'disabled'::text])))
);


ALTER TABLE public.ai_tracks OWNER TO postgres;

--
-- Name: TABLE ai_tracks; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ai_tracks IS 'Tracks individuelles générées par IA';


--
-- Name: ai_usage_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_usage_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    date date DEFAULT CURRENT_DATE,
    generations_count integer DEFAULT 0,
    total_duration integer DEFAULT 0,
    favorite_count integer DEFAULT 0,
    share_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ai_usage_stats OWNER TO postgres;

--
-- Name: TABLE ai_usage_stats; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ai_usage_stats IS 'Statistiques d''utilisation IA';


--
-- Name: boosters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.boosters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    type text NOT NULL,
    rarity text NOT NULL,
    multiplier numeric NOT NULL,
    duration_hours integer NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT boosters_duration_hours_check CHECK ((duration_hours > 0)),
    CONSTRAINT boosters_multiplier_check CHECK ((multiplier >= 1.0)),
    CONSTRAINT boosters_rarity_check CHECK ((rarity = ANY (ARRAY['common'::text, 'rare'::text, 'epic'::text, 'legendary'::text]))),
    CONSTRAINT boosters_type_check CHECK ((type = ANY (ARRAY['track'::text, 'artist'::text])))
);


ALTER TABLE public.boosters OWNER TO postgres;

--
-- Name: challenge_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.challenge_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    challenge_id text NOT NULL,
    user_id uuid NOT NULL,
    content_type text NOT NULL,
    content_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT challenge_entries_content_type_check CHECK ((content_type = ANY (ARRAY['clip'::text, 'variation'::text, 'track'::text])))
);


ALTER TABLE public.challenge_entries OWNER TO postgres;

--
-- Name: city_event_participations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.city_event_participations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id text NOT NULL,
    user_id uuid NOT NULL,
    track_id text NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT city_event_participations_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'accepted'::text, 'rejected'::text, 'winner'::text])))
);


ALTER TABLE public.city_event_participations OWNER TO postgres;

--
-- Name: city_event_tracks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.city_event_tracks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id text NOT NULL,
    track_id text NOT NULL,
    creator_id uuid,
    slot integer DEFAULT 0 NOT NULL,
    source text DEFAULT 'algorithmic'::text NOT NULL,
    score numeric,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT city_event_tracks_source_check CHECK ((source = ANY (ARRAY['algorithmic'::text, 'curated'::text, 'submission'::text, 'winner'::text])))
);


ALTER TABLE public.city_event_tracks OWNER TO postgres;

--
-- Name: city_event_votes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.city_event_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id text NOT NULL,
    track_id text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.city_event_votes OWNER TO postgres;

--
-- Name: city_event_winners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.city_event_winners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id text NOT NULL,
    track_id text NOT NULL,
    user_id uuid,
    rank integer DEFAULT 1 NOT NULL,
    reason text,
    showcase_until timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    resolved_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT city_event_winners_rank_check CHECK ((rank > 0))
);


ALTER TABLE public.city_event_winners OWNER TO postgres;

--
-- Name: city_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.city_events (
    id text NOT NULL,
    kind text NOT NULL,
    title text NOT NULL,
    subtitle text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    icon text DEFAULT 'sparkles'::text NOT NULL,
    accent text DEFAULT '#7357C6'::text NOT NULL,
    week_key text NOT NULL,
    day_key text,
    status text DEFAULT 'scheduled'::text NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    challenge_tag text,
    theme text,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    reward jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT city_events_kind_check CHECK ((kind = ANY (ARRAY['friday_drop'::text, 'challenge'::text, 'battle'::text, 'seasonal'::text]))),
    CONSTRAINT city_events_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'live'::text, 'ended'::text, 'resolved'::text, 'archived'::text])))
);


ALTER TABLE public.city_events OWNER TO postgres;

--
-- Name: city_user_rewards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.city_user_rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id text NOT NULL,
    user_id uuid NOT NULL,
    reward_key text NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    claimed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT city_user_rewards_status_check CHECK ((status = ANY (ARRAY['available'::text, 'claimed'::text, 'expired'::text])))
);


ALTER TABLE public.city_user_rewards OWNER TO postgres;

--
-- Name: comment_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comment_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.comment_likes OWNER TO postgres;

--
-- Name: comment_moderation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comment_moderation (
    comment_id uuid NOT NULL,
    track_id text NOT NULL,
    creator_id uuid NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    deletion_reason text,
    is_filtered boolean DEFAULT false NOT NULL,
    filtered_at timestamp with time zone,
    filter_reason text,
    is_creator_favorite boolean DEFAULT false NOT NULL,
    creator_favorite_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comment_moderation OWNER TO postgres;

--
-- Name: comment_reactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comment_reactions (
    id integer NOT NULL,
    comment_id text,
    user_id uuid,
    reaction_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.comment_reactions OWNER TO postgres;

--
-- Name: comment_reactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.comment_reactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.comment_reactions_id_seq OWNER TO postgres;

--
-- Name: comment_reactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.comment_reactions_id_seq OWNED BY public.comment_reactions.id;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    track_id text NOT NULL,
    user_id uuid NOT NULL,
    text text DEFAULT ''::text NOT NULL,
    likes_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    content text NOT NULL,
    parent_id uuid,
    timestamp_seconds numeric,
    CONSTRAINT comments_timestamp_seconds_check CHECK (((timestamp_seconds IS NULL) OR (timestamp_seconds >= (0)::numeric)))
);


ALTER TABLE public.comments OWNER TO postgres;

--
-- Name: conversation_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversation_participants (
    id integer NOT NULL,
    conversation_id text,
    user_id uuid,
    joined_at timestamp with time zone DEFAULT now(),
    last_read_at timestamp with time zone,
    archived_at timestamp with time zone,
    muted_until timestamp with time zone,
    role text DEFAULT 'member'::text NOT NULL,
    nickname text,
    theme_key text DEFAULT 'aura'::text NOT NULL,
    accent_color text DEFAULT '#7357C6'::text NOT NULL,
    background_key text DEFAULT 'quiet'::text NOT NULL,
    wallpaper_url text,
    bubble_enabled boolean DEFAULT false NOT NULL,
    last_delivered_at timestamp with time zone,
    CONSTRAINT conversation_participants_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'moderator'::text, 'member'::text])))
);

ALTER TABLE ONLY public.conversation_participants REPLICA IDENTITY FULL;


ALTER TABLE public.conversation_participants OWNER TO postgres;

--
-- Name: conversation_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conversation_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversation_participants_id_seq OWNER TO postgres;

--
-- Name: conversation_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conversation_participants_id_seq OWNED BY public.conversation_participants.id;


--
-- Name: conversation_realtime_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversation_realtime_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id text NOT NULL,
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:00:45'::interval) NOT NULL,
    CONSTRAINT conversation_realtime_event_payload_size CHECK ((octet_length((payload)::text) <= 2048)),
    CONSTRAINT conversation_realtime_events_event_type_check CHECK ((event_type = ANY (ARRAY['typing'::text, 'recording'::text, 'presence'::text])))
);


ALTER TABLE public.conversation_realtime_events OWNER TO postgres;

--
-- Name: conversation_rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversation_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id text NOT NULL,
    name text NOT NULL,
    room_type text DEFAULT 'text'::text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT conversation_rooms_room_type_check CHECK ((room_type = ANY (ARRAY['text'::text, 'voice_notes'::text])))
);

ALTER TABLE ONLY public.conversation_rooms REPLICA IDENTITY FULL;


ALTER TABLE public.conversation_rooms OWNER TO postgres;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id text NOT NULL,
    name text,
    is_group boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    direct_key text,
    last_message_at timestamp with time zone,
    last_message_id text,
    is_active boolean DEFAULT true NOT NULL,
    description text,
    avatar_url text,
    owner_id uuid
);

ALTER TABLE ONLY public.conversations REPLICA IDENTITY FULL;


ALTER TABLE public.conversations OWNER TO postgres;

--
-- Name: creator_comment_filters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.creator_comment_filters (
    id bigint NOT NULL,
    creator_id uuid NOT NULL,
    word text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.creator_comment_filters OWNER TO postgres;

--
-- Name: creator_comment_filters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.creator_comment_filters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.creator_comment_filters_id_seq OWNER TO postgres;

--
-- Name: creator_comment_filters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.creator_comment_filters_id_seq OWNED BY public.creator_comment_filters.id;


--
-- Name: creator_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.creator_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    post_type text NOT NULL,
    content text,
    image_url text,
    track_id text,
    likes_count integer DEFAULT 0,
    comments_count integer DEFAULT 0,
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    original_post_id uuid,
    include_original_track boolean DEFAULT true,
    CONSTRAINT creator_posts_post_type_check CHECK ((post_type = ANY (ARRAY['text'::text, 'photo'::text, 'track_share'::text, 'repost'::text])))
);


ALTER TABLE public.creator_posts OWNER TO postgres;

--
-- Name: credit_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.credit_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    delta integer NOT NULL,
    balance_after integer NOT NULL,
    source text NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.credit_ledger OWNER TO postgres;

--
-- Name: editorial_collections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.editorial_collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    playlist_id text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    subtitle text,
    description text,
    kind text DEFAULT 'collection'::text NOT NULL,
    banner_url text,
    cover_url text,
    theme_colors jsonb DEFAULT '["#7357C6", "#4A9EAA", "#D96D63"]'::jsonb NOT NULL,
    badge text DEFAULT 'Synaura Originals'::text NOT NULL,
    is_featured boolean DEFAULT true NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    download_enabled boolean DEFAULT true NOT NULL,
    comments_enabled boolean DEFAULT true NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.editorial_collections OWNER TO postgres;

--
-- Name: faq_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faq_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question character varying(500) NOT NULL,
    answer text NOT NULL,
    category character varying(50) NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    views_count integer DEFAULT 0,
    helpful_count integer DEFAULT 0,
    not_helpful_count integer DEFAULT 0,
    is_published boolean DEFAULT true,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT faq_items_category_check CHECK (((category)::text = ANY (ARRAY[('general'::character varying)::text, ('player'::character varying)::text, ('upload'::character varying)::text, ('abonnement'::character varying)::text, ('ia'::character varying)::text, ('technique'::character varying)::text])))
);


ALTER TABLE public.faq_items OWNER TO postgres;

--
-- Name: faq_votes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faq_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    faq_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_helpful boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.faq_votes OWNER TO postgres;

--
-- Name: follow_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.follow_requests (
    id integer NOT NULL,
    requester_id uuid,
    target_id uuid,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.follow_requests OWNER TO postgres;

--
-- Name: follow_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.follow_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.follow_requests_id_seq OWNER TO postgres;

--
-- Name: follow_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.follow_requests_id_seq OWNED BY public.follow_requests.id;


--
-- Name: forum_post_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.forum_post_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.forum_post_likes OWNER TO postgres;

--
-- Name: forum_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.forum_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    category character varying(50) NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    likes_count integer DEFAULT 0,
    replies_count integer DEFAULT 0,
    views_count integer DEFAULT 0,
    is_pinned boolean DEFAULT false,
    is_locked boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT forum_posts_category_check CHECK (((category)::text = ANY (ARRAY[('question'::character varying)::text, ('suggestion'::character varying)::text, ('bug'::character varying)::text, ('general'::character varying)::text])))
);


ALTER TABLE public.forum_posts OWNER TO postgres;

--
-- Name: forum_replies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.forum_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    likes_count integer DEFAULT 0,
    is_solution boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.forum_replies OWNER TO postgres;

--
-- Name: forum_reply_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.forum_reply_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reply_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.forum_reply_likes OWNER TO postgres;

--
-- Name: friendships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.friendships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    friend_id uuid NOT NULL,
    source_request_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT friendships_distinct_users CHECK ((user_id <> friend_id))
);

ALTER TABLE ONLY public.friendships REPLICA IDENTITY FULL;


ALTER TABLE public.friendships OWNER TO postgres;

--
-- Name: message_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id text NOT NULL,
    conversation_id text NOT NULL,
    attachment_type text NOT NULL,
    url text NOT NULL,
    preview_url text,
    mime_type text,
    file_name text,
    size_bytes bigint,
    width integer,
    height integer,
    duration_ms integer,
    waveform jsonb DEFAULT '[]'::jsonb NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_attachments_attachment_type_check CHECK ((attachment_type = ANY (ARRAY['image'::text, 'video'::text, 'audio'::text, 'file'::text]))),
    CONSTRAINT message_attachments_duration_positive CHECK (((duration_ms IS NULL) OR (duration_ms >= 0))),
    CONSTRAINT message_attachments_position_positive CHECK (("position" >= 0)),
    CONSTRAINT message_attachments_size_positive CHECK (((size_bytes IS NULL) OR (size_bytes >= 0)))
);

ALTER TABLE ONLY public.message_attachments REPLICA IDENTITY FULL;


ALTER TABLE public.message_attachments OWNER TO postgres;

--
-- Name: message_hidden_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_hidden_users (
    message_id text NOT NULL,
    user_id uuid NOT NULL,
    hidden_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.message_hidden_users OWNER TO postgres;

--
-- Name: message_pins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_pins (
    conversation_id text NOT NULL,
    message_id text NOT NULL,
    pinned_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.message_pins REPLICA IDENTITY FULL;


ALTER TABLE public.message_pins OWNER TO postgres;

--
-- Name: message_reactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id text NOT NULL,
    user_id uuid NOT NULL,
    reaction text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    conversation_id text NOT NULL,
    CONSTRAINT message_reactions_reaction_check CHECK ((reaction = ANY (ARRAY['heart'::text, 'fire'::text, 'wow'::text, 'support'::text, 'laugh'::text])))
);

ALTER TABLE ONLY public.message_reactions REPLICA IDENTITY FULL;


ALTER TABLE public.message_reactions OWNER TO postgres;

--
-- Name: message_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requester_id uuid NOT NULL,
    target_id uuid NOT NULL,
    message text,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    CONSTRAINT message_requests_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('accepted'::character varying)::text, ('rejected'::character varying)::text, ('cancelled'::character varying)::text])))
);

ALTER TABLE ONLY public.message_requests REPLICA IDENTITY FULL;


ALTER TABLE public.message_requests OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id text NOT NULL,
    content text NOT NULL,
    sender_id uuid,
    conversation_id text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    message_type text DEFAULT 'text'::text NOT NULL,
    media_url text,
    shared_entity_type text,
    shared_entity_id text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    reply_to_id text,
    deleted_at timestamp with time zone,
    room_id uuid,
    client_id text,
    edited_at timestamp with time zone
);

ALTER TABLE ONLY public.messages REPLICA IDENTITY FULL;


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: meteo_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meteo_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text,
    severity text DEFAULT 'info'::text NOT NULL,
    regions text[] DEFAULT '{}'::text[],
    sent_by uuid,
    sent_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    CONSTRAINT meteo_alerts_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'danger'::text, 'critical'::text])))
);


ALTER TABLE public.meteo_alerts OWNER TO postgres;

--
-- Name: meteo_bulletins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meteo_bulletins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text,
    content text,
    image_url text NOT NULL,
    image_public_id text NOT NULL,
    author_id uuid NOT NULL,
    is_current boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'published'::text,
    scheduled_at timestamp with time zone,
    author_name text,
    category text DEFAULT 'prevision'::text,
    tags text[] DEFAULT '{}'::text[],
    allow_comments boolean DEFAULT true,
    share_count integer DEFAULT 0,
    views_count integer DEFAULT 0,
    pinned boolean DEFAULT false,
    CONSTRAINT meteo_bulletins_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'scheduled'::text])))
);


ALTER TABLE public.meteo_bulletins OWNER TO postgres;

--
-- Name: meteo_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meteo_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bulletin_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    parent_id uuid,
    is_hidden boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.meteo_comments OWNER TO postgres;

--
-- Name: meteo_reactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meteo_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bulletin_id uuid NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT meteo_reactions_type_check CHECK ((type = ANY (ARRAY['like'::text, 'useful'::text, 'share'::text])))
);


ALTER TABLE public.meteo_reactions OWNER TO postgres;

--
-- Name: meteo_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meteo_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text DEFAULT 'false'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


ALTER TABLE public.meteo_settings OWNER TO postgres;

--
-- Name: meteo_team_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meteo_team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'contributor'::text NOT NULL,
    display_name text,
    invited_by uuid,
    invited_at timestamp with time zone DEFAULT now(),
    accepted_at timestamp with time zone,
    status text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT meteo_team_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'moderator'::text, 'contributor'::text]))),
    CONSTRAINT meteo_team_members_status_check CHECK ((status = ANY (ARRAY['active'::text, 'pending'::text, 'revoked'::text])))
);


ALTER TABLE public.meteo_team_members OWNER TO postgres;

--
-- Name: meteo_views; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meteo_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bulletin_id uuid NOT NULL,
    source text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.meteo_views OWNER TO postgres;

--
-- Name: missions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.missions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    title text NOT NULL,
    goal_type text NOT NULL,
    threshold integer NOT NULL,
    reward_booster_id uuid,
    cooldown_hours integer DEFAULT 0 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT missions_goal_type_check CHECK ((goal_type = ANY (ARRAY['plays'::text, 'likes'::text, 'shares'::text, 'boosts'::text]))),
    CONSTRAINT missions_threshold_check CHECK ((threshold > 0))
);


ALTER TABLE public.missions OWNER TO postgres;

--
-- Name: music_challenges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.music_challenges (
    id text NOT NULL,
    title text NOT NULL,
    prompt text NOT NULL,
    content_type text NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    accent_color text,
    cover_url text,
    source_track_id text,
    source_track_type text,
    club_slug text,
    started_notified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT music_challenges_club_slug_check CHECK ((club_slug = ANY (ARRAY['feedback'::text, 'collab'::text, 'remix'::text, 'ai'::text]))),
    CONSTRAINT music_challenges_content_type_check CHECK ((content_type = ANY (ARRAY['clip'::text, 'variation'::text, 'track'::text, 'open'::text]))),
    CONSTRAINT music_challenges_source_track_type_check CHECK ((source_track_type = ANY (ARRAY['track'::text, 'ai_track'::text])))
);


ALTER TABLE public.music_challenges OWNER TO postgres;

--
-- Name: music_clips; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.music_clips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    video_url text,
    video_public_id text,
    poster_url text,
    caption text,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    source_track_id text NOT NULL,
    source_track_type text DEFAULT 'track'::text NOT NULL,
    source_track_offset_seconds integer DEFAULT 0 NOT NULL,
    source_track_duration_seconds integer DEFAULT 30 NOT NULL,
    visibility text DEFAULT 'draft'::text NOT NULL,
    likes_count integer DEFAULT 0 NOT NULL,
    comments_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT music_clips_comments_check CHECK ((comments_count >= 0)),
    CONSTRAINT music_clips_duration_check CHECK (((source_track_duration_seconds >= 15) AND (source_track_duration_seconds <= 60))),
    CONSTRAINT music_clips_likes_check CHECK ((likes_count >= 0)),
    CONSTRAINT music_clips_offset_check CHECK ((source_track_offset_seconds >= 0)),
    CONSTRAINT music_clips_source_track_type_check CHECK ((source_track_type = ANY (ARRAY['track'::text, 'ai_track'::text]))),
    CONSTRAINT music_clips_visibility_check CHECK ((visibility = ANY (ARRAY['draft'::text, 'published'::text, 'hidden'::text])))
);


ALTER TABLE public.music_clips OWNER TO postgres;

--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    push_enabled boolean DEFAULT true,
    email_enabled boolean DEFAULT false,
    in_app_enabled boolean DEFAULT true,
    new_follower boolean DEFAULT true,
    new_like boolean DEFAULT true,
    like_milestone boolean DEFAULT true,
    new_comment boolean DEFAULT true,
    new_message boolean DEFAULT true,
    new_track_followed boolean DEFAULT true,
    view_milestone boolean DEFAULT true,
    boost_reminder boolean DEFAULT true,
    admin_broadcast boolean DEFAULT true,
    weekly_recap boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notification_preferences OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    category text DEFAULT 'general'::text,
    icon_url text,
    action_url text,
    sender_id uuid,
    related_id text,
    expires_at timestamp with time zone
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: password_resets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_resets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    email text NOT NULL,
    token text NOT NULL,
    code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    ip text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_attempt_at timestamp with time zone
);


ALTER TABLE public.password_resets OWNER TO postgres;

--
-- Name: TABLE password_resets; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.password_resets IS 'Tokens et codes de réinitialisation de mot de passe';


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id text NOT NULL,
    user_id uuid,
    stripe_payment_intent_id text,
    amount integer NOT NULL,
    currency text DEFAULT 'eur'::text,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: play_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.play_stats (
    id integer NOT NULL,
    track_id text,
    user_id uuid,
    played_at timestamp with time zone DEFAULT now(),
    duration_played integer DEFAULT 0,
    ip_address inet,
    user_agent text
);


ALTER TABLE public.play_stats OWNER TO postgres;

--
-- Name: play_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.play_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.play_stats_id_seq OWNER TO postgres;

--
-- Name: play_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.play_stats_id_seq OWNED BY public.play_stats.id;


--
-- Name: playlist_tracks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.playlist_tracks (
    id integer NOT NULL,
    playlist_id text,
    track_id text,
    "position" integer DEFAULT 0,
    added_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.playlist_tracks OWNER TO postgres;

--
-- Name: playlist_tracks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.playlist_tracks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.playlist_tracks_id_seq OWNER TO postgres;

--
-- Name: playlist_tracks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.playlist_tracks_id_seq OWNED BY public.playlist_tracks.id;


--
-- Name: playlists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.playlists (
    id text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    cover_url text,
    creator_id uuid,
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_album boolean DEFAULT false
);


ALTER TABLE public.playlists OWNER TO postgres;

--
-- Name: post_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.post_comments OWNER TO postgres;

--
-- Name: post_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.post_likes OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    name text NOT NULL,
    email text,
    username text NOT NULL,
    avatar text,
    banner text,
    bio text DEFAULT ''::text,
    location text DEFAULT ''::text,
    website text DEFAULT ''::text,
    social_links jsonb DEFAULT '{}'::jsonb,
    is_verified boolean DEFAULT false,
    is_artist boolean DEFAULT false,
    artist_name text DEFAULT ''::text,
    genre text[] DEFAULT '{}'::text[],
    total_plays integer DEFAULT 0,
    total_likes integer DEFAULT 0,
    last_seen timestamp with time zone DEFAULT now(),
    preferences jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    plan text DEFAULT 'free'::text,
    subscription_status text,
    subscription_current_period_end timestamp with time zone,
    is_early_access boolean DEFAULT false,
    early_access_at timestamp with time zone,
    is_waitlisted boolean DEFAULT false,
    early_access boolean DEFAULT false,
    avatar_public_id text,
    banner_public_id text,
    follower_count integer DEFAULT 0,
    following_count integer DEFAULT 0,
    role text DEFAULT 'user'::text NOT NULL,
    referral_code text,
    referred_by uuid
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: COLUMN profiles.early_access; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.early_access IS 'Contrôle l''accès anticipé à l''application (limite: 50 utilisateurs)';


--
-- Name: COLUMN profiles.avatar_public_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.avatar_public_id IS 'Public ID Cloudinary de l''avatar pour suppression automatique';


--
-- Name: COLUMN profiles.banner_public_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.banner_public_id IS 'Public ID Cloudinary de la bannière pour suppression automatique';


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    platform text,
    device_name text,
    app_version text,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    last_error text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.push_subscriptions OWNER TO postgres;

--
-- Name: recommendation_impressions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recommendation_impressions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    session_id text,
    content_type text NOT NULL,
    content_id text NOT NULL,
    source text,
    rank integer,
    score numeric,
    reasons text[],
    CONSTRAINT recommendation_impressions_content_type_check CHECK ((content_type = ANY (ARRAY['track'::text, 'post'::text, 'clip'::text])))
);


ALTER TABLE public.recommendation_impressions OWNER TO postgres;

--
-- Name: referrals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    referred_id uuid NOT NULL,
    referrer_credits_granted integer DEFAULT 50 NOT NULL,
    referred_credits_granted integer DEFAULT 50 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.referrals OWNER TO postgres;

--
-- Name: star_academy_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.star_academy_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    full_name text NOT NULL,
    age integer NOT NULL,
    email text NOT NULL,
    phone text,
    location text NOT NULL,
    tiktok_handle text NOT NULL,
    category text NOT NULL,
    level text,
    link text,
    bio text NOT NULL,
    availability text,
    audio_url text,
    audio_filename text,
    synaura_username text,
    user_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_notes text,
    tracking_token text DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text) NOT NULL,
    notification_sent_at timestamp with time zone,
    CONSTRAINT star_academy_applications_age_check CHECK (((age >= 13) AND (age <= 99))),
    CONSTRAINT star_academy_applications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'accepted'::text, 'rejected'::text])))
);


ALTER TABLE public.star_academy_applications OWNER TO postgres;

--
-- Name: star_academy_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.star_academy_config (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.star_academy_config OWNER TO postgres;

--
-- Name: star_academy_staff_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.star_academy_staff_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    full_name text NOT NULL,
    age integer NOT NULL,
    email text NOT NULL,
    phone text,
    location text NOT NULL,
    role text NOT NULL,
    experience text NOT NULL,
    speciality text,
    tiktok_handle text,
    portfolio_url text,
    motivation text NOT NULL,
    availability text NOT NULL,
    synaura_username text,
    user_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_notes text,
    tracking_token text DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text) NOT NULL,
    notification_sent_at timestamp with time zone,
    CONSTRAINT star_academy_staff_applications_age_check CHECK (((age >= 18) AND (age <= 99))),
    CONSTRAINT star_academy_staff_applications_role_check CHECK ((role = ANY (ARRAY['coach_vocal'::text, 'coach_scenique'::text, 'direction_musicale'::text, 'jury'::text, 'production'::text, 'autre'::text]))),
    CONSTRAINT star_academy_staff_applications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'accepted'::text, 'rejected'::text])))
);


ALTER TABLE public.star_academy_staff_applications OWNER TO postgres;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id text NOT NULL,
    user_id uuid,
    stripe_subscription_id text,
    stripe_customer_id text,
    status text NOT NULL,
    plan_type text NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    url text,
    status text DEFAULT 'open'::text NOT NULL,
    user_id uuid
);


ALTER TABLE public.support_tickets OWNER TO postgres;

--
-- Name: synaura_tv_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.synaura_tv_settings (
    id integer DEFAULT 1 NOT NULL,
    provider text DEFAULT 'manual'::text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    playback_url text,
    rtmp_url text,
    stream_key text,
    mux_live_stream_id text,
    mux_playback_id text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.synaura_tv_settings OWNER TO postgres;

--
-- Name: track_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.track_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    track_id text NOT NULL,
    artist_id uuid,
    user_id uuid,
    session_id text,
    event_type public.track_event_type NOT NULL,
    position_ms integer,
    duration_ms integer,
    progress_pct numeric(5,2),
    source text,
    referrer text,
    platform text,
    country text,
    is_ai_track boolean DEFAULT false NOT NULL,
    extra jsonb
);


ALTER TABLE public.track_events OWNER TO postgres;

--
-- Name: track_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.track_likes (
    id integer NOT NULL,
    track_id text,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.track_likes OWNER TO postgres;

--
-- Name: track_likes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.track_likes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.track_likes_id_seq OWNER TO postgres;

--
-- Name: track_likes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.track_likes_id_seq OWNED BY public.track_likes.id;


--
-- Name: track_moment_reactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.track_moment_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    track_id text NOT NULL,
    user_id uuid NOT NULL,
    reaction_type text NOT NULL,
    timestamp_seconds numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT track_moment_reactions_reaction_type_check CHECK ((reaction_type = ANY (ARRAY['drop'::text, 'emotional'::text, 'mindblown'::text, 'favorite'::text, 'vocals'::text, 'production'::text]))),
    CONSTRAINT track_moment_reactions_timestamp_seconds_check CHECK ((timestamp_seconds >= (0)::numeric))
);


ALTER TABLE public.track_moment_reactions OWNER TO postgres;

--
-- Name: track_remixes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.track_remixes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_track_id text NOT NULL,
    source_track_type text NOT NULL,
    child_track_id text NOT NULL,
    child_track_type text NOT NULL,
    creator_id uuid NOT NULL,
    remix_type text DEFAULT 'ai_variation'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    challenge_id text,
    CONSTRAINT track_remixes_child_track_type_check CHECK ((child_track_type = ANY (ARRAY['track'::text, 'ai_track'::text]))),
    CONSTRAINT track_remixes_remix_type_check CHECK ((remix_type = 'ai_variation'::text)),
    CONSTRAINT track_remixes_source_track_type_check CHECK ((source_track_type = ANY (ARRAY['track'::text, 'ai_track'::text]))),
    CONSTRAINT track_remixes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'published'::text, 'rejected'::text])))
);


ALTER TABLE public.track_remixes OWNER TO postgres;

--
-- Name: track_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.track_stats (
    track_id text NOT NULL,
    likes_count integer DEFAULT 0 NOT NULL,
    views_count bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.track_stats OWNER TO postgres;

--
-- Name: track_stats_daily; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.track_stats_daily AS
 SELECT track_id,
    is_ai_track,
    ((created_at AT TIME ZONE 'UTC'::text))::date AS day,
    count(*) FILTER (WHERE (event_type = 'view'::public.track_event_type)) AS views,
    count(*) FILTER (WHERE (event_type = 'play_start'::public.track_event_type)) AS plays,
    count(*) FILTER (WHERE (event_type = 'play_complete'::public.track_event_type)) AS completes,
    count(*) FILTER (WHERE (event_type = 'like'::public.track_event_type)) AS likes,
    count(*) FILTER (WHERE (event_type = 'share'::public.track_event_type)) AS shares,
    count(*) FILTER (WHERE (event_type = 'favorite'::public.track_event_type)) AS favorites,
    COALESCE(sum(duration_ms) FILTER (WHERE (event_type = ANY (ARRAY['play_start'::public.track_event_type, 'play_progress'::public.track_event_type, 'play_complete'::public.track_event_type]))), (0)::bigint) AS total_listen_ms,
    count(DISTINCT COALESCE((user_id)::text, session_id)) AS unique_listeners,
        CASE
            WHEN (count(*) FILTER (WHERE (event_type = 'play_start'::public.track_event_type)) > 0) THEN round(((100.0 * (count(*) FILTER (WHERE (event_type = 'play_complete'::public.track_event_type)))::numeric) / (NULLIF(count(*) FILTER (WHERE (event_type = 'play_start'::public.track_event_type)), 0))::numeric), 2)
            ELSE (0)::numeric
        END AS retention_complete_rate
   FROM public.track_events
  GROUP BY track_id, is_ai_track, (((created_at AT TIME ZONE 'UTC'::text))::date);


ALTER VIEW public.track_stats_daily OWNER TO postgres;

--
-- Name: track_stats_rolling_30d; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.track_stats_rolling_30d AS
 SELECT track_id,
    is_ai_track,
    (min(created_at))::date AS first_event_date,
    (max(created_at))::date AS last_event_date,
    count(*) FILTER (WHERE (event_type = 'view'::public.track_event_type)) AS views_30d,
    count(*) FILTER (WHERE (event_type = 'play_start'::public.track_event_type)) AS plays_30d,
    count(*) FILTER (WHERE (event_type = 'play_complete'::public.track_event_type)) AS completes_30d,
    count(*) FILTER (WHERE (event_type = 'like'::public.track_event_type)) AS likes_30d,
    count(*) FILTER (WHERE (event_type = 'share'::public.track_event_type)) AS shares_30d,
    count(*) FILTER (WHERE (event_type = 'favorite'::public.track_event_type)) AS favorites_30d,
    COALESCE(sum(duration_ms) FILTER (WHERE (event_type = ANY (ARRAY['play_start'::public.track_event_type, 'play_progress'::public.track_event_type, 'play_complete'::public.track_event_type]))), (0)::bigint) AS listen_ms_30d,
    count(DISTINCT COALESCE((user_id)::text, session_id)) AS unique_listeners_30d,
        CASE
            WHEN (count(*) FILTER (WHERE (event_type = 'play_start'::public.track_event_type)) > 0) THEN round(((100.0 * (count(*) FILTER (WHERE (event_type = 'play_complete'::public.track_event_type)))::numeric) / (NULLIF(count(*) FILTER (WHERE (event_type = 'play_start'::public.track_event_type)), 0))::numeric), 2)
            ELSE (0)::numeric
        END AS retention_complete_rate_30d
   FROM public.track_events
  WHERE (created_at >= (now() - '30 days'::interval))
  GROUP BY track_id, is_ai_track;


ALTER VIEW public.track_stats_rolling_30d OWNER TO postgres;

--
-- Name: track_traffic_sources_30d; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.track_traffic_sources_30d AS
 SELECT track_id,
    source,
    count(*) FILTER (WHERE (event_type = 'view'::public.track_event_type)) AS views,
    count(*) FILTER (WHERE (event_type = 'play_start'::public.track_event_type)) AS plays,
    count(*) FILTER (WHERE (event_type = 'play_complete'::public.track_event_type)) AS completes
   FROM public.track_events
  WHERE (created_at >= (now() - '30 days'::interval))
  GROUP BY track_id, source;


ALTER VIEW public.track_traffic_sources_30d OWNER TO postgres;

--
-- Name: track_views; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.track_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    track_id text,
    viewed_at timestamp with time zone DEFAULT now(),
    viewed_date date DEFAULT CURRENT_DATE,
    ip_address inet,
    user_agent text,
    country text,
    device text,
    ip inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.track_views OWNER TO postgres;

--
-- Name: track_waveforms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.track_waveforms (
    track_id text NOT NULL,
    track_type text DEFAULT 'track'::text NOT NULL,
    duration numeric NOT NULL,
    peaks jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT track_waveforms_duration_check CHECK ((duration > (0)::numeric)),
    CONSTRAINT track_waveforms_track_type_check CHECK ((track_type = ANY (ARRAY['track'::text, 'ai_track'::text])))
);


ALTER TABLE public.track_waveforms OWNER TO postgres;

--
-- Name: tracks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tracks (
    id text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text,
    audio_url text NOT NULL,
    cover_url text,
    duration integer DEFAULT 0,
    genre text[] DEFAULT '{}'::text[],
    creator_id uuid,
    plays integer DEFAULT 0,
    likes integer DEFAULT 0,
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    likes_count integer DEFAULT 0,
    views_count integer DEFAULT 0,
    audio_public_id text,
    cover_public_id text,
    audio_size_mb numeric,
    cover_size_mb numeric,
    featured_banner text,
    is_featured boolean DEFAULT false,
    lyrics text,
    album_id uuid,
    track_number integer,
    album text,
    allow_clips boolean DEFAULT false NOT NULL,
    allow_audio_remix boolean DEFAULT false NOT NULL,
    allow_ai_variation boolean DEFAULT false NOT NULL,
    remix_approval_required boolean DEFAULT false NOT NULL,
    remix_visibility text DEFAULT 'disabled'::text NOT NULL,
    CONSTRAINT tracks_remix_visibility_check CHECK ((remix_visibility = ANY (ARRAY['everyone'::text, 'followers'::text, 'disabled'::text])))
);


ALTER TABLE public.tracks OWNER TO postgres;

--
-- Name: user_blocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blocker_id uuid NOT NULL,
    blocked_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_blocks_distinct_users CHECK ((blocker_id <> blocked_id))
);

ALTER TABLE ONLY public.user_blocks REPLICA IDENTITY FULL;


ALTER TABLE public.user_blocks OWNER TO postgres;

--
-- Name: user_booster_daily; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_booster_daily (
    user_id uuid NOT NULL,
    last_opened_at timestamp with time zone,
    streak integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.user_booster_daily OWNER TO postgres;

--
-- Name: user_booster_open_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_booster_open_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    source text DEFAULT 'daily'::text NOT NULL,
    booster_id uuid,
    booster_key text,
    rarity text,
    type text,
    multiplier numeric,
    duration_hours integer
);


ALTER TABLE public.user_booster_open_history OWNER TO postgres;

--
-- Name: user_booster_pack_claims; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_booster_pack_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    pack_key text NOT NULL,
    period_start date NOT NULL,
    claimed_count integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_booster_pack_claims OWNER TO postgres;

--
-- Name: user_booster_pity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_booster_pity (
    user_id uuid NOT NULL,
    opens_since_rare integer DEFAULT 0 NOT NULL,
    opens_since_epic integer DEFAULT 0 NOT NULL,
    opens_since_legendary integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_booster_pity OWNER TO postgres;

--
-- Name: user_boosters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_boosters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    booster_id uuid NOT NULL,
    status text DEFAULT 'owned'::text NOT NULL,
    obtained_at timestamp with time zone DEFAULT now() NOT NULL,
    used_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT user_boosters_status_check CHECK ((status = ANY (ARRAY['owned'::text, 'used'::text])))
);


ALTER TABLE public.user_boosters OWNER TO postgres;

--
-- Name: user_daily_spin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_daily_spin (
    user_id uuid NOT NULL,
    last_spun_at timestamp with time zone,
    streak integer DEFAULT 0 NOT NULL,
    CONSTRAINT user_daily_spin_streak_check CHECK ((streak >= 0))
);


ALTER TABLE public.user_daily_spin OWNER TO postgres;

--
-- Name: user_daily_spin_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_daily_spin_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    spun_at timestamp with time zone DEFAULT now() NOT NULL,
    result_key text NOT NULL,
    reward_type text NOT NULL,
    reward_payload jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.user_daily_spin_history OWNER TO postgres;

--
-- Name: user_follows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_follows (
    id integer NOT NULL,
    follower_id uuid,
    following_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_follows OWNER TO postgres;

--
-- Name: user_follows_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_follows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_follows_id_seq OWNER TO postgres;

--
-- Name: user_follows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_follows_id_seq OWNED BY public.user_follows.id;


--
-- Name: user_missions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_missions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    mission_id uuid NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone,
    last_progress_at timestamp with time zone,
    claimed boolean DEFAULT false NOT NULL
);


ALTER TABLE public.user_missions OWNER TO postgres;

--
-- Name: user_quotas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_quotas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    plan_type character varying(50) DEFAULT 'free'::character varying,
    monthly_limit integer DEFAULT 5,
    used_this_month integer DEFAULT 0,
    reset_date date DEFAULT (date_trunc('month'::text, now()) + '1 mon -1 days'::interval),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_quotas OWNER TO postgres;

--
-- Name: TABLE user_quotas; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_quotas IS 'Quotas mensuels des utilisateurs';


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    subscription_plan character varying(20) DEFAULT 'free'::character varying,
    stripe_customer_id text,
    stripe_subscription_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_subscription_plan_check CHECK (((subscription_plan)::text = ANY (ARRAY[('free'::character varying)::text, ('starter'::character varying)::text, ('creator'::character varying)::text, ('pro'::character varying)::text, ('enterprise'::character varying)::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: waiting_list; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.waiting_list (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'waiting'::text,
    invited_at timestamp with time zone,
    accepted_at timestamp with time zone,
    CONSTRAINT waiting_list_status_check CHECK ((status = ANY (ARRAY['waiting'::text, 'invited'::text, 'accepted'::text])))
);


ALTER TABLE public.waiting_list OWNER TO postgres;

--
-- Name: TABLE waiting_list; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.waiting_list IS 'Liste d''attente pour l''accès anticipé à Synaura';


--
-- Name: COLUMN waiting_list.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.waiting_list.status IS 'Statut: waiting, invited, accepted';


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_07_31; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages_2026_07_31 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


ALTER TABLE realtime.messages_2026_07_31 OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_08_01; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages_2026_08_01 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


ALTER TABLE realtime.messages_2026_08_01 OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_08_02; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages_2026_08_02 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


ALTER TABLE realtime.messages_2026_08_02 OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_08_03; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages_2026_08_03 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


ALTER TABLE realtime.messages_2026_08_03 OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_08_04; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages_2026_08_04 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


ALTER TABLE realtime.messages_2026_08_04 OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_08_05; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages_2026_08_05 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


ALTER TABLE realtime.messages_2026_08_05 OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_08_06; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages_2026_08_06 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


ALTER TABLE realtime.messages_2026_08_06 OWNER TO supabase_realtime_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    selected_columns text[],
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


ALTER TABLE realtime.subscription OWNER TO supabase_realtime_admin;

--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_vectors OWNER TO supabase_storage_admin;

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.vector_indexes OWNER TO supabase_storage_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: postgres
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text,
    created_by text,
    idempotency_key text,
    rollback text[]
);


ALTER TABLE supabase_migrations.schema_migrations OWNER TO postgres;

--
-- Name: messages_2026_07_31; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_07_31 FOR VALUES FROM ('2026-07-31 00:00:00') TO ('2026-08-01 00:00:00');


--
-- Name: messages_2026_08_01; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_08_01 FOR VALUES FROM ('2026-08-01 00:00:00') TO ('2026-08-02 00:00:00');


--
-- Name: messages_2026_08_02; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_08_02 FOR VALUES FROM ('2026-08-02 00:00:00') TO ('2026-08-03 00:00:00');


--
-- Name: messages_2026_08_03; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_08_03 FOR VALUES FROM ('2026-08-03 00:00:00') TO ('2026-08-04 00:00:00');


--
-- Name: messages_2026_08_04; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_08_04 FOR VALUES FROM ('2026-08-04 00:00:00') TO ('2026-08-05 00:00:00');


--
-- Name: messages_2026_08_05; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_08_05 FOR VALUES FROM ('2026-08-05 00:00:00') TO ('2026-08-06 00:00:00');


--
-- Name: messages_2026_08_06; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_08_06 FOR VALUES FROM ('2026-08-06 00:00:00') TO ('2026-08-07 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: comment_reactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_reactions ALTER COLUMN id SET DEFAULT nextval('public.comment_reactions_id_seq'::regclass);


--
-- Name: conversation_participants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants ALTER COLUMN id SET DEFAULT nextval('public.conversation_participants_id_seq'::regclass);


--
-- Name: creator_comment_filters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creator_comment_filters ALTER COLUMN id SET DEFAULT nextval('public.creator_comment_filters_id_seq'::regclass);


--
-- Name: follow_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follow_requests ALTER COLUMN id SET DEFAULT nextval('public.follow_requests_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: play_stats id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.play_stats ALTER COLUMN id SET DEFAULT nextval('public.play_stats_id_seq'::regclass);


--
-- Name: playlist_tracks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.playlist_tracks ALTER COLUMN id SET DEFAULT nextval('public.playlist_tracks_id_seq'::regclass);


--
-- Name: track_likes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_likes ALTER COLUMN id SET DEFAULT nextval('public.track_likes_id_seq'::regclass);


--
-- Name: user_follows id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_follows ALTER COLUMN id SET DEFAULT nextval('public.user_follows_id_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: account_private account_private_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_private
    ADD CONSTRAINT account_private_pkey PRIMARY KEY (user_id);


--
-- Name: active_artist_boosts active_artist_boosts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_artist_boosts
    ADD CONSTRAINT active_artist_boosts_pkey PRIMARY KEY (id);


--
-- Name: active_track_boosts active_track_boosts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_track_boosts
    ADD CONSTRAINT active_track_boosts_pkey PRIMARY KEY (id);


--
-- Name: admin_broadcasts admin_broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_broadcasts
    ADD CONSTRAINT admin_broadcasts_pkey PRIMARY KEY (id);


--
-- Name: ai_credit_balances ai_credit_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_credit_balances
    ADD CONSTRAINT ai_credit_balances_pkey PRIMARY KEY (user_id);


--
-- Name: ai_generations ai_generations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_generations
    ADD CONSTRAINT ai_generations_pkey PRIMARY KEY (id);


--
-- Name: ai_playlist_tracks ai_playlist_tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_playlist_tracks
    ADD CONSTRAINT ai_playlist_tracks_pkey PRIMARY KEY (id);


--
-- Name: ai_playlist_tracks ai_playlist_tracks_playlist_id_track_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_playlist_tracks
    ADD CONSTRAINT ai_playlist_tracks_playlist_id_track_id_key UNIQUE (playlist_id, track_id);


--
-- Name: ai_playlists ai_playlists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_playlists
    ADD CONSTRAINT ai_playlists_pkey PRIMARY KEY (id);


--
-- Name: ai_track_likes ai_track_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_track_likes
    ADD CONSTRAINT ai_track_likes_pkey PRIMARY KEY (id);


--
-- Name: ai_track_likes ai_track_likes_track_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_track_likes
    ADD CONSTRAINT ai_track_likes_track_id_user_id_key UNIQUE (track_id, user_id);


--
-- Name: ai_tracks ai_tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_tracks
    ADD CONSTRAINT ai_tracks_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_stats ai_usage_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_usage_stats
    ADD CONSTRAINT ai_usage_stats_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_stats ai_usage_stats_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_usage_stats
    ADD CONSTRAINT ai_usage_stats_user_id_date_key UNIQUE (user_id, date);


--
-- Name: boosters boosters_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boosters
    ADD CONSTRAINT boosters_key_key UNIQUE (key);


--
-- Name: boosters boosters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boosters
    ADD CONSTRAINT boosters_pkey PRIMARY KEY (id);


--
-- Name: challenge_entries challenge_entries_challenge_id_user_id_content_type_content_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenge_entries
    ADD CONSTRAINT challenge_entries_challenge_id_user_id_content_type_content_key UNIQUE (challenge_id, user_id, content_type, content_id);


--
-- Name: challenge_entries challenge_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenge_entries
    ADD CONSTRAINT challenge_entries_pkey PRIMARY KEY (id);


--
-- Name: city_event_participations city_event_participations_event_id_user_id_track_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_event_participations
    ADD CONSTRAINT city_event_participations_event_id_user_id_track_id_key UNIQUE (event_id, user_id, track_id);


--
-- Name: city_event_participations city_event_participations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_event_participations
    ADD CONSTRAINT city_event_participations_pkey PRIMARY KEY (id);


--
-- Name: city_event_tracks city_event_tracks_event_id_track_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_event_tracks
    ADD CONSTRAINT city_event_tracks_event_id_track_id_key UNIQUE (event_id, track_id);


--
-- Name: city_event_tracks city_event_tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_event_tracks
    ADD CONSTRAINT city_event_tracks_pkey PRIMARY KEY (id);


--
-- Name: city_event_votes city_event_votes_event_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_event_votes
    ADD CONSTRAINT city_event_votes_event_id_user_id_key UNIQUE (event_id, user_id);


--
-- Name: city_event_votes city_event_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_event_votes
    ADD CONSTRAINT city_event_votes_pkey PRIMARY KEY (id);


--
-- Name: city_event_winners city_event_winners_event_id_rank_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_event_winners
    ADD CONSTRAINT city_event_winners_event_id_rank_key UNIQUE (event_id, rank);


--
-- Name: city_event_winners city_event_winners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_event_winners
    ADD CONSTRAINT city_event_winners_pkey PRIMARY KEY (id);


--
-- Name: city_events city_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_events
    ADD CONSTRAINT city_events_pkey PRIMARY KEY (id);


--
-- Name: city_user_rewards city_user_rewards_event_id_user_id_reward_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_user_rewards
    ADD CONSTRAINT city_user_rewards_event_id_user_id_reward_key_key UNIQUE (event_id, user_id, reward_key);


--
-- Name: city_user_rewards city_user_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_user_rewards
    ADD CONSTRAINT city_user_rewards_pkey PRIMARY KEY (id);


--
-- Name: comment_likes comment_likes_comment_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_comment_id_user_id_key UNIQUE (comment_id, user_id);


--
-- Name: comment_likes comment_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_pkey PRIMARY KEY (id);


--
-- Name: comment_moderation comment_moderation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_moderation
    ADD CONSTRAINT comment_moderation_pkey PRIMARY KEY (comment_id, creator_id);


--
-- Name: comment_reactions comment_reactions_comment_id_user_id_reaction_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT comment_reactions_comment_id_user_id_reaction_type_key UNIQUE (comment_id, user_id, reaction_type);


--
-- Name: comment_reactions comment_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT comment_reactions_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: conversation_participants conversation_participants_conversation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_user_id_key UNIQUE (conversation_id, user_id);


--
-- Name: conversation_participants conversation_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (id);


--
-- Name: conversation_realtime_events conversation_realtime_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_realtime_events
    ADD CONSTRAINT conversation_realtime_events_pkey PRIMARY KEY (id);


--
-- Name: conversation_rooms conversation_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_rooms
    ADD CONSTRAINT conversation_rooms_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: creator_comment_filters creator_comment_filters_creator_id_word_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creator_comment_filters
    ADD CONSTRAINT creator_comment_filters_creator_id_word_key UNIQUE (creator_id, word);


--
-- Name: creator_comment_filters creator_comment_filters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creator_comment_filters
    ADD CONSTRAINT creator_comment_filters_pkey PRIMARY KEY (id);


--
-- Name: creator_posts creator_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creator_posts
    ADD CONSTRAINT creator_posts_pkey PRIMARY KEY (id);


--
-- Name: credit_ledger credit_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_ledger
    ADD CONSTRAINT credit_ledger_pkey PRIMARY KEY (id);


--
-- Name: editorial_collections editorial_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.editorial_collections
    ADD CONSTRAINT editorial_collections_pkey PRIMARY KEY (id);


--
-- Name: editorial_collections editorial_collections_playlist_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.editorial_collections
    ADD CONSTRAINT editorial_collections_playlist_id_key UNIQUE (playlist_id);


--
-- Name: editorial_collections editorial_collections_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.editorial_collections
    ADD CONSTRAINT editorial_collections_slug_key UNIQUE (slug);


--
-- Name: faq_items faq_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faq_items
    ADD CONSTRAINT faq_items_pkey PRIMARY KEY (id);


--
-- Name: faq_votes faq_votes_faq_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faq_votes
    ADD CONSTRAINT faq_votes_faq_id_user_id_key UNIQUE (faq_id, user_id);


--
-- Name: faq_votes faq_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faq_votes
    ADD CONSTRAINT faq_votes_pkey PRIMARY KEY (id);


--
-- Name: follow_requests follow_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follow_requests
    ADD CONSTRAINT follow_requests_pkey PRIMARY KEY (id);


--
-- Name: follow_requests follow_requests_requester_id_target_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follow_requests
    ADD CONSTRAINT follow_requests_requester_id_target_id_key UNIQUE (requester_id, target_id);


--
-- Name: forum_post_likes forum_post_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_post_likes
    ADD CONSTRAINT forum_post_likes_pkey PRIMARY KEY (id);


--
-- Name: forum_post_likes forum_post_likes_post_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_post_likes
    ADD CONSTRAINT forum_post_likes_post_id_user_id_key UNIQUE (post_id, user_id);


--
-- Name: forum_posts forum_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_posts
    ADD CONSTRAINT forum_posts_pkey PRIMARY KEY (id);


--
-- Name: forum_replies forum_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_replies
    ADD CONSTRAINT forum_replies_pkey PRIMARY KEY (id);


--
-- Name: forum_reply_likes forum_reply_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_reply_likes
    ADD CONSTRAINT forum_reply_likes_pkey PRIMARY KEY (id);


--
-- Name: forum_reply_likes forum_reply_likes_reply_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_reply_likes
    ADD CONSTRAINT forum_reply_likes_reply_id_user_id_key UNIQUE (reply_id, user_id);


--
-- Name: friendships friendships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_pkey PRIMARY KEY (id);


--
-- Name: friendships friendships_unique_pair; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_unique_pair UNIQUE (user_id, friend_id);


--
-- Name: message_attachments message_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_pkey PRIMARY KEY (id);


--
-- Name: message_attachments message_attachments_unique_position; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_unique_position UNIQUE (message_id, "position");


--
-- Name: message_hidden_users message_hidden_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_hidden_users
    ADD CONSTRAINT message_hidden_users_pkey PRIMARY KEY (message_id, user_id);


--
-- Name: message_pins message_pins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_pins
    ADD CONSTRAINT message_pins_pkey PRIMARY KEY (conversation_id, message_id);


--
-- Name: message_reactions message_reactions_one_per_user; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_one_per_user UNIQUE (message_id, user_id);


--
-- Name: message_reactions message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (id);


--
-- Name: message_requests message_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_requests
    ADD CONSTRAINT message_requests_pkey PRIMARY KEY (id);


--
-- Name: message_requests message_requests_requester_id_target_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_requests
    ADD CONSTRAINT message_requests_requester_id_target_id_key UNIQUE (requester_id, target_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: meteo_alerts meteo_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_alerts
    ADD CONSTRAINT meteo_alerts_pkey PRIMARY KEY (id);


--
-- Name: meteo_bulletins meteo_bulletins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_bulletins
    ADD CONSTRAINT meteo_bulletins_pkey PRIMARY KEY (id);


--
-- Name: meteo_comments meteo_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_comments
    ADD CONSTRAINT meteo_comments_pkey PRIMARY KEY (id);


--
-- Name: meteo_reactions meteo_reactions_bulletin_id_user_id_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_reactions
    ADD CONSTRAINT meteo_reactions_bulletin_id_user_id_type_key UNIQUE (bulletin_id, user_id, type);


--
-- Name: meteo_reactions meteo_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_reactions
    ADD CONSTRAINT meteo_reactions_pkey PRIMARY KEY (id);


--
-- Name: meteo_settings meteo_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_settings
    ADD CONSTRAINT meteo_settings_key_key UNIQUE (key);


--
-- Name: meteo_settings meteo_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_settings
    ADD CONSTRAINT meteo_settings_pkey PRIMARY KEY (id);


--
-- Name: meteo_team_members meteo_team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_team_members
    ADD CONSTRAINT meteo_team_members_pkey PRIMARY KEY (id);


--
-- Name: meteo_team_members meteo_team_members_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_team_members
    ADD CONSTRAINT meteo_team_members_user_id_key UNIQUE (user_id);


--
-- Name: meteo_views meteo_views_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_views
    ADD CONSTRAINT meteo_views_pkey PRIMARY KEY (id);


--
-- Name: missions missions_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_key_key UNIQUE (key);


--
-- Name: missions missions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_pkey PRIMARY KEY (id);


--
-- Name: music_challenges music_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.music_challenges
    ADD CONSTRAINT music_challenges_pkey PRIMARY KEY (id);


--
-- Name: music_clips music_clips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.music_clips
    ADD CONSTRAINT music_clips_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_stripe_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id);


--
-- Name: play_stats play_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.play_stats
    ADD CONSTRAINT play_stats_pkey PRIMARY KEY (id);


--
-- Name: playlist_tracks playlist_tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.playlist_tracks
    ADD CONSTRAINT playlist_tracks_pkey PRIMARY KEY (id);


--
-- Name: playlist_tracks playlist_tracks_playlist_id_track_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.playlist_tracks
    ADD CONSTRAINT playlist_tracks_playlist_id_track_id_key UNIQUE (playlist_id, track_id);


--
-- Name: playlists playlists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_pkey PRIMARY KEY (id);


--
-- Name: post_comments post_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_pkey PRIMARY KEY (id);


--
-- Name: post_likes post_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_pkey PRIMARY KEY (id);


--
-- Name: post_likes post_likes_post_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_post_id_user_id_key UNIQUE (post_id, user_id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_user_id_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);


--
-- Name: recommendation_impressions recommendation_impressions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recommendation_impressions
    ADD CONSTRAINT recommendation_impressions_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_referred_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_id_key UNIQUE (referred_id);


--
-- Name: star_academy_applications star_academy_applications_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.star_academy_applications
    ADD CONSTRAINT star_academy_applications_email_key UNIQUE (email);


--
-- Name: star_academy_applications star_academy_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.star_academy_applications
    ADD CONSTRAINT star_academy_applications_pkey PRIMARY KEY (id);


--
-- Name: star_academy_applications star_academy_applications_tracking_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.star_academy_applications
    ADD CONSTRAINT star_academy_applications_tracking_token_key UNIQUE (tracking_token);


--
-- Name: star_academy_config star_academy_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.star_academy_config
    ADD CONSTRAINT star_academy_config_pkey PRIMARY KEY (key);


--
-- Name: star_academy_staff_applications star_academy_staff_applications_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.star_academy_staff_applications
    ADD CONSTRAINT star_academy_staff_applications_email_key UNIQUE (email);


--
-- Name: star_academy_staff_applications star_academy_staff_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.star_academy_staff_applications
    ADD CONSTRAINT star_academy_staff_applications_pkey PRIMARY KEY (id);


--
-- Name: star_academy_staff_applications star_academy_staff_applications_tracking_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.star_academy_staff_applications
    ADD CONSTRAINT star_academy_staff_applications_tracking_token_key UNIQUE (tracking_token);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: synaura_tv_settings synaura_tv_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.synaura_tv_settings
    ADD CONSTRAINT synaura_tv_settings_pkey PRIMARY KEY (id);


--
-- Name: track_events track_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_events
    ADD CONSTRAINT track_events_pkey PRIMARY KEY (id);


--
-- Name: track_likes track_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_likes
    ADD CONSTRAINT track_likes_pkey PRIMARY KEY (id);


--
-- Name: track_likes track_likes_track_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_likes
    ADD CONSTRAINT track_likes_track_id_user_id_key UNIQUE (track_id, user_id);


--
-- Name: track_moment_reactions track_moment_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_moment_reactions
    ADD CONSTRAINT track_moment_reactions_pkey PRIMARY KEY (id);


--
-- Name: track_remixes track_remixes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_remixes
    ADD CONSTRAINT track_remixes_pkey PRIMARY KEY (id);


--
-- Name: track_stats track_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_stats
    ADD CONSTRAINT track_stats_pkey PRIMARY KEY (track_id);


--
-- Name: track_views track_views_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_views
    ADD CONSTRAINT track_views_pkey PRIMARY KEY (id);


--
-- Name: track_views track_views_user_id_track_id_viewed_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_views
    ADD CONSTRAINT track_views_user_id_track_id_viewed_date_key UNIQUE (user_id, track_id, viewed_date);


--
-- Name: track_waveforms track_waveforms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_waveforms
    ADD CONSTRAINT track_waveforms_pkey PRIMARY KEY (track_id, track_type);


--
-- Name: tracks tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_pkey PRIMARY KEY (id);


--
-- Name: user_blocks user_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_pkey PRIMARY KEY (id);


--
-- Name: user_blocks user_blocks_unique_pair; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_unique_pair UNIQUE (blocker_id, blocked_id);


--
-- Name: user_booster_daily user_booster_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_booster_daily
    ADD CONSTRAINT user_booster_daily_pkey PRIMARY KEY (user_id);


--
-- Name: user_booster_open_history user_booster_open_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_booster_open_history
    ADD CONSTRAINT user_booster_open_history_pkey PRIMARY KEY (id);


--
-- Name: user_booster_pack_claims user_booster_pack_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_booster_pack_claims
    ADD CONSTRAINT user_booster_pack_claims_pkey PRIMARY KEY (id);


--
-- Name: user_booster_pity user_booster_pity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_booster_pity
    ADD CONSTRAINT user_booster_pity_pkey PRIMARY KEY (user_id);


--
-- Name: user_boosters user_boosters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_boosters
    ADD CONSTRAINT user_boosters_pkey PRIMARY KEY (id);


--
-- Name: user_daily_spin_history user_daily_spin_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_daily_spin_history
    ADD CONSTRAINT user_daily_spin_history_pkey PRIMARY KEY (id);


--
-- Name: user_daily_spin user_daily_spin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_daily_spin
    ADD CONSTRAINT user_daily_spin_pkey PRIMARY KEY (user_id);


--
-- Name: user_follows user_follows_follower_id_following_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT user_follows_follower_id_following_id_key UNIQUE (follower_id, following_id);


--
-- Name: user_follows user_follows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT user_follows_pkey PRIMARY KEY (id);


--
-- Name: user_missions user_missions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_missions
    ADD CONSTRAINT user_missions_pkey PRIMARY KEY (id);


--
-- Name: user_quotas user_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_quotas
    ADD CONSTRAINT user_quotas_pkey PRIMARY KEY (id);


--
-- Name: user_quotas user_quotas_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_quotas
    ADD CONSTRAINT user_quotas_user_id_key UNIQUE (user_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: waiting_list waiting_list_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waiting_list
    ADD CONSTRAINT waiting_list_email_key UNIQUE (email);


--
-- Name: waiting_list waiting_list_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waiting_list
    ADD CONSTRAINT waiting_list_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_07_31 messages_2026_07_31_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages_2026_07_31
    ADD CONSTRAINT messages_2026_07_31_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_08_01 messages_2026_08_01_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages_2026_08_01
    ADD CONSTRAINT messages_2026_08_01_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_08_02 messages_2026_08_02_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages_2026_08_02
    ADD CONSTRAINT messages_2026_08_02_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_08_03 messages_2026_08_03_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages_2026_08_03
    ADD CONSTRAINT messages_2026_08_03_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_08_04 messages_2026_08_04_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages_2026_08_04
    ADD CONSTRAINT messages_2026_08_04_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_08_05 messages_2026_08_05_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages_2026_08_05
    ADD CONSTRAINT messages_2026_08_05_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_08_06 messages_2026_08_06_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages_2026_08_06
    ADD CONSTRAINT messages_2026_08_06_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages messages_payload_exclusive; Type: CHECK CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages
    ADD CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL))) NOT VALID;


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_idempotency_key_key; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: account_private_email_unique_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX account_private_email_unique_idx ON public.account_private USING btree (lower(email)) WHERE (email IS NOT NULL);


--
-- Name: comment_likes_comment_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX comment_likes_comment_id_idx ON public.comment_likes USING btree (comment_id);


--
-- Name: comment_likes_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX comment_likes_user_id_idx ON public.comment_likes USING btree (user_id);


--
-- Name: comment_moderation_creator_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX comment_moderation_creator_id_idx ON public.comment_moderation USING btree (creator_id);


--
-- Name: comment_moderation_track_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX comment_moderation_track_id_idx ON public.comment_moderation USING btree (track_id);


--
-- Name: comments_parent_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX comments_parent_id_idx ON public.comments USING btree (parent_id);


--
-- Name: comments_track_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX comments_track_id_created_at_idx ON public.comments USING btree (track_id, created_at DESC);


--
-- Name: comments_track_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX comments_track_timestamp_idx ON public.comments USING btree (track_id, timestamp_seconds) WHERE (timestamp_seconds IS NOT NULL);


--
-- Name: comments_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX comments_user_id_idx ON public.comments USING btree (user_id);


--
-- Name: conversation_participants_unique_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX conversation_participants_unique_user ON public.conversation_participants USING btree (conversation_id, user_id);


--
-- Name: conversation_participants_user_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX conversation_participants_user_active ON public.conversation_participants USING btree (user_id, archived_at, conversation_id);


--
-- Name: conversation_realtime_events_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX conversation_realtime_events_active ON public.conversation_realtime_events USING btree (conversation_id, expires_at DESC);


--
-- Name: conversation_realtime_events_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX conversation_realtime_events_user_idx ON public.conversation_realtime_events USING btree (user_id);


--
-- Name: conversation_rooms_created_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX conversation_rooms_created_by_idx ON public.conversation_rooms USING btree (created_by);


--
-- Name: conversation_rooms_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX conversation_rooms_order ON public.conversation_rooms USING btree (conversation_id, "position", created_at);


--
-- Name: conversation_rooms_unique_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX conversation_rooms_unique_name ON public.conversation_rooms USING btree (conversation_id, lower(name));


--
-- Name: conversations_owner_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX conversations_owner_idx ON public.conversations USING btree (owner_id);


--
-- Name: conversations_unique_direct_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX conversations_unique_direct_key ON public.conversations USING btree (direct_key) WHERE ((COALESCE(is_group, false) = false) AND (direct_key IS NOT NULL));


--
-- Name: creator_comment_filters_creator_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX creator_comment_filters_creator_id_idx ON public.creator_comment_filters USING btree (creator_id);


--
-- Name: editorial_collections_published_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX editorial_collections_published_idx ON public.editorial_collections USING btree (is_published, is_featured, "position", created_at DESC);


--
-- Name: editorial_collections_slug_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX editorial_collections_slug_idx ON public.editorial_collections USING btree (slug);


--
-- Name: friendships_friend; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX friendships_friend ON public.friendships USING btree (friend_id, created_at DESC);


--
-- Name: friendships_source_request_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX friendships_source_request_idx ON public.friendships USING btree (source_request_id);


--
-- Name: friendships_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX friendships_user ON public.friendships USING btree (user_id, created_at DESC);


--
-- Name: idx_active_artist_boosts_artist; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_active_artist_boosts_artist ON public.active_artist_boosts USING btree (artist_id);


--
-- Name: idx_active_artist_boosts_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_active_artist_boosts_expires ON public.active_artist_boosts USING btree (expires_at);


--
-- Name: idx_active_boosts_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_active_boosts_expires ON public.active_track_boosts USING btree (expires_at);


--
-- Name: idx_active_boosts_track; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_active_boosts_track ON public.active_track_boosts USING btree (track_id);


--
-- Name: idx_ai_generations_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_generations_created_at ON public.ai_generations USING btree (created_at DESC);


--
-- Name: idx_ai_generations_favorite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_generations_favorite ON public.ai_generations USING btree (is_favorite);


--
-- Name: idx_ai_generations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_generations_status ON public.ai_generations USING btree (status);


--
-- Name: idx_ai_generations_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_generations_task_id ON public.ai_generations USING btree (task_id);


--
-- Name: idx_ai_generations_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_generations_user_id ON public.ai_generations USING btree (user_id);


--
-- Name: idx_ai_playlists_public; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_playlists_public ON public.ai_playlists USING btree (is_public);


--
-- Name: idx_ai_playlists_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_playlists_user_id ON public.ai_playlists USING btree (user_id);


--
-- Name: idx_ai_track_likes_track_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_track_likes_track_id ON public.ai_track_likes USING btree (track_id);


--
-- Name: idx_ai_track_likes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_track_likes_user_id ON public.ai_track_likes USING btree (user_id);


--
-- Name: idx_ai_tracks_album; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_tracks_album ON public.ai_tracks USING btree (album_id) WHERE (album_id IS NOT NULL);


--
-- Name: idx_ai_tracks_favorite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_tracks_favorite ON public.ai_tracks USING btree (is_favorite);


--
-- Name: idx_ai_tracks_generation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_tracks_generation_id ON public.ai_tracks USING btree (generation_id);


--
-- Name: idx_ai_tracks_suno_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_tracks_suno_id ON public.ai_tracks USING btree (suno_id);


--
-- Name: idx_challenge_entries_challenge; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenge_entries_challenge ON public.challenge_entries USING btree (challenge_id, created_at DESC);


--
-- Name: idx_challenge_entries_content; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenge_entries_content ON public.challenge_entries USING btree (content_type, content_id);


--
-- Name: idx_challenge_entries_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenge_entries_user ON public.challenge_entries USING btree (user_id, created_at DESC);


--
-- Name: idx_city_event_participations_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_city_event_participations_event ON public.city_event_participations USING btree (event_id, created_at DESC);


--
-- Name: idx_city_event_participations_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_city_event_participations_user ON public.city_event_participations USING btree (user_id, created_at DESC);


--
-- Name: idx_city_event_tracks_creator; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_city_event_tracks_creator ON public.city_event_tracks USING btree (creator_id);


--
-- Name: idx_city_event_tracks_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_city_event_tracks_event ON public.city_event_tracks USING btree (event_id, slot);


--
-- Name: idx_city_event_tracks_track; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_city_event_tracks_track ON public.city_event_tracks USING btree (track_id);


--
-- Name: idx_city_event_votes_track; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_city_event_votes_track ON public.city_event_votes USING btree (event_id, track_id);


--
-- Name: idx_city_event_votes_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_city_event_votes_user ON public.city_event_votes USING btree (user_id);


--
-- Name: idx_city_event_winners_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_city_event_winners_event ON public.city_event_winners USING btree (event_id);


--
-- Name: idx_city_event_winners_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_city_event_winners_user ON public.city_event_winners USING btree (user_id);


--
-- Name: idx_city_events_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_city_events_status ON public.city_events USING btree (status, starts_at, ends_at);


--
-- Name: idx_city_events_week; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_city_events_week ON public.city_events USING btree (week_key, kind);


--
-- Name: idx_city_user_rewards_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_city_user_rewards_user ON public.city_user_rewards USING btree (user_id, status);


--
-- Name: idx_comment_likes_comment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes USING btree (comment_id);


--
-- Name: idx_comment_likes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comment_likes_user_id ON public.comment_likes USING btree (user_id);


--
-- Name: idx_comments_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_created_at ON public.comments USING btree (created_at DESC);


--
-- Name: idx_comments_likes_count; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_likes_count ON public.comments USING btree (likes_count DESC);


--
-- Name: idx_comments_track_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_track_id ON public.comments USING btree (track_id);


--
-- Name: idx_creator_posts_creator; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_creator_posts_creator ON public.creator_posts USING btree (creator_id, created_at DESC);


--
-- Name: idx_creator_posts_original_post; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_creator_posts_original_post ON public.creator_posts USING btree (original_post_id);


--
-- Name: idx_creator_posts_public; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_creator_posts_public ON public.creator_posts USING btree (is_public, created_at DESC);


--
-- Name: idx_faq_items_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_faq_items_category ON public.faq_items USING btree (category);


--
-- Name: idx_faq_items_published; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_faq_items_published ON public.faq_items USING btree (is_published);


--
-- Name: idx_forum_posts_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_forum_posts_category ON public.forum_posts USING btree (category);


--
-- Name: idx_forum_posts_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_forum_posts_created_at ON public.forum_posts USING btree (created_at DESC);


--
-- Name: idx_forum_posts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_forum_posts_user_id ON public.forum_posts USING btree (user_id);


--
-- Name: idx_forum_replies_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_forum_replies_created_at ON public.forum_replies USING btree (created_at DESC);


--
-- Name: idx_forum_replies_post_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_forum_replies_post_id ON public.forum_replies USING btree (post_id);


--
-- Name: idx_ledger_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ledger_source ON public.credit_ledger USING btree (source);


--
-- Name: idx_ledger_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ledger_user ON public.credit_ledger USING btree (user_id, created_at DESC);


--
-- Name: idx_message_requests_requester; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_requests_requester ON public.message_requests USING btree (requester_id);


--
-- Name: idx_message_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_requests_status ON public.message_requests USING btree (status);


--
-- Name: idx_message_requests_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_requests_target ON public.message_requests USING btree (target_id);


--
-- Name: idx_messages_conversation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id);


--
-- Name: idx_messages_sender; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);


--
-- Name: idx_meteo_alerts_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_alerts_active ON public.meteo_alerts USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_meteo_alerts_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_alerts_expires ON public.meteo_alerts USING btree (expires_at);


--
-- Name: idx_meteo_bulletins_author_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_bulletins_author_id ON public.meteo_bulletins USING btree (author_id);


--
-- Name: idx_meteo_bulletins_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_bulletins_created_at ON public.meteo_bulletins USING btree (created_at DESC);


--
-- Name: idx_meteo_bulletins_is_current; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_bulletins_is_current ON public.meteo_bulletins USING btree (is_current);


--
-- Name: idx_meteo_bulletins_scheduled_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_bulletins_scheduled_at ON public.meteo_bulletins USING btree (scheduled_at) WHERE (scheduled_at IS NOT NULL);


--
-- Name: idx_meteo_bulletins_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_bulletins_status ON public.meteo_bulletins USING btree (status);


--
-- Name: idx_meteo_comments_bulletin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_comments_bulletin ON public.meteo_comments USING btree (bulletin_id);


--
-- Name: idx_meteo_comments_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_comments_parent ON public.meteo_comments USING btree (parent_id);


--
-- Name: idx_meteo_comments_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_comments_user ON public.meteo_comments USING btree (user_id);


--
-- Name: idx_meteo_reactions_bulletin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_reactions_bulletin ON public.meteo_reactions USING btree (bulletin_id);


--
-- Name: idx_meteo_reactions_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_reactions_user ON public.meteo_reactions USING btree (user_id);


--
-- Name: idx_meteo_team_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_team_status ON public.meteo_team_members USING btree (status);


--
-- Name: idx_meteo_team_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_team_user ON public.meteo_team_members USING btree (user_id);


--
-- Name: idx_meteo_views_bulletin_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_views_bulletin_created ON public.meteo_views USING btree (bulletin_id, created_at);


--
-- Name: idx_meteo_views_bulletin_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_views_bulletin_id ON public.meteo_views USING btree (bulletin_id);


--
-- Name: idx_meteo_views_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_views_created_at ON public.meteo_views USING btree (created_at);


--
-- Name: idx_meteo_views_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meteo_views_source ON public.meteo_views USING btree (source) WHERE (source IS NOT NULL);


--
-- Name: idx_music_challenges_source_track; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_music_challenges_source_track ON public.music_challenges USING btree (source_track_id);


--
-- Name: idx_music_challenges_window; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_music_challenges_window ON public.music_challenges USING btree (starts_at, ends_at);


--
-- Name: idx_notifications_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_category ON public.notifications USING btree (category);


--
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_password_resets_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_resets_code ON public.password_resets USING btree (code);


--
-- Name: idx_password_resets_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_resets_email ON public.password_resets USING btree (email);


--
-- Name: idx_password_resets_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_resets_token ON public.password_resets USING btree (token);


--
-- Name: idx_post_comments_post; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_comments_post ON public.post_comments USING btree (post_id, created_at DESC);


--
-- Name: idx_post_likes_post; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_likes_post ON public.post_likes USING btree (post_id);


--
-- Name: idx_post_likes_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_likes_user ON public.post_likes USING btree (user_id);


--
-- Name: idx_profiles_artist; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_artist ON public.profiles USING btree (is_artist, total_plays DESC);


--
-- Name: idx_profiles_early_access; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_early_access ON public.profiles USING btree (early_access);


--
-- Name: idx_profiles_plan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_plan ON public.profiles USING btree (plan);


--
-- Name: idx_profiles_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);


--
-- Name: idx_profiles_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_username ON public.profiles USING btree (username);


--
-- Name: idx_push_subs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_push_subs_user ON public.push_subscriptions USING btree (user_id);


--
-- Name: idx_push_subscriptions_user_kind; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_push_subscriptions_user_kind ON public.push_subscriptions USING btree (user_id, p256dh);


--
-- Name: idx_reco_impressions_content_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reco_impressions_content_created ON public.recommendation_impressions USING btree (content_type, content_id, created_at DESC);


--
-- Name: idx_reco_impressions_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reco_impressions_user_created ON public.recommendation_impressions USING btree (user_id, created_at DESC);


--
-- Name: idx_referrals_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referrals_created ON public.referrals USING btree (created_at DESC);


--
-- Name: idx_referrals_referrer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referrals_referrer ON public.referrals USING btree (referrer_id);


--
-- Name: idx_sa_applications_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_applications_email ON public.star_academy_applications USING btree (email);


--
-- Name: idx_sa_applications_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_applications_status ON public.star_academy_applications USING btree (status);


--
-- Name: idx_sa_applications_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_applications_token ON public.star_academy_applications USING btree (tracking_token);


--
-- Name: idx_sa_staff_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_staff_email ON public.star_academy_staff_applications USING btree (email);


--
-- Name: idx_sa_staff_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_staff_role ON public.star_academy_staff_applications USING btree (role);


--
-- Name: idx_sa_staff_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_staff_status ON public.star_academy_staff_applications USING btree (status);


--
-- Name: idx_sa_staff_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_staff_token ON public.star_academy_staff_applications USING btree (tracking_token);


--
-- Name: idx_track_events_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_track_events_created ON public.track_events USING btree (created_at DESC);


--
-- Name: idx_track_events_track; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_track_events_track ON public.track_events USING btree (track_id);


--
-- Name: idx_track_events_track_created_signal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_track_events_track_created_signal ON public.track_events USING btree (track_id, created_at DESC) INCLUDE (event_type, user_id, session_id, progress_pct);


--
-- Name: idx_track_events_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_track_events_type ON public.track_events USING btree (event_type);


--
-- Name: idx_track_events_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_track_events_user ON public.track_events USING btree (user_id);


--
-- Name: idx_track_events_user_created_signal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_track_events_user_created_signal ON public.track_events USING btree (user_id, created_at DESC) INCLUDE (track_id, event_type, progress_pct, position_ms, duration_ms) WHERE (user_id IS NOT NULL);


--
-- Name: idx_track_likes_track_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_track_likes_track_id ON public.track_likes USING btree (track_id);


--
-- Name: idx_track_likes_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_track_likes_unique ON public.track_likes USING btree (track_id, user_id);


--
-- Name: idx_track_likes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_track_likes_user_id ON public.track_likes USING btree (user_id);


--
-- Name: idx_track_views_country; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_track_views_country ON public.track_views USING btree (country);


--
-- Name: idx_track_views_device; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_track_views_device ON public.track_views USING btree (device);


--
-- Name: idx_track_views_track_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_track_views_track_created ON public.track_views USING btree (track_id, created_at DESC);


--
-- Name: idx_track_views_track_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_track_views_track_id ON public.track_views USING btree (track_id);


--
-- Name: idx_track_views_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_track_views_user_id ON public.track_views USING btree (user_id);


--
-- Name: idx_track_views_user_track; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_track_views_user_track ON public.track_views USING btree (user_id, track_id, created_at DESC);


--
-- Name: idx_track_views_viewed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_track_views_viewed_at ON public.track_views USING btree (viewed_at);


--
-- Name: idx_tracks_album; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tracks_album ON public.tracks USING btree (album_id) WHERE (album_id IS NOT NULL);


--
-- Name: idx_tracks_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tracks_created ON public.tracks USING btree (created_at DESC);


--
-- Name: idx_tracks_creator; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tracks_creator ON public.tracks USING btree (creator_id);


--
-- Name: idx_tracks_genre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tracks_genre ON public.tracks USING gin (genre);


--
-- Name: idx_tracks_popular; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tracks_popular ON public.tracks USING btree (plays DESC, likes DESC);


--
-- Name: idx_user_booster_history_opened; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_booster_history_opened ON public.user_booster_open_history USING btree (opened_at);


--
-- Name: idx_user_booster_history_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_booster_history_user ON public.user_booster_open_history USING btree (user_id);


--
-- Name: idx_user_boosters_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_boosters_status ON public.user_boosters USING btree (status);


--
-- Name: idx_user_boosters_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_boosters_user ON public.user_boosters USING btree (user_id);


--
-- Name: idx_user_follows_follower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_follows_follower ON public.user_follows USING btree (follower_id);


--
-- Name: idx_user_follows_following; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_follows_following ON public.user_follows USING btree (following_id);


--
-- Name: idx_user_missions_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_missions_user ON public.user_missions USING btree (user_id);


--
-- Name: idx_user_quotas_reset_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_quotas_reset_date ON public.user_quotas USING btree (reset_date);


--
-- Name: idx_user_quotas_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_quotas_user_id ON public.user_quotas USING btree (user_id);


--
-- Name: idx_waiting_list_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_waiting_list_created_at ON public.waiting_list USING btree (created_at);


--
-- Name: idx_waiting_list_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_waiting_list_email ON public.waiting_list USING btree (email);


--
-- Name: idx_waiting_list_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_waiting_list_status ON public.waiting_list USING btree (status);


--
-- Name: message_attachments_conversation_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX message_attachments_conversation_idx ON public.message_attachments USING btree (conversation_id);


--
-- Name: message_attachments_message_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX message_attachments_message_order ON public.message_attachments USING btree (message_id, "position");


--
-- Name: message_hidden_users_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX message_hidden_users_user ON public.message_hidden_users USING btree (user_id, hidden_at DESC);


--
-- Name: message_pins_conversation_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX message_pins_conversation_created ON public.message_pins USING btree (conversation_id, created_at DESC);


--
-- Name: message_pins_message_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX message_pins_message_idx ON public.message_pins USING btree (message_id);


--
-- Name: message_pins_pinned_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX message_pins_pinned_by_idx ON public.message_pins USING btree (pinned_by);


--
-- Name: message_reactions_conversation_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX message_reactions_conversation_created ON public.message_reactions USING btree (conversation_id, created_at DESC);


--
-- Name: message_reactions_message; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX message_reactions_message ON public.message_reactions USING btree (message_id, created_at);


--
-- Name: message_reactions_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX message_reactions_user_idx ON public.message_reactions USING btree (user_id);


--
-- Name: message_requests_received_pending; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX message_requests_received_pending ON public.message_requests USING btree (target_id, created_at DESC) WHERE ((status)::text = 'pending'::text);


--
-- Name: message_requests_sent_pending; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX message_requests_sent_pending ON public.message_requests USING btree (requester_id, created_at DESC) WHERE ((status)::text = 'pending'::text);


--
-- Name: message_requests_unique_pending_pair; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX message_requests_unique_pending_pair ON public.message_requests USING btree (LEAST(requester_id, target_id), GREATEST(requester_id, target_id)) WHERE ((status)::text = 'pending'::text);


--
-- Name: messages_conversation_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX messages_conversation_created ON public.messages USING btree (conversation_id, created_at DESC);


--
-- Name: messages_room_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX messages_room_created ON public.messages USING btree (room_id, created_at DESC) WHERE (room_id IS NOT NULL);


--
-- Name: messages_sender_client_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX messages_sender_client_id_unique ON public.messages USING btree (sender_id, client_id) WHERE (client_id IS NOT NULL);


--
-- Name: messages_unread_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX messages_unread_lookup ON public.messages USING btree (conversation_id, is_read, sender_id) WHERE (deleted_at IS NULL);


--
-- Name: music_clips_creator_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX music_clips_creator_idx ON public.music_clips USING btree (creator_id, created_at DESC);


--
-- Name: music_clips_public_feed_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX music_clips_public_feed_idx ON public.music_clips USING btree (visibility, created_at DESC) WHERE (visibility = 'published'::text);


--
-- Name: music_clips_source_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX music_clips_source_idx ON public.music_clips USING btree (source_track_type, source_track_id, visibility, created_at DESC);


--
-- Name: profiles_is_early_access_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX profiles_is_early_access_idx ON public.profiles USING btree (is_early_access);


--
-- Name: track_moment_reactions_track_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX track_moment_reactions_track_idx ON public.track_moment_reactions USING btree (track_id, timestamp_seconds);


--
-- Name: track_moment_reactions_unique_user_moment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX track_moment_reactions_unique_user_moment ON public.track_moment_reactions USING btree (track_id, user_id, reaction_type, timestamp_seconds);


--
-- Name: track_remixes_challenge_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX track_remixes_challenge_id_idx ON public.track_remixes USING btree (challenge_id);


--
-- Name: track_remixes_challenge_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX track_remixes_challenge_idx ON public.track_remixes USING btree (challenge_id) WHERE (challenge_id IS NOT NULL);


--
-- Name: track_remixes_creator_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX track_remixes_creator_idx ON public.track_remixes USING btree (creator_id, created_at DESC);


--
-- Name: track_remixes_source_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX track_remixes_source_status_idx ON public.track_remixes USING btree (source_track_id, source_track_type, status);


--
-- Name: track_remixes_unique_child; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX track_remixes_unique_child ON public.track_remixes USING btree (child_track_id, child_track_type, remix_type);


--
-- Name: uq_pack_claim_user_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_pack_claim_user_period ON public.user_booster_pack_claims USING btree (user_id, pack_key, period_start);


--
-- Name: uq_user_mission; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_user_mission ON public.user_missions USING btree (user_id, mission_id);


--
-- Name: user_blocks_blocked; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_blocks_blocked ON public.user_blocks USING btree (blocked_id, blocker_id);


--
-- Name: user_daily_spin_history_user_spun_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_daily_spin_history_user_spun_idx ON public.user_daily_spin_history USING btree (user_id, spun_at DESC);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_07_31_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_2026_07_31_inserted_at_topic_idx ON realtime.messages_2026_07_31 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_08_01_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_2026_08_01_inserted_at_topic_idx ON realtime.messages_2026_08_01 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_08_02_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_2026_08_02_inserted_at_topic_idx ON realtime.messages_2026_08_02 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_08_03_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_2026_08_03_inserted_at_topic_idx ON realtime.messages_2026_08_03 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_08_04_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_2026_08_04_inserted_at_topic_idx ON realtime.messages_2026_08_04 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_08_05_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_2026_08_05_inserted_at_topic_idx ON realtime.messages_2026_08_05 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_08_06_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_2026_08_06_inserted_at_topic_idx ON realtime.messages_2026_08_06 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_selec; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_selec ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter, COALESCE(selected_columns, '{}'::text[]));


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: messages_2026_07_31_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_07_31_inserted_at_topic_idx;


--
-- Name: messages_2026_07_31_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_07_31_pkey;


--
-- Name: messages_2026_08_01_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_08_01_inserted_at_topic_idx;


--
-- Name: messages_2026_08_01_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_08_01_pkey;


--
-- Name: messages_2026_08_02_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_08_02_inserted_at_topic_idx;


--
-- Name: messages_2026_08_02_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_08_02_pkey;


--
-- Name: messages_2026_08_03_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_08_03_inserted_at_topic_idx;


--
-- Name: messages_2026_08_03_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_08_03_pkey;


--
-- Name: messages_2026_08_04_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_08_04_inserted_at_topic_idx;


--
-- Name: messages_2026_08_04_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_08_04_pkey;


--
-- Name: messages_2026_08_05_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_08_05_inserted_at_topic_idx;


--
-- Name: messages_2026_08_05_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_08_05_pkey;


--
-- Name: messages_2026_08_06_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_08_06_inserted_at_topic_idx;


--
-- Name: messages_2026_08_06_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_08_06_pkey;


--
-- Name: city_event_winners city_battle_winner_requires_vote; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER city_battle_winner_requires_vote BEFORE INSERT OR UPDATE OF event_id, track_id ON public.city_event_winners FOR EACH ROW EXECUTE FUNCTION public.require_city_battle_winner_vote();


--
-- Name: meteo_bulletins meteo_bulletins_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER meteo_bulletins_updated_at BEFORE UPDATE ON public.meteo_bulletins FOR EACH ROW EXECUTE FUNCTION public.update_meteo_bulletins_updated_at();


--
-- Name: profiles move_profile_email_to_private; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER move_profile_email_to_private BEFORE INSERT OR UPDATE OF email ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.move_profile_email_to_private();


--
-- Name: music_clips music_clips_touch_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER music_clips_touch_updated_at BEFORE UPDATE ON public.music_clips FOR EACH ROW EXECUTE FUNCTION public.touch_music_clips_updated_at();


--
-- Name: conversation_realtime_events synaura_cleanup_realtime_events_on_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER synaura_cleanup_realtime_events_on_insert BEFORE INSERT ON public.conversation_realtime_events FOR EACH STATEMENT EXECUTE FUNCTION public.synaura_cleanup_realtime_events();


--
-- Name: message_attachments synaura_sync_attachment_conversation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER synaura_sync_attachment_conversation BEFORE INSERT OR UPDATE OF message_id ON public.message_attachments FOR EACH ROW EXECUTE FUNCTION public.synaura_sync_message_relation();


--
-- Name: message_reactions synaura_sync_reaction_conversation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER synaura_sync_reaction_conversation BEFORE INSERT OR UPDATE OF message_id ON public.message_reactions FOR EACH ROW EXECUTE FUNCTION public.synaura_sync_message_relation();


--
-- Name: messages synaura_touch_conversation_after_message; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER synaura_touch_conversation_after_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.synaura_touch_conversation();


--
-- Name: account_private touch_account_private_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER touch_account_private_updated_at BEFORE UPDATE ON public.account_private FOR EACH ROW EXECUTE FUNCTION public.touch_account_private_updated_at();


--
-- Name: editorial_collections touch_editorial_collections_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER touch_editorial_collections_updated_at BEFORE UPDATE ON public.editorial_collections FOR EACH ROW EXECUTE FUNCTION public.touch_editorial_collections_updated_at();


--
-- Name: track_likes track_likes_after_delete; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER track_likes_after_delete AFTER DELETE ON public.track_likes FOR EACH ROW EXECUTE FUNCTION public.trg_track_likes_after_delete();


--
-- Name: track_likes track_likes_after_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER track_likes_after_insert AFTER INSERT ON public.track_likes FOR EACH ROW EXECUTE FUNCTION public.trg_track_likes_after_insert();


--
-- Name: track_views track_views_after_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER track_views_after_insert AFTER INSERT ON public.track_views FOR EACH ROW EXECUTE FUNCTION public.trg_track_views_after_insert();


--
-- Name: profiles trg_ai_welcome_credits; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ai_welcome_credits AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.ai_grant_welcome_credits();


--
-- Name: profiles trg_auto_referral_code; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_auto_referral_code BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.auto_generate_referral_code();


--
-- Name: city_event_participations trg_city_event_participations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_city_event_participations_updated_at BEFORE UPDATE ON public.city_event_participations FOR EACH ROW EXECUTE FUNCTION public.set_city_updated_at();


--
-- Name: city_event_votes trg_city_event_votes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_city_event_votes_updated_at BEFORE UPDATE ON public.city_event_votes FOR EACH ROW EXECUTE FUNCTION public.set_city_updated_at();


--
-- Name: city_events trg_city_events_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_city_events_updated_at BEFORE UPDATE ON public.city_events FOR EACH ROW EXECUTE FUNCTION public.set_city_updated_at();


--
-- Name: music_challenges trg_music_challenges_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_music_challenges_updated_at BEFORE UPDATE ON public.music_challenges FOR EACH ROW EXECUTE FUNCTION public.update_music_challenges_updated_at();


--
-- Name: star_academy_staff_applications trg_sa_staff_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sa_staff_updated_at BEFORE UPDATE ON public.star_academy_staff_applications FOR EACH ROW EXECUTE FUNCTION public.update_sa_staff_updated_at();


--
-- Name: star_academy_applications trg_sa_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sa_updated_at BEFORE UPDATE ON public.star_academy_applications FOR EACH ROW EXECUTE FUNCTION public.update_sa_updated_at();


--
-- Name: user_follows trigger_follow_delete; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_follow_delete AFTER DELETE ON public.user_follows FOR EACH ROW EXECUTE FUNCTION public.trigger_update_follow_counts();


--
-- Name: user_follows trigger_follow_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_follow_insert AFTER INSERT ON public.user_follows FOR EACH ROW EXECUTE FUNCTION public.trigger_update_follow_counts();


--
-- Name: ai_generations trigger_update_ai_usage_stats; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_ai_usage_stats AFTER INSERT ON public.ai_generations FOR EACH ROW EXECUTE FUNCTION public.update_ai_usage_stats();


--
-- Name: comment_likes trigger_update_comment_likes_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_comment_likes_count AFTER INSERT OR DELETE ON public.comment_likes FOR EACH ROW EXECUTE FUNCTION public.update_comment_likes_count();


--
-- Name: forum_post_likes trigger_update_post_likes_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_post_likes_count AFTER INSERT OR DELETE ON public.forum_post_likes FOR EACH ROW EXECUTE FUNCTION public.update_forum_post_likes_count();


--
-- Name: forum_replies trigger_update_post_replies_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_post_replies_count AFTER INSERT OR DELETE ON public.forum_replies FOR EACH ROW EXECUTE FUNCTION public.update_forum_post_replies_count();


--
-- Name: forum_reply_likes trigger_update_reply_likes_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_reply_likes_count AFTER INSERT OR DELETE ON public.forum_reply_likes FOR EACH ROW EXECUTE FUNCTION public.update_forum_reply_likes_count();


--
-- Name: track_likes trigger_update_track_likes_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_track_likes_count AFTER INSERT OR DELETE ON public.track_likes FOR EACH ROW EXECUTE FUNCTION public.update_track_likes_count();


--
-- Name: track_views trigger_update_track_views_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_track_views_count AFTER INSERT ON public.track_views FOR EACH ROW EXECUTE FUNCTION public.update_track_views_count();


--
-- Name: ai_generations update_ai_generations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_ai_generations_updated_at BEFORE UPDATE ON public.ai_generations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: conversations update_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: follow_requests update_follow_requests_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_follow_requests_updated_at BEFORE UPDATE ON public.follow_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: messages update_messages_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: playlists update_playlists_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON public.playlists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscriptions update_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tracks update_tracks_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tracks_updated_at BEFORE UPDATE ON public.tracks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: account_private validate_account_private_birth_date; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER validate_account_private_birth_date BEFORE INSERT OR UPDATE OF birth_date ON public.account_private FOR EACH ROW EXECUTE FUNCTION public.validate_account_private_birth_date();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: account_private account_private_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_private
    ADD CONSTRAINT account_private_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: active_artist_boosts active_artist_boosts_artist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_artist_boosts
    ADD CONSTRAINT active_artist_boosts_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: active_artist_boosts active_artist_boosts_booster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_artist_boosts
    ADD CONSTRAINT active_artist_boosts_booster_id_fkey FOREIGN KEY (booster_id) REFERENCES public.boosters(id) ON DELETE RESTRICT;


--
-- Name: active_artist_boosts active_artist_boosts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_artist_boosts
    ADD CONSTRAINT active_artist_boosts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: active_track_boosts active_track_boosts_booster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_track_boosts
    ADD CONSTRAINT active_track_boosts_booster_id_fkey FOREIGN KEY (booster_id) REFERENCES public.boosters(id) ON DELETE RESTRICT;


--
-- Name: active_track_boosts active_track_boosts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_track_boosts
    ADD CONSTRAINT active_track_boosts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: admin_broadcasts admin_broadcasts_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_broadcasts
    ADD CONSTRAINT admin_broadcasts_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_credit_balances ai_credit_balances_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_credit_balances
    ADD CONSTRAINT ai_credit_balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_generations ai_generations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_generations
    ADD CONSTRAINT ai_generations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_playlist_tracks ai_playlist_tracks_playlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_playlist_tracks
    ADD CONSTRAINT ai_playlist_tracks_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.ai_playlists(id) ON DELETE CASCADE;


--
-- Name: ai_playlist_tracks ai_playlist_tracks_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_playlist_tracks
    ADD CONSTRAINT ai_playlist_tracks_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.ai_tracks(id) ON DELETE CASCADE;


--
-- Name: ai_playlists ai_playlists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_playlists
    ADD CONSTRAINT ai_playlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_track_likes ai_track_likes_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_track_likes
    ADD CONSTRAINT ai_track_likes_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.ai_tracks(id) ON DELETE CASCADE;


--
-- Name: ai_track_likes ai_track_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_track_likes
    ADD CONSTRAINT ai_track_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_tracks ai_tracks_generation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_tracks
    ADD CONSTRAINT ai_tracks_generation_id_fkey FOREIGN KEY (generation_id) REFERENCES public.ai_generations(id) ON DELETE CASCADE;


--
-- Name: ai_usage_stats ai_usage_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_usage_stats
    ADD CONSTRAINT ai_usage_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: challenge_entries challenge_entries_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenge_entries
    ADD CONSTRAINT challenge_entries_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.music_challenges(id) ON DELETE CASCADE;


--
-- Name: challenge_entries challenge_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenge_entries
    ADD CONSTRAINT challenge_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: city_event_participations city_event_participations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_event_participations
    ADD CONSTRAINT city_event_participations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.city_events(id) ON DELETE CASCADE;


--
-- Name: city_event_participations city_event_participations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_event_participations
    ADD CONSTRAINT city_event_participations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: city_event_tracks city_event_tracks_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_event_tracks
    ADD CONSTRAINT city_event_tracks_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: city_event_tracks city_event_tracks_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_event_tracks
    ADD CONSTRAINT city_event_tracks_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.city_events(id) ON DELETE CASCADE;


--
-- Name: city_event_votes city_event_votes_event_id_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_event_votes
    ADD CONSTRAINT city_event_votes_event_id_track_id_fkey FOREIGN KEY (event_id, track_id) REFERENCES public.city_event_tracks(event_id, track_id) ON DELETE CASCADE;


--
-- Name: city_event_votes city_event_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_event_votes
    ADD CONSTRAINT city_event_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: city_event_winners city_event_winners_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_event_winners
    ADD CONSTRAINT city_event_winners_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.city_events(id) ON DELETE CASCADE;


--
-- Name: city_event_winners city_event_winners_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_event_winners
    ADD CONSTRAINT city_event_winners_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: city_user_rewards city_user_rewards_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_user_rewards
    ADD CONSTRAINT city_user_rewards_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.city_events(id) ON DELETE CASCADE;


--
-- Name: city_user_rewards city_user_rewards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.city_user_rewards
    ADD CONSTRAINT city_user_rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: comment_likes comment_likes_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comment_likes comment_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: comment_reactions comment_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT comment_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: comments comments_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE CASCADE;


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: conversation_participants conversation_participants_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_participants conversation_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: conversation_realtime_events conversation_realtime_events_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_realtime_events
    ADD CONSTRAINT conversation_realtime_events_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_realtime_events conversation_realtime_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_realtime_events
    ADD CONSTRAINT conversation_realtime_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: conversation_rooms conversation_rooms_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_rooms
    ADD CONSTRAINT conversation_rooms_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_rooms conversation_rooms_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_rooms
    ADD CONSTRAINT conversation_rooms_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: creator_posts creator_posts_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creator_posts
    ADD CONSTRAINT creator_posts_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: creator_posts creator_posts_original_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creator_posts
    ADD CONSTRAINT creator_posts_original_post_id_fkey FOREIGN KEY (original_post_id) REFERENCES public.creator_posts(id) ON DELETE SET NULL;


--
-- Name: credit_ledger credit_ledger_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_ledger
    ADD CONSTRAINT credit_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: editorial_collections editorial_collections_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.editorial_collections
    ADD CONSTRAINT editorial_collections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: editorial_collections editorial_collections_playlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.editorial_collections
    ADD CONSTRAINT editorial_collections_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE CASCADE;


--
-- Name: faq_votes faq_votes_faq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faq_votes
    ADD CONSTRAINT faq_votes_faq_id_fkey FOREIGN KEY (faq_id) REFERENCES public.faq_items(id) ON DELETE CASCADE;


--
-- Name: faq_votes faq_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faq_votes
    ADD CONSTRAINT faq_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: follow_requests follow_requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follow_requests
    ADD CONSTRAINT follow_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: follow_requests follow_requests_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follow_requests
    ADD CONSTRAINT follow_requests_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: forum_post_likes forum_post_likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_post_likes
    ADD CONSTRAINT forum_post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.forum_posts(id) ON DELETE CASCADE;


--
-- Name: forum_post_likes forum_post_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_post_likes
    ADD CONSTRAINT forum_post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: forum_posts forum_posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_posts
    ADD CONSTRAINT forum_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: forum_replies forum_replies_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_replies
    ADD CONSTRAINT forum_replies_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.forum_posts(id) ON DELETE CASCADE;


--
-- Name: forum_replies forum_replies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_replies
    ADD CONSTRAINT forum_replies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: forum_reply_likes forum_reply_likes_reply_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_reply_likes
    ADD CONSTRAINT forum_reply_likes_reply_id_fkey FOREIGN KEY (reply_id) REFERENCES public.forum_replies(id) ON DELETE CASCADE;


--
-- Name: forum_reply_likes forum_reply_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_reply_likes
    ADD CONSTRAINT forum_reply_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: friendships friendships_friend_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_friend_id_fkey FOREIGN KEY (friend_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: friendships friendships_source_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_source_request_id_fkey FOREIGN KEY (source_request_id) REFERENCES public.message_requests(id) ON DELETE SET NULL;


--
-- Name: friendships friendships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: message_attachments message_attachments_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: message_attachments message_attachments_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_hidden_users message_hidden_users_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_hidden_users
    ADD CONSTRAINT message_hidden_users_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_hidden_users message_hidden_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_hidden_users
    ADD CONSTRAINT message_hidden_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: message_pins message_pins_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_pins
    ADD CONSTRAINT message_pins_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: message_pins message_pins_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_pins
    ADD CONSTRAINT message_pins_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_pins message_pins_pinned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_pins
    ADD CONSTRAINT message_pins_pinned_by_fkey FOREIGN KEY (pinned_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: message_reactions message_reactions_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: message_reactions message_reactions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_reactions message_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.conversation_rooms(id) ON DELETE SET NULL;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: meteo_alerts meteo_alerts_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_alerts
    ADD CONSTRAINT meteo_alerts_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.meteo_team_members(id);


--
-- Name: meteo_bulletins meteo_bulletins_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_bulletins
    ADD CONSTRAINT meteo_bulletins_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: meteo_comments meteo_comments_bulletin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_comments
    ADD CONSTRAINT meteo_comments_bulletin_id_fkey FOREIGN KEY (bulletin_id) REFERENCES public.meteo_bulletins(id) ON DELETE CASCADE;


--
-- Name: meteo_comments meteo_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_comments
    ADD CONSTRAINT meteo_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.meteo_comments(id) ON DELETE CASCADE;


--
-- Name: meteo_comments meteo_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_comments
    ADD CONSTRAINT meteo_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: meteo_reactions meteo_reactions_bulletin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_reactions
    ADD CONSTRAINT meteo_reactions_bulletin_id_fkey FOREIGN KEY (bulletin_id) REFERENCES public.meteo_bulletins(id) ON DELETE CASCADE;


--
-- Name: meteo_reactions meteo_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_reactions
    ADD CONSTRAINT meteo_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: meteo_settings meteo_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_settings
    ADD CONSTRAINT meteo_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: meteo_team_members meteo_team_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_team_members
    ADD CONSTRAINT meteo_team_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);


--
-- Name: meteo_team_members meteo_team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_team_members
    ADD CONSTRAINT meteo_team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: meteo_views meteo_views_bulletin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meteo_views
    ADD CONSTRAINT meteo_views_bulletin_id_fkey FOREIGN KEY (bulletin_id) REFERENCES public.meteo_bulletins(id) ON DELETE CASCADE;


--
-- Name: missions missions_reward_booster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_reward_booster_id_fkey FOREIGN KEY (reward_booster_id) REFERENCES public.boosters(id) ON DELETE SET NULL;


--
-- Name: music_clips music_clips_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.music_clips
    ADD CONSTRAINT music_clips_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: password_resets password_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: play_stats play_stats_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.play_stats
    ADD CONSTRAINT play_stats_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE CASCADE;


--
-- Name: play_stats play_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.play_stats
    ADD CONSTRAINT play_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: playlist_tracks playlist_tracks_playlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.playlist_tracks
    ADD CONSTRAINT playlist_tracks_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE CASCADE;


--
-- Name: playlist_tracks playlist_tracks_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.playlist_tracks
    ADD CONSTRAINT playlist_tracks_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE CASCADE;


--
-- Name: playlists playlists_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: post_comments post_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.creator_posts(id) ON DELETE CASCADE;


--
-- Name: post_comments post_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: post_likes post_likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.creator_posts(id) ON DELETE CASCADE;


--
-- Name: post_likes post_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.profiles(id);


--
-- Name: referrals referrals_referred_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.profiles(id);


--
-- Name: referrals referrals_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.profiles(id);


--
-- Name: star_academy_applications star_academy_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.star_academy_applications
    ADD CONSTRAINT star_academy_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: star_academy_staff_applications star_academy_staff_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.star_academy_staff_applications
    ADD CONSTRAINT star_academy_staff_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: track_likes track_likes_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_likes
    ADD CONSTRAINT track_likes_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE CASCADE;


--
-- Name: track_likes track_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_likes
    ADD CONSTRAINT track_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: track_remixes track_remixes_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_remixes
    ADD CONSTRAINT track_remixes_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.music_challenges(id) ON DELETE SET NULL;


--
-- Name: track_views track_views_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_views
    ADD CONSTRAINT track_views_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE CASCADE;


--
-- Name: track_views track_views_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_views
    ADD CONSTRAINT track_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tracks tracks_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tracks tracks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_blocks user_blocks_blocked_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_blocks user_blocks_blocker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_booster_daily user_booster_daily_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_booster_daily
    ADD CONSTRAINT user_booster_daily_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_booster_open_history user_booster_open_history_booster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_booster_open_history
    ADD CONSTRAINT user_booster_open_history_booster_id_fkey FOREIGN KEY (booster_id) REFERENCES public.boosters(id) ON DELETE SET NULL;


--
-- Name: user_booster_open_history user_booster_open_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_booster_open_history
    ADD CONSTRAINT user_booster_open_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_booster_pack_claims user_booster_pack_claims_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_booster_pack_claims
    ADD CONSTRAINT user_booster_pack_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_booster_pity user_booster_pity_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_booster_pity
    ADD CONSTRAINT user_booster_pity_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_boosters user_boosters_booster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_boosters
    ADD CONSTRAINT user_boosters_booster_id_fkey FOREIGN KEY (booster_id) REFERENCES public.boosters(id) ON DELETE RESTRICT;


--
-- Name: user_boosters user_boosters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_boosters
    ADD CONSTRAINT user_boosters_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_daily_spin_history user_daily_spin_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_daily_spin_history
    ADD CONSTRAINT user_daily_spin_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_daily_spin user_daily_spin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_daily_spin
    ADD CONSTRAINT user_daily_spin_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_follows user_follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT user_follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_follows user_follows_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT user_follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_missions user_missions_mission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_missions
    ADD CONSTRAINT user_missions_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON DELETE CASCADE;


--
-- Name: user_missions user_missions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_missions
    ADD CONSTRAINT user_missions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_quotas user_quotas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_quotas
    ADD CONSTRAINT user_quotas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: account_private Account owners can create private data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Account owners can create private data" ON public.account_private FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (COALESCE(( SELECT (auth.jwt() ->> 'aal'::text)), 'aal1'::text) = 'aal2'::text)));


--
-- Name: account_private Account owners can read private data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Account owners can read private data" ON public.account_private FOR SELECT TO authenticated USING (((( SELECT auth.uid() AS uid) = user_id) AND (COALESCE(( SELECT (auth.jwt() ->> 'aal'::text)), 'aal1'::text) = 'aal2'::text)));


--
-- Name: account_private Account owners can update private data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Account owners can update private data" ON public.account_private FOR UPDATE TO authenticated USING (((( SELECT auth.uid() AS uid) = user_id) AND (COALESCE(( SELECT (auth.jwt() ->> 'aal'::text)), 'aal1'::text) = 'aal2'::text))) WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (COALESCE(( SELECT (auth.jwt() ->> 'aal'::text)), 'aal1'::text) = 'aal2'::text)));


--
-- Name: waiting_list Allow public insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public insert" ON public.waiting_list FOR INSERT WITH CHECK (true);


--
-- Name: waiting_list Allow public read access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public read access" ON public.waiting_list FOR SELECT USING (true);


--
-- Name: city_event_tracks City event tracks are server managed; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "City event tracks are server managed" ON public.city_event_tracks TO anon, authenticated USING (false) WITH CHECK (false);


--
-- Name: city_events City events are server managed; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "City events are server managed" ON public.city_events TO anon, authenticated USING (false) WITH CHECK (false);


--
-- Name: city_event_participations City participations are server managed; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "City participations are server managed" ON public.city_event_participations TO anon, authenticated USING (false) WITH CHECK (false);


--
-- Name: city_user_rewards City rewards are server managed; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "City rewards are server managed" ON public.city_user_rewards TO anon, authenticated USING (false) WITH CHECK (false);


--
-- Name: city_event_votes City votes are server managed; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "City votes are server managed" ON public.city_event_votes TO anon, authenticated USING (false) WITH CHECK (false);


--
-- Name: city_event_winners City winners are server managed; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "City winners are server managed" ON public.city_event_winners TO anon, authenticated USING (false) WITH CHECK (false);


--
-- Name: comment_likes Comment likes are viewable by everyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Comment likes are viewable by everyone" ON public.comment_likes FOR SELECT USING (true);


--
-- Name: comments Comments are viewable by everyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);


--
-- Name: conversation_rooms Conversation managers can create rooms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Conversation managers can create rooms" ON public.conversation_rooms FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.conversation_participants participant
  WHERE ((participant.conversation_id = conversation_rooms.conversation_id) AND (participant.user_id = ( SELECT auth.uid() AS uid)) AND (participant.role = ANY (ARRAY['owner'::text, 'moderator'::text]))))));


--
-- Name: conversation_rooms Conversation managers can delete rooms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Conversation managers can delete rooms" ON public.conversation_rooms FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.conversation_participants participant
  WHERE ((participant.conversation_id = conversation_rooms.conversation_id) AND (participant.user_id = ( SELECT auth.uid() AS uid)) AND (participant.role = ANY (ARRAY['owner'::text, 'moderator'::text]))))));


--
-- Name: conversation_rooms Conversation managers can update rooms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Conversation managers can update rooms" ON public.conversation_rooms FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.conversation_participants participant
  WHERE ((participant.conversation_id = conversation_rooms.conversation_id) AND (participant.user_id = ( SELECT auth.uid() AS uid)) AND (participant.role = ANY (ARRAY['owner'::text, 'moderator'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.conversation_participants participant
  WHERE ((participant.conversation_id = conversation_rooms.conversation_id) AND (participant.user_id = ( SELECT auth.uid() AS uid)) AND (participant.role = ANY (ARRAY['owner'::text, 'moderator'::text]))))));


--
-- Name: message_pins Conversation members can pin messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Conversation members can pin messages" ON public.message_pins FOR INSERT TO authenticated WITH CHECK (((pinned_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.conversation_participants participant
  WHERE ((participant.conversation_id = message_pins.conversation_id) AND (participant.user_id = ( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
   FROM public.messages message
  WHERE ((message.id = message_pins.message_id) AND (message.conversation_id = message_pins.conversation_id))))));


--
-- Name: conversation_realtime_events Conversation members can publish ephemeral events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Conversation members can publish ephemeral events" ON public.conversation_realtime_events FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (expires_at > now()) AND (expires_at <= (now() + '00:02:00'::interval)) AND synaura_private.is_conversation_member(conversation_id)));


--
-- Name: message_reactions Conversation members can react; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Conversation members can react" ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND synaura_private.is_conversation_member(conversation_id)));


--
-- Name: message_attachments Conversation members can read attachments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Conversation members can read attachments" ON public.message_attachments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.messages message
     JOIN public.conversation_participants participant ON ((participant.conversation_id = message.conversation_id)))
  WHERE ((message.id = message_attachments.message_id) AND (participant.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: conversations Conversation members can read conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Conversation members can read conversations" ON public.conversations FOR SELECT TO authenticated USING (synaura_private.is_conversation_member(id));


--
-- Name: conversation_realtime_events Conversation members can read ephemeral events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Conversation members can read ephemeral events" ON public.conversation_realtime_events FOR SELECT TO authenticated USING (((expires_at > now()) AND synaura_private.is_conversation_member(conversation_id)));


--
-- Name: conversation_participants Conversation members can read participants; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Conversation members can read participants" ON public.conversation_participants FOR SELECT TO authenticated USING (synaura_private.is_conversation_member(conversation_id));


--
-- Name: message_pins Conversation members can read pins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Conversation members can read pins" ON public.message_pins FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.conversation_participants participant
  WHERE ((participant.conversation_id = message_pins.conversation_id) AND (participant.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: message_reactions Conversation members can read reactions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Conversation members can read reactions" ON public.message_reactions FOR SELECT TO authenticated USING (synaura_private.is_conversation_member(conversation_id));


--
-- Name: conversation_rooms Conversation members can read rooms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Conversation members can read rooms" ON public.conversation_rooms FOR SELECT TO authenticated USING (synaura_private.is_conversation_member(conversation_id));


--
-- Name: messages Conversation members can send messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Conversation members can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = sender_id) AND (EXISTS ( SELECT 1
   FROM public.conversation_participants participant
  WHERE ((participant.conversation_id = messages.conversation_id) AND (participant.user_id = ( SELECT auth.uid() AS uid))))) AND ((room_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.conversation_rooms room
  WHERE ((room.id = messages.room_id) AND (room.conversation_id = messages.conversation_id)))))));


--
-- Name: message_pins Conversation members can unpin messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Conversation members can unpin messages" ON public.message_pins FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.conversation_participants participant
  WHERE ((participant.conversation_id = message_pins.conversation_id) AND (participant.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: message_requests Creer des demandes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Creer des demandes" ON public.message_requests FOR INSERT TO authenticated WITH CHECK ((requester_id = ( SELECT auth.uid() AS uid)));


--
-- Name: tracks Créateur peut modifier sa piste; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Créateur peut modifier sa piste" ON public.tracks FOR UPDATE USING ((auth.uid() = creator_id));


--
-- Name: playlists Créateur peut modifier sa playlist; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Créateur peut modifier sa playlist" ON public.playlists FOR UPDATE USING ((auth.uid() = creator_id));


--
-- Name: tracks Créateur peut supprimer sa piste; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Créateur peut supprimer sa piste" ON public.tracks FOR DELETE USING ((auth.uid() = creator_id));


--
-- Name: playlists Créateur peut supprimer sa playlist; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Créateur peut supprimer sa playlist" ON public.playlists FOR DELETE USING ((auth.uid() = creator_id));


--
-- Name: faq_items FAQ items are manageable by authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "FAQ items are manageable by authenticated users" ON public.faq_items USING ((auth.uid() IS NOT NULL));


--
-- Name: faq_items FAQ items are viewable by everyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "FAQ items are viewable by everyone" ON public.faq_items FOR SELECT USING ((is_published = true));


--
-- Name: faq_votes FAQ votes are viewable by everyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "FAQ votes are viewable by everyone" ON public.faq_votes FOR SELECT USING (true);


--
-- Name: forum_post_likes Forum post likes are viewable by everyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Forum post likes are viewable by everyone" ON public.forum_post_likes FOR SELECT USING (true);


--
-- Name: forum_posts Forum posts are viewable by everyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Forum posts are viewable by everyone" ON public.forum_posts FOR SELECT USING (true);


--
-- Name: forum_replies Forum replies are viewable by everyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Forum replies are viewable by everyone" ON public.forum_replies FOR SELECT USING (true);


--
-- Name: forum_reply_likes Forum reply likes are viewable by everyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Forum reply likes are viewable by everyone" ON public.forum_reply_likes FOR SELECT USING (true);


--
-- Name: message_attachments Message senders can attach media; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Message senders can attach media" ON public.message_attachments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.messages message
  WHERE ((message.id = message_attachments.message_id) AND (message.sender_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: message_requests Modifier ses demandes recues; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Modifier ses demandes recues" ON public.message_requests FOR UPDATE TO authenticated USING ((target_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((target_id = ( SELECT auth.uid() AS uid)));


--
-- Name: music_challenges Music challenges are public; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Music challenges are public" ON public.music_challenges FOR SELECT USING ((starts_at <= now()));


--
-- Name: tracks Pistes publiques visibles par tous; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Pistes publiques visibles par tous" ON public.tracks FOR SELECT USING ((is_public = true));


--
-- Name: playlists Playlists publiques visibles par tous; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Playlists publiques visibles par tous" ON public.playlists FOR SELECT USING ((is_public = true));


--
-- Name: profiles Profils visibles par tous; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Profils visibles par tous" ON public.profiles FOR SELECT USING (true);


--
-- Name: editorial_collections Published editorial collections are public; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Published editorial collections are public" ON public.editorial_collections FOR SELECT TO anon, authenticated USING ((is_published = true));


--
-- Name: admin_broadcasts Service role full access broadcasts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role full access broadcasts" ON public.admin_broadcasts USING ((auth.role() = 'service_role'::text));


--
-- Name: notifications Service role full access notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role full access notifications" ON public.notifications USING ((auth.role() = 'service_role'::text));


--
-- Name: notification_preferences Service role full access prefs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role full access prefs" ON public.notification_preferences USING ((auth.role() = 'service_role'::text));


--
-- Name: push_subscriptions Service role full access push; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role full access push" ON public.push_subscriptions TO service_role USING (true) WITH CHECK (true);


--
-- Name: tracks Tracks are viewable by everyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tracks are viewable by everyone" ON public.tracks FOR SELECT USING (true);


--
-- Name: comments Users can create comments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create comments" ON public.comments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: forum_posts Users can create forum posts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create forum posts" ON public.forum_posts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: forum_replies Users can create forum replies; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create forum replies" ON public.forum_replies FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_generations Users can create own ai generations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create own ai generations" ON public.ai_generations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_blocks Users can create their blocks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create their blocks" ON public.user_blocks FOR INSERT TO authenticated WITH CHECK ((blocker_id = ( SELECT auth.uid() AS uid)));


--
-- Name: ai_generations Users can delete own ai generations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own ai generations" ON public.ai_generations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can delete own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: comments Users can delete their own comments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: forum_posts Users can delete their own forum posts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own forum posts" ON public.forum_posts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: forum_replies Users can delete their own forum replies; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own forum replies" ON public.forum_replies FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ai_generations Users can delete their own generations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own generations" ON public.ai_generations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ai_track_likes Users can delete their own likes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own likes" ON public.ai_track_likes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: track_likes Users can delete their own likes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own likes" ON public.track_likes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ai_playlists Users can delete their own playlists; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own playlists" ON public.ai_playlists FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: tracks Users can delete their own tracks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own tracks" ON public.tracks FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ai_tracks Users can delete tracks from their generations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete tracks from their generations" ON public.ai_tracks FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.ai_generations
  WHERE ((ai_generations.id = ai_tracks.generation_id) AND (ai_generations.user_id = auth.uid())))));


--
-- Name: ai_playlist_tracks Users can delete tracks from their playlists; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete tracks from their playlists" ON public.ai_playlist_tracks FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.ai_playlists
  WHERE ((ai_playlists.id = ai_playlist_tracks.playlist_id) AND (ai_playlists.user_id = auth.uid())))));


--
-- Name: message_hidden_users Users can hide messages for themselves; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can hide messages for themselves" ON public.message_hidden_users FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (public.messages message
     JOIN public.conversation_participants participant ON ((participant.conversation_id = message.conversation_id)))
  WHERE ((message.id = message_hidden_users.message_id) AND (participant.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: notification_preferences Users can insert own preferences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own preferences" ON public.notification_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_generations Users can insert their own generations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own generations" ON public.ai_generations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_track_likes Users can insert their own likes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own likes" ON public.ai_track_likes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: track_likes Users can insert their own likes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own likes" ON public.track_likes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_playlists Users can insert their own playlists; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own playlists" ON public.ai_playlists FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_quotas Users can insert their own quota; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own quota" ON public.user_quotas FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_usage_stats Users can insert their own stats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own stats" ON public.ai_usage_stats FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: tracks Users can insert their own tracks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own tracks" ON public.tracks FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: track_views Users can insert their own views; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own views" ON public.track_views FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_tracks Users can insert tracks for their generations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert tracks for their generations" ON public.ai_tracks FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.ai_generations
  WHERE ((ai_generations.id = ai_tracks.generation_id) AND (ai_generations.user_id = auth.uid())))));


--
-- Name: ai_playlist_tracks Users can insert tracks in their playlists; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert tracks in their playlists" ON public.ai_playlist_tracks FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.ai_playlists
  WHERE ((ai_playlists.id = ai_playlist_tracks.playlist_id) AND (ai_playlists.user_id = auth.uid())))));


--
-- Name: ai_tracks Users can insert tracks to their generations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert tracks to their generations" ON public.ai_tracks FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.ai_generations
  WHERE ((ai_generations.id = ai_tracks.generation_id) AND (ai_generations.user_id = auth.uid())))));


--
-- Name: comment_likes Users can like comments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can like comments" ON public.comment_likes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: faq_votes Users can manage their own FAQ votes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own FAQ votes" ON public.faq_votes USING ((auth.uid() = user_id));


--
-- Name: forum_post_likes Users can manage their own post likes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own post likes" ON public.forum_post_likes USING ((auth.uid() = user_id));


--
-- Name: forum_reply_likes Users can manage their own reply likes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own reply likes" ON public.forum_reply_likes USING ((auth.uid() = user_id));


--
-- Name: notifications Users can read own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notification_preferences Users can read own preferences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own preferences" ON public.notification_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_blocks Users can read their blocks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read their blocks" ON public.user_blocks FOR SELECT TO authenticated USING ((blocker_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_daily_spin Users can read their daily spin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read their daily spin" ON public.user_daily_spin FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_daily_spin_history Users can read their daily spin history; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read their daily spin history" ON public.user_daily_spin_history FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: friendships Users can read their friendships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read their friendships" ON public.friendships FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR (friend_id = ( SELECT auth.uid() AS uid))));


--
-- Name: message_hidden_users Users can read their hidden messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read their hidden messages" ON public.message_hidden_users FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_blocks Users can remove their blocks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can remove their blocks" ON public.user_blocks FOR DELETE TO authenticated USING ((blocker_id = ( SELECT auth.uid() AS uid)));


--
-- Name: friendships Users can remove their friendships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can remove their friendships" ON public.friendships FOR DELETE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR (friend_id = ( SELECT auth.uid() AS uid))));


--
-- Name: message_reactions Users can remove their reactions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can remove their reactions" ON public.message_reactions FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: message_hidden_users Users can restore their hidden messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can restore their hidden messages" ON public.message_hidden_users FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: comment_likes Users can unlike their own likes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can unlike their own likes" ON public.comment_likes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ai_generations Users can update own ai generations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own ai generations" ON public.ai_generations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notification_preferences Users can update own preferences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own preferences" ON public.notification_preferences FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: comments Users can update their own comments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: forum_posts Users can update their own forum posts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own forum posts" ON public.forum_posts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: forum_replies Users can update their own forum replies; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own forum replies" ON public.forum_replies FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: ai_generations Users can update their own generations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own generations" ON public.ai_generations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: ai_playlists Users can update their own playlists; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own playlists" ON public.ai_playlists FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_quotas Users can update their own quota; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own quota" ON public.user_quotas FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: ai_usage_stats Users can update their own stats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own stats" ON public.ai_usage_stats FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: ai_tracks Users can update their own tracks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own tracks" ON public.ai_tracks FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.ai_generations
  WHERE ((ai_generations.id = ai_tracks.generation_id) AND (ai_generations.user_id = auth.uid())))));


--
-- Name: tracks Users can update their own tracks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own tracks" ON public.tracks FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: ai_tracks Users can update tracks from their generations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update tracks from their generations" ON public.ai_tracks FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.ai_generations
  WHERE ((ai_generations.id = ai_tracks.generation_id) AND (ai_generations.user_id = auth.uid())))));


--
-- Name: ai_track_likes Users can view all likes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view all likes" ON public.ai_track_likes FOR SELECT USING (true);


--
-- Name: track_likes Users can view all likes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view all likes" ON public.track_likes FOR SELECT USING (true);


--
-- Name: track_views Users can view all views; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view all views" ON public.track_views FOR SELECT USING (true);


--
-- Name: ai_generations Users can view own ai generations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own ai generations" ON public.ai_generations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_generations Users can view their own generations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own generations" ON public.ai_generations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_playlists Users can view their own playlists; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own playlists" ON public.ai_playlists FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_quotas Users can view their own quota; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own quota" ON public.user_quotas FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_usage_stats Users can view their own stats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own stats" ON public.ai_usage_stats FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_tracks Users can view tracks from their generations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view tracks from their generations" ON public.ai_tracks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.ai_generations
  WHERE ((ai_generations.id = ai_tracks.generation_id) AND (ai_generations.user_id = auth.uid())))));


--
-- Name: ai_playlist_tracks Users can view tracks in their playlists; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view tracks in their playlists" ON public.ai_playlist_tracks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.ai_playlists
  WHERE ((ai_playlists.id = ai_playlist_tracks.playlist_id) AND (ai_playlists.user_id = auth.uid())))));


--
-- Name: tracks Utilisateur peut créer des pistes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Utilisateur peut créer des pistes" ON public.tracks FOR INSERT WITH CHECK ((auth.uid() = creator_id));


--
-- Name: subscriptions Utilisateur peut modifier son abonnement; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Utilisateur peut modifier son abonnement" ON public.subscriptions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Utilisateur peut modifier son profil; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Utilisateur peut modifier son profil" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: profiles Utilisateur peut supprimer son profil; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Utilisateur peut supprimer son profil" ON public.profiles FOR DELETE USING ((auth.uid() = id));


--
-- Name: messages Utilisateur peut voir les messages de ses conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Utilisateur peut voir les messages de ses conversations" ON public.messages FOR SELECT TO authenticated USING (synaura_private.is_conversation_member(conversation_id));


--
-- Name: subscriptions Utilisateur peut voir son abonnement; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Utilisateur peut voir son abonnement" ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: message_requests Voir ses demandes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Voir ses demandes" ON public.message_requests FOR SELECT TO authenticated USING (((requester_id = ( SELECT auth.uid() AS uid)) OR (target_id = ( SELECT auth.uid() AS uid))));


--
-- Name: account_private; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.account_private ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_broadcasts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_credit_balances; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_credit_balances ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_generations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_playlist_tracks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_playlist_tracks ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_playlists; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_playlists ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_track_likes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_track_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_tracks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_tracks ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_usage_stats; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_usage_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets anyone_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY anyone_insert ON public.support_tickets FOR INSERT WITH CHECK (true);


--
-- Name: challenge_entries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.challenge_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: city_event_participations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.city_event_participations ENABLE ROW LEVEL SECURITY;

--
-- Name: city_event_tracks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.city_event_tracks ENABLE ROW LEVEL SECURITY;

--
-- Name: city_event_votes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.city_event_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: city_event_winners; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.city_event_winners ENABLE ROW LEVEL SECURITY;

--
-- Name: city_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.city_events ENABLE ROW LEVEL SECURITY;

--
-- Name: city_user_rewards; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.city_user_rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: comment_likes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_participants; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_realtime_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.conversation_realtime_events ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_rooms; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.conversation_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: creator_posts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.creator_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_ledger; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: editorial_collections; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.editorial_collections ENABLE ROW LEVEL SECURITY;

--
-- Name: friendships; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

--
-- Name: track_likes likes_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY likes_delete_own ON public.track_likes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: track_likes likes_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY likes_insert_own ON public.track_likes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: track_likes likes_select_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY likes_select_all ON public.track_likes FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: message_attachments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: message_hidden_users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.message_hidden_users ENABLE ROW LEVEL SECURITY;

--
-- Name: message_pins; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.message_pins ENABLE ROW LEVEL SECURITY;

--
-- Name: message_reactions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: message_requests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: meteo_bulletins; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.meteo_bulletins ENABLE ROW LEVEL SECURITY;

--
-- Name: meteo_bulletins meteo_bulletins_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY meteo_bulletins_policy ON public.meteo_bulletins USING ((EXISTS ( SELECT 1
   FROM auth.users
  WHERE ((users.id = meteo_bulletins.author_id) AND ((users.email)::text = 'alertempsfrance@gmail.com'::text)))));


--
-- Name: music_challenges; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.music_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: music_clips; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.music_clips ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: playlists; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

--
-- Name: post_comments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: post_comments post_comments_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY post_comments_delete ON public.post_comments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: post_comments post_comments_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY post_comments_insert ON public.post_comments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: post_comments post_comments_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY post_comments_select ON public.post_comments FOR SELECT USING (true);


--
-- Name: post_likes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: post_likes post_likes_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY post_likes_delete ON public.post_likes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: post_likes post_likes_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY post_likes_insert ON public.post_likes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: post_likes post_likes_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY post_likes_select ON public.post_likes FOR SELECT USING (true);


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions push_subs_own_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY push_subs_own_read ON public.push_subscriptions FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_credit_balances read_own_ai_credits; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY read_own_ai_credits ON public.ai_credit_balances FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: credit_ledger read_own_ledger; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY read_own_ledger ON public.credit_ledger FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: referrals read_own_referrals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY read_own_referrals ON public.referrals FOR SELECT USING (((auth.uid() = referrer_id) OR (auth.uid() = referred_id)));


--
-- Name: recommendation_impressions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.recommendation_impressions ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: star_academy_config sa_config_public_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sa_config_public_read ON public.star_academy_config FOR SELECT USING (true);


--
-- Name: star_academy_config sa_config_service_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sa_config_service_write ON public.star_academy_config USING ((auth.role() = 'service_role'::text));


--
-- Name: star_academy_applications sa_own_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sa_own_read ON public.star_academy_applications FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: star_academy_applications sa_public_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sa_public_insert ON public.star_academy_applications FOR INSERT WITH CHECK (true);


--
-- Name: star_academy_applications sa_service_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sa_service_all ON public.star_academy_applications USING ((auth.role() = 'service_role'::text));


--
-- Name: star_academy_staff_applications sa_staff_own_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sa_staff_own_read ON public.star_academy_staff_applications FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: star_academy_staff_applications sa_staff_public_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sa_staff_public_insert ON public.star_academy_staff_applications FOR INSERT WITH CHECK (true);


--
-- Name: star_academy_staff_applications sa_staff_service_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sa_staff_service_all ON public.star_academy_staff_applications USING ((auth.role() = 'service_role'::text));


--
-- Name: support_tickets service_role_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY service_role_all ON public.support_tickets USING ((auth.role() = 'service_role'::text));


--
-- Name: star_academy_applications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.star_academy_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: star_academy_config; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.star_academy_config ENABLE ROW LEVEL SECURITY;

--
-- Name: star_academy_staff_applications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.star_academy_staff_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: track_stats stats_select_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stats_select_all ON public.track_stats FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: synaura_tv_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.synaura_tv_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: track_likes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.track_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: track_moment_reactions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.track_moment_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: track_remixes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.track_remixes ENABLE ROW LEVEL SECURITY;

--
-- Name: track_remixes track_remixes_creator_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY track_remixes_creator_select ON public.track_remixes FOR SELECT USING ((auth.uid() = creator_id));


--
-- Name: track_remixes track_remixes_public_published_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY track_remixes_public_published_select ON public.track_remixes FOR SELECT USING ((status = 'published'::text));


--
-- Name: track_stats; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.track_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: track_views; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.track_views ENABLE ROW LEVEL SECURITY;

--
-- Name: track_waveforms; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.track_waveforms ENABLE ROW LEVEL SECURITY;

--
-- Name: tracks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

--
-- Name: user_blocks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: user_daily_spin; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_daily_spin ENABLE ROW LEVEL SECURITY;

--
-- Name: user_daily_spin_history; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_daily_spin_history ENABLE ROW LEVEL SECURITY;

--
-- Name: user_quotas; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

--
-- Name: track_views views_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY views_insert_own ON public.track_views FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: track_views views_select_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY views_select_all ON public.track_views FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: waiting_list; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: supabase_admin
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime_messages_publication OWNER TO supabase_admin;

--
-- Name: supabase_realtime conversation_participants; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.conversation_participants;


--
-- Name: supabase_realtime conversation_realtime_events; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.conversation_realtime_events;


--
-- Name: supabase_realtime conversation_rooms; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.conversation_rooms;


--
-- Name: supabase_realtime conversations; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.conversations;


--
-- Name: supabase_realtime friendships; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.friendships;


--
-- Name: supabase_realtime message_attachments; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.message_attachments;


--
-- Name: supabase_realtime message_pins; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.message_pins;


--
-- Name: supabase_realtime message_reactions; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.message_reactions;


--
-- Name: supabase_realtime message_requests; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.message_requests;


--
-- Name: supabase_realtime messages; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.messages;


--
-- Name: supabase_realtime track_likes; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.track_likes;


--
-- Name: supabase_realtime track_views; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.track_views;


--
-- Name: supabase_realtime tracks; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.tracks;


--
-- Name: supabase_realtime user_blocks; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.user_blocks;


--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: supabase_admin
--

ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE ONLY realtime.messages;


--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO dashboard_user;
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT USAGE ON SCHEMA auth TO synaura_app;


--
-- Name: SCHEMA extensions; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT ALL ON SCHEMA extensions TO dashboard_user;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO synaura_app;


--
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA realtime TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA realtime TO anon;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO service_role;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;


--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA storage TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA storage TO dashboard_user;


--
-- Name: SCHEMA synaura_private; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA synaura_private TO authenticated;


--
-- Name: SCHEMA vault; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA vault TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA vault TO service_role;


--
-- Name: FUNCTION gtrgm_in(cstring); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_in(cstring) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_in(cstring) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_in(cstring) TO service_role;
GRANT ALL ON FUNCTION public.gtrgm_in(cstring) TO synaura_app;


--
-- Name: FUNCTION gtrgm_out(public.gtrgm); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_out(public.gtrgm) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_out(public.gtrgm) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_out(public.gtrgm) TO service_role;
GRANT ALL ON FUNCTION public.gtrgm_out(public.gtrgm) TO synaura_app;


--
-- Name: FUNCTION email(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;
GRANT ALL ON FUNCTION auth.email() TO synaura_app;


--
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.jwt() TO postgres;
GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;
GRANT ALL ON FUNCTION auth.jwt() TO synaura_app;


--
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;
GRANT ALL ON FUNCTION auth.role() TO synaura_app;


--
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;
GRANT ALL ON FUNCTION auth.uid() TO synaura_app;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea, text[], text[]) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.crypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.dearmor(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_bytes(integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_uuid() FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text, integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_cron_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO dashboard_user;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.grant_pg_graphql_access() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION grant_pg_net_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_net_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO dashboard_user;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO dashboard_user;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_key_id(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgrst_ddl_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_ddl_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgrst_drop_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_drop_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.set_graphql_placeholder() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1mc() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v4() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_nil() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_dns() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_oid() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_url() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_x500() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;


--
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;


--
-- Name: FUNCTION _ensure_track_stats(p_track_id text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._ensure_track_stats(p_track_id text) TO anon;
GRANT ALL ON FUNCTION public._ensure_track_stats(p_track_id text) TO authenticated;
GRANT ALL ON FUNCTION public._ensure_track_stats(p_track_id text) TO service_role;
GRANT ALL ON FUNCTION public._ensure_track_stats(p_track_id text) TO synaura_app;


--
-- Name: FUNCTION ai_add_credits(p_user_id uuid, p_amount integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ai_add_credits(p_user_id uuid, p_amount integer) TO anon;
GRANT ALL ON FUNCTION public.ai_add_credits(p_user_id uuid, p_amount integer) TO authenticated;
GRANT ALL ON FUNCTION public.ai_add_credits(p_user_id uuid, p_amount integer) TO service_role;
GRANT ALL ON FUNCTION public.ai_add_credits(p_user_id uuid, p_amount integer) TO synaura_app;


--
-- Name: FUNCTION ai_add_credits(p_user_id uuid, p_amount integer, p_source text, p_description text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ai_add_credits(p_user_id uuid, p_amount integer, p_source text, p_description text) TO anon;
GRANT ALL ON FUNCTION public.ai_add_credits(p_user_id uuid, p_amount integer, p_source text, p_description text) TO authenticated;
GRANT ALL ON FUNCTION public.ai_add_credits(p_user_id uuid, p_amount integer, p_source text, p_description text) TO service_role;
GRANT ALL ON FUNCTION public.ai_add_credits(p_user_id uuid, p_amount integer, p_source text, p_description text) TO synaura_app;


--
-- Name: FUNCTION ai_debit_credits(p_user_id uuid, p_amount integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ai_debit_credits(p_user_id uuid, p_amount integer) TO anon;
GRANT ALL ON FUNCTION public.ai_debit_credits(p_user_id uuid, p_amount integer) TO authenticated;
GRANT ALL ON FUNCTION public.ai_debit_credits(p_user_id uuid, p_amount integer) TO service_role;
GRANT ALL ON FUNCTION public.ai_debit_credits(p_user_id uuid, p_amount integer) TO synaura_app;


--
-- Name: FUNCTION ai_debit_credits(p_user_id uuid, p_amount integer, p_source text, p_description text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ai_debit_credits(p_user_id uuid, p_amount integer, p_source text, p_description text) TO anon;
GRANT ALL ON FUNCTION public.ai_debit_credits(p_user_id uuid, p_amount integer, p_source text, p_description text) TO authenticated;
GRANT ALL ON FUNCTION public.ai_debit_credits(p_user_id uuid, p_amount integer, p_source text, p_description text) TO service_role;
GRANT ALL ON FUNCTION public.ai_debit_credits(p_user_id uuid, p_amount integer, p_source text, p_description text) TO synaura_app;


--
-- Name: FUNCTION ai_grant_monthly_plan_credits(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ai_grant_monthly_plan_credits() TO anon;
GRANT ALL ON FUNCTION public.ai_grant_monthly_plan_credits() TO authenticated;
GRANT ALL ON FUNCTION public.ai_grant_monthly_plan_credits() TO service_role;
GRANT ALL ON FUNCTION public.ai_grant_monthly_plan_credits() TO synaura_app;


--
-- Name: FUNCTION ai_grant_welcome_credits(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ai_grant_welcome_credits() TO anon;
GRANT ALL ON FUNCTION public.ai_grant_welcome_credits() TO authenticated;
GRANT ALL ON FUNCTION public.ai_grant_welcome_credits() TO service_role;
GRANT ALL ON FUNCTION public.ai_grant_welcome_credits() TO synaura_app;


--
-- Name: FUNCTION auto_generate_referral_code(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.auto_generate_referral_code() TO anon;
GRANT ALL ON FUNCTION public.auto_generate_referral_code() TO authenticated;
GRANT ALL ON FUNCTION public.auto_generate_referral_code() TO service_role;
GRANT ALL ON FUNCTION public.auto_generate_referral_code() TO synaura_app;


--
-- Name: FUNCTION check_user_quota(user_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_user_quota(user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.check_user_quota(user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.check_user_quota(user_uuid uuid) TO service_role;
GRANT ALL ON FUNCTION public.check_user_quota(user_uuid uuid) TO synaura_app;


--
-- Name: FUNCTION get_active_members_count(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_active_members_count() TO anon;
GRANT ALL ON FUNCTION public.get_active_members_count() TO authenticated;
GRANT ALL ON FUNCTION public.get_active_members_count() TO service_role;
GRANT ALL ON FUNCTION public.get_active_members_count() TO synaura_app;


--
-- Name: FUNCTION get_monthly_generations_count(user_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_monthly_generations_count(user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_monthly_generations_count(user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_monthly_generations_count(user_uuid uuid) TO service_role;
GRANT ALL ON FUNCTION public.get_monthly_generations_count(user_uuid uuid) TO synaura_app;


--
-- Name: FUNCTION get_user_ai_stats(user_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_ai_stats(user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_ai_stats(user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_ai_stats(user_uuid uuid) TO service_role;
GRANT ALL ON FUNCTION public.get_user_ai_stats(user_uuid uuid) TO synaura_app;


--
-- Name: FUNCTION get_user_quota_remaining(user_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_quota_remaining(user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_quota_remaining(user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_quota_remaining(user_uuid uuid) TO service_role;
GRANT ALL ON FUNCTION public.get_user_quota_remaining(user_uuid uuid) TO synaura_app;


--
-- Name: FUNCTION get_user_stats(user_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_stats(user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_stats(user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_stats(user_uuid uuid) TO service_role;
GRANT ALL ON FUNCTION public.get_user_stats(user_uuid uuid) TO synaura_app;


--
-- Name: FUNCTION gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal) TO service_role;
GRANT ALL ON FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal) TO synaura_app;


--
-- Name: FUNCTION gin_extract_value_trgm(text, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_trgm(text, internal) TO anon;
GRANT ALL ON FUNCTION public.gin_extract_value_trgm(text, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gin_extract_value_trgm(text, internal) TO service_role;
GRANT ALL ON FUNCTION public.gin_extract_value_trgm(text, internal) TO synaura_app;


--
-- Name: FUNCTION gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal) TO service_role;
GRANT ALL ON FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal) TO synaura_app;


--
-- Name: FUNCTION gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal) TO service_role;
GRANT ALL ON FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal) TO synaura_app;


--
-- Name: FUNCTION gtrgm_compress(internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_compress(internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_compress(internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_compress(internal) TO service_role;
GRANT ALL ON FUNCTION public.gtrgm_compress(internal) TO synaura_app;


--
-- Name: FUNCTION gtrgm_consistent(internal, text, smallint, oid, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal) TO service_role;
GRANT ALL ON FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal) TO synaura_app;


--
-- Name: FUNCTION gtrgm_decompress(internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_decompress(internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_decompress(internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_decompress(internal) TO service_role;
GRANT ALL ON FUNCTION public.gtrgm_decompress(internal) TO synaura_app;


--
-- Name: FUNCTION gtrgm_distance(internal, text, smallint, oid, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal) TO service_role;
GRANT ALL ON FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal) TO synaura_app;


--
-- Name: FUNCTION gtrgm_options(internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_options(internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_options(internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_options(internal) TO service_role;
GRANT ALL ON FUNCTION public.gtrgm_options(internal) TO synaura_app;


--
-- Name: FUNCTION gtrgm_penalty(internal, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_penalty(internal, internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_penalty(internal, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_penalty(internal, internal, internal) TO service_role;
GRANT ALL ON FUNCTION public.gtrgm_penalty(internal, internal, internal) TO synaura_app;


--
-- Name: FUNCTION gtrgm_picksplit(internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_picksplit(internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_picksplit(internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_picksplit(internal, internal) TO service_role;
GRANT ALL ON FUNCTION public.gtrgm_picksplit(internal, internal) TO synaura_app;


--
-- Name: FUNCTION gtrgm_same(public.gtrgm, public.gtrgm, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_same(public.gtrgm, public.gtrgm, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_same(public.gtrgm, public.gtrgm, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_same(public.gtrgm, public.gtrgm, internal) TO service_role;
GRANT ALL ON FUNCTION public.gtrgm_same(public.gtrgm, public.gtrgm, internal) TO synaura_app;


--
-- Name: FUNCTION gtrgm_union(internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_union(internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_union(internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_union(internal, internal) TO service_role;
GRANT ALL ON FUNCTION public.gtrgm_union(internal, internal) TO synaura_app;


--
-- Name: FUNCTION increment_ai_usage(user_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.increment_ai_usage(user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.increment_ai_usage(user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.increment_ai_usage(user_uuid uuid) TO service_role;
GRANT ALL ON FUNCTION public.increment_ai_usage(user_uuid uuid) TO synaura_app;


--
-- Name: FUNCTION move_profile_email_to_private(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.move_profile_email_to_private() FROM PUBLIC;
GRANT ALL ON FUNCTION public.move_profile_email_to_private() TO service_role;
GRANT ALL ON FUNCTION public.move_profile_email_to_private() TO synaura_app;


--
-- Name: FUNCTION record_track_view(p_track_id text, p_user_id uuid, p_ip_address inet, p_user_agent text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.record_track_view(p_track_id text, p_user_id uuid, p_ip_address inet, p_user_agent text) TO anon;
GRANT ALL ON FUNCTION public.record_track_view(p_track_id text, p_user_id uuid, p_ip_address inet, p_user_agent text) TO authenticated;
GRANT ALL ON FUNCTION public.record_track_view(p_track_id text, p_user_id uuid, p_ip_address inet, p_user_agent text) TO service_role;
GRANT ALL ON FUNCTION public.record_track_view(p_track_id text, p_user_id uuid, p_ip_address inet, p_user_agent text) TO synaura_app;


--
-- Name: FUNCTION require_city_battle_winner_vote(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.require_city_battle_winner_vote() TO anon;
GRANT ALL ON FUNCTION public.require_city_battle_winner_vote() TO authenticated;
GRANT ALL ON FUNCTION public.require_city_battle_winner_vote() TO service_role;
GRANT ALL ON FUNCTION public.require_city_battle_winner_vote() TO synaura_app;


--
-- Name: FUNCTION search_tracks(search_query text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.search_tracks(search_query text) TO anon;
GRANT ALL ON FUNCTION public.search_tracks(search_query text) TO authenticated;
GRANT ALL ON FUNCTION public.search_tracks(search_query text) TO service_role;
GRANT ALL ON FUNCTION public.search_tracks(search_query text) TO synaura_app;


--
-- Name: FUNCTION set_city_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.set_city_updated_at() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_city_updated_at() TO service_role;
GRANT ALL ON FUNCTION public.set_city_updated_at() TO synaura_app;


--
-- Name: FUNCTION set_limit(real); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_limit(real) TO anon;
GRANT ALL ON FUNCTION public.set_limit(real) TO authenticated;
GRANT ALL ON FUNCTION public.set_limit(real) TO service_role;
GRANT ALL ON FUNCTION public.set_limit(real) TO synaura_app;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;
GRANT ALL ON FUNCTION public.set_updated_at() TO synaura_app;


--
-- Name: FUNCTION show_limit(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.show_limit() TO anon;
GRANT ALL ON FUNCTION public.show_limit() TO authenticated;
GRANT ALL ON FUNCTION public.show_limit() TO service_role;
GRANT ALL ON FUNCTION public.show_limit() TO synaura_app;


--
-- Name: FUNCTION show_trgm(text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.show_trgm(text) TO anon;
GRANT ALL ON FUNCTION public.show_trgm(text) TO authenticated;
GRANT ALL ON FUNCTION public.show_trgm(text) TO service_role;
GRANT ALL ON FUNCTION public.show_trgm(text) TO synaura_app;


--
-- Name: FUNCTION similarity(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.similarity(text, text) TO anon;
GRANT ALL ON FUNCTION public.similarity(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.similarity(text, text) TO service_role;
GRANT ALL ON FUNCTION public.similarity(text, text) TO synaura_app;


--
-- Name: FUNCTION similarity_dist(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.similarity_dist(text, text) TO anon;
GRANT ALL ON FUNCTION public.similarity_dist(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.similarity_dist(text, text) TO service_role;
GRANT ALL ON FUNCTION public.similarity_dist(text, text) TO synaura_app;


--
-- Name: FUNCTION similarity_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.similarity_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.similarity_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.similarity_op(text, text) TO service_role;
GRANT ALL ON FUNCTION public.similarity_op(text, text) TO synaura_app;


--
-- Name: FUNCTION strict_word_similarity(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.strict_word_similarity(text, text) TO anon;
GRANT ALL ON FUNCTION public.strict_word_similarity(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.strict_word_similarity(text, text) TO service_role;
GRANT ALL ON FUNCTION public.strict_word_similarity(text, text) TO synaura_app;


--
-- Name: FUNCTION strict_word_similarity_commutator_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.strict_word_similarity_commutator_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.strict_word_similarity_commutator_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.strict_word_similarity_commutator_op(text, text) TO service_role;
GRANT ALL ON FUNCTION public.strict_word_similarity_commutator_op(text, text) TO synaura_app;


--
-- Name: FUNCTION strict_word_similarity_dist_commutator_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.strict_word_similarity_dist_commutator_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_commutator_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_commutator_op(text, text) TO service_role;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_commutator_op(text, text) TO synaura_app;


--
-- Name: FUNCTION strict_word_similarity_dist_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.strict_word_similarity_dist_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_op(text, text) TO service_role;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_op(text, text) TO synaura_app;


--
-- Name: FUNCTION strict_word_similarity_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.strict_word_similarity_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.strict_word_similarity_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.strict_word_similarity_op(text, text) TO service_role;
GRANT ALL ON FUNCTION public.strict_word_similarity_op(text, text) TO synaura_app;


--
-- Name: FUNCTION synaura_cleanup_realtime_events(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.synaura_cleanup_realtime_events() FROM PUBLIC;
GRANT ALL ON FUNCTION public.synaura_cleanup_realtime_events() TO service_role;
GRANT ALL ON FUNCTION public.synaura_cleanup_realtime_events() TO synaura_app;


--
-- Name: FUNCTION synaura_sync_message_relation(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.synaura_sync_message_relation() FROM PUBLIC;
GRANT ALL ON FUNCTION public.synaura_sync_message_relation() TO service_role;
GRANT ALL ON FUNCTION public.synaura_sync_message_relation() TO synaura_app;


--
-- Name: FUNCTION synaura_touch_conversation(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.synaura_touch_conversation() FROM PUBLIC;
GRANT ALL ON FUNCTION public.synaura_touch_conversation() TO service_role;
GRANT ALL ON FUNCTION public.synaura_touch_conversation() TO synaura_app;


--
-- Name: FUNCTION toggle_track_like(p_track_id text, p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.toggle_track_like(p_track_id text, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.toggle_track_like(p_track_id text, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.toggle_track_like(p_track_id text, p_user_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.toggle_track_like(p_track_id text, p_user_id uuid) TO synaura_app;


--
-- Name: FUNCTION touch_account_private_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.touch_account_private_updated_at() FROM PUBLIC;
GRANT ALL ON FUNCTION public.touch_account_private_updated_at() TO service_role;
GRANT ALL ON FUNCTION public.touch_account_private_updated_at() TO synaura_app;


--
-- Name: FUNCTION touch_editorial_collections_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.touch_editorial_collections_updated_at() TO anon;
GRANT ALL ON FUNCTION public.touch_editorial_collections_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.touch_editorial_collections_updated_at() TO service_role;
GRANT ALL ON FUNCTION public.touch_editorial_collections_updated_at() TO synaura_app;


--
-- Name: FUNCTION touch_music_clips_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.touch_music_clips_updated_at() TO anon;
GRANT ALL ON FUNCTION public.touch_music_clips_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.touch_music_clips_updated_at() TO service_role;
GRANT ALL ON FUNCTION public.touch_music_clips_updated_at() TO synaura_app;


--
-- Name: FUNCTION trg_track_likes_after_delete(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trg_track_likes_after_delete() TO anon;
GRANT ALL ON FUNCTION public.trg_track_likes_after_delete() TO authenticated;
GRANT ALL ON FUNCTION public.trg_track_likes_after_delete() TO service_role;
GRANT ALL ON FUNCTION public.trg_track_likes_after_delete() TO synaura_app;


--
-- Name: FUNCTION trg_track_likes_after_insert(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trg_track_likes_after_insert() TO anon;
GRANT ALL ON FUNCTION public.trg_track_likes_after_insert() TO authenticated;
GRANT ALL ON FUNCTION public.trg_track_likes_after_insert() TO service_role;
GRANT ALL ON FUNCTION public.trg_track_likes_after_insert() TO synaura_app;


--
-- Name: FUNCTION trg_track_views_after_insert(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trg_track_views_after_insert() TO anon;
GRANT ALL ON FUNCTION public.trg_track_views_after_insert() TO authenticated;
GRANT ALL ON FUNCTION public.trg_track_views_after_insert() TO service_role;
GRANT ALL ON FUNCTION public.trg_track_views_after_insert() TO synaura_app;


--
-- Name: FUNCTION trigger_update_follow_counts(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_update_follow_counts() TO anon;
GRANT ALL ON FUNCTION public.trigger_update_follow_counts() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_update_follow_counts() TO service_role;
GRANT ALL ON FUNCTION public.trigger_update_follow_counts() TO synaura_app;


--
-- Name: FUNCTION update_ai_usage_stats(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_ai_usage_stats() TO anon;
GRANT ALL ON FUNCTION public.update_ai_usage_stats() TO authenticated;
GRANT ALL ON FUNCTION public.update_ai_usage_stats() TO service_role;
GRANT ALL ON FUNCTION public.update_ai_usage_stats() TO synaura_app;


--
-- Name: FUNCTION update_comment_likes_count(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_comment_likes_count() TO anon;
GRANT ALL ON FUNCTION public.update_comment_likes_count() TO authenticated;
GRANT ALL ON FUNCTION public.update_comment_likes_count() TO service_role;
GRANT ALL ON FUNCTION public.update_comment_likes_count() TO synaura_app;


--
-- Name: FUNCTION update_follow_counts(user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_follow_counts(user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.update_follow_counts(user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.update_follow_counts(user_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.update_follow_counts(user_id uuid) TO synaura_app;


--
-- Name: FUNCTION update_forum_post_likes_count(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_forum_post_likes_count() TO anon;
GRANT ALL ON FUNCTION public.update_forum_post_likes_count() TO authenticated;
GRANT ALL ON FUNCTION public.update_forum_post_likes_count() TO service_role;
GRANT ALL ON FUNCTION public.update_forum_post_likes_count() TO synaura_app;


--
-- Name: FUNCTION update_forum_post_replies_count(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_forum_post_replies_count() TO anon;
GRANT ALL ON FUNCTION public.update_forum_post_replies_count() TO authenticated;
GRANT ALL ON FUNCTION public.update_forum_post_replies_count() TO service_role;
GRANT ALL ON FUNCTION public.update_forum_post_replies_count() TO synaura_app;


--
-- Name: FUNCTION update_forum_reply_likes_count(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_forum_reply_likes_count() TO anon;
GRANT ALL ON FUNCTION public.update_forum_reply_likes_count() TO authenticated;
GRANT ALL ON FUNCTION public.update_forum_reply_likes_count() TO service_role;
GRANT ALL ON FUNCTION public.update_forum_reply_likes_count() TO synaura_app;


--
-- Name: FUNCTION update_meteo_bulletins_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_meteo_bulletins_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_meteo_bulletins_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_meteo_bulletins_updated_at() TO service_role;
GRANT ALL ON FUNCTION public.update_meteo_bulletins_updated_at() TO synaura_app;


--
-- Name: FUNCTION update_music_challenges_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_music_challenges_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_music_challenges_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_music_challenges_updated_at() TO service_role;
GRANT ALL ON FUNCTION public.update_music_challenges_updated_at() TO synaura_app;


--
-- Name: FUNCTION update_sa_staff_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_sa_staff_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_sa_staff_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_sa_staff_updated_at() TO service_role;
GRANT ALL ON FUNCTION public.update_sa_staff_updated_at() TO synaura_app;


--
-- Name: FUNCTION update_sa_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_sa_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_sa_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_sa_updated_at() TO service_role;
GRANT ALL ON FUNCTION public.update_sa_updated_at() TO synaura_app;


--
-- Name: FUNCTION update_track_likes_count(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_track_likes_count() TO anon;
GRANT ALL ON FUNCTION public.update_track_likes_count() TO authenticated;
GRANT ALL ON FUNCTION public.update_track_likes_count() TO service_role;
GRANT ALL ON FUNCTION public.update_track_likes_count() TO synaura_app;


--
-- Name: FUNCTION update_track_views_count(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_track_views_count() TO anon;
GRANT ALL ON FUNCTION public.update_track_views_count() TO authenticated;
GRANT ALL ON FUNCTION public.update_track_views_count() TO service_role;
GRANT ALL ON FUNCTION public.update_track_views_count() TO synaura_app;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO synaura_app;


--
-- Name: FUNCTION validate_account_private_birth_date(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.validate_account_private_birth_date() FROM PUBLIC;
GRANT ALL ON FUNCTION public.validate_account_private_birth_date() TO service_role;
GRANT ALL ON FUNCTION public.validate_account_private_birth_date() TO synaura_app;


--
-- Name: FUNCTION word_similarity(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.word_similarity(text, text) TO anon;
GRANT ALL ON FUNCTION public.word_similarity(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.word_similarity(text, text) TO service_role;
GRANT ALL ON FUNCTION public.word_similarity(text, text) TO synaura_app;


--
-- Name: FUNCTION word_similarity_commutator_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.word_similarity_commutator_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.word_similarity_commutator_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.word_similarity_commutator_op(text, text) TO service_role;
GRANT ALL ON FUNCTION public.word_similarity_commutator_op(text, text) TO synaura_app;


--
-- Name: FUNCTION word_similarity_dist_commutator_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.word_similarity_dist_commutator_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.word_similarity_dist_commutator_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.word_similarity_dist_commutator_op(text, text) TO service_role;
GRANT ALL ON FUNCTION public.word_similarity_dist_commutator_op(text, text) TO synaura_app;


--
-- Name: FUNCTION word_similarity_dist_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.word_similarity_dist_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.word_similarity_dist_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.word_similarity_dist_op(text, text) TO service_role;
GRANT ALL ON FUNCTION public.word_similarity_dist_op(text, text) TO synaura_app;


--
-- Name: FUNCTION word_similarity_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.word_similarity_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.word_similarity_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.word_similarity_op(text, text) TO service_role;
GRANT ALL ON FUNCTION public.word_similarity_op(text, text) TO synaura_app;


--
-- Name: FUNCTION apply_rls(wal jsonb, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO service_role;


--
-- Name: FUNCTION broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO postgres;
GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO dashboard_user;


--
-- Name: FUNCTION build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO postgres;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO anon;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO service_role;


--
-- Name: FUNCTION "cast"(val text, type_ regtype); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO postgres;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO dashboard_user;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO anon;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO authenticated;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO service_role;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO service_role;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) TO service_role;


--
-- Name: FUNCTION is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO postgres;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO anon;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO service_role;


--
-- Name: FUNCTION list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO dashboard_user;


--
-- Name: FUNCTION quote_wal2json(entity regclass); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO postgres;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO anon;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO authenticated;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO service_role;


--
-- Name: FUNCTION send(payload jsonb, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION send_binary(payload bytea, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION subscription_check_filters(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO postgres;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO dashboard_user;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO anon;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO authenticated;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO service_role;


--
-- Name: FUNCTION to_regrole(role_name text); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO postgres;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO anon;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO authenticated;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO service_role;


--
-- Name: FUNCTION topic(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.topic() TO postgres;
GRANT ALL ON FUNCTION realtime.topic() TO dashboard_user;


--
-- Name: FUNCTION wal2json_escape_identifier(name text); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.wal2json_escape_identifier(name text) TO postgres;
GRANT ALL ON FUNCTION realtime.wal2json_escape_identifier(name text) TO dashboard_user;


--
-- Name: FUNCTION is_conversation_member(target_conversation_id text); Type: ACL; Schema: synaura_private; Owner: postgres
--

REVOKE ALL ON FUNCTION synaura_private.is_conversation_member(target_conversation_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION synaura_private.is_conversation_member(target_conversation_id text) TO authenticated;


--
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.audit_log_entries TO synaura_app;


--
-- Name: TABLE custom_oauth_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.custom_oauth_providers TO postgres;
GRANT ALL ON TABLE auth.custom_oauth_providers TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.custom_oauth_providers TO synaura_app;


--
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.flow_state TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.flow_state TO synaura_app;


--
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.identities TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.identities TO synaura_app;


--
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.instances TO synaura_app;


--
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_amr_claims TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.mfa_amr_claims TO synaura_app;


--
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_challenges TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.mfa_challenges TO synaura_app;


--
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_factors TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.mfa_factors TO synaura_app;


--
-- Name: TABLE oauth_authorizations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_authorizations TO postgres;
GRANT ALL ON TABLE auth.oauth_authorizations TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.oauth_authorizations TO synaura_app;


--
-- Name: TABLE oauth_client_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_client_states TO postgres;
GRANT ALL ON TABLE auth.oauth_client_states TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.oauth_client_states TO synaura_app;


--
-- Name: TABLE oauth_clients; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_clients TO postgres;
GRANT ALL ON TABLE auth.oauth_clients TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.oauth_clients TO synaura_app;


--
-- Name: TABLE oauth_consents; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_consents TO postgres;
GRANT ALL ON TABLE auth.oauth_consents TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.oauth_consents TO synaura_app;


--
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.one_time_tokens TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.one_time_tokens TO synaura_app;


--
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.refresh_tokens TO synaura_app;


--
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO synaura_app;


--
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_providers TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.saml_providers TO synaura_app;


--
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_relay_states TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.saml_relay_states TO synaura_app;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.schema_migrations TO synaura_app;


--
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sessions TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.sessions TO synaura_app;


--
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_domains TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.sso_domains TO synaura_app;


--
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_providers TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.sso_providers TO synaura_app;


--
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.users TO synaura_app;


--
-- Name: TABLE webauthn_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.webauthn_challenges TO postgres;
GRANT ALL ON TABLE auth.webauthn_challenges TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.webauthn_challenges TO synaura_app;


--
-- Name: TABLE webauthn_credentials; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.webauthn_credentials TO postgres;
GRANT ALL ON TABLE auth.webauthn_credentials TO dashboard_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE auth.webauthn_credentials TO synaura_app;


--
-- Name: TABLE pg_stat_statements; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements TO dashboard_user;


--
-- Name: TABLE pg_stat_statements_info; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements_info FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO dashboard_user;


--
-- Name: TABLE account_private; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.account_private TO authenticated;
GRANT ALL ON TABLE public.account_private TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_private TO synaura_app;


--
-- Name: TABLE active_artist_boosts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.active_artist_boosts TO anon;
GRANT ALL ON TABLE public.active_artist_boosts TO authenticated;
GRANT ALL ON TABLE public.active_artist_boosts TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.active_artist_boosts TO synaura_app;


--
-- Name: TABLE active_track_boosts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.active_track_boosts TO anon;
GRANT ALL ON TABLE public.active_track_boosts TO authenticated;
GRANT ALL ON TABLE public.active_track_boosts TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.active_track_boosts TO synaura_app;


--
-- Name: TABLE admin_broadcasts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_broadcasts TO anon;
GRANT ALL ON TABLE public.admin_broadcasts TO authenticated;
GRANT ALL ON TABLE public.admin_broadcasts TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admin_broadcasts TO synaura_app;


--
-- Name: TABLE ai_credit_balances; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_credit_balances TO anon;
GRANT ALL ON TABLE public.ai_credit_balances TO authenticated;
GRANT ALL ON TABLE public.ai_credit_balances TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_credit_balances TO synaura_app;


--
-- Name: TABLE ai_generations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_generations TO anon;
GRANT ALL ON TABLE public.ai_generations TO authenticated;
GRANT ALL ON TABLE public.ai_generations TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_generations TO synaura_app;


--
-- Name: TABLE ai_playlist_tracks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_playlist_tracks TO anon;
GRANT ALL ON TABLE public.ai_playlist_tracks TO authenticated;
GRANT ALL ON TABLE public.ai_playlist_tracks TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_playlist_tracks TO synaura_app;


--
-- Name: TABLE ai_playlists; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_playlists TO anon;
GRANT ALL ON TABLE public.ai_playlists TO authenticated;
GRANT ALL ON TABLE public.ai_playlists TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_playlists TO synaura_app;


--
-- Name: TABLE ai_track_likes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_track_likes TO anon;
GRANT ALL ON TABLE public.ai_track_likes TO authenticated;
GRANT ALL ON TABLE public.ai_track_likes TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_track_likes TO synaura_app;


--
-- Name: TABLE ai_tracks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_tracks TO anon;
GRANT ALL ON TABLE public.ai_tracks TO authenticated;
GRANT ALL ON TABLE public.ai_tracks TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_tracks TO synaura_app;


--
-- Name: TABLE ai_usage_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_usage_stats TO anon;
GRANT ALL ON TABLE public.ai_usage_stats TO authenticated;
GRANT ALL ON TABLE public.ai_usage_stats TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_usage_stats TO synaura_app;


--
-- Name: TABLE boosters; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.boosters TO anon;
GRANT ALL ON TABLE public.boosters TO authenticated;
GRANT ALL ON TABLE public.boosters TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.boosters TO synaura_app;


--
-- Name: TABLE challenge_entries; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.challenge_entries TO anon;
GRANT ALL ON TABLE public.challenge_entries TO authenticated;
GRANT ALL ON TABLE public.challenge_entries TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.challenge_entries TO synaura_app;


--
-- Name: TABLE city_event_participations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.city_event_participations TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.city_event_participations TO synaura_app;


--
-- Name: TABLE city_event_tracks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.city_event_tracks TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.city_event_tracks TO synaura_app;


--
-- Name: TABLE city_event_votes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.city_event_votes TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.city_event_votes TO synaura_app;


--
-- Name: TABLE city_event_winners; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.city_event_winners TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.city_event_winners TO synaura_app;


--
-- Name: TABLE city_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.city_events TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.city_events TO synaura_app;


--
-- Name: TABLE city_user_rewards; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.city_user_rewards TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.city_user_rewards TO synaura_app;


--
-- Name: TABLE comment_likes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.comment_likes TO anon;
GRANT ALL ON TABLE public.comment_likes TO authenticated;
GRANT ALL ON TABLE public.comment_likes TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.comment_likes TO synaura_app;


--
-- Name: TABLE comment_moderation; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.comment_moderation TO anon;
GRANT ALL ON TABLE public.comment_moderation TO authenticated;
GRANT ALL ON TABLE public.comment_moderation TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.comment_moderation TO synaura_app;


--
-- Name: TABLE comment_reactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.comment_reactions TO anon;
GRANT ALL ON TABLE public.comment_reactions TO authenticated;
GRANT ALL ON TABLE public.comment_reactions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.comment_reactions TO synaura_app;


--
-- Name: SEQUENCE comment_reactions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.comment_reactions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.comment_reactions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.comment_reactions_id_seq TO service_role;
GRANT ALL ON SEQUENCE public.comment_reactions_id_seq TO synaura_app;


--
-- Name: TABLE comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.comments TO anon;
GRANT ALL ON TABLE public.comments TO authenticated;
GRANT ALL ON TABLE public.comments TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.comments TO synaura_app;


--
-- Name: TABLE conversation_participants; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.conversation_participants TO anon;
GRANT ALL ON TABLE public.conversation_participants TO authenticated;
GRANT ALL ON TABLE public.conversation_participants TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.conversation_participants TO synaura_app;


--
-- Name: SEQUENCE conversation_participants_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.conversation_participants_id_seq TO anon;
GRANT ALL ON SEQUENCE public.conversation_participants_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.conversation_participants_id_seq TO service_role;
GRANT ALL ON SEQUENCE public.conversation_participants_id_seq TO synaura_app;


--
-- Name: TABLE conversation_realtime_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.conversation_realtime_events TO anon;
GRANT ALL ON TABLE public.conversation_realtime_events TO authenticated;
GRANT ALL ON TABLE public.conversation_realtime_events TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.conversation_realtime_events TO synaura_app;


--
-- Name: TABLE conversation_rooms; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.conversation_rooms TO anon;
GRANT ALL ON TABLE public.conversation_rooms TO authenticated;
GRANT ALL ON TABLE public.conversation_rooms TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.conversation_rooms TO synaura_app;


--
-- Name: TABLE conversations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.conversations TO anon;
GRANT ALL ON TABLE public.conversations TO authenticated;
GRANT ALL ON TABLE public.conversations TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.conversations TO synaura_app;


--
-- Name: TABLE creator_comment_filters; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.creator_comment_filters TO anon;
GRANT ALL ON TABLE public.creator_comment_filters TO authenticated;
GRANT ALL ON TABLE public.creator_comment_filters TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.creator_comment_filters TO synaura_app;


--
-- Name: SEQUENCE creator_comment_filters_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.creator_comment_filters_id_seq TO anon;
GRANT ALL ON SEQUENCE public.creator_comment_filters_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.creator_comment_filters_id_seq TO service_role;
GRANT ALL ON SEQUENCE public.creator_comment_filters_id_seq TO synaura_app;


--
-- Name: TABLE creator_posts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.creator_posts TO anon;
GRANT ALL ON TABLE public.creator_posts TO authenticated;
GRANT ALL ON TABLE public.creator_posts TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.creator_posts TO synaura_app;


--
-- Name: TABLE credit_ledger; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.credit_ledger TO anon;
GRANT ALL ON TABLE public.credit_ledger TO authenticated;
GRANT ALL ON TABLE public.credit_ledger TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.credit_ledger TO synaura_app;


--
-- Name: TABLE editorial_collections; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.editorial_collections TO service_role;
GRANT SELECT ON TABLE public.editorial_collections TO anon;
GRANT SELECT ON TABLE public.editorial_collections TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.editorial_collections TO synaura_app;


--
-- Name: TABLE faq_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.faq_items TO anon;
GRANT ALL ON TABLE public.faq_items TO authenticated;
GRANT ALL ON TABLE public.faq_items TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.faq_items TO synaura_app;


--
-- Name: TABLE faq_votes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.faq_votes TO anon;
GRANT ALL ON TABLE public.faq_votes TO authenticated;
GRANT ALL ON TABLE public.faq_votes TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.faq_votes TO synaura_app;


--
-- Name: TABLE follow_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.follow_requests TO anon;
GRANT ALL ON TABLE public.follow_requests TO authenticated;
GRANT ALL ON TABLE public.follow_requests TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.follow_requests TO synaura_app;


--
-- Name: SEQUENCE follow_requests_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.follow_requests_id_seq TO anon;
GRANT ALL ON SEQUENCE public.follow_requests_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.follow_requests_id_seq TO service_role;
GRANT ALL ON SEQUENCE public.follow_requests_id_seq TO synaura_app;


--
-- Name: TABLE forum_post_likes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.forum_post_likes TO anon;
GRANT ALL ON TABLE public.forum_post_likes TO authenticated;
GRANT ALL ON TABLE public.forum_post_likes TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.forum_post_likes TO synaura_app;


--
-- Name: TABLE forum_posts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.forum_posts TO anon;
GRANT ALL ON TABLE public.forum_posts TO authenticated;
GRANT ALL ON TABLE public.forum_posts TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.forum_posts TO synaura_app;


--
-- Name: TABLE forum_replies; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.forum_replies TO anon;
GRANT ALL ON TABLE public.forum_replies TO authenticated;
GRANT ALL ON TABLE public.forum_replies TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.forum_replies TO synaura_app;


--
-- Name: TABLE forum_reply_likes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.forum_reply_likes TO anon;
GRANT ALL ON TABLE public.forum_reply_likes TO authenticated;
GRANT ALL ON TABLE public.forum_reply_likes TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.forum_reply_likes TO synaura_app;


--
-- Name: TABLE friendships; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.friendships TO anon;
GRANT ALL ON TABLE public.friendships TO authenticated;
GRANT ALL ON TABLE public.friendships TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.friendships TO synaura_app;


--
-- Name: TABLE message_attachments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.message_attachments TO anon;
GRANT ALL ON TABLE public.message_attachments TO authenticated;
GRANT ALL ON TABLE public.message_attachments TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.message_attachments TO synaura_app;


--
-- Name: TABLE message_hidden_users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.message_hidden_users TO anon;
GRANT ALL ON TABLE public.message_hidden_users TO authenticated;
GRANT ALL ON TABLE public.message_hidden_users TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.message_hidden_users TO synaura_app;


--
-- Name: TABLE message_pins; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.message_pins TO anon;
GRANT ALL ON TABLE public.message_pins TO authenticated;
GRANT ALL ON TABLE public.message_pins TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.message_pins TO synaura_app;


--
-- Name: TABLE message_reactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.message_reactions TO anon;
GRANT ALL ON TABLE public.message_reactions TO authenticated;
GRANT ALL ON TABLE public.message_reactions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.message_reactions TO synaura_app;


--
-- Name: TABLE message_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.message_requests TO anon;
GRANT ALL ON TABLE public.message_requests TO authenticated;
GRANT ALL ON TABLE public.message_requests TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.message_requests TO synaura_app;


--
-- Name: TABLE messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.messages TO anon;
GRANT ALL ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.messages TO synaura_app;


--
-- Name: TABLE meteo_alerts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.meteo_alerts TO anon;
GRANT ALL ON TABLE public.meteo_alerts TO authenticated;
GRANT ALL ON TABLE public.meteo_alerts TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.meteo_alerts TO synaura_app;


--
-- Name: TABLE meteo_bulletins; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.meteo_bulletins TO anon;
GRANT ALL ON TABLE public.meteo_bulletins TO authenticated;
GRANT ALL ON TABLE public.meteo_bulletins TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.meteo_bulletins TO synaura_app;


--
-- Name: TABLE meteo_comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.meteo_comments TO anon;
GRANT ALL ON TABLE public.meteo_comments TO authenticated;
GRANT ALL ON TABLE public.meteo_comments TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.meteo_comments TO synaura_app;


--
-- Name: TABLE meteo_reactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.meteo_reactions TO anon;
GRANT ALL ON TABLE public.meteo_reactions TO authenticated;
GRANT ALL ON TABLE public.meteo_reactions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.meteo_reactions TO synaura_app;


--
-- Name: TABLE meteo_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.meteo_settings TO anon;
GRANT ALL ON TABLE public.meteo_settings TO authenticated;
GRANT ALL ON TABLE public.meteo_settings TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.meteo_settings TO synaura_app;


--
-- Name: TABLE meteo_team_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.meteo_team_members TO anon;
GRANT ALL ON TABLE public.meteo_team_members TO authenticated;
GRANT ALL ON TABLE public.meteo_team_members TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.meteo_team_members TO synaura_app;


--
-- Name: TABLE meteo_views; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.meteo_views TO anon;
GRANT ALL ON TABLE public.meteo_views TO authenticated;
GRANT ALL ON TABLE public.meteo_views TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.meteo_views TO synaura_app;


--
-- Name: TABLE missions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.missions TO anon;
GRANT ALL ON TABLE public.missions TO authenticated;
GRANT ALL ON TABLE public.missions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.missions TO synaura_app;


--
-- Name: TABLE music_challenges; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.music_challenges TO anon;
GRANT ALL ON TABLE public.music_challenges TO authenticated;
GRANT ALL ON TABLE public.music_challenges TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.music_challenges TO synaura_app;


--
-- Name: TABLE music_clips; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.music_clips TO anon;
GRANT ALL ON TABLE public.music_clips TO authenticated;
GRANT ALL ON TABLE public.music_clips TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.music_clips TO synaura_app;


--
-- Name: TABLE notification_preferences; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notification_preferences TO anon;
GRANT ALL ON TABLE public.notification_preferences TO authenticated;
GRANT ALL ON TABLE public.notification_preferences TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notification_preferences TO synaura_app;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notifications TO synaura_app;


--
-- Name: SEQUENCE notifications_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.notifications_id_seq TO anon;
GRANT ALL ON SEQUENCE public.notifications_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.notifications_id_seq TO service_role;
GRANT ALL ON SEQUENCE public.notifications_id_seq TO synaura_app;


--
-- Name: TABLE password_resets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.password_resets TO anon;
GRANT ALL ON TABLE public.password_resets TO authenticated;
GRANT ALL ON TABLE public.password_resets TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.password_resets TO synaura_app;


--
-- Name: TABLE payments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payments TO anon;
GRANT ALL ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.payments TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.payments TO synaura_app;


--
-- Name: TABLE play_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.play_stats TO anon;
GRANT ALL ON TABLE public.play_stats TO authenticated;
GRANT ALL ON TABLE public.play_stats TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.play_stats TO synaura_app;


--
-- Name: SEQUENCE play_stats_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.play_stats_id_seq TO anon;
GRANT ALL ON SEQUENCE public.play_stats_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.play_stats_id_seq TO service_role;
GRANT ALL ON SEQUENCE public.play_stats_id_seq TO synaura_app;


--
-- Name: TABLE playlist_tracks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.playlist_tracks TO anon;
GRANT ALL ON TABLE public.playlist_tracks TO authenticated;
GRANT ALL ON TABLE public.playlist_tracks TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.playlist_tracks TO synaura_app;


--
-- Name: SEQUENCE playlist_tracks_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.playlist_tracks_id_seq TO anon;
GRANT ALL ON SEQUENCE public.playlist_tracks_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.playlist_tracks_id_seq TO service_role;
GRANT ALL ON SEQUENCE public.playlist_tracks_id_seq TO synaura_app;


--
-- Name: TABLE playlists; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.playlists TO anon;
GRANT ALL ON TABLE public.playlists TO authenticated;
GRANT ALL ON TABLE public.playlists TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.playlists TO synaura_app;


--
-- Name: TABLE post_comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.post_comments TO anon;
GRANT ALL ON TABLE public.post_comments TO authenticated;
GRANT ALL ON TABLE public.post_comments TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.post_comments TO synaura_app;


--
-- Name: TABLE post_likes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.post_likes TO anon;
GRANT ALL ON TABLE public.post_likes TO authenticated;
GRANT ALL ON TABLE public.post_likes TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.post_likes TO synaura_app;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.profiles TO synaura_app;


--
-- Name: TABLE push_subscriptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.push_subscriptions TO anon;
GRANT ALL ON TABLE public.push_subscriptions TO authenticated;
GRANT ALL ON TABLE public.push_subscriptions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.push_subscriptions TO synaura_app;


--
-- Name: TABLE recommendation_impressions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.recommendation_impressions TO anon;
GRANT ALL ON TABLE public.recommendation_impressions TO authenticated;
GRANT ALL ON TABLE public.recommendation_impressions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.recommendation_impressions TO synaura_app;


--
-- Name: TABLE referrals; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.referrals TO anon;
GRANT ALL ON TABLE public.referrals TO authenticated;
GRANT ALL ON TABLE public.referrals TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.referrals TO synaura_app;


--
-- Name: TABLE star_academy_applications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.star_academy_applications TO anon;
GRANT ALL ON TABLE public.star_academy_applications TO authenticated;
GRANT ALL ON TABLE public.star_academy_applications TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.star_academy_applications TO synaura_app;


--
-- Name: TABLE star_academy_config; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.star_academy_config TO anon;
GRANT ALL ON TABLE public.star_academy_config TO authenticated;
GRANT ALL ON TABLE public.star_academy_config TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.star_academy_config TO synaura_app;


--
-- Name: TABLE star_academy_staff_applications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.star_academy_staff_applications TO anon;
GRANT ALL ON TABLE public.star_academy_staff_applications TO authenticated;
GRANT ALL ON TABLE public.star_academy_staff_applications TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.star_academy_staff_applications TO synaura_app;


--
-- Name: TABLE subscriptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.subscriptions TO anon;
GRANT ALL ON TABLE public.subscriptions TO authenticated;
GRANT ALL ON TABLE public.subscriptions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.subscriptions TO synaura_app;


--
-- Name: TABLE support_tickets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.support_tickets TO anon;
GRANT ALL ON TABLE public.support_tickets TO authenticated;
GRANT ALL ON TABLE public.support_tickets TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.support_tickets TO synaura_app;


--
-- Name: TABLE synaura_tv_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.synaura_tv_settings TO anon;
GRANT ALL ON TABLE public.synaura_tv_settings TO authenticated;
GRANT ALL ON TABLE public.synaura_tv_settings TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.synaura_tv_settings TO synaura_app;


--
-- Name: TABLE track_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.track_events TO anon;
GRANT ALL ON TABLE public.track_events TO authenticated;
GRANT ALL ON TABLE public.track_events TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.track_events TO synaura_app;


--
-- Name: TABLE track_likes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.track_likes TO anon;
GRANT ALL ON TABLE public.track_likes TO authenticated;
GRANT ALL ON TABLE public.track_likes TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.track_likes TO synaura_app;


--
-- Name: SEQUENCE track_likes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.track_likes_id_seq TO anon;
GRANT ALL ON SEQUENCE public.track_likes_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.track_likes_id_seq TO service_role;
GRANT ALL ON SEQUENCE public.track_likes_id_seq TO synaura_app;


--
-- Name: TABLE track_moment_reactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.track_moment_reactions TO anon;
GRANT ALL ON TABLE public.track_moment_reactions TO authenticated;
GRANT ALL ON TABLE public.track_moment_reactions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.track_moment_reactions TO synaura_app;


--
-- Name: TABLE track_remixes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.track_remixes TO anon;
GRANT ALL ON TABLE public.track_remixes TO authenticated;
GRANT ALL ON TABLE public.track_remixes TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.track_remixes TO synaura_app;


--
-- Name: TABLE track_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.track_stats TO anon;
GRANT ALL ON TABLE public.track_stats TO authenticated;
GRANT ALL ON TABLE public.track_stats TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.track_stats TO synaura_app;


--
-- Name: TABLE track_stats_daily; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.track_stats_daily TO anon;
GRANT ALL ON TABLE public.track_stats_daily TO authenticated;
GRANT ALL ON TABLE public.track_stats_daily TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.track_stats_daily TO synaura_app;


--
-- Name: TABLE track_stats_rolling_30d; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.track_stats_rolling_30d TO anon;
GRANT ALL ON TABLE public.track_stats_rolling_30d TO authenticated;
GRANT ALL ON TABLE public.track_stats_rolling_30d TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.track_stats_rolling_30d TO synaura_app;


--
-- Name: TABLE track_traffic_sources_30d; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.track_traffic_sources_30d TO anon;
GRANT ALL ON TABLE public.track_traffic_sources_30d TO authenticated;
GRANT ALL ON TABLE public.track_traffic_sources_30d TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.track_traffic_sources_30d TO synaura_app;


--
-- Name: TABLE track_views; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.track_views TO anon;
GRANT ALL ON TABLE public.track_views TO authenticated;
GRANT ALL ON TABLE public.track_views TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.track_views TO synaura_app;


--
-- Name: TABLE track_waveforms; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.track_waveforms TO anon;
GRANT ALL ON TABLE public.track_waveforms TO authenticated;
GRANT ALL ON TABLE public.track_waveforms TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.track_waveforms TO synaura_app;


--
-- Name: TABLE tracks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tracks TO anon;
GRANT ALL ON TABLE public.tracks TO authenticated;
GRANT ALL ON TABLE public.tracks TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.tracks TO synaura_app;


--
-- Name: TABLE user_blocks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_blocks TO anon;
GRANT ALL ON TABLE public.user_blocks TO authenticated;
GRANT ALL ON TABLE public.user_blocks TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_blocks TO synaura_app;


--
-- Name: TABLE user_booster_daily; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_booster_daily TO anon;
GRANT ALL ON TABLE public.user_booster_daily TO authenticated;
GRANT ALL ON TABLE public.user_booster_daily TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_booster_daily TO synaura_app;


--
-- Name: TABLE user_booster_open_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_booster_open_history TO anon;
GRANT ALL ON TABLE public.user_booster_open_history TO authenticated;
GRANT ALL ON TABLE public.user_booster_open_history TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_booster_open_history TO synaura_app;


--
-- Name: TABLE user_booster_pack_claims; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_booster_pack_claims TO anon;
GRANT ALL ON TABLE public.user_booster_pack_claims TO authenticated;
GRANT ALL ON TABLE public.user_booster_pack_claims TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_booster_pack_claims TO synaura_app;


--
-- Name: TABLE user_booster_pity; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_booster_pity TO anon;
GRANT ALL ON TABLE public.user_booster_pity TO authenticated;
GRANT ALL ON TABLE public.user_booster_pity TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_booster_pity TO synaura_app;


--
-- Name: TABLE user_boosters; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_boosters TO anon;
GRANT ALL ON TABLE public.user_boosters TO authenticated;
GRANT ALL ON TABLE public.user_boosters TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_boosters TO synaura_app;


--
-- Name: TABLE user_daily_spin; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_daily_spin TO authenticated;
GRANT ALL ON TABLE public.user_daily_spin TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_daily_spin TO synaura_app;


--
-- Name: TABLE user_daily_spin_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_daily_spin_history TO authenticated;
GRANT ALL ON TABLE public.user_daily_spin_history TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_daily_spin_history TO synaura_app;


--
-- Name: TABLE user_follows; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_follows TO anon;
GRANT ALL ON TABLE public.user_follows TO authenticated;
GRANT ALL ON TABLE public.user_follows TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_follows TO synaura_app;


--
-- Name: SEQUENCE user_follows_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_follows_id_seq TO anon;
GRANT ALL ON SEQUENCE public.user_follows_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.user_follows_id_seq TO service_role;
GRANT ALL ON SEQUENCE public.user_follows_id_seq TO synaura_app;


--
-- Name: TABLE user_missions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_missions TO anon;
GRANT ALL ON TABLE public.user_missions TO authenticated;
GRANT ALL ON TABLE public.user_missions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_missions TO synaura_app;


--
-- Name: TABLE user_quotas; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_quotas TO anon;
GRANT ALL ON TABLE public.user_quotas TO authenticated;
GRANT ALL ON TABLE public.user_quotas TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_quotas TO synaura_app;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.users TO synaura_app;


--
-- Name: TABLE waiting_list; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.waiting_list TO anon;
GRANT ALL ON TABLE public.waiting_list TO authenticated;
GRANT ALL ON TABLE public.waiting_list TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.waiting_list TO synaura_app;


--
-- Name: TABLE messages; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages TO postgres;
GRANT ALL ON TABLE realtime.messages TO dashboard_user;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO service_role;


--
-- Name: TABLE messages_2026_07_31; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages_2026_07_31 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_07_31 TO dashboard_user;


--
-- Name: TABLE messages_2026_08_01; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages_2026_08_01 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_08_01 TO dashboard_user;


--
-- Name: TABLE messages_2026_08_02; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages_2026_08_02 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_08_02 TO dashboard_user;


--
-- Name: TABLE messages_2026_08_03; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages_2026_08_03 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_08_03 TO dashboard_user;


--
-- Name: TABLE messages_2026_08_04; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages_2026_08_04 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_08_04 TO dashboard_user;


--
-- Name: TABLE messages_2026_08_05; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages_2026_08_05 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_08_05 TO dashboard_user;


--
-- Name: TABLE messages_2026_08_06; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages_2026_08_06 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_08_06 TO dashboard_user;


--
-- Name: TABLE subscription; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.subscription TO postgres;
GRANT ALL ON TABLE realtime.subscription TO dashboard_user;
GRANT SELECT ON TABLE realtime.subscription TO anon;
GRANT SELECT ON TABLE realtime.subscription TO authenticated;
GRANT SELECT ON TABLE realtime.subscription TO service_role;


--
-- Name: SEQUENCE subscription_id_seq; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO postgres;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO dashboard_user;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO anon;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO service_role;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.buckets FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.buckets TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO service_role;
GRANT ALL ON TABLE storage.buckets TO postgres WITH GRANT OPTION;


--
-- Name: TABLE buckets_analytics; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets_analytics TO service_role;
GRANT ALL ON TABLE storage.buckets_analytics TO authenticated;
GRANT ALL ON TABLE storage.buckets_analytics TO anon;


--
-- Name: TABLE buckets_vectors; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.buckets_vectors TO service_role;
GRANT SELECT ON TABLE storage.buckets_vectors TO authenticated;
GRANT SELECT ON TABLE storage.buckets_vectors TO anon;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.objects FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.objects TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.objects TO postgres WITH GRANT OPTION;


--
-- Name: TABLE s3_multipart_uploads; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO anon;


--
-- Name: TABLE s3_multipart_uploads_parts; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO anon;


--
-- Name: TABLE vector_indexes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.vector_indexes TO service_role;
GRANT SELECT ON TABLE storage.vector_indexes TO authenticated;
GRANT SELECT ON TABLE storage.vector_indexes TO anon;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO service_role;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- PostgreSQL database dump complete
--

\unrestrict synaura_phase1a_canonical_baseline