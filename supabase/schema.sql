-- ============================================================
-- SECTION: ROLES
-- ============================================================

--
-- PostgreSQL database cluster dump
--

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

-- CREATE ROLE "anon";
-- ALTER ROLE "anon" WITH INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOBYPASSRLS;
-- CREATE ROLE "authenticated";
-- ALTER ROLE "authenticated" WITH INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOBYPASSRLS;
-- CREATE ROLE "authenticator";
-- ALTER ROLE "authenticator" WITH NOINHERIT NOCREATEROLE NOCREATEDB LOGIN NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:hwTeX4Rhmisx5NLl6Pp8yw==$Cv1h1wFcm6jZrfYuTwmKLQm1QJVSSb41BFgpCCNmb9k=:ZZCH0eioW0rNPCAbFdsSZ1oiUKNHhGgNaqYyEEcQmQE=';
-- CREATE ROLE "dashboard_user";
-- ALTER ROLE "dashboard_user" WITH INHERIT CREATEROLE CREATEDB NOLOGIN REPLICATION NOBYPASSRLS;
-- CREATE ROLE "pgbouncer";
-- ALTER ROLE "pgbouncer" WITH INHERIT NOCREATEROLE NOCREATEDB LOGIN NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:VHwvZX/s0R8BuALL9s1RZQ==$3hwe0qAp15gh64u9CuD6ng2woECi6eJfh1TQkrmyzxY=:9nc7WIjyf3ayIE7lW9g6utHIutdBavWihPk+FQ4Hadk=';
-- CREATE ROLE "postgres";
-- ALTER ROLE "postgres" WITH INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:asvRTYvJQab8/ubx7x5PKg==$kSZxttUS+YeHLk7UFaozRFEd3M0TTkA3wmxihZei4+o=:Ozae0TgF6t/tcg28AXsd93vcBY4Haotdy6Y2yjJ/GB0=';
-- CREATE ROLE "service_role";
-- ALTER ROLE "service_role" WITH INHERIT NOCREATEROLE NOCREATEDB NOLOGIN BYPASSRLS;
-- CREATE ROLE "supabase_admin";
-- ALTER ROLE "supabase_admin" WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:PgJau9Zq436km3xVU9SbcA==$4J2DYZkaWu0P+VDT+pHE8Av97PBPS0oX7qY3jbSPwrc=:n/0Ir9e6g3RPMDFI+lFKgxFgqBDgUf2r66XVqZYfU6I=';
-- CREATE ROLE "supabase_auth_admin";
-- ALTER ROLE "supabase_auth_admin" WITH NOINHERIT CREATEROLE NOCREATEDB LOGIN NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:Bo4KuQG409/MiRA/KxljxA==$Dtr1yz8/OGWonHvL51HUScA1VlTHYilk++nw0A5bj2s=:XguUHbi/u5tIQzv6l0cyuQhxhomO9qEe9amEFJnmZM0=';
-- CREATE ROLE "supabase_functions_admin";
-- ALTER ROLE "supabase_functions_admin" WITH SUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:vWrTFsWG1KU/jRxtzVMQFQ==$jl98YweE5cTYLcwno/GZaNfcgYOJ0mMJ/z44HQpQbQs=:El7R2pSezhdjjz+3sPTrWwhkiZDvXhMzEq2JqCeaS+k=';
-- CREATE ROLE "supabase_read_only_user";
-- ALTER ROLE "supabase_read_only_user" WITH INHERIT NOCREATEROLE NOCREATEDB LOGIN BYPASSRLS;
-- CREATE ROLE "supabase_realtime_admin";
-- ALTER ROLE "supabase_realtime_admin" WITH NOINHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOBYPASSRLS;
-- CREATE ROLE "supabase_replication_admin";
-- ALTER ROLE "supabase_replication_admin" WITH INHERIT NOCREATEROLE NOCREATEDB LOGIN REPLICATION NOBYPASSRLS;
-- CREATE ROLE "supabase_storage_admin";
-- ALTER ROLE "supabase_storage_admin" WITH NOINHERIT CREATEROLE NOCREATEDB LOGIN NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:f6xCx2To1PB53PMjNCxriQ==$VwWPfnOHy6EzDLnuuWQ7b1izSbsoMipLq+sPy4zeZnA=:PH87TyxOXb3l5ctLJ/0Zj6AUiyHYWeVXF+Lrc+vvXlk=';

--
-- User Configurations
--

--
-- User Config "anon"
--

ALTER ROLE "anon" SET "statement_timeout" TO '3s';

--
-- User Config "authenticated"
--

ALTER ROLE "authenticated" SET "statement_timeout" TO '8s';

--
-- User Config "authenticator"
--

ALTER ROLE "authenticator" SET "statement_timeout" TO '8s';
-- ALTER ROLE "authenticator" SET "lock_timeout" TO '8s';

--
-- User Config "postgres"
--

-- ALTER ROLE "postgres" SET "search_path" TO E'\\$user', 'public', 'extensions';

--
-- User Config "supabase_admin"
--

-- ALTER ROLE "supabase_admin" SET "search_path" TO E'\\$user', 'public', 'auth', 'extensions';
-- ALTER ROLE "supabase_admin" SET "log_statement" TO 'none';

--
-- User Config "supabase_auth_admin"
--

-- ALTER ROLE "supabase_auth_admin" SET "search_path" TO 'auth';
-- ALTER ROLE "supabase_auth_admin" SET "idle_in_transaction_session_timeout" TO '60000';
-- ALTER ROLE "supabase_auth_admin" SET "log_statement" TO 'none';

--
-- User Config "supabase_storage_admin"
--

-- ALTER ROLE "supabase_storage_admin" SET "search_path" TO 'storage';
-- ALTER ROLE "supabase_storage_admin" SET "log_statement" TO 'none';

--
-- Role memberships
--

-- GRANT "anon" TO "authenticator" WITH INHERIT FALSE GRANTED BY "supabase_admin";
-- GRANT "anon" TO "postgres" WITH INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "authenticated" TO "authenticator" WITH INHERIT FALSE GRANTED BY "supabase_admin";
-- GRANT "authenticated" TO "postgres" WITH INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "authenticator" TO "supabase_storage_admin" WITH INHERIT FALSE GRANTED BY "supabase_admin";
-- GRANT "pg_monitor" TO "postgres" WITH INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "pg_read_all_data" TO "postgres" WITH INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "pg_read_all_data" TO "supabase_read_only_user" WITH INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "pg_signal_backend" TO "postgres" WITH INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "service_role" TO "authenticator" WITH INHERIT FALSE GRANTED BY "supabase_admin";
-- GRANT "service_role" TO "postgres" WITH INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "supabase_auth_admin" TO "postgres" WITH INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "supabase_realtime_admin" TO "postgres" WITH INHERIT TRUE GRANTED BY "supabase_admin";
-- GRANT "supabase_storage_admin" TO "postgres" WITH INHERIT TRUE GRANTED BY "supabase_admin";

--
-- PostgreSQL database cluster dump complete
--


-- ============================================================
-- SECTION: SCHEMA
-- ============================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

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
-- Name: _analytics; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "_analytics";


--
-- Name: _realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "_realtime";


--
-- Name: _supavisor; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "_supavisor";


--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "auth";


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "extensions";


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "graphql";


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "graphql_public";


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "pgbouncer";


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "realtime";


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "storage";


--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "supabase_migrations";


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "vault";


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";


--
-- Name: EXTENSION "pg_graphql"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pg_graphql" IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "pg_stat_statements"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pg_stat_statements" IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "pgcrypto"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pgcrypto" IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";


--
-- Name: EXTENSION "supabase_vault"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "supabase_vault" IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."aal_level" AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."code_challenge_method" AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."factor_status" AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."factor_type" AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."one_time_token_type" AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: album_permission_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."album_permission_level" AS ENUM (
    'pt',
    'vip',
    'svip',
    'vvip'
);


--
-- Name: item_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."item_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'archived'
);


--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."notification_type" AS ENUM (
    'audit',
    'system',
    'admin'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."user_role" AS ENUM (
    'user',
    'admin',
    'pt',
    'vip',
    'svip',
    'vvip'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE "realtime"."action" AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE "realtime"."equality_op" AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE "realtime"."user_defined_filter" AS (
	"column_name" "text",
	"op" "realtime"."equality_op",
	"value" "text"
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE "realtime"."wal_column" AS (
	"name" "text",
	"type_name" "text",
	"type_oid" "oid",
	"value" "jsonb",
	"is_pkey" boolean,
	"is_selectable" boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE "realtime"."wal_rls" AS (
	"wal" "jsonb",
	"is_rls_enabled" boolean,
	"subscription_ids" "uuid"[],
	"errors" "text"[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS'
);


--
-- Name: CAST ("public"."album_permission_level" AS "text"); Type: CAST; Schema: -; Owner: -
--

CREATE CAST ("public"."album_permission_level" AS "text") WITH INOUT AS ASSIGNMENT;


--
-- Name: CAST ("public"."item_status" AS "text"); Type: CAST; Schema: -; Owner: -
--

CREATE CAST ("public"."item_status" AS "text") WITH INOUT AS ASSIGNMENT;


--
-- Name: CAST ("public"."notification_type" AS "text"); Type: CAST; Schema: -; Owner: -
--

CREATE CAST ("public"."notification_type" AS "text") WITH INOUT AS ASSIGNMENT;


--
-- Name: CAST ("text" AS "public"."album_permission_level"); Type: CAST; Schema: -; Owner: -
--

CREATE CAST ("text" AS "public"."album_permission_level") WITH INOUT AS ASSIGNMENT;


--
-- Name: CAST ("text" AS "public"."item_status"); Type: CAST; Schema: -; Owner: -
--

CREATE CAST ("text" AS "public"."item_status") WITH INOUT AS ASSIGNMENT;


--
-- Name: CAST ("text" AS "public"."notification_type"); Type: CAST; Schema: -; Owner: -
--

CREATE CAST ("text" AS "public"."notification_type") WITH INOUT AS ASSIGNMENT;


--
-- Name: CAST ("text" AS "public"."user_role"); Type: CAST; Schema: -; Owner: -
--

CREATE CAST ("text" AS "public"."user_role") WITH INOUT AS ASSIGNMENT;


--
-- Name: CAST ("public"."user_role" AS "text"); Type: CAST; Schema: -; Owner: -
--

CREATE CAST ("public"."user_role" AS "text") WITH INOUT AS ASSIGNMENT;


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION "auth"."email"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION "email"(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION "auth"."email"() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION "auth"."jwt"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION "auth"."role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION "role"(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION "auth"."role"() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION "auth"."uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION "uid"(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION "auth"."uid"() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."grant_pg_cron_access"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
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


--
-- Name: FUNCTION "grant_pg_cron_access"(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION "extensions"."grant_pg_cron_access"() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."grant_pg_graphql_access"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
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


--
-- Name: FUNCTION "grant_pg_graphql_access"(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION "extensions"."grant_pg_graphql_access"() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."grant_pg_net_access"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
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


--
-- Name: FUNCTION "grant_pg_net_access"(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION "extensions"."grant_pg_net_access"() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."pgrst_ddl_watch"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
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


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."pgrst_drop_watch"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
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


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."set_graphql_placeholder"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
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


--
-- Name: FUNCTION "set_graphql_placeholder"(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION "extensions"."set_graphql_placeholder"() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth("text"); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION "pgbouncer"."get_auth"("p_usename" "text") RETURNS TABLE("username" "text", "password" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RAISE WARNING 'PgBouncer auth request: %', p_usename;

    RETURN QUERY
    SELECT usename::TEXT, passwd::TEXT FROM pg_catalog.pg_shadow
    WHERE usename = p_usename;
END;
$$;


--
-- Name: add_user_exp("uuid", integer, "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."add_user_exp"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_type" "text", "p_target_id" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- 只有当没有 target_id 或者 target_id 不冲突时才发放
    IF p_target_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.growth_logs 
        WHERE user_id = p_user_id AND type = p_type AND target_id = p_target_id
    ) THEN
        UPDATE public.profiles
        SET exp = COALESCE(exp, 0) + p_amount
        WHERE id = p_user_id;

        INSERT INTO public.growth_logs (user_id, amount, reason, type, target_id)
        VALUES (p_user_id, p_amount, p_reason, p_type, p_target_id)
        ON CONFLICT (user_id, type, target_id) WHERE target_id IS NOT NULL DO NOTHING;
    END IF;
END;
$$;


--
-- Name: add_user_points("uuid", integer, "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."add_user_points"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_type" "text", "p_target_id" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- 只有当没有 target_id 或者 target_id 不冲突时才发放
    IF p_target_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.points_logs 
        WHERE user_id = p_user_id AND type = p_type AND target_id = p_target_id
    ) THEN
        UPDATE public.profiles
        SET points = COALESCE(points, 0) + p_amount
        WHERE id = p_user_id;

        INSERT INTO public.points_logs (user_id, amount, reason, type, target_id)
        VALUES (p_user_id, p_amount, p_reason, p_type, p_target_id)
        ON CONFLICT (user_id, type, target_id) WHERE target_id IS NOT NULL DO NOTHING;
    END IF;
END;
$$;


--
-- Name: add_user_points_safe("uuid", integer, "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."add_user_points_safe"("user_id" "uuid", "amount" integer, "reason_text" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  PERFORM public.add_user_points(user_id, amount, reason_text, 'easter_egg');
END;
$$;


--
-- Name: add_virtual_views("uuid", integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."add_virtual_views"("item_id" "uuid", "amount" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  update media_items
  set view_count = view_count + amount
  where id = item_id;
end;
$$;


--
-- Name: adjust_heat("uuid", double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."adjust_heat"("p_item_id" "uuid", "p_amount" double precision) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.media_items 
    SET manual_boost = COALESCE(manual_boost, 0) + p_amount,
        heat_score = COALESCE(heat_score, 0) + p_amount -- 同时更新热度，以便前端即时反馈
    WHERE id = p_item_id;
END;
$$;


--
-- Name: approve_staging_items("uuid"[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."approve_staging_items"("p_ids" "uuid"[]) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_count int;
  v_item record;
BEGIN
  v_count := 0;
  
  FOR v_item IN (SELECT * FROM public.media_staging WHERE id = ANY(p_ids) AND status::public.item_status = 'pending'::public.item_status) LOOP
    -- 插入到 media_items
    INSERT INTO public.media_items (
      url, 
      thumbnail_url, 
      title, 
      type, 
      category_id, 
      status, 
      user_id
    ) VALUES (
      v_item.url, 
      v_item.thumbnail_url, 
      COALESCE(v_item.title, '导入资源'), 
      v_item.type, 
      v_item.category_id, 
      'approved', 
      v_item.owner_id
    ) RETURNING id INTO v_item.id; -- 复用 ID 字段存新生成的 media_id
    
    -- 如果有标签
    IF v_item.tag_names IS NOT NULL AND array_length(v_item.tag_names, 1) > 0 THEN
      -- 这里处理标签比较复杂，简化逻辑
      -- 在真正的应用中这里应该处理标签映射
    END IF;
    
    v_count := v_count + 1;
  END LOOP;
  
  -- 删除原 staging 项
  DELETE FROM public.media_staging WHERE id = ANY(p_ids) AND status::public.item_status = 'pending'::public.item_status;
  
  RETURN json_build_object('success', true, 'count', v_count);
END;
$$;


--
-- Name: auto_refill_pending_daily_gallery_materials(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."auto_refill_pending_daily_gallery_materials"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_limit integer;
    v_total_pending integer;
    v_invalid_pending integer;
    v_current_valid integer;
    v_needed integer;
    v_refilled_count integer;
    v_excluded_cats uuid[];
    v_excluded_tags text[];
    v_fifteen_days_ago timestamp with time zone := now() - interval '15 days';
    v_message text;
    v_start_time timestamp with time zone := now();
BEGIN
    -- Get daily count limit from configuration (default to 5)
    SELECT COALESCE((value->>'daily_count')::integer, 5) INTO v_limit
    FROM public.system_configs WHERE key = 'daily_gallery_config';
    
    -- Get exclusion settings from system config
    SELECT 
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(value->'excluded_categories'))::uuid[], '{}'::uuid[]),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(value->'excluded_tags'))::text[], '{}'::text[])
    INTO v_excluded_cats, v_excluded_tags
    FROM public.system_configs
    WHERE key = 'daily_gallery_config';

    -- 1. 统计当前待发布库的总数 (包含不合规的)
    SELECT count(*) INTO v_total_pending 
    FROM public.media_items 
    WHERE daily_gallery_status = 'pending';

    -- 2. 识别并清理不合规的待发布素材
    WITH invalid_items AS (
        SELECT id FROM public.media_items
        WHERE daily_gallery_status = 'pending'
          AND (
              deleted_at IS NOT NULL
              OR is_hidden = true
              OR status::text != 'approved'
              OR type != 'image'
              OR (exclude_from_daily_gallery = true)
              OR (v_excluded_cats != '{}' AND category_id = ANY(v_excluded_cats))
              OR (v_excluded_tags != '{}' AND tags && v_excluded_tags)
              OR (wechat_draft_status IN ('used', 'adopted') AND wechat_last_used_at IS NOT NULL AND wechat_last_used_at >= v_fifteen_days_ago)
          )
    )
    UPDATE public.media_items m
    SET daily_gallery_status = 'unused'
    FROM invalid_items
    WHERE m.id = invalid_items.id;
    
    GET DIAGNOSTICS v_invalid_pending = ROW_COUNT;

    -- 3. 统计清理后剩余的合格素材
    SELECT count(*) INTO v_current_valid 
    FROM public.media_items 
    WHERE daily_gallery_status = 'pending'
      AND deleted_at IS NULL;
    
    v_needed := v_limit - v_current_valid;
    
    IF v_needed <= 0 THEN
        v_message := format('待发布库分析 - 总数:%s, 合格:%s, 清理失效:%s。无需补充。', v_total_pending, v_current_valid, v_invalid_pending);
        -- Log the result
        INSERT INTO public.scheduled_task_logs (task_name, status, message, execution_time, duration_ms)
        VALUES ('daily_gallery_auto_publish', 'success', v_message, v_start_time, extract(epoch from (now() - v_start_time)) * 1000);
        
        RETURN jsonb_build_object('success', true, 'message', v_message);
    END IF;

    -- 4. 从备选池补充缺失的素材 (包含 unused 和 available)
    WITH to_update AS (
        SELECT id FROM public.media_items
        WHERE status::text = 'approved'
            AND is_hidden = false
            AND type = 'image'
            AND deleted_at IS NULL
            AND (exclude_from_daily_gallery = false OR exclude_from_daily_gallery IS NULL)
            AND COALESCE(daily_gallery_status, 'unused') IN ('unused', 'available')
            AND (v_excluded_cats = '{}' OR category_id IS NULL OR NOT (category_id = ANY(v_excluded_cats)))
            AND (v_excluded_tags = '{}' OR NOT (tags && v_excluded_tags))
            -- 15-day Wechat rule
            AND (
                wechat_draft_status = 'available' 
                OR wechat_draft_status IS NULL 
                OR (wechat_last_used_at IS NULL OR wechat_last_used_at < v_fifteen_days_ago)
            )
        ORDER BY 
            -- 尽量使用微信公众号的草稿库素材中已入稿库以外的图片
            (CASE WHEN wechat_draft_status = 'available' OR wechat_draft_status IS NULL THEN 0 ELSE 1 END) ASC,
            -- 优先使用时间靠前的图片
            created_at ASC
        LIMIT v_needed
    )
    UPDATE public.media_items m
    SET daily_gallery_status = 'pending'
    FROM to_update
    WHERE m.id = to_update.id;

    GET DIAGNOSTICS v_refilled_count = ROW_COUNT;
    
    v_message := format('待发布库补充分析 - 总数:%s, 合格:%s, 清理失效:%s, 实际补齐:%s (目标:%s, 需补:%s)', 
                        v_total_pending, v_current_valid, v_invalid_pending, v_refilled_count, v_limit, v_needed);

    -- Log the result
    INSERT INTO public.scheduled_task_logs (task_name, status, message, execution_time, duration_ms)
    VALUES ('daily_gallery_auto_publish', 'success', v_message, v_start_time, extract(epoch from (now() - v_start_time)) * 1000);

    RETURN jsonb_build_object(
        'success', true, 
        'message', v_message,
        'count', v_refilled_count
    );
END;
$$;


--
-- Name: auto_tag_media_logic(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."auto_tag_media_logic"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    tag_rec RECORD;
BEGIN
    -- Only proceed if title is not null
    IF NEW.title IS NOT NULL THEN
        FOR tag_rec IN SELECT id, name FROM tags LOOP
            -- Check if title contains tag name (case-insensitive)
            IF NEW.title ~* tag_rec.name THEN
                INSERT INTO media_tags (media_id, tag_id)
                VALUES (NEW.id, tag_rec.id)
                ON CONFLICT (media_id, tag_id) DO NOTHING;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: award_user_reward("uuid", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."award_user_reward"("p_user_id" "uuid", "p_action" "text", "p_target_id" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_logic jsonb;
    v_action_config jsonb;
    v_points int;
    v_exp int;
    v_limit int;
    v_period int;
    v_count int;
    v_action_name TEXT;
    v_lock_id bigint;
    v_effective_target_id TEXT;
    v_points_added BOOLEAN := FALSE;
    v_exp_added BOOLEAN := FALSE;
BEGIN
    -- 1. 确定实际的 target_id
    v_effective_target_id := p_target_id;
    
    -- 对于每日登录，自动生成基于日期的 target_id
    IF p_action = 'daily_login' AND v_effective_target_id IS NULL THEN
        v_effective_target_id := 'daily_login_' || CURRENT_DATE::text;
    END IF;

    -- 使用咨询锁防止并发竞争
    v_lock_id := hashtext('award_user_reward' || p_user_id::text || p_action || COALESCE(v_effective_target_id, 'none'));
    PERFORM pg_advisory_xact_lock(v_lock_id);

    -- 获取动作对应的中文名称
    v_action_name := CASE 
        WHEN p_action = 'image_publish' THEN '发布图片'
        WHEN p_action = 'video_publish' THEN '发布视频'
        WHEN p_action = 'favorite' THEN '作品收藏'
        WHEN p_action = 'comment' THEN '发表评论'
        WHEN p_action = 'report' THEN '有效举报'
        WHEN p_action = 'daily_login' THEN '每日登录'
        ELSE p_action
    END;

    -- 2. 获取配置
    SELECT (value::jsonb) INTO v_logic FROM public.system_configs WHERE key = 'points_logic';
    IF v_logic IS NULL OR NOT (v_logic ? p_action) THEN
        RETURN json_build_object('success', false, 'message', '配置不存在');
    END IF;
    
    v_action_config := v_logic -> p_action;
    v_points := (v_action_config ->> 'points')::int;
    v_exp := (v_action_config ->> 'exp')::int;
    v_limit := (v_action_config ->> 'limit')::int;
    v_period := COALESCE((v_action_config ->> 'period')::int, 1);
    
    -- 3. 检查限制（全局次数限制）
    IF v_limit > 0 THEN
        IF p_action = 'daily_login' THEN
            SELECT count(*) INTO v_count 
            FROM public.points_logs 
            WHERE user_id = p_user_id 
              AND type = p_action
              AND created_at >= CURRENT_DATE;
        ELSE
            SELECT count(*) INTO v_count 
            FROM public.points_logs 
            WHERE user_id = p_user_id 
              AND type = p_action
              AND created_at >= (CURRENT_DATE - (v_period - 1) * interval '1 day');
        END IF;
        
        IF v_count >= v_limit THEN
            RETURN json_build_object('success', false, 'message', '已达到奖励次数上限');
        END IF;
    END IF;
    
    -- 4. 幂等性检查：如果存在 target_id，检查是否已发放
    IF v_effective_target_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.points_logs WHERE user_id = p_user_id AND type = p_action AND target_id = v_effective_target_id) THEN
            RETURN json_build_object('success', false, 'message', '该奖励已发放');
        END IF;
    END IF;

    -- 5. 发放奖励
    IF v_points > 0 THEN
        INSERT INTO public.points_logs (user_id, amount, reason, type, target_id)
        VALUES (p_user_id, v_points, '奖励: ' || v_action_name, p_action, v_effective_target_id)
        ON CONFLICT (user_id, type, target_id) WHERE target_id IS NOT NULL DO NOTHING;
        
        IF FOUND THEN
            UPDATE public.profiles SET points = COALESCE(points, 0) + v_points WHERE id = p_user_id;
            v_points_added := TRUE;
        END IF;
    END IF;
    
    IF v_exp > 0 THEN
        INSERT INTO public.growth_logs (user_id, amount, reason, type, target_id)
        VALUES (p_user_id, v_exp, '奖励: ' || v_action_name, p_action, v_effective_target_id)
        ON CONFLICT (user_id, type, target_id) WHERE target_id IS NOT NULL DO NOTHING;
        
        IF FOUND THEN
            UPDATE public.profiles SET exp = COALESCE(exp, 0) + v_exp WHERE id = p_user_id;
            v_exp_added := TRUE;
        END IF;
    END IF;
    
    IF NOT v_points_added AND NOT v_exp_added AND v_effective_target_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'message', '该奖励已通过其他途径发放');
    END IF;

    RETURN json_build_object('success', true, 'points', v_points, 'exp', v_exp);
END;
$$;


--
-- Name: batch_grant_badges("uuid"[], "uuid", timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."batch_grant_badges"("p_user_ids" "uuid"[], "p_badge_id" "uuid", "p_expires_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.user_badges (user_id, badge_id, expires_at)
    SELECT unnest(p_user_ids), p_badge_id, p_expires_at
    ON CONFLICT (user_id, badge_id) DO UPDATE 
    SET expires_at = EXCLUDED.expires_at,
        granted_at = now();
END;
$$;


--
-- Name: batch_hard_delete_media("uuid"[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."batch_hard_delete_media"("p_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  delete from public.media_items where id = any(p_ids);
end;
$$;


--
-- Name: batch_insert_zonerama_photos("text", "jsonb"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."batch_insert_zonerama_photos"("p_album_id" "text", "p_photos" "jsonb") RETURNS TABLE("inserted_count" integer, "skipped_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_inserted_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_photo JSONB;
  v_photo_id TEXT;
  v_existing_status TEXT;
BEGIN
  FOR v_photo IN SELECT * FROM jsonb_array_elements(p_photos)
  LOOP
    BEGIN
      v_photo_id := v_photo->>'photo_id';
      
      -- 检查是否在黑名单中 (全局检查，不再受 album_id 限制)
      SELECT status INTO v_existing_status
      FROM public.zonerama_library
      WHERE photo_id = v_photo_id;
      
      -- 如果在黑名单中，跳过
      IF v_existing_status = 'blacklisted' THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;
      
      -- 插入或更新
      -- 基于 photo_id 冲突处理，实现全局去重
      INSERT INTO public.zonerama_library (album_id, photo_id, url, title, status)
      VALUES (
        p_album_id,
        v_photo_id,
        v_photo->>'url',
        v_photo->>'title',
        'pending'
      )
      ON CONFLICT (photo_id) 
      DO UPDATE SET
        -- 如果之前在回收站，则恢复为 pending；否则保持原状态
        status = CASE 
          WHEN zonerama_library.status = 'recycled' THEN 'pending'
          ELSE zonerama_library.status
        END,
        -- 更新 URL 和标题（以最新拉取的为准）
        url = EXCLUDED.url,
        title = EXCLUDED.title,
        -- 保留原有的 album_id 还是更新？通常保留第一个关联的 album_id 即可，
        -- 但为了准确性，这里我们不强制更新 album_id，以免覆盖
        updated_at = NOW();
      
      IF FOUND THEN
        v_inserted_count := v_inserted_count + 1;
      ELSE
        v_skipped_count := v_skipped_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_skipped_count := v_skipped_count + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_inserted_count, v_skipped_count;
END;
$$;


--
-- Name: batch_restore_media("uuid"[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."batch_restore_media"("p_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update public.media_items set deleted_at = null where id = any(p_ids);
end;
$$;


--
-- Name: batch_soft_delete_media("uuid"[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."batch_soft_delete_media"("p_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.media_items set deleted_at = now() where id = any(p_ids);
end;
$$;


--
-- Name: batch_update_media_hashes("jsonb"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."batch_update_media_hashes"("p_updates" "jsonb") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_item record;
    v_count int := 0;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_updates) AS x(id uuid, content_hash text, dedupe_error text, "table" text)
    LOOP
        IF v_item."table" = 'media_items' THEN
            UPDATE media_items 
            SET content_hash = v_item.content_hash, 
                dedupe_error = v_item.dedupe_error 
            WHERE id = v_item.id;
            IF FOUND THEN v_count := v_count + 1; END IF;
        ELSIF v_item."table" = 'album_photos' THEN
            UPDATE album_photos 
            SET content_hash = v_item.content_hash, 
                dedupe_error = v_item.dedupe_error 
            WHERE id = v_item.id;
            IF FOUND THEN v_count := v_count + 1; END IF;
        END IF;
    END LOOP;
    RETURN v_count;
END;
$$;


--
-- Name: batch_update_media_status_rpc("uuid"[], "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."batch_update_media_status_rpc"("p_item_ids" "uuid"[], "p_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    UPDATE public.media_items
    SET 
        status = p_status::public.item_status,
        updated_at = NOW()
    WHERE public.media_items.id = ANY(p_item_ids);
END;
$$;


--
-- Name: batch_update_media_status_rpc("uuid"[], "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."batch_update_media_status_rpc"("p_ids" "uuid"[], "p_status" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_updated_count int;
BEGIN
    -- 权限检查
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'admin') THEN
        RAISE EXCEPTION '只有管理员可以执行此操作';
    END IF;

    -- 批量更新状态
    UPDATE public.media_items
    SET status = p_status::public.item_status,
        reason = p_reason,
        updated_at = NOW()
    WHERE id = ANY(p_ids);

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'count', v_updated_count);
END;
$$;


--
-- Name: bulk_ignore_dedupe("uuid"[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."bulk_ignore_dedupe"("p_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- 这里通过更新操作直接修改字段，不再通过 upsert (避免 user_id not null 错误)
    -- 并利用 row_number 给每个 ID 分配不同的递增 dedupe_version 确保物理指纹互斥
    UPDATE media_items m
    SET dedupe_ignored = true,
        dedupe_version = floor(extract(epoch from now()))::bigint + sub.rn
    FROM (
        SELECT id, row_number() OVER () as rn
        FROM unnest(p_ids) as id
    ) as sub
    WHERE m.id = sub.id;
END;
$$;


--
-- Name: bulk_update_media_dedupe("jsonb"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."bulk_update_media_dedupe"("p_updates" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  u record;
BEGIN
  FOR u IN SELECT * FROM jsonb_to_recordset(p_updates) AS x(id uuid, content_hash text, dedupe_error text, updated_at timestamptz)
  LOOP
    UPDATE media_items
    SET 
      content_hash = u.content_hash,
      dedupe_error = u.dedupe_error,
      updated_at = u.updated_at
    WHERE id = u.id;
  END LOOP;
END;
$$;


--
-- Name: buy_special_digital_id("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."buy_special_digital_id"("p_user_id" "uuid", "p_special_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_digital_id text;
    v_price integer;
    v_points integer;
    v_is_sold boolean;
BEGIN
    -- 1. 获取靓号信息
    SELECT digital_id, price, is_sold INTO v_digital_id, v_price, v_is_sold
    FROM public.special_digital_ids
    WHERE id = p_special_id;

    IF v_digital_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', '靓号不存在');
    END IF;

    IF v_is_sold THEN
        RETURN jsonb_build_object('success', false, 'error', '该靓号已被售出');
    END IF;

    -- 2. 检查用户积分
    SELECT points INTO v_points FROM public.profiles WHERE id = p_user_id;
    IF v_points < v_price THEN
        RETURN jsonb_build_object('success', false, 'error', '积分不足');
    END IF;

    -- 3. 检查用户是否已有数字 ID (可选，如果业务要求每人一个)
    -- 这里假设可以更换，但在前端已经做了限制
    
    -- 4. 执行扣费和更新
    UPDATE public.profiles 
    SET points = points - v_price,
        digital_id = v_digital_id
    WHERE id = p_user_id;

    UPDATE public.special_digital_ids 
    SET is_sold = true,
        owner_id = p_user_id
    WHERE id = p_special_id;

    -- 5. 记录积分日志 (如果有点数日志表)
    INSERT INTO public.points_logs (user_id, points, type, reason)
    VALUES (p_user_id, -v_price, 'consume', '购买靓号: ' || v_digital_id);

    RETURN jsonb_build_object('success', true, 'digital_id', v_digital_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: buy_special_id("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."buy_special_id"("p_user_id" "uuid", "p_special_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_digital_id text;
    v_price integer;
    v_is_sold boolean;
    v_required_rank text;
    v_user_exp integer;
    v_required_exp integer;
    v_user_current_points integer;
BEGIN
    -- 1. 检查用户是否已经购买过靓号 (一人限一次)
    IF EXISTS (SELECT 1 FROM public.points_logs WHERE user_id = p_user_id AND type = 'buy_id') THEN
        RETURN jsonb_build_object('success', false, 'error', '您已购买过专属 ID，每位用户仅限购买一次');
    END IF;

    -- 2. 获取靓号信息
    SELECT digital_id, price, is_sold, required_rank INTO v_digital_id, v_price, v_is_sold, v_required_rank
    FROM public.special_digital_ids 
    WHERE id = p_special_id;

    IF v_is_sold THEN
        RETURN jsonb_build_object('success', false, 'error', '该号码已被售出');
    END IF;

    -- 3. 获取用户信息
    SELECT exp, points INTO v_user_exp, v_user_current_points FROM public.profiles WHERE id = p_user_id;
    
    -- 4. 检查等级要求
    IF v_required_rank IS NOT NULL AND v_required_rank <> '' THEN
        SELECT min_exp INTO v_required_exp FROM public.rank_configs WHERE name = v_required_rank;
        
        IF v_required_exp IS NOT NULL AND (v_user_exp IS NULL OR v_user_exp < v_required_exp) THEN
            RETURN jsonb_build_object('success', false, 'error', '您的等级不足以购买此号码 (需要: ' || v_required_rank || ')');
        END IF;
    END IF;

    -- 5. 检查积分是否足够
    IF v_user_current_points < v_price THEN
        RETURN jsonb_build_object('success', false, 'error', '积分不足');
    END IF;

    -- 6. 扣除积分并更新用户 ID
    UPDATE public.profiles 
    SET points = points - v_price, 
        digital_id = v_digital_id 
    WHERE id = p_user_id;

    -- 7. 标记靓号已售出
    UPDATE public.special_digital_ids 
    SET is_sold = true 
    WHERE id = p_special_id;

    -- 8. 记录日志
    INSERT INTO public.points_logs (user_id, amount, type, reason)
    VALUES (p_user_id, -v_price, 'buy_id', '购买靓号: ' || v_digital_id);

    RETURN jsonb_build_object('success', true, 'digital_id', v_digital_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: can_manage_ads(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."can_manage_ads"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;


--
-- Name: can_manage_badges(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."can_manage_badges"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;


--
-- Name: can_manage_media("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."can_manage_media"("media_id" "uuid", "user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.media_items m
    WHERE m.id = media_id 
    AND (m.user_id = user_id OR public.is_admin(user_id))
  );
$$;


--
-- Name: FUNCTION "can_manage_media"("media_id" "uuid", "user_id" "uuid"); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION "public"."can_manage_media"("media_id" "uuid", "user_id" "uuid") IS '检查用户是否可以管理指定媒体项（所有者或管理员）';


--
-- Name: can_view_album("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."can_view_album"("p_album_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role TEXT;
    v_user_group_id UUID;
    v_album_apply_switch BOOLEAN;
    v_album_manage_levels TEXT[];
    v_album_allowed_group_ids UUID[];
    v_album_min_level TEXT;
    v_album_permission_level TEXT; 
    v_effective_level TEXT;
    v_role_weight INT;
    v_min_weight INT;
BEGIN
    -- 1. 获取当前用户信息
    SELECT role::TEXT, group_id INTO v_user_role, v_user_group_id FROM public.profiles WHERE id = v_user_id;

    -- 管理员始终拥有权限
    IF v_user_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- 2. 获取图集配置
    SELECT apply_switch, user_manage_levels, allowed_group_ids, level 
    INTO v_album_apply_switch, v_album_manage_levels, v_album_allowed_group_ids, v_album_min_level
    FROM public.photo_albums WHERE id = p_album_id;

    -- 3. 获取图集内专属权限
    SELECT level INTO v_album_permission_level 
    FROM public.album_user_permissions 
    WHERE album_id = p_album_id AND user_id = v_user_id;

    -- 如果有专属权限（即通过申请或管理员手动添加），则无视权限组白名单限制和图集等级限制
    IF v_album_permission_level IS NOT NULL THEN
        RETURN TRUE;
    END IF;

    -- 4. 权限组白名单校验（仅针对没有专属权限的用户）
    IF v_album_allowed_group_ids IS NOT NULL AND array_length(v_album_allowed_group_ids, 1) > 0 THEN
        IF v_user_group_id IS NULL OR NOT (v_user_group_id = ANY(v_album_allowed_group_ids)) THEN
            RETURN FALSE;
        END IF;
    END IF;

    -- 5. 图集申请模式判断
    -- 如果开启了申请模式，但没有专属权限，则禁止进入
    IF v_album_apply_switch THEN
        RETURN FALSE;
    END IF;

    -- 6. 图集门槛校验（针对未开启申请模式且没有专属权限的用户）
    v_effective_level := COALESCE(v_user_role, 'pt');

    SELECT CASE v_effective_level
        WHEN 'pt' THEN 0 WHEN 'vip' THEN 1 WHEN 'svip' THEN 2 WHEN 'vvip' THEN 3 WHEN 'restricted' THEN 3 ELSE 0
    END INTO v_role_weight;
        
    SELECT CASE COALESCE(v_album_min_level, 'pt')
        WHEN 'pt' THEN 0 WHEN 'vip' THEN 1 WHEN 'svip' THEN 2 WHEN 'vvip' THEN 3 WHEN 'restricted' THEN 3 ELSE 0
    END INTO v_min_weight;
        
    RETURN v_role_weight >= v_min_weight;
END;
$$;


--
-- Name: can_view_album_photo("uuid", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."can_view_album_photo"("p_album_id" "uuid", "p_photo_level" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role TEXT;
    v_user_level TEXT;
    v_user_group_id UUID;
    v_user_group_permissions JSONB;
    v_album_permission_level TEXT;
    v_user_weight INT;
    v_photo_weight INT;
BEGIN
    -- 如果未登录，仅允许查看普通级
    IF v_user_id IS NULL THEN
        RETURN p_photo_level = 'normal' OR p_photo_level = 'pt';
    END IF;

    -- 获取用户信息
    SELECT role::TEXT, album_level::TEXT, group_id 
    INTO v_user_role, v_user_level, v_user_group_id 
    FROM public.profiles WHERE id = v_user_id;

    -- 管理员始终拥有权限
    IF v_user_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- 检查基本图集访问权限 (包含权限组白名单校验、专属授权绕过逻辑)
    IF NOT public.can_view_album(p_album_id) THEN
        RETURN FALSE;
    END IF;

    -- 普通级照片对所有拥有图集访问权的用户开放
    IF p_photo_level = 'normal' OR p_photo_level = 'pt' THEN
        RETURN TRUE;
    END IF;

    -- 获取图集内专属权限
    SELECT level INTO v_album_permission_level 
    FROM public.album_user_permissions 
    WHERE album_id = p_album_id AND user_id = v_user_id;

    -- 判定照片权重
    SELECT CASE p_photo_level
        WHEN 'normal' THEN 0 WHEN 'pt' THEN 0 WHEN 'vip' THEN 1 WHEN 'svip' THEN 2 WHEN 'vvip' THEN 3 WHEN 'restricted' THEN 3 ELSE 0
    END INTO v_photo_weight;

    IF v_album_permission_level IS NOT NULL THEN
        -- A. 专属授权模式：完全根据专属等级判定，不看权限点
        -- 冲突处理：专属授权优先级最高
        SELECT CASE v_album_permission_level
            WHEN 'pt' THEN 0 WHEN 'vip' THEN 1 WHEN 'svip' THEN 2 WHEN 'vvip' THEN 3 WHEN 'restricted' THEN 3 ELSE 0
        END INTO v_user_weight;
        
        RETURN v_user_weight >= v_photo_weight;
    ELSE
        -- B. 全局模式：按账户等级 + 权限组权限点判定
        SELECT CASE COALESCE(v_user_level, v_user_role, 'pt')
            WHEN 'pt' THEN 0 WHEN 'vip' THEN 1 WHEN 'svip' THEN 2 WHEN 'vvip' THEN 3 WHEN 'restricted' THEN 3 ELSE 0
        END INTO v_user_weight;

        IF v_user_weight >= v_photo_weight THEN
            RETURN TRUE;
        END IF;

        -- 检查权限点（作为账户等级的补充）
        IF v_user_group_id IS NOT NULL THEN
            SELECT permissions INTO v_user_group_permissions FROM public.permission_groups WHERE id = v_user_group_id;
            
            IF v_user_group_permissions IS NOT NULL THEN
                CASE p_photo_level
                    WHEN 'vip' THEN 
                        RETURN v_user_group_permissions @> '["album_level_vip"]'::jsonb 
                            OR v_user_group_permissions @> '["album_level_svip"]'::jsonb 
                            OR v_user_group_permissions @> '["album_level_vvip"]'::jsonb;
                    WHEN 'svip' THEN 
                        RETURN v_user_group_permissions @> '["album_level_svip"]'::jsonb 
                            OR v_user_group_permissions @> '["album_level_vvip"]'::jsonb;
                    WHEN 'vvip', 'restricted' THEN 
                        RETURN v_user_group_permissions @> '["album_level_vvip"]'::jsonb;
                    ELSE 
                        RETURN FALSE;
                END CASE;
            END IF;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$;


--
-- Name: check_album_photo_similar("uuid", "text", integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."check_album_photo_similar"("p_album_id" "uuid", "p_hash" "text", "p_threshold" integer DEFAULT 5) RETURNS TABLE("id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT m.id
  FROM public.album_photos m
  WHERE m.album_id = p_album_id
    AND m.content_hash IS NOT NULL
    AND bit_count(('x' || lpad(m.content_hash, 16, '0'))::bit(64) # ('x' || lpad(p_hash, 16, '0'))::bit(64)) <= p_threshold
  LIMIT 1;
END;
$$;


--
-- Name: check_album_photo_similar_with_url("uuid", "text", integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."check_album_photo_similar_with_url"("p_album_id" "uuid", "p_hash" "text", "p_threshold" integer DEFAULT 5) RETURNS TABLE("id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT m.id
  FROM public.album_photos m
  WHERE m.album_id = p_album_id
    AND m.content_hash IS NOT NULL
    AND bit_count(('x' || lpad(m.content_hash, 16, '0'))::bit(64) # ('x' || lpad(p_hash, 16, '0'))::bit(64)) <= p_threshold
  LIMIT 1;
END;
$$;


--
-- Name: check_all_users_badges(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."check_all_users_badges"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user RECORD;
    v_total_granted integer := 0;
    v_granted integer;
BEGIN
    FOR v_user IN SELECT id FROM public.profiles LOOP
        v_granted := public.check_and_grant_auto_badges(v_user.id);
        v_total_granted := v_total_granted + v_granted;
    END LOOP;
    RETURN v_total_granted;
END;
$$;


--
-- Name: check_and_grant_auto_badges("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."check_and_grant_auto_badges"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_task RECORD;
    v_current_val integer;
    v_granted_count integer := 0;
BEGIN
    FOR v_task IN 
        SELECT bt.*, b.name as badge_name 
        FROM public.badge_tasks bt
        JOIN public.badges b ON b.id = bt.badge_id
        WHERE bt.is_active = true 
          AND bt.claim_type = 'auto'
          AND NOT EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = p_user_id AND badge_id = bt.badge_id)
    LOOP
        -- 获取当前指标值
        CASE v_task.task_type
            WHEN 'checkin_count' THEN
                SELECT count(*) INTO v_current_val FROM public.check_ins WHERE user_id = p_user_id;
            WHEN 'upload_count' THEN
                SELECT count(*) INTO v_current_val FROM public.media_items WHERE user_id = p_user_id AND status = 'approved';
            WHEN 'favorite_count' THEN
                SELECT count(*) INTO v_current_val 
                FROM public.favorites f
                JOIN public.media_items m ON m.id = f.media_id
                WHERE m.user_id = p_user_id;
            ELSE
                v_current_val := 0;
        END CASE;

        -- 满足条件则授勋
        IF v_current_val >= v_task.target_value THEN
            INSERT INTO public.user_badges (user_id, badge_id, granted_at)
            VALUES (p_user_id, v_task.badge_id, now())
            ON CONFLICT (user_id, badge_id) DO NOTHING;
            
            v_granted_count := v_granted_count + 1;

            -- 发送系统通知
            INSERT INTO public.notifications (user_id, title, content, type)
            VALUES (p_user_id, '获得新勋章', '恭喜！您已达成条件，系统自动为您发放了【' || v_task.badge_name || '】勋章。', 'system');
        END IF;
    END LOOP;
    
    RETURN v_granted_count;
END;
$$;


--
-- Name: check_user_badge_tasks("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."check_user_badge_tasks"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- 目前由于缺失任务表，仅返回成功提示
    RETURN jsonb_build_object('success', true, 'message', 'Badge tasks checked');
END;
$$;


--
-- Name: check_user_badges("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."check_user_badges"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN public.check_and_grant_auto_badges(p_user_id);
END;
$$;


--
-- Name: check_user_favorites("uuid", "uuid"[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."check_user_favorites"("p_user_id" "uuid", "p_media_ids" "uuid"[]) RETURNS TABLE("media_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT f.media_id
    FROM public.favorites f
    WHERE f.user_id = p_user_id AND f.media_id = ANY(p_media_ids);
END;
$$;


--
-- Name: check_user_sessions_by_identifier("text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."check_user_sessions_by_identifier"("p_identifier" "text") RETURNS TABLE("user_id_out" "uuid", "has_active_session" boolean, "security_status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    target_user_id UUID;
    v_security_status TEXT;
BEGIN
    -- 先根据 identifier 找到 user_id 和 security_status
    -- 尝试通过 username, email, 或者 mobile 查找
    SELECT p.id, p.security_status INTO target_user_id, v_security_status
    FROM public.profiles p
    WHERE p.username = p_identifier 
       OR p.email = p_identifier 
       OR p.mobile = p_identifier
    LIMIT 1;

    IF target_user_id IS NULL THEN
        RETURN;
    END IF;

    -- 返回结果
    RETURN QUERY
    SELECT 
        target_user_id,
        EXISTS (
            SELECT 1 FROM public.user_active_sessions uas
            WHERE uas.user_id = target_user_id 
              AND uas.is_active = TRUE 
              AND uas.last_ping_at > NOW() - INTERVAL '15 minutes'
        ),
        COALESCE(v_security_status, 'normal');
END;
$$;


--
-- Name: cleanup_old_notifications(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."cleanup_old_notifications"("days_threshold" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  delete from notifications
  where created_at < (now() - (days_threshold || ' days')::interval);
end;
$$;


--
-- Name: clear_all_duplicate_media(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."clear_all_duplicate_media"() RETURNS TABLE("deleted_count" bigint, "saved_space_estimate" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_deleted_count BIGINT;
BEGIN
  -- 删除除了最早上传的副本以外的所有具有相同 MD5 的项
  WITH to_delete AS (
    SELECT id
    FROM (
      SELECT 
        id,
        ROW_NUMBER() OVER(PARTITION BY file_md5 ORDER BY created_at ASC) as rn
      FROM media_items
      WHERE file_md5 IS NOT NULL
    ) t
    WHERE t.rn > 1
  )
  DELETE FROM media_items
  WHERE id IN (SELECT id FROM to_delete);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_deleted_count, '清理完成';
END;
$$;


--
-- Name: clear_all_visual_duplicates(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."clear_all_visual_duplicates"("p_threshold" integer DEFAULT 5) RETURNS TABLE("deleted_count" bigint, "saved_space_estimate" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_deleted_count BIGINT;
BEGIN
  WITH valid_items AS (
    SELECT id, content_hash, created_at
    FROM public.media_items
    WHERE content_hash IS NOT NULL AND type = 'image' AND deleted_at IS NULL
  ),
  to_keep AS (
    -- 找出所有作为“代表”的项（即在该相似圈内最旧的项）
    SELECT m1.id
    FROM valid_items m1
    WHERE NOT EXISTS (
      SELECT 1 FROM valid_items m2
      WHERE m2.id != m1.id
      AND bit_count(('x' || lpad(m1.content_hash, 16, '0'))::bit(64) # ('x' || lpad(m2.content_hash, 16, '0'))::bit(64)) <= p_threshold
      AND (m2.created_at < m1.created_at OR (m2.created_at = m1.created_at AND m2.id < m1.id))
    )
  )
  DELETE FROM public.media_items
  WHERE type = 'image' 
    AND content_hash IS NOT NULL 
    AND deleted_at IS NULL
    AND id NOT IN (SELECT id FROM to_keep);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_deleted_count, '已清理相似内容并保留最早版本';
END;
$$;


--
-- Name: clear_dedupe_errors("text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."clear_dedupe_errors"("p_table" "text" DEFAULT 'media_items'::"text") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_count int;
BEGIN
    IF p_table = 'media_items' THEN
        UPDATE media_items SET dedupe_error = NULL WHERE dedupe_error IS NOT NULL;
        GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF p_table = 'album_photos' THEN
        UPDATE album_photos SET dedupe_error = NULL WHERE dedupe_error IS NOT NULL;
        GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSE
        v_count := 0;
    END IF;
    RETURN v_count;
END;
$$;


--
-- Name: delete_media_with_thumbnail(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."delete_media_with_thumbnail"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- 如果有缩略图URL，记录到日志（实际删除由应用层处理）
  IF OLD.thumbnail_url IS NOT NULL THEN
    -- 这里可以添加日志记录或通知机制
    RAISE NOTICE 'Media deleted with thumbnail: % -> %', OLD.url, OLD.thumbnail_url;
  END IF;
  
  RETURN OLD;
END;
$$;


--
-- Name: FUNCTION "delete_media_with_thumbnail"(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION "public"."delete_media_with_thumbnail"() IS '删除媒体时同时处理缩略图';


--
-- Name: ensure_profile_exists("text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."ensure_profile_exists"("target_openid" "text", "target_nickname" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    found_user_id uuid;
    final_nickname text;
BEGIN
    IF target_openid IS NULL OR target_openid = '' THEN
        RETURN NULL;
    END IF;

    -- 1. 尝试查找已存在的 profile
    SELECT id INTO found_user_id 
    FROM public.profiles 
    WHERE mp_openid = target_openid OR wechat_openid = target_openid
    LIMIT 1;

    -- 2. 如果不存在，则创建一个
    IF found_user_id IS NULL THEN
        final_nickname := COALESCE(target_nickname, '用户_' || substr(target_openid, 1, 8));
        
        INSERT INTO public.profiles (
            username, 
            mp_openid, 
            wechat_openid,
            auto_created,
            auto_created_source
        ) VALUES (
            final_nickname,
            target_openid,
            target_openid, -- 同时填充，因为不确定是哪种
            TRUE,
            'daily_gallery_submission'
        )
        RETURNING id INTO found_user_id;
    END IF;

    RETURN found_user_id;
END;
$$;


--
-- Name: exec_sql("text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."exec_sql"("query_text" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    EXECUTE query_text;
END;
$$;


--
-- Name: execute_admin_sql("text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."execute_admin_sql"("sql_query" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    start_time timestamptz;
    end_time timestamptz;
    diff_ms int;
    row_count int;
    result_data jsonb;
    error_msg text;
BEGIN
    -- 严格权限检查
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION '只有管理员可以执行此操作';
    END IF;

    start_time := clock_timestamp();

    -- 根据 SQL 类型处理返回值
    IF (trim(sql_query) ~* '^\s*SELECT') THEN
        EXECUTE 'SELECT jsonb_agg(t) FROM (' || sql_query || ') t' INTO result_data;
        row_count := jsonb_array_length(result_data);
    ELSE
        EXECUTE sql_query;
        GET DIAGNOSTICS row_count = ROW_COUNT;
        result_data := jsonb_build_object('affected_rows', row_count);
    END IF;

    end_time := clock_timestamp();
    diff_ms := extract(epoch from (end_time - start_time)) * 1000;

    -- 记录成功日志
    INSERT INTO public.sql_logs (user_id, query_text, status, affected_rows, execution_time_ms)
    VALUES (auth.uid(), sql_query, 'success', row_count, diff_ms);

    RETURN jsonb_build_object('success', true, 'data', result_data, 'execution_time_ms', diff_ms);

EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
    
    -- 记录错误日志
    INSERT INTO public.sql_logs (user_id, query_text, status, error_message)
    VALUES (auth.uid(), sql_query, 'error', error_msg);

    RETURN jsonb_build_object('success', false, 'error', error_msg);
END;
$$;


--
-- Name: find_duplicate_media("text", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."find_duplicate_media"("p_file_hash" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "url" "text", "thumbnail_url" "text", "title" "text", "user_id" "uuid", "created_at" timestamp with time zone, "similarity" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.url,
    m.thumbnail_url,
    m.title,
    m.user_id,
    m.created_at,
    1.0 as similarity
  FROM public.media_items m
  WHERE m.file_hash = p_file_hash
    AND m.status != 'deleted'
    -- 排除缩略图URL的查重
    AND m.url NOT LIKE '%/thumbnails/%'
    AND (p_user_id IS NULL OR m.user_id != p_user_id)
  ORDER BY m.created_at DESC
  LIMIT 10;
END;
$$;


--
-- Name: FUNCTION "find_duplicate_media"("p_file_hash" "text", "p_user_id" "uuid"); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION "public"."find_duplicate_media"("p_file_hash" "text", "p_user_id" "uuid") IS '查找重复媒体（排除缩略图）';


--
-- Name: find_similar_media("text", integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."find_similar_media"("target_hash" "text", "threshold" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "title" "text", "url" "text", "distance" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id, m.title, m.url, hamming_distance(m.content_hash, target_hash) as dist
  FROM media_items m
  WHERE m.content_hash IS NOT NULL 
    AND hamming_distance(m.content_hash, target_hash) <= threshold
  ORDER BY dist ASC;
END;
$$;


--
-- Name: flush_notification_buffer(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."flush_notification_buffer"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- 这里可以实现清除或处理已读通知的逻辑
  -- 目前先保持为空，以解决 404 报错
  NULL;
END;
$$;


--
-- Name: generate_digital_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."generate_digital_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    new_id text;
    cfg record;
    max_attempts integer := 200;
    attempts integer := 0;
    found_valid boolean := false;
BEGIN
    -- 如果已经手动设置了 ID，则跳过
    IF NEW.digital_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- 获取配置
    SELECT * INTO cfg FROM public.digital_id_configs LIMIT 1;
    
    -- 如果没有配置，使用默认设置 (8位)
    IF cfg IS NULL THEN
        cfg := (SELECT NULL::public.digital_id_configs);
        cfg.id_length := 8;
        cfg.is_random_mode := true;
    END IF;

    IF cfg.is_random_mode THEN
        LOOP
            attempts := attempts + 1;
            -- 生成随机 ID
            new_id := floor(random() * (power(10, cfg.id_length) - power(10, cfg.id_length - 1)) + power(10, cfg.id_length - 1))::text;
            
            -- 检查唯一性、排除列表和模式
            IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE digital_id = new_id) 
               AND NOT public.is_digital_id_forbidden(new_id) THEN
                found_valid := true;
                EXIT;
            END IF;

            -- 安全退出: 如果尝试太多次都找不到符合模式的 ID
            -- (例如模式太严苛或 ID 长度太短导致几乎所有号码都被排除)
            -- 则降级为只检查唯一性，确保用户能注册成功
            IF attempts >= max_attempts THEN
                LOOP
                    new_id := floor(random() * (power(10, cfg.id_length) - power(10, cfg.id_length - 1)) + power(10, cfg.id_length - 1))::text;
                    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE digital_id = new_id);
                END LOOP;
                found_valid := true;
                EXIT;
            END IF;
        END LOOP;
    ELSE
        new_id := cfg.next_value::text;
        -- 顺推模式下，跳过禁用的 ID
        WHILE public.is_digital_id_forbidden(new_id) OR EXISTS (SELECT 1 FROM public.profiles WHERE digital_id = new_id) LOOP
            cfg.next_value := cfg.next_value + 1;
            new_id := cfg.next_value::text;
            
            -- 防止无限循环 (虽然概率极低)
            attempts := attempts + 1;
            IF attempts > 1000 THEN EXIT; END IF;
        END LOOP;
        
        -- 更新下一个值
        UPDATE public.digital_id_configs SET next_value = cfg.next_value + 1 WHERE id = cfg.id;
    END IF;

    NEW.digital_id := new_id;
    RETURN NEW;
END;
$$;


--
-- Name: generate_short_token(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."generate_short_token"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars))::integer + 1, 1);
    END LOOP;
    RETURN result;
END;
$$;


--
-- Name: get_ad_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_ad_stats"() RETURNS TABLE("ad_id" "uuid", "event_type" "text", "event_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.ad_id, 
        l.event_type, 
        COUNT(*) as event_count
    FROM public.ad_event_logs l
    GROUP BY l.ad_id, l.event_type;
END;
$$;


--
-- Name: get_admin_analytics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_admin_analytics"() RETURNS TABLE("day" "date", "upload_count" bigint, "user_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  return query
  select 
    d::date as day,
    (select count(*) from media_items where created_at::date = d::date) as upload_count,
    (select count(*) from profiles where created_at::date = d::date) as user_count
  from generate_series(
    current_date - interval '29 days',
    current_date,
    interval '1 day'
  ) d
  order by day asc;
end;
$$;


--
-- Name: get_admin_distribution(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_admin_distribution"() RETURNS TABLE("name" "text", "value" bigint, "type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return query
  -- 内容类型分布
  select m.type::text as name, count(*) as value, 'media_type'::text as type 
  from media_items m group by m.type
  union all
  -- 内容状态分布
  select m.status::text as name, count(*) as value, 'media_status'::text as type 
  from media_items m group by m.status;
end;
$$;


--
-- Name: get_admin_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_admin_stats"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_count INT;
    v_pending_count INT;
    v_approved_count INT;
    v_archived_count INT;
    v_favorite_count INT;
    v_dislike_count INT;
    v_view_count INT;
    v_pending_reports_count INT;
    v_pending_album_requests_count INT;
BEGIN
    SELECT COUNT(*) INTO v_user_count FROM public.profiles;
    SELECT COUNT(*) INTO v_pending_count FROM public.media_items WHERE status::public.item_status = 'pending'::public.item_status;
    SELECT COUNT(*) INTO v_approved_count FROM public.media_items WHERE status::public.item_status = 'approved'::public.item_status;
    SELECT COUNT(*) INTO v_archived_count FROM public.media_items WHERE status::public.item_status = 'archived'::public.item_status;
    SELECT COALESCE(SUM(favorite_count), 0) INTO v_favorite_count FROM public.media_items;
    SELECT COALESCE(SUM(dislike_count), 0) INTO v_dislike_count FROM public.media_items;
    SELECT COALESCE(SUM(view_count), 0) INTO v_view_count FROM public.media_items;
    SELECT COUNT(*) INTO v_pending_reports_count FROM public.reports WHERE status::public.item_status = 'pending'::public.item_status;
    SELECT COUNT(*) INTO v_pending_album_requests_count FROM public.album_access_requests WHERE status::public.item_status = 'pending'::public.item_status;

    RETURN jsonb_build_object(
        'users', v_user_count,
        'pending', v_pending_count,
        'approved', v_approved_count,
        'archived', v_archived_count,
        'favorites', v_favorite_count,
        'dislikes', v_dislike_count,
        'views', v_view_count,
        'pending_reports', v_pending_reports_count,
        'pending_album_requests', v_pending_album_requests_count
    );
END;
$$;


--
-- Name: get_album_photo_level_counts("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_album_photo_level_counts"("p_album_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    counts JSONB;
BEGIN
    SELECT jsonb_build_object(
        'normal', COUNT(*) FILTER (WHERE level = 'normal'),
        'vip', COUNT(*) FILTER (WHERE level = 'vip'),
        'svip', COUNT(*) FILTER (WHERE level = 'svip'),
        'restricted', COUNT(*) FILTER (WHERE level = 'restricted'),
        'total', COUNT(*)
    ) INTO counts
    FROM album_photos
    WHERE album_id = p_album_id;
    
    RETURN counts;
END;
$$;


--
-- Name: get_all_cache_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_all_cache_stats"() RETURNS TABLE("cache_key" "text", "hit_count" integer, "miss_count" integer, "last_hit_at" timestamp with time zone, "last_miss_at" timestamp with time zone, "hit_rate" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.cache_key,
        cs.hit_count,
        cs.miss_count,
        cs.last_hit_at,
        cs.last_miss_at,
        CASE 
            WHEN (cs.hit_count + cs.miss_count) = 0 THEN 0.0
            ELSE (cs.hit_count::DOUBLE PRECISION / (cs.hit_count + cs.miss_count)) * 100
        END as hit_rate
    FROM 
        public.cache_stats cs
    ORDER BY 
        cs.hit_count DESC;
END;
$$;


--
-- Name: get_cache_hit_rate("text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_cache_hit_rate"("p_cache_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_stats RECORD;
  v_hit_rate NUMERIC;
BEGIN
  SELECT 
    hit_count,
    miss_count,
    CASE 
      WHEN (hit_count + miss_count) > 0 
      THEN ROUND((hit_count::NUMERIC / (hit_count + miss_count)) * 100, 2)
      ELSE 0
    END as hit_rate
  INTO v_stats
  FROM public.cache_stats
  WHERE cache_key = p_cache_key;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'cache_key', p_cache_key,
      'hit_count', 0,
      'miss_count', 0,
      'hit_rate', 0
    );
  END IF;

  RETURN jsonb_build_object(
    'cache_key', p_cache_key,
    'hit_count', v_stats.hit_count,
    'miss_count', v_stats.miss_count,
    'hit_rate', v_stats.hit_rate
  );
END;
$$;


--
-- Name: FUNCTION "get_cache_hit_rate"("p_cache_key" "text"); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION "public"."get_cache_hit_rate"("p_cache_key" "text") IS '获取指定缓存键的命中率统计';


--
-- Name: get_category_cloud(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_category_cloud"() RETURNS TABLE("id" "uuid", "name" "text", "icon" "text", "sort_order" integer, "is_visible" boolean, "min_role" "text", "count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.name,
    cc.icon,
    cc.sort_order,
    cc.is_visible,
    cc.min_role,
    COUNT(mi.id)::bigint as count
  FROM public.content_categories cc
  LEFT JOIN public.media_items mi ON cc.id = mi.category_id 
    AND mi.deleted_at IS NULL 
    AND mi.status::public.item_status = 'approved'::public.item_status
  GROUP BY 
    cc.id,
    cc.name,
    cc.icon,
    cc.sort_order,
    cc.is_visible,
    cc.min_role
  ORDER BY cc.sort_order ASC, cc.name ASC;
END;
$$;


--
-- Name: get_daily_gallery_available_images_rpc(integer, integer, "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_daily_gallery_available_images_rpc"("p_limit" integer, "p_offset" integer, "p_search" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT 'unused'::"text") RETURNS TABLE("id" "uuid", "url" "text", "title" "text", "description" "text", "status" "text", "daily_gallery_status" "text", "created_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_total bigint;
    v_excluded_cats uuid[];
    v_excluded_tags text[];
    v_fifteen_days_ago timestamp with time zone := now() - interval '15 days';
BEGIN
    -- Get exclusion settings from system config
    SELECT 
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(value->'excluded_categories'))::uuid[], '{}'::uuid[]),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(value->'excluded_tags'))::text[], '{}'::text[])
    INTO v_excluded_cats, v_excluded_tags
    FROM public.system_configs
    WHERE key = 'daily_gallery_config';

    -- First calculate total count
    SELECT count(*) INTO v_total
    FROM public.media_items m
    WHERE m.status::public.item_status = 'approved'::public.item_status
        AND m.is_hidden = false
        AND m.type = 'image'
        AND m.deleted_at IS NULL
        AND (m.exclude_from_daily_gallery = false OR m.exclude_from_daily_gallery IS NULL)
        AND (
            (p_status = 'unused' AND COALESCE(m.daily_gallery_status, 'unused') IN ('unused', 'available'))
            OR (p_status != 'unused' AND COALESCE(m.daily_gallery_status, 'unused') = p_status)
        )
        AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
        AND (v_excluded_cats = '{}' OR m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_cats)))
        AND (v_excluded_tags = '{}' OR NOT (m.tags && v_excluded_tags))
        -- 15-day Wechat rule: available OR (used/adopted AND last_used < 15 days ago)
        AND (
            m.wechat_draft_status = 'available' 
            OR m.wechat_draft_status IS NULL 
            OR (m.wechat_draft_status IN ('used', 'adopted') AND (m.wechat_last_used_at IS NULL OR m.wechat_last_used_at < v_fifteen_days_ago))
        );

    RETURN QUERY
    SELECT 
        m.id, 
        m.url, 
        m.title, 
        m.description, 
        m.status::text, 
        COALESCE(m.daily_gallery_status, 'unused')::text as daily_gallery_status,
        m.created_at,
        v_total
    FROM public.media_items m
    WHERE m.status::public.item_status = 'approved'::public.item_status
        AND m.is_hidden = false
        AND m.type = 'image'
        AND m.deleted_at IS NULL
        AND (m.exclude_from_daily_gallery = false OR m.exclude_from_daily_gallery IS NULL)
        AND (
            (p_status = 'unused' AND COALESCE(m.daily_gallery_status, 'unused') IN ('unused', 'available'))
            OR (p_status != 'unused' AND COALESCE(m.daily_gallery_status, 'unused') = p_status)
        )
        AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
        AND (v_excluded_cats = '{}' OR m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_cats)))
        AND (v_excluded_tags = '{}' OR NOT (m.tags && v_excluded_tags))
        -- 15-day Wechat rule
        AND (
            m.wechat_draft_status = 'available' 
            OR m.wechat_draft_status IS NULL 
            OR (m.wechat_draft_status IN ('used', 'adopted') AND (m.wechat_last_used_at IS NULL OR m.wechat_last_used_at < v_fifteen_days_ago))
        )
    ORDER BY 
        -- 尽量使用微信公众号的草稿库素材中已入稿库以外的图片
        (CASE WHEN m.wechat_draft_status = 'available' OR m.wechat_draft_status IS NULL THEN 0 ELSE 1 END) ASC,
        -- 优先使用时间靠前的图片
        m.created_at ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


--
-- Name: get_daily_gallery_stats("date", "date"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_daily_gallery_stats"("p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("post_id" "uuid", "post_date" "date", "image_count" integer, "view_count" integer, "unique_visitor_count" integer, "password" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as post_id,
        p.post_date,
        cardinality(p.image_ids)::integer as image_count,
        COALESCE(p.view_count, 0)::integer as view_count,
        COALESCE(p.unique_visitor_count, 0)::integer as unique_visitor_count,
        p.password
    FROM public.daily_gallery_posts p
    WHERE (p_start_date IS NULL OR p.post_date >= p_start_date)
      AND (p_end_date IS NULL OR p.post_date <= p_end_date)
    ORDER BY p.post_date DESC;
END;
$$;


--
-- Name: get_database_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_database_stats"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_total_rows BIGINT;
    v_table_size TEXT;
    v_index_size TEXT;
    v_dead_rows BIGINT;
    v_all_stats json;
BEGIN
    -- Legacy support for media_items
    SELECT count(*) INTO v_total_rows FROM media_items;
    SELECT pg_size_pretty(pg_total_relation_size('media_items')) INTO v_table_size;
    SELECT pg_size_pretty(pg_indexes_size('media_items')) INTO v_index_size;
    
    SELECT n_dead_tup INTO v_dead_rows 
    FROM pg_stat_user_tables 
    WHERE relname = 'media_items';

    -- Comprehensive stats
    SELECT json_agg(t) INTO v_all_stats
    FROM (
        SELECT 
            relname AS table_name,
            n_live_tup AS row_count,
            pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
            pg_size_pretty(pg_relation_size(relid)) AS table_size,
            pg_size_pretty(pg_indexes_size(relid)) AS index_size,
            n_dead_tup AS dead_rows
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(relid) DESC
    ) t;

    RETURN json_build_object(
        'media_items_rows', v_total_rows,
        'table_size', v_table_size,
        'index_size', v_index_size,
        'dead_rows', COALESCE(v_dead_rows, 0),
        'table_stats', v_all_stats,
        'database_size', pg_size_pretty(pg_database_size(current_database()))
    );
END;
$$;


--
-- Name: get_database_table_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_database_table_stats"() RETURNS TABLE("table_name" "text", "description" "text", "row_count" bigint, "total_size" "text", "index_size" "text", "data_size" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::TEXT AS table_name,
        obj_description(c.oid, 'pg_class')::TEXT AS description,
        COALESCE(s.n_live_tup, 0) AS row_count,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
        pg_size_pretty(pg_indexes_size(c.oid)) AS index_size,
        pg_size_pretty(pg_relation_size(c.oid)) AS data_size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
    WHERE c.relkind = 'r' 
      AND n.nspname = 'public'
      AND c.relname NOT LIKE 'pg_%'
    ORDER BY s.n_live_tup DESC;
END;
$$;


--
-- Name: get_dedupe_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_dedupe_stats"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_total_media bigint;
    v_scanned_media bigint;
    v_duplicate_md5 bigint;
    v_duplicate_visual bigint;
BEGIN
    -- 总非删除媒体数
    SELECT count(*) INTO v_total_media FROM media_items WHERE deleted_at IS NULL;
    
    -- 已扫描图片数
    SELECT count(*) INTO v_scanned_media 
    FROM media_items 
    WHERE content_hash IS NOT NULL AND content_hash != '' 
      AND type = 'image' 
      AND deleted_at IS NULL;
    
    -- MD5 重复组数
    SELECT count(*) INTO v_duplicate_md5 
    FROM (
        SELECT mi.file_md5 
        FROM media_items mi
        WHERE mi.file_md5 IS NOT NULL AND mi.file_md5 != '' 
          AND mi.deleted_at IS NULL 
          AND (mi.dedupe_ignored IS NULL OR mi.dedupe_ignored = FALSE) 
        GROUP BY mi.file_md5, mi.dedupe_version 
        HAVING count(*) > 1
    ) AS t;
    
    -- 视觉重复项组数
    SELECT count(*) INTO v_duplicate_visual 
    FROM (
        SELECT mi.content_hash 
        FROM media_items mi
        WHERE mi.content_hash IS NOT NULL AND mi.content_hash != '' 
          AND mi.type = 'image' 
          AND mi.deleted_at IS NULL 
          AND (mi.dedupe_ignored IS NULL OR mi.dedupe_ignored = FALSE) 
        GROUP BY mi.content_hash, mi.dedupe_version 
        HAVING count(*) > 1
    ) AS t;
    
    RETURN jsonb_build_object(
        'total', v_total_media,
        'scanned', v_scanned_media,
        'md5_duplicates', v_duplicate_md5,
        'visual_duplicates', v_duplicate_visual,
        'scanned_ratio', CASE WHEN v_total_media = 0 THEN 0 ELSE round(v_scanned_media::numeric / v_total_media * 100, 1) END
    );
END;
$$;


--
-- Name: get_duplicate_media(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_duplicate_media"() RETURNS TABLE("file_md5" "text", "duplicate_count" bigint, "first_upload_at" timestamp with time zone, "total_size" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.file_md5,
    COUNT(*)::BIGINT as duplicate_count,
    MIN(m.created_at) as first_upload_at,
    0::BIGINT as total_size
  FROM public.media_items m
  WHERE m.file_md5 IS NOT NULL 
    AND m.deleted_at IS NULL
    AND (m.dedupe_ignored IS NULL OR m.dedupe_ignored = FALSE)
  GROUP BY m.file_md5, m.dedupe_version
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC, first_upload_at DESC;
END;
$$;


--
-- Name: get_fast_organize_pending("uuid", "text", integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_fast_organize_pending"("p_user_id" "uuid", "p_type" "text", "p_limit" integer, "p_offset" integer) RETURNS TABLE("id" "uuid", "title" "text", "url" "text", "type" "text", "category_id" "uuid", "user_id" "uuid", "created_at" timestamp with time zone, "username" "text", "avatar_url" "text", "source_table" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id, m.title, m.url, m.type, m.category_id, m.user_id, m.created_at,
        p.username, p.avatar_url, 'media_items'::text as source_table
    FROM public.media_items m
    INNER JOIN public.user_pending_items upi ON upi.media_id = m.id
    LEFT JOIN public.profiles p ON m.user_id = p.id
    WHERE upi.user_id = p_user_id
      AND m.category_id IS NULL
      AND m.deleted_at IS NULL
      AND (p_type = 'all' OR m.type = p_type)
    ORDER BY upi.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;


--
-- Name: get_fast_organize_uncategorized("uuid", "text", integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_fast_organize_uncategorized"("p_user_id" "uuid", "p_type" "text", "p_limit" integer, "p_offset" integer) RETURNS TABLE("id" "uuid", "title" "text", "url" "text", "type" "text", "category_id" "uuid", "user_id" "uuid", "created_at" timestamp with time zone, "username" "text", "avatar_url" "text", "source_table" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_unclassifiable_category_id UUID;
BEGIN
    -- 获取"无法分类"分类的 ID
    SELECT cc.id INTO v_unclassifiable_category_id
    FROM public.content_categories cc
    WHERE cc.name = '无法分类'
    LIMIT 1;

    RETURN QUERY
    (
        SELECT 
            m.id, m.title, m.url, m.type, m.category_id, m.user_id, m.created_at,
            p.username, p.avatar_url, 'media_items'::text as source_table
        FROM public.media_items m
        LEFT JOIN public.profiles p ON m.user_id = p.id
        WHERE m.category_id IS NULL 
          AND m.deleted_at IS NULL
          AND (p_type = 'all' OR m.type = p_type)
          AND NOT EXISTS (
              SELECT 1 FROM public.user_pending_items upi 
              WHERE upi.media_id = m.id AND upi.user_id = p_user_id
          )
          AND (v_unclassifiable_category_id IS NULL OR m.id NOT IN (
              SELECT mi.id FROM public.media_items mi WHERE mi.category_id = v_unclassifiable_category_id
          ))
    )
    UNION ALL
    (
        SELECT 
            s.id, s.title, s.url, s.type, s.category_id, s.owner_id as user_id, s.created_at,
            p.username, p.avatar_url, 'media_staging'::text as source_table
        FROM public.media_staging s
        LEFT JOIN public.profiles p ON s.owner_id = p.id
        WHERE s.category_id IS NULL
          AND (p_type = 'all' OR s.type = p_type)
          AND s.status::public.item_status = 'pending'::public.item_status
    )
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;


--
-- Name: get_favorites_cursor_paginated("uuid", timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_favorites_cursor_paginated"("p_user_id" "uuid", "p_cursor" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_limit" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "media_id" "uuid", "user_id" "uuid", "created_at" timestamp with time zone, "media_url" "text", "media_thumbnail_url" "text", "media_type" "text", "media_title" "text", "next_cursor" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.media_id,
    f.user_id,
    f.created_at,
    m.url as media_url,
    m.thumbnail_url as media_thumbnail_url,
    m.type as media_type,
    m.title as media_title,
    f.created_at as next_cursor
  FROM favorites f
  INNER JOIN media_items m ON f.media_id = m.id
  WHERE 
    f.user_id = p_user_id
    AND m.deleted_at IS NULL
    AND (p_cursor IS NULL OR f.created_at < p_cursor)
  ORDER BY f.created_at DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: FUNCTION "get_favorites_cursor_paginated"("p_user_id" "uuid", "p_cursor" timestamp with time zone, "p_limit" integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION "public"."get_favorites_cursor_paginated"("p_user_id" "uuid", "p_cursor" timestamp with time zone, "p_limit" integer) IS '游标分页获取收藏列表';


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: media_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."media_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "type" "text" NOT NULL,
    "status" "public"."item_status" DEFAULT 'pending'::"public"."item_status",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "title" "text",
    "thumbnail_url" "text",
    "views_count" bigint DEFAULT 0,
    "favorite_count" bigint DEFAULT 0,
    "dislike_count" bigint DEFAULT 0,
    "view_count" bigint DEFAULT 0,
    "description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "category_id" "uuid",
    "classified_by" "uuid",
    "classified_at" timestamp with time zone,
    "file_md5" "text",
    "content_hash" "text",
    "dedupe_error" "text",
    "audit_skip_reason" "text",
    "deleted_at" timestamp with time zone,
    "dedupe_ignored" boolean DEFAULT false,
    "dedupe_version" integer DEFAULT 0,
    "manual_boost" double precision DEFAULT 0,
    "thumbnail_format" "text" DEFAULT 'webp'::"text",
    "heat_score" double precision DEFAULT 0,
    "is_recommended" boolean DEFAULT false,
    "is_hidden" boolean DEFAULT false,
    "exclude_from_daily_gallery" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "wechat_draft_status" "text" DEFAULT 'available'::"text",
    "zonerama_photo_id" "text",
    "daily_gallery_status" "text" DEFAULT 'unused'::"text",
    "daily_gallery_date" "date",
    "rejection_reason" "text",
    "wechat_draft_tracking_id" "text",
    "wechat_last_used_at" timestamp with time zone,
    CONSTRAINT "media_items_type_check" CHECK (("type" = ANY (ARRAY['image'::"text", 'video'::"text"])))
);


--
-- Name: TABLE "media_items"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."media_items" IS '媒体库表，已修复 RLS 递归问题并清理冗余策略';


--
-- Name: COLUMN "media_items"."thumbnail_url"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."media_items"."thumbnail_url" IS '缩略图URL（优先使用WebP格式）';


--
-- Name: COLUMN "media_items"."file_md5"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."media_items"."file_md5" IS '文件MD5哈希值，用于去重检测';


--
-- Name: COLUMN "media_items"."content_hash"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."media_items"."content_hash" IS '图片内容视觉哈希值（Perceptual Hash），用于识别视觉相似图片';


--
-- Name: COLUMN "media_items"."dedupe_error"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."media_items"."dedupe_error" IS '去重扫描（指纹提取）失败的原因';


--
-- Name: COLUMN "media_items"."dedupe_version"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."media_items"."dedupe_version" IS '指纹版本，用于排除已处理的相似项';


--
-- Name: COLUMN "media_items"."thumbnail_format"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."media_items"."thumbnail_format" IS '缩略图格式（webp/jpeg/png）';


--
-- Name: COLUMN "media_items"."zonerama_photo_id"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."media_items"."zonerama_photo_id" IS 'Zonerama 图片 ID，用于避免重复导入';


--
-- Name: COLUMN "media_items"."daily_gallery_status"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."media_items"."daily_gallery_status" IS '每日图集状态：unused(待使用)、pending(待发布)、used(已使用)。仅对 approved、未删除、未隐藏、未排除的图片有效';


--
-- Name: get_filtered_random_media(integer, "text", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_filtered_random_media"("limit_count" integer, "p_type" "text" DEFAULT 'all'::"text", "p_category_id" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "public"."media_items"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.media_items
    WHERE status::public.item_status = 'approved'::public.item_status
      AND is_hidden = false
      AND deleted_at IS NULL
      AND (p_type = 'all' OR type = p_type)
      AND (p_category_id IS NULL OR category_id = p_category_id)
    ORDER BY random()
    LIMIT limit_count;
END;
$$;


--
-- Name: get_media_by_similar_hash("text", integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_media_by_similar_hash"("p_hash" "text", "p_threshold" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "user_id" "uuid", "url" "text", "type" "text", "content_hash" "text", "created_at" timestamp with time zone, "profiles" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH target AS (
    SELECT m2.dedupe_version 
    FROM public.media_items m2 
    WHERE m2.content_hash = p_hash 
    LIMIT 1
  )
  SELECT 
    m.id, 
    m.user_id, 
    m.url, 
    m.type, 
    m.content_hash, 
    m.created_at,
    CASE 
      WHEN p.id IS NOT NULL THEN row_to_json(p)::jsonb 
      ELSE NULL 
    END as profiles
  FROM public.media_items m
  LEFT JOIN public.profiles p ON m.user_id = p.id
  CROSS JOIN target t
  WHERE m.content_hash IS NOT NULL 
    AND m.type = 'image' 
    AND m.deleted_at IS NULL
    AND (m.dedupe_ignored IS NULL OR m.dedupe_ignored = FALSE)
    AND m.dedupe_version = t.dedupe_version
    AND bit_count(('x' || lpad(m.content_hash, 16, '0'))::bit(64) # ('x' || lpad(p_hash, 16, '0'))::bit(64)) <= p_threshold
  ORDER BY m.created_at ASC;
END;
$$;


--
-- Name: get_media_cursor_paginated(timestamp with time zone, integer, "uuid", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_media_cursor_paginated"("p_cursor" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_limit" integer DEFAULT 20, "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_type" "text" DEFAULT 'all'::"text", "p_category_id" "text" DEFAULT 'all'::"text", "p_status" "text" DEFAULT 'approved'::"public"."item_status") RETURNS TABLE("id" "uuid", "user_id" "uuid", "url" "text", "thumbnail_url" "text", "type" "text", "title" "text", "description" "text", "status" "text", "category_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "view_count" integer, "like_count" integer, "favorite_count" integer, "username" "text", "avatar_url" "text", "next_cursor" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.user_id,
    m.url,
    m.thumbnail_url,
    m.type,
    m.title,
    m.description,
    m.status,
    m.category_id,
    m.created_at,
    m.updated_at,
    m.view_count,
    m.like_count,
    m.favorite_count,
    p.username,
    p.avatar_url,
    m.created_at as next_cursor
  FROM media_items m
  LEFT JOIN profiles p ON m.user_id = p.id
  WHERE 
    m.deleted_at IS NULL
    AND (p_cursor IS NULL OR m.created_at < p_cursor)
    AND (p_status = 'all' OR m.status = p_status::public.item_status)
    AND (p_type = 'all' OR m.type = p_type)
    AND (p_category_id = 'all' OR m.category_id::TEXT = p_category_id)
    AND (p_user_id IS NULL OR m.user_id = p_user_id)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: FUNCTION "get_media_cursor_paginated"("p_cursor" timestamp with time zone, "p_limit" integer, "p_user_id" "uuid", "p_type" "text", "p_category_id" "text", "p_status" "text"); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION "public"."get_media_cursor_paginated"("p_cursor" timestamp with time zone, "p_limit" integer, "p_user_id" "uuid", "p_type" "text", "p_category_id" "text", "p_status" "text") IS '游标分页获取媒体列表，避免OFFSET性能问题';


--
-- Name: get_media_library_v2(integer, integer, "text", "text", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_media_library_v2"("p_page" integer, "p_limit" integer, "p_search" "text", "p_status" "text", "p_type" "text", "p_category_id" "text", "p_tag_id" "text") RETURNS TABLE("id" "uuid", "title" "text", "url" "text", "thumbnail_url" "text", "type" "text", "status" "text", "category_id" "uuid", "user_id" "uuid", "created_at" timestamp with time zone, "deleted_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_offset INTEGER := p_page * p_limit;
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.title,
    m.url,
    m.thumbnail_url,
    m.type,
    m.status::text,
    m.category_id,
    m.user_id,
    m.created_at,
    m.deleted_at,
    COUNT(*) OVER() as total_count
  FROM media_items m
  WHERE (p_search = '' OR m.title ILIKE '%' || p_search || '%')
    AND (
      CASE 
        WHEN p_status = 'all' THEN m.deleted_at IS NULL
        WHEN p_status = 'deleted' THEN m.deleted_at IS NOT NULL
        WHEN p_status = 'archived' THEN m.status::text = 'archived' AND m.deleted_at IS NULL
        WHEN p_status = 'pending' THEN m.status::text = 'pending' AND m.deleted_at IS NULL
        WHEN p_status = 'approved' THEN m.status::text = 'approved' AND m.deleted_at IS NULL
        ELSE m.status::text = p_status AND m.deleted_at IS NULL
      END
    )
    AND (p_type = 'all' OR m.type = p_type)
    AND (
      p_category_id = 'all' 
      OR (p_category_id = 'none' AND m.category_id IS NULL)
      OR (m.category_id = p_category_id::UUID)
    )
    AND (
      p_tag_id = 'all'
      OR (p_tag_id = 'none' AND NOT EXISTS (SELECT 1 FROM media_tags mt WHERE mt.media_id = m.id))
      OR (EXISTS (SELECT 1 FROM media_tags mt WHERE mt.media_id = m.id AND mt.tag_id = p_tag_id::UUID))
    )
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;


--
-- Name: get_media_row_number("uuid", "text", "text", "text", "uuid"[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_media_row_number"("p_media_id" "uuid", "p_sort_by" "text" DEFAULT 'latest'::"text", "p_type" "text" DEFAULT 'all'::"text", "p_category_id" "text" DEFAULT 'all'::"text", "p_tag_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(
    (
      SELECT (rn - 1)::integer
      FROM (
        SELECT
          id,
          ROW_NUMBER() OVER (
            ORDER BY
              CASE WHEN p_sort_by = 'popular' THEN heat_score END DESC NULLS LAST,
              created_at DESC
          ) AS rn
        FROM media_items
        WHERE status = 'approved'
          AND deleted_at IS NULL
          AND is_hidden = FALSE
          AND (p_type = 'all' OR type = p_type)
          AND (
            p_category_id = 'all' 
            OR (p_category_id = 'none' AND category_id IS NULL)
            OR category_id::text = p_category_id
          )
          AND (
            p_tag_ids IS NULL 
            OR array_length(p_tag_ids, 1) IS NULL
            OR id IN (
              SELECT media_id FROM media_tags WHERE tag_id = ANY(p_tag_ids)
            )
          )
      ) ranked
      WHERE id = p_media_id
    ),
    -1
  );
$$;


--
-- Name: get_media_row_number("uuid", "uuid", "text", "text", "text", "uuid"[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_media_row_number"("p_media_id" "uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_sort_by" "text" DEFAULT 'latest'::"text", "p_type" "text" DEFAULT 'all'::"text", "p_category_id" "text" DEFAULT 'all'::"text", "p_tag_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_excluded_category_ids uuid[] := ARRAY[]::uuid[];
    v_excluded_tag_ids uuid[] := ARRAY[]::uuid[];
    v_row_number integer;
BEGIN
    -- 获取屏蔽配置
    IF p_user_id IS NOT NULL THEN
        SELECT 
            COALESCE(ARRAY(SELECT jsonb_array_elements_text(prof.custom_fields->'preferences'->'disliked_categories')::uuid), ARRAY[]::uuid[]),
            COALESCE(ARRAY(SELECT jsonb_array_elements_text(prof.custom_fields->'preferences'->'disliked_tags')::uuid), ARRAY[]::uuid[])
        INTO v_excluded_category_ids, v_excluded_tag_ids
        FROM public.profiles AS prof
        WHERE prof.id = p_user_id;
    END IF;

    -- 追加不可见过滤
    v_excluded_category_ids := ARRAY(
        SELECT sub_cc_id FROM (
            SELECT unnest(COALESCE(v_excluded_category_ids, ARRAY[]::uuid[])) as sub_cc_id
            UNION
            SELECT cat.id FROM public.content_categories cat WHERE cat.is_visible = false
        ) s WHERE sub_cc_id IS NOT NULL
    );
    
    v_excluded_tag_ids := ARRAY(
        SELECT sub_t_id FROM (
            SELECT unnest(COALESCE(v_excluded_tag_ids, ARRAY[]::uuid[])) as sub_t_id
            UNION
            SELECT tg.id FROM public.tags tg WHERE tg.is_visible = false
        ) s WHERE sub_t_id IS NOT NULL
    );

    SELECT rn - 1 INTO v_row_number
    FROM (
        SELECT 
            m.id,
            ROW_NUMBER() OVER (
                ORDER BY 
                    CASE WHEN p_sort_by = 'latest' THEN m.created_at END DESC,
                    CASE WHEN p_sort_by = 'popular' THEN m.heat_score END DESC,
                    CASE WHEN p_sort_by = 'popular' THEN m.view_count END DESC,
                    CASE WHEN p_sort_by = 'popular' THEN m.created_at END DESC
            ) as rn
        FROM public.media_items m
        LEFT JOIN public.content_categories cc ON m.category_id = cc.id
        WHERE m.status = 'approved' AND m.deleted_at IS NULL AND m.is_hidden = false
          AND (p_type = 'all' OR m.type = p_type)
          AND (
            p_category_id = 'all' 
            OR (p_category_id = 'none' AND m.category_id IS NULL)
            OR (p_category_id != 'none' AND p_category_id != 'all' AND m.category_id = p_category_id::uuid)
          )
          AND (
            p_tag_ids IS NULL 
            OR ARRAY_LENGTH(p_tag_ids, 1) IS NULL 
            OR (
                p_tag_ids = ARRAY['00000000-0000-0000-0000-000000000000']::uuid[] 
                AND NOT EXISTS (SELECT 1 FROM public.media_tags mt WHERE mt.media_id = m.id)
            )
            OR EXISTS (
              SELECT 1 FROM public.media_tags mt 
              WHERE mt.media_id = m.id AND mt.tag_id = ANY(p_tag_ids)
            )
          )
          AND (p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.dislikes d WHERE d.media_id = m.id AND d.user_id = p_user_id))
          AND (m.category_id IS NULL OR (cc.id IS NOT NULL AND cc.is_visible = true))
          AND NOT EXISTS (
              SELECT 1 FROM public.media_tags mt
              JOIN public.tags t ON mt.tag_id = t.id
              WHERE mt.media_id = m.id AND t.is_visible = false
          )
          AND (m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_category_ids)))
          AND NOT EXISTS (SELECT 1 FROM public.media_tags mt WHERE mt.media_id = m.id AND mt.tag_id = ANY(v_excluded_tag_ids))
    ) ranked
    WHERE id = p_media_id;

    RETURN COALESCE(v_row_number, -1);
END;
$$;


--
-- Name: get_media_staging_v2(integer, integer, "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_media_staging_v2"("p_page" integer, "p_limit" integer, "p_status" "text" DEFAULT 'pending'::"text") RETURNS TABLE("id" "uuid", "url" "text", "thumbnail_url" "text", "title" "text", "type" "text", "category_id" "uuid", "owner_id" "uuid", "status" "text", "tag_names" "text"[], "created_at" timestamp with time zone, "deleted_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_offset INTEGER := p_page * p_limit;
BEGIN
  RETURN QUERY
  SELECT 
    ms.id,
    ms.url,
    ms.thumbnail_url,
    ms.title,
    ms.type,
    ms.category_id,
    ms.owner_id,
    ms.status::text,
    ms.tag_names,
    ms.created_at,
    ms.deleted_at,
    COUNT(*) OVER() as total_count
  FROM public.media_staging ms
  WHERE ms.deleted_at IS NULL
    AND (p_status = 'all' OR ms.status::text = p_status)
  ORDER BY ms.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;


--
-- Name: get_media_with_thumbnails(integer, integer, "uuid", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_media_with_thumbnails"("p_offset" integer DEFAULT 0, "p_limit" integer DEFAULT 20, "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_status" "text" DEFAULT 'approved'::"public"."item_status") RETURNS TABLE("id" "uuid", "url" "text", "thumbnail_url" "text", "display_url" "text", "title" "text", "type" "text", "status" "text", "view_count" integer, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.url,
    m.thumbnail_url,
    COALESCE(m.thumbnail_url, m.url) as display_url,
    m.title,
    m.type,
    m.status,
    m.view_count,
    m.created_at
  FROM public.media_items m
  WHERE (p_status IS NULL OR m.status = p_status::public.item_status)
    AND (p_user_id IS NULL OR m.user_id = p_user_id)
  ORDER BY m.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;


--
-- Name: FUNCTION "get_media_with_thumbnails"("p_offset" integer, "p_limit" integer, "p_user_id" "uuid", "p_status" "text"); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION "public"."get_media_with_thumbnails"("p_offset" integer, "p_limit" integer, "p_user_id" "uuid", "p_status" "text") IS '获取媒体列表（优先返回缩略图）';


--
-- Name: get_optimized_media_items_v3("uuid", "text", "text", "uuid"[], "text", integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_optimized_media_items_v3"("p_user_id" "uuid", "p_type" "text" DEFAULT 'all'::"text", "p_category_id" "text" DEFAULT 'all'::"text", "p_tag_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_sort_by" "text" DEFAULT 'latest'::"text", "p_limit" integer DEFAULT 10, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "title" "text", "description" "text", "url" "text", "thumbnail_url" "text", "type" "text", "category_id" "uuid", "user_id" "uuid", "view_count" bigint, "favorite_count" bigint, "heat_score" double precision, "created_at" timestamp with time zone, "status" "text", "deleted_at" timestamp with time zone, "is_hidden" boolean, "username" "text", "avatar_url" "text", "content_categories" "jsonb", "media_tags" "jsonb", "total_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_excluded_category_ids uuid[] := ARRAY[]::uuid[];
    v_excluded_tag_ids uuid[] := ARRAY[]::uuid[];
    v_category_id_uuid uuid;
BEGIN
    -- 获取用户的黑名单配置（如果有）
    IF p_user_id IS NOT NULL THEN
        SELECT 
            COALESCE(ARRAY(SELECT jsonb_array_elements_text(prof.custom_fields->'preferences'->'disliked_categories')::uuid), ARRAY[]::uuid[]),
            COALESCE(ARRAY(SELECT jsonb_array_elements_text(prof.custom_fields->'preferences'->'disliked_tags')::uuid), ARRAY[]::uuid[])
        INTO v_excluded_category_ids, v_excluded_tag_ids
        FROM public.profiles AS prof
        WHERE prof.id = p_user_id;
    END IF;

    -- 追加过滤：获取所有设置为不可见(is_visible=false)的分类和标签ID
    v_excluded_category_ids := ARRAY(
        SELECT sub_cc_id FROM (
            SELECT unnest(COALESCE(v_excluded_category_ids, ARRAY[]::uuid[])) as sub_cc_id
            UNION
            SELECT cat.id FROM public.content_categories cat WHERE cat.is_visible = false
        ) s WHERE sub_cc_id IS NOT NULL
    );
    
    v_excluded_tag_ids := ARRAY(
        SELECT sub_t_id FROM (
            SELECT unnest(COALESCE(v_excluded_tag_ids, ARRAY[]::uuid[])) as sub_t_id
            UNION
            SELECT tg.id FROM public.tags tg WHERE tg.is_visible = false
        ) s WHERE sub_t_id IS NOT NULL
    );

    -- 预处理分类 ID
    IF p_category_id IS NOT NULL AND p_category_id != '' AND p_category_id != 'all' AND p_category_id != 'none' THEN
        BEGIN
            v_category_id_uuid := p_category_id::uuid;
        EXCEPTION WHEN OTHERS THEN
            v_category_id_uuid := NULL;
        END;
    END IF;

    RETURN QUERY
    WITH filtered_items AS (
        SELECT 
            m.id, m.title, m.description, m.url, m.thumbnail_url, m.type, m.category_id, m.user_id,
            m.view_count, m.favorite_count, m.heat_score, m.created_at, m.status, m.deleted_at, m.is_hidden,
            p.username,
            p.avatar_url,
            to_jsonb(cc.*) as content_categories_json,
            COALESCE(
                (SELECT jsonb_agg(jsonb_build_object('tag_id', mt.tag_id, 'tags', t.*))
                 FROM public.media_tags mt
                 JOIN public.tags t ON mt.tag_id = t.id
                 WHERE mt.media_id = m.id),
                '[]'::jsonb
            ) as media_tags_json
        FROM public.media_items m
        LEFT JOIN public.profiles p ON m.user_id = p.id
        LEFT JOIN public.content_categories cc ON m.category_id = cc.id
        WHERE m.status::public.item_status = 'approved'::public.item_status AND m.deleted_at IS NULL AND m.is_hidden = false
          AND (p_type = 'all' OR m.type = p_type)
          AND (
            COALESCE(p_category_id, 'all') = 'all' 
            OR (p_category_id = 'none' AND m.category_id IS NULL)
            OR (v_category_id_uuid IS NOT NULL AND m.category_id = v_category_id_uuid)
            OR (v_category_id_uuid IS NULL AND p_category_id != 'all' AND p_category_id != 'none' AND FALSE) -- 非 UUID 且非特殊字符时，不匹配任何分类
          )
          AND (
            p_tag_ids IS NULL 
            OR ARRAY_LENGTH(p_tag_ids, 1) IS NULL 
            OR (
                p_tag_ids = ARRAY['00000000-0000-0000-0000-000000000000']::uuid[] 
                AND NOT EXISTS (SELECT 1 FROM public.media_tags mt WHERE mt.media_id = m.id)
            )
            OR EXISTS (
              SELECT 1 FROM public.media_tags mt 
              WHERE mt.media_id = m.id AND mt.tag_id = ANY(p_tag_ids)
            )
          )
          AND (p_user_id IS NULL OR (
              NOT EXISTS (SELECT 1 FROM public.favorites f WHERE f.media_id = m.id AND f.user_id = p_user_id)
              AND NOT EXISTS (SELECT 1 FROM public.dislikes d WHERE d.media_id = m.id AND d.user_id = p_user_id)
          ))
          -- 全局可见性过滤（分类）
          AND (m.category_id IS NULL OR (cc.id IS NOT NULL AND cc.is_visible = true))
          -- 全局可见性过滤（标签）
          AND NOT EXISTS (
              SELECT 1 FROM public.media_tags mt
              JOIN public.tags t ON mt.tag_id = t.id
              WHERE mt.media_id = m.id AND t.is_visible = false
          )
          -- 用户/可见性排除过滤
          AND (m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_category_ids)))
          AND NOT EXISTS (SELECT 1 FROM public.media_tags mt WHERE mt.media_id = m.id AND mt.tag_id = ANY(v_excluded_tag_ids))
    ),
    total_count_cte AS (
        SELECT count(*) as total FROM filtered_items
    )
    SELECT 
        fi.id, fi.title, fi.description, fi.url, fi.thumbnail_url, fi.type, fi.category_id, fi.user_id,
        COALESCE(fi.view_count, 0)::bigint, COALESCE(fi.favorite_count, 0)::bigint, COALESCE(fi.heat_score, 0)::double precision,
        fi.created_at, fi.status::text, fi.deleted_at, fi.is_hidden,
        fi.username, fi.avatar_url,
        fi.content_categories_json,
        fi.media_tags_json,
        tc.total
    FROM filtered_items fi, total_count_cte tc
    ORDER BY 
        CASE WHEN p_sort_by = 'latest' THEN fi.created_at END DESC,
        CASE WHEN p_sort_by = 'popular' THEN fi.heat_score END DESC,
        CASE WHEN p_sort_by = 'popular' THEN fi.view_count END DESC,
        CASE WHEN p_sort_by = 'popular' THEN fi.created_at END DESC,
        CASE WHEN p_sort_by = 'random' THEN RANDOM() END
    LIMIT p_limit OFFSET p_offset;
END;
$$;


--
-- Name: get_optimized_media_items_v4("uuid", "text", "text", "uuid"[], "text", integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_optimized_media_items_v4"("p_user_id" "uuid", "p_type" "text", "p_category_id" "text", "p_tag_ids" "uuid"[], "p_sort_by" "text", "p_limit" integer, "p_offset" integer) RETURNS TABLE("id" "uuid", "title" "text", "description" "text", "url" "text", "thumbnail_url" "text", "type" "text", "user_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "status" "text", "heat_score" numeric, "view_count" bigint, "virtual_view_count" bigint, "like_count" bigint, "username" "text", "avatar_url" "text", "content_categories" "jsonb", "media_tags" "jsonb", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH filtered_items AS (
        SELECT 
            mi.id, mi.title, mi.description, mi.url, mi.thumbnail_url, mi.type,
            mi.user_id, mi.created_at, mi.updated_at, mi.status, mi.heat_score,
            mi.view_count, mi.virtual_view_count, mi.like_count,
            p.username,
            p.avatar_url,
            (
                SELECT jsonb_build_object('id', cc.id, 'name', cc.name)
                FROM content_categories cc
                WHERE cc.id = mi.category_id
            ) as content_categories_json,
            (
                SELECT jsonb_agg(jsonb_build_object('tag_id', mt.tag_id, 'tags', jsonb_build_object('name', t.name)))
                FROM media_tags mt
                JOIN tags t ON mt.tag_id = t.id
                WHERE mt.media_id = mi.id
            ) as media_tags_json
        FROM media_items mi
        LEFT JOIN profiles p ON mi.user_id = p.id
        WHERE mi.status = 'approved'
          AND mi.deleted_at IS NULL
          AND (p_type = 'all' OR mi.type = p_type)
          AND (p_category_id = 'all' OR mi.category_id::text = p_category_id)
          AND (p_tag_ids IS NULL OR EXISTS (
              SELECT 1 FROM media_tags mt2 
              WHERE mt2.media_id = mi.id AND mt2.tag_id = ANY(p_tag_ids)
          ))
          AND (p_user_id IS NULL OR NOT EXISTS (
              SELECT 1 FROM media_dislikes md 
              WHERE md.media_id = mi.id AND md.user_id = p_user_id
          ))
    ),
    counted_items AS (
        SELECT count(*) as total FROM filtered_items
    )
    SELECT 
        fi.id, fi.title, fi.description, fi.url, fi.thumbnail_url, fi.type,
        fi.user_id, fi.created_at, fi.updated_at, fi.status, fi.heat_score,
        fi.view_count, fi.virtual_view_count, fi.like_count,
        fi.username, fi.avatar_url, fi.content_categories_json, fi.media_tags_json,
        ci.total
    FROM filtered_items fi, counted_items ci
    ORDER BY 
        CASE WHEN p_sort_by = 'popular' THEN fi.heat_score END DESC,
        CASE WHEN p_sort_by = 'latest' THEN fi.created_at END DESC,
        CASE WHEN p_sort_by = 'random' THEN random() END
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


--
-- Name: get_random_daily_gallery_images(integer, "uuid"[], "text"[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_random_daily_gallery_images"("p_count" integer, "p_excluded_categories" "uuid"[] DEFAULT '{}'::"uuid"[], "p_excluded_tags" "text"[] DEFAULT '{}'::"text"[]) RETURNS SETOF "public"."media_items"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_fifteen_days_ago timestamp with time zone := now() - interval '15 days';
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.media_items
    WHERE status::public.item_status = 'approved'::public.item_status
      AND type = 'image'
      AND is_hidden = false
      AND deleted_at IS NULL
      AND (exclude_from_daily_gallery = false OR exclude_from_daily_gallery IS NULL)
      AND (p_excluded_categories = '{}' OR category_id IS NULL OR NOT (category_id = ANY(p_excluded_categories)))
      AND (p_excluded_tags = '{}' OR NOT (tags && p_excluded_tags))
      -- 15-day Wechat rule
      AND (
          wechat_draft_status = 'available' 
          OR wechat_draft_status IS NULL 
          OR (wechat_draft_status IN ('used', 'adopted') AND (wechat_last_used_at IS NULL OR wechat_last_used_at < v_fifteen_days_ago))
      )
    ORDER BY 
        -- 尽量使用微信公众号的草稿库素材中已入稿库以外的图片
        (CASE WHEN wechat_draft_status = 'available' OR wechat_draft_status IS NULL THEN 0 ELSE 1 END) ASC,
        -- 优先使用时间靠前的图片
        created_at ASC
    LIMIT p_count;
END;
$$;


--
-- Name: get_random_media(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_random_media"("limit_count" integer) RETURNS SETOF "public"."media_items"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM media_items
  WHERE status::public.item_status = 'approved'::public.item_status AND deleted_at IS NULL
  ORDER BY random()
  LIMIT limit_count;
END;
$$;


--
-- Name: get_random_media_items(integer, "uuid", "text", "text", "uuid"[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_random_media_items"("p_limit" integer, "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_type" "text" DEFAULT 'all'::"text", "p_category_id" "text" DEFAULT 'all'::"text", "p_tag_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS TABLE("id" "uuid", "title" "text", "url" "text", "thumbnail_url" "text", "type" "text", "category_id" "uuid", "user_id" "uuid", "view_count" bigint, "favorite_count" bigint, "created_at" timestamp with time zone, "status" "text", "deleted_at" timestamp with time zone, "is_hidden" boolean, "username" "text", "avatar_url" "text", "content_categories_json" "jsonb", "media_tags" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id, 
        m.title, 
        m.url, 
        m.thumbnail_url, 
        m.type, 
        m.category_id, 
        m.user_id, 
        COALESCE(m.view_count, 0)::bigint, 
        COALESCE(m.favorite_count, 0)::bigint, 
        m.created_at, 
        m.status::text,
        m.deleted_at,
        m.is_hidden,
        p.username, 
        p.avatar_url,
        to_jsonb(cc.*) as content_categories_json,
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object('tag_id', mt.tag_id, 'tags', t.*))
             FROM public.media_tags mt
             JOIN public.tags t ON mt.tag_id = t.id
             WHERE mt.media_id = m.id),
            '[]'::jsonb
        ) as media_tags
    FROM public.media_items m
    LEFT JOIN public.profiles p ON m.user_id = p.id
    LEFT JOIN public.content_categories cc ON m.category_id = cc.id
    WHERE m.status::public.item_status = 'approved'::public.item_status 
      AND m.deleted_at IS NULL
      AND m.is_hidden = false
      AND (p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.dislikes d WHERE d.media_id = m.id AND d.user_id = p_user_id))
      -- 全局可见性过滤
      AND (m.category_id IS NULL OR (cc.id IS NOT NULL AND cc.is_visible = true))
      AND NOT EXISTS (
          SELECT 1 FROM public.media_tags mt
          JOIN public.tags t ON mt.tag_id = t.id
          WHERE mt.media_id = m.id AND t.is_visible = false
      )
      -- 动态过滤
      AND (p_type = 'all' OR m.type = p_type)
      AND (
        p_category_id = 'all' 
        OR (p_category_id = 'none' AND m.category_id IS NULL)
        OR (p_category_id != 'none' AND p_category_id != 'all' AND m.category_id = p_category_id::uuid)
      )
      AND (
        p_tag_ids IS NULL 
        OR ARRAY_LENGTH(p_tag_ids, 1) IS NULL 
        OR (
            p_tag_ids = ARRAY['00000000-0000-0000-0000-000000000000']::uuid[] 
            AND NOT EXISTS (SELECT 1 FROM public.media_tags mt WHERE mt.media_id = m.id)
        )
        OR EXISTS (
          SELECT 1 FROM public.media_tags mt 
          WHERE mt.media_id = m.id AND mt.tag_id = ANY(p_tag_ids)
        )
      )
    ORDER BY RANDOM()
    LIMIT p_limit;
END;
$$;


--
-- Name: get_random_unused_images(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_random_unused_images"("count" integer) RETURNS SETOF "public"."media_items"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_excluded_cats uuid[];
    v_excluded_tags text[];
BEGIN
    -- Get exclusion settings from system config
    SELECT 
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(value->'excluded_categories'))::uuid[], '{}'::uuid[]),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(value->'excluded_tags'))::text[], '{}'::text[])
    INTO v_excluded_cats, v_excluded_tags
    FROM public.system_configs
    WHERE key = 'daily_gallery_config';

    RETURN QUERY
    SELECT *
    FROM public.media_items
    WHERE status::public.item_status = 'approved'::public.item_status
      AND type = 'image'
      AND is_hidden = false
      AND deleted_at IS NULL
      AND (exclude_from_daily_gallery = false OR exclude_from_daily_gallery IS NULL)
      AND COALESCE(daily_gallery_status, 'unused') = 'unused'
      AND (v_excluded_cats = '{}' OR category_id IS NULL OR NOT (category_id = ANY(v_excluded_cats)))
      AND (v_excluded_tags = '{}' OR NOT (tags && v_excluded_tags))
    ORDER BY random()
    LIMIT count;
END;
$$;


--
-- Name: get_recommended_media("uuid", integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_recommended_media"("p_user_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 10, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "url" "text", "thumbnail_url" "text", "title" "text", "type" "text", "favorite_count" bigint, "view_count" bigint, "created_at" timestamp with time zone, "username" "text", "avatar_url" "text", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_total bigint;
BEGIN
    SELECT count(*) INTO v_total FROM public.media_items WHERE status::public.item_status = 'approved'::public.item_status AND is_hidden = false AND deleted_at IS NULL;

    RETURN QUERY
    SELECT 
        m.id, m.url, m.thumbnail_url, m.title, m.type, m.favorite_count, m.view_count, m.created_at,
        p.username, p.avatar_url, v_total
    FROM public.media_items m
    LEFT JOIN public.profiles p ON m.user_id = p.id
    WHERE m.status::public.item_status = 'approved'::public.item_status AND m.is_hidden = false AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


--
-- Name: get_recommended_media_v2("uuid", integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_recommended_media_v2"("p_user_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 10, "p_offset" integer DEFAULT 0, "p_intensity" integer DEFAULT 1) RETURNS TABLE("id" "uuid", "url" "text", "thumbnail_url" "text", "title" "text", "type" "text", "favorite_count" bigint, "view_count" bigint, "created_at" timestamp with time zone, "username" "text", "avatar_url" "text", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_total bigint;
BEGIN
    SELECT count(*) INTO v_total FROM public.media_items WHERE status::public.item_status = 'approved'::public.item_status AND is_hidden = false AND deleted_at IS NULL;

    RETURN QUERY
    SELECT 
        m.id, m.url, m.thumbnail_url, m.title, m.type, m.favorite_count, m.view_count, m.created_at,
        p.username, p.avatar_url, v_total
    FROM public.media_items m
    LEFT JOIN public.profiles p ON m.user_id = p.id
    WHERE m.status::public.item_status = 'approved'::public.item_status AND m.is_hidden = false AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


--
-- Name: get_recommended_media_v3("uuid", integer, integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_recommended_media_v3"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer, "p_intensity" double precision DEFAULT 1.0) RETURNS SETOF "public"."media_items"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_intensity_multiplier FLOAT;
BEGIN
    v_intensity_multiplier := COALESCE(p_intensity, 1.0);
    
    RETURN QUERY
    WITH user_tag_preferences AS (
        -- 基于显式标签偏好
        SELECT 
            (elem->>'id')::UUID as tag_id,
            10.0 as score
        FROM public.profiles p,
        LATERAL jsonb_array_elements(COALESCE(p.custom_fields->'preferences'->'liked_tags', '[]'::jsonb)) as elem
        WHERE p.id = p_user_id
        
        UNION ALL
        
        SELECT 
            (elem->>'id')::UUID as tag_id,
            -50.0 as score
        FROM public.profiles p,
        LATERAL jsonb_array_elements(COALESCE(p.custom_fields->'preferences'->'disliked_tags', '[]'::jsonb)) as elem
        WHERE p.id = p_user_id
        
        UNION ALL
        
        -- 基于隐式行为偏好
        SELECT 
            mt.tag_id,
            SUM(ui.weight)::FLOAT * v_intensity_multiplier as score
        FROM public.user_interactions ui
        JOIN public.media_tags mt ON ui.media_id = mt.media_id
        WHERE ui.user_id = p_user_id
        GROUP BY mt.tag_id
    ),
    tag_scores AS (
        SELECT tag_id, SUM(score) as total_score
        FROM user_tag_preferences
        GROUP BY tag_id
    ),
    media_scores AS (
        SELECT 
            m.id,
            COALESCE(SUM(ts.total_score), 0) as media_relevance
        FROM public.media_items m
        LEFT JOIN public.media_tags mt ON m.id = mt.media_id
        LEFT JOIN tag_scores ts ON mt.tag_id = ts.tag_id
        WHERE m.status::public.item_status = 'approved'::public.item_status AND m.is_hidden = FALSE AND m.deleted_at IS NULL
        GROUP BY m.id
    )
    SELECT m.*
    FROM public.media_items m
    JOIN media_scores ms ON m.id = ms.id
    ORDER BY 
        (CASE WHEN m.is_recommended THEN 5000 ELSE 0 END) + -- 手动推荐高优先级
        m.heat_score +                                    -- 热度排序
        ms.media_relevance DESC,                          -- 个性化相关性
        m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


--
-- Name: get_related_media("uuid", integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_related_media"("p_media_id" "uuid", "p_limit" integer DEFAULT 10) RETURNS SETOF "public"."media_items"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_tag_ids uuid[];
BEGIN
    -- 获取当前媒体的所有标签ID
    SELECT ARRAY_AGG(tag_id) INTO v_tag_ids
    FROM public.media_tags
    WHERE media_id = p_media_id;

    RETURN QUERY
    SELECT DISTINCT m.*
    FROM public.media_items m
    JOIN public.media_tags mt ON m.id = mt.media_id
    WHERE m.id != p_media_id
      AND m.status::public.item_status = 'approved'::public.item_status
      AND m.deleted_at IS NULL
      AND (
          mt.tag_id = ANY(v_tag_ids) OR
          m.category_id = (SELECT category_id FROM public.media_items WHERE id = p_media_id)
      )
    ORDER BY RANDOM()
    LIMIT p_limit;
END;
$$;


--
-- Name: get_system_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_system_stats"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_table_stats json;
    v_db_size text;
    v_stats json;
BEGIN
    -- Get size and row count for all user tables in public schema
    SELECT json_agg(t) INTO v_table_stats
    FROM (
        SELECT 
            relname AS table_name,
            n_live_tup AS row_count,
            pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
            pg_size_pretty(pg_relation_size(relid)) AS table_size,
            pg_size_pretty(pg_indexes_size(relid)) AS index_size,
            n_dead_tup AS dead_rows
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(relid) DESC
    ) t;

    -- Get total database size
    SELECT pg_size_pretty(pg_database_size(current_database())) INTO v_db_size;

    -- Construct final JSON
    v_stats := json_build_object(
        'database_size', v_db_size,
        'table_stats', v_table_stats,
        'timestamp', now()
    );

    RETURN v_stats;
END;
$$;


--
-- Name: get_system_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_system_status"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_media_count BIGINT;
    v_profile_count BIGINT;
    v_config_count BIGINT;
BEGIN
    SELECT count(*) INTO v_media_count FROM public.media_items;
    SELECT count(*) INTO v_profile_count FROM public.profiles;
    -- Check if storage_configs exists, otherwise use 0
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'storage_configs') THEN
        SELECT count(*) INTO v_config_count FROM public.storage_configs;
    ELSE
        v_config_count := 0;
    END IF;

    RETURN jsonb_build_object(
        'status', 'healthy',
        'db_time', now(),
        'stats', jsonb_build_object(
            'media_count', v_media_count,
            'profile_count', v_profile_count,
            'config_count', v_config_count
        )
    );
END;
$$;


--
-- Name: get_tag_cloud_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_tag_cloud_stats"() RETURNS TABLE("id" "uuid", "name" "text", "count" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT t.id, t.name, count(mt.media_id) as count
  FROM tags t
  LEFT JOIN media_tags mt ON t.id = mt.tag_id
  LEFT JOIN media_items mi ON mt.media_id = mi.id AND mi.deleted_at IS NULL AND mi.status::public.item_status = 'approved'::public.item_status
  GROUP BY t.id, t.name
  HAVING count(mt.media_id) > 0
  ORDER BY count DESC, t.name ASC
  LIMIT 200;
$$;


--
-- Name: get_tag_management_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_tag_management_stats"() RETURNS TABLE("id" "uuid", "name" "text", "weight" integer, "is_visible" boolean, "min_role" "text", "created_at" timestamp with time zone, "media_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.weight,
    t.is_visible,
    t.min_role,
    t.created_at,
    COUNT(mt.media_id) as media_count
  FROM tags t
  LEFT JOIN media_tags mt ON t.id = mt.tag_id
  GROUP BY t.id, t.name, t.weight, t.is_visible, t.min_role, t.created_at
  ORDER BY t.weight DESC, t.created_at DESC;
END;
$$;


--
-- Name: get_tag_tree(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_tag_tree"() RETURNS TABLE("id" "uuid", "name" "text", "parent_id" "uuid", "level" integer, "weight" integer, "created_at" timestamp with time zone, "children" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE tag_tree AS (
    -- 根标签（level = 0 或 parent_id IS NULL）
    SELECT 
      t.id,
      t.name,
      t.parent_id,
      t.level,
      t.weight,
      t.created_at,
      '[]'::JSONB as children
    FROM public.tags t
    WHERE t.parent_id IS NULL OR t.level = 0
    
    UNION ALL
    
    -- 子标签
    SELECT 
      t.id,
      t.name,
      t.parent_id,
      t.level,
      t.weight,
      t.created_at,
      '[]'::JSONB as children
    FROM public.tags t
    INNER JOIN tag_tree tt ON t.parent_id = tt.id
  )
  SELECT * FROM tag_tree
  ORDER BY level ASC, weight DESC, name ASC;
END;
$$;


--
-- Name: get_tags_with_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_tags_with_counts"() RETURNS TABLE("id" "uuid", "name" "text", "use_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id, 
        t.name, 
        COUNT(mt.tag_id)::bigint as use_count
    FROM tags t
    LEFT JOIN media_tags mt ON t.id = mt.tag_id
    GROUP BY t.id, t.name
    ORDER BY use_count DESC;
END;
$$;


--
-- Name: get_terminal_analytics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_terminal_analytics"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    browser_dist json;
    os_dist json;
    daily_visits json;
    path_dist json;
    device_dist json;
begin
    -- 浏览器分布
    select json_agg(t) into browser_dist from (
        select browser as name, count(*) as value
        from user_visit_stats
        where browser is not null
        group by browser
        order by value desc
    ) t;

    -- 操作系统分布
    select json_agg(t) into os_dist from (
        select os as name, count(*) as value
        from user_visit_stats
        where os is not null
        group by os
        order by value desc
    ) t;

    -- 每日访问量 (最近 15 天)
    select json_agg(t) into daily_visits from (
        select 
            to_char(created_at, 'YYYY-MM-DD') as day,
            count(*) as count,
            count(distinct coalesce(user_id::text, ip_address)) as unique_visitors
        from user_visit_stats
        where created_at > now() - interval '15 days'
        group by day
        order by day asc
    ) t;

    -- 热门路径
    select json_agg(t) into path_dist from (
        select path as name, count(*) as value
        from user_visit_stats
        where path is not null
        group by path
        order by value desc
        limit 10
    ) t;

    -- 设备终端分布 (直接使用 device_type 列，更准确)
    select json_agg(t) into device_dist from (
        select 
            coalesce(device_type, 'PC') as name,
            count(*) as value
        from user_visit_stats
        group by name
        order by value desc
    ) t;

    return json_build_object(
        'browser_distribution', coalesce(browser_dist, '[]'::json),
        'os_distribution', coalesce(os_dist, '[]'::json),
        'daily_visits', coalesce(daily_visits, '[]'::json),
        'path_distribution', coalesce(path_dist, '[]'::json),
        'device_distribution', coalesce(device_dist, '[]'::json)
    );
end;
$$;


--
-- Name: get_timeline_dates("uuid", "text", "text", "text"[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_timeline_dates"("p_user_id" "uuid" DEFAULT NULL::"uuid", "p_type" "text" DEFAULT 'all'::"text", "p_category_id" "text" DEFAULT 'all'::"text", "p_tag_ids" "text"[] DEFAULT NULL::"text"[]) RETURNS TABLE("date" "text", "count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char((mi.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')::DATE, 'YYYY-MM-DD') as date,
    COUNT(*)::INTEGER as count
  FROM media_items mi
  WHERE 
    mi.status = 'approved' AND 
    mi.deleted_at IS NULL AND
    (p_type = 'all' OR mi.type = p_type) AND
    (p_category_id = 'all' OR mi.category_id = p_category_id) AND
    (p_tag_ids IS NULL OR mi.id IN (
      SELECT media_id FROM media_tags WHERE tag_id = ANY(p_tag_ids)
    ))
  GROUP BY 1
  ORDER BY 1 DESC;
END;
$$;


--
-- Name: get_top_disliked_media(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_top_disliked_media"("p_limit" integer) RETURNS SETOF "public"."media_items"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT m.*
    FROM public.media_items m
    JOIN (
        SELECT media_id, COUNT(*) as d_count
        FROM public.dislikes
        GROUP BY media_id
    ) d ON m.id = d.media_id
    WHERE m.status::public.item_status = 'approved'::public.item_status AND m.deleted_at IS NULL
    ORDER BY d.d_count DESC
    LIMIT p_limit;
END;
$$;


--
-- Name: get_top_favorited_media(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_top_favorited_media"("limit_count" integer) RETURNS TABLE("id" "uuid", "title" "text", "type" "text", "url" "text", "thumbnail_url" "text", "favorite_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  return query
  select 
    m.id, 
    m.title, 
    m.type, 
    m.url, 
    m.thumbnail_url, 
    m.favorite_count
  from 
    media_items m
  where 
    m.status::public.item_status = 'approved'::public.item_status
  order by 
    m.favorite_count desc, m.views_count desc
  limit limit_count;
end;
$$;


--
-- Name: get_unique_media_items(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_unique_media_items"("p_limit" integer, "p_offset" integer) RETURNS SETOF "public"."media_items"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM media_items
    WHERE id IN (
        SELECT DISTINCT ON (content_hash) id
        FROM media_items
        WHERE type = 'image' AND content_hash IS NOT NULL AND deleted_at IS NULL
        ORDER BY content_hash, created_at ASC
    )
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


--
-- Name: get_untagged_media(integer, integer, "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_untagged_media"("p_page" integer DEFAULT 0, "p_limit" integer DEFAULT 20, "p_search" "text" DEFAULT ''::"text") RETURNS TABLE("id" "uuid", "title" "text", "url" "text", "type" "text", "user_id" "uuid", "status" "text", "created_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_offset INTEGER := p_page * p_limit;
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.title,
    m.url,
    m.type,
    m.user_id,
    m.status::text,  -- Explicitly cast enum to text
    m.created_at,
    COUNT(*) OVER() as total_count
  FROM media_items m
  WHERE m.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM media_tags mt WHERE mt.media_id = m.id)
    AND (p_search = '' OR m.title ILIKE '%' || p_search || '%')
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;


--
-- Name: get_used_daily_gallery_images(integer, integer, "text", "date", "date"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_used_daily_gallery_images"("p_limit" integer DEFAULT 10, "p_offset" integer DEFAULT 0, "p_search" "text" DEFAULT NULL::"text", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("id" "uuid", "url" "text", "title" "text", "description" "text", "used_at" timestamp with time zone, "post_date" "date", "has_record" boolean, "daily_gallery_status" "text", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_total bigint;
BEGIN
  -- 计算总数
  SELECT count(*) INTO v_total
  FROM public.media_items m
  LEFT JOIN public.daily_gallery_posts p ON m.id = ANY(p.image_ids)
  WHERE m.daily_gallery_status = 'used'
    AND m.type = 'image'
    AND m.deleted_at IS NULL
    AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
    AND (p_start_date IS NULL OR COALESCE(m.daily_gallery_date, p.post_date) >= p_start_date)
    AND (p_end_date IS NULL OR COALESCE(m.daily_gallery_date, p.post_date) <= p_end_date);

  RETURN QUERY
  SELECT 
    m.id, 
    m.url, 
    m.title, 
    m.description, 
    COALESCE(p.created_at, m.created_at) as used_at, 
    COALESCE(m.daily_gallery_date, p.post_date) as post_date,
    (p.id IS NOT NULL) as has_record,
    m.daily_gallery_status::text,
    v_total
  FROM public.media_items m
  LEFT JOIN public.daily_gallery_posts p ON m.id = ANY(p.image_ids)
  WHERE m.daily_gallery_status = 'used'
    AND m.type = 'image'
    AND m.deleted_at IS NULL
    AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
    AND (p_start_date IS NULL OR COALESCE(m.daily_gallery_date, p.post_date) >= p_start_date)
    AND (p_end_date IS NULL OR COALESCE(m.daily_gallery_date, p.post_date) <= p_end_date)
  ORDER BY COALESCE(m.daily_gallery_date, p.post_date) DESC NULLS LAST, p.created_at DESC NULLS LAST, m.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


--
-- Name: get_user_referral_tree(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_user_referral_tree"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(t) INTO result
    FROM (
        SELECT 
            id, 
            username, 
            referrer_id,
            avatar_url,
            (SELECT name FROM permission_groups WHERE id = profiles.group_id) as group_name
        FROM profiles
    ) t;
    RETURN result;
END;
$$;


--
-- Name: get_visually_duplicate_media(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_visually_duplicate_media"("p_threshold" integer DEFAULT 5) RETURNS TABLE("content_hash" "text", "duplicate_count" bigint, "first_upload_at" timestamp with time zone, "preview_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH valid_items AS (
    SELECT vi.id, vi.content_hash, vi.created_at, vi.dedupe_version, vi.url
    FROM public.media_items vi
    WHERE vi.content_hash IS NOT NULL 
      AND vi.type = 'image' 
      AND vi.deleted_at IS NULL
      AND (vi.dedupe_ignored IS NULL OR vi.dedupe_ignored = FALSE)
  ),
  representatives AS (
    SELECT v1.id, v1.content_hash, v1.created_at, v1.dedupe_version
    FROM valid_items v1
    WHERE NOT EXISTS (
      SELECT 1 FROM valid_items v2
      WHERE v2.id != v1.id
      AND v2.dedupe_version = v1.dedupe_version
      AND bit_count(('x' || lpad(v1.content_hash, 16, '0'))::bit(64) # ('x' || lpad(v2.content_hash, 16, '0'))::bit(64)) <= p_threshold
      AND (v2.created_at < v1.created_at OR (v2.created_at = v1.created_at AND v2.id < v1.id))
    )
  )
  SELECT 
    r.content_hash,
    COUNT(v.id)::BIGINT as duplicate_count,
    MIN(v.created_at) as first_upload_at,
    (SELECT v3.url FROM valid_items v3 WHERE v3.content_hash = r.content_hash AND v3.dedupe_version = r.dedupe_version ORDER BY v3.created_at ASC LIMIT 1) as preview_url
  FROM representatives r
  JOIN valid_items v ON (
    v.dedupe_version = r.dedupe_version
    AND bit_count(('x' || lpad(r.content_hash, 16, '0'))::bit(64) # ('x' || lpad(v.content_hash, 16, '0'))::bit(64)) <= p_threshold
  )
  GROUP BY r.content_hash, r.dedupe_version
  HAVING COUNT(v.id) > 1
  ORDER BY duplicate_count DESC, first_upload_at DESC;
END;
$$;


--
-- Name: get_visually_duplicate_media_v2(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_visually_duplicate_media_v2"("similarity_threshold" integer DEFAULT 5) RETURNS TABLE("representative_hash" "text", "item_ids" "uuid"[], "duplicate_count" integer, "first_upload_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH pairs AS (
        SELECT 
            m1.id as id1, 
            m2.id as id2,
            m1.content_hash as h1,
            m1.created_at as t1
        FROM media_items m1
        JOIN media_items m2 ON m1.id < m2.id
        WHERE m1.content_hash IS NOT NULL 
          AND m2.content_hash IS NOT NULL
          AND m1.dedupe_ignored = false
          AND m2.dedupe_ignored = false
          AND hamming_distance(m1.content_hash, m2.content_hash) <= similarity_threshold
    ),
    grouped AS (
        SELECT 
            id1,
            array_agg(id2) || id1 as ids,
            min(t1) as min_t,
            min(h1) as h
        FROM pairs
        GROUP BY id1
    )
    SELECT 
        h as representative_hash,
        ids as item_ids,
        array_length(ids, 1) as duplicate_count,
        min_t as first_upload_at
    FROM grouped;
END;
$$;


--
-- Name: get_web_vitals_stats("text", integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_web_vitals_stats"("p_metric_name" "text" DEFAULT NULL::"text", "p_days" integer DEFAULT 7) RETURNS TABLE("metric_name" "text", "total_count" bigint, "avg_value" numeric, "p50_value" numeric, "p75_value" numeric, "p95_value" numeric, "good_count" bigint, "needs_improvement_count" bigint, "poor_count" bigint, "good_percentage" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wv.name as metric_name,
    COUNT(*)::bigint as total_count,
    AVG(wv.value)::numeric as avg_value,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY wv.value)::numeric as p50_value,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY wv.value)::numeric as p75_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY wv.value)::numeric as p95_value,
    COUNT(CASE WHEN wv.rating = 'good' THEN 1 END)::bigint as good_count,
    COUNT(CASE WHEN wv.rating = 'needs-improvement' THEN 1 END)::bigint as needs_improvement_count,
    COUNT(CASE WHEN wv.rating = 'poor' THEN 1 END)::bigint as poor_count,
    CASE 
      WHEN COUNT(*) = 0 THEN 0::numeric 
      ELSE ROUND(COUNT(CASE WHEN wv.rating = 'good' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) 
    END as good_percentage
  FROM public.web_vitals_logs wv
  WHERE wv.created_at > NOW() - (p_days || ' days')::INTERVAL
    AND (p_metric_name IS NULL OR wv.name = p_metric_name)
  GROUP BY wv.name;
END;
$$;


--
-- Name: grant_badge_to_group("uuid", "uuid", timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."grant_badge_to_group"("p_group_id" "uuid", "p_badge_id" "uuid", "p_expires_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.user_badges (user_id, badge_id, expires_at)
    SELECT id, p_badge_id, p_expires_at
    FROM public.profiles
    WHERE group_id = p_group_id
    ON CONFLICT (user_id, badge_id) DO UPDATE 
    SET expires_at = EXCLUDED.expires_at,
        granted_at = now();
END;
$$;


--
-- Name: hamming_distance("text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."hamming_distance"("h1" "text", "h2" "text") RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- 如果任一哈希为空，则返回极高距离
  IF h1 IS NULL OR h2 IS NULL OR h1 = '' OR h2 = '' THEN
    RETURN 100;
  END IF;
  -- 尝试转换为 bit(64) 并计算 XOR 的 bit_count
  -- 兼容不同长度，左侧补零至16位
  RETURN bit_count(('x' || lpad(h1, 16, '0'))::bit(64) # ('x' || lpad(h2, 16, '0'))::bit(64));
EXCEPTION WHEN OTHERS THEN
  RETURN 100;
END;
$$;


--
-- Name: handle_album_access_request_insertion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_album_access_request_insertion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  album_title TEXT;
BEGIN
  SELECT title INTO album_title FROM photo_albums WHERE id = NEW.album_id;

  -- Notify user that their request has been submitted
  INSERT INTO notifications (
    user_id,
    title,
    content,
    type,
    channel,
    link,
    is_read,
    created_at
  ) VALUES (
    NEW.user_id,
    '图集申请已提交',
    '您对图集《' || COALESCE(album_title, '未知图集') || '》的访问申请已提交，请等待管理员审核。',
    'system',
    'in_app',
    '/profile?tab=requests',
    false,
    NOW()
  );

  RETURN NEW;
END;
$$;


--
-- Name: handle_album_access_request_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_album_access_request_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  album_title TEXT;
  msg_content TEXT;
BEGIN
  -- Get the album title
  SELECT title INTO album_title FROM photo_albums WHERE id = NEW.album_id;
  
  -- Create notification for status change (only if status actually changed to approved or rejected)
  IF (OLD.status IS NULL OR OLD.status <> NEW.status) AND (NEW.status::public.item_status = 'approved'::public.item_status OR NEW.status::public.item_status = 'rejected'::public.item_status) THEN
    IF NEW.status::public.item_status = 'approved'::public.item_status THEN
      msg_content := '您对图集《' || COALESCE(album_title, '未知图集') || '》的访问申请已通过。授予级别：' || COALESCE(NEW.approved_level, 'PT');
    ELSE
      msg_content := '您对图集《' || COALESCE(album_title, '未知图集') || '》的访问申请被拒绝。原因：' || COALESCE(NEW.rejected_reason, '无');
    END IF;

    -- Use SECURITY DEFINER context by performing the insert through a function if needed, 
    -- but setting the function itself as SECURITY DEFINER is sufficient for the trigger to bypass RLS 
    -- if it's owned by a powerful user.
    INSERT INTO notifications (
      user_id,
      title,
      content,
      type,
      channel,
      link,
      is_read,
      created_at
    ) VALUES (
      NEW.user_id,
      '图集申请审核结果',
      msg_content,
      'audit',
      'in_app',
      '/albums/' || NEW.album_id, -- Ensure it is /albums/
      false,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: handle_album_photo_count_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_album_photo_count_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    target_album_id UUID;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        target_album_id := NEW.album_id;
    ELSIF (TG_OP = 'DELETE') THEN
        target_album_id := OLD.album_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- 如果 album_id 没变，没必要更新
        IF (OLD.album_id = NEW.album_id) THEN
            RETURN NULL;
        END IF;
        
        -- 更新旧的图集计数
        UPDATE public.photo_albums 
        SET photo_count = (SELECT count(*) FROM public.album_photos WHERE album_id = OLD.album_id),
            updated_at = now()
        WHERE id = OLD.album_id;
        
        target_album_id := NEW.album_id;
    END IF;

    -- 更新目标图集计数
    IF target_album_id IS NOT NULL THEN
        UPDATE public.photo_albums 
        SET photo_count = (SELECT count(*) FROM public.album_photos WHERE album_id = target_album_id),
            updated_at = now()
        WHERE id = target_album_id;
    END IF;
    
    RETURN NULL;
END;
$$;


--
-- Name: handle_album_photo_count_stmt_all(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_album_photo_count_stmt_all"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE public.photo_albums pa
        SET photo_count = (SELECT count(*) FROM public.album_photos ap WHERE ap.album_id = pa.id),
            updated_at = now()
        WHERE id IN (SELECT album_id FROM new_table);
    END IF;

    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        UPDATE public.photo_albums pa
        SET photo_count = (SELECT count(*) FROM public.album_photos ap WHERE ap.album_id = pa.id),
            updated_at = now()
        WHERE id IN (SELECT album_id FROM old_table);
    END IF;
    
    RETURN NULL;
END;
$$;


--
-- Name: handle_album_photo_count_stmt_upsert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_album_photo_count_stmt_upsert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- 处理插入或更新时的计数，同时考虑可能从旧图集移动过来的情况
    UPDATE photo_albums pa
    SET photo_count = (SELECT count(*) FROM album_photos ap WHERE ap.album_id = pa.id),
        updated_at = now()
    WHERE id IN (
        SELECT album_id FROM new_table
        UNION
        -- 如果是更新触发器且定义了 old_table，则也更新旧图集
        SELECT album_id FROM (SELECT 1) AS dummy LEFT JOIN old_table ON TRUE WHERE old_table.album_id IS NOT NULL
    );
    RETURN NULL;
END;
$$;


--
-- Name: handle_auth_user_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_auth_user_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- 当 auth.users 中的 email 发生变更时，同步更新 public.profiles
  IF (OLD.email IS DISTINCT FROM NEW.email) THEN
    UPDATE public.profiles 
    SET email = NEW.email, updated_at = NOW() 
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_check_in_growth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_check_in_growth"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_streak INT;
    v_day_number INT;
    v_exp INT;
    v_max_day INT;
    v_target_id TEXT;
BEGIN
    v_target_id := 'checkin_' || NEW.user_id::text || '_' || NEW.check_in_date::text;

    -- 计算连续签到天数 (包含当天)
    WITH RECURSIVE streaks AS (
        SELECT check_in_date, 1 as count
        FROM public.check_ins
        WHERE user_id = NEW.user_id AND check_in_date = (NEW.check_in_date - INTERVAL '1 day')::date
        UNION ALL
        SELECT c.check_in_date, s.count + 1
        FROM public.check_ins c
        JOIN streaks s ON c.check_in_date = (s.check_in_date - INTERVAL '1 day')::date
        WHERE c.user_id = NEW.user_id
    )
    SELECT COALESCE(MAX(count), 0) + 1 INTO v_streak FROM streaks;
    
    -- 获取连续签到奖励配置
    SELECT MAX(day_number) INTO v_max_day FROM public.signin_configs;
    v_day_number := ((v_streak - 1) % COALESCE(v_max_day, 7)) + 1;
    
    SELECT exp_reward INTO v_exp FROM public.signin_configs WHERE day_number = v_day_number;
    IF v_exp IS NULL THEN v_exp := 10; END IF;
    
    -- 发放经验奖励 (幂等)
    PERFORM public.add_user_exp(
        NEW.user_id, 
        v_exp, 
        '连续第 ' || v_streak || ' 天签到经验奖励', 
        'checkin', 
        v_target_id || '_exp'
    );
    
    -- 发放积分奖励 (使用 check_ins 表中的 points_earned 字段，幂等)
    IF NEW.points_earned > 0 THEN
        PERFORM public.add_user_points(
            NEW.user_id, 
            NEW.points_earned, 
            '连续第 ' || v_streak || ' 天签到积分奖励', 
            'checkin', 
            v_target_id || '_points'
        );
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: handle_comment_growth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_comment_growth"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM public.award_user_reward(NEW.user_id, 'comment', 'comment_' || NEW.id::text);
    RETURN NEW;
END;
$$;


--
-- Name: handle_daily_login_growth("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_daily_login_growth"("p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' + INTERVAL '8 hours')::date;
    v_exists BOOLEAN;
BEGIN
    -- 检查今天是否已经领过登录奖励
    SELECT EXISTS (
        SELECT 1 FROM public.growth_logs 
        WHERE user_id = p_user_id 
        AND type = 'login' 
        AND (created_at AT TIME ZONE 'UTC' + INTERVAL '8 hours')::date = v_today
    ) INTO v_exists;

    IF NOT v_exists THEN
        PERFORM public.add_user_exp(p_user_id, 5, '每日登录奖励', 'login');
        RETURN json_build_object('success', true, 'awarded', 5);
    END IF;

    RETURN json_build_object('success', false, 'awarded', 0);
END;
$$;


--
-- Name: handle_favorite_count_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_favorite_count_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if (tg_op = 'INSERT') then
    update media_items set favorite_count = favorite_count + 1 where id = new.media_id;
  elsif (tg_op = 'DELETE') then
    update media_items set favorite_count = favorite_count - 1 where id = old.media_id;
  end if;
  return null;
end;
$$;


--
-- Name: handle_favorite_growth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_favorite_growth"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM public.award_user_reward(NEW.user_id, 'favorite', 'favorite_' || NEW.media_id::text);
    RETURN NEW;
END;
$$;


--
-- Name: handle_generate_digital_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_generate_digital_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_id text;
    cfg record;
    max_attempts integer := 200;
    attempts integer := 0;
BEGIN
    -- 如果已经手动设置了 ID，则跳过
    IF NEW.digital_id IS NOT NULL AND NEW.digital_id <> '' THEN
        RETURN NEW;
    END IF;

    -- 获取配置
    SELECT * INTO cfg FROM public.digital_id_configs LIMIT 1;
    
    -- 如果没有配置，使用默认设置 (8位)
    IF cfg IS NULL THEN
        new_id := floor(random() * (power(10, 8) - power(10, 7)) + power(10, 7))::text;
    ELSIF cfg.is_random_mode THEN
        LOOP
            attempts := attempts + 1;
            -- 生成随机 ID
            new_id := floor(random() * (power(10, cfg.id_length) - power(10, cfg.id_length - 1)) + power(10, cfg.id_length - 1))::text;
            
            -- 检查唯一性、排除列表和模式
            IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE digital_id = new_id) 
               AND NOT public.is_digital_id_forbidden(new_id) THEN
                EXIT;
            END IF;

            -- 安全退出: 如果尝试太多次都找不到符合模式的 ID
            IF attempts >= max_attempts THEN
                LOOP
                    new_id := floor(random() * (power(10, cfg.id_length) - power(10, cfg.id_length - 1)) + power(10, cfg.id_length - 1))::text;
                    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE digital_id = new_id);
                END LOOP;
                EXIT;
            END IF;
        END LOOP;
    ELSE
        new_id := cfg.next_value::text;
        -- 顺推模式下，跳过禁用的 ID
        WHILE public.is_digital_id_forbidden(new_id) OR EXISTS (SELECT 1 FROM public.profiles WHERE digital_id = new_id) LOOP
            cfg.next_value := cfg.next_value + 1;
            new_id := cfg.next_value::text;
            
            -- 防止无限循环
            attempts := attempts + 1;
            IF attempts > 1000 THEN EXIT; END IF;
        END LOOP;
        
        -- 更新下一个值
        UPDATE public.digital_id_configs SET next_value = cfg.next_value + 1 WHERE id = cfg.id;
    END IF;

    NEW.digital_id := new_id;
    RETURN NEW;
END;
$$;


--
-- Name: handle_media_download("uuid", "uuid", "uuid", "text", integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_media_download"("p_user_id" "uuid", "p_media_id" "uuid", "p_album_id" "uuid", "p_type" "text", "p_points" integer) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_points integer;
  v_success boolean;
  v_message text;
  v_recharged boolean := false;
  v_reason text;
begin
  -- 获取当前用户积分
  select points into v_points from profiles where id = p_user_id;
  
  -- 如果已经下载过，不扣分，直接返回成功
  if exists (
    select 1 from media_downloads 
    where user_id = p_user_id 
    and (
      (p_type = 'wallpaper' and media_id = p_media_id) or 
      (p_type = 'album' and album_id = p_album_id)
    )
  ) then
    return json_build_object('success', true, 'recharged', false, 'message', '已下载过，无需再次扣分');
  end if;

  -- 如果积分为0，不扣分，直接记录下载
  if p_points = 0 then
    insert into media_downloads (user_id, media_id, album_id, type, points_spent)
    values (p_user_id, p_media_id, p_album_id, p_type, 0);
    
    return json_build_object('success', true, 'recharged', false, 'message', '下载成功（免费）');
  end if;

  -- 检查积分是否足够
  if v_points < p_points then
    return json_build_object('success', false, 'recharged', false, 'message', '积分不足');
  end if;

  -- 扣除积分
  update profiles set points = points - p_points where id = p_user_id;
  
  -- 记录下载行为
  insert into media_downloads (user_id, media_id, album_id, type, points_spent)
  values (p_user_id, p_media_id, p_album_id, p_type, p_points);

  -- 记录积分流水
  v_reason := case 
    when p_type = 'wallpaper' then '下载壁纸' 
    else '下载写真图集' 
  end;
  
  insert into points_logs (user_id, amount, reason, type, target_id)
  values (p_user_id, -p_points, v_reason, 'media_download', coalesce(p_media_id::text, p_album_id::text));

  return json_build_object('success', true, 'recharged', true, 'message', '下载成功');
end;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    referrer_id_val uuid;
    group_id_val uuid;
    bind_openid_val text;
    bind_type_val text;
    custom_fields_val jsonb;
    username_val text;
BEGIN
    -- 从 raw_user_meta_data 提取 referrer_id 和 group_id
    BEGIN
        referrer_id_val := (NEW.raw_user_meta_data->>'referrer_id')::uuid;
    EXCEPTION WHEN others THEN
        referrer_id_val := NULL;
    END;

    BEGIN
        group_id_val := (NEW.raw_user_meta_data->>'group_id')::uuid;
    EXCEPTION WHEN others THEN
        group_id_val := NULL;
    END;
    
    -- 提取绑定信息
    bind_openid_val := COALESCE(
        NEW.raw_user_meta_data->>'bind_openid',
        NEW.raw_user_meta_data->'custom_fields'->>'bind_openid'
    );
    bind_type_val := COALESCE(
        NEW.raw_user_meta_data->>'bind_type',
        NEW.raw_user_meta_data->'custom_fields'->>'bind_type'
    );
    
    custom_fields_val := COALESCE(NEW.raw_user_meta_data->'custom_fields', '{}'::jsonb);
    username_val := COALESCE(
        NEW.raw_user_meta_data->>'username', 
        NEW.email, 
        split_part(NEW.email, '@', 1)
    );

    -- 如果没有 group_id，优先使用 PT 组
    IF group_id_val IS NULL THEN
        SELECT id INTO group_id_val FROM public.permission_groups WHERE name = 'PT' LIMIT 1;
        IF group_id_val IS NULL THEN
            SELECT id INTO group_id_val FROM public.permission_groups WHERE name = '普通用户' LIMIT 1;
        END IF;
    END IF;

    -- 插入 profiles 记录
    INSERT INTO public.profiles (
        id, 
        username, 
        email, 
        avatar_url, 
        role,
        group_id,
        referrer_id,
        mp_openid,
        wechat_openid,
        custom_fields,
        points,
        exp,
        album_level,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id, 
        username_val, 
        NEW.email, 
        NEW.raw_user_meta_data->>'avatar_url',
        'pt',
        group_id_val,
        referrer_id_val,
        CASE WHEN bind_type_val = 'miniprogram' THEN bind_openid_val ELSE NULL END,
        CASE WHEN bind_type_val = 'wechat' OR bind_type_val = 'wechat_openid' THEN bind_openid_val ELSE NULL END,
        custom_fields_val,
        0,
        0,
        'pt',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        mp_openid = COALESCE(profiles.mp_openid, EXCLUDED.mp_openid),
        wechat_openid = COALESCE(profiles.wechat_openid, EXCLUDED.wechat_openid),
        custom_fields = COALESCE(profiles.custom_fields, '{}'::jsonb) || EXCLUDED.custom_fields,
        role = COALESCE(profiles.role, 'pt'),
        album_level = COALESCE(profiles.album_level, 'pt'),
        updated_at = NOW();

    -- 邀请奖励逻辑
    IF referrer_id_val IS NOT NULL THEN
        BEGIN
            UPDATE public.profiles SET points = COALESCE(points, 0) + 10, exp = COALESCE(exp, 0) + 10 WHERE id = referrer_id_val;
            
            INSERT INTO public.points_logs (user_id, amount, reason, type, target_id)
            VALUES (referrer_id_val, 10, '奖励: 邀请好友注册', 'invite_signup', NEW.id::text)
            ON CONFLICT DO NOTHING;
            
            INSERT INTO public.growth_logs (user_id, amount, reason, type, target_id)
            VALUES (referrer_id_val, 10, '奖励: 邀请好友注册', 'invite_signup', NEW.id::text)
            ON CONFLICT DO NOTHING;
        EXCEPTION WHEN others THEN
            NULL;
        END;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: handle_post_growth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_post_growth"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status::public.item_status = 'approved'::public.item_status) OR 
       (TG_OP = 'UPDATE' AND (OLD.status IS NULL OR OLD.status::public.item_status != 'approved'::public.item_status) AND NEW.status::public.item_status = 'approved'::public.item_status) THEN
        -- 调用 RPC 实现统一奖励逻辑，使用 media_id 作为 target_id
        PERFORM public.award_user_reward(
            NEW.user_id, 
            CASE WHEN NEW.type = 'video' THEN 'video_publish' ELSE 'image_publish' END, 
            'post_' || NEW.id::text
        );
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: handle_profile_email_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_profile_email_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- 当 public.profiles 中的 email 发生变更时，同步更新 auth.users
  -- 使用 SECURITY DEFINER 确保有权修改 auth 模式下的表
  IF (OLD.email IS DISTINCT FROM NEW.email) THEN
    -- 同步更新 auth.users 的 email
    UPDATE auth.users 
    SET email = NEW.email,
        email_confirmed_at = NOW(), -- 通常资料修改视为已确认
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_profiles_exp_sync(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_profiles_exp_sync"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_new_rank TEXT;
BEGIN
    -- 仅在 exp 发生变化时执行
    IF (OLD.exp IS DISTINCT FROM NEW.exp) THEN
        -- A. 如果是手动修改（非 add_user_exp 函数触发），自动补一条流水
        IF NOT EXISTS (
            SELECT 1 FROM public.growth_logs 
            WHERE user_id = NEW.id 
            AND amount = (NEW.exp - OLD.exp)
            AND created_at > now() - interval '2 seconds'
        ) THEN
            INSERT INTO public.growth_logs (user_id, amount, reason, type)
            VALUES (NEW.id, (NEW.exp - OLD.exp), '系统调整成长值', 'system');
        END IF;

        -- B. 自动更新等级名称 (rank 字段)
        SELECT name INTO v_new_rank 
        FROM public.rank_configs 
        WHERE min_exp <= NEW.exp 
        ORDER BY min_exp DESC 
        LIMIT 1;

        IF v_new_rank IS NOT NULL THEN
            NEW.rank := v_new_rank;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: handle_report_growth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_report_growth"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF (OLD.status IS NULL OR OLD.status::public.item_status != 'accepted'::public.item_status) AND NEW.status::public.item_status = 'accepted'::public.item_status THEN
        PERFORM public.award_user_reward(NEW.user_id, 'report', 'report_' || NEW.id::text);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: handle_user_last_sign_in(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_user_last_sign_in"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.profiles
  SET last_sign_in_at = NEW.last_sign_in_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;


--
-- Name: handle_visit_growth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_visit_growth"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- 统一使用 daily_login 动作
    PERFORM public.award_user_reward(NEW.user_id, 'daily_login', 'daily_login_' || NEW.visit_date::text);
    RETURN NEW;
END;
$$;


--
-- Name: import_table_data("text", "jsonb"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."import_table_data"("p_table_name" "text", "p_rows" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_result jsonb;
BEGIN
  -- 临时关闭外键约束和触发器
  SET LOCAL session_replication_role = 'replica';
  
  -- 执行 upsert
  -- 注意：这里使用了 jsonb_populate_recordset，要求 p_rows 的结构与目标表完全一致
  -- 且目标表必须有 id 或对应的唯一约束
  EXECUTE format(
    'INSERT INTO %I SELECT * FROM jsonb_populate_recordset(NULL::%I, $1) 
     ON CONFLICT (id) DO UPDATE SET 
     updated_at = EXCLUDED.updated_at', -- 这里只是一个示例，实际应该更新所有列，但动态生成所有列名较复杂
     p_table_name, p_table_name
  ) USING p_rows;
  
  RETURN jsonb_build_object('success', true, 'table', p_table_name, 'count', jsonb_array_length(p_rows));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'table', p_table_name);
END;
$_$;


--
-- Name: increment_cache_stat("text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."increment_cache_stat"("p_stat_type" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF p_stat_type = 'hit' THEN
    UPDATE system_configs 
    SET value = value || jsonb_build_object('hit_count', (value->>'hit_count')::int + 1)
    WHERE key = 'explorer_cache_config';
  ELSIF p_stat_type = 'miss' THEN
    UPDATE system_configs 
    SET value = value || jsonb_build_object('miss_count', (value->>'miss_count')::int + 1)
    WHERE key = 'explorer_cache_config';
  END IF;
END;
$$;


--
-- Name: increment_daily_gallery_views("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."increment_daily_gallery_views"("p_post_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
BEGIN
    UPDATE daily_gallery_posts
    SET 
        view_count = COALESCE(view_count, 0) + 1,
        today_view_count = CASE 
            WHEN last_view_date = v_today THEN COALESCE(today_view_count, 0) + 1 
            ELSE 1 
        END,
        last_view_date = v_today,
        updated_at = NOW()
    WHERE id = p_post_id;
END;
$$;


--
-- Name: increment_egg_winners("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."increment_egg_winners"("egg_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.easter_egg_configs
  SET current_winners = current_winners + 1
  WHERE id = egg_id;
END;
$$;


--
-- Name: increment_guide_view("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."increment_guide_view"("guide_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE system_guides
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = guide_id;
END;
$$;


--
-- Name: increment_media_view("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."increment_media_view"("item_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  update media_items
  set view_count = view_count + 1
  where id = item_id;
end;
$$;


--
-- Name: increment_redemption_use("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."increment_redemption_use"("code_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    UPDATE redemption_codes
    SET used_count = used_count + 1
    WHERE id = code_id;
END;
$$;


--
-- Name: increment_star_collection("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."increment_star_collection"("activity_id_param" "uuid", "user_id_param" "uuid") RETURNS TABLE("new_count" integer, "target_reached" boolean, "already_rewarded" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    act_record RECORD;
    current_count INTEGER;
    v_total_completions INTEGER;
    v_daily_completions INTEGER;
BEGIN
    -- 1. 获取活动配置
    SELECT * INTO act_record FROM public.star_hunt_activity_configs WHERE id = activity_id_param;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- 2. 检查限制
    -- 计算该用户已完成该活动的次数
    SELECT COUNT(*) INTO v_total_completions FROM public.star_hunt_completions 
    WHERE activity_id = activity_id_param AND user_id = user_id_param;
    
    SELECT COUNT(*) INTO v_daily_completions FROM public.star_hunt_completions 
    WHERE activity_id = activity_id_param AND user_id = user_id_param AND completion_date = CURRENT_DATE;

    -- 如果设置了限制且已达到
    IF (COALESCE(act_record.per_user_max_total, 0) > 0 AND v_total_completions >= act_record.per_user_max_total) OR 
       (COALESCE(act_record.per_user_max_daily, 0) > 0 AND v_daily_completions >= act_record.per_user_max_daily) THEN
        -- 返回当前进度，但不允许继续增加
        SELECT collected_count INTO current_count FROM public.star_hunt_collection_records 
        WHERE activity_id = activity_id_param AND user_id = user_id_param;
        RETURN QUERY SELECT COALESCE(current_count, 0), FALSE, TRUE;
        RETURN;
    END IF;

    -- 3. 插入或更新收集记录
    INSERT INTO public.star_hunt_collection_records (activity_id, user_id, collected_count, updated_at, is_rewarded, is_completed)
    VALUES (activity_id_param, user_id_param, 1, NOW(), FALSE, FALSE)
    ON CONFLICT (activity_id, user_id)
    DO UPDATE SET 
        collected_count = star_hunt_collection_records.collected_count + 1,
        updated_at = NOW()
    RETURNING collected_count INTO current_count;
    
    -- 4. 判断是否达到目标
    IF current_count >= act_record.target_count THEN
        -- 记录一次完成
        INSERT INTO public.star_hunt_completions (activity_id, user_id)
        VALUES (activity_id_param, user_id_param);

        -- 发放奖励
        IF act_record.reward_type = 'points' THEN
            PERFORM public.add_user_points_safe(
                user_id_param, 
                (act_record.reward_content->>'amount')::INTEGER, 
                '完成寻找特控⭐活动：' || act_record.name
            );
        END IF;
        
        -- 重置收集记录以便下一次收集 (如果还可以继续)
        -- 这里我们选择将 collected_count 归零
        UPDATE public.star_hunt_collection_records 
        SET collected_count = 0, is_rewarded = FALSE, is_completed = FALSE
        WHERE activity_id = activity_id_param AND user_id = user_id_param;
        
        RETURN QUERY SELECT current_count, TRUE, FALSE;
    ELSE
        RETURN QUERY SELECT current_count, FALSE, FALSE;
    END IF;
END;
$$;


--
-- Name: increment_star_collection("uuid", "uuid", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."increment_star_collection"("p_user_id" "uuid", "p_activity_id" "uuid", "p_page_path" "text" DEFAULT ''::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_config RECORD;
    v_record RECORD;
    v_new_count INTEGER;
    v_is_completed BOOLEAN := false;
    v_completed_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 1. 获取活动配置
    SELECT * INTO v_config FROM star_hunt_activity_configs WHERE id = p_activity_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', '活动不存在或已结束');
    END IF;

    -- 2. 获取或创建用户记录
    INSERT INTO star_hunt_collection_records (user_id, activity_id)
    VALUES (p_user_id, p_activity_id)
    ON CONFLICT (user_id, activity_id) DO NOTHING;

    SELECT * INTO v_record FROM star_hunt_collection_records WHERE user_id = p_user_id AND activity_id = p_activity_id;

    -- 3. 检查是否已完成
    IF v_record.is_completed THEN
        RETURN jsonb_build_object('success', true, 'message', '已完成收集', 'data', v_record);
    END IF;

    -- 4. 增加数量
    v_new_count := v_record.collected_count + 1;
    IF v_new_count >= v_config.target_count THEN
        v_is_completed := true;
        v_completed_at := now();
    END IF;

    -- 5. 更新记录
    UPDATE star_hunt_collection_records
    SET 
        collected_count = v_new_count,
        collection_history = COALESCE(collection_history, '[]'::jsonb) || jsonb_build_object('time', now(), 'page', p_page_path),
        is_completed = v_is_completed,
        completed_at = v_completed_at,
        updated_at = now()
    WHERE id = v_record.id;

    -- 6. 如果完成且奖励是积分，自动发放
    IF v_is_completed AND v_config.reward_type = 'points' THEN
        PERFORM add_user_points_safe(p_user_id, (v_config.reward_content->>'amount')::INTEGER, '特控⭐挑战奖励');
        UPDATE star_hunt_collection_records SET is_rewarded = true WHERE id = v_record.id;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'data', jsonb_build_object(
            'collected_count', v_new_count,
            'target_count', v_config.target_count,
            'is_completed', v_is_completed
        )
    );
END;
$$;


--
-- Name: increment_view_count("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."increment_view_count"("item_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update media_items
  set view_count = coalesce(view_count, 0) + 1
  where id = item_id;
end;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$;


--
-- Name: is_admin("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."is_admin"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid AND p.role::text = 'admin'
  );
$$;


--
-- Name: is_admin_safe(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."is_admin_safe"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'::user_role
  );
END;
$$;


--
-- Name: is_debug_enabled(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."is_debug_enabled"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT is_debug_enabled FROM public.profiles WHERE id = auth.uid();
$$;


--
-- Name: is_digital_id_forbidden("text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."is_digital_id_forbidden"("p_id" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    pattern_rec record;
BEGIN
    -- 1. 检查特定排除列表
    IF EXISTS (SELECT 1 FROM public.excluded_digital_ids WHERE digital_id = p_id) THEN
        RETURN TRUE;
    END IF;

    -- 2. 检查靓号池 (保留给购买)
    IF EXISTS (SELECT 1 FROM public.special_digital_ids WHERE digital_id = p_id) THEN
        RETURN TRUE;
    END IF;

    -- 3. 检查自定义模式 (如 AA, AAAABBBB 等)
    FOR pattern_rec IN SELECT pattern FROM public.digital_id_patterns WHERE is_active = true LOOP
        IF p_id ~ pattern_rec.pattern THEN
            RETURN TRUE;
        END IF;
    END LOOP;

    RETURN FALSE;
END;
$$;


--
-- Name: log_ad_event("uuid", "text", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."log_ad_event"("p_ad_id" "uuid", "p_event_type" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    INSERT INTO ad_event_logs (ad_id, event_type, user_id)
    VALUES (p_ad_id, p_event_type, COALESCE(p_user_id, auth.uid()));
END;
$$;


--
-- Name: log_daily_gallery_access("uuid", "text", "uuid", "text", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."log_daily_gallery_access"("p_post_id" "uuid", "p_user_openid" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_ip_address" "text" DEFAULT NULL::"text", "p_user_agent" "text" DEFAULT NULL::"text", "p_password_used" "text" DEFAULT NULL::"text", "p_browser_fingerprint" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_is_new_visitor boolean;
    v_new_log_id uuid;
BEGIN
    -- 1. 插入访问日志并获取 ID
    INSERT INTO public.daily_gallery_access_logs (
        post_id, user_openid, user_id, ip_address, user_agent, password_used, browser_fingerprint
    )
    VALUES (
        p_post_id, p_user_openid, p_user_id, p_ip_address, p_user_agent, p_password_used, p_browser_fingerprint
    )
    RETURNING id INTO v_new_log_id;

    -- 2. 检查是否为该帖子的新访客 (在今天之内)
    -- 只有当访客至少有一个标识符时才进行唯一性检查
    IF p_browser_fingerprint IS NOT NULL OR p_user_id IS NOT NULL OR p_user_openid IS NOT NULL THEN
        SELECT NOT EXISTS (
            SELECT 1 FROM public.daily_gallery_access_logs
            WHERE post_id = p_post_id
              AND id != v_new_log_id
              AND accessed_at >= CURRENT_DATE
              AND (
                (p_browser_fingerprint IS NOT NULL AND browser_fingerprint = p_browser_fingerprint) OR
                (p_user_id IS NOT NULL AND user_id = p_user_id) OR
                (p_user_openid IS NOT NULL AND user_openid = p_user_openid)
              )
            LIMIT 1
        ) INTO v_is_new_visitor;
    ELSE
        -- 没有任何标识符，默认视为新访客（或者视情况定，这里暂定为新访客）
        v_is_new_visitor := true;
    END IF;

    -- 3. 原子化更新 PV 和 UV
    UPDATE public.daily_gallery_posts
    SET 
        view_count = COALESCE(view_count, 0) + 1,
        unique_visitor_count = CASE WHEN v_is_new_visitor THEN COALESCE(unique_visitor_count, 0) + 1 ELSE unique_visitor_count END,
        updated_at = NOW()
    WHERE id = p_post_id;
END;
$$;


--
-- Name: log_daily_gallery_access("uuid", "text", "uuid", "text", "text", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."log_daily_gallery_access"("p_post_id" "uuid", "p_user_openid" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_ip_address" "text" DEFAULT NULL::"text", "p_user_agent" "text" DEFAULT NULL::"text", "p_password_used" "text" DEFAULT NULL::"text", "p_browser_fingerprint" "text" DEFAULT NULL::"text", "p_access_type" "text" DEFAULT 'view'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_is_new_visitor boolean;
    v_new_log_id uuid;
BEGIN
    -- 1. 插入访问日志并获取 ID
    INSERT INTO public.daily_gallery_access_logs (
        post_id, user_openid, user_id, ip_address, user_agent, password_used, browser_fingerprint, access_type
    )
    VALUES (
        p_post_id, p_user_openid, p_user_id, p_ip_address, p_user_agent, p_password_used, p_browser_fingerprint, p_access_type
    )
    RETURNING id INTO v_new_log_id;

    -- 2. 检查是否为该帖子的新访客 (在今天之内)
    IF p_browser_fingerprint IS NOT NULL OR p_user_id IS NOT NULL OR p_user_openid IS NOT NULL THEN
        SELECT NOT EXISTS (
            SELECT 1 FROM public.daily_gallery_access_logs
            WHERE post_id = p_post_id
              AND id != v_new_log_id
              AND accessed_at >= CURRENT_DATE
              AND (
                (p_browser_fingerprint IS NOT NULL AND browser_fingerprint = p_browser_fingerprint) OR
                (p_user_id IS NOT NULL AND user_id = p_user_id) OR
                (p_user_openid IS NOT NULL AND user_openid = p_user_openid)
              )
            LIMIT 1
        ) INTO v_is_new_visitor;
    ELSE
        v_is_new_visitor := true;
    END IF;

    -- 3. 原子化更新 PV 和 UV
    UPDATE public.daily_gallery_posts
    SET 
        view_count = COALESCE(view_count, 0) + 1,
        unique_visitor_count = CASE WHEN v_is_new_visitor THEN COALESCE(unique_visitor_count, 0) + 1 ELSE unique_visitor_count END,
        updated_at = NOW()
    WHERE id = p_post_id;
END;
$$;


--
-- Name: log_dedupe_scan("text", integer, integer, integer, "jsonb"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."log_dedupe_scan"("p_scan_type" "text", "p_processed_count" integer, "p_duplicate_count" integer, "p_duration_ms" integer, "p_config" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_log_id uuid;
BEGIN
    INSERT INTO dedupe_logs (
        scan_type, 
        processed_count, 
        duplicate_count, 
        duration_ms, 
        scan_config
    ) VALUES (
        p_scan_type, 
        p_processed_count, 
        p_duplicate_count, 
        p_duration_ms, 
        p_config
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;


--
-- Name: log_point_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."log_point_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF COALESCE(OLD.points, 0) <> NEW.points THEN
    INSERT INTO points_logs (user_id, amount, reason)
    VALUES (NEW.id, NEW.points - COALESCE(OLD.points, 0), '系统自动同步');
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: mark_images_as_used("uuid"[], "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."mark_images_as_used"("image_ids" "uuid"[], "post_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_post_date DATE;
BEGIN
  -- 获取帖子日期
  SELECT post_date INTO v_post_date FROM public.daily_gallery_posts WHERE id = post_id;

  UPDATE public.media_items
  SET daily_gallery_status = 'used',
      daily_gallery_date = v_post_date
  WHERE id = ANY(image_ids);
END;
$$;


--
-- Name: optimize_database_table("text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."optimize_database_table"("table_name_input" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF table_name_input IS NOT NULL THEN
        -- 使用 ANALYZE，VACUUM 需要事务外执行或通过特定方式
        EXECUTE format('ANALYZE public.%I', table_name_input);
        RETURN 'ANALYZE performed on table ' || table_name_input;
    ELSE
        ANALYZE;
        RETURN 'ANALYZE performed on all tables';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
END;
$$;


--
-- Name: prune_scheduled_task_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."prune_scheduled_task_logs"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- 对于每个任务，仅保留最新的10条
  DELETE FROM public.scheduled_task_logs
  WHERE id NOT IN (
    SELECT id
    FROM public.scheduled_task_logs
    WHERE task_name = NEW.task_name
    ORDER BY execution_time DESC
    LIMIT 10
  ) AND task_name = NEW.task_name;
  RETURN NEW;
END;
$$;


--
-- Name: purge_all_deleted_media(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."purge_all_deleted_media"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  delete from media_items
  where deleted_at is not null;
end;
$$;


--
-- Name: record_cache_hit("text", boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."record_cache_hit"("p_cache_key" "text", "p_is_hit" boolean) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_is_hit THEN
    INSERT INTO cache_stats (cache_key, hit_count, miss_count, last_hit_at)
    VALUES (p_cache_key, 1, 0, now())
    ON CONFLICT (cache_key) DO UPDATE
    SET hit_count = cache_stats.hit_count + 1,
        last_hit_at = now();
  ELSE
    INSERT INTO cache_stats (cache_key, hit_count, miss_count, last_miss_at)
    VALUES (p_cache_key, 0, 1, now())
    ON CONFLICT (cache_key) DO UPDATE
    SET miss_count = cache_stats.miss_count + 1,
        last_miss_at = now();
  END IF;

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: record_proxy_cache_event("text", boolean, "text", bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."record_proxy_cache_event"("p_key" "text", "p_is_hit" boolean, "p_original_url" "text" DEFAULT NULL::"text", "p_size" bigint DEFAULT NULL::bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO proxy_cache_items (key, original_url, size, hit_count, miss_count, last_accessed_at)
    VALUES (
        p_key, 
        p_original_url, 
        p_size, 
        CASE WHEN p_is_hit THEN 1 ELSE 0 END, 
        CASE WHEN p_is_hit THEN 0 ELSE 1 END,
        now()
    )
    ON CONFLICT (key) DO UPDATE SET
        hit_count = proxy_cache_items.hit_count + CASE WHEN p_is_hit THEN 1 ELSE 0 END,
        miss_count = proxy_cache_items.miss_count + CASE WHEN p_is_hit THEN 0 ELSE 1 END,
        last_accessed_at = now(),
        -- 仅在 original_url 或 size 为空时更新，防止覆盖已有数据
        original_url = COALESCE(proxy_cache_items.original_url, p_original_url),
        size = COALESCE(proxy_cache_items.size, p_size);
END;
$$;


--
-- Name: reload_postgrest_schema(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."reload_postgrest_schema"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Notify PostgREST to reload its schema cache
  -- This is a standard command for PostgREST
  NOTIFY pgrst, 'reload schema';
END;
$$;


--
-- Name: retro_tag_media_on_tag_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."retro_tag_media_on_tag_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    INSERT INTO media_tags (media_id, tag_id)
    SELECT id, NEW.id
    FROM media_items
    WHERE title ~* NEW.name
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$;


--
-- Name: sync_daily_gallery_user_history("uuid", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."sync_daily_gallery_user_history"("p_user_id" "uuid", "p_openid" "text") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE daily_gallery_access_logs
  SET user_id = p_user_id
  WHERE user_openid = p_openid
    AND user_id IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;


--
-- Name: sync_media_items_tags(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."sync_media_items_tags"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    m_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        m_id = OLD.media_id;
    ELSE
        m_id = NEW.media_id;
    END IF;

    UPDATE media_items
    SET tags = (
        SELECT COALESCE(array_agg(t.name), '{}')
        FROM media_tags mt
        JOIN tags t ON mt.tag_id = t.id
        WHERE mt.media_id = m_id
    )
    WHERE id = m_id;

    RETURN NULL;
END;
$$;


--
-- Name: toggle_dislike("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."toggle_dislike"("p_user_id" "uuid", "p_media_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_existing_id UUID;
BEGIN
    SELECT id INTO v_existing_id 
    FROM dislikes 
    WHERE (user_id IS NOT DISTINCT FROM p_user_id) 
      AND (media_id IS NOT DISTINCT FROM p_media_id)
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        DELETE FROM dislikes WHERE id = v_existing_id;
        RETURN jsonb_build_object('success', true, 'action', 'removed');
    ELSE
        INSERT INTO dislikes (user_id, media_id)
        VALUES (p_user_id, p_media_id)
        RETURNING id INTO v_existing_id;
        RETURN jsonb_build_object('success', true, 'action', 'added', 'id', v_existing_id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: toggle_favorite("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."toggle_favorite"("p_user_id" "uuid", "p_media_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_existing_id UUID;
BEGIN
    -- 这里要使用 NULLS NOT DISTINCT 的语义来匹配现有的 NULL user_id 记录
    SELECT id INTO v_existing_id 
    FROM favorites 
    WHERE (user_id IS NOT DISTINCT FROM p_user_id) 
      AND (media_id IS NOT DISTINCT FROM p_media_id)
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        DELETE FROM favorites WHERE id = v_existing_id;
        RETURN jsonb_build_object('success', true, 'action', 'removed');
    ELSE
        INSERT INTO favorites (user_id, media_id)
        VALUES (p_user_id, p_media_id)
        RETURNING id INTO v_existing_id;
        RETURN jsonb_build_object('success', true, 'action', 'added', 'id', v_existing_id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: tr_daily_gallery_submissions_ensure_user_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."tr_daily_gallery_submissions_ensure_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF NEW.user_id IS NULL AND NEW.openid IS NOT NULL AND NEW.openid != '' THEN
        NEW.user_id := public.ensure_profile_exists(NEW.openid, NEW.nickname);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: tr_media_items_ensure_user_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."tr_media_items_ensure_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    system_user_id uuid;
BEGIN
    IF NEW.user_id IS NULL THEN
        -- 尝试查找管理员 ID 作为兜底，或者抛出更有意义的错误
        SELECT id INTO system_user_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
        NEW.user_id := system_user_id;
    END IF;
    
    IF NEW.user_id IS NULL THEN
        RAISE EXCEPTION 'user_id cannot be null for media_items';
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: transfer_zonerama_to_album("uuid"[], "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."transfer_zonerama_to_album"("p_photo_ids" "uuid"[], "p_target_album_id" "uuid") RETURNS TABLE("success_count" integer, "error_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_photo_id UUID;
  v_photo RECORD;
BEGIN
  FOREACH v_photo_id IN ARRAY p_photo_ids
  LOOP
    BEGIN
      -- 获取 Zonerama 图片信息
      SELECT * INTO v_photo FROM public.zonerama_library WHERE id = v_photo_id;
      
      IF v_photo.id IS NOT NULL THEN
        -- 插入前检查是否已存在（同一图集下同一 photo_id）
        IF EXISTS (
            SELECT 1 FROM public.album_photos 
            WHERE album_id = p_target_album_id 
            AND zonerama_photo_id = v_photo.photo_id
        ) THEN
            -- 更新 Zonerama 库状态
            UPDATE public.zonerama_library
            SET 
              status = 'transferred_to_album',
              transferred_to = 'album',
              transferred_at = NOW(),
              updated_at = NOW()
            WHERE id = v_photo_id;
            
            v_success_count := v_success_count + 1;
            CONTINUE;
        END IF;

        -- 插入到 album_photos 表（写真库）
        INSERT INTO public.album_photos (
          album_id,
          url,
          level,
          sort_order,
          zonerama_photo_id
        )
        VALUES (
          p_target_album_id,
          v_photo.url,
          v_photo.level, -- 同步等级权限
          0,
          v_photo.photo_id
        );
        
        -- 更新 Zonerama 库状态
        UPDATE public.zonerama_library
        SET 
          status = 'transferred_to_album',
          transferred_to = 'album',
          transferred_at = NOW(),
          updated_at = NOW()
        WHERE id = v_photo_id;
        
        v_success_count := v_success_count + 1;
      ELSE
        v_error_count := v_error_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_success_count, v_error_count;
END;
$$;


--
-- Name: transfer_zonerama_to_wallpaper("uuid"[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."transfer_zonerama_to_wallpaper"("p_photo_ids" "uuid"[]) RETURNS TABLE("success_count" integer, "error_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_photo_id UUID;
  v_photo RECORD;
  v_user_id UUID;
BEGIN
  -- 获取当前用户 ID
  v_user_id := auth.uid();
  
  FOREACH v_photo_id IN ARRAY p_photo_ids
  LOOP
    BEGIN
      -- 获取 Zonerama 图片信息
      SELECT * INTO v_photo FROM public.zonerama_library WHERE id = v_photo_id;
      
      IF v_photo.id IS NOT NULL THEN
        -- 插入前检查是否已存在（根据 zonerama_photo_id）
        IF EXISTS (
            SELECT 1 FROM public.media_items 
            WHERE zonerama_photo_id = v_photo.photo_id 
            AND deleted_at IS NULL
        ) THEN
            -- 更新 Zonerama 库状态为已转移
            UPDATE public.zonerama_library
            SET 
              status = 'transferred_to_wallpaper',
              transferred_to = 'wallpaper',
              transferred_at = NOW(),
              updated_at = NOW()
            WHERE id = v_photo_id;
            
            v_success_count := v_success_count + 1;
            CONTINUE;
        END IF;

        -- 插入到 media_items 表（壁纸库）
        INSERT INTO public.media_items (
          user_id,
          url,
          type,
          status,
          title,
          zonerama_photo_id
        )
        VALUES (
          v_user_id,
          v_photo.url,
          'image',
          'approved', -- 直接设为已审核
          v_photo.title,
          v_photo.photo_id
        );
        
        -- 更新 Zonerama 库状态
        UPDATE public.zonerama_library
        SET 
          status = 'transferred_to_wallpaper',
          transferred_to = 'wallpaper',
          transferred_at = NOW(),
          updated_at = NOW()
        WHERE id = v_photo_id;
        
        v_success_count := v_success_count + 1;
      ELSE
        v_error_count := v_error_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_success_count, v_error_count;
END;
$$;


--
-- Name: trig_check_badges_on_checkin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."trig_check_badges_on_checkin"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.check_and_grant_auto_badges(NEW.user_id);
    RETURN NEW;
END;
$$;


--
-- Name: trig_check_badges_on_favorite(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."trig_check_badges_on_favorite"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.check_and_grant_auto_badges(NEW.user_id);
    RETURN NEW;
END;
$$;


--
-- Name: trig_check_badges_on_media_approve(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."trig_check_badges_on_media_approve"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF (OLD.status != 'approved' AND NEW.status = 'approved') THEN
        PERFORM public.check_and_grant_auto_badges(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: update_all_media_heat_scores(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_all_media_heat_scores"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_v_weight FLOAT;
    v_f_weight FLOAT;
    v_time_decay FLOAT;
BEGIN
    -- 获取权重配置
    -- 使用具体的字段名替代 weights->>'field' 以防字段名变动
    SELECT 
        COALESCE((weights->>'view_weight')::FLOAT, 1.0),
        COALESCE((weights->>'favorite_weight')::FLOAT, 5.0),
        COALESCE((weights->>'time_decay_factor')::FLOAT, 0.99)
    INTO v_v_weight, v_f_weight, v_time_decay
    FROM public.recommendation_settings
    LIMIT 1;

    -- 设置默认值
    v_v_weight := COALESCE(v_v_weight, 1.0);
    v_f_weight := COALESCE(v_f_weight, 5.0);
    v_time_decay := COALESCE(v_time_decay, 0.99);

    -- 更新所有符合条件的媒体文件的 heat_score
    UPDATE public.media_items m
    SET heat_score = (
        (m.view_count * v_v_weight) + 
        ((SELECT count(*) FROM public.favorites f WHERE f.media_id = m.id) * v_f_weight) + 
        COALESCE(m.manual_boost, 0)
    ) * POWER(v_time_decay, GREATEST(0, EXTRACT(EPOCH FROM (NOW() - m.created_at)) / 3600))
    WHERE m.status::public.item_status = 'approved'::public.item_status AND m.deleted_at IS NULL;
END;
$$;


--
-- Name: update_dislike_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_dislike_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE media_items 
        SET dislike_count = dislike_count + 1 
        WHERE id = NEW.media_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE media_items 
        SET dislike_count = dislike_count - 1 
        WHERE id = OLD.media_id;
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: update_media_admin_status("uuid", boolean, boolean, "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_media_admin_status"("p_item_id" "uuid", "p_is_recommended" boolean DEFAULT NULL::boolean, "p_is_hidden" boolean DEFAULT NULL::boolean, "p_status" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    UPDATE public.media_items 
    SET 
        is_recommended = COALESCE(p_is_recommended, is_recommended),
        is_hidden = COALESCE(p_is_hidden, is_hidden),
        status = CASE 
                    WHEN p_status = 'approved'::public.item_status THEN 'approved'::public.item_status
                    WHEN p_status = 'archived'::public.item_status THEN 'archived'::public.item_status
                    WHEN p_status = 'pending'::public.item_status THEN 'pending'::public.item_status
                    WHEN p_status = 'rejected'::public.item_status THEN 'rejected'::public.item_status
                    ELSE status
                 END
    WHERE public.media_items.id = p_item_id;
END;
$$;


--
-- Name: update_media_status_rpc("uuid", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_media_status_rpc"("p_item_id" "uuid", "p_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    UPDATE public.media_items
    SET 
        status = p_status::public.item_status,
        updated_at = NOW()
    WHERE public.media_items.id = p_item_id;
END;
$$;


--
-- Name: update_media_status_rpc("uuid", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_media_status_rpc"("p_id" "uuid", "p_status" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_updated_count int;
BEGIN
    -- 使用文本比较进行权限检查
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'admin') THEN
        RAISE EXCEPTION '只有管理员可以执行此操作';
    END IF;

    -- 显式转换更新
    UPDATE public.media_items
    SET status = p_status::public.item_status,
        reason = p_reason,
        updated_at = NOW()
    WHERE id = p_id;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item not found');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_user_permissions("uuid", "jsonb"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_user_permissions"("p_user_id" "uuid", "p_permissions" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE profiles 
    SET permissions = p_permissions 
    WHERE id = p_user_id;
    
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: update_user_rank(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_user_rank"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    new_rank text;
BEGIN
    -- 找到符合成长值要求的最高等级
    SELECT name INTO new_rank 
    FROM public.rank_configs 
    WHERE min_exp <= NEW.exp 
    ORDER BY min_exp DESC 
    LIMIT 1;

    NEW.rank := COALESCE(new_rank, (SELECT name FROM public.rank_configs ORDER BY min_exp ASC LIMIT 1));
    RETURN NEW;
END;
$$;


--
-- Name: update_user_reading_stats("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_user_reading_stats"("target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai')::DATE;
    yesterday DATE := ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai') - INTERVAL '1 day')::DATE;
    current_last_read DATE;
    current_continuous INTEGER;
    current_total INTEGER;
BEGIN
    SELECT last_read_date, continuous_read_days, total_read_days 
    INTO current_last_read, current_continuous, current_total
    FROM profiles
    WHERE id = target_user_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF current_last_read IS NULL THEN
        -- First time reading
        UPDATE profiles 
        SET last_read_date = today, 
            continuous_read_days = 1,
            total_read_days = COALESCE(current_total, 0) + 1
        WHERE id = target_user_id;
    ELSIF current_last_read = today THEN
        -- Already updated today, do nothing
        NULL;
    ELSIF current_last_read = yesterday THEN
        -- Read yesterday, increment continuous count and total count
        UPDATE profiles 
        SET last_read_date = today, 
            continuous_read_days = current_continuous + 1,
            total_read_days = COALESCE(current_total, 0) + 1
        WHERE id = target_user_id;
    ELSE
        -- Break in continuity, reset to 1, but increment total
        UPDATE profiles 
        SET last_read_date = today, 
            continuous_read_days = 1,
            total_read_days = COALESCE(current_total, 0) + 1
        WHERE id = target_user_id;
    END IF;
END;
$$;


--
-- Name: update_user_reading_stats("uuid", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_user_reading_stats"("target_user_id" "uuid" DEFAULT NULL::"uuid", "target_openid" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_date_beijing date;
  target_profile_id uuid;
BEGIN
  -- 获取北京时间今日日期
  current_date_beijing := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'PRC')::date;

  -- 尝试定位 profile_id
  IF target_user_id IS NOT NULL THEN
    target_profile_id := target_user_id;
  ELSIF target_openid IS NOT NULL THEN
    -- 尝试通过 wechat_openid 或 mp_openid 查找
    SELECT id INTO target_profile_id FROM profiles 
    WHERE wechat_openid = target_openid OR mp_openid = target_openid 
    LIMIT 1;

    -- 如果找不到且有 openid，则创建一个临时 profile
    IF target_profile_id IS NULL THEN
      INSERT INTO profiles (
        username, 
        mp_openid, 
        role, 
        auto_created, 
        auto_created_source
      ) VALUES (
        '访客_' || right(target_openid, 6), 
        target_openid, 
        'pt', 
        true, 
        'daily_gallery_openid'
      ) RETURNING id INTO target_profile_id;
    END IF;
  END IF;

  -- 如果最终定位到了 profile_id，执行统计更新
  IF target_profile_id IS NOT NULL THEN
    UPDATE profiles
    SET 
      total_read_days = COALESCE(total_read_days, 0) + 
        CASE 
          WHEN last_read_date IS NULL OR last_read_date < current_date_beijing THEN 1 
          ELSE 0 
        END,
      continuous_read_days = 
        CASE 
          WHEN last_read_date IS NULL THEN 1
          WHEN last_read_date = current_date_beijing - INTERVAL '1 day' THEN continuous_read_days + 1
          WHEN last_read_date < current_date_beijing - INTERVAL '1 day' THEN 1
          ELSE continuous_read_days -- 今天已经更新过了
        END,
      last_read_date = current_date_beijing,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = target_profile_id 
      AND (last_read_date IS NULL OR last_read_date < current_date_beijing);
  END IF;
END;
$$;


--
-- Name: update_wechat_draft_templates_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_wechat_draft_templates_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_wechat_drafts_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_wechat_drafts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: upsert_favorite("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."upsert_favorite"("p_user_id" "uuid", "p_media_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO favorites (user_id, media_id)
    VALUES (p_user_id, p_media_id)
    ON CONFLICT (user_id, media_id) DO NOTHING
    RETURNING id INTO v_id;
    
    RETURN jsonb_build_object('success', true, 'id', v_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: upsert_table_data_no_fks("text", "jsonb", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."upsert_table_data_no_fks"("p_table_name" "text", "p_rows" "jsonb", "p_conflict_column" "text" DEFAULT 'id'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_cols text;
  v_update_cols text;
  v_query text;
BEGIN
  -- 临时关闭外键约束
  SET LOCAL session_replication_role = 'replica';

  -- 获取列名
  SELECT string_agg(quote_ident(column_name), ', ')
  INTO v_cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = p_table_name;

  -- 构建更新子句（排除冲突列）
  SELECT string_agg(quote_ident(column_name) || ' = EXCLUDED.' || quote_ident(column_name), ', ')
  INTO v_update_cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = p_table_name
  AND column_name != p_conflict_column;

  -- 构建并执行动态 SQL
  v_query := format(
    'INSERT INTO %I (%s) 
     SELECT * FROM jsonb_populate_recordset(NULL::%I, $1) 
     ON CONFLICT (%I) DO UPDATE SET %s',
    p_table_name, v_cols, p_table_name, p_conflict_column, v_update_cols
  );

  EXECUTE v_query USING p_rows;

  RETURN jsonb_build_object('success', true, 'count', jsonb_array_length(p_rows));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$_$;


--
-- Name: upsert_table_data_v2("text", "jsonb", "text"[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."upsert_table_data_v2"("p_table_name" "text", "p_rows" "jsonb", "p_conflict_columns" "text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  v_cols text;
  v_update_cols text;
  v_conflict_clause text;
  v_query text;
BEGIN
  -- 临时关闭外键约束 (replica 模式下不会触发外键检查)
  SET LOCAL session_replication_role = 'replica';

  -- 获取列名
  SELECT string_agg(quote_ident(column_name), ', ')
  INTO v_cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = p_table_name;

  -- 构建更新子句（排除冲突列）
  SELECT string_agg(quote_ident(column_name) || ' = EXCLUDED.' || quote_ident(column_name), ', ')
  INTO v_update_cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = p_table_name
  AND NOT (column_name = ANY(p_conflict_columns));

  -- 构建冲突列子句
  SELECT string_agg(quote_ident(col), ', ')
  INTO v_conflict_clause
  FROM unnest(p_conflict_columns) col;

  -- 构建并执行动态 SQL
  -- 如果没有更新列（即全表只有主键/联合主键），则 DO NOTHING
  IF v_update_cols IS NULL OR v_update_cols = '' THEN
    v_query := format(
      'INSERT INTO %I (%s) 
       SELECT * FROM jsonb_populate_recordset(NULL::%I, $1) 
       ON CONFLICT (%s) DO NOTHING',
      p_table_name, v_cols, p_table_name, v_conflict_clause
    );
  ELSE
    v_query := format(
      'INSERT INTO %I (%s) 
       SELECT * FROM jsonb_populate_recordset(NULL::%I, $1) 
       ON CONFLICT (%s) DO UPDATE SET %s',
      p_table_name, v_cols, p_table_name, v_conflict_clause, v_update_cols
    );
  END IF;

  EXECUTE v_query USING p_rows;

  RETURN jsonb_build_object('success', true, 'count', jsonb_array_length(p_rows));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$_$;


--
-- Name: upsert_table_data_v3("text", "jsonb", "text"[], boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."upsert_table_data_v3"("p_table_name" "text", "p_rows" "jsonb", "p_conflict_columns" "text"[], "p_do_nothing" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  v_cols text;
  v_update_cols text;
  v_conflict_clause text;
  v_query text;
BEGIN
  -- 临时关闭外键约束 (replica 模式下不会触发外键检查)
  SET LOCAL session_replication_role = 'replica';

  -- 获取列名
  SELECT string_agg(quote_ident(column_name), ', ')
  INTO v_cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = p_table_name;

  -- 构建冲突列子句
  SELECT string_agg(quote_ident(col), ', ')
  INTO v_conflict_clause
  FROM unnest(p_conflict_columns) col;

  -- 检查是否执行 DO NOTHING
  IF p_do_nothing THEN
    v_query := format(
      'INSERT INTO %I (%s) 
       SELECT * FROM jsonb_populate_recordset(NULL::%I, $1) 
       ON CONFLICT (%s) DO NOTHING',
      p_table_name, v_cols, p_table_name, v_conflict_clause
    );
  ELSE
    -- 构建更新子句（排除冲突列）
    SELECT string_agg(quote_ident(column_name) || ' = EXCLUDED.' || quote_ident(column_name), ', ')
    INTO v_update_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = p_table_name
    AND NOT (column_name = ANY(p_conflict_columns));

    -- 如果没有更新列（即全表只有主键/联合主键），则 DO NOTHING
    IF v_update_cols IS NULL OR v_update_cols = '' THEN
      v_query := format(
        'INSERT INTO %I (%s) 
         SELECT * FROM jsonb_populate_recordset(NULL::%I, $1) 
         ON CONFLICT (%s) DO NOTHING',
        p_table_name, v_cols, p_table_name, v_conflict_clause
      );
    ELSE
      v_query := format(
        'INSERT INTO %I (%s) 
         SELECT * FROM jsonb_populate_recordset(NULL::%I, $1) 
         ON CONFLICT (%s) DO UPDATE SET %s',
        p_table_name, v_cols, p_table_name, v_conflict_clause, v_update_cols
      );
    END IF;
  END IF;

  EXECUTE v_query USING p_rows;

  RETURN jsonb_build_object('success', true, 'count', jsonb_array_length(p_rows));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$_$;


--
-- Name: upsert_user_active_session("uuid", "text", "jsonb", boolean, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."upsert_user_active_session"("p_user_id" "uuid", "p_session_id" "text", "p_device_info" "jsonb", "p_is_active" boolean, "p_last_ping_at" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO user_active_sessions (user_id, session_id, device_info, is_active, last_ping_at)
    VALUES (p_user_id, p_session_id, p_device_info, p_is_active, p_last_ping_at)
    ON CONFLICT (user_id, session_id) 
    DO UPDATE SET 
        device_info = EXCLUDED.device_info,
        is_active = EXCLUDED.is_active,
        last_ping_at = EXCLUDED.last_ping_at;
        
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: upsert_user_pending_item("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."upsert_user_pending_item"("p_user_id" "uuid", "p_media_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO user_pending_items (user_id, media_id)
    VALUES (p_user_id, p_media_id)
    ON CONFLICT (user_id, media_id) DO NOTHING;
    
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: upsert_user_visit_stats("uuid", "text", "text", "text", "text", "text", integer, boolean, "text", "text", "text", "text", "text", "text", "text", "text", timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."upsert_user_visit_stats"("p_user_id" "uuid", "p_ip_address" "text", "p_browser" "text", "p_os" "text", "p_network_type" "text", "p_path" "text", "p_duration" integer, "p_adblock_enabled" boolean, "p_device" "text", "p_country" "text", "p_region" "text", "p_city" "text", "p_referrer" "text", "p_resolution" "text", "p_language" "text", "p_page_title" "text", "p_visited_at" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_visit_date DATE;
BEGIN
  v_visit_date := (COALESCE(p_visited_at, now()) AT TIME ZONE 'UTC')::date;

  INSERT INTO public.user_visit_stats (
    user_id, ip_address, browser, os, network_type, path, duration, adblock_enabled,
    device_type, country, region, city, referrer, resolution, language, page_title, created_at, visit_date
  )
  VALUES (
    p_user_id, p_ip_address, p_browser, p_os, p_network_type, p_path, p_duration, p_adblock_enabled,
    p_device, p_country, p_region, p_city, p_referrer, p_resolution, p_language, p_page_title, 
    COALESCE(p_visited_at, now()), v_visit_date
  )
  ON CONFLICT (ip_address, path, visit_date)
  DO UPDATE SET
    duration = GREATEST(public.user_visit_stats.duration, EXCLUDED.duration),
    user_id = COALESCE(EXCLUDED.user_id, public.user_visit_stats.user_id),
    browser = EXCLUDED.browser,
    os = EXCLUDED.os,
    network_type = EXCLUDED.network_type,
    device_type = EXCLUDED.device_type,
    country = EXCLUDED.country,
    region = EXCLUDED.region,
    city = EXCLUDED.city,
    referrer = EXCLUDED.referrer,
    resolution = EXCLUDED.resolution,
    language = EXCLUDED.language,
    page_title = EXCLUDED.page_title,
    adblock_enabled = EXCLUDED.adblock_enabled,
    created_at = EXCLUDED.created_at;
END;
$$;


--
-- Name: verify_daily_gallery_password("date", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."verify_daily_gallery_password"("p_post_date" "date", "p_password" "text") RETURNS TABLE("is_valid" boolean, "post_id" "uuid", "image_ids" "uuid"[], "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_post RECORD;
BEGIN
  SELECT * INTO v_post
  FROM daily_gallery_posts
  WHERE post_date = p_post_date
    AND is_published = TRUE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_post.password = p_password AND v_post.password_expires_at > NOW() THEN
    RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_post.password_expires_at;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ;
  END IF;
END;
$$;


--
-- Name: verify_daily_gallery_password("date", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."verify_daily_gallery_password"("p_post_date" "date", "p_password" "text", "p_openid" "text" DEFAULT NULL::"text") RETURNS TABLE("is_valid" boolean, "post_id" "uuid", "image_ids" "uuid"[], "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_post RECORD;
  v_user_pwd RECORD;
BEGIN
  -- 1. 检查是否存在该日期的发布记录
  SELECT * INTO v_post
  FROM daily_gallery_posts
  WHERE post_date = p_post_date
    AND is_published = TRUE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- 2. 检查用户专属密码
  IF p_openid IS NOT NULL AND p_openid <> '' THEN
    SELECT * INTO v_user_pwd
    FROM daily_gallery_user_passwords
    WHERE openid = p_openid 
      AND post_date = p_post_date;
      
    IF FOUND AND v_user_pwd.password = p_password AND v_user_pwd.expires_at > NOW() THEN
      RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_user_pwd.expires_at;
      RETURN;
    END IF;
  END IF;

  -- 3. 检查全局密码 (作为兜底)
  IF v_post.password = p_password AND v_post.password_expires_at > NOW() THEN
    RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_post.password_expires_at;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ;
  END IF;
END;
$$;


--
-- Name: verify_daily_gallery_password("date", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."verify_daily_gallery_password"("p_post_date" "date", "p_password" "text", "p_openid" "text" DEFAULT NULL::"text", "p_browser_id" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_post_id uuid;
    v_correct_password text;
    v_is_special boolean := false;
    v_special_id uuid;
BEGIN
    -- Check if it is a normal post password
    SELECT id, password INTO v_post_id, v_correct_password
    FROM public.daily_gallery_posts
    WHERE post_date = p_post_date;

    IF v_post_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '该日期没有发布内容');
    END IF;

    -- 1. Check special/one-time passwords
    SELECT id INTO v_special_id
    FROM public.daily_gallery_special_passwords
    WHERE password = p_password
      AND (target_date IS NULL OR target_date = p_post_date)
      AND (expires_at IS NULL OR expires_at > now())
      AND (is_one_time = false OR (is_one_time = true AND usages < max_usages))
    LIMIT 1;

    IF v_special_id IS NOT NULL THEN
        -- Mark as used
        UPDATE public.daily_gallery_special_passwords
        SET usages = usages + 1, last_used_at = now()
        WHERE id = v_special_id;
        
        RETURN jsonb_build_object('success', true, 'message', '特权密码验证成功', 'post_id', v_post_id);
    END IF;

    -- 2. Check normal password
    IF v_correct_password = p_password THEN
        RETURN jsonb_build_object('success', true, 'message', '验证成功', 'post_id', v_post_id);
    END IF;

    RETURN jsonb_build_object('success', false, 'message', '密码错误');
END;
$$;


--
-- Name: verify_daily_gallery_v3("text", "text", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."verify_daily_gallery_v3"("p_post_date" "text", "p_password" "text", "p_openid" "text" DEFAULT NULL::"text", "p_browser_id" "text" DEFAULT NULL::"text", "p_ip_address" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_post_id uuid;
    v_image_ids uuid[];
    v_correct_password text;
    v_special_pwd RECORD;
    v_user_pwd RECORD;
    v_account_pwd_id uuid;
    v_images jsonb;
    v_expires_at timestamptz;
    v_config jsonb;
    v_enable_password boolean;
    v_allow_multi_user boolean;
    v_target_date date;
    v_identifier text;
    v_p_trimmed text;
    v_user_lock RECORD;
    v_password_type text := 'unknown';
    v_user_daily_usage integer;
    v_user_total_usage integer;
BEGIN
    -- 规范化输入
    v_p_trimmed := TRIM(p_password);
    
    -- 默认标识符：优先使用浏览器指纹，其次是 openid
    v_identifier := COALESCE(NULLIF(TRIM(p_browser_id), ''), NULLIF(TRIM(p_openid), ''));

    BEGIN
        v_target_date := p_post_date::date;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', '日期格式不正确', 'errorCode', 'INVALID_DATE');
    END;

    -- 1. 获取全局配置
    SELECT value INTO v_config
    FROM public.system_configs
    WHERE key = 'daily_gallery_config';
    
    v_enable_password := COALESCE((v_config->>'enable_password')::boolean, true);
    v_allow_multi_user := COALESCE((v_config->>'allow_multiple_users_per_browser')::boolean, false);

    -- 2. 获取帖子信息
    SELECT id, password, image_ids 
    INTO v_post_id, v_correct_password, v_image_ids
    FROM public.daily_gallery_posts
    WHERE post_date = v_target_date
      AND is_published = true;

    IF v_post_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '该日期还没有发布内容哦', 'errorCode', 'POST_NOT_FOUND');
    END IF;

    -- 3. 验证逻辑
    IF v_enable_password = false THEN
        v_expires_at := now() + interval '24 hours';
        v_password_type := 'free';
    ELSIF v_p_trimmed = 'BYPASS_MP_UNLOCK' THEN
        v_expires_at := now() + interval '12 hours';
        v_password_type := 'ad_unlock';
    ELSE
        -- 3.1 检查随机密码库 (daily_gallery_special_passwords)
        SELECT * INTO v_special_pwd
        FROM public.daily_gallery_special_passwords
        WHERE password = v_p_trimmed
        ORDER BY (target_date = v_target_date) DESC, (expires_at > now()) DESC, created_at DESC
        LIMIT 1;

        IF v_special_pwd.id IS NOT NULL THEN
            v_password_type := 'special:' || v_special_pwd.password_type;
            
            -- 3.1.1 检查日期是否匹配
            IF v_special_pwd.target_date IS NOT NULL AND v_special_pwd.target_date <> v_target_date THEN
                RETURN jsonb_build_object(
                    'success', false, 
                    'message', '该密码仅适用于 ' || v_special_pwd.target_date || ' 的图集内容，请获取今日正确密码', 
                    'errorCode', 'DATE_MISMATCH'
                );
            END IF;

            -- 3.1.2 检查是否过期
            IF v_special_pwd.expires_at IS NOT NULL AND v_special_pwd.expires_at <= now() THEN
                RETURN jsonb_build_object(
                    'success', false, 
                    'message', '访问凭据已过期，请重新向公众号获取', 
                    'errorCode', 'PASSWORD_EXPIRED'
                );
            END IF;

            -- 3.1.3 专属校验
            IF v_special_pwd.creator_id IS NOT NULL AND v_special_pwd.creator_id <> '' THEN
                IF p_openid IS NULL OR p_openid = '' OR p_openid <> v_special_pwd.creator_id THEN
                    RETURN jsonb_build_object(
                        'success', false, 
                        'message', '该密码非您的专属密码，请获取您自己的访问凭据', 
                        'errorCode', 'WECHAT_EXCLUSIVE_PASSWORD'
                    );
                END IF;
            END IF;

            -- 3.1.4 单用户频率限制校验
            IF (COALESCE(v_special_pwd.per_user_max_total, 0) > 0 OR COALESCE(v_special_pwd.per_user_max_daily, 0) > 0) AND (p_openid IS NOT NULL AND p_openid <> '') THEN
                -- 检查当日次数
                IF COALESCE(v_special_pwd.per_user_max_daily, 0) > 0 THEN
                    SELECT COUNT(*) INTO v_user_daily_usage
                    FROM public.special_password_usage
                    WHERE password_id = v_special_pwd.id
                      AND openid = p_openid
                      AND usage_date = CURRENT_DATE;
                    
                    IF v_user_daily_usage >= v_special_pwd.per_user_max_daily THEN
                        RETURN jsonb_build_object('success', false, 'message', '您今日已达到该特权的使用次数上限', 'errorCode', 'USER_DAILY_LIMIT_REACHED');
                    END IF;
                END IF;

                -- 检查累计总次数
                IF COALESCE(v_special_pwd.per_user_max_total, 0) > 0 THEN
                    SELECT COUNT(*) INTO v_user_total_usage
                    FROM public.special_password_usage
                    WHERE password_id = v_special_pwd.id
                      AND openid = p_openid;
                    
                    IF v_user_total_usage >= v_special_pwd.per_user_max_total THEN
                        RETURN jsonb_build_object('success', false, 'message', '您已达到该特权的累计使用次数上限', 'errorCode', 'USER_TOTAL_LIMIT_REACHED');
                    END IF;
                END IF;
            END IF;

            -- 3.1.5 根据密码类型执行逻辑
            IF v_special_pwd.password_type = 'one_time' THEN
                IF v_special_pwd.is_used = true THEN
                    RETURN jsonb_build_object('success', false, 'message', '该密码已被使用', 'errorCode', 'USAGE_LIMIT_REACHED');
                END IF;
                UPDATE public.daily_gallery_special_passwords 
                SET is_used = true, used_at = NOW(), used_count = COALESCE(used_count, 0) + 1
                WHERE id = v_special_pwd.id;
            ELSIF v_special_pwd.password_type IN ('periodic_single_user', 'periodic_multi_user') THEN
                IF v_special_pwd.password_type = 'periodic_multi_user' AND p_ip_address IS NOT NULL AND p_ip_address <> '' THEN
                    v_identifier := TRIM(p_ip_address);
                END IF;

                IF v_allow_multi_user = false THEN
                    IF v_special_pwd.password_type = 'periodic_single_user' THEN
                        SELECT * INTO v_user_lock
                        FROM public.daily_gallery_password_user_locks
                        WHERE password_id = v_special_pwd.id
                        LIMIT 1;
                    ELSE
                        SELECT * INTO v_user_lock
                        FROM public.daily_gallery_password_user_locks
                        WHERE password_id = v_special_pwd.id
                          AND user_identifier = v_identifier
                        LIMIT 1;
                    END IF;

                    IF v_user_lock.id IS NOT NULL THEN
                        IF v_user_lock.user_identifier <> v_identifier THEN
                            RETURN jsonb_build_object(
                                'success', false, 
                                'message', '该密码已在其他设备或浏览器激活，专属密码仅支持首个打开的设备。', 
                                'errorCode', 'BROWSER_LOCKED'
                            );
                        END IF;
                    ELSE
                        INSERT INTO public.daily_gallery_password_user_locks (password_id, user_identifier, browser_id)
                        VALUES (v_special_pwd.id, v_identifier, v_identifier);
                    END IF;
                END IF;
                
                UPDATE public.daily_gallery_special_passwords 
                SET used_count = COALESCE(used_count, 0) + 1, used_at = NOW()
                WHERE id = v_special_pwd.id;
            ELSIF v_special_pwd.password_type = 'multi_use' THEN
                IF v_special_pwd.max_usages IS NOT NULL AND v_special_pwd.used_count >= v_special_pwd.max_usages THEN
                    RETURN jsonb_build_object('success', false, 'message', '该密码使用次数已达上限', 'errorCode', 'USAGE_LIMIT_REACHED');
                END IF;
                UPDATE public.daily_gallery_special_passwords 
                SET used_count = COALESCE(used_count, 0) + 1, 
                    is_used = CASE WHEN max_usages IS NOT NULL AND COALESCE(used_count, 0) + 1 >= max_usages THEN TRUE ELSE is_used END,
                    used_at = NOW()
                WHERE id = v_special_pwd.id;
            ELSIF v_special_pwd.password_type = 'long_term' THEN
                UPDATE public.daily_gallery_special_passwords 
                SET used_count = COALESCE(used_count, 0) + 1, used_at = NOW()
                WHERE id = v_special_pwd.id;
            END IF;
            
            -- 记录单用户使用情况
            IF (COALESCE(v_special_pwd.per_user_max_total, 0) > 0 OR COALESCE(v_special_pwd.per_user_max_daily, 0) > 0) AND (p_openid IS NOT NULL AND p_openid <> '') THEN
                INSERT INTO public.special_password_usage (password_id, openid)
                VALUES (v_special_pwd.id, p_openid);
            END IF;

            v_expires_at := COALESCE(v_special_pwd.expires_at, now() + interval '24 hours');
        
        -- 3.2 检查通用配置密码
        ELSIF v_config->>'universal_password' IS NOT NULL AND v_p_trimmed = v_config->>'universal_password' THEN
            v_expires_at := now() + interval '24 hours';
            v_password_type := 'universal';

        -- 3.3 检查帖子自带的原始密码
        ELSIF v_correct_password = v_p_trimmed THEN
            v_expires_at := now() + interval '2 hours';
            v_password_type := 'post_fixed';

        -- 3.4 检查其他类型密码
        ELSE
            SELECT id INTO v_account_pwd_id
            FROM public.daily_gallery_account_passwords
            WHERE post_id = v_post_id
              AND password = v_p_trimmed
            LIMIT 1;

            IF v_account_pwd_id IS NOT NULL THEN
                v_expires_at := now() + interval '24 hours';
                v_password_type := 'account';
            ELSE
                SELECT * INTO v_user_pwd
                FROM public.daily_gallery_user_passwords
                WHERE password = v_p_trimmed
                ORDER BY (post_date = v_target_date) DESC, post_date DESC
                LIMIT 1;

                IF v_user_pwd.id IS NOT NULL THEN
                    v_password_type := 'user_fixed';
                    
                    -- ✅ 新增：专属校验，验证 openid 是否匹配
                    IF v_user_pwd.openid IS NOT NULL AND v_user_pwd.openid <> '' THEN
                        IF p_openid IS NULL OR p_openid = '' OR p_openid <> v_user_pwd.openid THEN
                            RETURN jsonb_build_object(
                                'success', false, 
                                'message', '该密码非您的专属密码，请获取您自己的访问凭据', 
                                'errorCode', 'WECHAT_EXCLUSIVE_PASSWORD'
                            );
                        END IF;
                    END IF;

                    IF v_user_pwd.post_date <> v_target_date THEN
                         RETURN jsonb_build_object('success', false, 'message', '该密码仅适用于 ' || v_user_pwd.post_date || ' 的图集内容，请获取今日正确密码', 'errorCode', 'DATE_MISMATCH');
                    END IF;
                    IF v_user_pwd.expires_at <= now() THEN
                        RETURN jsonb_build_object('success', false, 'message', '访问凭据已过期，请重新获取', 'errorCode', 'PASSWORD_EXPIRED');
                    END IF;

                    IF v_allow_multi_user = false THEN
                        IF v_user_pwd.locked_browser_id IS NOT NULL AND v_user_pwd.locked_browser_id <> '' THEN
                            IF v_identifier IS NULL OR v_identifier = '' OR v_user_pwd.locked_browser_id <> v_identifier THEN
                                RETURN jsonb_build_object(
                                    'success', false, 
                                    'message', '该密码已在其他设备或浏览器激活，专属密码仅支持首个打开的设备。', 
                                    'errorCode', 'BROWSER_LOCKED'
                                );
                            END IF;
                        END IF;

                        UPDATE public.daily_gallery_user_passwords
                        SET locked_browser_id = CASE 
                            WHEN (locked_browser_id IS NULL OR locked_browser_id = '') 
                            THEN v_identifier ELSE locked_browser_id END
                        WHERE id = v_user_pwd.id;
                    END IF;

                    v_expires_at := v_user_pwd.expires_at;
                ELSE
                    RETURN jsonb_build_object('success', false, 'message', '密码不正确，请重新获取今日访问凭证', 'errorCode', 'INVALID_PASSWORD');
                END IF;
            END IF;
        END IF;
    END IF;

    -- 4. 获取图片详情
    SELECT jsonb_agg(m) INTO v_images
    FROM (
        SELECT * FROM public.media_items
        WHERE id = ANY(v_image_ids)
        AND deleted_at IS NULL
    ) m;

    RETURN jsonb_build_object(
        'success', true, 
        'message', '验证成功', 
        'data', jsonb_build_object(
            'postId', v_post_id,
            'images', COALESCE(v_images, '[]'::jsonb),
            'expiresAt', v_expires_at,
            'passwordType', v_password_type
        )
    );
END;
$$;


--
-- Name: apply_rls("jsonb", integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."apply_rls"("wal" "jsonb", "max_record_bytes" integer DEFAULT (1024 * 1024)) RETURNS SETOF "realtime"."wal_rls"
    LANGUAGE "plpgsql"
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
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
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

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
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
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
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
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
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
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

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
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes("text", "text", "text", "text", "text", "record", "record", "text"); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."broadcast_changes"("topic_name" "text", "event_name" "text", "operation" "text", "table_name" "text", "table_schema" "text", "new" "record", "old" "record", "level" "text" DEFAULT 'ROW'::"text") RETURNS "void"
    LANGUAGE "plpgsql"
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


--
-- Name: build_prepared_statement_sql("text", "regclass", "realtime"."wal_column"[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."build_prepared_statement_sql"("prepared_statement_name" "text", "entity" "regclass", "columns" "realtime"."wal_column"[]) RETURNS "text"
    LANGUAGE "sql"
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


--
-- Name: cast("text", "regtype"); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."cast"("val" "text", "type_" "regtype") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;


--
-- Name: check_equality_op("realtime"."equality_op", "regtype", "text", "text"); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."check_equality_op"("op" "realtime"."equality_op", "type_" "regtype", "val_1" "text", "val_2" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
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


--
-- Name: is_visible_through_filters("realtime"."wal_column"[], "realtime"."user_defined_filter"[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."is_visible_through_filters"("columns" "realtime"."wal_column"[], "filters" "realtime"."user_defined_filter"[]) RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


--
-- Name: list_changes("name", "name", integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."list_changes"("publication" "name", "slot_name" "name", "max_changes" integer, "max_record_bytes" integer) RETURNS SETOF "realtime"."wal_rls"
    LANGUAGE "sql"
    SET "log_min_messages" TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
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
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


--
-- Name: quote_wal2json("regclass"); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."quote_wal2json"("entity" "regclass") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


--
-- Name: send("jsonb", "text", "text", boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."send"("payload" "jsonb", "event" "text", "topic" "text", "private" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."subscription_check_filters"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


--
-- Name: to_regrole("text"); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."to_regrole"("role_name" "text") RETURNS "regrole"
    LANGUAGE "sql" IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."topic"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: add_prefixes("text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."add_prefixes"("_bucket_id" "text", "_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


--
-- Name: can_insert_object("text", "text", "uuid", "jsonb"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: delete_prefix("text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."delete_prefix"("_bucket_id" "text", "_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


--
-- Name: delete_prefix_hierarchy_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."delete_prefix_hierarchy_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."enforce_bucket_name_length"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension("text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename("text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername("text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
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


--
-- Name: get_level("text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."get_level"("name" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


--
-- Name: get_prefix("text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."get_prefix"("name" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


--
-- Name: get_prefixes("text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."get_prefixes"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."get_size_by_bucket"() RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter("text", "text", "text", integer, "text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
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


--
-- Name: list_objects_with_delimiter("text", "text", "text", integer, "text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


--
-- Name: objects_insert_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."objects_insert_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


--
-- Name: objects_update_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."objects_update_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: prefixes_insert_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."prefixes_insert_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


--
-- Name: search("text", "text", integer, integer, integer, "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


--
-- Name: search_legacy_v1("text", "text", integer, integer, integer, "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: search_v1_optimised("text", "text", integer, integer, integer, "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."search_v1_optimised"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: search_v2("text", "text", integer, integer, "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "start_after" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
BEGIN
    RETURN query EXECUTE
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name || '/' AS name,
                    NULL::uuid AS id,
                    NULL::timestamptz AS updated_at,
                    NULL::timestamptz AS created_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
                ORDER BY prefixes.name COLLATE "C" LIMIT $3
            )
            UNION ALL
            (SELECT split_part(name, '/', $4) AS key,
                name,
                id,
                updated_at,
                created_at,
                metadata
            FROM storage.objects
            WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
            ORDER BY name COLLATE "C" LIMIT $3)
        ) obj
        ORDER BY name COLLATE "C" LIMIT $3;
        $sql$
        USING prefix, bucket_name, limits, levels, start_after;
END;
$_$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


--
-- Name: extensions; Type: TABLE; Schema: _realtime; Owner: -
--

CREATE TABLE "_realtime"."extensions" (
    "id" "uuid" NOT NULL,
    "type" "text",
    "settings" "jsonb",
    "tenant_external_id" "text",
    "inserted_at" timestamp(0) without time zone NOT NULL,
    "updated_at" timestamp(0) without time zone NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: _realtime; Owner: -
--

CREATE TABLE "_realtime"."schema_migrations" (
    "version" bigint NOT NULL,
    "inserted_at" timestamp(0) without time zone
);


--
-- Name: tenants; Type: TABLE; Schema: _realtime; Owner: -
--

CREATE TABLE "_realtime"."tenants" (
    "id" "uuid" NOT NULL,
    "name" "text",
    "external_id" "text",
    "jwt_secret" "text",
    "max_concurrent_users" integer DEFAULT 200 NOT NULL,
    "inserted_at" timestamp(0) without time zone NOT NULL,
    "updated_at" timestamp(0) without time zone NOT NULL,
    "max_events_per_second" integer DEFAULT 100 NOT NULL,
    "postgres_cdc_default" "text" DEFAULT 'postgres_cdc_rls'::"text",
    "max_bytes_per_second" integer DEFAULT 100000 NOT NULL,
    "max_channels_per_client" integer DEFAULT 100 NOT NULL,
    "max_joins_per_second" integer DEFAULT 500 NOT NULL,
    "suspend" boolean DEFAULT false,
    "jwt_jwks" "jsonb",
    "notify_private_alpha" boolean DEFAULT false,
    "private_only" boolean DEFAULT false NOT NULL,
    "migrations_ran" integer DEFAULT 0,
    "broadcast_adapter" character varying(255) DEFAULT 'gen_rpc'::character varying,
    "max_presence_events_per_second" integer DEFAULT 1000,
    "max_payload_size_in_kb" integer DEFAULT 3000
);


--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."audit_log_entries" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "payload" json,
    "created_at" timestamp with time zone,
    "ip_address" character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE "audit_log_entries"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."audit_log_entries" IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."flow_state" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "auth_code" "text" NOT NULL,
    "code_challenge_method" "auth"."code_challenge_method" NOT NULL,
    "code_challenge" "text" NOT NULL,
    "provider_type" "text" NOT NULL,
    "provider_access_token" "text",
    "provider_refresh_token" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "authentication_method" "text" NOT NULL,
    "auth_code_issued_at" timestamp with time zone
);


--
-- Name: TABLE "flow_state"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."flow_state" IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."identities" (
    "provider_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "identity_data" "jsonb" NOT NULL,
    "provider" "text" NOT NULL,
    "last_sign_in_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email" "text" GENERATED ALWAYS AS ("lower"(("identity_data" ->> 'email'::"text"))) STORED,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: TABLE "identities"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."identities" IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN "identities"."email"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."identities"."email" IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."instances" (
    "id" "uuid" NOT NULL,
    "uuid" "uuid",
    "raw_base_config" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


--
-- Name: TABLE "instances"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."instances" IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."mfa_amr_claims" (
    "session_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "authentication_method" "text" NOT NULL,
    "id" "uuid" NOT NULL
);


--
-- Name: TABLE "mfa_amr_claims"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."mfa_amr_claims" IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."mfa_challenges" (
    "id" "uuid" NOT NULL,
    "factor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "ip_address" "inet" NOT NULL,
    "otp_code" "text",
    "web_authn_session_data" "jsonb"
);


--
-- Name: TABLE "mfa_challenges"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."mfa_challenges" IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."mfa_factors" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friendly_name" "text",
    "factor_type" "auth"."factor_type" NOT NULL,
    "status" "auth"."factor_status" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "secret" "text",
    "phone" "text",
    "last_challenged_at" timestamp with time zone,
    "web_authn_credential" "jsonb",
    "web_authn_aaguid" "uuid"
);


--
-- Name: TABLE "mfa_factors"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."mfa_factors" IS 'auth: stores metadata about factors';


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."one_time_tokens" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" "text" NOT NULL,
    "relates_to" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "one_time_tokens_token_hash_check" CHECK (("char_length"("token_hash") > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."refresh_tokens" (
    "instance_id" "uuid",
    "id" bigint NOT NULL,
    "token" character varying(255),
    "user_id" character varying(255),
    "revoked" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "parent" character varying(255),
    "session_id" "uuid"
);


--
-- Name: TABLE "refresh_tokens"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."refresh_tokens" IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE "auth"."refresh_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNED BY "auth"."refresh_tokens"."id";


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."saml_providers" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "entity_id" "text" NOT NULL,
    "metadata_xml" "text" NOT NULL,
    "metadata_url" "text",
    "attribute_mapping" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "name_id_format" "text",
    CONSTRAINT "entity_id not empty" CHECK (("char_length"("entity_id") > 0)),
    CONSTRAINT "metadata_url not empty" CHECK ((("metadata_url" = NULL::"text") OR ("char_length"("metadata_url") > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK (("char_length"("metadata_xml") > 0))
);


--
-- Name: TABLE "saml_providers"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."saml_providers" IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."saml_relay_states" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "request_id" "text" NOT NULL,
    "for_email" "text",
    "redirect_to" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "flow_state_id" "uuid",
    CONSTRAINT "request_id not empty" CHECK (("char_length"("request_id") > 0))
);


--
-- Name: TABLE "saml_relay_states"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."saml_relay_states" IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."schema_migrations" (
    "version" character varying(255) NOT NULL
);


--
-- Name: TABLE "schema_migrations"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."schema_migrations" IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "factor_id" "uuid",
    "aal" "auth"."aal_level",
    "not_after" timestamp with time zone,
    "refreshed_at" timestamp without time zone,
    "user_agent" "text",
    "ip" "inet",
    "tag" "text"
);


--
-- Name: TABLE "sessions"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."sessions" IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN "sessions"."not_after"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."sessions"."not_after" IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."sso_domains" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK (("char_length"("domain") > 0))
);


--
-- Name: TABLE "sso_domains"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."sso_domains" IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."sso_providers" (
    "id" "uuid" NOT NULL,
    "resource_id" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    CONSTRAINT "resource_id not empty" CHECK ((("resource_id" = NULL::"text") OR ("char_length"("resource_id") > 0)))
);


--
-- Name: TABLE "sso_providers"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."sso_providers" IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN "sso_providers"."resource_id"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."sso_providers"."resource_id" IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."users" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "aud" character varying(255),
    "role" character varying(255),
    "email" character varying(255),
    "encrypted_password" character varying(255),
    "email_confirmed_at" timestamp with time zone,
    "invited_at" timestamp with time zone,
    "confirmation_token" character varying(255),
    "confirmation_sent_at" timestamp with time zone,
    "recovery_token" character varying(255),
    "recovery_sent_at" timestamp with time zone,
    "email_change_token_new" character varying(255),
    "email_change" character varying(255),
    "email_change_sent_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "raw_app_meta_data" "jsonb",
    "raw_user_meta_data" "jsonb",
    "is_super_admin" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "phone" "text" DEFAULT NULL::character varying,
    "phone_confirmed_at" timestamp with time zone,
    "phone_change" "text" DEFAULT ''::character varying,
    "phone_change_token" character varying(255) DEFAULT ''::character varying,
    "phone_change_sent_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone GENERATED ALWAYS AS (LEAST("email_confirmed_at", "phone_confirmed_at")) STORED,
    "email_change_token_current" character varying(255) DEFAULT ''::character varying,
    "email_change_confirm_status" smallint DEFAULT 0,
    "banned_until" timestamp with time zone,
    "reauthentication_token" character varying(255) DEFAULT ''::character varying,
    "reauthentication_sent_at" timestamp with time zone,
    "is_sso_user" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_email_change_confirm_status_check" CHECK ((("email_change_confirm_status" >= 0) AND ("email_change_confirm_status" <= 2)))
);


--
-- Name: TABLE "users"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."users" IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN "users"."is_sso_user"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."users"."is_sso_user" IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "type" "text" DEFAULT 'bar'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "end_time" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_mandatory" boolean DEFAULT false,
    CONSTRAINT "announcements_type_check" CHECK (("type" = ANY (ARRAY['bar'::"text", 'modal'::"text"])))
);


--
-- Name: active_announcements; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."active_announcements" AS
 SELECT "id",
    "title",
    "content",
    "type",
    "is_active",
    "end_time",
    "created_at",
    "updated_at"
   FROM "public"."announcements"
  WHERE (("is_active" = true) AND (("end_time" IS NULL) OR ("end_time" > "now"())))
  ORDER BY "created_at" DESC;


--
-- Name: wechat_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wechat_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "appid" "text" NOT NULL,
    "appsecret" "text" NOT NULL,
    "token" "text",
    "aes_key" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "test_status" "text" DEFAULT 'untested'::"text",
    "last_test_time" timestamp with time zone,
    "test_message" "text",
    "unsubscribe_notif_enabled" boolean DEFAULT false,
    "qr_code_url" "text",
    "access_token" "text",
    "access_token_expires_at" timestamp with time zone
);


--
-- Name: COLUMN "wechat_configs"."test_status"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."wechat_configs"."test_status" IS '测试状态: untested, success, failed';


--
-- Name: COLUMN "wechat_configs"."last_test_time"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."wechat_configs"."last_test_time" IS '最后测试时间';


--
-- Name: COLUMN "wechat_configs"."test_message"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."wechat_configs"."test_message" IS '测试结果消息';


--
-- Name: active_wechat_config; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."active_wechat_config" AS
 SELECT "id",
    "name",
    "type",
    "appid",
    "appsecret",
    "token",
    "aes_key",
    "is_active",
    "created_at",
    "updated_at",
    "test_status",
    "last_test_time",
    "test_message",
    "unsubscribe_notif_enabled",
    "qr_code_url",
    "access_token",
    "access_token_expires_at"
   FROM "public"."wechat_configs"
  WHERE ("is_active" = true)
 LIMIT 1;


--
-- Name: ad_event_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."ad_event_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ad_id" "uuid",
    "user_id" "uuid",
    "event_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: ad_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."ad_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ad_id" "uuid",
    "user_id" "uuid",
    "event_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "openid" "text"
);


--
-- Name: ad_unlock_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."ad_unlock_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "openid" "text",
    "item_id" "text" NOT NULL,
    "unlock_type" "text" DEFAULT 'daily_gallery'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"public"."item_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "unlocked_at" timestamp with time zone,
    "watch_status" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "log_type" "text",
    "success" boolean DEFAULT true,
    "browser_id" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ad_unlock_logs_watch_status_check" CHECK (("watch_status" = ANY (ARRAY['ad_clicked'::"text", 'watching'::"text", 'exited_incomplete'::"text", 'completed'::"text", 'completed_and_clicked'::"text", 'incomplete_and_clicked'::"text"])))
);


--
-- Name: COLUMN "ad_unlock_logs"."watch_status"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."ad_unlock_logs"."watch_status" IS '广告观看状态：ad_clicked=点击广告, watching=观看中, exited_incomplete=未完整观看已退出, completed=已完整观看, completed_and_clicked=已完整观看并点击了广告, incomplete_and_clicked=未完整观看并点击了广告';


--
-- Name: COLUMN "ad_unlock_logs"."details"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."ad_unlock_logs"."details" IS '详细交互日志数据，包括请求参数和响应结果';


--
-- Name: COLUMN "ad_unlock_logs"."log_type"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."ad_unlock_logs"."log_type" IS '日志类型：ad_callback, get_task_data';


--
-- Name: ad_unlock_logs_archive; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."ad_unlock_logs_archive" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "openid" "text",
    "item_id" "text" NOT NULL,
    "unlock_type" "text" DEFAULT 'daily_gallery'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"public"."item_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "unlocked_at" timestamp with time zone,
    "watch_status" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "log_type" "text",
    "success" boolean DEFAULT true,
    "browser_id" "text",
    CONSTRAINT "ad_unlock_logs_watch_status_check" CHECK (("watch_status" = ANY (ARRAY['ad_clicked'::"text", 'watching'::"text", 'exited_incomplete'::"text", 'completed'::"text", 'completed_and_clicked'::"text", 'incomplete_and_clicked'::"text"])))
);


--
-- Name: COLUMN "ad_unlock_logs_archive"."watch_status"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."ad_unlock_logs_archive"."watch_status" IS '广告观看状态：ad_clicked=点击广告, watching=观看中, exited_incomplete=未完整观看已退出, completed=已完整观看, completed_and_clicked=已完整观看并点击了广告, incomplete_and_clicked=未完整观看并点击了广告';


--
-- Name: COLUMN "ad_unlock_logs_archive"."details"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."ad_unlock_logs_archive"."details" IS '详细交互日志数据，包括请求参数和响应结果';


--
-- Name: COLUMN "ad_unlock_logs_archive"."log_type"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."ad_unlock_logs_archive"."log_type" IS '日志类型：ad_callback, get_task_data';


--
-- Name: admin_operation_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."admin_operation_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid",
    "action_type" "text" NOT NULL,
    "target_table" "text",
    "target_id" "text",
    "payload" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: ads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."ads" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "text" NOT NULL,
    "image_url" "text",
    "title" "text",
    "description" "text",
    "cta_url" "text",
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "display_duration" integer DEFAULT 5,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "frequency" "text" DEFAULT 'session'::"text",
    "allow_skip" boolean DEFAULT true,
    "cta_text" "text" DEFAULT '了解更多'::"text",
    "placements" "text"[] DEFAULT '{all}'::"text"[],
    "target_levels" "text"[] DEFAULT '{all}'::"text"[],
    "frequency_type" "text" DEFAULT 'always'::"text",
    "appearance_probability" integer DEFAULT 100,
    "feed_interval" integer DEFAULT 10,
    "show_once_per_page" boolean DEFAULT false,
    "badge_text" "text" DEFAULT '广告位'::"text",
    "theme_color" "text",
    "badge_position" "text" DEFAULT 'top-right'::"text",
    "image_rule" "text" DEFAULT '写-封'::"text"
);


--
-- Name: TABLE "ads"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."ads" IS '广告与推广位管理';


--
-- Name: COLUMN "ads"."appearance_probability"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."ads"."appearance_probability" IS 'Ad display probability (0-100)';


--
-- Name: COLUMN "ads"."feed_interval"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."ads"."feed_interval" IS 'In-feed ad frequency (one ad every X items)';


--
-- Name: COLUMN "ads"."show_once_per_page"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."ads"."show_once_per_page" IS 'Whether the ad should only show once per user page view';


--
-- Name: album_access_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."album_access_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "album_id" "uuid",
    "reason" "text" NOT NULL,
    "attachment_url" "text",
    "status" "text" DEFAULT 'pending'::"public"."item_status" NOT NULL,
    "rejected_reason" "text",
    "approved_level" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "album_access_requests_approved_level_check" CHECK (("approved_level" = ANY (ARRAY['pt'::"text", 'vip'::"text", 'svip'::"text", 'vvip'::"text", 'restricted'::"text"]))),
    CONSTRAINT "album_access_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


--
-- Name: album_custom_field_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."album_custom_field_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "field_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: album_custom_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."album_custom_fields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "options" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_searchable" boolean DEFAULT false,
    "is_filterable" boolean DEFAULT false,
    "is_visible_on_front" boolean DEFAULT true
);


--
-- Name: album_joins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."album_joins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "album_id" "uuid",
    "joined_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: album_photo_level_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."album_photo_level_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "photo_id" "uuid",
    "admin_id" "uuid",
    "old_level" "text",
    "new_level" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "operator_id" "uuid"
);


--
-- Name: album_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."album_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "album_id" "uuid",
    "url" "text" NOT NULL,
    "thumbnail_url" "text",
    "level" "text" DEFAULT 'pending'::"public"."item_status",
    "sort_order" integer DEFAULT 0,
    "custom_field_values" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "file_md5" "text",
    "content_hash" "text",
    "dedupe_error" "text",
    "dedupe_ignored" boolean DEFAULT false,
    "zonerama_photo_id" "text",
    "tags" "text"[],
    CONSTRAINT "album_photos_level_check" CHECK (("level" = ANY (ARRAY['pending'::"text", 'normal'::"text", 'vip'::"text", 'svip'::"text", 'restricted'::"text", 'vvip'::"text"])))
);


--
-- Name: COLUMN "album_photos"."file_md5"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."album_photos"."file_md5" IS '图片文件的 MD5 哈希值，用于图集内文件查重';


--
-- Name: COLUMN "album_photos"."content_hash"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."album_photos"."content_hash" IS '图片内容的视觉哈希值，用于图集内相似度查重';


--
-- Name: COLUMN "album_photos"."zonerama_photo_id"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."album_photos"."zonerama_photo_id" IS 'Zonerama 图片 ID，用于避免重复导入';


--
-- Name: COLUMN "album_photos"."tags"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."album_photos"."tags" IS '照片标签，用于过滤和分类，例如：🏷️不入微信草稿库';


--
-- Name: album_user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."album_user_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "album_id" "uuid",
    "level" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "album_user_permissions_level_check" CHECK (("level" = ANY (ARRAY['pt'::"text", 'vip'::"text", 'svip'::"text", 'vvip'::"text", 'restricted'::"text"])))
);


--
-- Name: album_viewing_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."album_viewing_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "album_id" "uuid" NOT NULL,
    "last_photo_index" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_mode" "text"
);


--
-- Name: analytics_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."analytics_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "visitor_id" "uuid",
    "website_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_category" "text",
    "event_label" "text",
    "event_value" "text",
    "page_path" "text" NOT NULL,
    "page_title" "text",
    "page_url" "text",
    "element_selector" "text",
    "element_text" "text",
    "x_position" integer,
    "y_position" integer,
    "viewport_width" integer,
    "viewport_height" integer,
    "scroll_depth" integer,
    "time_on_page" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "analytics_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['pageview'::"text", 'click'::"text", 'scroll'::"text", 'form_submit'::"text", 'resize'::"text", 'custom_event'::"text", 'goal_conversion'::"text", 'outbound_click'::"text", 'file_download'::"text"])))
);


--
-- Name: analytics_goal_conversions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."analytics_goal_conversions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "goal_id" "uuid",
    "session_id" "uuid",
    "visitor_id" "uuid",
    "website_id" "uuid" NOT NULL,
    "conversion_value" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: analytics_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."analytics_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "website_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "goal_key" "text" NOT NULL,
    "goal_type" "text" NOT NULL,
    "target_value" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "analytics_goals_goal_type_check" CHECK (("goal_type" = ANY (ARRAY['pageview'::"text", 'custom'::"text", 'click'::"text", 'time_on_page'::"text", 'scroll_depth'::"text"])))
);


--
-- Name: analytics_heatmap_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."analytics_heatmap_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "heatmap_id" "uuid",
    "website_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "x_position" integer NOT NULL,
    "y_position" integer,
    "scroll_depth" integer,
    "element_selector" "text",
    "element_text" "text",
    "click_count" integer DEFAULT 1,
    "unique_visitors" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "analytics_heatmap_data_event_type_check" CHECK (("event_type" = ANY (ARRAY['click'::"text", 'scroll'::"text", 'hover'::"text"])))
);


--
-- Name: analytics_heatmaps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."analytics_heatmaps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "website_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "page_path" "text" NOT NULL,
    "device_type" "text" NOT NULL,
    "sample_rate" integer DEFAULT 100,
    "is_enabled" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "analytics_heatmaps_device_type_check" CHECK (("device_type" = ANY (ARRAY['desktop'::"text", 'mobile'::"text", 'tablet'::"text"])))
);


--
-- Name: analytics_performance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."analytics_performance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "website_id" "uuid",
    "session_id" "uuid",
    "visitor_id" "uuid",
    "metric_name" "text" NOT NULL,
    "metric_value" double precision NOT NULL,
    "metric_id" "text",
    "page_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: analytics_realtime; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."analytics_realtime" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "website_id" "uuid" NOT NULL,
    "visitor_id" "uuid",
    "session_id" "uuid",
    "current_page" "text" NOT NULL,
    "page_title" "text",
    "referrer" "text",
    "entered_at" timestamp with time zone DEFAULT "now"(),
    "last_active_at" timestamp with time zone DEFAULT "now"(),
    "is_online" boolean DEFAULT true
);


--
-- Name: analytics_replays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."analytics_replays" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "visitor_id" "uuid",
    "website_id" "uuid" NOT NULL,
    "events" "jsonb" NOT NULL,
    "events_count" integer DEFAULT 0,
    "duration" integer DEFAULT 0,
    "size_bytes" integer,
    "is_completed" boolean DEFAULT false,
    "is_too_short" boolean DEFAULT false,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "is_compressed" boolean DEFAULT false,
    "compressed_events" "text"
);


--
-- Name: analytics_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."analytics_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_uuid" "uuid" NOT NULL,
    "visitor_id" "uuid",
    "website_id" "uuid" NOT NULL,
    "referrer_host" "text",
    "referrer_path" "text",
    "referrer_url" "text",
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "utm_term" "text",
    "utm_content" "text",
    "landing_page" "text",
    "exit_page" "text",
    "pageviews" integer DEFAULT 1,
    "duration" integer DEFAULT 0,
    "has_bounced" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "openid" "text"
);


--
-- Name: analytics_visitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."analytics_visitors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "visitor_uuid" "uuid" NOT NULL,
    "website_id" "uuid" NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "screen_resolution" "text",
    "device_type" "text",
    "browser_name" "text",
    "browser_version" "text",
    "os_name" "text",
    "os_version" "text",
    "continent_code" "text",
    "country_code" "text",
    "city_name" "text",
    "language" "text",
    "timezone" "text",
    "custom_parameters" "jsonb" DEFAULT '{}'::"jsonb",
    "first_visit" timestamp with time zone DEFAULT "now"(),
    "last_visit" timestamp with time zone DEFAULT "now"(),
    "total_sessions" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "openid" "text",
    CONSTRAINT "analytics_visitors_device_type_check" CHECK (("device_type" = ANY (ARRAY['desktop'::"text", 'mobile'::"text", 'tablet'::"text"])))
);


--
-- Name: analytics_websites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."analytics_websites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "website_uuid" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "domain" "text" NOT NULL,
    "pixel_key" "text" NOT NULL,
    "tracking_type" "text" DEFAULT 'normal'::"text",
    "is_enabled" boolean DEFAULT true,
    "bot_exclusion" boolean DEFAULT true,
    "ip_storage_enabled" boolean DEFAULT true,
    "sessions_replays_enabled" boolean DEFAULT false,
    "heatmaps_enabled" boolean DEFAULT false,
    "goals_enabled" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "analytics_websites_tracking_type_check" CHECK (("tracking_type" = ANY (ARRAY['normal'::"text", 'lightweight'::"text"])))
);


--
-- Name: annotations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."annotations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "media_id" "uuid" NOT NULL,
    "x" double precision NOT NULL,
    "y" double precision NOT NULL,
    "text" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: announcement_acknowledgments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."announcement_acknowledgments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "announcement_id" "uuid",
    "user_id" "uuid",
    "openid" "text",
    "acknowledged_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: app_api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."app_api_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "app_id" "text" NOT NULL,
    "key_name" "text" DEFAULT 'default'::"text" NOT NULL,
    "api_key" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(32), 'hex'::"text") NOT NULL,
    "secret_key" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(32), 'hex'::"text") NOT NULL,
    "permissions" "text"[] DEFAULT '{}'::"text"[],
    "rate_limit" integer DEFAULT 1000,
    "allowed_origins" "text"[] DEFAULT '{}'::"text"[],
    "expires_at" timestamp with time zone,
    "last_used_at" timestamp with time zone,
    "usage_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: app_api_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."app_api_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "api_key_id" "uuid",
    "app_id" "text",
    "endpoint" "text",
    "method" "text",
    "ip_address" "text",
    "user_agent" "text",
    "status_code" integer,
    "response_time_ms" integer,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: app_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."app_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "app_name" "text" NOT NULL,
    "app_id" "text" NOT NULL,
    "bundle_id" "text",
    "platform" "text"[] DEFAULT '{}'::"text"[],
    "description" "text",
    "icon_url" "text",
    "theme_config" "jsonb" DEFAULT '{}'::"jsonb",
    "feature_flags" "jsonb" DEFAULT '{}'::"jsonb",
    "api_config" "jsonb" DEFAULT '{}'::"jsonb",
    "storage_config" "jsonb" DEFAULT '{}'::"jsonb",
    "ui_config" "jsonb" DEFAULT '{}'::"jsonb",
    "cfr2_config" "jsonb" DEFAULT '{}'::"jsonb",
    "custom_config" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "is_public" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "apk_config" "jsonb" DEFAULT '{}'::"jsonb"
);


--
-- Name: app_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."app_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "app_id" "text" NOT NULL,
    "version" "text" NOT NULL,
    "version_code" integer DEFAULT 1 NOT NULL,
    "platform" "text" DEFAULT 'android'::"text" NOT NULL,
    "download_url" "text",
    "install_url" "text",
    "release_notes" "text",
    "is_force_update" boolean DEFAULT false,
    "min_api_version" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "app_versions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'deprecated'::"text"])))
);


--
-- Name: badge_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."badge_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text",
    "description" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: badge_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."badge_tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "badge_id" "uuid" NOT NULL,
    "task_type" "text" NOT NULL,
    "target_value" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "claim_type" "text" DEFAULT 'auto'::"text"
);


--
-- Name: COLUMN "badge_tasks"."claim_type"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."badge_tasks"."claim_type" IS '领取方式: auto-自动发放, manual-手动领取';


--
-- Name: badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "badge_type" "text" DEFAULT 'achievement'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "acquisition_method" "text",
    "category" "text",
    "expiry_days" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "validity_days" integer DEFAULT 0
);


--
-- Name: bookmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."bookmarks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "media_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: cache_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."cache_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cache_key" "text" NOT NULL,
    "ttl_seconds" integer DEFAULT 300 NOT NULL,
    "description" "text",
    "is_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: TABLE "cache_config"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."cache_config" IS '缓存配置表，存储各类缓存的TTL和启用状态';


--
-- Name: cache_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."cache_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cache_key" "text" NOT NULL,
    "hit_count" integer DEFAULT 0,
    "miss_count" integer DEFAULT 0,
    "last_hit_at" timestamp with time zone,
    "last_miss_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: TABLE "cache_stats"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."cache_stats" IS '缓存统计表，记录缓存命中率';


--
-- Name: check_ins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."check_ins" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "check_in_date" "date" DEFAULT CURRENT_DATE,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "points_earned" integer DEFAULT 10,
    "continuous_days" integer DEFAULT 0,
    "points" integer DEFAULT 0
);


--
-- Name: TABLE "check_ins"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."check_ins" IS '用户签到记录';


--
-- Name: collection_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."collection_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" NOT NULL,
    "media_ids" "uuid"[] NOT NULL,
    "creator_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "expires_at" timestamp with time zone
);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "media_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: content_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."content_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_visible" boolean DEFAULT true,
    "min_role" "text" DEFAULT 'pt'::"text"
);


--
-- Name: daily_gallery_access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."daily_gallery_access_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid",
    "user_openid" "text",
    "user_id" "uuid",
    "ip_address" "text",
    "user_agent" "text",
    "accessed_at" timestamp with time zone DEFAULT "now"(),
    "password_used" "text",
    "browser_fingerprint" "text",
    "publish_date" "text",
    "openid" "text",
    "access_type" "text" DEFAULT 'view'::"text"
);


--
-- Name: TABLE "daily_gallery_access_logs"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."daily_gallery_access_logs" IS '每日图集访问日志';


--
-- Name: daily_gallery_access_logs_archive; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."daily_gallery_access_logs_archive" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid",
    "user_openid" "text",
    "user_id" "uuid",
    "ip_address" "text",
    "user_agent" "text",
    "accessed_at" timestamp with time zone DEFAULT "now"(),
    "password_used" "text",
    "browser_fingerprint" "text",
    "publish_date" "text",
    "openid" "text",
    "access_type" "text" DEFAULT 'view'::"text"
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "username" "text" NOT NULL,
    "email" "text",
    "role" "public"."user_role" DEFAULT 'pt'::"public"."user_role",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "notes" "text",
    "is_banned" boolean DEFAULT false,
    "group_id" "uuid",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "avatar_url" "text",
    "cover_url" "text",
    "points" integer DEFAULT 0,
    "referrer_id" "uuid",
    "bio" "text",
    "is_verified" boolean DEFAULT false,
    "email_verified" boolean DEFAULT false,
    "phone_verified" boolean DEFAULT false,
    "exp" integer DEFAULT 0,
    "mobile" "text",
    "permissions" "jsonb" DEFAULT '[]'::"jsonb",
    "album_level" "public"."album_permission_level" DEFAULT 'pt'::"public"."album_permission_level",
    "mp_openid" "text",
    "is_blacklisted" boolean DEFAULT false,
    "wechat_openid" "text",
    "password_hash" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "digital_id" "text",
    "security_status" "text" DEFAULT 'normal'::"text",
    "total_views" integer DEFAULT 0,
    "rank" "text",
    "last_session_id" "text",
    "is_debug_enabled" boolean DEFAULT false,
    "auto_created" boolean DEFAULT false,
    "auto_created_source" "text",
    "last_sign_in_at" timestamp with time zone,
    "continuous_read_days" integer DEFAULT 0,
    "last_read_date" "date",
    "total_read_days" integer DEFAULT 0
);


--
-- Name: TABLE "profiles"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."profiles" IS '用户资料与核心账户表';


--
-- Name: COLUMN "profiles"."permissions"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."profiles"."permissions" IS 'User specific individual permissions, merged with group permissions';


--
-- Name: COLUMN "profiles"."mp_openid"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."profiles"."mp_openid" IS '用户绑定的微信小程序 OpenID';


--
-- Name: wechat_fans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wechat_fans" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "config_id" "uuid",
    "openid" "text" NOT NULL,
    "nickname" "text",
    "avatar_url" "text",
    "sex" integer,
    "city" "text",
    "province" "text",
    "country" "text",
    "subscribe_time" timestamp with time zone,
    "remark" "text",
    "groupid" integer,
    "tagid_list" "jsonb",
    "subscribe_scene" "text",
    "qr_scene" "text",
    "qr_scene_str" "text",
    "last_active_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: wechat_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wechat_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_id" "uuid" NOT NULL,
    "openid" "text" NOT NULL,
    "unionid" "text",
    "nickname" "text",
    "avatar_url" "text",
    "subscribe_status" boolean DEFAULT false,
    "subscribe_time" timestamp with time zone,
    "unsubscribe_time" timestamp with time zone,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "unsubscribe_count" integer DEFAULT 0,
    "last_unsubscribe_at" timestamp with time zone,
    "domain_identifier" "text" DEFAULT 'default'::"text"
);


--
-- Name: COLUMN "wechat_users"."unsubscribe_count"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."wechat_users"."unsubscribe_count" IS '取消关注次数，用于识别二次关注用户';


--
-- Name: COLUMN "wechat_users"."last_unsubscribe_at"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."wechat_users"."last_unsubscribe_at" IS '最后一次取消关注的时间';


--
-- Name: COLUMN "wechat_users"."domain_identifier"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."wechat_users"."domain_identifier" IS '用户注册或首次关注时的来源域名标识';


--
-- Name: daily_gallery_access_logs_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."daily_gallery_access_logs_view" AS
 SELECT "l"."id",
    "l"."post_id",
    "l"."user_openid",
    "l"."user_id",
    "l"."ip_address",
    "l"."user_agent",
    "l"."accessed_at",
    "l"."password_used",
    "l"."browser_fingerprint",
    COALESCE("p"."username", "p2"."username", "w"."nickname", "f"."nickname") AS "profile_username",
    COALESCE("p"."avatar_url", "p2"."avatar_url", "w"."avatar_url", "f"."avatar_url") AS "profile_avatar_url",
    "f"."nickname" AS "fan_nickname",
    "f"."avatar_url" AS "fan_avatar_url",
    (("p"."id" IS NOT NULL) OR ("p2"."id" IS NOT NULL)) AS "is_linked"
   FROM (((("public"."daily_gallery_access_logs" "l"
     LEFT JOIN "public"."profiles" "p" ON (("l"."user_id" = "p"."id")))
     LEFT JOIN "public"."profiles" "p2" ON ((("l"."user_openid" = "p2"."wechat_openid") OR ("l"."user_openid" = "p2"."mp_openid"))))
     LEFT JOIN "public"."wechat_users" "w" ON (("l"."user_openid" = "w"."openid")))
     LEFT JOIN ( SELECT DISTINCT ON ("wechat_fans"."openid") "wechat_fans"."openid",
            "wechat_fans"."nickname",
            "wechat_fans"."avatar_url"
           FROM "public"."wechat_fans"
          ORDER BY "wechat_fans"."openid", "wechat_fans"."created_at" DESC) "f" ON (("l"."user_openid" = "f"."openid")));


--
-- Name: daily_gallery_account_passwords; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."daily_gallery_account_passwords" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "wechat_account_id" "uuid" NOT NULL,
    "password" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: daily_gallery_password_lockouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."daily_gallery_password_lockouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ip_address" "text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_attempt_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "lockout_until" timestamp with time zone
);


--
-- Name: daily_gallery_password_user_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."daily_gallery_password_user_locks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "password_id" "uuid" NOT NULL,
    "user_identifier" "text" NOT NULL,
    "browser_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: daily_gallery_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."daily_gallery_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_date" "date" NOT NULL,
    "password" "text" NOT NULL,
    "password_expires_at" timestamp with time zone NOT NULL,
    "image_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "view_count" integer DEFAULT 0,
    "unique_visitor_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "published_at" timestamp with time zone,
    "is_published" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "today_view_count" integer DEFAULT 0,
    "last_view_date" "date" DEFAULT CURRENT_DATE
);


--
-- Name: TABLE "daily_gallery_posts"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."daily_gallery_posts" IS '每日图集发布记录';


--
-- Name: COLUMN "daily_gallery_posts"."today_view_count"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."daily_gallery_posts"."today_view_count" IS '当日浏览量';


--
-- Name: COLUMN "daily_gallery_posts"."last_view_date"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."daily_gallery_posts"."last_view_date" IS '最后浏览日期，用于重置今日浏览量';


--
-- Name: daily_gallery_posts_archive; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."daily_gallery_posts_archive" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_date" "date" NOT NULL,
    "password" "text" NOT NULL,
    "password_expires_at" timestamp with time zone NOT NULL,
    "image_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "view_count" integer DEFAULT 0,
    "unique_visitor_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "published_at" timestamp with time zone,
    "is_published" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: daily_gallery_rb_triggers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."daily_gallery_rb_triggers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "openid" "text",
    "trigger_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: daily_gallery_special_passwords; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."daily_gallery_special_passwords" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "password" "text" NOT NULL,
    "target_date" "date",
    "is_one_time" boolean DEFAULT true,
    "is_used" boolean DEFAULT false,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "used_at" timestamp with time zone,
    "created_by" "uuid",
    "source" "text" DEFAULT 'backend'::"text",
    "creator_id" "text",
    "password_type" "text" DEFAULT 'one_time'::"text",
    "browser_id" "text",
    "max_usages" integer DEFAULT 1,
    "used_count" integer DEFAULT 0,
    "reset_count" integer DEFAULT 0,
    "per_user_max_total" integer DEFAULT 0,
    "per_user_max_daily" integer DEFAULT 0
);


--
-- Name: COLUMN "daily_gallery_special_passwords"."password_type"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."daily_gallery_special_passwords"."password_type" IS 'Password types: one_time (default), periodic (regular), multiple (multi-use), permanent (long-term)';


--
-- Name: COLUMN "daily_gallery_special_passwords"."browser_id"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."daily_gallery_special_passwords"."browser_id" IS 'Locks the password to a specific browser/device';


--
-- Name: daily_gallery_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."daily_gallery_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "image_url" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "openid" "text",
    "nickname" "text"
);


--
-- Name: daily_gallery_user_passwords; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."daily_gallery_user_passwords" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "openid" "text" NOT NULL,
    "post_date" "date" NOT NULL,
    "password" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "locked_browser_id" "text",
    "source" "text" DEFAULT 'wechat'::"text"
);


--
-- Name: debug_log_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."debug_log_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_enabled" boolean DEFAULT false,
    "retention_minutes" integer DEFAULT 5,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: debug_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."debug_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "page_url" "text",
    "image_url" "text",
    "is_thumbnail" boolean,
    "is_original" boolean,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: dedupe_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."dedupe_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scan_type" "text" NOT NULL,
    "processed_count" integer DEFAULT 0,
    "duplicate_count" integer DEFAULT 0,
    "scan_config" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "duration_ms" integer,
    "status" "text" DEFAULT 'completed'::"text"
);


--
-- Name: digital_id_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."digital_id_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_length" integer DEFAULT 6 NOT NULL,
    "start_value" bigint DEFAULT 100000 NOT NULL,
    "next_value" bigint DEFAULT 100000 NOT NULL,
    "is_random_mode" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: digital_id_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."digital_id_patterns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pattern" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: dislikes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."dislikes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "media_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: domain_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."domain_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "domain_url" "text" NOT NULL,
    "identifier" "text" DEFAULT 'default'::"text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: easter_egg_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."easter_egg_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "reward_type" "text" NOT NULL,
    "reward_content" "jsonb" NOT NULL,
    "trigger_condition" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "icon_url" "text",
    "message" "text",
    "start_at" timestamp with time zone DEFAULT "now"(),
    "end_at" timestamp with time zone,
    "max_winners" integer DEFAULT 100,
    "current_winners" integer DEFAULT 0,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "page_paths" "text"[] DEFAULT '{}'::"text"[],
    "stay_duration" integer DEFAULT 0,
    "max_wins_per_user" integer DEFAULT 1,
    CONSTRAINT "easter_egg_configs_reward_type_check" CHECK (("reward_type" = ANY (ARRAY['points'::"text", 'physical'::"text", 'coupon'::"text"]))),
    CONSTRAINT "easter_egg_configs_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'ended'::"text"])))
);


--
-- Name: COLUMN "easter_egg_configs"."page_paths"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."easter_egg_configs"."page_paths" IS '允许出现的页面路径列表，为空表示全站';


--
-- Name: COLUMN "easter_egg_configs"."stay_duration"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."easter_egg_configs"."stay_duration" IS '停留触发时长（秒）';


--
-- Name: COLUMN "easter_egg_configs"."max_wins_per_user"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."easter_egg_configs"."max_wins_per_user" IS '每个用户最多可以中奖该彩蛋的次数';


--
-- Name: easter_egg_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."easter_egg_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "egg_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reward_type" "text" NOT NULL,
    "reward_content" "jsonb" NOT NULL,
    "claim_status" "text" DEFAULT 'claimed'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "easter_egg_records_claim_status_check" CHECK (("claim_status" = ANY (ARRAY['pending'::"text", 'claimed'::"text", 'shipped'::"text"])))
);


--
-- Name: easter_egg_trigger_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."easter_egg_trigger_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "egg_id" "uuid",
    "page" "text",
    "is_win" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: excluded_digital_ids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."excluded_digital_ids" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "digital_id" "text" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: explore_cache_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."explore_cache_stats" (
    "stat_time" "date" NOT NULL,
    "total_requests" integer DEFAULT 0,
    "hit_count" integer DEFAULT 0,
    "miss_count" integer DEFAULT 0,
    "hit_rate" double precision DEFAULT 0
);


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "media_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: TABLE "favorites"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."favorites" IS '用户收藏夹';


--
-- Name: global_keyword_replacements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."global_keyword_replacements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "original_word" "text" NOT NULL,
    "replacement_word" "text" NOT NULL,
    "type" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "global_keyword_replacements_type_check" CHECK (("type" = ANY (ARRAY['system'::"text", 'user'::"text"])))
);


--
-- Name: growth_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."growth_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "amount" integer NOT NULL,
    "reason" "text",
    "type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "target_id" "text"
);


--
-- Name: login_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."login_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket" "text" NOT NULL,
    "user_id" "uuid",
    "status" "text" DEFAULT 'pending'::"public"."item_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "fulfilled_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:10:00'::interval),
    CONSTRAINT "login_tickets_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'fulfilled'::"text", 'expired'::"text"])))
);


--
-- Name: media_cache_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."media_cache_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cache_key" "text" NOT NULL,
    "hit_count" bigint DEFAULT 0,
    "miss_count" bigint DEFAULT 0,
    "recorded_at" "date" DEFAULT CURRENT_DATE
);


--
-- Name: media_downloads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."media_downloads" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "media_id" "uuid",
    "album_id" "uuid",
    "type" "text" NOT NULL,
    "points_spent" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: media_staging; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."media_staging" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "url" "text" NOT NULL,
    "thumbnail_url" "text",
    "title" "text",
    "type" "text" DEFAULT 'image'::"text",
    "category_id" "uuid",
    "tag_names" "text"[],
    "status" "text" DEFAULT 'pending'::"public"."item_status",
    "import_source" "text",
    "owner_id" "uuid" DEFAULT "auth"."uid"(),
    "description" "text",
    "deleted_at" timestamp with time zone,
    CONSTRAINT "media_staging_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "media_staging_type_check" CHECK (("type" = ANY (ARRAY['image'::"text", 'video'::"text"])))
);


--
-- Name: media_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."media_tags" (
    "media_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


--
-- Name: media_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."media_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "media_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "visitor_fingerprint" "text"
);


--
-- Name: COLUMN "media_views"."visitor_fingerprint"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."media_views"."visitor_fingerprint" IS 'Browser fingerprint for guest tracking';


--
-- Name: miniprogram_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."miniprogram_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "app_id" "text" NOT NULL,
    "app_secret" "text" NOT NULL,
    "ad_unit_id" "text",
    "renwu" "text",
    "instructions" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "access_token" "text",
    "access_token_expires_at" timestamp with time zone,
    "mode" "text" DEFAULT 'task'::"text",
    "is_login_enabled" boolean DEFAULT false,
    "is_mp_login_enabled" boolean DEFAULT false,
    "is_mp_bind_enabled" boolean DEFAULT false,
    "env_identifier" "text" DEFAULT 'miaoda'::"text",
    "task_page_path" "text" DEFAULT 'pages/user/task'::"text",
    "login_page_path" "text" DEFAULT 'pages/user/wxlogin'::"text",
    "page_path" "text" DEFAULT 'pages/index/index'::"text",
    "server_url" "text",
    "token" "text",
    "encoding_aes_key" "text",
    "message_encryption_mode" "text" DEFAULT 'plain'::"text",
    "is_debug_enabled" boolean DEFAULT false,
    "is_msg_push_enabled" boolean DEFAULT false,
    CONSTRAINT "miniprogram_configs_mode_check" CHECK (("mode" = ANY (ARRAY['task'::"text", 'login'::"text"])))
);


--
-- Name: COLUMN "miniprogram_configs"."mode"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."miniprogram_configs"."mode" IS '小程序运行模式：task=任务模式, login=登录模式';


--
-- Name: COLUMN "miniprogram_configs"."is_login_enabled"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."miniprogram_configs"."is_login_enabled" IS '是否开启小程序登录/注册功能';


--
-- Name: miniprogram_login_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."miniprogram_login_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scene_code" "text" NOT NULL,
    "openid" "text",
    "user_id" "uuid",
    "status" "text" DEFAULT 'pending'::"public"."item_status" NOT NULL,
    "action" "text" DEFAULT 'login'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:10:00'::interval),
    CONSTRAINT "miniprogram_login_sessions_action_check" CHECK (("action" = ANY (ARRAY['login'::"text", 'bind'::"text", 'register'::"text"]))),
    CONSTRAINT "miniprogram_login_sessions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'success'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


--
-- Name: mp_login_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."mp_login_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "openid" "text",
    "user_id" "uuid",
    "ticket" "text",
    "scene" "text",
    "ip_address" "text",
    "logged_at" timestamp with time zone DEFAULT "now"(),
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "log_type" "text",
    "success" boolean DEFAULT true
);


--
-- Name: TABLE "mp_login_logs"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."mp_login_logs" IS '小程序实际登录/绑定操作流水（成功或失败）';


--
-- Name: COLUMN "mp_login_logs"."details"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."mp_login_logs"."details" IS '详细交互日志数据，包括请求参数和响应结果';


--
-- Name: COLUMN "mp_login_logs"."log_type"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."mp_login_logs"."log_type" IS '日志类型：mp_login, mp_bind, scancode';


--
-- Name: mp_qr_generation_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."mp_qr_generation_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "ticket" "text",
    "scene" "text",
    "page" "text",
    "log_type" "text" DEFAULT 'scancode'::"text",
    "success" boolean DEFAULT true,
    "details" "jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "openid" "text"
);


--
-- Name: TABLE "mp_qr_generation_logs"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."mp_qr_generation_logs" IS '小程序码生成记录流水（包含页面、参数等）';


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."notification_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "title_template" "text" NOT NULL,
    "content_template" "text" NOT NULL,
    "category" "text" DEFAULT 'system'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "type" "text" DEFAULT 'system'::"text",
    "link" "text",
    "link_type" "text" DEFAULT 'internal'::"text",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "role_id" "uuid",
    "read_at" timestamp with time zone,
    "channel" "text" DEFAULT 'all'::"text",
    "count" integer DEFAULT 1,
    "media_ids" "jsonb" DEFAULT '[]'::"jsonb",
    "merge_key" "text"
);


--
-- Name: TABLE "notifications"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."notifications" IS '消息通知系统';


--
-- Name: COLUMN "notifications"."count"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."notifications"."count" IS '合并的通知数量';


--
-- Name: COLUMN "notifications"."media_ids"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."notifications"."media_ids" IS '相关作品ID列表（JSON数组）';


--
-- Name: COLUMN "notifications"."merge_key"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."notifications"."merge_key" IS '合并键，用于识别可合并的通知类型（如：audit_approved, audit_rejected）';


--
-- Name: oauth_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."oauth_clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "text" NOT NULL,
    "client_secret" "text" NOT NULL,
    "name" "text",
    "description" "text",
    "scopes" "text"[] DEFAULT '{admin:read,admin:write}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true
);


--
-- Name: parse_import_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."parse_import_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "serial_number" integer DEFAULT 1 NOT NULL,
    "name" "text",
    "api_url" "text" NOT NULL,
    "match_pattern" "text",
    "field_mapping" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'enabled'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cleaning_rules" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "parse_import_configs_status_check" CHECK (("status" = ANY (ARRAY['enabled'::"text", 'disabled'::"text"])))
);


--
-- Name: permission_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."permission_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "permissions" "jsonb" DEFAULT '[]'::"jsonb",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "requires_audit" boolean DEFAULT true
);


--
-- Name: COLUMN "permission_groups"."requires_audit"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."permission_groups"."requires_audit" IS '该权限组用户发布内容是否需要审核';


--
-- Name: photo_albums; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."photo_albums" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "album_type" "text",
    "photo_count" integer DEFAULT 0,
    "download_url" "text",
    "min_permission_group_id" "uuid",
    "description" "text",
    "cover_url" "text",
    "custom_field_values" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "auto_pdf_enabled" boolean DEFAULT false,
    "level" "text" DEFAULT 'pt'::"text" NOT NULL,
    "is_zonerama" boolean DEFAULT false,
    "pdf_history" "jsonb" DEFAULT '{}'::"jsonb",
    "is_public" boolean DEFAULT true,
    "permission_group_id" "uuid",
    "allowed_group_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "apply_switch" boolean DEFAULT false
);


--
-- Name: photo_anti_screenshot_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."photo_anti_screenshot_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "photo_id" "uuid",
    "action_type" "text" NOT NULL,
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: points_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."points_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "amount" integer NOT NULL,
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "type" "text",
    "target_id" "text"
);


--
-- Name: TABLE "points_logs"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."points_logs" IS '用户积分变动日志';


--
-- Name: promotion_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."promotion_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_published" boolean DEFAULT false,
    "short_link" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: proxy_cache_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."proxy_cache_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "original_url" "text",
    "size" bigint,
    "upload_time" timestamp with time zone DEFAULT "now"(),
    "hit_count" bigint DEFAULT 0,
    "miss_count" bigint DEFAULT 0,
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: proxy_exclude_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."proxy_exclude_domains" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "domain" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


--
-- Name: public_miniprogram_configs; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."public_miniprogram_configs" AS
 SELECT "id",
    "task_page_path",
    "login_page_path",
    "is_mp_login_enabled",
    "is_mp_bind_enabled",
    "is_debug_enabled"
   FROM "public"."miniprogram_configs";


--
-- Name: random_beauty_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."random_beauty_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "openid_required" boolean DEFAULT false,
    "encrypt_openid" boolean DEFAULT true,
    "group_limits" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "allow_guest_access" boolean DEFAULT true,
    "after_quota_redirect_url" "text" DEFAULT '/'::"text",
    "after_quota_button_text" "text" DEFAULT '返回首页'::"text",
    "quota_full_message" "text" DEFAULT '今日随机图片已推送完成，请明天再来欣赏，或提升会员等级获取更多配额。'::"text",
    "default_limit" integer DEFAULT 5
);


--
-- Name: random_beauty_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."random_beauty_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "openid" "text" NOT NULL,
    "visit_date" "date" DEFAULT CURRENT_DATE,
    "count" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: rank_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."rank_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "min_exp" integer DEFAULT 0,
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: recommendation_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."recommendation_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "weights" "jsonb" DEFAULT '{"view_weight": 1.0, "favorite_weight": 5.0, "time_decay_factor": 0.5, "manual_boost_weight": 10.0}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: redemption_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."redemption_codes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" "text" NOT NULL,
    "type" "text" NOT NULL,
    "value" "text",
    "expires_at" timestamp with time zone,
    "max_uses" integer DEFAULT 1,
    "used_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "email" "text",
    "is_active" boolean DEFAULT true
);


--
-- Name: TABLE "redemption_codes"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."redemption_codes" IS '兑换码与邀请码库';


--
-- Name: redemption_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."redemption_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code_id" "uuid",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "media_id" "uuid" NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"public"."item_status" NOT NULL,
    "result" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "punishment" "text",
    "report_type" "text"
);


--
-- Name: scheduled_task_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."scheduled_task_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_name" "text" NOT NULL,
    "status" "text" NOT NULL,
    "message" "text",
    "execution_time" timestamp with time zone DEFAULT "now"(),
    "duration_ms" integer,
    CONSTRAINT "scheduled_task_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'failed'::"text"])))
);


--
-- Name: signin_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."signin_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "day_number" integer NOT NULL,
    "min_points" integer DEFAULT 1,
    "max_points" integer DEFAULT 10,
    "exp_reward" integer DEFAULT 5,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_bonus" boolean DEFAULT false,
    "bonus_note" "text"
);


--
-- Name: site_shortcodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."site_shortcodes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'custom'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: special_digital_ids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."special_digital_ids" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "digital_id" "text" NOT NULL,
    "price" integer DEFAULT 0,
    "is_sold" boolean DEFAULT false,
    "owner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "required_rank" "text" DEFAULT '初出茅庐'::"text",
    "category" "text" DEFAULT '普通'::"text"
);


--
-- Name: special_password_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."special_password_usage" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "password_id" "uuid" NOT NULL,
    "openid" "text" NOT NULL,
    "usage_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: sql_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."sql_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "query_text" "text" NOT NULL,
    "status" "text" NOT NULL,
    "affected_rows" integer,
    "error_message" "text",
    "execution_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: star_hunt_activity_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."star_hunt_activity_configs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "page_paths" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "total_stars" integer DEFAULT 1 NOT NULL,
    "target_count" integer DEFAULT 10 NOT NULL,
    "reward_type" "text" DEFAULT 'points'::"text" NOT NULL,
    "reward_content" "jsonb" DEFAULT '{}'::"jsonb",
    "start_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_at" timestamp with time zone,
    "star_icon_url" "text",
    "bottle_icon_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "probability" double precision DEFAULT 1.0,
    "show_partially" boolean DEFAULT false,
    "per_user_max_total" integer DEFAULT 1,
    "per_user_max_daily" integer DEFAULT 1
);


--
-- Name: star_hunt_collection_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."star_hunt_collection_records" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "activity_id" "uuid" NOT NULL,
    "collected_count" integer DEFAULT 0 NOT NULL,
    "collection_history" "jsonb" DEFAULT '[]'::"jsonb",
    "is_completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone,
    "is_rewarded" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: star_hunt_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."star_hunt_completions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "activity_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"(),
    "completion_date" "date" DEFAULT CURRENT_DATE NOT NULL
);


--
-- Name: storage_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."storage_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text",
    "key_id" "text",
    "secret_key" "text",
    "endpoint" "text",
    "custom_domain" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "bucket_name" "text",
    "enable_link_import" boolean DEFAULT true,
    "site_title" "text" DEFAULT '视觉赏析'::"text",
    "site_logo" "text",
    "site_description" "text" DEFAULT '全站最美的视觉内容聚合平台'::"text",
    "wechat_only" boolean DEFAULT false,
    "wechat_forbidden" boolean DEFAULT false,
    "check_in_points" integer DEFAULT 10,
    "check_in_description" "text" DEFAULT '每日签到奖励'::"text",
    "virtual_view_base_min" integer DEFAULT 0,
    "virtual_view_base_max" integer DEFAULT 0,
    "watermark_enabled" boolean DEFAULT false,
    "watermark_text" "text" DEFAULT ''::"text",
    "watermark_position" "text" DEFAULT 'bottom-right'::"text",
    "watermark_opacity" double precision DEFAULT 0.5,
    "watermark_layout" "text" DEFAULT 'single'::"text",
    "watermark_size" integer DEFAULT 16,
    "register_mode" "text" DEFAULT 'public'::"text",
    "force_login" boolean DEFAULT false,
    "anonymous_view_limit" integer DEFAULT 10,
    "user_agreement" "text" DEFAULT ''::"text",
    "privacy_policy" "text" DEFAULT ''::"text",
    "invitation_mode_enabled" boolean DEFAULT false,
    "player_type" "text" DEFAULT 'h5'::"text",
    "player_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "bottom_nav_config" "jsonb" DEFAULT '{"items": [{"id": "home", "icon": "Home", "path": "/", "label": "首页"}, {"id": "tags", "icon": "Tag", "path": "/tags", "label": "标签"}, {"id": "upload", "icon": "PlusCircle", "path": "/upload", "label": "发布"}, {"id": "fast", "icon": "Zap", "path": "/fast", "label": "整理"}, {"id": "my", "icon": "User", "path": "/my", "label": "我的"}], "style": "standard", "active_color": "#3b82f6", "inactive_color": "#94a3b8"}'::"jsonb",
    "smtp_host" "text",
    "smtp_port" integer,
    "smtp_user" "text",
    "smtp_pass" "text",
    "smtp_from" "text",
    "smtp_enabled" boolean DEFAULT false,
    "image_path_prefix" "text" DEFAULT 'image'::"text",
    "video_path_prefix" "text" DEFAULT 'video'::"text",
    "wechat_login_enabled" boolean DEFAULT true,
    "wechat_binding_enabled" boolean DEFAULT true,
    "login_methods" "text"[] DEFAULT ARRAY['password'::"text"],
    "registration_mode" "text" DEFAULT 'normal'::"text",
    "wechat_forbidden_mode" "text" DEFAULT 'template'::"text",
    "wechat_forbidden_html" "text",
    "enable_blob" boolean DEFAULT true,
    "enable_image_cache" boolean DEFAULT false,
    "enable_thumbnails" boolean DEFAULT false,
    "enable_upload_categories" boolean DEFAULT true,
    "enable_upload_tags" boolean DEFAULT true,
    "default_upload_category" "text",
    "default_upload_tags" "text",
    "file_naming_rule" "text",
    "file_naming_rule_sample" "text",
    "upload_category_single" boolean DEFAULT true,
    "thumbnail_quality" integer DEFAULT 80,
    "is_mp_login_enabled" boolean DEFAULT false,
    "is_mp_bind_enabled" boolean DEFAULT false,
    "admin_bottom_nav_config" "jsonb",
    "homepage_path" "text" DEFAULT '/'::"text",
    "standalone_paths" "text"[] DEFAULT ARRAY[]::"text"[],
    "enable_progressive_loading" boolean DEFAULT true,
    "enable_download" boolean DEFAULT false,
    "download_mode" "text" DEFAULT 'both'::"text",
    "wallpaper_price" integer DEFAULT 1,
    "album_price" integer DEFAULT 10,
    "min_download_role" "text" DEFAULT 'user'::"text",
    "thumbnail_params" "text" DEFAULT '?w=300'::"text",
    "thumbnail_width" integer,
    "thumbnail_height" integer,
    "mp_domain_identifier" "text" DEFAULT 'miaoda'::"text",
    "bg_music_url" "text",
    "bg_music_volume" double precision DEFAULT 0.5,
    "bg_music_title" "text" DEFAULT '轻音乐模式'::"text",
    "bg_music_list" "jsonb" DEFAULT '[]'::"jsonb",
    "thumbnail_size" integer DEFAULT 1048576,
    "image_proxy_url" "text",
    "image_proxy_secret" "text",
    "image_proxy_exclude_domains" "text",
    "enable_image_proxy" boolean DEFAULT false,
    "image_processing_url" "text",
    "image_processing_rules" "jsonb" DEFAULT '{}'::"jsonb",
    "enable_proxy_image_processing" boolean DEFAULT false,
    "saved_imgproxy_urls" "text"[] DEFAULT '{}'::"text"[],
    "saved_processing_rules" "jsonb" DEFAULT '[]'::"jsonb",
    "preview_test_images" "jsonb" DEFAULT '[]'::"jsonb",
    "enable_image_processing" boolean DEFAULT false,
    "enable_video_proxy" boolean DEFAULT false,
    "video_proxy_url" "text",
    "video_proxy_secret" "text",
    "video_proxy_rules" "jsonb" DEFAULT '[]'::"jsonb",
    "storage_priority" "text" DEFAULT 'r2_first'::"text",
    "is_maintenance_mode" boolean DEFAULT false,
    "maintenance_allowed_paths" "text"[] DEFAULT '{}'::"text"[],
    "maintenance_message" "text",
    "r2_mode" "text" DEFAULT 'direct'::"text",
    "r2_worker_url" "text",
    "r2_worker_token" "text",
    "hotlink_enabled" boolean DEFAULT false,
    "hotlink_allowed_domains" "text",
    "enabled_layouts" "text"[]
);


--
-- Name: TABLE "storage_configs"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."storage_configs" IS 'Storage configurations updated';


--
-- Name: COLUMN "storage_configs"."thumbnail_width"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."storage_configs"."thumbnail_width" IS '全局缩略图宽度设置';


--
-- Name: COLUMN "storage_configs"."thumbnail_height"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."storage_configs"."thumbnail_height" IS '全局缩略图高度设置';


--
-- Name: superbed_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."superbed_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "superbed_id" "text",
    "superbed_token" "text",
    "is_enabled" boolean DEFAULT false,
    "is_upload_page_enabled" boolean DEFAULT false,
    "allowed_groups" "text"[] DEFAULT '{}'::"text"[],
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "thumbnail_params" "text" DEFAULT '?w=300'::"text"
);


--
-- Name: system_builds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."system_builds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "download_url" "text",
    "logs" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "finished_at" timestamp with time zone,
    "created_by" "uuid",
    "env_config" "text"
);


--
-- Name: system_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."system_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "updated_by" "uuid"
);


--
-- Name: system_guide_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."system_guide_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: system_guide_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."system_guide_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "content" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: system_guides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."system_guides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_public" boolean DEFAULT true,
    "view_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "category_id" "uuid",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb"
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "parent_id" "uuid",
    "level" integer DEFAULT 0,
    "weight" integer DEFAULT 0,
    "is_visible" boolean DEFAULT true,
    "min_role" "text" DEFAULT 'pt'::"text"
);


--
-- Name: user_active_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_active_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_id" "text" NOT NULL,
    "device_info" "jsonb",
    "ip_address" "text",
    "is_active" boolean DEFAULT true,
    "last_ping_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: user_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "badge_id" "uuid" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone
);


--
-- Name: user_daily_read_history; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."user_daily_read_history" AS
 SELECT DISTINCT ON (COALESCE("openid", ("user_id")::"text", "browser_fingerprint"), "publish_date") COALESCE("openid", ("user_id")::"text", "browser_fingerprint") AS "user_identifier",
    "publish_date",
    "accessed_at"
   FROM "public"."daily_gallery_access_logs"
  WHERE ("access_type" = 'view'::"text")
  ORDER BY COALESCE("openid", ("user_id")::"text", "browser_fingerprint"), "publish_date", "accessed_at" DESC;


--
-- Name: user_feedbacks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_feedbacks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "logs" "jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "page_url" "text",
    "metadata" "jsonb",
    "session_id" "text",
    "recording_id" "uuid"
);


--
-- Name: user_field_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_field_configs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "field_key" "text" NOT NULL,
    "field_name" "text" NOT NULL,
    "field_type" "text" DEFAULT 'text'::"text",
    "placeholder" "text",
    "field_options" "jsonb",
    "is_active" boolean DEFAULT true,
    "is_required" boolean DEFAULT false,
    "is_searchable" boolean DEFAULT false,
    "show_in_profile" boolean DEFAULT true,
    "show_in_center" boolean DEFAULT true,
    "show_in_register" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: TABLE "user_field_configs"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."user_field_configs" IS '用户自定义字段配置';


--
-- Name: user_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "media_id" "uuid",
    "interaction_type" "text" NOT NULL,
    "weight" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_interactions_interaction_type_check" CHECK (("interaction_type" = ANY (ARRAY['view'::"text", 'favorite'::"text", 'click'::"text", 'share'::"text"])))
);


--
-- Name: user_pending_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_pending_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "media_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: user_permissions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."user_permissions" AS
 SELECT "p"."id" AS "user_id",
    COALESCE("g"."name", '自定义'::"text") AS "group_name",
    COALESCE("p"."permissions", "g"."permissions", '[]'::"jsonb") AS "permissions"
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."permission_groups" "g" ON (("p"."group_id" = "g"."id")));


--
-- Name: user_referral_network; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."user_referral_network" AS
 SELECT "p"."id" AS "user_id",
    "p"."username",
    "p"."avatar_url",
    "p"."referrer_id",
    "r"."username" AS "referrer_username",
    "pg"."name" AS "group_name"
   FROM (("public"."profiles" "p"
     LEFT JOIN "public"."profiles" "r" ON (("p"."referrer_id" = "r"."id")))
     LEFT JOIN "public"."permission_groups" "pg" ON (("p"."group_id" = "pg"."id")));


--
-- Name: user_session_recordings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_session_recordings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_id" "text" NOT NULL,
    "events" "jsonb" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: user_visit_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_visit_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "ip_address" "text",
    "browser" "text",
    "os" "text",
    "network_type" "text",
    "path" "text",
    "duration" integer DEFAULT 0,
    "adblock_enabled" boolean DEFAULT false,
    "device_type" "text",
    "country" "text",
    "region" "text",
    "city" "text",
    "referrer" "text",
    "resolution" "text",
    "language" "text",
    "page_title" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "visit_date" "date" DEFAULT ((CURRENT_DATE AT TIME ZONE 'UTC'::"text"))::"date"
);


--
-- Name: video_proxy_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."video_proxy_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "node_name" "text" NOT NULL,
    "node_url" "text" NOT NULL,
    "priority" integer DEFAULT 0,
    "cost_per_gb" numeric DEFAULT 0,
    "is_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: video_proxy_configs_old; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."video_proxy_configs_old" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "routing_strategy" "text" DEFAULT 'latency'::"text",
    "routing_weights" "jsonb" DEFAULT '{}'::"jsonb",
    "billing_rules" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: video_proxy_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."video_proxy_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_url" "text" NOT NULL,
    "proxy_url" "text" NOT NULL,
    "status" "text" NOT NULL,
    "response_time" integer,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "bytes_transferred" bigint DEFAULT 0,
    "estimated_cost" numeric(10,4) DEFAULT 0,
    "proxy_node_id" "text"
);


--
-- Name: video_proxy_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."video_proxy_nodes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "node_name" "text" NOT NULL,
    "node_url" "text" NOT NULL,
    "priority" integer DEFAULT 0,
    "cost_per_gb" numeric DEFAULT 0,
    "is_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: web_vitals_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."web_vitals_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "value" double precision NOT NULL,
    "rating" "text",
    "user_agent" "text",
    "path" "text",
    "session_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: wechat_access_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wechat_access_tokens" (
    "config_id" "uuid" NOT NULL,
    "access_token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: wechat_account_password_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wechat_account_password_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "password_pattern" "text" DEFAULT '6_digit_number'::"text",
    "push_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: wechat_binding_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wechat_binding_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "config_id" "uuid",
    "user_id" "uuid",
    "openid" "text",
    "code" "text" NOT NULL,
    "type" "text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:10:00'::interval),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "domain_identifier" "text" DEFAULT 'default'::"text",
    "site_url" "text"
);


--
-- Name: wechat_draft_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wechat_draft_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "title" "text" NOT NULL,
    "author" "text",
    "digest" "text",
    "content" "text" NOT NULL,
    "content_source_url" "text",
    "thumb_media_id" "text",
    "need_open_comment" boolean DEFAULT false,
    "only_fans_can_comment" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "category" "text" DEFAULT 'other'::"text" NOT NULL,
    "thumb_url" "text",
    "tracking_id" "text",
    CONSTRAINT "wechat_draft_templates_category_check" CHECK (("category" = ANY (ARRAY['header'::"text", 'body'::"text", 'footer'::"text", 'other'::"text"])))
);


--
-- Name: COLUMN "wechat_draft_templates"."category"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."wechat_draft_templates"."category" IS '模板类别：header-头部, body-正文, footer-尾部, other-其他';


--
-- Name: wechat_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wechat_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_id" "uuid",
    "media_id" "text",
    "title" "text",
    "author" "text",
    "digest" "text",
    "content" "text",
    "thumb_url" "text",
    "url" "text",
    "create_time" timestamp with time zone,
    "update_time" timestamp with time zone,
    "template_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_adopted" boolean DEFAULT false,
    "adopted_at" timestamp with time zone,
    "content_source_url" "text",
    "image_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "is_published" boolean DEFAULT false,
    "published_at" timestamp with time zone,
    "tracking_id" "text",
    "thumb_media_id" "text",
    "sync_status" "text" DEFAULT 'normal'::"text"
);


--
-- Name: COLUMN "wechat_drafts"."media_id"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."wechat_drafts"."media_id" IS '微信草稿media_id，同步失败时允许为空以作为本地暂存';


--
-- Name: COLUMN "wechat_drafts"."is_adopted"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."wechat_drafts"."is_adopted" IS '草稿是否已被采用';


--
-- Name: COLUMN "wechat_drafts"."adopted_at"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."wechat_drafts"."adopted_at" IS '草稿采用时间';


--
-- Name: COLUMN "wechat_drafts"."content_source_url"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."wechat_drafts"."content_source_url" IS '原文链接';


--
-- Name: COLUMN "wechat_drafts"."image_ids"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."wechat_drafts"."image_ids" IS '草稿中使用的媒体库图片ID集合';


--
-- Name: COLUMN "wechat_drafts"."sync_status"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."wechat_drafts"."sync_status" IS '同步状态：normal-正常，missing-微信端已不存在';


--
-- Name: wechat_fans_with_users; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."wechat_fans_with_users" AS
 SELECT COALESCE("f"."id", "u"."id") AS "id",
    COALESCE("f"."config_id", "u"."config_id") AS "config_id",
    COALESCE("f"."openid", "u"."openid") AS "openid",
    COALESCE("f"."nickname", "u"."nickname") AS "nickname",
    COALESCE("f"."avatar_url", "u"."avatar_url") AS "avatar_url",
    "f"."sex",
    "f"."city",
    "f"."province",
    "f"."country",
    COALESCE("f"."subscribe_time", "u"."subscribe_time") AS "subscribe_time",
    "f"."remark",
    "f"."groupid",
    "f"."tagid_list",
    "f"."subscribe_scene",
    "f"."qr_scene",
    "f"."qr_scene_str",
    "f"."last_active_at",
    COALESCE("f"."created_at", "u"."created_at") AS "created_at",
    COALESCE("f"."updated_at", "u"."updated_at") AS "updated_at",
    COALESCE("u"."user_id", "p"."id") AS "user_id",
    "u"."subscribe_status",
    "u"."unsubscribe_count",
    "p"."username" AS "platform_username",
    "p"."avatar_url" AS "profile_avatar_url"
   FROM (("public"."wechat_users" "u"
     FULL JOIN "public"."wechat_fans" "f" ON ((("u"."openid" = "f"."openid") AND ("u"."config_id" = "f"."config_id"))))
     LEFT JOIN "public"."profiles" "p" ON ((("u"."user_id" = "p"."id") OR (COALESCE("f"."openid", "u"."openid") = "p"."wechat_openid") OR (COALESCE("f"."openid", "u"."openid") = "p"."mp_openid"))));


--
-- Name: wechat_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wechat_materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_id" "uuid",
    "media_id" "text" NOT NULL,
    "media_type" "text" NOT NULL,
    "url" "text",
    "local_media_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: wechat_menus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wechat_menus" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_id" "uuid" NOT NULL,
    "menu_data" "jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: wechat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wechat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_id" "uuid",
    "msg_id" "text",
    "from_user" "text",
    "to_user" "text",
    "msg_type" "text" NOT NULL,
    "content" "text",
    "pic_url" "text",
    "media_id" "text",
    "event" "text",
    "event_key" "text",
    "reply_content" "text",
    "reply_type" "text",
    "replied_at" timestamp with time zone,
    "raw_xml" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: wechat_messages_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."wechat_messages_view" AS
 SELECT "m"."id",
    "m"."config_id",
    "m"."msg_id",
    "m"."from_user",
    "m"."to_user",
    "m"."msg_type",
    "m"."content",
    "m"."pic_url",
    "m"."media_id",
    "m"."event",
    "m"."event_key",
    "m"."reply_content",
    "m"."reply_type",
    "m"."replied_at",
    "m"."raw_xml",
    "m"."created_at",
    "c"."name" AS "config_name",
    "f"."platform_username",
    "f"."nickname" AS "fan_nickname",
    COALESCE("f"."platform_username", "f"."nickname", "m"."from_user") AS "display_nickname"
   FROM (("public"."wechat_messages" "m"
     LEFT JOIN "public"."wechat_configs" "c" ON (("m"."config_id" = "c"."id")))
     LEFT JOIN "public"."wechat_fans_with_users" "f" ON ((("m"."from_user" = "f"."openid") AND ("m"."config_id" = "f"."config_id"))));


--
-- Name: wechat_notification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wechat_notification_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_id" "uuid",
    "task_id" "uuid",
    "openid" "text" NOT NULL,
    "template_id" "uuid",
    "status" "text",
    "error_code" "text",
    "error_message" "text",
    "response_data" "jsonb",
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "msg_id" "text"
);


--
-- Name: wechat_notification_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wechat_notification_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_id" "uuid",
    "openid" "text" NOT NULL,
    "template_id" "text" NOT NULL,
    "status" "text" NOT NULL,
    "popup_scene" integer,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: wechat_notification_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wechat_notification_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_id" "uuid",
    "template_id" "uuid",
    "title" "text" NOT NULL,
    "target_type" "text" DEFAULT 'all'::"text",
    "target_ids" "jsonb",
    "data" "jsonb" NOT NULL,
    "page" "text",
    "miniprogram_state" "text" DEFAULT 'formal'::"text",
    "scheduled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'pending'::"public"."item_status",
    "retry_count" integer DEFAULT 0,
    "max_retries" integer DEFAULT 3,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "error_message" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: wechat_notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wechat_notification_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_id" "uuid",
    "pri_tmpl_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "example" "text",
    "type" integer,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: wechat_replies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wechat_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_id" "uuid",
    "type" "text" NOT NULL,
    "keyword" "text",
    "match_type" "text" DEFAULT 'exact'::"text",
    "content_type" "text" DEFAULT 'text'::"text",
    "reply_content" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "category" "text",
    "platform" "text" DEFAULT 'wechat'::"text"
);


--
-- Name: COLUMN "wechat_replies"."category"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."wechat_replies"."category" IS 'Reply category: login, daily_gallery, binding, help, check_in';


--
-- Name: wecom_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wecom_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "corp_id" "text" NOT NULL,
    "agent_id" integer NOT NULL,
    "secret" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cb_token" "text",
    "cb_aes_key" "text"
);


--
-- Name: zonerama_album_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."zonerama_album_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "album_id" "text" NOT NULL,
    "album_name" "text",
    "description" "text",
    "is_active" boolean DEFAULT true,
    "last_fetched_at" timestamp with time zone,
    "photo_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: TABLE "zonerama_album_configs"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."zonerama_album_configs" IS 'Zonerama 相册配置表，用于保存和管理相册 ID';


--
-- Name: COLUMN "zonerama_album_configs"."album_id"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."zonerama_album_configs"."album_id" IS 'Zonerama 相册 ID';


--
-- Name: COLUMN "zonerama_album_configs"."album_name"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."zonerama_album_configs"."album_name" IS '相册名称';


--
-- Name: COLUMN "zonerama_album_configs"."description"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."zonerama_album_configs"."description" IS '相册描述';


--
-- Name: COLUMN "zonerama_album_configs"."is_active"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."zonerama_album_configs"."is_active" IS '是否启用';


--
-- Name: COLUMN "zonerama_album_configs"."last_fetched_at"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."zonerama_album_configs"."last_fetched_at" IS '最后获取时间';


--
-- Name: COLUMN "zonerama_album_configs"."photo_count"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."zonerama_album_configs"."photo_count" IS '图片数量';


--
-- Name: zonerama_library; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."zonerama_library" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "album_id" "text" NOT NULL,
    "photo_id" "text" NOT NULL,
    "url" "text" NOT NULL,
    "title" "text",
    "status" "text" DEFAULT 'pending'::"public"."item_status" NOT NULL,
    "transferred_to" "text",
    "transferred_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "level" "text" DEFAULT 'pending'::"public"."item_status",
    CONSTRAINT "zonerama_library_level_check" CHECK (("level" = ANY (ARRAY['pending'::"text", 'normal'::"text", 'vip'::"text", 'svip'::"text", 'restricted'::"text"]))),
    CONSTRAINT "zonerama_library_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'transferred_to_wallpaper'::"text", 'transferred_to_album'::"text", 'recycled'::"text", 'blacklisted'::"text"])))
);


--
-- Name: TABLE "zonerama_library"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."zonerama_library" IS 'Zonerama 图片库，用于存储从 Zonerama 获取的图片数据';


--
-- Name: COLUMN "zonerama_library"."album_id"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."zonerama_library"."album_id" IS 'Zonerama 相册 ID';


--
-- Name: COLUMN "zonerama_library"."photo_id"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."zonerama_library"."photo_id" IS 'Zonerama 图片 ID';


--
-- Name: COLUMN "zonerama_library"."url"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."zonerama_library"."url" IS '图片 URL（已应用代理）';


--
-- Name: COLUMN "zonerama_library"."status"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."zonerama_library"."status" IS '图片状态（pending=待处理, transferred_to_wallpaper=已转壁纸, transferred_to_album=已转图集, recycled=回收站, blacklisted=黑名单）';


--
-- Name: COLUMN "zonerama_library"."transferred_to"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."zonerama_library"."transferred_to" IS '转移目标：wallpaper-壁纸库, album-写真库';


--
-- Name: COLUMN "zonerama_library"."level"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."zonerama_library"."level" IS '图片等级（pending=待定, normal=普通, vip=VIP, svip=SVIP, restricted=受限）';


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
)
PARTITION BY RANGE ("inserted_at");


--
-- Name: messages_2026_06_07; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2026_06_07" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: messages_2026_06_08; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2026_06_08" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: messages_2026_06_09; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2026_06_09" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: messages_2026_06_10; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2026_06_10" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: messages_2026_06_11; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2026_06_11" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: messages_2026_06_12; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2026_06_12" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."schema_migrations" (
    "version" bigint NOT NULL,
    "inserted_at" timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."subscription" (
    "id" bigint NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "entity" "regclass" NOT NULL,
    "filters" "realtime"."user_defined_filter"[] DEFAULT '{}'::"realtime"."user_defined_filter"[] NOT NULL,
    "claims" "jsonb" NOT NULL,
    "claims_role" "regrole" GENERATED ALWAYS AS ("realtime"."to_regrole"(("claims" ->> 'role'::"text"))) STORED NOT NULL,
    "created_at" timestamp without time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE "realtime"."subscription" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "realtime"."subscription_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text",
    "type" "storage"."buckettype" DEFAULT 'STANDARD'::"storage"."buckettype" NOT NULL
);


--
-- Name: COLUMN "buckets"."owner"; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."buckets_analytics" (
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: iceberg_namespaces; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."iceberg_namespaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text" NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: iceberg_tables; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."iceberg_tables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "namespace_id" "uuid" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "location" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb",
    "level" integer
);


--
-- Name: COLUMN "objects"."owner"; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';


--
-- Name: prefixes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."prefixes" (
    "bucket_id" "text" NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "level" integer GENERATED ALWAYS AS ("storage"."get_level"("name")) STORED NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb"
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE "supabase_migrations"."schema_migrations" (
    "version" "text" NOT NULL,
    "statements" "text"[] NOT NULL,
    "name" "text" NOT NULL,
    "created_by" "text",
    "idempotency_key" "text"
);


--
-- Name: messages_2026_06_07; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_06_07" FOR VALUES FROM ('2026-06-07 00:00:00') TO ('2026-06-08 00:00:00');


--
-- Name: messages_2026_06_08; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_06_08" FOR VALUES FROM ('2026-06-08 00:00:00') TO ('2026-06-09 00:00:00');


--
-- Name: messages_2026_06_09; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_06_09" FOR VALUES FROM ('2026-06-09 00:00:00') TO ('2026-06-10 00:00:00');


--
-- Name: messages_2026_06_10; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_06_10" FOR VALUES FROM ('2026-06-10 00:00:00') TO ('2026-06-11 00:00:00');


--
-- Name: messages_2026_06_11; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_06_11" FOR VALUES FROM ('2026-06-11 00:00:00') TO ('2026-06-12 00:00:00');


--
-- Name: messages_2026_06_12; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_06_12" FOR VALUES FROM ('2026-06-12 00:00:00') TO ('2026-06-13 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."refresh_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"auth"."refresh_tokens_id_seq"'::"regclass");


--
-- Name: extensions extensions_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: -
--

ALTER TABLE ONLY "_realtime"."extensions"
    ADD CONSTRAINT "extensions_pkey" PRIMARY KEY ("id");


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: -
--

ALTER TABLE ONLY "_realtime"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: -
--

ALTER TABLE ONLY "_realtime"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "amr_id_pk" PRIMARY KEY ("id");


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."audit_log_entries"
    ADD CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id");


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."flow_state"
    ADD CONSTRAINT "flow_state_pkey" PRIMARY KEY ("id");


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_pkey" PRIMARY KEY ("id");


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_provider_id_provider_unique" UNIQUE ("provider_id", "provider");


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."instances"
    ADD CONSTRAINT "instances_pkey" PRIMARY KEY ("id");


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_authentication_method_pkey" UNIQUE ("session_id", "authentication_method");


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id");


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_last_challenged_at_key" UNIQUE ("last_challenged_at");


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id");


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id");


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_unique" UNIQUE ("token");


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_entity_id_key" UNIQUE ("entity_id");


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_pkey" PRIMARY KEY ("id");


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY ("id");


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_pkey" PRIMARY KEY ("id");


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sso_providers"
    ADD CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id");


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");


--
-- Name: ad_event_logs ad_event_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ad_event_logs"
    ADD CONSTRAINT "ad_event_logs_pkey" PRIMARY KEY ("id");


--
-- Name: ad_events ad_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ad_events"
    ADD CONSTRAINT "ad_events_pkey" PRIMARY KEY ("id");


--
-- Name: ad_unlock_logs_archive ad_unlock_logs_archive_item_id_unlock_type_openid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ad_unlock_logs_archive"
    ADD CONSTRAINT "ad_unlock_logs_archive_item_id_unlock_type_openid_key" UNIQUE ("item_id", "unlock_type", "openid");


--
-- Name: ad_unlock_logs_archive ad_unlock_logs_archive_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ad_unlock_logs_archive"
    ADD CONSTRAINT "ad_unlock_logs_archive_pkey" PRIMARY KEY ("id");


--
-- Name: ad_unlock_logs ad_unlock_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ad_unlock_logs"
    ADD CONSTRAINT "ad_unlock_logs_pkey" PRIMARY KEY ("id");


--
-- Name: admin_operation_logs admin_operation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."admin_operation_logs"
    ADD CONSTRAINT "admin_operation_logs_pkey" PRIMARY KEY ("id");


--
-- Name: ads ads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ads"
    ADD CONSTRAINT "ads_pkey" PRIMARY KEY ("id");


--
-- Name: album_access_requests album_access_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_access_requests"
    ADD CONSTRAINT "album_access_requests_pkey" PRIMARY KEY ("id");


--
-- Name: album_custom_field_groups album_custom_field_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_custom_field_groups"
    ADD CONSTRAINT "album_custom_field_groups_pkey" PRIMARY KEY ("id");


--
-- Name: album_custom_fields album_custom_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_custom_fields"
    ADD CONSTRAINT "album_custom_fields_pkey" PRIMARY KEY ("id");


--
-- Name: album_joins album_joins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_joins"
    ADD CONSTRAINT "album_joins_pkey" PRIMARY KEY ("id");


--
-- Name: album_joins album_joins_user_id_album_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_joins"
    ADD CONSTRAINT "album_joins_user_id_album_id_key" UNIQUE ("user_id", "album_id");


--
-- Name: album_photo_level_logs album_photo_level_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_photo_level_logs"
    ADD CONSTRAINT "album_photo_level_logs_pkey" PRIMARY KEY ("id");


--
-- Name: album_photos album_photos_album_url_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_photos"
    ADD CONSTRAINT "album_photos_album_url_unique" UNIQUE ("album_id", "url");


--
-- Name: album_photos album_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_photos"
    ADD CONSTRAINT "album_photos_pkey" PRIMARY KEY ("id");


--
-- Name: album_user_permissions album_user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_user_permissions"
    ADD CONSTRAINT "album_user_permissions_pkey" PRIMARY KEY ("id");


--
-- Name: album_user_permissions album_user_permissions_user_id_album_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_user_permissions"
    ADD CONSTRAINT "album_user_permissions_user_id_album_id_key" UNIQUE ("user_id", "album_id");


--
-- Name: album_viewing_history album_viewing_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_viewing_history"
    ADD CONSTRAINT "album_viewing_history_pkey" PRIMARY KEY ("id");


--
-- Name: album_viewing_history album_viewing_history_user_id_album_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_viewing_history"
    ADD CONSTRAINT "album_viewing_history_user_id_album_id_key" UNIQUE ("user_id", "album_id");


--
-- Name: analytics_events analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");


--
-- Name: analytics_goal_conversions analytics_goal_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_goal_conversions"
    ADD CONSTRAINT "analytics_goal_conversions_pkey" PRIMARY KEY ("id");


--
-- Name: analytics_goals analytics_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_goals"
    ADD CONSTRAINT "analytics_goals_pkey" PRIMARY KEY ("id");


--
-- Name: analytics_heatmap_data analytics_heatmap_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_heatmap_data"
    ADD CONSTRAINT "analytics_heatmap_data_pkey" PRIMARY KEY ("id");


--
-- Name: analytics_heatmaps analytics_heatmaps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_heatmaps"
    ADD CONSTRAINT "analytics_heatmaps_pkey" PRIMARY KEY ("id");


--
-- Name: analytics_performance analytics_performance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_performance"
    ADD CONSTRAINT "analytics_performance_pkey" PRIMARY KEY ("id");


--
-- Name: analytics_realtime analytics_realtime_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_realtime"
    ADD CONSTRAINT "analytics_realtime_pkey" PRIMARY KEY ("id");


--
-- Name: analytics_replays analytics_replays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_replays"
    ADD CONSTRAINT "analytics_replays_pkey" PRIMARY KEY ("id");


--
-- Name: analytics_sessions analytics_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_sessions"
    ADD CONSTRAINT "analytics_sessions_pkey" PRIMARY KEY ("id");


--
-- Name: analytics_sessions analytics_sessions_session_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_sessions"
    ADD CONSTRAINT "analytics_sessions_session_uuid_key" UNIQUE ("session_uuid");


--
-- Name: analytics_visitors analytics_visitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_visitors"
    ADD CONSTRAINT "analytics_visitors_pkey" PRIMARY KEY ("id");


--
-- Name: analytics_visitors analytics_visitors_visitor_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_visitors"
    ADD CONSTRAINT "analytics_visitors_visitor_uuid_key" UNIQUE ("visitor_uuid");


--
-- Name: analytics_websites analytics_websites_pixel_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_websites"
    ADD CONSTRAINT "analytics_websites_pixel_key_key" UNIQUE ("pixel_key");


--
-- Name: analytics_websites analytics_websites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_websites"
    ADD CONSTRAINT "analytics_websites_pkey" PRIMARY KEY ("id");


--
-- Name: analytics_websites analytics_websites_website_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_websites"
    ADD CONSTRAINT "analytics_websites_website_uuid_key" UNIQUE ("website_uuid");


--
-- Name: annotations annotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."annotations"
    ADD CONSTRAINT "annotations_pkey" PRIMARY KEY ("id");


--
-- Name: announcement_acknowledgments announcement_acknowledgments_announcement_id_openid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."announcement_acknowledgments"
    ADD CONSTRAINT "announcement_acknowledgments_announcement_id_openid_key" UNIQUE ("announcement_id", "openid");


--
-- Name: announcement_acknowledgments announcement_acknowledgments_announcement_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."announcement_acknowledgments"
    ADD CONSTRAINT "announcement_acknowledgments_announcement_id_user_id_key" UNIQUE ("announcement_id", "user_id");


--
-- Name: announcement_acknowledgments announcement_acknowledgments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."announcement_acknowledgments"
    ADD CONSTRAINT "announcement_acknowledgments_pkey" PRIMARY KEY ("id");


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");


--
-- Name: app_api_keys app_api_keys_api_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."app_api_keys"
    ADD CONSTRAINT "app_api_keys_api_key_key" UNIQUE ("api_key");


--
-- Name: app_api_keys app_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."app_api_keys"
    ADD CONSTRAINT "app_api_keys_pkey" PRIMARY KEY ("id");


--
-- Name: app_api_logs app_api_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."app_api_logs"
    ADD CONSTRAINT "app_api_logs_pkey" PRIMARY KEY ("id");


--
-- Name: app_configs app_configs_app_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."app_configs"
    ADD CONSTRAINT "app_configs_app_id_key" UNIQUE ("app_id");


--
-- Name: app_configs app_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."app_configs"
    ADD CONSTRAINT "app_configs_pkey" PRIMARY KEY ("id");


--
-- Name: app_versions app_versions_app_id_version_platform_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."app_versions"
    ADD CONSTRAINT "app_versions_app_id_version_platform_key" UNIQUE ("app_id", "version", "platform");


--
-- Name: app_versions app_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."app_versions"
    ADD CONSTRAINT "app_versions_pkey" PRIMARY KEY ("id");


--
-- Name: badge_categories badge_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."badge_categories"
    ADD CONSTRAINT "badge_categories_pkey" PRIMARY KEY ("id");


--
-- Name: badge_tasks badge_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."badge_tasks"
    ADD CONSTRAINT "badge_tasks_pkey" PRIMARY KEY ("id");


--
-- Name: badges badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_pkey" PRIMARY KEY ("id");


--
-- Name: bookmarks bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id");


--
-- Name: bookmarks bookmarks_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_user_id_key" UNIQUE ("user_id");


--
-- Name: cache_config cache_config_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cache_config"
    ADD CONSTRAINT "cache_config_cache_key_key" UNIQUE ("cache_key");


--
-- Name: cache_config cache_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cache_config"
    ADD CONSTRAINT "cache_config_pkey" PRIMARY KEY ("id");


--
-- Name: cache_stats cache_stats_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cache_stats"
    ADD CONSTRAINT "cache_stats_cache_key_key" UNIQUE ("cache_key");


--
-- Name: cache_stats cache_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cache_stats"
    ADD CONSTRAINT "cache_stats_pkey" PRIMARY KEY ("id");


--
-- Name: check_ins check_ins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id");


--
-- Name: check_ins check_ins_user_id_check_in_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_user_id_check_in_date_key" UNIQUE ("user_id", "check_in_date");


--
-- Name: collection_tokens collection_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."collection_tokens"
    ADD CONSTRAINT "collection_tokens_pkey" PRIMARY KEY ("id");


--
-- Name: collection_tokens collection_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."collection_tokens"
    ADD CONSTRAINT "collection_tokens_token_key" UNIQUE ("token");


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");


--
-- Name: content_categories content_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."content_categories"
    ADD CONSTRAINT "content_categories_pkey" PRIMARY KEY ("id");


--
-- Name: daily_gallery_access_logs_archive daily_gallery_access_logs_archive_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_access_logs_archive"
    ADD CONSTRAINT "daily_gallery_access_logs_archive_pkey" PRIMARY KEY ("id");


--
-- Name: daily_gallery_access_logs daily_gallery_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_access_logs"
    ADD CONSTRAINT "daily_gallery_access_logs_pkey" PRIMARY KEY ("id");


--
-- Name: daily_gallery_account_passwords daily_gallery_account_passwords_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_account_passwords"
    ADD CONSTRAINT "daily_gallery_account_passwords_pkey" PRIMARY KEY ("id");


--
-- Name: daily_gallery_account_passwords daily_gallery_account_passwords_post_id_wechat_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_account_passwords"
    ADD CONSTRAINT "daily_gallery_account_passwords_post_id_wechat_account_id_key" UNIQUE ("post_id", "wechat_account_id");


--
-- Name: daily_gallery_password_lockouts daily_gallery_password_lockouts_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_password_lockouts"
    ADD CONSTRAINT "daily_gallery_password_lockouts_ip_address_key" UNIQUE ("ip_address");


--
-- Name: daily_gallery_password_lockouts daily_gallery_password_lockouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_password_lockouts"
    ADD CONSTRAINT "daily_gallery_password_lockouts_pkey" PRIMARY KEY ("id");


--
-- Name: daily_gallery_password_user_locks daily_gallery_password_user_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_password_user_locks"
    ADD CONSTRAINT "daily_gallery_password_user_locks_pkey" PRIMARY KEY ("id");


--
-- Name: daily_gallery_posts_archive daily_gallery_posts_archive_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_posts_archive"
    ADD CONSTRAINT "daily_gallery_posts_archive_pkey" PRIMARY KEY ("id");


--
-- Name: daily_gallery_posts_archive daily_gallery_posts_archive_post_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_posts_archive"
    ADD CONSTRAINT "daily_gallery_posts_archive_post_date_key" UNIQUE ("post_date");


--
-- Name: daily_gallery_posts daily_gallery_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_posts"
    ADD CONSTRAINT "daily_gallery_posts_pkey" PRIMARY KEY ("id");


--
-- Name: daily_gallery_posts daily_gallery_posts_post_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_posts"
    ADD CONSTRAINT "daily_gallery_posts_post_date_key" UNIQUE ("post_date");


--
-- Name: daily_gallery_rb_triggers daily_gallery_rb_triggers_openid_trigger_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_rb_triggers"
    ADD CONSTRAINT "daily_gallery_rb_triggers_openid_trigger_date_key" UNIQUE ("openid", "trigger_date");


--
-- Name: daily_gallery_rb_triggers daily_gallery_rb_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_rb_triggers"
    ADD CONSTRAINT "daily_gallery_rb_triggers_pkey" PRIMARY KEY ("id");


--
-- Name: daily_gallery_rb_triggers daily_gallery_rb_triggers_user_id_trigger_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_rb_triggers"
    ADD CONSTRAINT "daily_gallery_rb_triggers_user_id_trigger_date_key" UNIQUE ("user_id", "trigger_date");


--
-- Name: daily_gallery_special_passwords daily_gallery_special_passwords_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_special_passwords"
    ADD CONSTRAINT "daily_gallery_special_passwords_pkey" PRIMARY KEY ("id");


--
-- Name: daily_gallery_special_passwords daily_gallery_special_passwords_wechat_sync_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_special_passwords"
    ADD CONSTRAINT "daily_gallery_special_passwords_wechat_sync_key" UNIQUE ("creator_id", "target_date", "source");


--
-- Name: daily_gallery_submissions daily_gallery_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_submissions"
    ADD CONSTRAINT "daily_gallery_submissions_pkey" PRIMARY KEY ("id");


--
-- Name: daily_gallery_user_passwords daily_gallery_user_passwords_openid_post_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_user_passwords"
    ADD CONSTRAINT "daily_gallery_user_passwords_openid_post_date_key" UNIQUE ("openid", "post_date");


--
-- Name: daily_gallery_user_passwords daily_gallery_user_passwords_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_user_passwords"
    ADD CONSTRAINT "daily_gallery_user_passwords_pkey" PRIMARY KEY ("id");


--
-- Name: debug_log_settings debug_log_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."debug_log_settings"
    ADD CONSTRAINT "debug_log_settings_pkey" PRIMARY KEY ("id");


--
-- Name: debug_logs debug_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."debug_logs"
    ADD CONSTRAINT "debug_logs_pkey" PRIMARY KEY ("id");


--
-- Name: dedupe_logs dedupe_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dedupe_logs"
    ADD CONSTRAINT "dedupe_logs_pkey" PRIMARY KEY ("id");


--
-- Name: digital_id_configs digital_id_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."digital_id_configs"
    ADD CONSTRAINT "digital_id_configs_pkey" PRIMARY KEY ("id");


--
-- Name: digital_id_patterns digital_id_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."digital_id_patterns"
    ADD CONSTRAINT "digital_id_patterns_pkey" PRIMARY KEY ("id");


--
-- Name: dislikes dislikes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dislikes"
    ADD CONSTRAINT "dislikes_pkey" PRIMARY KEY ("id");


--
-- Name: dislikes dislikes_user_id_media_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dislikes"
    ADD CONSTRAINT "dislikes_user_id_media_id_key" UNIQUE ("user_id", "media_id");


--
-- Name: domain_configs domain_configs_domain_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."domain_configs"
    ADD CONSTRAINT "domain_configs_domain_url_key" UNIQUE ("domain_url");


--
-- Name: domain_configs domain_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."domain_configs"
    ADD CONSTRAINT "domain_configs_pkey" PRIMARY KEY ("id");


--
-- Name: easter_egg_configs easter_egg_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."easter_egg_configs"
    ADD CONSTRAINT "easter_egg_configs_pkey" PRIMARY KEY ("id");


--
-- Name: easter_egg_records easter_egg_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."easter_egg_records"
    ADD CONSTRAINT "easter_egg_records_pkey" PRIMARY KEY ("id");


--
-- Name: easter_egg_trigger_logs easter_egg_trigger_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."easter_egg_trigger_logs"
    ADD CONSTRAINT "easter_egg_trigger_logs_pkey" PRIMARY KEY ("id");


--
-- Name: excluded_digital_ids excluded_digital_ids_digital_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."excluded_digital_ids"
    ADD CONSTRAINT "excluded_digital_ids_digital_id_key" UNIQUE ("digital_id");


--
-- Name: excluded_digital_ids excluded_digital_ids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."excluded_digital_ids"
    ADD CONSTRAINT "excluded_digital_ids_pkey" PRIMARY KEY ("id");


--
-- Name: explore_cache_stats explore_cache_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."explore_cache_stats"
    ADD CONSTRAINT "explore_cache_stats_pkey" PRIMARY KEY ("stat_time");


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_pkey" PRIMARY KEY ("id");


--
-- Name: favorites favorites_user_id_media_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_user_id_media_id_key" UNIQUE NULLS NOT DISTINCT ("user_id", "media_id");


--
-- Name: global_keyword_replacements global_keyword_replacements_original_word_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."global_keyword_replacements"
    ADD CONSTRAINT "global_keyword_replacements_original_word_type_key" UNIQUE ("original_word", "type");


--
-- Name: global_keyword_replacements global_keyword_replacements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."global_keyword_replacements"
    ADD CONSTRAINT "global_keyword_replacements_pkey" PRIMARY KEY ("id");


--
-- Name: growth_logs growth_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."growth_logs"
    ADD CONSTRAINT "growth_logs_pkey" PRIMARY KEY ("id");


--
-- Name: login_tickets login_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."login_tickets"
    ADD CONSTRAINT "login_tickets_pkey" PRIMARY KEY ("id");


--
-- Name: login_tickets login_tickets_ticket_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."login_tickets"
    ADD CONSTRAINT "login_tickets_ticket_key" UNIQUE ("ticket");


--
-- Name: media_cache_stats media_cache_stats_cache_key_recorded_at_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_cache_stats"
    ADD CONSTRAINT "media_cache_stats_cache_key_recorded_at_key" UNIQUE ("cache_key", "recorded_at");


--
-- Name: media_cache_stats media_cache_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_cache_stats"
    ADD CONSTRAINT "media_cache_stats_pkey" PRIMARY KEY ("id");


--
-- Name: media_downloads media_downloads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_downloads"
    ADD CONSTRAINT "media_downloads_pkey" PRIMARY KEY ("id");


--
-- Name: media_downloads media_downloads_user_id_media_id_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_downloads"
    ADD CONSTRAINT "media_downloads_user_id_media_id_type_key" UNIQUE ("user_id", "media_id", "type");


--
-- Name: media_items media_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_items"
    ADD CONSTRAINT "media_items_pkey" PRIMARY KEY ("id");


--
-- Name: media_staging media_staging_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_staging"
    ADD CONSTRAINT "media_staging_pkey" PRIMARY KEY ("id");


--
-- Name: media_tags media_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_tags"
    ADD CONSTRAINT "media_tags_pkey" PRIMARY KEY ("media_id", "tag_id");


--
-- Name: media_views media_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_views"
    ADD CONSTRAINT "media_views_pkey" PRIMARY KEY ("id");


--
-- Name: media_views media_views_user_id_media_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_views"
    ADD CONSTRAINT "media_views_user_id_media_id_key" UNIQUE ("user_id", "media_id");


--
-- Name: miniprogram_configs miniprogram_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."miniprogram_configs"
    ADD CONSTRAINT "miniprogram_configs_pkey" PRIMARY KEY ("id");


--
-- Name: miniprogram_login_sessions miniprogram_login_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."miniprogram_login_sessions"
    ADD CONSTRAINT "miniprogram_login_sessions_pkey" PRIMARY KEY ("id");


--
-- Name: miniprogram_login_sessions miniprogram_login_sessions_scene_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."miniprogram_login_sessions"
    ADD CONSTRAINT "miniprogram_login_sessions_scene_code_key" UNIQUE ("scene_code");


--
-- Name: mp_login_logs mp_login_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mp_login_logs"
    ADD CONSTRAINT "mp_login_logs_pkey" PRIMARY KEY ("id");


--
-- Name: mp_qr_generation_logs mp_qr_generation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mp_qr_generation_logs"
    ADD CONSTRAINT "mp_qr_generation_logs_pkey" PRIMARY KEY ("id");


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id");


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_clients oauth_clients_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."oauth_clients"
    ADD CONSTRAINT "oauth_clients_client_id_key" UNIQUE ("client_id");


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."oauth_clients"
    ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id");


--
-- Name: parse_import_configs parse_import_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."parse_import_configs"
    ADD CONSTRAINT "parse_import_configs_pkey" PRIMARY KEY ("id");


--
-- Name: permission_groups permission_groups_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."permission_groups"
    ADD CONSTRAINT "permission_groups_name_key" UNIQUE ("name");


--
-- Name: permission_groups permission_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."permission_groups"
    ADD CONSTRAINT "permission_groups_pkey" PRIMARY KEY ("id");


--
-- Name: photo_albums photo_albums_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."photo_albums"
    ADD CONSTRAINT "photo_albums_pkey" PRIMARY KEY ("id");


--
-- Name: photo_anti_screenshot_logs photo_anti_screenshot_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."photo_anti_screenshot_logs"
    ADD CONSTRAINT "photo_anti_screenshot_logs_pkey" PRIMARY KEY ("id");


--
-- Name: points_logs points_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."points_logs"
    ADD CONSTRAINT "points_logs_pkey" PRIMARY KEY ("id");


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");


--
-- Name: profiles profiles_mobile_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_mobile_key" UNIQUE ("mobile");


--
-- Name: profiles profiles_mp_openid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_mp_openid_key" UNIQUE ("mp_openid");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");


--
-- Name: profiles profiles_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_unique" UNIQUE ("username");


--
-- Name: promotion_pages promotion_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."promotion_pages"
    ADD CONSTRAINT "promotion_pages_pkey" PRIMARY KEY ("id");


--
-- Name: promotion_pages promotion_pages_short_link_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."promotion_pages"
    ADD CONSTRAINT "promotion_pages_short_link_key" UNIQUE ("short_link");


--
-- Name: proxy_cache_items proxy_cache_items_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."proxy_cache_items"
    ADD CONSTRAINT "proxy_cache_items_key_key" UNIQUE ("key");


--
-- Name: proxy_cache_items proxy_cache_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."proxy_cache_items"
    ADD CONSTRAINT "proxy_cache_items_pkey" PRIMARY KEY ("id");


--
-- Name: proxy_exclude_domains proxy_exclude_domains_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."proxy_exclude_domains"
    ADD CONSTRAINT "proxy_exclude_domains_domain_key" UNIQUE ("domain");


--
-- Name: proxy_exclude_domains proxy_exclude_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."proxy_exclude_domains"
    ADD CONSTRAINT "proxy_exclude_domains_pkey" PRIMARY KEY ("id");


--
-- Name: random_beauty_configs random_beauty_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."random_beauty_configs"
    ADD CONSTRAINT "random_beauty_configs_pkey" PRIMARY KEY ("id");


--
-- Name: random_beauty_logs random_beauty_logs_openid_visit_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."random_beauty_logs"
    ADD CONSTRAINT "random_beauty_logs_openid_visit_date_key" UNIQUE ("openid", "visit_date");


--
-- Name: random_beauty_logs random_beauty_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."random_beauty_logs"
    ADD CONSTRAINT "random_beauty_logs_pkey" PRIMARY KEY ("id");


--
-- Name: rank_configs rank_configs_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."rank_configs"
    ADD CONSTRAINT "rank_configs_name_key" UNIQUE ("name");


--
-- Name: rank_configs rank_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."rank_configs"
    ADD CONSTRAINT "rank_configs_pkey" PRIMARY KEY ("id");


--
-- Name: recommendation_settings recommendation_settings_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."recommendation_settings"
    ADD CONSTRAINT "recommendation_settings_name_key" UNIQUE ("name");


--
-- Name: recommendation_settings recommendation_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."recommendation_settings"
    ADD CONSTRAINT "recommendation_settings_pkey" PRIMARY KEY ("id");


--
-- Name: redemption_codes redemption_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."redemption_codes"
    ADD CONSTRAINT "redemption_codes_code_key" UNIQUE ("code");


--
-- Name: redemption_codes redemption_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."redemption_codes"
    ADD CONSTRAINT "redemption_codes_pkey" PRIMARY KEY ("id");


--
-- Name: redemption_logs redemption_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."redemption_logs"
    ADD CONSTRAINT "redemption_logs_pkey" PRIMARY KEY ("id");


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");


--
-- Name: scheduled_task_logs scheduled_task_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."scheduled_task_logs"
    ADD CONSTRAINT "scheduled_task_logs_pkey" PRIMARY KEY ("id");


--
-- Name: site_shortcodes shortcodes_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."site_shortcodes"
    ADD CONSTRAINT "shortcodes_key_key" UNIQUE ("key");


--
-- Name: site_shortcodes shortcodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."site_shortcodes"
    ADD CONSTRAINT "shortcodes_pkey" PRIMARY KEY ("id");


--
-- Name: signin_configs signin_configs_day_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."signin_configs"
    ADD CONSTRAINT "signin_configs_day_number_key" UNIQUE ("day_number");


--
-- Name: signin_configs signin_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."signin_configs"
    ADD CONSTRAINT "signin_configs_pkey" PRIMARY KEY ("id");


--
-- Name: special_digital_ids special_digital_ids_digital_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."special_digital_ids"
    ADD CONSTRAINT "special_digital_ids_digital_id_key" UNIQUE ("digital_id");


--
-- Name: special_digital_ids special_digital_ids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."special_digital_ids"
    ADD CONSTRAINT "special_digital_ids_pkey" PRIMARY KEY ("id");


--
-- Name: special_password_usage special_password_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."special_password_usage"
    ADD CONSTRAINT "special_password_usage_pkey" PRIMARY KEY ("id");


--
-- Name: sql_logs sql_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."sql_logs"
    ADD CONSTRAINT "sql_logs_pkey" PRIMARY KEY ("id");


--
-- Name: star_hunt_activity_configs star_hunt_activity_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."star_hunt_activity_configs"
    ADD CONSTRAINT "star_hunt_activity_configs_pkey" PRIMARY KEY ("id");


--
-- Name: star_hunt_collection_records star_hunt_collection_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."star_hunt_collection_records"
    ADD CONSTRAINT "star_hunt_collection_records_pkey" PRIMARY KEY ("id");


--
-- Name: star_hunt_collection_records star_hunt_collection_records_user_id_activity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."star_hunt_collection_records"
    ADD CONSTRAINT "star_hunt_collection_records_user_id_activity_id_key" UNIQUE ("user_id", "activity_id");


--
-- Name: star_hunt_completions star_hunt_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."star_hunt_completions"
    ADD CONSTRAINT "star_hunt_completions_pkey" PRIMARY KEY ("id");


--
-- Name: storage_configs storage_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."storage_configs"
    ADD CONSTRAINT "storage_configs_pkey" PRIMARY KEY ("id");


--
-- Name: superbed_configs superbed_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."superbed_configs"
    ADD CONSTRAINT "superbed_configs_pkey" PRIMARY KEY ("id");


--
-- Name: system_builds system_builds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."system_builds"
    ADD CONSTRAINT "system_builds_pkey" PRIMARY KEY ("id");


--
-- Name: system_configs system_configs_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."system_configs"
    ADD CONSTRAINT "system_configs_key_key" UNIQUE ("key");


--
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."system_configs"
    ADD CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id");


--
-- Name: system_guide_categories system_guide_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."system_guide_categories"
    ADD CONSTRAINT "system_guide_categories_pkey" PRIMARY KEY ("id");


--
-- Name: system_guide_templates system_guide_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."system_guide_templates"
    ADD CONSTRAINT "system_guide_templates_pkey" PRIMARY KEY ("id");


--
-- Name: system_guides system_guides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."system_guides"
    ADD CONSTRAINT "system_guides_pkey" PRIMARY KEY ("id");


--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");


--
-- Name: user_active_sessions user_active_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_active_sessions"
    ADD CONSTRAINT "user_active_sessions_pkey" PRIMARY KEY ("id");


--
-- Name: user_badges user_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id");


--
-- Name: user_badges user_badges_user_id_badge_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_badge_id_key" UNIQUE ("user_id", "badge_id");


--
-- Name: user_feedbacks user_feedbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_feedbacks"
    ADD CONSTRAINT "user_feedbacks_pkey" PRIMARY KEY ("id");


--
-- Name: user_field_configs user_field_configs_field_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_field_configs"
    ADD CONSTRAINT "user_field_configs_field_key_key" UNIQUE ("field_key");


--
-- Name: user_field_configs user_field_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_field_configs"
    ADD CONSTRAINT "user_field_configs_pkey" PRIMARY KEY ("id");


--
-- Name: user_interactions user_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_pkey" PRIMARY KEY ("id");


--
-- Name: user_pending_items user_pending_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_pending_items"
    ADD CONSTRAINT "user_pending_items_pkey" PRIMARY KEY ("id");


--
-- Name: user_pending_items user_pending_items_user_id_media_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_pending_items"
    ADD CONSTRAINT "user_pending_items_user_id_media_id_key" UNIQUE NULLS NOT DISTINCT ("user_id", "media_id");


--
-- Name: user_session_recordings user_session_recordings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_session_recordings"
    ADD CONSTRAINT "user_session_recordings_pkey" PRIMARY KEY ("id");


--
-- Name: user_visit_stats user_visit_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_visit_stats"
    ADD CONSTRAINT "user_visit_stats_pkey" PRIMARY KEY ("id");


--
-- Name: video_proxy_configs_old video_proxy_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."video_proxy_configs_old"
    ADD CONSTRAINT "video_proxy_configs_pkey" PRIMARY KEY ("id");


--
-- Name: video_proxy_configs video_proxy_configs_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."video_proxy_configs"
    ADD CONSTRAINT "video_proxy_configs_pkey1" PRIMARY KEY ("id");


--
-- Name: video_proxy_logs video_proxy_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."video_proxy_logs"
    ADD CONSTRAINT "video_proxy_logs_pkey" PRIMARY KEY ("id");


--
-- Name: video_proxy_nodes video_proxy_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."video_proxy_nodes"
    ADD CONSTRAINT "video_proxy_nodes_pkey" PRIMARY KEY ("id");


--
-- Name: web_vitals_logs web_vitals_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."web_vitals_logs"
    ADD CONSTRAINT "web_vitals_logs_pkey" PRIMARY KEY ("id");


--
-- Name: wechat_access_tokens wechat_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_access_tokens"
    ADD CONSTRAINT "wechat_access_tokens_pkey" PRIMARY KEY ("config_id");


--
-- Name: wechat_account_password_config wechat_account_password_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_account_password_config"
    ADD CONSTRAINT "wechat_account_password_config_pkey" PRIMARY KEY ("id");


--
-- Name: wechat_binding_requests wechat_binding_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_binding_requests"
    ADD CONSTRAINT "wechat_binding_requests_pkey" PRIMARY KEY ("id");


--
-- Name: wechat_configs wechat_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_configs"
    ADD CONSTRAINT "wechat_configs_pkey" PRIMARY KEY ("id");


--
-- Name: wechat_draft_templates wechat_draft_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_draft_templates"
    ADD CONSTRAINT "wechat_draft_templates_pkey" PRIMARY KEY ("id");


--
-- Name: wechat_drafts wechat_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_drafts"
    ADD CONSTRAINT "wechat_drafts_pkey" PRIMARY KEY ("id");


--
-- Name: wechat_fans wechat_fans_config_id_openid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_fans"
    ADD CONSTRAINT "wechat_fans_config_id_openid_key" UNIQUE ("config_id", "openid");


--
-- Name: wechat_fans wechat_fans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_fans"
    ADD CONSTRAINT "wechat_fans_pkey" PRIMARY KEY ("id");


--
-- Name: wechat_materials wechat_materials_config_id_media_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_materials"
    ADD CONSTRAINT "wechat_materials_config_id_media_id_key" UNIQUE ("config_id", "media_id");


--
-- Name: wechat_materials wechat_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_materials"
    ADD CONSTRAINT "wechat_materials_pkey" PRIMARY KEY ("id");


--
-- Name: wechat_menus wechat_menus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_menus"
    ADD CONSTRAINT "wechat_menus_pkey" PRIMARY KEY ("id");


--
-- Name: wechat_messages wechat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_messages"
    ADD CONSTRAINT "wechat_messages_pkey" PRIMARY KEY ("id");


--
-- Name: wechat_notification_logs wechat_notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_notification_logs"
    ADD CONSTRAINT "wechat_notification_logs_pkey" PRIMARY KEY ("id");


--
-- Name: wechat_notification_subscriptions wechat_notification_subscripti_config_id_openid_template_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_notification_subscriptions"
    ADD CONSTRAINT "wechat_notification_subscripti_config_id_openid_template_id_key" UNIQUE ("config_id", "openid", "template_id");


--
-- Name: wechat_notification_subscriptions wechat_notification_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_notification_subscriptions"
    ADD CONSTRAINT "wechat_notification_subscriptions_pkey" PRIMARY KEY ("id");


--
-- Name: wechat_notification_tasks wechat_notification_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_notification_tasks"
    ADD CONSTRAINT "wechat_notification_tasks_pkey" PRIMARY KEY ("id");


--
-- Name: wechat_notification_templates wechat_notification_templates_config_id_pri_tmpl_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_notification_templates"
    ADD CONSTRAINT "wechat_notification_templates_config_id_pri_tmpl_id_key" UNIQUE ("config_id", "pri_tmpl_id");


--
-- Name: wechat_notification_templates wechat_notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_notification_templates"
    ADD CONSTRAINT "wechat_notification_templates_pkey" PRIMARY KEY ("id");


--
-- Name: wechat_replies wechat_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_replies"
    ADD CONSTRAINT "wechat_replies_pkey" PRIMARY KEY ("id");


--
-- Name: wechat_users wechat_users_openid_config_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_users"
    ADD CONSTRAINT "wechat_users_openid_config_id_key" UNIQUE ("openid", "config_id");


--
-- Name: wechat_users wechat_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_users"
    ADD CONSTRAINT "wechat_users_pkey" PRIMARY KEY ("id");


--
-- Name: wecom_configs wecom_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wecom_configs"
    ADD CONSTRAINT "wecom_configs_pkey" PRIMARY KEY ("id");


--
-- Name: zonerama_album_configs zonerama_album_configs_album_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."zonerama_album_configs"
    ADD CONSTRAINT "zonerama_album_configs_album_id_key" UNIQUE ("album_id");


--
-- Name: zonerama_album_configs zonerama_album_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."zonerama_album_configs"
    ADD CONSTRAINT "zonerama_album_configs_pkey" PRIMARY KEY ("id");


--
-- Name: zonerama_library zonerama_library_photo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."zonerama_library"
    ADD CONSTRAINT "zonerama_library_photo_id_key" UNIQUE ("photo_id");


--
-- Name: zonerama_library zonerama_library_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."zonerama_library"
    ADD CONSTRAINT "zonerama_library_pkey" PRIMARY KEY ("id");


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_06_07 messages_2026_06_07_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2026_06_07"
    ADD CONSTRAINT "messages_2026_06_07_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_06_08 messages_2026_06_08_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2026_06_08"
    ADD CONSTRAINT "messages_2026_06_08_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_06_09 messages_2026_06_09_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2026_06_09"
    ADD CONSTRAINT "messages_2026_06_09_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_06_10 messages_2026_06_10_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2026_06_10"
    ADD CONSTRAINT "messages_2026_06_10_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_06_11 messages_2026_06_11_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2026_06_11"
    ADD CONSTRAINT "messages_2026_06_11_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_06_12 messages_2026_06_12_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2026_06_12"
    ADD CONSTRAINT "messages_2026_06_12_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."subscription"
    ADD CONSTRAINT "pk_subscription" PRIMARY KEY ("id");


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");


--
-- Name: iceberg_namespaces iceberg_namespaces_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."iceberg_namespaces"
    ADD CONSTRAINT "iceberg_namespaces_pkey" PRIMARY KEY ("id");


--
-- Name: iceberg_tables iceberg_tables_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."iceberg_tables"
    ADD CONSTRAINT "iceberg_tables_pkey" PRIMARY KEY ("id");


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");


--
-- Name: prefixes prefixes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_pkey" PRIMARY KEY ("bucket_id", "level", "name");


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");


--
-- Name: schema_migrations schema_migrations_idempotency_key_key; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY "supabase_migrations"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_idempotency_key_key" UNIQUE ("idempotency_key");


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY "supabase_migrations"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");


--
-- Name: extensions_tenant_external_id_index; Type: INDEX; Schema: _realtime; Owner: -
--

CREATE INDEX "extensions_tenant_external_id_index" ON "_realtime"."extensions" USING "btree" ("tenant_external_id");


--
-- Name: extensions_tenant_external_id_type_index; Type: INDEX; Schema: _realtime; Owner: -
--

CREATE UNIQUE INDEX "extensions_tenant_external_id_type_index" ON "_realtime"."extensions" USING "btree" ("tenant_external_id", "type");


--
-- Name: tenants_external_id_index; Type: INDEX; Schema: _realtime; Owner: -
--

CREATE UNIQUE INDEX "tenants_external_id_index" ON "_realtime"."tenants" USING "btree" ("external_id");


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "audit_logs_instance_id_idx" ON "auth"."audit_log_entries" USING "btree" ("instance_id");


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "confirmation_token_idx" ON "auth"."users" USING "btree" ("confirmation_token") WHERE (("confirmation_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "email_change_token_current_idx" ON "auth"."users" USING "btree" ("email_change_token_current") WHERE (("email_change_token_current")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "email_change_token_new_idx" ON "auth"."users" USING "btree" ("email_change_token_new") WHERE (("email_change_token_new")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "factor_id_created_at_idx" ON "auth"."mfa_factors" USING "btree" ("user_id", "created_at");


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "flow_state_created_at_idx" ON "auth"."flow_state" USING "btree" ("created_at" DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "identities_email_idx" ON "auth"."identities" USING "btree" ("email" "text_pattern_ops");


--
-- Name: INDEX "identities_email_idx"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX "auth"."identities_email_idx" IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "identities_user_id_idx" ON "auth"."identities" USING "btree" ("user_id");


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "idx_auth_code" ON "auth"."flow_state" USING "btree" ("auth_code");


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "idx_user_id_auth_method" ON "auth"."flow_state" USING "btree" ("user_id", "authentication_method");


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "mfa_challenge_created_at_idx" ON "auth"."mfa_challenges" USING "btree" ("created_at" DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "mfa_factors_user_friendly_name_unique" ON "auth"."mfa_factors" USING "btree" ("friendly_name", "user_id") WHERE (TRIM(BOTH FROM "friendly_name") <> ''::"text");


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "mfa_factors_user_id_idx" ON "auth"."mfa_factors" USING "btree" ("user_id");


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "one_time_tokens_relates_to_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("relates_to");


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "one_time_tokens_token_hash_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("token_hash");


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "one_time_tokens_user_id_token_type_key" ON "auth"."one_time_tokens" USING "btree" ("user_id", "token_type");


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "reauthentication_token_idx" ON "auth"."users" USING "btree" ("reauthentication_token") WHERE (("reauthentication_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "recovery_token_idx" ON "auth"."users" USING "btree" ("recovery_token") WHERE (("recovery_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_instance_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id");


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_instance_id_user_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id", "user_id");


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_parent_idx" ON "auth"."refresh_tokens" USING "btree" ("parent");


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_session_id_revoked_idx" ON "auth"."refresh_tokens" USING "btree" ("session_id", "revoked");


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_updated_at_idx" ON "auth"."refresh_tokens" USING "btree" ("updated_at" DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "saml_providers_sso_provider_id_idx" ON "auth"."saml_providers" USING "btree" ("sso_provider_id");


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "saml_relay_states_created_at_idx" ON "auth"."saml_relay_states" USING "btree" ("created_at" DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "saml_relay_states_for_email_idx" ON "auth"."saml_relay_states" USING "btree" ("for_email");


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "saml_relay_states_sso_provider_id_idx" ON "auth"."saml_relay_states" USING "btree" ("sso_provider_id");


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sessions_not_after_idx" ON "auth"."sessions" USING "btree" ("not_after" DESC);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions" USING "btree" ("user_id");


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "sso_domains_domain_idx" ON "auth"."sso_domains" USING "btree" ("lower"("domain"));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sso_domains_sso_provider_id_idx" ON "auth"."sso_domains" USING "btree" ("sso_provider_id");


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "sso_providers_resource_id_idx" ON "auth"."sso_providers" USING "btree" ("lower"("resource_id"));


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "unique_phone_factor_per_user" ON "auth"."mfa_factors" USING "btree" ("user_id", "phone");


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "user_id_created_at_idx" ON "auth"."sessions" USING "btree" ("user_id", "created_at");


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "users_email_partial_key" ON "auth"."users" USING "btree" ("email") WHERE ("is_sso_user" = false);


--
-- Name: INDEX "users_email_partial_key"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX "auth"."users_email_partial_key" IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "users_instance_id_email_idx" ON "auth"."users" USING "btree" ("instance_id", "lower"(("email")::"text"));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "users_instance_id_idx" ON "auth"."users" USING "btree" ("instance_id");


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "users_is_anonymous_idx" ON "auth"."users" USING "btree" ("is_anonymous");


--
-- Name: ad_unlock_logs_archive_watch_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ad_unlock_logs_archive_watch_status_idx" ON "public"."ad_unlock_logs_archive" USING "btree" ("watch_status");


--
-- Name: album_photos_album_id_url_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "album_photos_album_id_url_idx" ON "public"."album_photos" USING "btree" ("album_id", "url");


--
-- Name: album_photos_album_zonerama_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "album_photos_album_zonerama_id_unique" ON "public"."album_photos" USING "btree" ("album_id", "zonerama_photo_id") WHERE ("zonerama_photo_id" IS NOT NULL);


--
-- Name: daily_gallery_access_logs_archive_accessed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "daily_gallery_access_logs_archive_accessed_at_idx" ON "public"."daily_gallery_access_logs_archive" USING "btree" ("accessed_at" DESC);


--
-- Name: daily_gallery_access_logs_archive_openid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "daily_gallery_access_logs_archive_openid_idx" ON "public"."daily_gallery_access_logs_archive" USING "btree" ("openid");


--
-- Name: daily_gallery_access_logs_archive_post_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "daily_gallery_access_logs_archive_post_id_idx" ON "public"."daily_gallery_access_logs_archive" USING "btree" ("post_id");


--
-- Name: daily_gallery_access_logs_archive_publish_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "daily_gallery_access_logs_archive_publish_date_idx" ON "public"."daily_gallery_access_logs_archive" USING "btree" ("publish_date");


--
-- Name: daily_gallery_access_logs_archive_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "daily_gallery_access_logs_archive_user_id_idx" ON "public"."daily_gallery_access_logs_archive" USING "btree" ("user_id");


--
-- Name: daily_gallery_access_logs_archive_user_openid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "daily_gallery_access_logs_archive_user_openid_idx" ON "public"."daily_gallery_access_logs_archive" USING "btree" ("user_openid");


--
-- Name: daily_gallery_posts_archive_is_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "daily_gallery_posts_archive_is_published_idx" ON "public"."daily_gallery_posts_archive" USING "btree" ("is_published");


--
-- Name: daily_gallery_posts_archive_post_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "daily_gallery_posts_archive_post_date_idx" ON "public"."daily_gallery_posts_archive" USING "btree" ("post_date" DESC);


--
-- Name: dislikes_media_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "dislikes_media_id_idx" ON "public"."dislikes" USING "btree" ("media_id");


--
-- Name: dislikes_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "dislikes_user_id_idx" ON "public"."dislikes" USING "btree" ("user_id");


--
-- Name: favorites_media_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "favorites_media_id_idx" ON "public"."favorites" USING "btree" ("media_id");


--
-- Name: favorites_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "favorites_user_id_idx" ON "public"."favorites" USING "btree" ("user_id");


--
-- Name: growth_logs_target_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "growth_logs_target_id_idx" ON "public"."growth_logs" USING "btree" ("user_id", "type", "target_id") WHERE ("target_id" IS NOT NULL);


--
-- Name: idx_ad_event_logs_ad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_ad_event_logs_ad_id" ON "public"."ad_event_logs" USING "btree" ("ad_id");


--
-- Name: idx_ad_event_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_ad_event_logs_created_at" ON "public"."ad_event_logs" USING "btree" ("created_at");


--
-- Name: idx_ad_event_logs_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_ad_event_logs_event_type" ON "public"."ad_event_logs" USING "btree" ("event_type");


--
-- Name: idx_ad_unlock_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_ad_unlock_logs_created_at" ON "public"."ad_unlock_logs" USING "btree" ("created_at" DESC);


--
-- Name: idx_ad_unlock_logs_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_ad_unlock_logs_item_id" ON "public"."ad_unlock_logs" USING "btree" ("item_id");


--
-- Name: idx_ad_unlock_logs_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_ad_unlock_logs_lookup" ON "public"."ad_unlock_logs" USING "btree" ("item_id", "browser_id", "status");


--
-- Name: idx_ad_unlock_logs_user_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_ad_unlock_logs_user_lookup" ON "public"."ad_unlock_logs" USING "btree" ("openid", "user_id", "browser_id");


--
-- Name: idx_ad_unlock_logs_watch_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_ad_unlock_logs_watch_status" ON "public"."ad_unlock_logs" USING "btree" ("watch_status");


--
-- Name: idx_album_photo_level_logs_operator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_album_photo_level_logs_operator_id" ON "public"."album_photo_level_logs" USING "btree" ("operator_id");


--
-- Name: idx_album_photo_level_logs_photo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_album_photo_level_logs_photo_id" ON "public"."album_photo_level_logs" USING "btree" ("photo_id");


--
-- Name: idx_album_photos_dedupe; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_album_photos_dedupe" ON "public"."album_photos" USING "btree" ("album_id", "file_md5", "content_hash");


--
-- Name: idx_album_photos_zonerama_photo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_album_photos_zonerama_photo_id" ON "public"."album_photos" USING "btree" ("zonerama_photo_id");


--
-- Name: idx_analytics_websites_pixel_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_analytics_websites_pixel_key" ON "public"."analytics_websites" USING "btree" ("pixel_key");


--
-- Name: idx_analytics_websites_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_analytics_websites_user_id" ON "public"."analytics_websites" USING "btree" ("user_id");


--
-- Name: idx_cache_config_cache_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_cache_config_cache_key" ON "public"."cache_config" USING "btree" ("cache_key");


--
-- Name: idx_cache_stats_cache_key_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_cache_stats_cache_key_unique" ON "public"."cache_stats" USING "btree" ("cache_key");


--
-- Name: INDEX "idx_cache_stats_cache_key_unique"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX "public"."idx_cache_stats_cache_key_unique" IS '缓存键唯一索引，支持 record_cache_hit 函数的 ON CONFLICT 子句';


--
-- Name: idx_check_ins_user_id_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_check_ins_user_id_date" ON "public"."check_ins" USING "btree" ("user_id", "check_in_date");


--
-- Name: idx_collection_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_collection_tokens_token" ON "public"."collection_tokens" USING "btree" ("token");


--
-- Name: idx_daily_gallery_access_logs_accessed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_daily_gallery_access_logs_accessed_at" ON "public"."daily_gallery_access_logs" USING "btree" ("accessed_at" DESC);


--
-- Name: idx_daily_gallery_access_logs_fingerprint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_daily_gallery_access_logs_fingerprint" ON "public"."daily_gallery_access_logs" USING "btree" ("browser_fingerprint") WHERE ("browser_fingerprint" IS NOT NULL);


--
-- Name: idx_daily_gallery_access_logs_openid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_daily_gallery_access_logs_openid" ON "public"."daily_gallery_access_logs" USING "btree" ("openid");


--
-- Name: idx_daily_gallery_access_logs_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_daily_gallery_access_logs_post_id" ON "public"."daily_gallery_access_logs" USING "btree" ("post_id");


--
-- Name: idx_daily_gallery_access_logs_publish_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_daily_gallery_access_logs_publish_date" ON "public"."daily_gallery_access_logs" USING "btree" ("publish_date");


--
-- Name: idx_daily_gallery_access_logs_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_daily_gallery_access_logs_query" ON "public"."daily_gallery_access_logs" USING "btree" ("post_id", "accessed_at" DESC);


--
-- Name: idx_daily_gallery_access_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_daily_gallery_access_logs_user_id" ON "public"."daily_gallery_access_logs" USING "btree" ("user_id");


--
-- Name: idx_daily_gallery_access_logs_user_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_daily_gallery_access_logs_user_lookup" ON "public"."daily_gallery_access_logs" USING "btree" ("openid", "user_id", "browser_fingerprint");


--
-- Name: idx_daily_gallery_access_logs_user_openid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_daily_gallery_access_logs_user_openid" ON "public"."daily_gallery_access_logs" USING "btree" ("user_openid");


--
-- Name: idx_daily_gallery_posts_is_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_daily_gallery_posts_is_published" ON "public"."daily_gallery_posts" USING "btree" ("is_published");


--
-- Name: idx_daily_gallery_posts_post_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_daily_gallery_posts_post_date" ON "public"."daily_gallery_posts" USING "btree" ("post_date" DESC);


--
-- Name: idx_daily_gallery_submissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_daily_gallery_submissions_status" ON "public"."daily_gallery_submissions" USING "btree" ("status");


--
-- Name: idx_daily_gallery_submissions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_daily_gallery_submissions_user_id" ON "public"."daily_gallery_submissions" USING "btree" ("user_id");


--
-- Name: idx_dg_lockouts_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_dg_lockouts_ip" ON "public"."daily_gallery_password_lockouts" USING "btree" ("ip_address");


--
-- Name: idx_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_events_created_at" ON "public"."analytics_events" USING "btree" ("created_at");


--
-- Name: idx_events_page_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_events_page_path" ON "public"."analytics_events" USING "btree" ("page_path");


--
-- Name: idx_events_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_events_session_id" ON "public"."analytics_events" USING "btree" ("session_id");


--
-- Name: idx_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_events_type" ON "public"."analytics_events" USING "btree" ("event_type");


--
-- Name: idx_events_visitor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_events_visitor_id" ON "public"."analytics_events" USING "btree" ("visitor_id");


--
-- Name: idx_events_website_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_events_website_id" ON "public"."analytics_events" USING "btree" ("website_id");


--
-- Name: idx_goal_conversions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_goal_conversions_created_at" ON "public"."analytics_goal_conversions" USING "btree" ("created_at");


--
-- Name: idx_goal_conversions_goal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_goal_conversions_goal_id" ON "public"."analytics_goal_conversions" USING "btree" ("goal_id");


--
-- Name: idx_goal_conversions_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_goal_conversions_session_id" ON "public"."analytics_goal_conversions" USING "btree" ("session_id");


--
-- Name: idx_heatmap_data_heatmap_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_heatmap_data_heatmap_id" ON "public"."analytics_heatmap_data" USING "btree" ("heatmap_id");


--
-- Name: idx_heatmap_data_website_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_heatmap_data_website_id" ON "public"."analytics_heatmap_data" USING "btree" ("website_id");


--
-- Name: idx_media_downloads_media_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_downloads_media_id" ON "public"."media_downloads" USING "btree" ("media_id");


--
-- Name: idx_media_downloads_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_downloads_user_id" ON "public"."media_downloads" USING "btree" ("user_id");


--
-- Name: idx_media_items_content_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_items_content_hash" ON "public"."media_items" USING "btree" ("content_hash") WHERE ("content_hash" IS NOT NULL);


--
-- Name: idx_media_items_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_items_created_at" ON "public"."media_items" USING "btree" ("created_at" DESC);


--
-- Name: idx_media_items_dedupe_error; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_items_dedupe_error" ON "public"."media_items" USING "btree" ("dedupe_error") WHERE ("dedupe_error" IS NOT NULL);


--
-- Name: idx_media_items_exclude_gallery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_items_exclude_gallery" ON "public"."media_items" USING "btree" ("exclude_from_daily_gallery") WHERE ("exclude_from_daily_gallery" = true);


--
-- Name: idx_media_items_file_md5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_items_file_md5" ON "public"."media_items" USING "btree" ("file_md5") WHERE ("file_md5" IS NOT NULL);


--
-- Name: idx_media_items_latest; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_items_latest" ON "public"."media_items" USING "btree" ("status", "is_hidden", "deleted_at", "created_at" DESC);


--
-- Name: idx_media_items_popular; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_items_popular" ON "public"."media_items" USING "btree" ("status", "is_hidden", "deleted_at", "heat_score" DESC, "view_count" DESC);


--
-- Name: idx_media_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_items_status" ON "public"."media_items" USING "btree" ("status");


--
-- Name: idx_media_items_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_items_tags" ON "public"."media_items" USING "gin" ("tags");


--
-- Name: idx_media_items_thumbnail_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_items_thumbnail_url" ON "public"."media_items" USING "btree" ("thumbnail_url") WHERE ("thumbnail_url" IS NOT NULL);


--
-- Name: idx_media_items_type_cat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_items_type_cat" ON "public"."media_items" USING "btree" ("type", "category_id") WHERE (("status" = 'approved'::"public"."item_status") AND ("is_hidden" = false) AND ("deleted_at" IS NULL));


--
-- Name: idx_media_items_wechat_draft_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_items_wechat_draft_status" ON "public"."media_items" USING "btree" ("wechat_draft_status");


--
-- Name: idx_media_items_zonerama_photo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_items_zonerama_photo_id" ON "public"."media_items" USING "btree" ("zonerama_photo_id");


--
-- Name: idx_media_views_browser_fingerprint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_views_browser_fingerprint" ON "public"."media_views" USING "btree" ("visitor_fingerprint");


--
-- Name: idx_media_views_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_views_user_id" ON "public"."media_views" USING "btree" ("user_id");


--
-- Name: idx_mp_qr_gen_scene_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_mp_qr_gen_scene_created" ON "public"."mp_qr_generation_logs" USING "btree" ("scene", "created_at" DESC);


--
-- Name: idx_notifications_merge_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_notifications_merge_key" ON "public"."notifications" USING "btree" ("user_id", "merge_key", "created_at" DESC) WHERE ("is_read" = false);


--
-- Name: idx_password_user_locks_password_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_password_user_locks_password_id" ON "public"."daily_gallery_password_user_locks" USING "btree" ("password_id");


--
-- Name: idx_password_user_locks_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_password_user_locks_unique" ON "public"."daily_gallery_password_user_locks" USING "btree" ("password_id", "user_identifier");


--
-- Name: idx_password_user_locks_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_password_user_locks_user" ON "public"."daily_gallery_password_user_locks" USING "btree" ("user_identifier");


--
-- Name: idx_performance_metric; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_performance_metric" ON "public"."analytics_performance" USING "btree" ("metric_name");


--
-- Name: idx_performance_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_performance_session" ON "public"."analytics_performance" USING "btree" ("session_id");


--
-- Name: idx_performance_website; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_performance_website" ON "public"."analytics_performance" USING "btree" ("website_id");


--
-- Name: idx_photo_albums_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_photo_albums_level" ON "public"."photo_albums" USING "btree" ("level");


--
-- Name: idx_photo_albums_permission_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_photo_albums_permission_group_id" ON "public"."photo_albums" USING "btree" ("permission_group_id");


--
-- Name: idx_profiles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");


--
-- Name: idx_profiles_role_auth; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_profiles_role_auth" ON "public"."profiles" USING "btree" ("id", "role") WHERE ("role" = 'admin'::"public"."user_role");


--
-- Name: idx_profiles_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");


--
-- Name: idx_realtime_is_online; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_realtime_is_online" ON "public"."analytics_realtime" USING "btree" ("is_online") WHERE ("is_online" = true);


--
-- Name: idx_realtime_last_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_realtime_last_active" ON "public"."analytics_realtime" USING "btree" ("last_active_at");


--
-- Name: idx_realtime_website_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_realtime_website_id" ON "public"."analytics_realtime" USING "btree" ("website_id");


--
-- Name: idx_replays_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_replays_created_at" ON "public"."analytics_replays" USING "btree" ("created_at");


--
-- Name: idx_replays_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_replays_expires_at" ON "public"."analytics_replays" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);


--
-- Name: idx_replays_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_replays_session_id" ON "public"."analytics_replays" USING "btree" ("session_id");


--
-- Name: idx_replays_website_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_replays_website_id" ON "public"."analytics_replays" USING "btree" ("website_id");


--
-- Name: idx_scheduled_task_logs_execution_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_scheduled_task_logs_execution_time" ON "public"."scheduled_task_logs" USING "btree" ("execution_time" DESC);


--
-- Name: idx_scheduled_task_logs_task_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_scheduled_task_logs_task_name" ON "public"."scheduled_task_logs" USING "btree" ("task_name");


--
-- Name: idx_sessions_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_sessions_is_active" ON "public"."analytics_sessions" USING "btree" ("is_active") WHERE ("is_active" = true);


--
-- Name: idx_sessions_openid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_sessions_openid" ON "public"."analytics_sessions" USING "btree" ("openid");


--
-- Name: idx_sessions_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_sessions_started_at" ON "public"."analytics_sessions" USING "btree" ("started_at");


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_sessions_user_id" ON "public"."analytics_sessions" USING "btree" ("user_id");


--
-- Name: idx_sessions_visitor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_sessions_visitor_id" ON "public"."analytics_sessions" USING "btree" ("visitor_id");


--
-- Name: idx_sessions_website_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_sessions_website_id" ON "public"."analytics_sessions" USING "btree" ("website_id");


--
-- Name: idx_shc_activity_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_shc_activity_user_date" ON "public"."star_hunt_completions" USING "btree" ("activity_id", "user_id", "completion_date");


--
-- Name: idx_shortcodes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_shortcodes_created_at" ON "public"."site_shortcodes" USING "btree" ("created_at" DESC);


--
-- Name: idx_special_passwords_browser_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_special_passwords_browser_id" ON "public"."daily_gallery_special_passwords" USING "btree" ("browser_id");


--
-- Name: idx_special_passwords_creator_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_special_passwords_creator_date" ON "public"."daily_gallery_special_passwords" USING "btree" ("creator_id", "target_date");


--
-- Name: idx_special_passwords_password_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_special_passwords_password_target" ON "public"."daily_gallery_special_passwords" USING "btree" ("password", "target_date");


--
-- Name: idx_special_passwords_password_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_special_passwords_password_type" ON "public"."daily_gallery_special_passwords" USING "btree" ("password_type");


--
-- Name: idx_spu_openid_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_spu_openid_date" ON "public"."special_password_usage" USING "btree" ("openid", "usage_date");


--
-- Name: idx_spu_password_openid_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_spu_password_openid_date" ON "public"."special_password_usage" USING "btree" ("password_id", "openid", "usage_date");


--
-- Name: idx_tags_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tags_level" ON "public"."tags" USING "btree" ("level");


--
-- Name: idx_tags_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tags_parent_id" ON "public"."tags" USING "btree" ("parent_id");


--
-- Name: idx_tags_weight; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tags_weight" ON "public"."tags" USING "btree" ("weight" DESC);


--
-- Name: idx_user_visit_stats_daily_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_user_visit_stats_daily_unique" ON "public"."user_visit_stats" USING "btree" ("ip_address", "path", "visit_date");


--
-- Name: idx_visitors_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_visitors_country" ON "public"."analytics_visitors" USING "btree" ("country_code");


--
-- Name: idx_visitors_device; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_visitors_device" ON "public"."analytics_visitors" USING "btree" ("device_type");


--
-- Name: idx_visitors_openid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_visitors_openid" ON "public"."analytics_visitors" USING "btree" ("openid");


--
-- Name: idx_visitors_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_visitors_user_id" ON "public"."analytics_visitors" USING "btree" ("user_id");


--
-- Name: idx_visitors_visitor_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_visitors_visitor_uuid" ON "public"."analytics_visitors" USING "btree" ("visitor_uuid");


--
-- Name: idx_visitors_website_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_visitors_website_id" ON "public"."analytics_visitors" USING "btree" ("website_id");


--
-- Name: idx_wechat_draft_templates_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_wechat_draft_templates_active" ON "public"."wechat_draft_templates" USING "btree" ("is_active");


--
-- Name: idx_wechat_drafts_adopted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_wechat_drafts_adopted_at" ON "public"."wechat_drafts" USING "btree" ("adopted_at");


--
-- Name: idx_wechat_drafts_config_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_wechat_drafts_config_id" ON "public"."wechat_drafts" USING "btree" ("config_id");


--
-- Name: idx_wechat_drafts_is_adopted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_wechat_drafts_is_adopted" ON "public"."wechat_drafts" USING "btree" ("is_adopted");


--
-- Name: idx_wechat_drafts_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_wechat_drafts_template_id" ON "public"."wechat_drafts" USING "btree" ("template_id");


--
-- Name: idx_wechat_materials_config_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_wechat_materials_config_id" ON "public"."wechat_materials" USING "btree" ("config_id");


--
-- Name: idx_wechat_materials_local_media_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_wechat_materials_local_media_id" ON "public"."wechat_materials" USING "btree" ("local_media_id");


--
-- Name: idx_wechat_replies_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_wechat_replies_platform" ON "public"."wechat_replies" USING "btree" ("platform");


--
-- Name: idx_wechat_sub_openid_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_wechat_sub_openid_template" ON "public"."wechat_notification_subscriptions" USING "btree" ("openid", "template_id");


--
-- Name: idx_wechat_users_openid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_wechat_users_openid" ON "public"."wechat_users" USING "btree" ("openid");


--
-- Name: idx_wechat_users_unionid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_wechat_users_unionid" ON "public"."wechat_users" USING "btree" ("unionid");


--
-- Name: idx_wechat_users_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_wechat_users_user_id" ON "public"."wechat_users" USING "btree" ("user_id");


--
-- Name: idx_zonerama_album_configs_album_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_zonerama_album_configs_album_id" ON "public"."zonerama_album_configs" USING "btree" ("album_id");


--
-- Name: idx_zonerama_album_configs_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_zonerama_album_configs_is_active" ON "public"."zonerama_album_configs" USING "btree" ("is_active");


--
-- Name: idx_zonerama_library_album_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_zonerama_library_album_id" ON "public"."zonerama_library" USING "btree" ("album_id");


--
-- Name: idx_zonerama_library_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_zonerama_library_created_at" ON "public"."zonerama_library" USING "btree" ("created_at" DESC);


--
-- Name: idx_zonerama_library_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_zonerama_library_status" ON "public"."zonerama_library" USING "btree" ("status");


--
-- Name: media_items_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "media_items_created_at_idx" ON "public"."media_items" USING "btree" ("created_at" DESC);


--
-- Name: media_items_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "media_items_status_idx" ON "public"."media_items" USING "btree" ("status");


--
-- Name: media_items_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "media_items_type_idx" ON "public"."media_items" USING "btree" ("type");


--
-- Name: media_items_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "media_items_user_id_idx" ON "public"."media_items" USING "btree" ("user_id");


--
-- Name: media_items_zonerama_photo_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "media_items_zonerama_photo_id_unique" ON "public"."media_items" USING "btree" ("zonerama_photo_id") WHERE ("zonerama_photo_id" IS NOT NULL);


--
-- Name: points_logs_target_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "points_logs_target_id_idx" ON "public"."points_logs" USING "btree" ("user_id", "type", "target_id") WHERE ("target_id" IS NOT NULL);


--
-- Name: profiles_digital_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "profiles_digital_id_key" ON "public"."profiles" USING "btree" ("digital_id");


--
-- Name: superbed_configs_single_row; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "superbed_configs_single_row" ON "public"."superbed_configs" USING "btree" ((("id" IS NOT NULL)));


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "ix_realtime_subscription_entity" ON "realtime"."subscription" USING "btree" ("entity");


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_inserted_at_topic_index" ON ONLY "realtime"."messages" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_06_07_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2026_06_07_inserted_at_topic_idx" ON "realtime"."messages_2026_06_07" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_06_08_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2026_06_08_inserted_at_topic_idx" ON "realtime"."messages_2026_06_08" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_06_09_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2026_06_09_inserted_at_topic_idx" ON "realtime"."messages_2026_06_09" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_06_10_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2026_06_10_inserted_at_topic_idx" ON "realtime"."messages_2026_06_10" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_06_11_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2026_06_11_inserted_at_topic_idx" ON "realtime"."messages_2026_06_11" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_06_12_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2026_06_12_inserted_at_topic_idx" ON "realtime"."messages_2026_06_12" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX "subscription_subscription_id_entity_filters_key" ON "realtime"."subscription" USING "btree" ("subscription_id", "entity", "filters");


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");


--
-- Name: idx_iceberg_namespaces_bucket_id; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX "idx_iceberg_namespaces_bucket_id" ON "storage"."iceberg_namespaces" USING "btree" ("bucket_id", "name");


--
-- Name: idx_iceberg_tables_namespace_id; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX "idx_iceberg_tables_namespace_id" ON "storage"."iceberg_tables" USING "btree" ("namespace_id", "name");


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");


--
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX "idx_name_bucket_level_unique" ON "storage"."objects" USING "btree" ("name" COLLATE "C", "bucket_id", "level");


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");


--
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX "idx_objects_lower_name" ON "storage"."objects" USING "btree" (("path_tokens"["level"]), "lower"("name") "text_pattern_ops", "bucket_id", "level");


--
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX "idx_prefixes_lower_name" ON "storage"."prefixes" USING "btree" ("bucket_id", "level", (("string_to_array"("name", '/'::"text"))["level"]), "lower"("name") "text_pattern_ops");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");


--
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX "objects_bucket_id_level_idx" ON "storage"."objects" USING "btree" ("bucket_id", "level", "name" COLLATE "C");


--
-- Name: messages_2026_06_07_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_06_07_inserted_at_topic_idx";


--
-- Name: messages_2026_06_07_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_06_07_pkey";


--
-- Name: messages_2026_06_08_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_06_08_inserted_at_topic_idx";


--
-- Name: messages_2026_06_08_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_06_08_pkey";


--
-- Name: messages_2026_06_09_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_06_09_inserted_at_topic_idx";


--
-- Name: messages_2026_06_09_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_06_09_pkey";


--
-- Name: messages_2026_06_10_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_06_10_inserted_at_topic_idx";


--
-- Name: messages_2026_06_10_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_06_10_pkey";


--
-- Name: messages_2026_06_11_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_06_11_inserted_at_topic_idx";


--
-- Name: messages_2026_06_11_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_06_11_pkey";


--
-- Name: messages_2026_06_12_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_06_12_inserted_at_topic_idx";


--
-- Name: messages_2026_06_12_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_06_12_pkey";


--
-- Name: users on_auth_user_confirmed; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER "on_auth_user_confirmed" AFTER UPDATE ON "auth"."users" FOR EACH ROW WHEN ((("old"."confirmed_at" IS NULL) AND ("new"."confirmed_at" IS NOT NULL))) EXECUTE FUNCTION "public"."handle_new_user"();


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW WHEN (("new"."confirmed_at" IS NOT NULL)) EXECUTE FUNCTION "public"."handle_new_user"();


--
-- Name: users on_auth_user_sign_in; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER "on_auth_user_sign_in" AFTER UPDATE OF "last_sign_in_at" ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_user_last_sign_in"();


--
-- Name: users on_auth_user_updated; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER "on_auth_user_updated" AFTER UPDATE ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_auth_user_update"();


--
-- Name: app_api_keys app_api_keys_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "app_api_keys_updated_at" BEFORE UPDATE ON "public"."app_api_keys" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: app_configs app_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "app_configs_updated_at" BEFORE UPDATE ON "public"."app_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: app_versions app_versions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "app_versions_updated_at" BEFORE UPDATE ON "public"."app_versions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: album_access_requests on_album_access_request_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "on_album_access_request_status_change" AFTER UPDATE OF "status" ON "public"."album_access_requests" FOR EACH ROW EXECUTE FUNCTION "public"."handle_album_access_request_status_change"();


--
-- Name: favorites on_favorite_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "on_favorite_change" AFTER INSERT OR DELETE ON "public"."favorites" FOR EACH ROW EXECUTE FUNCTION "public"."handle_favorite_count_change"();


--
-- Name: profiles set_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();


--
-- Name: wechat_fans set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."wechat_fans" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();


--
-- Name: album_photos tr_album_photo_count_delete_stmt; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_album_photo_count_delete_stmt" AFTER DELETE ON "public"."album_photos" REFERENCING OLD TABLE AS "old_table" FOR EACH STATEMENT EXECUTE FUNCTION "public"."handle_album_photo_count_stmt_all"();


--
-- Name: album_photos tr_album_photo_count_insert_stmt; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_album_photo_count_insert_stmt" AFTER INSERT ON "public"."album_photos" REFERENCING NEW TABLE AS "new_table" FOR EACH STATEMENT EXECUTE FUNCTION "public"."handle_album_photo_count_stmt_all"();


--
-- Name: album_photos tr_album_photo_count_update_stmt; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_album_photo_count_update_stmt" AFTER UPDATE ON "public"."album_photos" REFERENCING OLD TABLE AS "old_table" NEW TABLE AS "new_table" FOR EACH STATEMENT EXECUTE FUNCTION "public"."handle_album_photo_count_stmt_all"();


--
-- Name: check_ins tr_check_badges_on_checkin; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_check_badges_on_checkin" AFTER INSERT ON "public"."check_ins" FOR EACH ROW EXECUTE FUNCTION "public"."trig_check_badges_on_checkin"();


--
-- Name: favorites tr_check_badges_on_favorite; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_check_badges_on_favorite" AFTER INSERT ON "public"."favorites" FOR EACH ROW EXECUTE FUNCTION "public"."trig_check_badges_on_favorite"();


--
-- Name: media_items tr_check_badges_on_media_approve; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_check_badges_on_media_approve" AFTER UPDATE ON "public"."media_items" FOR EACH ROW EXECUTE FUNCTION "public"."trig_check_badges_on_media_approve"();


--
-- Name: check_ins tr_check_in_growth; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_check_in_growth" AFTER INSERT ON "public"."check_ins" FOR EACH ROW EXECUTE FUNCTION "public"."handle_check_in_growth"();


--
-- Name: comments tr_comment_growth; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_comment_growth" AFTER INSERT ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_comment_growth"();


--
-- Name: daily_gallery_submissions tr_daily_gallery_submissions_ensure_user_id_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_daily_gallery_submissions_ensure_user_id_trigger" BEFORE INSERT OR UPDATE ON "public"."daily_gallery_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."tr_daily_gallery_submissions_ensure_user_id"();


--
-- Name: dislikes tr_dislike_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_dislike_count" AFTER INSERT OR DELETE ON "public"."dislikes" FOR EACH ROW EXECUTE FUNCTION "public"."update_dislike_count"();


--
-- Name: profiles tr_generate_digital_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_generate_digital_id" BEFORE INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_generate_digital_id"();


--
-- Name: media_items tr_post_growth; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_post_growth" AFTER INSERT OR UPDATE ON "public"."media_items" FOR EACH ROW EXECUTE FUNCTION "public"."handle_post_growth"();


--
-- Name: profiles tr_profiles_email_sync_to_auth; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_profiles_email_sync_to_auth" AFTER UPDATE ON "public"."profiles" FOR EACH ROW WHEN (("old"."email" IS DISTINCT FROM "new"."email")) EXECUTE FUNCTION "public"."handle_profile_email_update"();


--
-- Name: profiles tr_profiles_exp_sync; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_profiles_exp_sync" BEFORE UPDATE OF "exp" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_profiles_exp_sync"();


--
-- Name: scheduled_task_logs tr_prune_scheduled_task_logs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_prune_scheduled_task_logs" AFTER INSERT ON "public"."scheduled_task_logs" FOR EACH ROW EXECUTE FUNCTION "public"."prune_scheduled_task_logs"();


--
-- Name: profiles tr_update_user_rank; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "tr_update_user_rank" BEFORE UPDATE OF "exp" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_rank"();


--
-- Name: album_access_requests trg_album_access_request_insertion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trg_album_access_request_insertion" AFTER INSERT ON "public"."album_access_requests" FOR EACH ROW EXECUTE FUNCTION "public"."handle_album_access_request_insertion"();


--
-- Name: media_tags trg_sync_media_items_tags; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trg_sync_media_items_tags" AFTER INSERT OR DELETE OR UPDATE ON "public"."media_tags" FOR EACH ROW EXECUTE FUNCTION "public"."sync_media_items_tags"();


--
-- Name: media_items trigger_auto_tag_after_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_auto_tag_after_insert" AFTER INSERT ON "public"."media_items" FOR EACH ROW EXECUTE FUNCTION "public"."auto_tag_media_logic"();


--
-- Name: media_items trigger_delete_media_with_thumbnail; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_delete_media_with_thumbnail" BEFORE DELETE ON "public"."media_items" FOR EACH ROW EXECUTE FUNCTION "public"."delete_media_with_thumbnail"();


--
-- Name: tags trigger_retro_tag_after_tag_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_retro_tag_after_tag_insert" AFTER INSERT ON "public"."tags" FOR EACH ROW EXECUTE FUNCTION "public"."retro_tag_media_on_tag_insert"();


--
-- Name: wechat_draft_templates trigger_update_wechat_draft_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_update_wechat_draft_templates_updated_at" BEFORE UPDATE ON "public"."wechat_draft_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_wechat_draft_templates_updated_at"();


--
-- Name: wechat_drafts trigger_update_wechat_drafts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_update_wechat_drafts_updated_at" BEFORE UPDATE ON "public"."wechat_drafts" FOR EACH ROW EXECUTE FUNCTION "public"."update_wechat_drafts_updated_at"();


--
-- Name: analytics_visitors update_analytics_visitors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_analytics_visitors_updated_at" BEFORE UPDATE ON "public"."analytics_visitors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: analytics_websites update_analytics_websites_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_analytics_websites_updated_at" BEFORE UPDATE ON "public"."analytics_websites" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: announcements update_announcements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: daily_gallery_posts update_daily_gallery_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_daily_gallery_posts_updated_at" BEFORE UPDATE ON "public"."daily_gallery_posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: easter_egg_configs update_easter_egg_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_easter_egg_configs_updated_at" BEFORE UPDATE ON "public"."easter_egg_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: media_items update_media_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_media_items_updated_at" BEFORE UPDATE ON "public"."media_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: miniprogram_configs update_miniprogram_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_miniprogram_configs_updated_at" BEFORE UPDATE ON "public"."miniprogram_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER "tr_check_filters" BEFORE INSERT OR UPDATE ON "realtime"."subscription" FOR EACH ROW EXECUTE FUNCTION "realtime"."subscription_check_filters"();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();


--
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "objects_delete_delete_prefix" AFTER DELETE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();


--
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "objects_insert_create_prefix" BEFORE INSERT ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."objects_insert_prefix_trigger"();


--
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "objects_update_create_prefix" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW WHEN ((("new"."name" <> "old"."name") OR ("new"."bucket_id" <> "old"."bucket_id"))) EXECUTE FUNCTION "storage"."objects_update_prefix_trigger"();


--
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "prefixes_create_hierarchy" BEFORE INSERT ON "storage"."prefixes" FOR EACH ROW WHEN (("pg_trigger_depth"() < 1)) EXECUTE FUNCTION "storage"."prefixes_insert_trigger"();


--
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "prefixes_delete_hierarchy" AFTER DELETE ON "storage"."prefixes" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();


--
-- Name: extensions extensions_tenant_external_id_fkey; Type: FK CONSTRAINT; Schema: _realtime; Owner: -
--

ALTER TABLE ONLY "_realtime"."extensions"
    ADD CONSTRAINT "extensions_tenant_external_id_fkey" FOREIGN KEY ("tenant_external_id") REFERENCES "_realtime"."tenants"("external_id") ON DELETE CASCADE;


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- Name: ad_event_logs ad_event_logs_ad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ad_event_logs"
    ADD CONSTRAINT "ad_event_logs_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE CASCADE;


--
-- Name: ad_event_logs ad_event_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ad_event_logs"
    ADD CONSTRAINT "ad_event_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: ad_events ad_events_ad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ad_events"
    ADD CONSTRAINT "ad_events_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE CASCADE;


--
-- Name: ad_unlock_logs ad_unlock_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ad_unlock_logs"
    ADD CONSTRAINT "ad_unlock_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: admin_operation_logs admin_operation_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."admin_operation_logs"
    ADD CONSTRAINT "admin_operation_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id");


--
-- Name: album_access_requests album_access_requests_album_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_access_requests"
    ADD CONSTRAINT "album_access_requests_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."photo_albums"("id") ON DELETE CASCADE;


--
-- Name: album_access_requests album_access_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_access_requests"
    ADD CONSTRAINT "album_access_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: album_joins album_joins_album_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_joins"
    ADD CONSTRAINT "album_joins_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."photo_albums"("id") ON DELETE CASCADE;


--
-- Name: album_joins album_joins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_joins"
    ADD CONSTRAINT "album_joins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: album_photo_level_logs album_photo_level_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_photo_level_logs"
    ADD CONSTRAINT "album_photo_level_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id");


--
-- Name: album_photo_level_logs album_photo_level_logs_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_photo_level_logs"
    ADD CONSTRAINT "album_photo_level_logs_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "auth"."users"("id");


--
-- Name: album_photo_level_logs album_photo_level_logs_photo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_photo_level_logs"
    ADD CONSTRAINT "album_photo_level_logs_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."album_photos"("id") ON DELETE CASCADE;


--
-- Name: album_photos album_photos_album_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_photos"
    ADD CONSTRAINT "album_photos_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."photo_albums"("id") ON DELETE CASCADE;


--
-- Name: album_user_permissions album_user_permissions_album_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_user_permissions"
    ADD CONSTRAINT "album_user_permissions_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."photo_albums"("id") ON DELETE CASCADE;


--
-- Name: album_user_permissions album_user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_user_permissions"
    ADD CONSTRAINT "album_user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: album_viewing_history album_viewing_history_album_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_viewing_history"
    ADD CONSTRAINT "album_viewing_history_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."photo_albums"("id") ON DELETE CASCADE;


--
-- Name: album_viewing_history album_viewing_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."album_viewing_history"
    ADD CONSTRAINT "album_viewing_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: analytics_events analytics_events_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."analytics_sessions"("id") ON DELETE CASCADE;


--
-- Name: analytics_events analytics_events_visitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "public"."analytics_visitors"("id") ON DELETE CASCADE;


--
-- Name: analytics_goal_conversions analytics_goal_conversions_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_goal_conversions"
    ADD CONSTRAINT "analytics_goal_conversions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."analytics_goals"("id") ON DELETE CASCADE;


--
-- Name: analytics_goal_conversions analytics_goal_conversions_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_goal_conversions"
    ADD CONSTRAINT "analytics_goal_conversions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."analytics_sessions"("id") ON DELETE CASCADE;


--
-- Name: analytics_goal_conversions analytics_goal_conversions_visitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_goal_conversions"
    ADD CONSTRAINT "analytics_goal_conversions_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "public"."analytics_visitors"("id") ON DELETE CASCADE;


--
-- Name: analytics_heatmap_data analytics_heatmap_data_heatmap_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_heatmap_data"
    ADD CONSTRAINT "analytics_heatmap_data_heatmap_id_fkey" FOREIGN KEY ("heatmap_id") REFERENCES "public"."analytics_heatmaps"("id") ON DELETE CASCADE;


--
-- Name: analytics_performance analytics_performance_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_performance"
    ADD CONSTRAINT "analytics_performance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."analytics_sessions"("id") ON DELETE CASCADE;


--
-- Name: analytics_performance analytics_performance_visitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_performance"
    ADD CONSTRAINT "analytics_performance_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "public"."analytics_visitors"("id") ON DELETE CASCADE;


--
-- Name: analytics_performance analytics_performance_website_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_performance"
    ADD CONSTRAINT "analytics_performance_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "public"."analytics_websites"("id") ON DELETE CASCADE;


--
-- Name: analytics_realtime analytics_realtime_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_realtime"
    ADD CONSTRAINT "analytics_realtime_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."analytics_sessions"("id") ON DELETE CASCADE;


--
-- Name: analytics_realtime analytics_realtime_visitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_realtime"
    ADD CONSTRAINT "analytics_realtime_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "public"."analytics_visitors"("id") ON DELETE CASCADE;


--
-- Name: analytics_replays analytics_replays_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_replays"
    ADD CONSTRAINT "analytics_replays_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."analytics_sessions"("id") ON DELETE CASCADE;


--
-- Name: analytics_replays analytics_replays_visitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_replays"
    ADD CONSTRAINT "analytics_replays_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "public"."analytics_visitors"("id") ON DELETE CASCADE;


--
-- Name: analytics_sessions analytics_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_sessions"
    ADD CONSTRAINT "analytics_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: analytics_sessions analytics_sessions_visitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_sessions"
    ADD CONSTRAINT "analytics_sessions_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "public"."analytics_visitors"("id") ON DELETE CASCADE;


--
-- Name: analytics_visitors analytics_visitors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_visitors"
    ADD CONSTRAINT "analytics_visitors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: annotations annotations_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."annotations"
    ADD CONSTRAINT "annotations_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_items"("id") ON DELETE CASCADE;


--
-- Name: annotations annotations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."annotations"
    ADD CONSTRAINT "annotations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: announcement_acknowledgments announcement_acknowledgments_announcement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."announcement_acknowledgments"
    ADD CONSTRAINT "announcement_acknowledgments_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE CASCADE;


--
-- Name: announcement_acknowledgments announcement_acknowledgments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."announcement_acknowledgments"
    ADD CONSTRAINT "announcement_acknowledgments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: app_api_keys app_api_keys_app_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."app_api_keys"
    ADD CONSTRAINT "app_api_keys_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "public"."app_configs"("app_id") ON DELETE CASCADE;


--
-- Name: app_api_logs app_api_logs_api_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."app_api_logs"
    ADD CONSTRAINT "app_api_logs_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "public"."app_api_keys"("id") ON DELETE SET NULL;


--
-- Name: app_versions app_versions_app_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."app_versions"
    ADD CONSTRAINT "app_versions_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "public"."app_configs"("app_id") ON DELETE CASCADE;


--
-- Name: badge_tasks badge_tasks_badge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."badge_tasks"
    ADD CONSTRAINT "badge_tasks_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE CASCADE;


--
-- Name: bookmarks bookmarks_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_items"("id") ON DELETE CASCADE;


--
-- Name: bookmarks bookmarks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: check_ins check_ins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: collection_tokens collection_tokens_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."collection_tokens"
    ADD CONSTRAINT "collection_tokens_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id");


--
-- Name: comments comments_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_items"("id") ON DELETE CASCADE;


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: daily_gallery_access_logs daily_gallery_access_logs_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_access_logs"
    ADD CONSTRAINT "daily_gallery_access_logs_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."daily_gallery_posts"("id") ON DELETE CASCADE;


--
-- Name: daily_gallery_access_logs daily_gallery_access_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_access_logs"
    ADD CONSTRAINT "daily_gallery_access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: daily_gallery_account_passwords daily_gallery_account_passwords_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_account_passwords"
    ADD CONSTRAINT "daily_gallery_account_passwords_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."daily_gallery_posts"("id") ON DELETE CASCADE;


--
-- Name: daily_gallery_password_user_locks daily_gallery_password_user_locks_password_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_password_user_locks"
    ADD CONSTRAINT "daily_gallery_password_user_locks_password_id_fkey" FOREIGN KEY ("password_id") REFERENCES "public"."daily_gallery_special_passwords"("id") ON DELETE CASCADE;


--
-- Name: daily_gallery_rb_triggers daily_gallery_rb_triggers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_rb_triggers"
    ADD CONSTRAINT "daily_gallery_rb_triggers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");


--
-- Name: daily_gallery_submissions daily_gallery_submissions_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_submissions"
    ADD CONSTRAINT "daily_gallery_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: daily_gallery_submissions daily_gallery_submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."daily_gallery_submissions"
    ADD CONSTRAINT "daily_gallery_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: dislikes dislikes_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dislikes"
    ADD CONSTRAINT "dislikes_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_items"("id") ON DELETE CASCADE;


--
-- Name: dislikes dislikes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dislikes"
    ADD CONSTRAINT "dislikes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: easter_egg_records easter_egg_records_egg_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."easter_egg_records"
    ADD CONSTRAINT "easter_egg_records_egg_id_fkey" FOREIGN KEY ("egg_id") REFERENCES "public"."easter_egg_configs"("id") ON DELETE CASCADE;


--
-- Name: easter_egg_records easter_egg_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."easter_egg_records"
    ADD CONSTRAINT "easter_egg_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: easter_egg_trigger_logs easter_egg_trigger_logs_egg_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."easter_egg_trigger_logs"
    ADD CONSTRAINT "easter_egg_trigger_logs_egg_id_fkey" FOREIGN KEY ("egg_id") REFERENCES "public"."easter_egg_configs"("id") ON DELETE SET NULL;


--
-- Name: easter_egg_trigger_logs easter_egg_trigger_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."easter_egg_trigger_logs"
    ADD CONSTRAINT "easter_egg_trigger_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: favorites favorites_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_items"("id") ON DELETE CASCADE;


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: growth_logs growth_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."growth_logs"
    ADD CONSTRAINT "growth_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: login_tickets login_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."login_tickets"
    ADD CONSTRAINT "login_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");


--
-- Name: media_downloads media_downloads_album_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_downloads"
    ADD CONSTRAINT "media_downloads_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."album_photos"("id");


--
-- Name: media_downloads media_downloads_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_downloads"
    ADD CONSTRAINT "media_downloads_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_items"("id") ON DELETE CASCADE;


--
-- Name: media_downloads media_downloads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_downloads"
    ADD CONSTRAINT "media_downloads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: media_items media_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_items"
    ADD CONSTRAINT "media_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."content_categories"("id") ON DELETE SET NULL;


--
-- Name: media_items media_items_classified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_items"
    ADD CONSTRAINT "media_items_classified_by_fkey" FOREIGN KEY ("classified_by") REFERENCES "public"."profiles"("id");


--
-- Name: media_items media_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_items"
    ADD CONSTRAINT "media_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: media_staging media_staging_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_staging"
    ADD CONSTRAINT "media_staging_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."content_categories"("id");


--
-- Name: media_staging media_staging_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_staging"
    ADD CONSTRAINT "media_staging_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id");


--
-- Name: media_tags media_tags_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_tags"
    ADD CONSTRAINT "media_tags_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_items"("id") ON DELETE CASCADE;


--
-- Name: media_tags media_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_tags"
    ADD CONSTRAINT "media_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;


--
-- Name: media_views media_views_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_views"
    ADD CONSTRAINT "media_views_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_items"("id") ON DELETE CASCADE;


--
-- Name: media_views media_views_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."media_views"
    ADD CONSTRAINT "media_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: miniprogram_login_sessions miniprogram_login_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."miniprogram_login_sessions"
    ADD CONSTRAINT "miniprogram_login_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: mp_login_logs mp_login_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mp_login_logs"
    ADD CONSTRAINT "mp_login_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");


--
-- Name: mp_qr_generation_logs mp_qr_generation_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mp_qr_generation_logs"
    ADD CONSTRAINT "mp_qr_generation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");


--
-- Name: notifications notifications_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."permission_groups"("id") ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: photo_albums photo_albums_min_permission_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."photo_albums"
    ADD CONSTRAINT "photo_albums_min_permission_group_id_fkey" FOREIGN KEY ("min_permission_group_id") REFERENCES "public"."permission_groups"("id");


--
-- Name: photo_albums photo_albums_permission_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."photo_albums"
    ADD CONSTRAINT "photo_albums_permission_group_id_fkey" FOREIGN KEY ("permission_group_id") REFERENCES "public"."permission_groups"("id");


--
-- Name: photo_anti_screenshot_logs photo_anti_screenshot_logs_photo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."photo_anti_screenshot_logs"
    ADD CONSTRAINT "photo_anti_screenshot_logs_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."album_photos"("id") ON DELETE CASCADE;


--
-- Name: photo_anti_screenshot_logs photo_anti_screenshot_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."photo_anti_screenshot_logs"
    ADD CONSTRAINT "photo_anti_screenshot_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");


--
-- Name: points_logs points_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."points_logs"
    ADD CONSTRAINT "points_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: profiles profiles_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."permission_groups"("id");


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: profiles profiles_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("id");


--
-- Name: promotion_pages promotion_pages_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."promotion_pages"
    ADD CONSTRAINT "promotion_pages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: redemption_codes redemption_codes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."redemption_codes"
    ADD CONSTRAINT "redemption_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");


--
-- Name: redemption_logs redemption_logs_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."redemption_logs"
    ADD CONSTRAINT "redemption_logs_code_id_fkey" FOREIGN KEY ("code_id") REFERENCES "public"."redemption_codes"("id");


--
-- Name: redemption_logs redemption_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."redemption_logs"
    ADD CONSTRAINT "redemption_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");


--
-- Name: reports reports_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_items"("id") ON DELETE CASCADE;


--
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: special_digital_ids special_digital_ids_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."special_digital_ids"
    ADD CONSTRAINT "special_digital_ids_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id");


--
-- Name: special_password_usage special_password_usage_password_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."special_password_usage"
    ADD CONSTRAINT "special_password_usage_password_id_fkey" FOREIGN KEY ("password_id") REFERENCES "public"."daily_gallery_special_passwords"("id") ON DELETE CASCADE;


--
-- Name: sql_logs sql_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."sql_logs"
    ADD CONSTRAINT "sql_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");


--
-- Name: star_hunt_collection_records star_hunt_collection_records_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."star_hunt_collection_records"
    ADD CONSTRAINT "star_hunt_collection_records_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."star_hunt_activity_configs"("id") ON DELETE CASCADE;


--
-- Name: star_hunt_collection_records star_hunt_collection_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."star_hunt_collection_records"
    ADD CONSTRAINT "star_hunt_collection_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: star_hunt_completions star_hunt_completions_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."star_hunt_completions"
    ADD CONSTRAINT "star_hunt_completions_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."star_hunt_activity_configs"("id") ON DELETE CASCADE;


--
-- Name: star_hunt_completions star_hunt_completions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."star_hunt_completions"
    ADD CONSTRAINT "star_hunt_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: system_builds system_builds_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."system_builds"
    ADD CONSTRAINT "system_builds_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: system_configs system_configs_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."system_configs"
    ADD CONSTRAINT "system_configs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");


--
-- Name: system_guides system_guides_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."system_guides"
    ADD CONSTRAINT "system_guides_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."system_guide_categories"("id");


--
-- Name: tags tags_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE SET NULL;


--
-- Name: user_active_sessions user_active_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_active_sessions"
    ADD CONSTRAINT "user_active_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: user_badges user_badges_badge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE CASCADE;


--
-- Name: user_badges user_badges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: user_feedbacks user_feedbacks_recording_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_feedbacks"
    ADD CONSTRAINT "user_feedbacks_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "public"."user_session_recordings"("id");


--
-- Name: user_feedbacks user_feedbacks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_feedbacks"
    ADD CONSTRAINT "user_feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");


--
-- Name: user_interactions user_interactions_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_items"("id") ON DELETE CASCADE;


--
-- Name: user_interactions user_interactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: user_pending_items user_pending_items_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_pending_items"
    ADD CONSTRAINT "user_pending_items_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_items"("id") ON DELETE CASCADE;


--
-- Name: user_pending_items user_pending_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_pending_items"
    ADD CONSTRAINT "user_pending_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: user_session_recordings user_session_recordings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_session_recordings"
    ADD CONSTRAINT "user_session_recordings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");


--
-- Name: user_visit_stats user_visit_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_visit_stats"
    ADD CONSTRAINT "user_visit_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: wechat_access_tokens wechat_access_tokens_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_access_tokens"
    ADD CONSTRAINT "wechat_access_tokens_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."wechat_configs"("id") ON DELETE CASCADE;


--
-- Name: wechat_binding_requests wechat_binding_requests_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_binding_requests"
    ADD CONSTRAINT "wechat_binding_requests_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."wechat_configs"("id") ON DELETE CASCADE;


--
-- Name: wechat_binding_requests wechat_binding_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_binding_requests"
    ADD CONSTRAINT "wechat_binding_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: wechat_drafts wechat_drafts_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_drafts"
    ADD CONSTRAINT "wechat_drafts_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."wechat_configs"("id") ON DELETE CASCADE;


--
-- Name: wechat_drafts wechat_drafts_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_drafts"
    ADD CONSTRAINT "wechat_drafts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."wechat_draft_templates"("id") ON DELETE SET NULL;


--
-- Name: wechat_fans wechat_fans_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_fans"
    ADD CONSTRAINT "wechat_fans_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."wechat_configs"("id") ON DELETE CASCADE;


--
-- Name: wechat_materials wechat_materials_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_materials"
    ADD CONSTRAINT "wechat_materials_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."wechat_configs"("id") ON DELETE CASCADE;


--
-- Name: wechat_materials wechat_materials_local_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_materials"
    ADD CONSTRAINT "wechat_materials_local_media_id_fkey" FOREIGN KEY ("local_media_id") REFERENCES "public"."media_items"("id") ON DELETE SET NULL;


--
-- Name: wechat_menus wechat_menus_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_menus"
    ADD CONSTRAINT "wechat_menus_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."wechat_configs"("id") ON DELETE CASCADE;


--
-- Name: wechat_messages wechat_messages_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_messages"
    ADD CONSTRAINT "wechat_messages_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."wechat_configs"("id") ON DELETE CASCADE;


--
-- Name: wechat_notification_logs wechat_notification_logs_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_notification_logs"
    ADD CONSTRAINT "wechat_notification_logs_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."wechat_configs"("id") ON DELETE CASCADE;


--
-- Name: wechat_notification_logs wechat_notification_logs_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_notification_logs"
    ADD CONSTRAINT "wechat_notification_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."wechat_notification_tasks"("id") ON DELETE CASCADE;


--
-- Name: wechat_notification_logs wechat_notification_logs_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_notification_logs"
    ADD CONSTRAINT "wechat_notification_logs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."wechat_notification_templates"("id") ON DELETE CASCADE;


--
-- Name: wechat_notification_subscriptions wechat_notification_subscriptions_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_notification_subscriptions"
    ADD CONSTRAINT "wechat_notification_subscriptions_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."wechat_configs"("id");


--
-- Name: wechat_notification_tasks wechat_notification_tasks_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_notification_tasks"
    ADD CONSTRAINT "wechat_notification_tasks_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."wechat_configs"("id") ON DELETE CASCADE;


--
-- Name: wechat_notification_tasks wechat_notification_tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_notification_tasks"
    ADD CONSTRAINT "wechat_notification_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");


--
-- Name: wechat_notification_tasks wechat_notification_tasks_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_notification_tasks"
    ADD CONSTRAINT "wechat_notification_tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."wechat_notification_templates"("id") ON DELETE CASCADE;


--
-- Name: wechat_notification_templates wechat_notification_templates_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_notification_templates"
    ADD CONSTRAINT "wechat_notification_templates_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."wechat_configs"("id") ON DELETE CASCADE;


--
-- Name: wechat_users wechat_users_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_users"
    ADD CONSTRAINT "wechat_users_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."wechat_configs"("id") ON DELETE CASCADE;


--
-- Name: wechat_users wechat_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wechat_users"
    ADD CONSTRAINT "wechat_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: iceberg_namespaces iceberg_namespaces_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."iceberg_namespaces"
    ADD CONSTRAINT "iceberg_namespaces_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets_analytics"("id") ON DELETE CASCADE;


--
-- Name: iceberg_tables iceberg_tables_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."iceberg_tables"
    ADD CONSTRAINT "iceberg_tables_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets_analytics"("id") ON DELETE CASCADE;


--
-- Name: iceberg_tables iceberg_tables_namespace_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."iceberg_tables"
    ADD CONSTRAINT "iceberg_tables_namespace_id_fkey" FOREIGN KEY ("namespace_id") REFERENCES "storage"."iceberg_namespaces"("id") ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");


--
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."audit_log_entries" ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."flow_state" ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."identities" ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."instances" ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."mfa_amr_claims" ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."mfa_challenges" ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."mfa_factors" ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."one_time_tokens" ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."saml_providers" ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."saml_relay_states" ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."schema_migrations" ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."sso_domains" ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."sso_providers" ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;

--
-- Name: album_photo_level_logs Admin can access logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can access logs" ON "public"."album_photo_level_logs" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: mp_qr_generation_logs Admin can do everything on mp_qr_generation_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can do everything on mp_qr_generation_logs" ON "public"."mp_qr_generation_logs" TO "service_role" USING (true) WITH CHECK (true);


--
-- Name: wechat_notification_logs Admin can do everything on wechat_notification_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can do everything on wechat_notification_logs" ON "public"."wechat_notification_logs" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: wechat_notification_tasks Admin can do everything on wechat_notification_tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can do everything on wechat_notification_tasks" ON "public"."wechat_notification_tasks" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: wechat_notification_templates Admin can do everything on wechat_notification_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can do everything on wechat_notification_templates" ON "public"."wechat_notification_templates" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: album_custom_fields Admin can full manage fields; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can full manage fields" ON "public"."album_custom_fields" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: wechat_configs Admin can full manage wechat_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can full manage wechat_configs" ON "public"."wechat_configs" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: album_photos Admin can manage album photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage album photos" ON "public"."album_photos" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: photo_albums Admin can manage albums; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage albums" ON "public"."photo_albums" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: mp_login_logs Admin can read mp_login_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can read mp_login_logs" ON "public"."mp_login_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: notifications Admin full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access" ON "public"."notifications" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: easter_egg_configs Admin full access on easter_egg_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access on easter_egg_configs" ON "public"."easter_egg_configs" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."user_role"))));


--
-- Name: easter_egg_records Admin full access on easter_egg_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access on easter_egg_records" ON "public"."easter_egg_records" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."user_role"))));


--
-- Name: easter_egg_trigger_logs Admin full access on easter_egg_trigger_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access on easter_egg_trigger_logs" ON "public"."easter_egg_trigger_logs" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."user_role"))));


--
-- Name: wechat_fans Admin full access on wechat_fans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access on wechat_fans" ON "public"."wechat_fans" TO "authenticated" USING (((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text") OR (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"public"."user_role")));


--
-- Name: site_shortcodes Admin full access to site_shortcodes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access to site_shortcodes" ON "public"."site_shortcodes" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: wechat_access_tokens Admin full access to wechat_access_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access to wechat_access_tokens" ON "public"."wechat_access_tokens" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: wechat_configs Admin full access to wechat_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access to wechat_configs" ON "public"."wechat_configs" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: wechat_menus Admin full access to wechat_menus; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access to wechat_menus" ON "public"."wechat_menus" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: wechat_users Admin full access to wechat_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access to wechat_users" ON "public"."wechat_users" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: global_keyword_replacements Admin manage keyword replacements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manage keyword replacements" ON "public"."global_keyword_replacements" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: mp_qr_generation_logs Admin read all mp_qr_generation_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin read all mp_qr_generation_logs" ON "public"."mp_qr_generation_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: daily_gallery_access_logs Admins can delete daily_gallery_access_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete daily_gallery_access_logs" ON "public"."daily_gallery_access_logs" FOR DELETE TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: media_staging Admins can delete from media_staging; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete from media_staging" ON "public"."media_staging" FOR DELETE TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"public"."user_role"));


--
-- Name: media_tags Admins can delete media_tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete media_tags" ON "public"."media_tags" FOR DELETE TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"public"."user_role"));


--
-- Name: mp_login_logs Admins can delete mp_login_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete mp_login_logs" ON "public"."mp_login_logs" FOR DELETE TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: ads Admins can do everything on ads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can do everything on ads" ON "public"."ads" TO "authenticated" USING ("public"."can_manage_ads"()) WITH CHECK ("public"."can_manage_ads"());


--
-- Name: daily_gallery_account_passwords Admins can do everything on daily_gallery_account_passwords; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can do everything on daily_gallery_account_passwords" ON "public"."daily_gallery_account_passwords" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."user_role"))));


--
-- Name: video_proxy_configs_old Admins can do everything on video_proxy_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can do everything on video_proxy_configs" ON "public"."video_proxy_configs_old" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."user_role"))));


--
-- Name: wechat_account_password_config Admins can do everything on wechat_account_password_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can do everything on wechat_account_password_config" ON "public"."wechat_account_password_config" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."user_role"))));


--
-- Name: star_hunt_activity_configs Admins can manage activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage activities" ON "public"."star_hunt_activity_configs" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));


--
-- Name: album_user_permissions Admins can manage album permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage album permissions" ON "public"."album_user_permissions" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: user_interactions Admins can manage all interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all interactions" ON "public"."user_interactions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: points_logs Admins can manage all points logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all points logs" ON "public"."points_logs" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: promotion_pages Admins can manage all promotion pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all promotion pages" ON "public"."promotion_pages" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: album_access_requests Admins can manage all requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all requests" ON "public"."album_access_requests" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: media_views Admins can manage all views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all views" ON "public"."media_views" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: announcements Admins can manage announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage announcements" ON "public"."announcements" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: badge_tasks Admins can manage badge_tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage badge_tasks" ON "public"."badge_tasks" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'admin'::"text")))));


--
-- Name: badges Admins can manage badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage badges" ON "public"."badges" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'admin'::"text")))));


--
-- Name: badge_categories Admins can manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage categories" ON "public"."badge_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'admin'::"text")))));


--
-- Name: system_guide_categories Admins can manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage categories" ON "public"."system_guide_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: system_configs Admins can manage configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage configs" ON "public"."system_configs" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: user_field_configs Admins can manage field configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage field configs" ON "public"."user_field_configs" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: admin_operation_logs Admins can manage logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage logs" ON "public"."admin_operation_logs" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: notifications Admins can manage notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage notifications" ON "public"."notifications" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: oauth_clients Admins can manage oauth clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage oauth clients" ON "public"."oauth_clients" USING (((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))))) WITH CHECK (((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))));


--
-- Name: daily_gallery_posts Admins can manage posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage posts" ON "public"."daily_gallery_posts" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: daily_gallery_special_passwords Admins can manage special passwords; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage special passwords" ON "public"."daily_gallery_special_passwords" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'admin'::"text")))));


--
-- Name: sql_logs Admins can manage sql_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage sql_logs" ON "public"."sql_logs" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: tags Admins can manage tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage tags" ON "public"."tags" TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"public"."user_role")) WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"public"."user_role"));


--
-- Name: system_guide_templates Admins can manage templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage templates" ON "public"."system_guide_templates" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: login_tickets Admins can manage tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage tickets" ON "public"."login_tickets" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: wecom_configs Admins can manage wecom configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage wecom configs" ON "public"."wecom_configs" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: ad_event_logs Admins can read ad_event_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read ad_event_logs" ON "public"."ad_event_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: video_proxy_logs Admins can see video proxy logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can see video proxy logs" ON "public"."video_proxy_logs" FOR SELECT TO "authenticated" USING ((("auth"."jwt"() ->> 'email'::"text") IN ( SELECT "profiles"."email"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."user_role"))));


--
-- Name: ad_events Admins can view ad events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view ad events" ON "public"."ad_events" FOR SELECT TO "authenticated" USING ("public"."can_manage_ads"());


--
-- Name: daily_gallery_access_logs Admins can view all access logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all access logs" ON "public"."daily_gallery_access_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: user_pending_items Admins can view all pending items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all pending items" ON "public"."user_pending_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: star_hunt_collection_records Admins can view all records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all records" ON "public"."star_hunt_collection_records" FOR SELECT USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));


--
-- Name: photo_anti_screenshot_logs Admins can view logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view logs" ON "public"."photo_anti_screenshot_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: scheduled_task_logs Admins can view scheduled task logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view scheduled task logs" ON "public"."scheduled_task_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: user_visit_stats Admins can view visit stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view visit stats" ON "public"."user_visit_stats" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: parse_import_configs Admins have full access on parse_import_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access on parse_import_configs" ON "public"."parse_import_configs" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));


--
-- Name: ad_unlock_logs Admins have full access to ad_unlock_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to ad_unlock_logs" ON "public"."ad_unlock_logs" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: ads Admins have full access to ads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to ads" ON "public"."ads" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: album_joins Admins have full access to album joins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to album joins" ON "public"."album_joins" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: daily_gallery_submissions Admins have full access to daily_gallery_submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to daily_gallery_submissions" ON "public"."daily_gallery_submissions" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: miniprogram_configs Admins have full access to miniprogram_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to miniprogram_configs" ON "public"."miniprogram_configs" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: profiles Admins have full access to profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to profiles" ON "public"."profiles" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: proxy_cache_items Admins have full access to proxy_cache_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to proxy_cache_items" ON "public"."proxy_cache_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: redemption_codes Admins have full access to redemption_codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to redemption_codes" ON "public"."redemption_codes" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: redemption_logs Admins have full access to redemption_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to redemption_logs" ON "public"."redemption_logs" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: reports Admins have full access to reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to reports" ON "public"."reports" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: album_access_requests Admins have full access to requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to requests" ON "public"."album_access_requests" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: system_builds Admins have full access to system_builds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to system_builds" ON "public"."system_builds" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."user_role"))));


--
-- Name: user_badges Admins have full access to user_badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to user_badges" ON "public"."user_badges" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: debug_log_settings Admins manage debug_log_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage debug_log_settings" ON "public"."debug_log_settings" TO "authenticated", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."permission_groups" "g" ON (("p"."group_id" = "g"."id")))
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."role" = 'admin'::"public"."user_role") OR ("g"."permissions" ? 'admin_storage'::"text"))))))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."permission_groups" "g" ON (("p"."group_id" = "g"."id")))
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."role" = 'admin'::"public"."user_role") OR ("g"."permissions" ? 'admin_storage'::"text")))))));


--
-- Name: explore_cache_stats Admins manage explore_cache_stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage explore_cache_stats" ON "public"."explore_cache_stats" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: storage_configs Admins manage storage_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage storage_configs" ON "public"."storage_configs" TO "authenticated", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."permission_groups" "g" ON (("p"."group_id" = "g"."id")))
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."role" = 'admin'::"public"."user_role") OR ("g"."permissions" ? 'admin_storage'::"text"))))))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."permission_groups" "g" ON (("p"."group_id" = "g"."id")))
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."role" = 'admin'::"public"."user_role") OR ("g"."permissions" ? 'admin_storage'::"text")))))));


--
-- Name: superbed_configs Admins manage superbed_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage superbed_configs" ON "public"."superbed_configs" TO "authenticated", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."permission_groups" "g" ON (("p"."group_id" = "g"."id")))
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."role" = 'admin'::"public"."user_role") OR ("g"."permissions" ? 'admin_storage'::"text"))))))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."permission_groups" "g" ON (("p"."group_id" = "g"."id")))
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."role" = 'admin'::"public"."user_role") OR ("g"."permissions" ? 'admin_storage'::"text")))))));


--
-- Name: system_configs Admins manage system_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage system_configs" ON "public"."system_configs" TO "authenticated", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."permission_groups" "g" ON (("p"."group_id" = "g"."id")))
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."role" = 'admin'::"public"."user_role") OR ("g"."permissions" ? 'admin_storage'::"text"))))))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."permission_groups" "g" ON (("p"."group_id" = "g"."id")))
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."role" = 'admin'::"public"."user_role") OR ("g"."permissions" ? 'admin_storage'::"text")))))));


--
-- Name: content_categories Allow admin all content_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admin all content_categories" ON "public"."content_categories" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: random_beauty_configs Allow admin all for random_beauty_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admin all for random_beauty_configs" ON "public"."random_beauty_configs" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: proxy_exclude_domains Allow admin full access to proxy_exclude_domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admin full access to proxy_exclude_domains" ON "public"."proxy_exclude_domains" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: video_proxy_configs Allow admin full access to video_proxy_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admin full access to video_proxy_configs" ON "public"."video_proxy_configs" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: daily_gallery_password_user_locks Allow admins full access on password user locks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admins full access on password user locks" ON "public"."daily_gallery_password_user_locks" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'admin'::"text")))));


--
-- Name: system_guides Allow admins full access to guides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admins full access to guides" ON "public"."system_guides" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: ad_unlock_logs_archive Allow admins to select ad_unlock_logs_archive; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admins to select ad_unlock_logs_archive" ON "public"."ad_unlock_logs_archive" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'admin'::"text")))));


--
-- Name: daily_gallery_access_logs_archive Allow admins to select daily_gallery_access_logs_archive; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admins to select daily_gallery_access_logs_archive" ON "public"."daily_gallery_access_logs_archive" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'admin'::"text")))));


--
-- Name: daily_gallery_posts_archive Allow admins to select daily_gallery_posts_archive; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admins to select daily_gallery_posts_archive" ON "public"."daily_gallery_posts_archive" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'admin'::"text")))));


--
-- Name: web_vitals_logs Allow admins to select web_vitals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admins to select web_vitals" ON "public"."web_vitals_logs" FOR SELECT USING (true);


--
-- Name: zonerama_album_configs Allow admins to select zonerama_album_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admins to select zonerama_album_configs" ON "public"."zonerama_album_configs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'admin'::"text")))));


--
-- Name: wechat_notification_subscriptions Allow all access to admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to admins" ON "public"."wechat_notification_subscriptions" TO "anon" USING (true);


--
-- Name: album_custom_field_groups Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for authenticated users" ON "public"."album_custom_field_groups" USING (true);


--
-- Name: photo_anti_screenshot_logs Allow anon insert logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon insert logs" ON "public"."photo_anti_screenshot_logs" FOR INSERT TO "anon" WITH CHECK (true);


--
-- Name: storage_configs Allow anon read on storage_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon read on storage_configs" ON "public"."storage_configs" FOR SELECT TO "anon" USING (true);


--
-- Name: system_configs Allow anon read on system_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon read on system_configs" ON "public"."system_configs" FOR SELECT TO "anon" USING (true);


--
-- Name: miniprogram_login_sessions Allow anon to insert sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon to insert sessions" ON "public"."miniprogram_login_sessions" FOR INSERT TO "anon" WITH CHECK (true);


--
-- Name: wechat_messages Allow anon to insert wechat_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon to insert wechat_messages" ON "public"."wechat_messages" FOR INSERT TO "anon" WITH CHECK (true);


--
-- Name: miniprogram_login_sessions Allow anon to select sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon to select sessions" ON "public"."miniprogram_login_sessions" FOR SELECT TO "anon" USING (true);


--
-- Name: miniprogram_login_sessions Allow anon to update sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon to update sessions" ON "public"."miniprogram_login_sessions" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);


--
-- Name: web_vitals_logs Allow anonymous insert for web_vitals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous insert for web_vitals" ON "public"."web_vitals_logs" FOR INSERT WITH CHECK (true);


--
-- Name: daily_gallery_submissions Allow anonymous submissions to daily_gallery_submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous submissions to daily_gallery_submissions" ON "public"."daily_gallery_submissions" FOR INSERT WITH CHECK (true);


--
-- Name: comments Allow anyone to read comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anyone to read comments" ON "public"."comments" FOR SELECT USING (true);


--
-- Name: user_interactions Allow anyone to record interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anyone to record interactions" ON "public"."user_interactions" FOR INSERT WITH CHECK (true);


--
-- Name: media_views Allow anyone to record views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anyone to record views" ON "public"."media_views" FOR INSERT WITH CHECK (true);


--
-- Name: photo_anti_screenshot_logs Allow authenticated insert logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated insert logs" ON "public"."photo_anti_screenshot_logs" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: comments Allow authenticated users to insert comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to insert comments" ON "public"."comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: wechat_menus Allow authenticated users to manage wechat_menus; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to manage wechat_menus" ON "public"."wechat_menus" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: wechat_messages Allow authenticated users to manage wechat_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to manage wechat_messages" ON "public"."wechat_messages" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: wechat_replies Allow authenticated users to manage wechat_replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to manage wechat_replies" ON "public"."wechat_replies" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: daily_gallery_access_logs Allow insert access logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert access logs" ON "public"."daily_gallery_access_logs" FOR INSERT WITH CHECK (true);


--
-- Name: comments Allow owners to delete their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow owners to delete their own comments" ON "public"."comments" FOR DELETE USING (("auth"."uid"() = "user_id"));


--
-- Name: media_views Allow public insert for media_views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert for media_views" ON "public"."media_views" FOR INSERT WITH CHECK (true);


--
-- Name: wechat_binding_requests Allow public insert for wechat_to_user; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert for wechat_to_user" ON "public"."wechat_binding_requests" FOR INSERT WITH CHECK (true);


--
-- Name: daily_gallery_submissions Allow public read access to daily_gallery_submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to daily_gallery_submissions" ON "public"."daily_gallery_submissions" FOR SELECT USING (true);


--
-- Name: video_proxy_configs Allow public read access to enabled video_proxy_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to enabled video_proxy_configs" ON "public"."video_proxy_configs" FOR SELECT USING (("is_enabled" = true));


--
-- Name: special_password_usage Allow public read access to special_password_usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to special_password_usage" ON "public"."special_password_usage" FOR SELECT USING (true);


--
-- Name: star_hunt_completions Allow public read access to star_hunt_completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to star_hunt_completions" ON "public"."star_hunt_completions" FOR SELECT USING (true);


--
-- Name: content_categories Allow public read content_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read content_categories" ON "public"."content_categories" FOR SELECT USING (true);


--
-- Name: random_beauty_configs Allow public read for random_beauty_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read for random_beauty_configs" ON "public"."random_beauty_configs" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: system_guides Allow public read of public guides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read of public guides" ON "public"."system_guides" FOR SELECT USING (("is_public" = true));


--
-- Name: debug_log_settings Allow public read on debug_log_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on debug_log_settings" ON "public"."debug_log_settings" FOR SELECT USING (true);


--
-- Name: explore_cache_stats Allow public read on explore_cache_stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on explore_cache_stats" ON "public"."explore_cache_stats" FOR SELECT USING (true);


--
-- Name: storage_configs Allow public read on storage_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on storage_configs" ON "public"."storage_configs" FOR SELECT USING (true);


--
-- Name: superbed_configs Allow public read on superbed_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on superbed_configs" ON "public"."superbed_configs" FOR SELECT USING (true);


--
-- Name: system_configs Allow public read on system_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on system_configs" ON "public"."system_configs" FOR SELECT USING (true);


--
-- Name: proxy_exclude_domains Allow public read-only access to proxy_exclude_domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read-only access to proxy_exclude_domains" ON "public"."proxy_exclude_domains" FOR SELECT USING (("is_enabled" = true));


--
-- Name: media_views Allow public select for media_views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public select for media_views" ON "public"."media_views" FOR SELECT USING (true);


--
-- Name: daily_gallery_user_passwords Allow public select for verification; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public select for verification" ON "public"."daily_gallery_user_passwords" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: media_views Allow public select on media_views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public select on media_views" ON "public"."media_views" FOR SELECT USING (true);


--
-- Name: profiles Allow public to lookup profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public to lookup profiles" ON "public"."profiles" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: album_custom_field_groups Allow read for anon users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read for anon users" ON "public"."album_custom_field_groups" FOR SELECT USING (true);


--
-- Name: wechat_binding_requests Allow read for binding validation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read for binding validation" ON "public"."wechat_binding_requests" FOR SELECT USING (true);


--
-- Name: wechat_users Allow select for binding; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow select for binding" ON "public"."wechat_users" FOR SELECT USING (true);


--
-- Name: wechat_messages Allow service_role to manage wechat_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow service_role to manage wechat_messages" ON "public"."wechat_messages" TO "service_role" USING (true) WITH CHECK (true);


--
-- Name: special_password_usage Allow system insert to special_password_usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow system insert to special_password_usage" ON "public"."special_password_usage" FOR INSERT WITH CHECK (true);


--
-- Name: star_hunt_completions Allow system insert to star_hunt_completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow system insert to star_hunt_completions" ON "public"."star_hunt_completions" FOR INSERT WITH CHECK (true);


--
-- Name: random_beauty_logs Allow system to upsert random_beauty_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow system to upsert random_beauty_logs" ON "public"."random_beauty_logs" TO "authenticated", "anon" USING (true);


--
-- Name: wechat_users Allow update for binding; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for binding" ON "public"."wechat_users" FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: random_beauty_logs Allow users to read their own random_beauty_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to read their own random_beauty_logs" ON "public"."random_beauty_logs" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: media_views Allow users to update their own views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to update their own views" ON "public"."media_views" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));


--
-- Name: login_tickets Anon can insert ticket; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anon can insert ticket" ON "public"."login_tickets" FOR INSERT TO "anon" WITH CHECK (true);


--
-- Name: login_tickets Anon can update ticket to logging_in; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anon can update ticket to logging_in" ON "public"."login_tickets" FOR UPDATE TO "anon" USING (("status" = 'confirmed'::"text")) WITH CHECK (("status" = 'logging_in'::"text"));


--
-- Name: login_tickets Anon can view ticket status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anon can view ticket status" ON "public"."login_tickets" FOR SELECT TO "anon" USING (("status" = ANY (ARRAY['pending'::"text", 'scanned'::"text", 'confirmed'::"text", 'fulfilled'::"text", 'expired'::"text", 'logging_in'::"text"])));


--
-- Name: ad_events Anyone can insert ad events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert ad events" ON "public"."ad_events" FOR INSERT WITH CHECK (true);


--
-- Name: ad_event_logs Anyone can insert ad_event_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert ad_event_logs" ON "public"."ad_event_logs" FOR INSERT WITH CHECK (true);


--
-- Name: ad_unlock_logs Anyone can insert ad_unlock_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert ad_unlock_logs" ON "public"."ad_unlock_logs" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);


--
-- Name: user_feedbacks Anyone can insert feedbacks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert feedbacks" ON "public"."user_feedbacks" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);


--
-- Name: media_tags Anyone can insert media_tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert media_tags" ON "public"."media_tags" FOR INSERT WITH CHECK (true);


--
-- Name: user_session_recordings Anyone can insert recordings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert recordings" ON "public"."user_session_recordings" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);


--
-- Name: system_guide_categories Anyone can read categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read categories" ON "public"."system_guide_categories" FOR SELECT USING (true);


--
-- Name: miniprogram_configs Anyone can read miniprogram_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read miniprogram_configs" ON "public"."miniprogram_configs" FOR SELECT USING (true);


--
-- Name: system_guide_templates Anyone can read templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read templates" ON "public"."system_guide_templates" FOR SELECT USING (true);


--
-- Name: collection_tokens Anyone can read tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read tokens" ON "public"."collection_tokens" FOR SELECT USING (true);


--
-- Name: daily_gallery_account_passwords Anyone can select daily_gallery_account_passwords; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can select daily_gallery_account_passwords" ON "public"."daily_gallery_account_passwords" FOR SELECT USING (true);


--
-- Name: user_feedbacks Anyone can select feedbacks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can select feedbacks" ON "public"."user_feedbacks" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: user_session_recordings Anyone can select recordings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can select recordings" ON "public"."user_session_recordings" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: star_hunt_activity_configs Anyone can view active activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active activities" ON "public"."star_hunt_activity_configs" FOR SELECT USING (("is_active" = true));


--
-- Name: ads Anyone can view active ads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active ads" ON "public"."ads" FOR SELECT USING ((("is_active" = true) AND (("start_time" IS NULL) OR ("start_time" <= "now"())) AND (("end_time" IS NULL) OR ("end_time" >= "now"()))));


--
-- Name: badge_tasks Anyone can view active badge_tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active badge_tasks" ON "public"."badge_tasks" FOR SELECT USING (("is_active" = true));


--
-- Name: easter_egg_configs Anyone can view active easter_egg_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active easter_egg_configs" ON "public"."easter_egg_configs" FOR SELECT TO "authenticated" USING (("status" = 'active'::"text"));


--
-- Name: user_field_configs Anyone can view active field configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active field configs" ON "public"."user_field_configs" FOR SELECT USING (("is_active" = true));


--
-- Name: ad_unlock_logs Anyone can view ad_unlock_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view ad_unlock_logs" ON "public"."ad_unlock_logs" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: badges Anyone can view badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view badges" ON "public"."badges" FOR SELECT USING (("is_active" = true));


--
-- Name: badge_categories Anyone can view categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view categories" ON "public"."badge_categories" FOR SELECT USING (true);


--
-- Name: media_tags Anyone can view media_tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view media_tags" ON "public"."media_tags" FOR SELECT USING (true);


--
-- Name: daily_gallery_posts Anyone can view published posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view published posts" ON "public"."daily_gallery_posts" FOR SELECT USING (("is_published" = true));


--
-- Name: tags Anyone can view tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view tags" ON "public"."tags" FOR SELECT USING (true);


--
-- Name: wechat_configs Anyone can view wechat_configs basic info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view wechat_configs basic info" ON "public"."wechat_configs" FOR SELECT USING (true);


--
-- Name: collection_tokens Authenticated users can create tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create tokens" ON "public"."collection_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "creator_id"));


--
-- Name: easter_egg_trigger_logs Authenticated users can insert trigger logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert trigger logs" ON "public"."easter_egg_trigger_logs" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: system_configs Authenticated users can read system_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read system_configs" ON "public"."system_configs" FOR SELECT TO "authenticated" USING (true);


--
-- Name: reports Authenticated users can report; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can report" ON "public"."reports" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "reporter_id"));


--
-- Name: ads Everyone can view active ads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active ads" ON "public"."ads" FOR SELECT USING ((("is_active" = true) AND (("start_time" IS NULL) OR ("start_time" <= "now"())) AND (("end_time" IS NULL) OR ("end_time" >= "now"()))));


--
-- Name: album_custom_fields Everyone can view active fields; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active fields" ON "public"."album_custom_fields" FOR SELECT USING (("is_active" = true));


--
-- Name: announcements Everyone can view announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view announcements" ON "public"."announcements" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: parse_import_configs Everyone can view enabled parse_import_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view enabled parse_import_configs" ON "public"."parse_import_configs" FOR SELECT TO "authenticated" USING (("status" = 'enabled'::"text"));


--
-- Name: promotion_pages Everyone can view published promotion pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view published promotion pages" ON "public"."promotion_pages" FOR SELECT USING (("is_published" = true));


--
-- Name: redemption_logs Public can insert redemption_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can insert redemption_logs" ON "public"."redemption_logs" FOR INSERT WITH CHECK (true);


--
-- Name: redemption_codes Public can read redemption_codes for validation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read redemption_codes for validation" ON "public"."redemption_codes" FOR SELECT USING (true);


--
-- Name: redemption_logs Public can read redemption_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read redemption_logs" ON "public"."redemption_logs" FOR SELECT USING (true);


--
-- Name: redemption_codes Public can update redemption_codes used_count; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can update redemption_codes used_count" ON "public"."redemption_codes" FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: ads Public can view active ads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active ads" ON "public"."ads" FOR SELECT USING ((("is_active" = true) AND (("start_time" IS NULL) OR ("start_time" <= "now"())) AND (("end_time" IS NULL) OR ("end_time" >= "now"()))));


--
-- Name: user_active_sessions Public can view active sessions for check; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active sessions for check" ON "public"."user_active_sessions" FOR SELECT USING (true);


--
-- Name: global_keyword_replacements Public read keyword replacements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read keyword replacements" ON "public"."global_keyword_replacements" FOR SELECT USING (true);


--
-- Name: permission_groups Public read permission_groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read permission_groups" ON "public"."permission_groups" FOR SELECT USING (true);


--
-- Name: site_shortcodes Public view active site_shortcodes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public view active site_shortcodes" ON "public"."site_shortcodes" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));


--
-- Name: scheduled_task_logs Service role can insert scheduled task logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert scheduled task logs" ON "public"."scheduled_task_logs" FOR INSERT TO "service_role" WITH CHECK (true);


--
-- Name: wecom_configs Service role can read wecom configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can read wecom configs" ON "public"."wecom_configs" FOR SELECT TO "service_role" USING (true);


--
-- Name: notifications Update self read status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Update self read status" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: photo_albums User can view albums; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "User can view albums" ON "public"."photo_albums" FOR SELECT USING (true);


--
-- Name: album_photos User can view normal photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "User can view normal photos" ON "public"."album_photos" FOR SELECT USING (("level" = 'normal'::"text"));


--
-- Name: album_access_requests Users can create their own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own requests" ON "public"."album_access_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: bookmarks Users can delete their own bookmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own bookmarks" ON "public"."bookmarks" FOR DELETE USING (("auth"."uid"() = "user_id"));


--
-- Name: favorites Users can delete their own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own favorites" ON "public"."favorites" FOR DELETE USING (("auth"."uid"() = "user_id"));


--
-- Name: bookmarks Users can insert their own bookmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own bookmarks" ON "public"."bookmarks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: media_downloads Users can insert their own downloads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own downloads" ON "public"."media_downloads" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: favorites Users can insert their own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own favorites" ON "public"."favorites" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: redemption_codes Users can insert their own redemption_codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own redemption_codes" ON "public"."redemption_codes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "created_by"));


--
-- Name: daily_gallery_submissions Users can insert their own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own submissions" ON "public"."daily_gallery_submissions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: daily_gallery_rb_triggers Users can insert their own triggers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own triggers" ON "public"."daily_gallery_rb_triggers" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("openid" IS NOT NULL)));


--
-- Name: media_views Users can insert their own views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own views" ON "public"."media_views" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: album_joins Users can join albums; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can join albums" ON "public"."album_joins" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: user_active_sessions Users can manage their own active sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own active sessions" ON "public"."user_active_sessions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: album_viewing_history Users can manage their own album history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own album history" ON "public"."album_viewing_history" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: wechat_binding_requests Users can manage their own binding requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own binding requests" ON "public"."wechat_binding_requests" TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: dislikes Users can manage their own dislikes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own dislikes" ON "public"."dislikes" TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: user_pending_items Users can manage their own pending items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own pending items" ON "public"."user_pending_items" USING (("auth"."uid"() = "user_id"));


--
-- Name: check_ins Users can perform their own check-ins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can perform their own check-ins" ON "public"."check_ins" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: redemption_logs Users can read their own redemption_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read their own redemption_logs" ON "public"."redemption_logs" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: album_access_requests Users can submit access requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can submit access requests" ON "public"."album_access_requests" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: bookmarks Users can update their own bookmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own bookmarks" ON "public"."bookmarks" FOR UPDATE USING (("auth"."uid"() = "user_id"));


--
-- Name: favorites Users can update their own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own favorites" ON "public"."favorites" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR (("user_id" IS NULL) AND ("auth"."uid"() IS NOT NULL))));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));


--
-- Name: daily_gallery_access_logs Users can view own access logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own access logs" ON "public"."daily_gallery_access_logs" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: album_joins Users can view their own album joins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own album joins" ON "public"."album_joins" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: album_user_permissions Users can view their own album permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own album permissions" ON "public"."album_user_permissions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: user_badges Users can view their own badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own badges" ON "public"."user_badges" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: bookmarks Users can view their own bookmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bookmarks" ON "public"."bookmarks" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: check_ins Users can view their own check-ins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own check-ins" ON "public"."check_ins" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: media_downloads Users can view their own downloads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own downloads" ON "public"."media_downloads" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: easter_egg_records Users can view their own egg records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own egg records" ON "public"."easter_egg_records" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: favorites Users can view their own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own favorites" ON "public"."favorites" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: user_interactions Users can view their own interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own interactions" ON "public"."user_interactions" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));


--
-- Name: notifications Users can view their own or public notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own or public notifications" ON "public"."notifications" FOR SELECT USING ((("user_id" IS NULL) OR ("user_id" = "auth"."uid"())));


--
-- Name: points_logs Users can view their own points logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own points logs" ON "public"."points_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));


--
-- Name: promotion_pages Users can view their own promotion pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own promotion pages" ON "public"."promotion_pages" FOR SELECT TO "authenticated" USING (("created_by" = "auth"."uid"()));


--
-- Name: star_hunt_collection_records Users can view their own records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own records" ON "public"."star_hunt_collection_records" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: redemption_logs Users can view their own redemption_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own redemption_logs" ON "public"."redemption_logs" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: album_access_requests Users can view their own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own requests" ON "public"."album_access_requests" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: daily_gallery_submissions Users can view their own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own submissions" ON "public"."daily_gallery_submissions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: daily_gallery_rb_triggers Users can view their own triggers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own triggers" ON "public"."daily_gallery_rb_triggers" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("openid" = ( SELECT "profiles"."mp_openid"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) OR ("openid" = ( SELECT "profiles"."wechat_openid"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));


--
-- Name: media_views Users can view their own views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own views" ON "public"."media_views" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: notifications View personal notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View personal notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));


--
-- Name: notifications View public notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View public notifications" ON "public"."notifications" FOR SELECT USING ((("user_id" IS NULL) AND ("role_id" IS NULL) AND ("auth"."uid"() IS NOT NULL)));


--
-- Name: notifications View role notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View role notifications" ON "public"."notifications" FOR SELECT USING ((("role_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."user_permissions"
  WHERE (("user_permissions"."user_id" = "auth"."uid"()) AND ("user_permissions"."group_name" IN ( SELECT "permission_groups"."name"
           FROM "public"."permission_groups"
          WHERE ("permission_groups"."id" = "notifications"."role_id"))))))));


--
-- Name: ad_event_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."ad_event_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."ad_events" ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_unlock_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."ad_unlock_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_unlock_logs_archive; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."ad_unlock_logs_archive" ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_operation_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."admin_operation_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: ads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."ads" ENABLE ROW LEVEL SECURITY;

--
-- Name: album_access_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."album_access_requests" ENABLE ROW LEVEL SECURITY;

--
-- Name: album_custom_field_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."album_custom_field_groups" ENABLE ROW LEVEL SECURITY;

--
-- Name: album_custom_fields; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."album_custom_fields" ENABLE ROW LEVEL SECURITY;

--
-- Name: album_joins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."album_joins" ENABLE ROW LEVEL SECURITY;

--
-- Name: album_photo_level_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."album_photo_level_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: album_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."album_photos" ENABLE ROW LEVEL SECURITY;

--
-- Name: album_user_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."album_user_permissions" ENABLE ROW LEVEL SECURITY;

--
-- Name: album_viewing_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."album_viewing_history" ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;

--
-- Name: app_api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."app_api_keys" ENABLE ROW LEVEL SECURITY;

--
-- Name: app_api_keys app_api_keys_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "app_api_keys_admin_all" ON "public"."app_api_keys" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());


--
-- Name: app_api_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."app_api_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: app_api_logs app_api_logs_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "app_api_logs_admin_all" ON "public"."app_api_logs" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());


--
-- Name: app_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."app_configs" ENABLE ROW LEVEL SECURITY;

--
-- Name: app_configs app_configs_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "app_configs_admin_all" ON "public"."app_configs" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());


--
-- Name: app_configs app_configs_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "app_configs_select_all" ON "public"."app_configs" FOR SELECT TO "authenticated" USING (true);


--
-- Name: app_configs app_configs_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "app_configs_select_public" ON "public"."app_configs" FOR SELECT TO "anon" USING (("is_public" = true));


--
-- Name: app_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."app_versions" ENABLE ROW LEVEL SECURITY;

--
-- Name: app_versions app_versions_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "app_versions_admin_all" ON "public"."app_versions" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());


--
-- Name: app_versions app_versions_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "app_versions_select_all" ON "public"."app_versions" FOR SELECT TO "authenticated" USING (true);


--
-- Name: app_versions app_versions_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "app_versions_select_public" ON "public"."app_versions" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."app_configs"
  WHERE (("app_configs"."app_id" = "app_versions"."app_id") AND ("app_configs"."is_public" = true)))));


--
-- Name: badge_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."badge_categories" ENABLE ROW LEVEL SECURITY;

--
-- Name: badge_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."badge_tasks" ENABLE ROW LEVEL SECURITY;

--
-- Name: badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;

--
-- Name: bookmarks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."bookmarks" ENABLE ROW LEVEL SECURITY;

--
-- Name: check_ins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."check_ins" ENABLE ROW LEVEL SECURITY;

--
-- Name: collection_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."collection_tokens" ENABLE ROW LEVEL SECURITY;

--
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;

--
-- Name: content_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."content_categories" ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_gallery_access_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."daily_gallery_access_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_gallery_access_logs_archive; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."daily_gallery_access_logs_archive" ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_gallery_account_passwords; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."daily_gallery_account_passwords" ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_gallery_password_user_locks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."daily_gallery_password_user_locks" ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_gallery_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."daily_gallery_posts" ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_gallery_posts_archive; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."daily_gallery_posts_archive" ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_gallery_rb_triggers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."daily_gallery_rb_triggers" ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_gallery_special_passwords; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."daily_gallery_special_passwords" ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_gallery_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."daily_gallery_submissions" ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_gallery_user_passwords; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."daily_gallery_user_passwords" ENABLE ROW LEVEL SECURITY;

--
-- Name: debug_log_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."debug_log_settings" ENABLE ROW LEVEL SECURITY;

--
-- Name: dislikes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."dislikes" ENABLE ROW LEVEL SECURITY;

--
-- Name: domain_configs domain_configs_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "domain_configs_admin_all" ON "public"."domain_configs" TO "authenticated" USING ("public"."is_admin_safe"()) WITH CHECK ("public"."is_admin_safe"());


--
-- Name: domain_configs domain_configs_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "domain_configs_public_read" ON "public"."domain_configs" FOR SELECT USING (("is_active" = true));


--
-- Name: easter_egg_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."easter_egg_configs" ENABLE ROW LEVEL SECURITY;

--
-- Name: easter_egg_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."easter_egg_records" ENABLE ROW LEVEL SECURITY;

--
-- Name: easter_egg_trigger_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."easter_egg_trigger_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: explore_cache_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."explore_cache_stats" ENABLE ROW LEVEL SECURITY;

--
-- Name: favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."favorites" ENABLE ROW LEVEL SECURITY;

--
-- Name: favorites favorites_select_optimized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "favorites_select_optimized" ON "public"."favorites" FOR SELECT USING (("user_id" = "auth"."uid"()));


--
-- Name: POLICY "favorites_select_optimized" ON "favorites"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "favorites_select_optimized" ON "public"."favorites" IS '简化收藏查询策略';


--
-- Name: global_keyword_replacements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."global_keyword_replacements" ENABLE ROW LEVEL SECURITY;

--
-- Name: login_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."login_tickets" ENABLE ROW LEVEL SECURITY;

--
-- Name: media_downloads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."media_downloads" ENABLE ROW LEVEL SECURITY;

--
-- Name: media_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."media_items" ENABLE ROW LEVEL SECURITY;

--
-- Name: media_items media_items_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "media_items_admin_all" ON "public"."media_items" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: media_items media_items_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "media_items_delete_policy" ON "public"."media_items" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"("auth"."uid"())));


--
-- Name: media_items media_items_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "media_items_insert_own" ON "public"."media_items" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: media_items media_items_select_optimized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "media_items_select_optimized" ON "public"."media_items" FOR SELECT USING ((("deleted_at" IS NULL) AND (("status" = 'approved'::"public"."item_status") OR ("auth"."uid"() = "user_id") OR "public"."is_admin"("auth"."uid"()))));


--
-- Name: media_items media_items_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "media_items_update_own" ON "public"."media_items" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"("auth"."uid"())));


--
-- Name: media_staging; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."media_staging" ENABLE ROW LEVEL SECURITY;

--
-- Name: media_staging media_staging_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "media_staging_admin_all" ON "public"."media_staging" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));


--
-- Name: media_staging media_staging_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "media_staging_select_all" ON "public"."media_staging" FOR SELECT USING (true);


--
-- Name: media_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."media_tags" ENABLE ROW LEVEL SECURITY;

--
-- Name: media_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."media_views" ENABLE ROW LEVEL SECURITY;

--
-- Name: miniprogram_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."miniprogram_configs" ENABLE ROW LEVEL SECURITY;

--
-- Name: miniprogram_login_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."miniprogram_login_sessions" ENABLE ROW LEVEL SECURITY;

--
-- Name: mp_login_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."mp_login_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: mp_qr_generation_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."mp_qr_generation_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_select_optimized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notifications_select_optimized" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));


--
-- Name: POLICY "notifications_select_optimized" ON "notifications"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "notifications_select_optimized" ON "public"."notifications" IS '简化通知查询策略';


--
-- Name: oauth_clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."oauth_clients" ENABLE ROW LEVEL SECURITY;

--
-- Name: parse_import_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."parse_import_configs" ENABLE ROW LEVEL SECURITY;

--
-- Name: permission_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."permission_groups" ENABLE ROW LEVEL SECURITY;

--
-- Name: photo_albums; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."photo_albums" ENABLE ROW LEVEL SECURITY;

--
-- Name: photo_anti_screenshot_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."photo_anti_screenshot_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: points_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."points_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: promotion_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."promotion_pages" ENABLE ROW LEVEL SECURITY;

--
-- Name: proxy_cache_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."proxy_cache_items" ENABLE ROW LEVEL SECURITY;

--
-- Name: proxy_exclude_domains; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."proxy_exclude_domains" ENABLE ROW LEVEL SECURITY;

--
-- Name: random_beauty_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."random_beauty_configs" ENABLE ROW LEVEL SECURITY;

--
-- Name: random_beauty_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."random_beauty_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: redemption_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."redemption_codes" ENABLE ROW LEVEL SECURITY;

--
-- Name: redemption_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."redemption_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_task_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."scheduled_task_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: site_shortcodes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."site_shortcodes" ENABLE ROW LEVEL SECURITY;

--
-- Name: special_password_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."special_password_usage" ENABLE ROW LEVEL SECURITY;

--
-- Name: sql_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."sql_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: star_hunt_activity_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."star_hunt_activity_configs" ENABLE ROW LEVEL SECURITY;

--
-- Name: star_hunt_collection_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."star_hunt_collection_records" ENABLE ROW LEVEL SECURITY;

--
-- Name: star_hunt_completions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."star_hunt_completions" ENABLE ROW LEVEL SECURITY;

--
-- Name: storage_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."storage_configs" ENABLE ROW LEVEL SECURITY;

--
-- Name: superbed_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."superbed_configs" ENABLE ROW LEVEL SECURITY;

--
-- Name: system_builds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."system_builds" ENABLE ROW LEVEL SECURITY;

--
-- Name: system_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."system_configs" ENABLE ROW LEVEL SECURITY;

--
-- Name: system_guides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."system_guides" ENABLE ROW LEVEL SECURITY;

--
-- Name: tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_active_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."user_active_sessions" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_feedbacks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."user_feedbacks" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_field_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."user_field_configs" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_interactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."user_interactions" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_pending_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."user_pending_items" ENABLE ROW LEVEL SECURITY;

--
-- Name: album_photos user_select_album_photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "user_select_album_photos" ON "public"."album_photos" FOR SELECT TO "authenticated", "anon" USING ("public"."can_view_album_photo"("album_id", "level"));


--
-- Name: user_session_recordings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."user_session_recordings" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_visit_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."user_visit_stats" ENABLE ROW LEVEL SECURITY;

--
-- Name: video_proxy_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."video_proxy_configs" ENABLE ROW LEVEL SECURITY;

--
-- Name: video_proxy_configs_old; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."video_proxy_configs_old" ENABLE ROW LEVEL SECURITY;

--
-- Name: video_proxy_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."video_proxy_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: web_vitals_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."web_vitals_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: wechat_access_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wechat_access_tokens" ENABLE ROW LEVEL SECURITY;

--
-- Name: wechat_account_password_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wechat_account_password_config" ENABLE ROW LEVEL SECURITY;

--
-- Name: wechat_binding_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wechat_binding_requests" ENABLE ROW LEVEL SECURITY;

--
-- Name: wechat_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wechat_configs" ENABLE ROW LEVEL SECURITY;

--
-- Name: wechat_draft_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wechat_draft_templates" ENABLE ROW LEVEL SECURITY;

--
-- Name: wechat_drafts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wechat_drafts" ENABLE ROW LEVEL SECURITY;

--
-- Name: wechat_fans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wechat_fans" ENABLE ROW LEVEL SECURITY;

--
-- Name: wechat_materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wechat_materials" ENABLE ROW LEVEL SECURITY;

--
-- Name: wechat_menus; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wechat_menus" ENABLE ROW LEVEL SECURITY;

--
-- Name: wechat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wechat_messages" ENABLE ROW LEVEL SECURITY;

--
-- Name: wechat_notification_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wechat_notification_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: wechat_notification_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wechat_notification_subscriptions" ENABLE ROW LEVEL SECURITY;

--
-- Name: wechat_notification_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wechat_notification_tasks" ENABLE ROW LEVEL SECURITY;

--
-- Name: wechat_notification_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wechat_notification_templates" ENABLE ROW LEVEL SECURITY;

--
-- Name: wechat_replies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wechat_replies" ENABLE ROW LEVEL SECURITY;

--
-- Name: wechat_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wechat_users" ENABLE ROW LEVEL SECURITY;

--
-- Name: wecom_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wecom_configs" ENABLE ROW LEVEL SECURITY;

--
-- Name: zonerama_album_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."zonerama_album_configs" ENABLE ROW LEVEL SECURITY;

--
-- Name: zonerama_library; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."zonerama_library" ENABLE ROW LEVEL SECURITY;

--
-- Name: permission_groups 仅管理员可管理权限组; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "仅管理员可管理权限组" ON "public"."permission_groups" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: star_hunt_activity_configs 任何人可查看活动配置; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "任何人可查看活动配置" ON "public"."star_hunt_activity_configs" FOR SELECT USING (true);


--
-- Name: permission_groups 任何人可读权限组; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "任何人可读权限组" ON "public"."permission_groups" FOR SELECT USING (true);


--
-- Name: star_hunt_collection_records 用户可更新自己的收集记录; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "用户可更新自己的收集记录" ON "public"."star_hunt_collection_records" USING (("auth"."uid"() = "user_id"));


--
-- Name: star_hunt_collection_records 用户可查看自己的收集记录; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "用户可查看自己的收集记录" ON "public"."star_hunt_collection_records" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: zonerama_library 管理员可删除 Zonerama 库; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "管理员可删除 Zonerama 库" ON "public"."zonerama_library" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: zonerama_library 管理员可插入 Zonerama 库; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "管理员可插入 Zonerama 库" ON "public"."zonerama_library" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: zonerama_library 管理员可更新 Zonerama 库; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "管理员可更新 Zonerama 库" ON "public"."zonerama_library" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: zonerama_library 管理员可查看 Zonerama 库; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "管理员可查看 Zonerama 库" ON "public"."zonerama_library" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: star_hunt_collection_records 管理员可查看所有收集记录; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "管理员可查看所有收集记录" ON "public"."star_hunt_collection_records" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: wechat_materials 管理员可管理微信素材; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "管理员可管理微信素材" ON "public"."wechat_materials" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: star_hunt_activity_configs 管理员可管理活动配置; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "管理员可管理活动配置" ON "public"."star_hunt_activity_configs" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: wechat_draft_templates 管理员可管理草稿模板; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "管理员可管理草稿模板" ON "public"."wechat_draft_templates" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: wechat_drafts 管理员可管理草稿记录; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "管理员可管理草稿记录" ON "public"."wechat_drafts" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE "realtime"."messages" ENABLE ROW LEVEL SECURITY;

--
-- Name: objects Admin full access to build-artifacts; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Admin full access to build-artifacts" ON "storage"."objects" TO "authenticated" USING ((("bucket_id" = 'build-artifacts'::"text") AND ("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."user_role")))));


--
-- Name: objects Admins manage all objects; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Admins manage all objects" ON "storage"."objects" TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));


--
-- Name: objects Allow Public Update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Allow Public Update" ON "storage"."objects" FOR UPDATE USING (("bucket_id" = 'photos'::"text"));


--
-- Name: objects Allow Public Upload; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Allow Public Upload" ON "storage"."objects" FOR INSERT WITH CHECK (("bucket_id" = 'photos'::"text"));


--
-- Name: objects Allow public select on media_content; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Allow public select on media_content" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'media_content'::"text"));


--
-- Name: objects Allow public update to daily_gallery; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Allow public update to daily_gallery" ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'media_content'::"text") AND ("name" ~~ 'daily_gallery/%'::"text")));


--
-- Name: objects Allow public upload to daily_gallery_recursive; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Allow public upload to daily_gallery_recursive" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'media_content'::"text") AND ("name" ~~ 'daily_gallery/%'::"text")));


--
-- Name: objects Authenticated users can upload; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Authenticated users can upload" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK (("bucket_id" = 'media_content'::"text"));


--
-- Name: objects Public Access; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Public Access" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'media_content'::"text"));


--
-- Name: objects Public read for build-artifacts; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Public read for build-artifacts" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'build-artifacts'::"text"));


--
-- Name: objects Users can manage their own objects; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can manage their own objects" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'media_content'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;

--
-- Name: iceberg_namespaces; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."iceberg_namespaces" ENABLE ROW LEVEL SECURITY;

--
-- Name: iceberg_tables; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."iceberg_tables" ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;

--
-- Name: prefixes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."prefixes" ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION "supabase_realtime" WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION "supabase_realtime_messages_publication" WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime media_items; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."media_items";


--
-- Name: supabase_realtime mp_qr_generation_logs; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."mp_qr_generation_logs";


--
-- Name: supabase_realtime points_logs; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."points_logs";


--
-- Name: supabase_realtime profiles; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";


--
-- Name: supabase_realtime proxy_exclude_domains; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."proxy_exclude_domains";


--
-- Name: supabase_realtime storage_configs; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."storage_configs";


--
-- Name: supabase_realtime wechat_fans; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."wechat_fans";


--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: -
--

ALTER PUBLICATION "supabase_realtime_messages_publication" ADD TABLE ONLY "realtime"."messages";


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "issue_graphql_placeholder" ON "sql_drop"
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION "extensions"."set_graphql_placeholder"();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "issue_pg_cron_access" ON "ddl_command_end"
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION "extensions"."grant_pg_cron_access"();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "issue_pg_graphql_access" ON "ddl_command_end"
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION "extensions"."grant_pg_graphql_access"();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "issue_pg_net_access" ON "ddl_command_end"
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION "extensions"."grant_pg_net_access"();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "pgrst_ddl_watch" ON "ddl_command_end"
   EXECUTE FUNCTION "extensions"."pgrst_ddl_watch"();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "pgrst_drop_watch" ON "sql_drop"
   EXECUTE FUNCTION "extensions"."pgrst_drop_watch"();


--
-- PostgreSQL database dump complete
--



-- ============================================================
-- SECTION: STORAGE BUCKETS DATA
-- ============================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

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
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") FROM stdin;
media_content	media_content	\N	2026-04-23 14:54:05.348069+00	2026-04-23 14:54:05.348069+00	t	f	\N	\N	\N	STANDARD
build-artifacts	build-artifacts	\N	2026-05-04 13:58:40.311371+00	2026-05-04 13:58:40.311371+00	t	f	\N	\N	\N	STANDARD
photos	photos	\N	2026-05-11 15:28:28.689735+00	2026-05-11 15:28:28.689735+00	t	f	\N	\N	\N	STANDARD
\.


--
-- PostgreSQL database dump complete
--


